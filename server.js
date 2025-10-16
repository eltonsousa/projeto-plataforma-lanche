const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { formatPrice } = require("./utils/format");

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

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Tipos permitidos
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Aceita
  } else {
    cb(
      new Error(
        "Tipo de arquivo inválido. Apenas JPG, PNG ou WEBP são permitidos."
      )
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter,
});
// Carregar imagens do Buckets Supabase

app.post("/api/upload", (req, res) => {
  upload.single("imagem")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "file too large" });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      const file = req.file;
      const fileBuffer = file.buffer; // O buffer contém os dados binários da imagem
      const originalFileName = req.body.originalFileName || "image"; // Nome enviado pelo App.js

      // 1. GERAÇÃO DO HASH DE CONTEÚDO (Deduplicação)
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      // 2. CRIAÇÃO DO NOME DETERMINÍSTICO
      // Pega a extensão original do arquivo
      const fileExtension = originalFileName.split(".").pop() || "jpeg";
      // Combina o hash do conteúdo e a extensão para um nome único e estável
      const deterministicFileName = `${hash}.${fileExtension}`;

      const filePath = `cardapio/${deterministicFileName}`;

      // 3. UPLOAD/DEDUPLICAÇÃO USANDO SUPABASE STORAGE
      // O Supabase Storage usa 'upsert: true' para reutilizar um arquivo se ele já existir
      // com o mesmo nome, garantindo que não haja duplicação de arquivo físico
      // se o conteúdo for idêntico e o nome (o hash) for o mesmo.
      const { data, error } = await supabase.storage
        .from("imagens") // Altere o nome do seu Bucket se for diferente
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: true, // 🟢 CHAVE DA DEDUPLICAÇÃO: Sobrescreve ou cria, mas com nome determinístico
        });

      if (error) {
        console.error("Erro Supabase Storage:", error);
        throw new Error(`Falha no Supabase: ${error.message}`);
      }

      // 4. RETORNA A URL PÚBLICA ESTÁVEL
      const { data: publicURLData } = supabase.storage
        .from("imagens")
        .getPublicUrl(filePath);

      if (!publicURLData.publicUrl) {
        throw new Error("Falha ao gerar URL pública.");
      }

      // Retorna a URL estável baseada no hash
      res.status(200).json({ url: publicURLData.publicUrl });
    } catch (error) {
      // Trata erros de limite de tamanho/tipo de arquivo do Multer/Supabase
      let errorMessage = error.message;
      if (errorMessage.includes("file too large")) {
        errorMessage = "O arquivo é muito grande. Limite: 2 MB.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });
});

// Fim carregar imagens do Buckets Supabase

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

    // 🔹 Garantir que 'adicionais' seja JSON ou null
    if (novoItem.adicionais && typeof novoItem.adicionais === "string") {
      try {
        novoItem.adicionais = JSON.parse(novoItem.adicionais);
      } catch {
        novoItem.adicionais = null;
      }
    }

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

  // 🔹 Garantir que 'adicionais' seja JSON ou null
  if (itemToUpdate.adicionais && typeof itemToUpdate.adicionais === "string") {
    try {
      itemToUpdate.adicionais = JSON.parse(itemToUpdate.adicionais);
    } catch {
      itemToUpdate.adicionais = null;
    }
  }

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
// CONFIGURAÇÕES DE PIZZA
// ---------------------------------------------
// GET: Carrega as configurações de pizza
app.get("/api/pizzas-config", async (req, res) => {
  try {
    // Tenta buscar o único registro (ID 1) para configurações de pizza
    const { data, error } = await supabase
      .from("pizza_config")
      .select("tamanhos, sabores")
      .eq("id", 1) // ID 1 é o registro principal de configurações
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      throw error;
    }

    // Se o registro não for encontrado ou houver erro, retorna estrutura vazia
    if (!data) {
      return res.status(200).json({ tamanhos: [], sabores: [] });
    }

    // Retorna os dados (tamanhos e sabores)
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro GET /api/pizzas-config:", err);
    res
      .status(500)
      .json({ message: "Erro ao carregar configurações de pizza." });
  }
});

