const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken"); // ⬅️ NOVO!
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

// Chave secreta do .env
const JWT_SECRET = process.env.JWT_SECRET;

// 🔑 Função Middleware de Autenticação
const autenticarLoja = (req, res, next) => {
  // 1. Verificar se o header Authorization existe
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }

  // O formato deve ser "Bearer <token>"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Formato de token inválido (Bearer missing)." });
  }

  // 2. Verificar e decodificar o token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 💡 A MÁGICA MULTI-TENANT: Anexar o loja_id do token ao objeto de requisição
    // O token PRECISA conter o 'loja_id' quando for criado no login.
    if (!decoded.loja_id) {
      return res
        .status(403)
        .json({ message: "Token inválido: loja_id ausente." });
    }

    req.lojaId = decoded.loja_id;

    // 3. Chamar o próximo middleware/função de rota
    next();
  } catch (err) {
    console.error("Erro na verificação do JWT:", err.message);
    return res.status(403).json({ message: "Token inválido ou expirado." });
  }
};
// 🔑 Fim Função Middleware de Autenticação

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
  // 🔑 Adicionado loja_id
  const { nome, senha, loja_id } = req.body;

  // ⚠️ loja_id agora é obrigatório para registrar um admin
  if (!nome || !senha || !loja_id)
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

    // 🔑 O objeto a ser inserido agora inclui o loja_id
    const novoUsuario = { nome, senhaHash, loja_id };

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
      // 🔑 Agora, selecione 'id' e 'loja_id' também
      .select("id, senhaHash, loja_id")
      .eq("nome", nome)
      .limit(1);
    if (fetchError) throw fetchError;

    const usuario = usuarios[0];
    if (!usuario)
      return res.status(401).send({ message: "Credenciais inválidas." });

    const match = await bcrypt.compare(senha, usuario.senhaHash);

    if (match) {
      // ✅ LOGIN BEM-SUCEDIDO: Geração do JWT

      // 1. Verificar se o usuário está associado a uma loja
      if (!usuario.loja_id) {
        // Isso é importante para evitar erros nas rotas protegidas
        return res
          .status(403)
          .send({ message: "Usuário não associado a uma loja." });
      }

      // 2. Criar o Payload do Token
      const payload = {
        userId: usuario.id,
        loja_id: usuario.loja_id, // 🔑 O ID da loja é injetado no token
      };

      // 3. Gerar o Token
      const JWT_SECRET = process.env.JWT_SECRET; // Garantindo que a chave secreta é acessada
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" }); // Token expira em 8 horas

      console.log(
        `Usuário ${nome} logado com sucesso (Loja ID: ${usuario.loja_id}).`
      );

      // 4. Retornar o Token e o loja_id (opcional) ao frontend
      return res.status(200).send({
        message: "Login bem-sucedido!",
        token: token,
        loja_id: usuario.loja_id,
        nome: nome, // 🟢 novo campo
      });
    } else {
      return res.status(401).send({ message: "Credenciais inválidas." });
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).send({ message: "Erro ao fazer login." });
  }
});

// ---------------------------------------------
// CONFIGURAÇÕES GERAIS E STATUS (ROTAS MULTI-TENANT)
// ---------------------------------------------

// GET: Retorna todas as configurações da loja logada
app.get("/api/configuracoes", autenticarLoja, async (req, res) => {
  const lojaId = req.lojaId;
  const { scope } = req.query; // Pode ser usado para filtrar o que o frontend precisa

  try {
    const { data: config, error: fetchError } = await supabase
      .from("configuracoes_loja")
      .select("*") // Seleciona todos os campos
      .eq("loja_id", lojaId)
      .limit(1);

    if (fetchError) throw fetchError;

    const currentConfig = config[0];

    // Se a loja não tiver nenhuma configuração, retorna um objeto vazio para evitar erros
    if (!currentConfig) {
      return res.status(200).json({});
    }

    // Se o escopo for 'status_loja' (usado no painel de horários), retorna apenas o necessário
    if (scope === "status_loja") {
      return res.status(200).json({
        isForcedOpen: currentConfig.is_forced_open,
        scheduleConfig: currentConfig.schedule_config,
      });
    }

    // Caso contrário (chamado por ConfigLoja.js), retorna TUDO em camelCase
    return res.status(200).json({
      chave_pix: currentConfig.chave_pix,
      endereco_loja: currentConfig.endereco_loja,
      link_localizacao: currentConfig.link_localizacao,
      isForcedOpen: currentConfig.is_forced_open,
      scheduleConfig: currentConfig.schedule_config,
    });
  } catch (err) {
    console.error("Erro GET /api/configuracoes:", err);
    res.status(500).json({ message: "Erro ao buscar configuração." });
  }
});

