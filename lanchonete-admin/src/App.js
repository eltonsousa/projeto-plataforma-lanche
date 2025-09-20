import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [pedidos, setPedidos] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // 📢 Troca de localStorage para sessionStorage
    return sessionStorage.getItem("isLoggedIn") === "true";
  });
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nome: "", senha: "" });
  const [mostraSenha, setMostraSenha] = useState(false);
  const [currentPage, setCurrentPage] = useState("pedidos");
  const [itemForm, setItemForm] = useState({
    id: null,
    nome: "",
    descricao: "",
    preco: "",
    imagem: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // FUNÇÕES DE PEDIDOS
  const fetchPedidos = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/pedidos");
      if (!response.ok) {
        throw new Error("Erro ao buscar pedidos");
      }
      const data = await response.json();
      setPedidos(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatus = async (pedidoId, novoStatus) => {
    try {
      await fetch(`http://localhost:3001/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      fetchPedidos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const concluirPedido = async (pedidoId) => {
    try {
      await fetch(`http://localhost:3001/api/pedidos/${pedidoId}`, {
        method: "DELETE",
      });
      fetchPedidos();
    } catch (error) {
      console.error("Erro ao concluir pedido:", error);
    }
  };

  // FUNÇÕES DE CARDÁPIO
  const fetchCardapio = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/cardapio");
      const data = await response.json();
      setCardapio(data);
    } catch (error) {
      console.error("Erro ao buscar cardápio:", error);
    }
  };

  const handleItemFormChange = (e) => {
    const { name, value } = e.target;
    setItemForm({
      ...itemForm,
      [name]: name === "preco" ? parseFloat(value) : value,
    });
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing
      ? `http://localhost:3001/api/cardapio/${itemForm.id}`
      : "http://localhost:3001/api/cardapio";

    try {
      // Cria um objeto com os valores corretos (preço já é um número)
      const itemToSave = { ...itemForm, preco: parseFloat(itemForm.preco) };

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemToSave),
      });
      fetchCardapio();
      setItemForm({ id: null, nome: "", descricao: "", preco: "", imagem: "" });
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar item:", error);
    }
  };

  const handleEdit = (item) => {
    setItemForm(item);
    setIsEditing(true);
  };

  const handleDelete = async (itemId) => {
    try {
      await fetch(`http://localhost:3001/api/cardapio/${itemId}`, {
        method: "DELETE",
      });
      fetchCardapio();
    } catch (error) {
      console.error("Erro ao deletar item:", error);
    }
  };

  // FUNÇÕES DE AUTENTICAÇÃO (CORRIGIDAS)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3001/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem("isLoggedIn", "true"); // PERSISTE O LOGIN
        setFormData({ nome: "", senha: "" });
        setCurrentPage("pedidos");
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Erro ao fazer login. Verifique o servidor.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        "http://localhost:3001/api/usuarios/registrar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await response.json();
      if (response.status === 201) {
        alert("Usuário registrado com sucesso! Faça login.");
        setIsLogin(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Erro ao registrar. Verifique o servidor.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn"); // 📢 Limpa a chave de persistência
    setCurrentPage("pedidos"); // Volta para a página inicial (se necessário)
    alert("Logout realizado com sucesso!");
  };

  // EFEITOS
  useEffect(() => {
    if (isLoggedIn) {
      if (currentPage === "pedidos") {
        fetchPedidos();
      } else if (currentPage === "cardapio") {
        fetchCardapio();
      }
    }
  }, [isLoggedIn, currentPage]);

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <h2>{isLogin ? "Painel do Administrador" : "Registrar"}</h2>
        {/* CORREÇÃO AQUI: Chama handleLogin ou handleRegister */}
        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <input
            type="text"
            name="nome"
            placeholder="Nome de usuário"
            value={formData.nome}
            onChange={handleChange}
            required
          />
          <div className="password-input-container">
            <input
              type={mostraSenha ? "text" : "password"}
              name="senha"
              placeholder="Senha"
              value={formData.senha}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={() => setMostraSenha(!mostraSenha)}
              className="mostrar-senha-btn"
            >
              {mostraSenha ? "🙈" : "👁️"}
            </button>
          </div>
          <button type="submit">{isLogin ? "Entrar" : "Registrar"}</button>
        </form>
        <p onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
          {isLogin
            ? "Não tem uma conta? Crie uma."
            : "Já tem uma conta? Faça login."}
        </p>
      </div>
    );
  }

  return (
    <div className="painel-admin">
      <header>
        <h1>Painel do Administrador</h1>
        <p>Olá, {formData.nome}!</p>
        <nav className="nav-menu">
          <button onClick={() => setCurrentPage("pedidos")}>Pedidos</button>
          <button onClick={() => setCurrentPage("cardapio")}>Cardápio</button>
          <button onClick={handleLogout}>Sair</button>
        </nav>
      </header>

      {/* Conteúdo da página de Pedidos */}
      <h2 className="titulo-pedidos-recebidos">Pedidos Recebidos</h2>
      {currentPage === "pedidos" && (
        <main className="lista-pedidos">
          {loading && <p className="loading">Carregando pedidos...</p>}
          {error && <p className="error">Erro: {error}</p>}
          {!loading && pedidos.length > 0
            ? pedidos.map((pedido) => (
                <div key={pedido.id} className="pedido-card">
                  <h3>Pedido #{pedido.id}</h3>
                  <p>
                    Cliente:{" "}
                    <strong>{pedido.cliente.nome.replace(/\*\*/g, "")}</strong>
                  </p>
                  <p>
                    Status:{" "}
                    <span
                      className={`status-${pedido.status
                        .replace(/\s+/g, "-")
                        .toLowerCase()}`}
                    >
                      {pedido.status}
                    </span>
                  </p>
                  <div className="status-botoes">
                    <button
                      className={`status-btn ${
                        pedido.status === "Em preparação"
                          ? "active-status-btn"
                          : ""
                      }`}
                      onClick={() =>
                        atualizarStatus(pedido.id, "Em preparação")
                      }
                    >
                      Em Preparação
                    </button>
                    <button
                      className={`status-btn ${
                        pedido.status === "Pronto para entrega"
                          ? "active-status-btn"
                          : ""
                      }`}
                      onClick={() =>
                        atualizarStatus(pedido.id, "Pronto para entrega")
                      }
                    >
                      Pronto para Entrega
                    </button>
                    <button
                      className={`status-btn ${
                        pedido.status === "Entregue" ? "active-status-btn" : ""
                      }`}
                      onClick={() => atualizarStatus(pedido.id, "Entregue")}
                    >
                      Entregue
                    </button>
                  </div>
                  <h4>Itens:</h4>
                  <ul>
                    {pedido.itens.map((item) => (
                      <li key={item.id}>
                        {item.nome} (x{item.quantidade})
                      </li>
                    ))}
                  </ul>
                  <button
                    className="concluir-btn"
                    onClick={() => concluirPedido(pedido.id)}
                  >
                    Concluir Pedido
                  </button>
                </div>
              ))
            : !loading && (
                <div className="sem-pedidos">
                  <p>Nenhum pedido recebido ainda.</p>
                </div>
              )}
        </main>
      )}

      {/* Conteúdo da página de Cardápio */}
      {currentPage === "cardapio" && (
        <main className="painel-cardapio">
          <h2>Gerenciar Cardápio</h2>
          <div className="cardapio-form">
            <form onSubmit={handleItemSubmit}>
              <input
                type="text"
                name="nome"
                placeholder="Nome do Item"
                value={itemForm.nome}
                onChange={handleItemFormChange}
                required
              />
              <input
                type="text"
                name="descricao"
                placeholder="Descrição"
                value={itemForm.descricao}
                onChange={handleItemFormChange}
                required
              />
              <input
                type="number"
                name="preco"
                placeholder="Preço"
                value={itemForm.preco}
                onChange={handleItemFormChange}
                step="0.01"
                required
              />
              <input
                type="text"
                name="imagem"
                placeholder="URL da Imagem"
                value={itemForm.imagem}
                onChange={handleItemFormChange}
                required
              />
              <button type="submit">
                {isEditing ? "Salvar Alterações" : "Adicionar Item"}
              </button>
            </form>
          </div>
          <div className="cardapio-lista">
            <h3>Itens Atuais</h3>
            {cardapio.map((item) => (
              <div key={item.id} className="item-cardapio-admin">
                <img
                  src={`http://localhost:3001/${item.imagem}`}
                  alt={item.nome}
                />
                <div className="item-info-admin">
                  <h4>{item.nome}</h4>
                  <p>R$ {item.preco ? item.preco.toFixed(2) : "0.00"}</p>
                </div>
                <div className="item-botoes-admin">
                  <button onClick={() => handleEdit(item)}>Editar</button>
                  <button onClick={() => handleDelete(item.id)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
