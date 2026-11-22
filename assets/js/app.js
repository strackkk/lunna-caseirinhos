let carrinho = [];
try{
  const savedCart = JSON.parse(localStorage.getItem("carrinhoDoceEncanto") || "[]");
  if(Array.isArray(savedCart)){
    carrinho = savedCart.filter(item =>
      item &&
      typeof item === "object" &&
      item.chave &&
      item.nome &&
      Number.isFinite(Number(item.preco)) &&
      Number(item.preco) > 0 &&
      Number.isInteger(Number(item.qtd)) &&
      Number(item.qtd) > 0
    ).map(item => ({
      ...item,
      preco: Number(item.preco),
      qtd: Number(item.qtd),
    }));
  }
}catch(error){
  console.error("Não foi possível recuperar o carrinho salvo.", error);
  localStorage.removeItem("carrinhoDoceEncanto");
  carrinho = [];
}
let catAtiva = "todos";
let tipoEntrega = "retirada";
let etapaAtual = 1;

const $ = id => document.getElementById(id);
const fmt = v => "R$ " + Number(v).toFixed(2).replace(".",",");
const escHtml = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
})[char]);
let localStoreSettings = null;

try{
  const savedSettings = localStorage.getItem("lunna-local-settings-v1");
  if(savedSettings !== null){
    localStoreSettings = JSON.parse(savedSettings);
    if(!localStoreSettings || typeof localStoreSettings !== "object" || Array.isArray(localStoreSettings)){
      throw new Error("Os dados locais da loja precisam estar em um formato válido.");
    }
    ["nomeLoja", "whatsapp", "emailContato", "horarioAtendimento", "pixChave", "pixNome", "pixCidade",
      "mapaUrl", "endereco", "taxaEntrega", "descontoPix"].forEach(key => {
      if(localStoreSettings[key] !== undefined) CONFIG[key] = localStoreSettings[key];
    });
  }
}catch(error){
  console.error("Não foi possível carregar os dados locais da loja.", error);
  localStoreSettings = null;
}