// PUT: Salva as configurações de pizza (usado pelo Admin)
app.put("/api/pizzas-config", async (req, res) => {
  const { tamanhos, sabores } = req.body;
  if (!tamanhos || !sabores) {
    return res
      .status(400)
      .json({ message: "Tamanhos e sabores são obrigatórios." });
  }

  try {
    // Tenta inserir ou atualizar o registro de ID 1 usando upsert
    const { data: updatedData, error: updateError } = await supabase
      .from("pizza_config")
      .upsert(
        { id: 1, tamanhos, sabores }, // Upsert data
        { onConflict: "id" } // Conflito no ID 1 para atualizar
      )
      .select("tamanhos, sabores");

    if (updateError) throw updateError;

    if (!updatedData || updatedData.length === 0) {
      throw new Error("Falha ao atualizar/inserir configuração de pizza.");
    }

    res.status(200).json(updatedData[0]);
  } catch (err) {
    console.error("Erro PUT /api/pizzas-config:", err);
    res
      .status(500)
      .json({ message: "Erro ao atualizar configuração de pizza." });
  }
});

// ---------------------------------------------
// CATEGORIAS DE CARDÁPIO
// ---------------------------------------------
app.get("/api/categorias", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categorias_cardapio")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro GET /api/categorias:", err);
    res.status(500).json({ message: "Erro ao carregar categorias." });
  }
});

app.post("/api/categorias", async (req, res) => {
  try {
    const novaCategoria = req.body;
    delete novaCategoria.id;
    const { data, error } = await supabase
      .from("categorias_cardapio")
      .insert([novaCategoria])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Erro POST /api/categorias:", err);
    res.status(500).json({ message: "Erro ao criar categoria." });
  }
});

app.put("/api/categorias/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const categoria = req.body;
  delete categoria.id;

  try {
    const { data, error } = await supabase
      .from("categorias_cardapio")
      .update(categoria)
      .eq("id", id)
      .select();
    if (error) throw error;

    if (!data || data.length === 0)
      return res.status(404).json({ message: "Categoria não encontrada." });

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Erro PUT /api/categorias:", err);
    res.status(500).json({ message: "Erro ao atualizar categoria." });
  }
});

app.delete("/api/categorias/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { error } = await supabase
      .from("categorias_cardapio")
      .delete()
      .eq("id", id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error("Erro DELETE /api/categorias:", err);
    res.status(500).json({ message: "Erro ao excluir categoria." });
  }
});

// ===============================================
// 🟢 CONFIGURAÇÕES DA LOJA (CHAVE PIX / ENDEREÇO / MAPS)
// ===============================================
app.get("/api/configuracoes/:loja_id", async (req, res) => {
  try {
    const { loja_id } = req.params;
    const { data, error } = await supabase
      .from("configuracoes")
      .select("chave_pix, endereco_loja, link_localizacao")
      .eq("loja_id", loja_id)
      .single();

    if (error) throw error;
    res.json(data || {});
  } catch (err) {
    console.error("Erro ao buscar configurações:", err);
    res.status(500).json({ erro: "Erro ao buscar configurações da loja." });
  }
});

