const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");

// Carrega variáveis do .env
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = 3001;
const path = require("path");

// 1. Inicializa o cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------
// ROTAS DE AUTENTICAÇÃO (COM SUPABASE)
// ---------------------------------------------

// ROTA PARA REGISTRAR UM NOVO USUÁRIO
app.post("/api/usuarios/registrar", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });
  }

  try {
    const { data: usuarioExistente, error: checkError } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("nome", nome)
      .limit(1);

    if (checkError) throw checkError;
    if (usuarioExistente.length > 0) {
      return res.status(409).send({ message: "Nome de usuário já existe." });
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

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

// ROTA: LOGIN DO USUÁRIO
app.post("/api/usuarios/login", async (req, res) => {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res.status(400).send({ message: "Nome e senha são obrigatórios." });
  }

  try {
    const { data: usuarios, error: fetchError } = await supabase
      .from("usuarios")
      .select("senhaHash")
      .eq("nome", nome)
      .limit(1);

    if (fetchError) throw fetchError;
    const usuario = usuarios[0];

    if (!usuario) {
      return res.status(401).send({ message: "Credenciais inválidas." });
    }

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
// ROTAS DE CARDÁPIO (COM SUPABASE)
// ---------------------------------------------

// ROTA: GET /api/cardapio (Buscar todos os itens do menu)
app.get("/api/cardapio", async (req, res) => {
  try {
    const { data: cardapio, error } = await supabase
      .from("cardapio")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro Supabase GET /api/cardapio:", error);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }

    res.status(200).json(cardapio);
  } catch (err) {
    console.error("Erro inesperado na rota GET /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: POST /api/cardapio (Adicionar novo item)
app.post("/api/cardapio", async (req, res) => {
  try {
    const novoItem = req.body;

    // CORREÇÃO: Remove o ID que pode vir do frontend, forçando o Supabase a gerá-lo.
    delete novoItem.id;

    const { data, error } = await supabase
      .from("cardapio")
      .insert([novoItem])
      .select();

    if (error) {
      console.error("Erro Supabase POST /api/cardapio:", error);
      return res.status(500).json({ message: "Erro ao adicionar item." });
    }

    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Erro inesperado na rota POST /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: PUT /api/cardapio/:id (Atualizar item)
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

    if (error) {
      console.error("Erro Supabase PUT /api/cardapio:", error);
      return res.status(500).json({ message: "Erro ao atualizar item." });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Item não encontrado." });
    }

    res.status(200).json(data[0]);
  } catch (err) {
    console.error("Erro inesperado na rota PUT /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: DELETE /api/cardapio/:id (Remover item)
app.delete("/api/cardapio/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const { error } = await supabase.from("cardapio").delete().eq("id", id);

    if (error) {
      console.error("Erro Supabase DELETE /api/cardapio:", error);
      return res.status(500).json({ message: "Erro ao deletar item." });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Erro inesperado na rota DELETE /api/cardapio:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ---------------------------------------------
// ROTAS DE PEDIDO (COM SUPABASE E TABELA pedidos_lanche)
// ---------------------------------------------

// ROTA: POST /api/pedidos (Criar novo pedido)
app.post("/api/pedidos", async (req, res) => {
  try {
    const { cliente, itens, total } = req.body;

    const novoPedido = {
      cliente: cliente,
      itens: itens,
      total: total,
      status: "Em preparação",
    };

    const { data, error } = await supabase
      .from("pedidos_lanche") // Alterado para pedidos_lanche
      .insert([novoPedido])
      .select();

    if (error) {
      console.error("Erro Supabase POST /api/pedidos:", error);
      return res.status(500).json({ message: "Erro ao registrar pedido." });
    }

    console.log("Novo pedido recebido (Supabase):", data[0]);
    res.status(201).json({
      message: "Pedido recebido com sucesso!",
      pedido: data[0],
    });
  } catch (err) {
    console.error("Erro inesperado na rota POST /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: GET /api/pedidos (Buscar todos os pedidos)
app.get("/api/pedidos", async (req, res) => {
  try {
    const { data: pedidos, error } = await supabase
      .from("pedidos_lanche") // Alterado para pedidos_lanche
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Erro Supabase GET /api/pedidos:", error);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }

    res.status(200).json(pedidos);
  } catch (err) {
    console.error("Erro inesperado na rota GET /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: PUT /api/pedidos/:id (Atualizar status do pedido)
app.put("/api/pedidos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  try {
    const { data, error } = await supabase
      .from("pedidos_lanche") // Alterado para pedidos_lanche
      .update({ status: status })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Erro Supabase PUT /api/pedidos:", error);
      return res.status(500).json({ message: "Erro ao atualizar status." });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }

    console.log(`Status do pedido ${id} atualizado para: ${status}`);
    res.status(200).json({
      message: "Status do pedido atualizado com sucesso!",
      pedido: data[0],
    });
  } catch (err) {
    console.error("Erro inesperado na rota PUT /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ROTA: DELETE /api/pedidos/:id (Remover pedido)
app.delete("/api/pedidos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const { error } = await supabase
      .from("pedidos_lanche") // Alterado para pedidos_lanche
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro Supabase DELETE /api/pedidos:", error);
      return res.status(500).json({ message: "Erro ao remover pedido." });
    }

    console.log(`Pedido ${id} removido.`);
    res.status(204).send();
  } catch (err) {
    console.error("Erro inesperado na rota DELETE /api/pedidos:", err);
    res.status(500).json({ message: "Erro inesperado do servidor." });
  }
});

// ---------------------------------------------
// SERVIR OS FRONTENDS EM PRODUÇÃO
// ---------------------------------------------

// Serve o frontend Admin na rota /admin
app.use(
  "/admin",
  express.static(path.join(__dirname, "lanchonete-admin", "build"))
);

// CATCH-ALL EXPLÍCITO DO ADMIN
app.get(/\/admin\/.*/, (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-admin", "build", "index.html")
  );
});

// Serve o frontend Cliente como a rota principal (/)
app.use(express.static(path.join(__dirname, "lanchonete-app", "build")));

// CATCH-ALL FINAL PARA O CLIENTE
app.get(/.*/, (req, res) => {
  res.sendFile(
    path.resolve(__dirname, "lanchonete-app", "build", "index.html")
  );
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
