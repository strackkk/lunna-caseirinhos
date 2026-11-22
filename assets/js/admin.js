const admin$ = id => document.getElementById(id);
const LOCAL_PRODUCTS_KEY = "lunna-local-products-v1";
const LOCAL_SETTINGS_KEY = "lunna-local-settings-v1";
let adminProducts = [];
let savedHeroImageUrl = "";
let savedProductImageUrl = "";

function showNotice(message, type){
  const notice = admin$("adminNotice");
  notice.textContent = message;
  notice.className = "admin-notice visible " + type;
}

function clearNotice(){
  const notice = admin$("adminNotice");
  notice.textContent = "";
  notice.className = "admin-notice";
}

function readLocalValue(key, fallback){
  const value = localStorage.getItem(key);
  if(value === null) return fallback;
  try{
    return JSON.parse(value);
  }catch(error){
    throw new Error("Os dados locais da loja estão inválidos: " + error.message);
  }
}

function saveLocalValue(key, value){
  try{
    localStorage.setItem(key, JSON.stringify(value));
  }catch(error){
    if(error.name === "QuotaExceededError" || error.code === 22){
      throw new Error("O armazenamento deste navegador está cheio. Use URLs de imagem ou remova algumas fotos.");
    }
    throw new Error("Não foi possível salvar neste navegador: " + error.message);
  }
}

function getLocalSettings(){
  const saved = readLocalValue(LOCAL_SETTINGS_KEY, {});
  if(!saved || typeof saved !== "object" || Array.isArray(saved)){
    throw new Error("Os dados da loja precisam estar em um formato válido.");
  }
  return {
    hero_visible: true,
    hero_image_visible: true,
    hero_title: "Bolos que tornam",
    hero_emphasis: "momentos",
    hero_ending: "inesquecíveis",
    hero_subtitle: "Encomende seu bolo artesanal online em poucos cliques. Escolha o sabor, o tamanho, pague via PIX e receba em casa — ou retire na loja. Doceria de verdade, com aquele sabor de feito em casa.",
    hero_image_url: "",
    nomeLoja: CONFIG.nomeLoja,
    whatsapp: CONFIG.whatsapp,
    emailContato: CONFIG.emailContato,
    horarioAtendimento: CONFIG.horarioAtendimento,
    pixChave: CONFIG.pixChave,
    pixNome: CONFIG.pixNome,
    pixCidade: CONFIG.pixCidade,
    mapaUrl: CONFIG.mapaUrl,
    endereco: CONFIG.endereco,
    taxaEntrega: CONFIG.taxaEntrega,
    descontoPix: CONFIG.descontoPix,
    ...saved,
  };
}

async function uploadImage(file){
  if(!file) return null;
  if(!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)){
    throw new Error("Use uma imagem JPG, PNG, WebP ou GIF.");
  }
  if(file.size > 512 * 1024) throw new Error("No modo local, cada foto deve ter no máximo 512 KB.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("Não foi possível ler a foto selecionada.")));
    reader.readAsDataURL(file);
  });
}

function mapProduct(product){
  return {
    id: product.id,
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    emoji: product.emoji,
    image_url: product.image_url || "",
    tag: product.tag || "",
    sizes: product.sizes || null,
    price: product.price,
    stock: product.stock != null ? Number(product.stock) : null,
    is_active: product.is_active,
    sort_order: product.sort_order,
  };
}

function productPrice(product){
  if(product.sizes && product.sizes.length) return "A partir de R$ " + Number(product.sizes[0].p).toFixed(2).replace(".", ",");
  if(product.price != null) return "R$ " + Number(product.price).toFixed(2).replace(".", ",");
  return "Preço não definido";
}

