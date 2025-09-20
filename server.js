const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
const port = 3001;
const path = require("path");
const fs = require("fs"); // Importe o módulo 'fs'

app.use(cors());
app.use(express.json());

// Adicione esta linha para servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------
// PERSISTÊNCIA DE CARDÁPIO
// ---------------------------------------------

// Crie a array 'cardapio' e carregue os dados do arquivo
let cardapio = [];
const cardapioFilePath = path.join(__dirname, "cardapio.json");

// Carregar o cardápio do arquivo no início
try {
  const data = fs.readFileSync(cardapioFilePath, "utf8");
  cardapio = JSON.parse(data);
  console.log("Cardápio carregado do arquivo.");
} catch (error) {
  console.error(
    "Arquivo de cardápio não encontrado ou corrompido. Iniciando com cardápio vazio."
  );
}

// Função para salvar o cardápio no arquivo
const salvarCardapio = () => {
  fs.writeFile(cardapioFilePath, JSON.stringify(cardapio, null, 2), (err) => {
    if (err) {
      console.error("Erro ao salvar o cardápio:", err);
    } else {
      console.log("Cardápio salvo com sucesso!");
    }
  });
};

// ---------------------------------------------
// PERSISTÊNCIA DE USUÁRIOS (NOVO BLOCO)
// ---------------------------------------------

let usuarios = [];
const usuariosFilePath = path.join(__dirname, "usuarios.json");

// Carregar Usuários do arquivo no início
try {
  const data = fs.readFileSync(usuariosFilePath, "utf8");
  usuarios = JSON.parse(data);
  console.log("Usuários carregados do arquivo.");
} catch (error) {
  console.log(
    "Arquivo de usuários não encontrado. Iniciando com lista de usuários vazia."
  );
}

// Função para salvar os usuários no arquivo
const salvarUsuarios = () => {
  fs.writeFile(usuariosFilePath, JSON.stringify(usuarios, null, 2), (err) => {
    if (err) {
      console.error("Erro ao salvar os usuários:", err);
    } else {
      console.log("Usuários salvos no arquivo.");
    }
  });
};

// ---------------------------------------------
// DADOS EM MEMÓRIA (NÃO PERSISTENTES)
// ---------------------------------------------

let pedidos = []; // Os pedidos continuam em memória, pois são dados temporários

// ---------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// ---------------------------------------------

// ROTA PARA REGISTRAR UM NOVO USUÁRIO
app.post("/api/usuarios/registrar", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });
  }
  const usuarioExistente = usuarios.find((u) => u.nome === nome);
  if (usuarioExistente) {
    return res.status(409).send({ message: "Nome de usuário já existe." });
  }
  try {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    const novoUsuario = { nome, senhaHash };
    usuarios.push(novoUsuario);

    // CHAMA A FUNÇÃO DE SALVAMENTO DE USUÁRIOS
    salvarUsuarios();

    console.log("Novo usuário registrado:", novoUsuario);
    res.status(201).send({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    res.status(500).send({ message: "Erro ao registrar usuário." });
  }
});

// ROTA: LOGIN DO USUÁRIO
app.post("/api/usuarios/login", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });
  }
  const usuario = usuarios.find((u) => u.nome === nome);
  if (!usuario) {
    return res.status(401).send({ message: "Credenciais inválidas." });
  }
  try {
    const match = await bcrypt.compare(senha, usuario.senhaHash);
    if (match) {
      console.log(`Usuário ${nome} logado com sucesso.`);
      return res.status(200).send({ message: "Login bem-sucedido!" });
    } else {
      return res.status(401).send({ message: "Credenciais inválidas." });
    }
  } catch (error) {
    res.status(500).send({ message: "Erro ao fazer login." });
  }
});

// ---------------------------------------------
// ROTAS DE PEDIDO
// ---------------------------------------------