// Atualizar configurações
app.put("/api/configuracoes/:loja_id", async (req, res) => {
  try {
    const { loja_id } = req.params;
    const { chave_pix, endereco_loja, link_localizacao } = req.body;

    const { error } = await supabase.from("configuracoes").upsert(
      {
        loja_id,
        chave_pix,
        endereco_loja,
        link_localizacao,
      },
      { onConflict: "loja_id" }
    );

    if (error) throw error;
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao atualizar configurações:", err);
    res.status(500).json({ erro: "Erro ao atualizar configurações." });
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

      // Lista de itens com adicionais e observações
      if (pedido.itens && Array.isArray(pedido.itens)) {
        pedido.itens.forEach((item) => {
          const precoItem = formatPrice(item.preco || 0);

          // Linha principal
          mensagemResumo += `${item.quantidade}x ${item.nome} - ${precoItem}\n`;

          // Adicionais
          if (
            item.adicionais &&
            Array.isArray(item.adicionais) &&
            item.adicionais.length > 0
          ) {
            mensagemResumo += `   ➕ Adicionais:\n`;
            item.adicionais.forEach((adicional) => {
              const precoAdicional = formatPrice(adicional.preco || 0);
              mensagemResumo += `      • ${adicional.nome} (+${precoAdicional})\n`;
            });
          }

          // Observação (se houver)
          if (item.observacao && item.observacao.trim() !== "") {
            mensagemResumo += `   📝 Obs: ${item.observacao}\n`;
          }

          mensagemResumo += "\n";
        });
      } else {
        mensagemResumo += "_Nenhum item encontrado no pedido._\n";
      }
      // Fim lista de itens com adicionais e observações

      const totalPedido = formatPrice(pedido.total || 0);
      mensagemResumo += `\n*💰 Total:* ${totalPedido}`;
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
// CONFIGURAÇÕES GLOBAIS (STATUS DA LOJA)
// ---------------------------------------------

// Rota para LER o status completo (consumida pelo lanchonete-app e lanchonete-admin)
app.get("/api/admin/status", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("configuracoes")
      // 🟢 Modificação: Seleciona os dois campos
      .select("is_forced_open, schedule_config")
      .limit(1);

    if (error) throw error;

    // Se o registro não existe, retorna valores padrão
    const isForcedOpen = data.length > 0 ? data[0].is_forced_open : false;
    // Retorna a configuração de horário ou null
    const scheduleConfig = data.length > 0 ? data[0].schedule_config : null;

    // Retorna ambos os dados
    res.status(200).json({ isForcedOpen, scheduleConfig });
  } catch (err) {
    console.error("Erro GET /api/admin/status:", err);
    res.status(500).json({ message: "Erro ao buscar status de configuração." });
  }
});

// -------------------------------------------------------------------
// 🟢 NOVA ROTA: Rota genérica para ATUALIZAR QUALQUER CONFIGURAÇÃO
// -------------------------------------------------------------------
app.put("/api/admin/configuracoes", async (req, res) => {
  // O payload pode conter 'is_forced_open' ou 'schedule_config'
  const updatePayload = req.body;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: "Nenhum campo para atualizar." });
  }

  try {
    // 1. Busca o ID existente
    const { data: existingConfig, error: fetchError } = await supabase
      .from("configuracoes")
      .select("id")
      .limit(1);

    if (fetchError) throw fetchError;

    let updatedData;
    let updateError;

    // Lógica robusta: INSERE se não existe, ATUALIZA se existe
    if (existingConfig.length === 0) {
      // INSERE
      ({ data: updatedData, error: updateError } = await supabase
        .from("configuracoes")
        .insert([updatePayload])
        .select("is_forced_open, schedule_config"));
    } else {
      // ATUALIZA
      const configId = existingConfig[0].id;
      ({ data: updatedData, error: updateError } = await supabase
        .from("configuracoes")
        .update(updatePayload)
        .eq("id", configId)
        .select("is_forced_open, schedule_config"));
    }

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Falha ao atualizar/inserir configuração.");
    }

    const { is_forced_open, schedule_config } = updatedData[0];

    // Retorna a configuração completa atualizada
    res.status(200).json({
      isForcedOpen: is_forced_open,
      scheduleConfig: schedule_config,
    });
  } catch (err) {
    console.error("Erro PUT /api/admin/configuracoes:", err);
    res.status(500).json({ message: "Erro ao atualizar configuração." });
  }
});

// 🔴 Rota PUT /api/admin/status REMOVIDA: A função de atualização foi migrada para a rota PUT /api/admin/configuracoes

// ---------------------------------------------
// FIM CONFIGURAÇÕES GLOBAIS (STATUS DA LOJA)
// ---------------------------------------------

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