function renderProducts(){
  const list = admin$("productList");
  list.replaceChildren();

  const search = admin$("productSearch") ? admin$("productSearch").value.trim().toLowerCase() : "";
  const status = admin$("productStatusFilter") ? admin$("productStatusFilter").value : "todos";
  const filtered = adminProducts.filter(product => {
    const matchesSearch = !search ||
      String(product.name || "").toLowerCase().includes(search) ||
      String(product.description || "").toLowerCase().includes(search);
    const matchesStatus = status === "todos" ||
      (status === "ativos" && product.is_active) ||
      (status === "ocultos" && !product.is_active);
    return matchesSearch && matchesStatus;
  });

  if(!filtered.length){
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = adminProducts.length
      ? "Nenhum produto corresponde aos filtros."
      : "Nenhum produto cadastrado ainda.";
    list.append(empty);
    updateOverview();
    return;
  }

  filtered.forEach(product => {
    const row = document.createElement("article");
    row.className = "admin-product" + (product.is_active ? "" : " is-inactive");
    const image = product.image_url ? document.createElement("img") : document.createElement("div");
    if(product.image_url){
      image.src = product.image_url;
      image.alt = "";
      image.loading = "lazy";
    }else{
      image.className = "product-placeholder";
      image.textContent = product.emoji || "🍰";
    }

    const details = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = product.name;
    const description = document.createElement("p");
    const stockText = product.stock == null
      ? "Estoque ilimitado"
      : product.stock <= 5
        ? `Estoque baixo: ${product.stock}`
        : `Estoque: ${product.stock}`;
    description.textContent =
      productPrice(product) + " · " + stockText +
      (product.is_active ? "" : " · Oculto");
    details.append(name, description);

    const actions = document.createElement("div");
    actions.className = "admin-product-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => openProductEditor(product));
    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.textContent = product.is_active ? "Ocultar" : "Publicar";
    visibility.addEventListener("click", () => toggleProduct(product));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Excluir";
    remove.addEventListener("click", () => deleteProduct(product));
    actions.append(edit, visibility, remove);
    row.append(image, details, actions);
    list.append(row);
  });
  updateOverview();
}

function updateOverview(){
  const activeCount = adminProducts.filter(product => product.is_active).length;
  const stockCount = adminProducts.reduce((sum, product) =>
    sum + (product.stock != null ? Number(product.stock) : 0), 0);
  let orders = [];
  try{
    orders = readLocalValue("lunna-local-orders-v1", []);
    if(!Array.isArray(orders)) orders = [];
  }catch{
    orders = [];
  }
  const confirmedOrders = orders.filter(order => order.status === "confirmado");
  const soldCount = confirmedOrders.reduce((sum, order) =>
    sum + (Array.isArray(order.items)
      ? order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0)
      : 0), 0);
  const revenue = confirmedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  if(admin$("adminProductCount")) admin$("adminProductCount").textContent = adminProducts.length;
  if(admin$("adminActiveCount")) admin$("adminActiveCount").textContent = activeCount;
  if(admin$("adminCategoryCount")) admin$("adminCategoryCount").textContent =
    CATEGORIAS.filter(category => category.id !== "todos").length;
  if(admin$("adminStockCount")) admin$("adminStockCount").textContent = stockCount;
  if(admin$("adminSoldCount")) admin$("adminSoldCount").textContent = soldCount;
  if(admin$("adminRevenue")) admin$("adminRevenue").textContent =
    "R$ " + revenue.toFixed(2).replace(".", ",");
}

async function loadProducts(){
  const savedProducts = readLocalValue(LOCAL_PRODUCTS_KEY, null);
  const initialProducts = PRODUTOS.map((product, index) => ({
    id: product.id,
    category_id: product.cat,
    name: product.nome,
    description: product.desc,
    emoji: product.emoji,
    image_url: product.img,
    tag: product.tag || "",
    sizes: product.sizes || null,
    price: product.sizes ? null : product.preco,
    stock: null,
    is_active: true,
    sort_order: index,
  }));
  adminProducts = (savedProducts || initialProducts).map(mapProduct);
  updateOverview();
  renderProducts();
}

