const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

// Whatsapp
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");

// Carrega variáveis do .env
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = 3001;
const path = require("path");

// Inicializa Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Carregar imagens do Buckets Supabase
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }); // mantém em memória
// Carregar imagens do Buckets Supabase

app.post("/api/upload", upload.single("imagem"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const file = req.file;
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `cardapio/${fileName}`;

    // Faz upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from("imagens")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) throw error;

    // Gera URL pública
    const { data: publicUrl } = supabase.storage
      .from("imagens")
      .getPublicUrl(filePath);

    res.json({ url: publicUrl.publicUrl });
  } catch (err) {
    console.error("Erro ao enviar imagem:", err);
    res.status(500).json({ error: "Erro ao enviar imagem" });
  }
});
//

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Whatsapp Client
let qrCodeAtual = null;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ["--no-sandbox"] },
});

client.on("qr", (qr) => {
  console.log("QR RECEIVED", qr);
  qrcode.generate(qr, { small: true });
  qrCodeAtual = qr;
});

client.on("ready", () => {
  console.log("WhatsApp Client está rodando!");
  qrCodeAtual = null;
});

client.initialize();

// Rota para exibir QR Code no navegador
app.get("/api/whatsapp-qr", async (req, res) => {
  if (!qrCodeAtual) {
    return res
      .status(200)
      .send("<h2>✅ WhatsApp já conectado ou aguardando QR...</h2>");
  }
  try {
    const qrImage = await QRCode.toDataURL(qrCodeAtual);
    res.send(`
      <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;">
          <h2>Escaneie o QR Code abaixo para conectar o WhatsApp 📱</h2>
          <img src="${qrImage}" style="width:300px;height:300px;"/>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Erro ao gerar QR Code.");
  }
});

// ---------------------------------------------
// AUTENTICAÇÃO (SUPABASE)
// ---------------------------------------------
app.post("/api/usuarios/registrar", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha)
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });

  try {
    const { data: usuarioExistente, error: checkError } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("nome", nome)
      .limit(1);
    if (checkError) throw checkError;

    if (usuarioExistente.length > 0)
      return res.status(409).send({ message: "Nome de usuário já existe." });

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = { nome, senhaHash };

    const { data, error: insertError } = await supabase
      .from("usuarios")
      .insert([novoUsuario])
      .select();
    if (insertError) throw insertError;

    console.log("Novo usuário registrado:", data[0]);
    res.status(201).send({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).send({ message: "Erro ao registrar usuário." });
  }
});

app.post("/api/usuarios/login", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha)
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });

  try {
    const { data: usuarios, error: fetchError } = await supabase
      .from("usuarios")
      .select("senhaHash")
      .eq("nome", nome)
      .limit(1);
    if (fetchError) throw fetchError;

    const usuario = usuarios[0];
    if (!usuario)
      return res.status(401).send({ message: "Credenciais inválidas." });

    const match = await bcrypt.compare(senha, usuario.senhaHash);
    if (match) {
      console.log(`Usuário ${nome} logado com sucesso.`);
      return res.status(200).send({ message: "Login bem-sucedido!" });
    } else {
      return res.status(401).send({ message: "Credenciais inválidas." });
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).send({ message: "Erro ao fazer login." });
  }
});

// ---------------------------------------------
// CARDÁPIO
// ---------------------------------------------
app.get("/api/cardapio", async (req, res) => {
  try {
    const { data: cardapio, error } = await supabase
      .from("cardapio")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    res.status(200).json(cardapio);
  } catch (err) {
    console.error("Erro GET /api/cardapio:", err);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/api/cardapio", async (req, res) => {
  try {
    const novoItem = req.body;
    delete novoItem.id;

    const { data, error } = await supabase
      .from("cardapio")
      .insert([novoItem])
      .select();
    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Erro POST /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

app.put("/api/cardapio/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const itemToUpdate = req.body;
  delete itemToUpdate.id;

  try {
    const { data, error } = await supabase
      .from("cardapio")
      .update(itemToUpdate)
      .eq("id", id)
      .select();
    if (error) throw error;

    if (!data || data.length === 0)
      return res.status(404).json({ message: "Item não encontrado." });

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Erro PUT /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

app.delete("/api/cardapio/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { error } = await supabase.from("cardapio").delete().eq("id", id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error("Erro DELETE /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ---------------------------------------------
// PEDIDOS (Resumo + Status envia WhatsApp)
// ---------------------------------------------
app.post("/api/pedidos", async (req, res) => {
  try {
    const { cliente, itens, total, tipo_servico } = req.body;
    const novoPedido = {
      cliente,
      itens,
      total,
      status: "Em preparação",
      telefone_cliente: cliente.telefone,
      tipo_servico,
      forma_pagamento: cliente.pagamento || null,
      troco: cliente.troco || null,
    };

    const { data, error } = await supabase
      .from("pedidos_lanche")
      .insert([novoPedido])
      .select();
    if (error) throw error;

    const pedido = data[0];
    console.log("Novo pedido:", pedido);

    // 🔹 Envio do resumo para o cliente
    if (pedido.telefone_cliente?.trim()) {
      let telefoneLimpo = pedido.telefone_cliente.replace(/\D/g, "");
      if (telefoneLimpo.length === 11 && telefoneLimpo[2] === "9") {
        telefoneLimpo = telefoneLimpo.slice(0, 2) + telefoneLimpo.slice(3);
      }
      const numero = `55${telefoneLimpo}@c.us`;

      let mensagemResumo = `👋 Olá *${pedido.cliente.nome}*! Estamos preparando seu pedido e avisaremos quando estiver pronto.\n\n*🏷️ Resumo do seu Pedido:*\n`;

      // Lista de itens
      pedido.itens.forEach((item) => {
        const precoItem = parseFloat(item.preco || 0).toFixed(2);
        mensagemResumo += `${item.quantidade}x ${item.nome} - R$ ${precoItem}\n`;
      });

      const totalPedido = parseFloat(pedido.total || 0).toFixed(2);
      mensagemResumo += `\n*💰 Total:* R$ ${totalPedido}`;
      mensagemResumo += `\n*🚚 Serviço:* ${pedido.tipo_servico}`;

      // Lógica tipo pagamento
      if (pedido.forma_pagamento?.toLowerCase() === "pix") {
        mensagemResumo += `\n*💰 Pagamento:* PIX\n*Chave PIX:* ${process.env.CHAVE_PIX}`;
      } else if (pedido.forma_pagamento?.toLowerCase() === "dinheiro") {
        mensagemResumo += `\n*💵 Pagamento:* Dinheiro`;
        if (pedido.troco)
          mensagemResumo += `\n*Troco para:* R$ ${pedido.troco}`;
      } else if (pedido.forma_pagamento?.toLowerCase() === "cartao") {
        mensagemResumo += `\n💳 *Pagamento:* Cartão`;
      }

      // Lógica tipo de entrega
      if (pedido.tipo_servico.toLowerCase() === "retirada") {
        mensagemResumo += `\n*📍 Retirada:* Av. Exemplo, 123 - Novo Israel\n\n*📍 Nossa Localização:*\n${process.env.LOCALIZACAO_LOJA}`;
      } else {
        mensagemResumo += `\n*📍 Entrega:* ${
          pedido.cliente.endereco || "Endereço informado pelo cliente"
        }`;
      }

      client
        .sendMessage(numero, mensagemResumo)
        .then(() => console.log("Resumo do pedido enviado!"))
        .catch((err) => console.error("Erro ao enviar resumo:", err));
    }

    res.status(201).json({ message: "Pedido recebido com sucesso!", pedido });
  } catch (err) {
    console.error("Erro POST /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

app.get("/api/pedidos", async (req, res) => {
  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos_lanche")
      .select("*")
      .order("id", { ascending: false });
    if (error) throw error;
    res.status(200).json(pedidos);
  } catch (err) {
    console.error("Erro GET /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

app.put("/api/pedidos/:id", async (req, res) => {
  const pedidoId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res
      .status(400)
      .json({ message: "Status é obrigatório para atualização." });
  }

  try {
    const { data: pedidoAtualizado, error: updateError } = await supabase
      .from("pedidos_lanche")
      .update({ status })
      .eq("id", pedidoId)
      .select();

    if (updateError) throw updateError;

    if (!pedidoAtualizado || pedidoAtualizado.length === 0) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    const pedido = pedidoAtualizado[0];
    console.log("Pedido atualizado:", pedido);

    const { telefone_cliente, tipo_servico } = pedido;

    let mensagem = "";
    if (status.toLowerCase() === "pronto para entrega") {
      if (tipo_servico.toLowerCase() === "entrega") {
        mensagem = `Boa notícia *${pedido.cliente.nome}*\nseu pedido já está a caminho! 🚚`;
      } else if (tipo_servico.toLowerCase() === "retirada") {
        mensagem = `Boa notícia *${pedido.cliente.nome}*\nseu pedido já está pronto para retirada! 🚚`;
      }
    }

    if (mensagem && telefone_cliente?.trim()) {
      let telefoneLimpo = pedido.telefone_cliente.replace(/\D/g, "");
      if (telefoneLimpo.length === 11 && telefoneLimpo[2] === "9") {
        telefoneLimpo = telefoneLimpo.slice(0, 2) + telefoneLimpo.slice(3);
      }

      const numero = `55${telefoneLimpo}@c.us`;

      console.log("Telefone bruto:", telefone_cliente);
      console.log("Número final que será enviado:", numero);
      console.log("Mensagem:", mensagem);

      client
        .sendMessage(numero, mensagem)
        .then(() => console.log("Mensagem de status enviada com sucesso!"))
        .catch((err) => console.error("Erro ao enviar mensagem:", err));
    }

    res.status(200).json({
      message: "Status do pedido atualizado com sucesso.",
      pedido,
    });
  } catch (err) {
    console.error("Erro na rota PUT /api/pedidos/:id:", err);
    res.status(500).json({ message: "Erro ao atualizar o status do pedido." });
  }
});

// ---------------------------------------------
// RELATÓRIOS
// ---------------------------------------------
const calcularDataFiltro = (periodo) => {
  const dataFim = new Date();
  const dataInicio = new Date();

  switch (periodo) {
    case "hoje":
      dataInicio.setHours(0, 0, 0, 0);
      break;
    case "15dias":
      dataInicio.setDate(dataFim.getDate() - 15);
      dataInicio.setHours(0, 0, 0, 0);
      break;
    case "mes":
      dataInicio.setDate(1);
      dataInicio.setHours(0, 0, 0, 0);
      break;
    case "geral":
    default:
      return { dataInicio: null, dataFim: null };
  }
  return { dataInicio, dataFim };
};

app.get("/api/pedidos/relatorio", async (req, res) => {
  const { periodo, status } = req.query;
  let query = supabase.from("pedidos_lanche").select("*");

  const { dataInicio, dataFim } = calcularDataFiltro(periodo);
  if (dataInicio && dataFim)
    query = query
      .gte("data", dataInicio.toISOString())
      .lte("data", dataFim.toISOString());

  if (status && status !== "todos") query = query.eq("status", status);

  try {
    const { data: pedidosFiltrados, error } = await query.order("id", {
      ascending: false,
    });
    if (error) throw error;

    const totalPedidos = pedidosFiltrados.length;
    const faturamento = pedidosFiltrados.reduce(
      (sum, pedido) => sum + parseFloat(pedido.total),
      0
    );

    res.status(200).json({
      pedidos: pedidosFiltrados,
      totalPedidos,
      faturamento: faturamento.toFixed(2),
      periodo,
    });
  } catch (err) {
    console.error("Erro GET /api/pedidos/relatorio:", err);
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao gerar relatório." });
  }
});

// ---------------------------------------------
// CARRINHO
// ---------------------------------------------
app.post("/api/carrinho", async (req, res) => {
  const { sessionId, itens } = req.body;

  try {
    const { data: existingCart, error: fetchError } = await supabase
      .from("carrinhos")
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);
    if (fetchError) throw fetchError;

    let data, error;
    if (existingCart.length > 0) {
      ({ data, error } = await supabase
        .from("carrinhos")
        .update({ itens, atualizado_em: new Date() })
        .eq("session_id", sessionId)
        .select());
    } else {
      ({ data, error } = await supabase
        .from("carrinhos")
        .insert([{ session_id: sessionId, itens }])
        .select());
    }
    if (error) throw error;

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Erro POST/PUT /api/carrinho:", err);
    res.status(500).json({ message: "Erro ao salvar o carrinho." });
  }
});

app.get("/api/carrinho/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const { data: carrinho, error } = await supabase
      .from("carrinhos")
      .select("itens")
      .eq("session_id", sessionId)
      .limit(1);
    if (error) throw error;

    const itens = carrinho.length > 0 ? carrinho[0].itens : [];
    res.status(200).json(itens);
  } catch (err) {
    console.error("Erro GET /api/carrinho:", err);
    res.status(500).json({ message: "Erro ao carregar o carrinho." });
  }
});

// ---------------------------------------------
// FRONTEND
// ---------------------------------------------
app.use(
  "/admin",
  express.static(path.join(__dirname, "lanchonete-admin", "build"))
);
app.get(/\/admin\/.*/, (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-admin", "build", "index.html")
  );
});

app.use(express.static(path.join(__dirname, "lanchonete-app", "build")));
app.get(/.*/, (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-app", "build", "index.html")
  );
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
