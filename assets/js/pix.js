function pixTlv(tag, value){
  const content = String(value);
  const length = new TextEncoder().encode(content).length;
  if(length > 99) throw new Error("Campo PIX excede o limite permitido.");
  return tag + String(length).padStart(2, "0") + content;
}

function pixCrc16(value){
  let crc = 0xFFFF;
  for(const byte of new TextEncoder().encode(value)){
    crc ^= byte << 8;
    for(let bit = 0; bit < 8; bit++){
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function pixTexto(value, maxLength){
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function montarPayloadPix({chave, valor, nome, cidade}){
  const key = String(chave || "").trim();
  const amount = Number(valor);
  const merchantName = pixTexto(nome, 25);
  const merchantCity = pixTexto(cidade, 15);

  if(!key) throw new Error("Configure uma chave PIX em assets/js/config.js.");
  if(!Number.isFinite(amount) || amount <= 0) throw new Error("O valor do PIX deve ser maior que zero.");
  if(!merchantName || !merchantCity) throw new Error("Configure o nome e a cidade do recebedor do PIX.");

  const merchantAccount = pixTlv("00", "BR.GOV.BCB.PIX") + pixTlv("01", key);
  const payload =
    pixTlv("00", "01") +
    pixTlv("26", merchantAccount) +
    pixTlv("52", "0000") +
    pixTlv("53", "986") +
    pixTlv("54", amount.toFixed(2)) +
    pixTlv("58", "BR") +
    pixTlv("59", merchantName) +
    pixTlv("60", merchantCity) +
    pixTlv("62", pixTlv("05", "***")) +
    "6304";

  return payload + pixCrc16(payload);
}