async function loadSettings(){
  const settings = getLocalSettings();

  admin$("storeNameInput").value = settings.nomeLoja;
  admin$("storeWhatsappInput").value = settings.whatsapp;
  admin$("storeEmailInput").value = settings.emailContato;
  admin$("storeHoursInput").value = settings.horarioAtendimento;
  admin$("storePixKeyInput").value = settings.pixChave;
  admin$("storePixNameInput").value = settings.pixNome;
  admin$("storePixCityInput").value = settings.pixCidade;
  admin$("storeDeliveryFeeInput").value = settings.taxaEntrega;
  admin$("storePixDiscountInput").value = settings.descontoPix;
  admin$("storeAddressInput").value = settings.endereco;
  admin$("storeMapUrlInput").value = settings.mapaUrl;
  admin$("heroVisible").checked = settings.hero_visible;
  admin$("heroImageVisible").checked = settings.hero_image_visible;
  admin$("heroTitleInput").value = settings.hero_title || "";
  admin$("heroEmphasisInput").value = settings.hero_emphasis || "";
  admin$("heroEndingInput").value = settings.hero_ending || "";
  admin$("heroSubtitleInput").value = settings.hero_subtitle || "";
  savedHeroImageUrl = settings.hero_image_url || "";
  admin$("heroImageUrlInput").value = savedHeroImageUrl.startsWith("data:") ? "" : savedHeroImageUrl;
  previewImage("heroImageUrlInput", "heroPreviewWrap", "heroPreview", savedHeroImageUrl);
}

function previewImage(inputId, wrapId, imageId, fallbackUrl){
  const url = admin$(inputId).value.trim() || fallbackUrl || "";
  admin$(imageId).src = url;
  admin$(wrapId).hidden = !url;
}

function checkedImageUrl(value){
  return checkedHttpUrl(value, "A URL da imagem");
}

function checkedHttpUrl(value, label){
  const url = value.trim();
  if(!url) return "";
  let parsed;
  try{
    parsed = new URL(url);
  }catch{
    throw new Error(label + " deve ser uma URL válida.");
  }
  if(parsed.protocol !== "https:" && parsed.protocol !== "http:"){
    throw new Error(label + " deve começar com http:// ou https://.");
  }
  return parsed.href;
}

function checkedPixKey(value){
  const key = value.trim();
  const valid = /^\+55\d{10,11}$/.test(key) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) ||
    /^\d{11,14}$/.test(key) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
  if(!valid) throw new Error("Informe uma chave PIX válida (celular, e-mail, CPF/CNPJ ou chave aleatória).");
  return key;
}

async function saveStoreDetails(event){
  event.preventDefault();
  clearNotice();
  const button = event.submitter;
  if(button) button.disabled = true;
  try{
    const whatsapp = admin$("storeWhatsappInput").value.trim();
    if(!/^\d+$/.test(whatsapp)){
      throw new Error("O WhatsApp deve conter somente números, incluindo DDI e DDD.");
    }

    const settings = {
      ...getLocalSettings(),
      nomeLoja: admin$("storeNameInput").value.trim(),
      whatsapp,
      emailContato: admin$("storeEmailInput").value.trim(),
      horarioAtendimento: admin$("storeHoursInput").value.trim(),
      pixChave: checkedPixKey(admin$("storePixKeyInput").value),
      pixNome: admin$("storePixNameInput").value.trim(),
      pixCidade: admin$("storePixCityInput").value.trim(),
      taxaEntrega: Number(admin$("storeDeliveryFeeInput").value),
      descontoPix: Number(admin$("storePixDiscountInput").value),
      endereco: admin$("storeAddressInput").value.trim(),
      mapaUrl: checkedHttpUrl(admin$("storeMapUrlInput").value, "O link do mapa"),
    };
    if(settings.taxaEntrega < 0 || !Number.isFinite(settings.taxaEntrega)){
      throw new Error("A taxa de entrega deve ser um valor igual ou maior que zero.");
    }
    if(settings.descontoPix < 0 || settings.descontoPix > 100 || !Number.isFinite(settings.descontoPix)){
      throw new Error("O desconto no PIX deve estar entre 0 e 100%.");
    }
    saveLocalValue(LOCAL_SETTINGS_KEY, settings);
    showNotice("Dados da loja salvos neste navegador. Recarregue a loja para conferir.", "success");
  }catch(error){
    showNotice("Não foi possível salvar os dados da loja: " + error.message, "error");
  }finally{
    if(button) button.disabled = false;
  }
}

