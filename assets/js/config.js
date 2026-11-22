const CONFIG = {
  nomeLoja: "Lunna Caseirinhos - Bolos e Doces",
  whatsapp: "5562992957741",
  emailContato: "contato@lunnacaseirinhos.com.br",
  horarioAtendimento: "Ter–Dom: 9h às 19h",
  // Para celular, use o formato internacional +55 e confirme que ele está cadastrado como chave PIX.
  pixChave: "+5562992957741",
  pixNome: "LUNNA CASEIRINHOS",
  pixCidade: "APARECIDA GO",
  mapaUrl: "https://maps.app.goo.gl/DiMESyobbbc5EbVH8",
  endereco: "R. Tamboril, qd 05 - lt 02 - Res. Caraibas, Aparecida de Goiânia - GO, 74846-880",
  taxaEntrega: 15.00,
  descontoPix: 0,
};

if (!/^\d+$/.test(CONFIG.whatsapp)) {
  console.warn("CONFIG.whatsapp deve conter apenas dígitos (DDI + DDD + número). Ex: 5562992957741");
}
if (!/^\+55\d{10,11}$/.test(CONFIG.pixChave) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONFIG.pixChave) &&
    !/^\d{11,14}$/.test(CONFIG.pixChave) &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(CONFIG.pixChave)) {
  console.warn("CONFIG.pixChave deve ser uma chave PIX válida: CPF, e-mail, celular, CNPJ ou chave aleatória.");
}