// PUT: Atualiza/Insere qualquer campo de configuração enviado no corpo
app.put("/api/configuracoes", autenticarLoja, async (req, res) => {
  const lojaId = req.lojaId;

  // Extrai todos os campos possíveis do body (incluindo os novos)
  const {
    isForcedOpen,
    scheduleConfig,
    chave_pix,
    endereco_loja,
    link_localizacao,
  } = req.body;

  // Monta o objeto de dados a ser atualizado/inserido
  const updateData = {
    loja_id: lojaId,
  };

  // Adiciona apenas os campos que foram realmente enviados na requisição
  if (isForcedOpen !== undefined) {
    updateData.is_forced_open = isForcedOpen;
  }
  if (scheduleConfig !== undefined) {
    updateData.schedule_config = scheduleConfig;
  }
  if (chave_pix !== undefined) {
    updateData.chave_pix = chave_pix;
  }
  if (endereco_loja !== undefined) {
    updateData.endereco_loja = endereco_loja;
  }
  if (link_localizacao !== undefined) {
    updateData.link_localizacao = link_localizacao;
  }

  // Garante que há algo para atualizar além do loja_id
  if (Object.keys(updateData).length <= 1) {
    return res
      .status(400)
      .json({ message: "Nenhum campo válido fornecido para atualização." });
  }

  try {
    const { data: updatedData, error: updateError } = await supabase
      .from("configuracoes_loja")
      .upsert([updateData], { onConflict: ["loja_id"] })
      .select("*"); // Retorna todos os campos atualizados

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Falha ao atualizar/inserir configuração.");
    }

    // Converte os dados de snake_case para camelCase para o frontend
    const {
      chave_pix: returned_pix,
      endereco_loja: returned_endereco,
      link_localizacao: returned_link,
      is_forced_open: returned_open,
      schedule_config: returned_schedule,
    } = updatedData[0];

    // Retorna a configuração completa atualizada
    res.status(200).json({
      chave_pix: returned_pix,
      endereco_loja: returned_endereco,
      link_localizacao: returned_link,
      isForcedOpen: returned_open,
      scheduleConfig: returned_schedule,
    });
  } catch (err) {
    console.error("Erro PUT /api/configuracoes:", err);
    res.status(500).json({ message: "Erro ao atualizar configuração." });
  }
});

// ---------------------------------------------
// BUSCAR LOJA PELO SLUG (para o lanchonete-app)
// ---------------------------------------------
app.get("/api/lojas/slug/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from("configuracoes_loja")
      .select(
        `
        loja_id,
        nome,
        slug,
        telefone,
        logo_url,
        cor_principal,
        cor_secundaria,
        favicon_url,
        slogan
        `
      )
      .eq("slug", slug)
      .maybeSingle(); // 🔁 substitui .single() → ignora erro se 0 resultados

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ message: `Loja '${slug}' não encontrada.` });

    res.json({
      id: data.loja_id,
      nome: data.nome,
      slug: data.slug,
      telefone: data.telefone,
      logo_url: data.logo_url,
      cor_principal: data.cor_principal,
      cor_secundaria: data.cor_secundaria,
      favicon_url: data.favicon_url,
      slogan: data.slogan,
    });
  } catch (err) {
    console.error("Erro GET /api/lojas/slug:", err);
    res
      .status(500)
      .json({ message: "Erro ao buscar loja.", details: err.message });
  }
});