function populateCategories(){
  admin$("productCategory").replaceChildren();
  CATEGORIAS.filter(category => category.id !== "todos").forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.nome;
    admin$("productCategory").append(option);
  });
}

function openProductEditor(product){
  const form = admin$("productForm");
  form.reset();
  admin$("productId").value = product ? product.id : "";
  admin$("productEditorTitle").textContent = product ? "Editar produto" : "Novo produto";
  admin$("productName").value = product ? product.name : "";
  admin$("productCategory").value = product ? product.category_id : CATEGORIAS.find(item => item.id !== "todos").id;
  admin$("productEmoji").value = product ? product.emoji : "🍰";
  admin$("productDescription").value = product ? product.description : "";
  admin$("productTag").value = product ? product.tag : "";
  savedProductImageUrl = product ? product.image_url : "";
  admin$("productImageUrl").value = savedProductImageUrl.startsWith("data:") ? "" : savedProductImageUrl;
  admin$("productPrice").value = product && product.price != null ? product.price : "";
  admin$("productStock").value = product && product.stock != null ? product.stock : "";
  admin$("productSizes").value = product && product.sizes
    ? product.sizes.map(size => `${size.l} | ${Number(size.p).toFixed(2).replace(".", ",")} | ${size.s}`).join("\n")
    : "";
  admin$("productImageFile").value = "";
  previewImage("productImageUrl", "productPreviewWrap", "productPreview", savedProductImageUrl);
  admin$("productEditor").hidden = false;
  admin$("productEditor").scrollIntoView({behavior: "smooth", block: "start"});
}

function parseSizes(text){
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if(!lines.length) return null;
  return lines.map((line, index) => {
    const parts = line.split("|").map(part => part.trim());
    const price = Number(parts[1] && parts[1].replace(",", "."));
    if(parts.length !== 3 || !parts[0] || !Number.isFinite(price) || price <= 0 || !parts[2]){
      throw new Error(`Confira a linha ${index + 1} dos tamanhos. Use: tamanho | preço | rendimento.`);
    }
    return {l: parts[0], p: price, s: parts[2]};
  });
}

async function saveSettings(event){
  event.preventDefault();
  clearNotice();
  const button = event.submitter;
  if(button) button.disabled = true;
  try{
    const uploadedImage = await uploadImage(admin$("heroImageFile").files[0]);
    const settings = {
      ...getLocalSettings(),
      hero_visible: admin$("heroVisible").checked,
      hero_image_visible: admin$("heroImageVisible").checked,
      hero_title: admin$("heroTitleInput").value.trim(),
      hero_emphasis: admin$("heroEmphasisInput").value.trim(),
      hero_ending: admin$("heroEndingInput").value.trim(),
      hero_subtitle: admin$("heroSubtitleInput").value.trim(),
      hero_image_url: uploadedImage || checkedImageUrl(admin$("heroImageUrlInput").value) || savedHeroImageUrl,
    };
    saveLocalValue(LOCAL_SETTINGS_KEY, settings);
    savedHeroImageUrl = settings.hero_image_url;
    admin$("heroImageUrlInput").value = savedHeroImageUrl.startsWith("data:") ? "" : savedHeroImageUrl;
    admin$("heroImageFile").value = "";
    previewImage("heroImageUrlInput", "heroPreviewWrap", "heroPreview", savedHeroImageUrl);
    showNotice("Banner salvo neste navegador.", "success");
  }catch(error){
    showNotice("Não foi possível salvar o banner: " + error.message, "error");
  }finally{
    if(button) button.disabled = false;
  }
}

