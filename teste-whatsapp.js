const { Client, LocalAuth } = require("whatsapp-web.js");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: false }, // deixa abrir o navegador para ver a sessão
});

client.on("qr", (qr) => {
  console.log("Escaneie este QR no WhatsApp:", qr);
});

client.on("ready", async () => {
  console.log("Cliente WhatsApp pronto!");

  // Substitua pelo seu número de teste com DDD
  const numero = "5592993312208@c.us";
  const mensagem = "Teste de envio do WhatsApp!";

  try {
    const sent = await client.sendMessage(numero, mensagem);
    console.log("Mensagem enviada:", sent.id.id);
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
  }
});

client.initialize();