function formatPhone(number){
  const digits = String(number);
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if(local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if(local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return "+" + digits;
}

function renderStoreDetails(){
  const headerName = $("storeHeaderName");
  const nameParts = CONFIG.nomeLoja.trim().split(/\s+/);
  const emphasizedName = document.createElement("b");
  emphasizedName.textContent = nameParts.slice(1).join(" ");
  headerName.replaceChildren(document.createTextNode(nameParts[0] + (nameParts.length > 1 ? " " : "")), emphasizedName);
  $("storeFooterName").textContent = CONFIG.nomeLoja;
  $("storeWhatsappLink").href = "https://wa.me/" + CONFIG.whatsapp;
  $("storeWhatsappLink").textContent = "📱 WhatsApp: " + formatPhone(CONFIG.whatsapp);
  $("storeEmailLink").href = "mailto:" + CONFIG.emailContato;
  $("storeEmailLink").textContent = CONFIG.emailContato;
  $("storeHoursText").textContent = CONFIG.horarioAtendimento;
  $("storeAddressText").textContent = CONFIG.endereco;
  if(CONFIG.mapaUrl){
    $("storeMapLink").href = CONFIG.mapaUrl;
    $("storeMapLink").target = "_blank";
  }else{
    $("storeMapLink").removeAttribute("href");
    $("storeMapLink").removeAttribute("target");
  }
  $("storeCopyright").textContent =
    `© ${new Date().getFullYear()} ${CONFIG.nomeLoja} — Todos os direitos reservados. Feito com 💗 e muito carinho.`;
  document.title = CONFIG.nomeLoja + " | Encomendas artesanais";
}

renderStoreDetails();

// ===== AUX: TRAVAR SCROLL =====
function travarScroll(travar){
  document.body.style.overflow = travar ? "hidden" : "";
}

// ===== WHATSAPP LINK =====
function wppLink(texto){
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
}
const msgAjuda = `Olá ${CONFIG.nomeLoja}! Preciso de ajuda com meu pedido.`;
$("wppFloat").href = wppLink(msgAjuda);

// ===== RENDER FILTROS =====
function renderFiltros(){
  $("filtros").innerHTML = CATEGORIAS.map(c =>
    `<button class="filtro ${c.id===catAtiva?'ativo':''}" data-cat="${escHtml(c.id)}">${escHtml(c.emoji)} ${escHtml(c.nome)}</button>`
  ).join("");
  document.querySelectorAll(".filtro").forEach(b => b.onclick = () => {
    catAtiva = b.dataset.cat;
    renderFiltros();
    renderProdutos();
  });
}

// ===== RENDER PRODUTOS =====
function renderProdutos(){
  const lista = PRODUTOS.filter(p => catAtiva==="todos" || p.cat===catAtiva);
  if(lista.length===0){
    $("produtos").innerHTML = '<p class="catalogo-vazio">Nenhum produto disponível nesta categoria no momento.</p>';
    return;
  }
  $("produtos").innerHTML = lista.map(p => {
    const precoInicial = p.sizes ? p.sizes[0].p : p.preco;
    const sizesHtml = p.sizes ? `<div class="size-picker" data-prod="${p.id}">
      ${p.sizes.map((s,i)=>`<div class="size-opt ${i===0?'ativo':''}" data-idx="${i}">
        <small>${escHtml(s.l)} · ${escHtml(s.s)}</small><b>${fmt(s.p)}</b>
      </div>`).join("")}
    </div>` : "";
    const tagHtml = p.tag ? `<span class="prod-tag ${p.tag==='Promoção'?'promo':''}">${escHtml(p.tag)}</span>` : "";
    const imageHtml = p.img
      ? `<img src="${escHtml(p.img)}" loading="lazy" alt="${escHtml(p.nome)}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : "";
    return `<div class="prod-card">
      <div class="prod-img">
        ${tagHtml}
        ${imageHtml}
        <div class="fallback" style="${p.img?'display:none':''}">${escHtml(p.emoji)}</div>
      </div>
      <div class="prod-body">
        <h3>${escHtml(p.nome)}</h3>
        <p class="prod-desc">${escHtml(p.desc)}</p>
        ${sizesHtml}
        <div class="prod-foot">
          <div class="prod-preco">
            <b class="preco-${p.id}">${fmt(precoInicial)}</b>
            <small>${p.sizes?'a partir de':'preço unitário'}</small>
          </div>
          <button class="add-btn" data-id="${p.id}">+ Adicionar</button>
        </div>
      </div>
    </div>`;
  }).join("");

  // seleção de tamanho
  document.querySelectorAll(".size-picker").forEach(picker => {
    picker.querySelectorAll(".size-opt").forEach(opt => {
      opt.onclick = () => {
        picker.querySelectorAll(".size-opt").forEach(o=>o.classList.remove("ativo"));
        opt.classList.add("ativo");
        const prod = PRODUTOS.find(p=>p.id==picker.dataset.prod);
        const preco = prod.sizes[opt.dataset.idx].p;
        picker.closest(".prod-card")
          .querySelector(".preco-"+prod.id).textContent = fmt(preco);
      };
    });
  });

  // botão adicionar
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.onclick = () => {
      const prod = PRODUTOS.find(p=>p.id==btn.dataset.id);
      let sizeLabel = "", preco = prod.preco;
      if(prod.sizes){
        const ativo = btn.closest(".prod-card").querySelector(".size-opt.ativo");
        const idx = ativo.dataset.idx;
        sizeLabel = prod.sizes[idx].l + " (" + prod.sizes[idx].s + ")";
        preco = prod.sizes[idx].p;
      }
      adicionarCarrinho(prod, sizeLabel, preco);
    };
  });
}

// ===== CARRINHO =====
function salvarCarrinho(){
  localStorage.setItem("carrinhoDoceEncanto", JSON.stringify(carrinho));
}

function adicionarCarrinho(prod, sizeLabel, preco){
  const chave = prod.id + "|" + sizeLabel;
  const existente = carrinho.find(i => i.chave===chave);
  if(existente){ existente.qtd++; }
  else {
    carrinho.push({
      chave,
      id:prod.id,
      nome:prod.nome,
      emoji:prod.emoji,
      img:prod.img,
      sizeLabel,
      preco,
      qtd:1
    });
  }
  salvarCarrinho();
  atualizarCarrinho();
  toast(`✅ ${prod.nome} adicionado ao carrinho!`);
  abrirCarrinho();
}

function atualizarCarrinho(){
  const totalItens = carrinho.reduce((s,i)=>s+i.qtd,0);
  $("cartCount").textContent = totalItens;

  if(carrinho.length===0){
    $("cartItens").innerHTML = `
      <div class="cart-vazio">
        <div class="ico">🧁</div>
        <p>Seu carrinho está vazio.<br>Que tal escolher um docinho?</p>
        <a href="#cardapio" class="btn btn-primary" style="margin-top:16px" onclick="fecharCarrinho()">Ver cardápio</a>
      </div>`;
    $("cartFoot").style.display = "none";
  } else {
    $("cartItens").innerHTML = carrinho.map((i,idx) => `
      <div class="cart-item">
        <div class="thumb">
          ${i.img
            ? `<img src="${escHtml(i.img)}" alt="${escHtml(i.nome)}" loading="lazy" data-emoji="${escHtml(i.emoji)}">`
            : escHtml(i.emoji)}
        </div>
        <div class="info">
          <b>${escHtml(i.nome)}</b>
          <small>${escHtml(i.sizeLabel || 'Preço unitário')}</small>
          <span class="preco">${fmt(i.preco)} cada</span>
          <button class="remove-item" data-idx="${idx}">Remover</button>
        </div>
        <div class="qtd">
          <button data-idx="${idx}" data-op="-">−</button>
          <span>${i.qtd}</span>
          <button data-idx="${idx}" data-op="+">+</button>
        </div>
      </div>`).join("");

    $("cartFoot").style.display = "block";
    const subtotal = carrinho.reduce((s,i)=>s+i.preco*i.qtd,0);
    $("subtotal").textContent = fmt(subtotal);
    $("totalCart").textContent = fmt(subtotal + (tipoEntrega==="entrega"?CONFIG.taxaEntrega:0));
    $("taxaEntrega").textContent = tipoEntrega==="entrega" ? fmt(CONFIG.taxaEntrega) : "Grátis (retirada)";

    document.querySelectorAll(".qtd button").forEach(b => b.onclick = () => {
      const idx = +b.dataset.idx;
      if(b.dataset.op==="+") carrinho[idx].qtd++;
      else {
        carrinho[idx].qtd--;
        if(carrinho[idx].qtd<=0) carrinho.splice(idx,1);
      }
      salvarCarrinho();
      atualizarCarrinho();
    });
    document.querySelectorAll(".remove-item").forEach(b => b.onclick = () => {
      carrinho.splice(+b.dataset.idx,1);
      salvarCarrinho();
      atualizarCarrinho();
    });
    document.querySelectorAll(".cart-item .thumb img").forEach(img => {
      img.onerror = () => {
        img.style.display = "none";
        img.parentElement.textContent = img.dataset.emoji;
      };
    });
  }
}

function abrirCarrinho(){
  $("cartDrawer").classList.add("aberto");
  $("overlay").classList.add("aberto");
  travarScroll(true);
}
function fecharCarrinho(){
  $("cartDrawer").classList.remove("aberto");
  $("overlay").classList.remove("aberto");
  travarScroll(false);
}
$("cartBtn").onclick = abrirCarrinho;
$("cartClose").onclick = fecharCarrinho;
$("overlay").onclick = fecharCarrinho;

// ===== CHECKOUT =====
$("checkoutBtn").onclick = () => {
  if(carrinho.length===0) return;
  fecharCarrinho();
  etapaAtual = 1;
  mostrarEtapa(1);
  $("checkoutModal").classList.add("aberto");
  travarScroll(true);
};
$("modalClose").onclick = () => {
  $("checkoutModal").classList.remove("aberto");
  travarScroll(false);
};
$("fecharModal").onclick = () => {
  $("checkoutModal").classList.remove("aberto");
  travarScroll(false);
};
$("voltarCarrinho").onclick = () => {
  $("checkoutModal").classList.remove("aberto");
  travarScroll(false);
  abrirCarrinho();
};

function mostrarEtapa(n){
  etapaAtual = n;
  [1,2,3].forEach(i => {
    $("etapa"+i).classList.toggle("ativa", i===n);
    $("dot"+i).classList.toggle("ativo", i<=n);
  });
  if(n===2) preencherEtapa2();
}

// entrega / retirada
document.querySelectorAll(".opcao-ent").forEach(op => {
  op.onclick = () => {
    document.querySelectorAll(".opcao-ent").forEach(o=>o.classList.remove("ativo"));
    op.classList.add("ativo");
    tipoEntrega = op.dataset.tipo;
    $("campoEndereco").style.display = tipoEntrega==="entrega" ? "block" : "none";
    atualizarCarrinho();
  };
});

$("irEtapa2").onclick = () => {
  if(!$("cliNome").value.trim()){
    toast("⚠️ Por favor, informe seu nome.");
    $("cliNome").focus();
    return;
  }
  if(!$("cliTel").value.trim()){
    toast("⚠️ Por favor, informe seu telefone.");
    $("cliTel").focus();
    return;
  }
  if(tipoEntrega==="entrega" && !$("cliEndereco").value.trim()){
    toast("⚠️ Por favor, informe o endereço de entrega.");
    $("cliEndereco").focus();
    return;
  }
  mostrarEtapa(2);
};
$("voltarEtapa1").onclick = () => mostrarEtapa(1);

function calcularTotal(){
  const subtotal = carrinho.reduce((s,i)=>s+i.preco*i.qtd,0);
  const taxa = tipoEntrega==="entrega" ? CONFIG.taxaEntrega : 0;
  let total = subtotal + taxa;
  if(CONFIG.descontoPix>0) total = total * (1 - CONFIG.descontoPix/100);
  return {subtotal, taxa, total};
}

function preencherEtapa2(){
  const {subtotal, taxa, total} = calcularTotal();
  const descontoPix = CONFIG.descontoPix > 0
    ? subtotal + taxa - total
    : 0;
  let html = carrinho.map(i => `
    <div class="item-linha">
      <span>${i.qtd}x ${escHtml(i.nome)}${i.sizeLabel?' ('+escHtml(i.sizeLabel)+')':''}</span>
      <b>${fmt(i.preco*i.qtd)}</b>
    </div>`).join("");
  html += `<div class="item-linha" style="color:var(--cinza)">
    <span>Subtotal</span><span>${fmt(subtotal)}</span></div>`;
  html += `<div class="item-linha" style="color:var(--cinza)">
    <span>${tipoEntrega==='entrega'?'Entrega':'Retirada na loja'}</span>
    <span>${taxa>0?fmt(taxa):'Grátis'}</span></div>`;
  if(CONFIG.descontoPix>0){
    html += `<div class="item-linha" style="color:var(--verde-wpp-2)">
      <span>Desconto PIX (${CONFIG.descontoPix}%)</span>
      <span>-${fmt(descontoPix)}</span>
    </div>`;
  }
  html += `<div class="total"><span>Total a pagar</span><span>${fmt(total)}</span></div>`;
  $("resumoPedido").innerHTML = html;
  $("valorPix").textContent = fmt(total);
  $("pixChave").value = CONFIG.pixChave;

  try{
    const dadosPix = montarPayloadPix({
      chave: CONFIG.pixChave,
      valor: total,
      nome: CONFIG.pixNome,
      cidade: CONFIG.pixCidade,
    });
    $("qrPix").src =
      "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=" +
      encodeURIComponent(dadosPix);
    $("pixStatus").textContent = "QR Code PIX gerado para o valor total do pedido.";
  }catch(error){
    $("qrPix").removeAttribute("src");
    $("pixStatus").textContent = error.message;
    console.error("Não foi possível gerar o QR Code PIX:", error);
  }
}

$("copiarPix").onclick = () => {
  const input = $("pixChave");
  const copyText = async () => {
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(input.value);
    }else{
      input.focus();
      input.select();
      if(!document.execCommand("copy")) throw new Error("A cópia automática não está disponível.");
    }
  };
  copyText().then(
    () => toast("✅ Chave PIX copiada!"),
    () => toast("⚠️ Não foi possível copiar. Selecione e copie a chave manualmente.")
  );
};

$("irEtapa3").onclick = () => mostrarEtapa(3);

let comprovantePix = null;

function limparComprovante(){
  comprovantePix = null;
  $("comprovantePix").value = "";
  $("comprovantePreview").hidden = true;
  $("comprovanteImagem").hidden = true;
  $("comprovanteImagem").removeAttribute("src");
  $("comprovanteNome").textContent = "";
  $("comprovanteAviso").classList.remove("aviso-erro");
}

$("comprovantePix").addEventListener("change", () => {
  const file = $("comprovantePix").files[0];
  if(!file) return;
  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if(!tiposPermitidos.includes(file.type)){
    limparComprovante();
    toast("⚠️ Selecione uma imagem JPG, PNG, WebP ou PDF.");
    return;
  }
  if(file.size > 10 * 1024 * 1024){
    limparComprovante();
    toast("⚠️ O comprovante deve ter no máximo 10 MB.");
    return;
  }
  comprovantePix = file;
  $("comprovanteNome").textContent = file.name;
  $("comprovantePreview").hidden = false;
  if(file.type.startsWith("image/")){
    $("comprovanteImagem").src = URL.createObjectURL(file);
    $("comprovanteImagem").hidden = false;
  }else{
    $("comprovanteImagem").hidden = true;
  }
});

$("removerComprovante").addEventListener("click", limparComprovante);

$("enviarWpp").onclick = async () => {
  if(!comprovantePix){
    toast("⚠️ Selecione o comprovante do PIX antes de enviar.");
    $("comprovantePix").focus();
    return;
  }

  const nome = $("cliNome").value.trim() || "Cliente";
  const tel = $("cliTel").value.trim();
  const data = $("cliData").value;
  const obs = $("cliObs").value.trim();
  const endereco = $("cliEndereco").value.trim();
  const {subtotal, taxa, total} = calcularTotal();
  const pedidoId = `LC-${Date.now().toString().slice(-8)}`;
  const now = new Date();
  const enviadoEm = now.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  let msg = `🛍️ *NOVO PEDIDO — ${CONFIG.nomeLoja}*\n`;
  msg += `🔔 *Pedido:* ${pedidoId}\n`;
  msg += `🕒 *Enviado em:* ${enviadoEm}\n\n`;
  msg += `👤 *Cliente:* ${nome}\n`;
  msg += `📱 *Telefone:* ${tel}\n`;
  if(data) msg += `📅 *Data do evento:* ${data.split("-").reverse().join("/")}\n`;
  msg += `📦 *Tipo:* ${tipoEntrega==="entrega"?"Entrega em casa":"Retirada na loja"}\n`;
  if(tipoEntrega==="entrega" && endereco) msg += `📍 *Endereço:* ${endereco}\n`;
  msg += `\n🍰 *ITENS DO PEDIDO:*\n`;
  carrinho.forEach(i => {
    msg += `• ${i.qtd}x ${i.nome}${i.sizeLabel?' — '+i.sizeLabel:''} = ${fmt(i.preco*i.qtd)}\n`;
  });
  msg += `\n💰 *VALORES DO PEDIDO:*\n`;
  msg += `• Subtotal: ${fmt(subtotal)}\n`;
  msg += `• ${tipoEntrega==="entrega" ? "Entrega" : "Retirada"}: ${taxa > 0 ? fmt(taxa) : "Grátis"}\n`;
  if(CONFIG.descontoPix > 0){
    msg += `• Desconto PIX (${CONFIG.descontoPix}%): -${fmt(subtotal + taxa - total)}\n`;
  }
  msg += `• *Total via PIX: ${fmt(total)}*\n`;
  if(obs) msg += `\n📝 *Observações:* ${obs}\n`;
  msg += `\n📎 *Comprovante:* anexado junto a esta mensagem.\n\nAguardo confirmação! Obrigada 💗`;

  let shared = false;
  if(navigator.canShare && navigator.share){
    try{
      const shareData = {title: "Comprovante PIX - " + nome, text: msg, files: [comprovantePix]};
      if(navigator.canShare(shareData)){
        await navigator.share(shareData);
        shared = true;
      }
    }catch(error){
      if(error.name === "AbortError"){
        toast("Envio cancelado. Seu pedido continua no carrinho.");
        return;
      }
    }
  }

  if(!shared){
    const fallbackMsg = msg.replace(
      "📎 *Comprovante:* anexado junto a esta mensagem.",
      "📎 *Comprovante:* anexarei o comprovante selecionado nesta conversa."
    );
    window.open(wppLink(fallbackMsg), "_blank");
  }

  carrinho = [];
  salvarCarrinho();
  atualizarCarrinho();
  limparComprovante();
  toast(shared ? "🎉 Comprovante enviado!" : "🎉 Pedido aberto no WhatsApp. Anexe o comprovante selecionado.");
  setTimeout(()=>{
    $("checkoutModal").classList.remove("aberto");
    travarScroll(false);
  }, 1500);
};

// ===== TOAST =====
let toastTimer;
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("visivel");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("visivel"), 2800);
}

// ===== HEADER SCROLL + MENU MOBILE + ESC =====
const cliData = $("cliData");
if(cliData){
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
  cliData.min = localToday;
}

window.addEventListener("scroll", () =>
  $("header").classList.toggle("scrolled", window.scrollY>20)
);

$("menuToggle").onclick = () => $("navLinks").classList.toggle("aberto");
document.querySelectorAll(".nav-links a").forEach(a =>
  a.onclick = () => $("navLinks").classList.remove("aberto")
);

document.addEventListener("keydown", e => {
  if(e.key === "Escape"){
    if($("checkoutModal").classList.contains("aberto")){
      $("checkoutModal").classList.remove("aberto");
      travarScroll(false);
    }
    if($("cartDrawer").classList.contains("aberto")){
      fecharCarrinho();
    }
  }
});

function carregarConteudoLocal(){
  try{
    const savedProducts = localStorage.getItem("lunna-local-products-v1");
    if(savedProducts !== null){
      const products = JSON.parse(savedProducts);
      if(!Array.isArray(products)) throw new Error("O catálogo local não é uma lista válida.");
      PRODUTOS = products.filter(product => product.is_active).map(product => ({
        id: product.id,
        cat: product.category_id,
        nome: product.name,
        desc: product.description,
        emoji: product.emoji,
        img: product.image_url,
        tag: product.tag,
        sizes: product.sizes,
        preco: product.price,
      }));
    }

    if(localStoreSettings){
      $("heroTitle").textContent = localStoreSettings.hero_title || "";
      $("heroEmphasis").textContent = localStoreSettings.hero_emphasis || "";
      $("heroEnding").textContent = localStoreSettings.hero_ending || "";
      $("heroSubtitle").textContent = localStoreSettings.hero_subtitle || "";
      if(localStoreSettings.hero_image_url) $("heroImage").src = localStoreSettings.hero_image_url;
      $("heroImageWrap").hidden = !localStoreSettings.hero_image_visible;
      $("inicio").hidden = !localStoreSettings.hero_visible;
    }
  }catch(error){
    console.error("Não foi possível carregar as alterações locais da loja.", error);
  }
}

// ===== INIT =====
carregarConteudoLocal();
renderFiltros();
renderProdutos();
atualizarCarrinho();
$("taxaLabel").textContent = "+ " + fmt(CONFIG.taxaEntrega);