async function saveProduct(event){
  event.preventDefault();
  clearNotice();
  const button = event.submitter;
  if(button) button.disabled = true;
  try{
    const sizes = parseSizes(admin$("productSizes").value);
    const priceValue = admin$("productPrice").value;
    const stockValue = admin$("productStock").value;
    const stock = stockValue === "" ? null : Number(stockValue);
    if(stock != null && (!Number.isInteger(stock) || stock < 0)){
      throw new Error("O estoque deve ser um número inteiro igual ou maior que zero.");
    }
    if(!sizes && (!priceValue || Number(priceValue) <= 0)){
      throw new Error("Informe um preço maior que zero ou preencha os tamanhos.");
    }
    if(sizes && priceValue){
      throw new Error("Use preço unitário ou tamanhos, não os dois ao mesmo tempo.");
    }
    const uploadedImage = await uploadImage(admin$("productImageFile").files[0]);
    const idValue = admin$("productId").value;
    const existingProduct = idValue
      ? adminProducts.find(item => item.id === Number(idValue))
      : null;
    const product = {
      category_id: admin$("productCategory").value,
      name: admin$("productName").value.trim(),
      description: admin$("productDescription").value.trim(),
      emoji: admin$("productEmoji").value.trim(),
      tag: admin$("productTag").value.trim() || null,
      image_url: uploadedImage || checkedImageUrl(admin$("productImageUrl").value) || savedProductImageUrl || null,
      sizes,
      price: sizes ? null : Number(priceValue),
      stock,
      is_active: existingProduct ? existingProduct.is_active : true,
      sort_order: existingProduct ? existingProduct.sort_order : adminProducts.length,
    };
    if(idValue){
      product.id = Number(idValue);
      adminProducts = adminProducts.map(item => item.id === product.id ? product : item);
    }else{
      product.id = Math.max(0, ...adminProducts.map(item => Number(item.id) || 0)) + 1;
      adminProducts.push(product);
    }
    saveLocalValue(LOCAL_PRODUCTS_KEY, adminProducts);
    admin$("productEditor").hidden = true;
    await loadProducts();
    showNotice("Produto salvo neste navegador.", "success");
  }catch(error){
    showNotice("Não foi possível salvar o produto: " + error.message, "error");
  }finally{
    if(button) button.disabled = false;
  }
}

async function toggleProduct(product){
  try{
    adminProducts = adminProducts.map(item =>
      item.id === product.id ? {...item, is_active: !item.is_active} : item
    );
    saveLocalValue(LOCAL_PRODUCTS_KEY, adminProducts);
    await loadProducts();
    showNotice(product.is_active ? "Produto ocultado neste navegador." : "Produto exibido neste navegador.", "success");
  }catch(error){
    showNotice("Não foi possível alterar a publicação: " + error.message, "error");
  }
}