// ---------------------------------------------
// CARDÁPIO (AGORA SUPORTA MULTI-LOJA)
// ---------------------------------------------
app.get("/api/cardapio", async (req, res) => {
  try {
    const loja_id = req.query.loja_id;
    if (!loja_id) {
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
    }

    const { data: cardapio, error } = await supabase
      .from("cardapio")
      .select("*")
      .eq("loja_id", loja_id)
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

    if (!novoItem.loja_id) {
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
    }

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
      .insert([{ ...novoItem, loja_id: novoItem.loja_id }])
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

  if (!itemToUpdate.loja_id) {
    return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
  }

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
      .eq("loja_id", itemToUpdate.loja_id) // 🔒 garante atualização apenas da loja correta
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
  const loja_id = req.query.loja_id;

  if (!loja_id) {
    return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
  }

  try {
    const { error } = await supabase
      .from("cardapio")
      .delete()
      .eq("id", id)
      .eq("loja_id", loja_id); // 🔒 só apaga se for da loja correta

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error("Erro DELETE /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ---------------------------------------------
// CONFIGURAÇÃO DE PIZZA (MULTI-LOJA)
// ---------------------------------------------
app.get("/api/pizzas-config", async (req, res) => {
  try {
    const loja_id = req.query.loja_id;
    if (!loja_id)
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });

    const { data, error } = await supabase
      .from("pizza_config")
      .select("tamanhos, sabores")
      .eq("loja_id", loja_id)
      .single();

    if (error) throw error;
    if (!data)
      return res.status(404).json({ message: "Configuração não encontrada." });

    res.status(200).json({
      tamanhos: data.tamanhos || [],
      sabores: data.sabores || [],
    });
  } catch (err) {
    console.error("Erro GET /api/pizzas-config:", err);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ---------------------------------------------
// CONFIGURAÇÃO DE PIZZA (MULTI-LOJA)
// ---------------------------------------------
app.put("/api/pizzas-config", async (req, res) => {
  try {
    const { tamanhos, sabores, loja_id } = req.body;

    if (!loja_id) {
      return res.status(400).json({
        message: "⚠️ loja_id é obrigatório para controle multi-loja.",
      });
    }

    if (!Array.isArray(tamanhos) || !Array.isArray(sabores)) {
      return res.status(400).json({
        message: "Tamanhos e sabores devem ser arrays válidos.",
      });
    }

    // 🔄 Converte para JSON puro antes de enviar ao Supabase
    const payload = {
      loja_id,
      tamanhos: JSON.parse(JSON.stringify(tamanhos)),
      sabores: JSON.parse(JSON.stringify(sabores)),
    };

    const { data, error } = await supabase
      .from("pizza_config")
      .upsert(payload, { onConflict: "loja_id" })
      .select("tamanhos, sabores, loja_id")
      .single();

    if (error) {
      console.error("Erro Supabase:", error);
      throw error;
    }

    if (!data) {
      throw new Error("Falha ao salvar configuração de pizza.");
    }

    res.status(200).json({
      message: "Configuração salva com sucesso!",
      configuracao: data,
    });
  } catch (err) {
    console.error("Erro PUT /api/pizzas-config:", err);
    res.status(500).json({ message: "Falha ao salvar as configurações." });
  }
});

// ---------------------------------------------
// CATEGORIAS DE CARDÁPIO (MULTI-LOJA)
// ---------------------------------------------
app.get("/api/categorias", async (req, res) => {
  try {
    const loja_id = req.query.loja_id;
    if (!loja_id) {
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
    }

    const { data, error } = await supabase
      .from("categorias_cardapio")
      .select("*")
      .eq("loja_id", loja_id)
      .order("id", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro GET /api/categorias:", err);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/api/categorias", async (req, res) => {
  try {
    const { nome, loja_id } = req.body;
    if (!nome || !loja_id)
      return res
        .status(400)
        .json({ message: "⚠️ Campos obrigatórios: nome e loja_id." });

    const { data, error } = await supabase
      .from("categorias_cardapio")
      .insert([{ nome, loja_id }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Erro POST /api/categorias:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
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
app.get("/api/configuracoes-loja", async (req, res) => {
  try {
    const loja_id = req.query.loja_id;
    if (!loja_id)
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });

    const { data, error } = await supabase
      .from("configuracoes_loja")
      .select(
        "nome, slug, telefone, chave_pix, endereco_loja, link_localizacao, cor_principal, cor_secundaria, logo_url, favicon_url, slogan"
      )
      .eq("loja_id", loja_id)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found

    res.json(data || {});
  } catch (err) {
    console.error("Erro GET /api/configuracoes-loja:", err);
    res.status(500).json({ erro: "Erro ao buscar configurações da loja." });
  }
});

app.put("/api/configuracoes-loja", async (req, res) => {
  try {
    const {
      loja_id,
      nome,
      slug,
      telefone,
      chave_pix,
      endereco_loja,
      link_localizacao,
      cor_principal,
      cor_secundaria,
      logo_url,
      favicon_url,
      slogan,
    } = req.body;

    if (!loja_id)
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });

    const { data, error } = await supabase
      .from("configuracoes_loja")
      .upsert(
        {
          loja_id,
          nome,
          slug,
          telefone,
          chave_pix,
          endereco_loja,
          link_localizacao,
          cor_principal,
          cor_secundaria,
          logo_url,
          favicon_url,
          slogan,
        },
        { onConflict: "loja_id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    res.json({ sucesso: true, config: data });
  } catch (err) {
    console.error("Erro PUT /api/configuracoes-loja:", err);
    res.status(500).json({ erro: "Erro ao atualizar configurações." });
  }
});

// ---------------------------------------------
// PEDIDOS (Resumo + Status envia WhatsApp)
// ---------------------------------------------
app.post("/api/pedidos", async (req, res) => {
  try {
    // 🟢 Define o ID da loja (enviado pelo app do cliente)
    const lojaId = req.body.loja_id;

    if (!lojaId) {
      return res.status(400).json({
        message: "⚠️ loja_id é obrigatório para identificar a loja do pedido.",
      });
    }

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
      loja_id: lojaId, // 🟢 adiciona loja_id no pedido
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

      // 🟢 Busca a configuração da loja no Supabase (CHAVE PIX e LOCALIZAÇÃO)
      const { data: configLoja, error: configError } = await supabase
        .from("configuracoes_loja")
        .select("chave_pix, endereco_loja, link_localizacao")
        .eq("loja_id", lojaId)
        .single();

      if (configError || !configLoja) {
        console.error("Erro ao buscar configuração da loja:", configError);
      }

      // Valores padrão se não houver dados no Supabase
      const chavePix = configLoja?.chave_pix || "Chave PIX não configurada";
      const enderecoLoja =
        configLoja?.endereco_loja || "Endereço não configurado";
      const linkLocalizacao =
        configLoja?.link_localizacao || "Link da Localização não configurado.";

      // Lógica tipo pagamento
      if (pedido.forma_pagamento?.toLowerCase() === "pix") {
        mensagemResumo += `\n*💰 Pagamento:* PIX\n*Chave PIX:* ${chavePix}`;
      } else if (pedido.forma_pagamento?.toLowerCase() === "dinheiro") {
        mensagemResumo += `\n*💵 Pagamento:* Dinheiro`;
        if (pedido.troco)
          mensagemResumo += `\n*Troco para:* R$ ${pedido.troco}`;
      } else if (pedido.forma_pagamento?.toLowerCase() === "cartao") {
        mensagemResumo += `\n💳 *Pagamento:* Cartão`;
      }

      // Lógica tipo de entrega
      if (pedido.tipo_servico.toLowerCase() === "retirada") {
        mensagemResumo += `\n*📍 Retirada:* ${enderecoLoja}\n\n*📍 Nossa Localização:*\n${linkLocalizacao}`;
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

// ---------------------------------------------
// PEDIDOS (MULTI-LOJA)
// ---------------------------------------------
app.get("/api/pedidos", async (req, res) => {
  try {
    const loja_id = req.query.loja_id;
    if (!loja_id) {
      return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
    }

    const { data, error } = await supabase
      .from("pedidos_lanche")
      .select("*")
      .eq("loja_id", loja_id)
      .order("id", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro GET /api/pedidos:", err);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.put("/api/pedidos/:id", async (req, res) => {
  const pedidoId = req.params.id;
  const { status, loja_id } = req.body;

  if (!status) {
    return res
      .status(400)
      .json({ message: "Status é obrigatório para atualização." });
  }

  if (!loja_id) {
    return res
      .status(400)
      .json({ message: "⚠️ loja_id é obrigatório para controle multi-loja." });
  }

  try {
    const { data: pedidoAtualizado, error: updateError } = await supabase
      .from("pedidos_lanche")
      .update({ status })
      .eq("id", pedidoId)
      .eq("loja_id", loja_id) // 🟢 garante que a atualização seja apenas da loja correta
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
        mensagem = `Boa notícia *${pedido.cliente.nome}*!\nSeu pedido já está a caminho! 🚚`;
      } else if (tipo_servico.toLowerCase() === "retirada") {
        mensagem = `Boa notícia *${pedido.cliente.nome}*!\nSeu pedido já está pronto para retirada! 🏪`;
      }
    }

    if (mensagem && telefone_cliente?.trim()) {
      let telefoneLimpo = telefone_cliente.replace(/\D/g, "");
      if (telefoneLimpo.length === 11 && telefoneLimpo[2] === "9") {
        telefoneLimpo = telefoneLimpo.slice(0, 2) + telefoneLimpo.slice(3);
      }

      const numero = `55${telefoneLimpo}@c.us`;

      console.log("📞 Enviando mensagem para:", numero);
      console.log("📦 Mensagem:", mensagem);

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
  const { loja_id, periodo = "geral", status = "todos" } = req.query;

  if (!loja_id) {
    return res.status(400).json({ message: "⚠️ loja_id é obrigatório." });
  }

  // 🔹 Função auxiliar para calcular intervalo de datas
  const calcularDataFiltro = (periodo) => {
    const agora = new Date();
    let dataInicio = null;
    let dataFim = agora;

    if (periodo === "hoje") {
      dataInicio = new Date();
      dataInicio.setHours(0, 0, 0, 0);
    } else if (periodo === "15dias") {
      dataInicio = new Date();
      dataInicio.setDate(agora.getDate() - 15);
    } else if (periodo === "mes") {
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    }

    return { dataInicio, dataFim };
  };

  try {
    let query = supabase
      .from("pedidos_lanche")
      .select("*")
      .eq("loja_id", loja_id); // ✅ filtro multi-loja

    const { dataInicio, dataFim } = calcularDataFiltro(periodo);

    if (dataInicio && dataFim) {
      query = query
        .gte("data", dataInicio.toISOString())
        .lte("data", dataFim.toISOString());
    }

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

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
// CARRINHO (ISOLADO POR LOJA)
// ---------------------------------------------

// 🟢 Salvar ou atualizar carrinho
app.post("/api/carrinho", async (req, res) => {
  const { sessionId, itens, loja_id } = req.body;

  if (!sessionId || !loja_id) {
    return res
      .status(400)
      .json({ message: "⚠️ sessionId e loja_id são obrigatórios." });
  }

  try {
    // Verifica se já existe carrinho para a mesma sessão e loja
    const { data: existingCart, error: fetchError } = await supabase
      .from("carrinhos")
      .select("id")
      .eq("session_id", sessionId)
      .eq("loja_id", loja_id)
      .limit(1);

    if (fetchError) throw fetchError;

    let data, error;

    if (existingCart.length > 0) {
      // Atualiza o carrinho existente
      ({ data, error } = await supabase
        .from("carrinhos")
        .update({ itens, atualizado_em: new Date() })
        .eq("session_id", sessionId)
        .eq("loja_id", loja_id)
        .select());
    } else {
      // Cria novo carrinho isolado por loja
      ({ data, error } = await supabase
        .from("carrinhos")
        .insert([{ session_id: sessionId, loja_id, itens }])
        .select());
    }

    if (error) throw error;

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Erro POST/PUT /api/carrinho:", err);
    res.status(500).json({ message: "Erro ao salvar o carrinho." });
  }
});

// 🟢 Obter carrinho da loja atual
app.get("/api/carrinho/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { loja_id } = req.query;

  if (!sessionId || !loja_id) {
    return res
      .status(400)
      .json({ message: "⚠️ sessionId e loja_id são obrigatórios." });
  }

  try {
    const { data: carrinho, error } = await supabase
      .from("carrinhos")
      .select("itens")
      .eq("session_id", sessionId)
      .eq("loja_id", loja_id)
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
  const { loja_id, is_forced_open, schedule_config } = req.body;

  if (!loja_id) {
    return res
      .status(400)
      .json({ message: "⚠️ loja_id é obrigatório para controle multi-loja." });
  }

  try {
    // Verifica se já existe configuração para esta loja
    const { data: existingConfig, error: fetchError } = await supabase
      .from("configuracoes")
      .select("id")
      .eq("loja_id", loja_id)
      .limit(1);

    if (fetchError) throw fetchError;

    let updatedData;
    let updateError;

    if (!existingConfig || existingConfig.length === 0) {
      // 🟢 INSERE nova configuração para essa loja
      ({ data: updatedData, error: updateError } = await supabase
        .from("configuracoes")
        .insert([{ loja_id, is_forced_open, schedule_config }])
        .select("is_forced_open, schedule_config, loja_id"));
    } else {
      // 🟢 ATUALIZA apenas a loja correspondente
      ({ data: updatedData, error: updateError } = await supabase
        .from("configuracoes")
        .update({ is_forced_open, schedule_config })
        .eq("loja_id", loja_id)
        .select("is_forced_open, schedule_config, loja_id"));
    }

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      throw new Error("Falha ao atualizar/inserir configuração.");
    }

    const { is_forced_open: forcedOpen, schedule_config: schedule } =
      updatedData[0];

    res.status(200).json({
      isForcedOpen: forcedOpen,
      scheduleConfig: schedule,
    });
  } catch (err) {
    console.error("Erro PUT /api/admin/configuracoes:", err);
    res.status(500).json({ message: "Erro ao atualizar configuração." });
  }
});

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