app.post("/api/pedidos", (req, res) => {
  const novoPedido = req.body;
  novoPedido.status = "Em preparação";
  novoPedido.id = Date.now();
  pedidos.push(novoPedido);
  console.log("Novo pedido recebido:", novoPedido);
  res
    .status(201)
    .send({ message: "Pedido recebido com sucesso!", pedido: novoPedido });
});

app.get("/api/pedidos", (req, res) => {
  res.status(200).json(pedidos);
});

app.put("/api/pedidos/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const pedido = pedidos.find((p) => p.id === parseInt(id));

  if (pedido) {
    pedido.status = status;
    console.log(`Status do pedido ${id} atualizado para: ${status}`);
    res
      .status(200)
      .send({ message: "Status do pedido atualizado com sucesso!", pedido });
  } else {
    res.status(404).send({ message: "Pedido não encontrado." });
  }
});

app.delete("/api/pedidos/:id", (req, res) => {
  const { id } = req.params;
  const pedidoIndex = pedidos.findIndex((p) => p.id === parseInt(id));

  if (pedidoIndex !== -1) {
    pedidos.splice(pedidoIndex, 1);
    console.log(`Pedido ${id} removido.`);
    res.status(200).send({ message: "Pedido removido com sucesso." });
  } else {
    res.status(404).send({ message: "Pedido não encontrado." });
  }
});

// ---------------------------------------------
// ROTAS DE CARDÁPIO
// ---------------------------------------------

// NOVAS ROTAS PARA GERENCIAR O CARDÁPIO (CRUD)
app.get("/api/cardapio", (req, res) => {
  res.status(200).json(cardapio);
});

app.post("/api/cardapio", (req, res) => {
  const novoItem = { ...req.body, id: Date.now() };
  cardapio.push(novoItem);
  salvarCardapio(); // Salve as alterações
  console.log("Novo item adicionado ao cardápio:", novoItem);
  res.status(201).json(novoItem);
});

app.put("/api/cardapio/:id", (req, res) => {
  const { id } = req.params;
  const itemIndex = cardapio.findIndex((item) => item.id === parseInt(id));
  if (itemIndex !== -1) {
    cardapio[itemIndex] = { ...req.body, id: parseInt(id) };
    salvarCardapio(); // Salve as alterações
    console.log("Item do cardápio atualizado:", cardapio[itemIndex]);
    res.status(200).json(cardapio[itemIndex]);
  } else {
    res.status(404).send({ message: "Item não encontrado." });
  }
});

app.delete("/api/cardapio/:id", (req, res) => {
  const { id } = req.params;
  const itemIndex = cardapio.findIndex((item) => item.id === parseInt(id));
  if (itemIndex !== -1) {
    cardapio.splice(itemIndex, 1);
    salvarCardapio(); // Salve as alterações
    console.log("Item do cardápio removido.");
    res.status(200).send({ message: "Item removido com sucesso." });
  } else {
    res.status(404).send({ message: "Item não encontrado." });
  }
});

// ---------------------------------------------
// SERVIR OS FRONTENDS EM PRODUÇÃO
// ---------------------------------------------
// 1. Serve o frontend Cliente como a rota principal (/)
app.use(express.static(path.join(__dirname, "lanchonete-app", "build")));

// 2. Serve o frontend Admin na rota /admin
app.use(
  "/admin", // A URL será /admin
  express.static(path.join(__dirname, "lanchonete-admin", "build"))
);

// 3. CATCH-ALL ESPECÍFICO PARA O ADMIN (CORREÇÃO FINAL DO ERRO)
// Usa a sintaxe de parâmetro nomeado (:path(*)) para o catch-all, garantindo a compatibilidade.
app.get("/admin/:path(*)", (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-admin", "build", "index.html")
  );
});

// 4. CATCH-ALL FINAL PARA O CLIENTE (MANTÉM A REGEX)
// Qualquer outra rota que não seja /api, /admin, ou um arquivo estático existente.
app.get(/.*/, (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-app", "build", "index.html")
  );
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