async function deleteProduct(product){
  if(!window.confirm(`Excluir "${product.name}" permanentemente?`)) return;
  try{
    adminProducts = adminProducts.filter(item => item.id !== product.id);
    saveLocalValue(LOCAL_PRODUCTS_KEY, adminProducts);
    await loadProducts();
    showNotice("Produto removido deste navegador.", "success");
  }catch(error){
    showNotice("Não foi possível excluir o produto: " + error.message, "error");
  }

  function getLocalOrders(){
    try{
      const orders = readLocalValue("lunna-local-orders-v1", []);
      return Array.isArray(orders) ? orders : [];
    }catch{
      return [];
    }
  }

  function formatAdminDate(value){
    if(!value) return "Data não informada";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
  }

  function renderOrders(){
    const list = admin$("orderList");
    if(!list) return;
    list.replaceChildren();
    const search = (admin$("orderSearch")?.value || "").trim().toLowerCase();
    const status = admin$("orderStatusFilter")?.value || "todos";
    const filtered = getLocalOrders().filter(order => {
      const matchesStatus = status === "todos" || order.status === status;
      const matchesSearch = !search ||
        String(order.id || "").toLowerCase().includes(search) ||
        String(order.customerName || "").toLowerCase().includes(search) ||
        String(order.phone || "").toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });

    if(!filtered.length){
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "Nenhum pedido encontrado.";
      list.append(empty);
      return;
    }

    filtered.forEach(order => {
      const card = document.createElement("article");
      card.className = "admin-order";
      const head = document.createElement("div");
      head.className = "admin-order-head";
      const title = document.createElement("h3");
      title.textContent = `${order.id} · ${order.customerName || "Cliente"}`;
      const badge = document.createElement("span");
      badge.className = "admin-order-status " + (order.status || "pendente");
      badge.textContent = order.status || "pendente";
      head.append(title, badge);

      const meta = document.createElement("div");
      meta.className = "admin-order-meta";
      [
        `Telefone: ${order.phone || "-"}`,
        `Recebido: ${formatAdminDate(order.createdAt)}`,
        `Entrega: ${order.deliveryType === "entrega" ? "Entrega em casa" : "Retirada"}`,
        `Evento: ${order.eventDate ? order.eventDate.split("-").reverse().join("/") : "-"}`,
      ].forEach(text => {
        const item = document.createElement("span");
        item.textContent = text;
        meta.append(item);
      });

      const items = document.createElement("div");
      items.className = "admin-order-items";
      items.textContent = (order.items || []).map(item =>
        `${item.quantity}x ${item.name}${item.size ? " (" + item.size + ")" : ""}`
      ).join(" · ");

      const total = document.createElement("div");
      total.className = "admin-order-total";
      const value = document.createElement("strong");
      value.textContent = "R$ " + Number(order.total || 0).toFixed(2).replace(".", ",");
      const actions = document.createElement("div");
      actions.className = "admin-order-actions";
      if(order.status !== "confirmado"){
        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "confirm-order";
        confirm.textContent = "Confirmar venda";
        confirm.addEventListener("click", () => setOrderStatus(order.id, "confirmado"));
        actions.append(confirm);
      }
      if(order.status !== "cancelado"){
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "cancel-order";
        cancel.textContent = "Cancelar";
        cancel.addEventListener("click", () => setOrderStatus(order.id, "cancelado"));
        actions.append(cancel);
      }
      total.append(value, actions);
      card.append(head, meta, items, total);
      list.append(card);
    });
  }

  function setOrderStatus(orderId, status){
    const orders = getLocalOrders();
    const order = orders.find(item => item.id === orderId);
    if(!order) return;
    const previousStatus = order.status;
    order.status = status;
    saveLocalValue("lunna-local-orders-v1", orders);

    if(previousStatus !== "cancelado" && status === "cancelado"){
      restoreOrderStock(order);
    }
    if(previousStatus === "cancelado" && status === "confirmado"){
      deductOrderStock(order);
    }
    renderOrders();
    updateOverview();
    showNotice(status === "confirmado"
      ? "Venda confirmada e registrada."
      : "Pedido cancelado.", status === "confirmado" ? "success" : "error");
  }

  function restoreOrderStock(order){
    const saved = readLocalValue(LOCAL_PRODUCTS_KEY, null);
    if(!Array.isArray(saved)) return;
    const updated = saved.map(product => {
      const quantity = (order.items || []).filter(item => item.productId == product.id)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return quantity && product.stock != null
        ? {...product, stock: Number(product.stock) + quantity}
        : product;
    });
    saveLocalValue(LOCAL_PRODUCTS_KEY, updated);
    adminProducts = updated.map(mapProduct);
    renderProducts();
  }

  function deductOrderStock(order){
    const saved = readLocalValue(LOCAL_PRODUCTS_KEY, null);
    if(!Array.isArray(saved)) return;
    const updated = saved.map(product => {
      const quantity = (order.items || []).filter(item => item.productId == product.id)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return quantity && product.stock != null
        ? {...product, stock: Math.max(0, Number(product.stock) - quantity)}
        : product;
    });
    saveLocalValue(LOCAL_PRODUCTS_KEY, updated);
    adminProducts = updated.map(mapProduct);
    renderProducts();
  }
}

function bootAdmin(){
  populateCategories();
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(item => item.classList.remove("ativo"));
      document.querySelectorAll(".admin-section").forEach(section => section.classList.remove("active"));
      tab.classList.add("ativo");
      const section = admin$(tab.dataset.section);
      if(section) section.classList.add("active");
    });
  });
  if(admin$("productSearch")){
    admin$("productSearch").addEventListener("input", renderProducts);
  }
  if(admin$("productStatusFilter")){
    admin$("productStatusFilter").addEventListener("change", renderProducts);
  }
  if(admin$("orderSearch")){
    admin$("orderSearch").addEventListener("input", renderOrders);
  }
  if(admin$("orderStatusFilter")){
    admin$("orderStatusFilter").addEventListener("change", renderOrders);
  }
  admin$("storeDetailsForm").addEventListener("submit", saveStoreDetails);
  admin$("settingsForm").addEventListener("submit", saveSettings);
  admin$("productForm").addEventListener("submit", saveProduct);
  admin$("newProductButton").addEventListener("click", () => openProductEditor(null));
  admin$("cancelProductEdit").addEventListener("click", () => admin$("productEditor").hidden = true);
  admin$("cancelProductButton").addEventListener("click", () => admin$("productEditor").hidden = true);
  admin$("heroImageUrlInput").addEventListener("input", () => {
    savedHeroImageUrl = "";
    previewImage("heroImageUrlInput", "heroPreviewWrap", "heroPreview");
  });
  admin$("productImageUrl").addEventListener("input", () => {
    savedProductImageUrl = "";
    previewImage("productImageUrl", "productPreviewWrap", "productPreview");
  });
  admin$("clearHeroImageButton").addEventListener("click", () => {
    savedHeroImageUrl = "";
    admin$("heroImageUrlInput").value = "";
    admin$("heroImageFile").value = "";
    previewImage("heroImageUrlInput", "heroPreviewWrap", "heroPreview");
  });
  admin$("clearProductImageButton").addEventListener("click", () => {
    savedProductImageUrl = "";
    admin$("productImageUrl").value = "";
    admin$("productImageFile").value = "";
    previewImage("productImageUrl", "productPreviewWrap", "productPreview");
  });
  admin$("heroImageFile").addEventListener("change", () => {
    const file = admin$("heroImageFile").files[0];
    if(file){
      admin$("heroPreview").src = URL.createObjectURL(file);
      admin$("heroPreviewWrap").hidden = false;
    }else{
      previewImage("heroImageUrlInput", "heroPreviewWrap", "heroPreview", savedHeroImageUrl);
    }
  });
  admin$("productImageFile").addEventListener("change", () => {
    const file = admin$("productImageFile").files[0];
    if(file){
      admin$("productPreview").src = URL.createObjectURL(file);
      admin$("productPreviewWrap").hidden = false;
    }else{
      previewImage("productImageUrl", "productPreviewWrap", "productPreview", savedProductImageUrl);
    }
  });
  try{
    loadProducts();
    loadSettings();
    renderOrders();
  }catch(error){
    showNotice("Não foi possível carregar os dados locais: " + error.message, "error");
  }
  admin$("resetLocalDataButton").addEventListener("click", () => {
    if(!window.confirm("Restaurar o catálogo e o banner para o conteúdo inicial? As alterações locais serão apagadas.")) return;
    try{
      localStorage.removeItem(LOCAL_PRODUCTS_KEY);
      localStorage.removeItem(LOCAL_SETTINGS_KEY);
      window.location.reload();
    }catch(error){
      showNotice("Não foi possível restaurar o conteúdo inicial: " + error.message, "error");
    }
  });
}

bootAdmin();
