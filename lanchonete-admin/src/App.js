import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [pedidos, setPedidos] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem("isLoggedIn") === "true";
  });
  // ✅ Declaração única (Corrigido o erro de redeclaração)
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

  // 🟢 ESTADOS DE RELATÓRIO E FILTRO DE STATUS
  const [filtroPeriodo, setFiltroPeriodo] = useState("geral");
  const [resumoRelatorio, setResumoRelatorio] = useState({
    totalPedidos: 0,
    faturamento: "0.00",
  });
  const [filtroStatus, setFiltroStatus] = useState("todos"); // Novo filtro de status

  // FUNÇÕES DE PEDIDOS E RELATÓRIOS (Atualizadas)

  // 🟢 NOVO: Função Única para buscar pedidos/relatório com filtros de data e status
  const fetchRelatorio = async (periodo, status) => {
    setLoading(true);
    try {
      // Constrói a URL com os filtros de período e status
      let url = `/api/pedidos/relatorio?periodo=${periodo}`;
      if (status && status !== "todos") {
        url += `&status=${status}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Erro ao buscar pedidos ou relatório.");
      }
      const data = await response.json();

      setPedidos(data.pedidos);
      setResumoRelatorio({
        totalPedidos: data.totalPedidos,
        faturamento: data.faturamento,
      });
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🟢 ATUALIZAÇÃO: Chama fetchRelatorio com os filtros atuais
  const atualizarStatus = async (pedidoId, novoStatus) => {
    try {
      await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      fetchRelatorio(filtroPeriodo, filtroStatus);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  // 🟢 ATUALIZAÇÃO: Chama fetchRelatorio com os filtros atuais
  const concluirPedido = async (pedidoId) => {
    try {
      await fetch(`/api/pedidos/${pedidoId}`, {
        method: "DELETE",
      });
      fetchRelatorio(filtroPeriodo, filtroStatus);
    } catch (error) {
      console.error("Erro ao concluir pedido:", error);
    }
  };

  // FUNÇÕES DE CARDÁPIO (Inalteradas)
  const fetchCardapio = async () => {
    try {
      const response = await fetch("/api/cardapio");
      const data = await response.json();
      setCardapio(data);
    } catch (error) {
      console.error("Erro ao buscar cardápio:", error);
    }
  };

  // ... (handleItemFormChange, handleItemSubmit, handleEdit, handleDelete continuam aqui) ...
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
    const url = isEditing ? `/api/cardapio/${itemForm.id}` : "/api/cardapio";

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
      await fetch(`/api/cardapio/${itemId}`, {
        method: "DELETE",
      });
      fetchCardapio();
    } catch (error) {
      console.error("Erro ao deletar item:", error);
    }
  };

  // FUNÇÕES DE AUTENTICAÇÃO (Inalteradas)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/usuarios/login", {
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
      const response = await fetch("/api/usuarios/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
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
    setCurrentPage("pedidos");
    alert("Logout realizado com sucesso!");
  };

  // EFEITOS
  useEffect(() => {
    if (isLoggedIn) {
      // 🟢 ATUALIZAÇÃO: Chama o relatório para Pedidos E Relatórios
      if (currentPage === "pedidos" || currentPage === "relatorios") {
        // Passa os dois filtros: período (data) e status
        fetchRelatorio(filtroPeriodo, filtroStatus);
        // Configuração da atualização automática (a cada 10 segundos)
        const intervalId = setInterval(
          () => fetchRelatorio(filtroPeriodo, filtroStatus),
          10000
        );
        return () => clearInterval(intervalId); // Limpa o intervalo na saída
      } else if (currentPage === "cardapio") {
        fetchCardapio();
      }
    }
    // 🟢 DEPENDÊNCIAS: Recarrega se o login, a página, o filtro de data OU o filtro de status mudarem
  }, [isLoggedIn, currentPage, filtroPeriodo, filtroStatus]);

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <h2>{isLogin ? "Painel do Administrador" : "Registrar"}</h2>
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
          {/* 🟢 Botão de Relatórios adicionado */}
          <button onClick={() => setCurrentPage("relatorios")}>
            Relatórios
          </button>
          <button onClick={() => setCurrentPage("cardapio")}>Cardápio</button>
          <button onClick={handleLogout}>Sair</button>
        </nav>
      </header>

      {/* Conteúdo da página de Pedidos */}
      {currentPage === "pedidos" && (
        <div className="painel-conteudo">
          <main className="lista-pedidos">
            <h2 className="titulo-pedidos-recebidos">Pedidos Recebidos</h2>

            {/* 🟢 CONTROLE DE FILTRO DE STATUS */}
            <div className="controles-pedidos">
              <label>
                Filtrar por Status:
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="todos">Todos os Pedidos</option>
                  <option value="Em preparação">Em Preparação</option>
                  <option value="Pronto para entrega">
                    Pronto para Entrega
                  </option>
                  <option value="Entregue">Entregue</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </label>
            </div>
            {/* 🟢 FIM DO CONTROLE DE STATUS */}

            {loading && <p className="loading">Carregando pedidos...</p>}
            {error && <p className="error">Erro: {error}</p>}
            {!loading && pedidos.length > 0
              ? pedidos.map((pedido) => (
                  <div key={pedido.id} className="pedido-card">
                    <h3>Pedido #{pedido.id}</h3>
                    <p>
                      Cliente:{" "}
                      <strong>
                        {pedido.cliente.nome.replace(/\*\*/g, "")}
                      </strong>
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
                          pedido.status === "Entregue"
                            ? "active-status-btn"
                            : ""
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
        </div>
      )}

      {/* 🟢 CONTEÚDO DA PÁGINA DE RELATÓRIOS (Movido daqui) */}
      {currentPage === "relatorios" && isLoggedIn && (
        <main className="painel-relatorios">
          <h2 className="titulo-relatorio">Resumo Financeiro</h2>

          <div className="controles-relatorio">
            <label>
              Filtrar por Período:
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
              >
                <option value="geral">Total Geral</option>
                <option value="hoje">Hoje</option>
                <option value="15dias">Últimos 15 dias</option>
                <option value="mes">Mês Atual</option>
              </select>
            </label>

            <div className="resumo-financeiro">
              <div className="metrica">
                <h4>
                  Total de Pedidos (
                  {filtroPeriodo === "geral"
                    ? "Geral"
                    : filtroPeriodo.toUpperCase()}
                  ):
                </h4>
                <p className="valor">{resumoRelatorio.totalPedidos}</p>
              </div>
              <div className="metrica">
                <h4>Faturamento Total:</h4>
                <p className="valor faturamento">
                  R$ {resumoRelatorio.faturamento}
                </p>
              </div>
            </div>
          </div>

          <h3 className="subtitulo-relatorio">
            Detalhe dos Pedidos (Status:{" "}
            {filtroStatus === "todos" ? "Todos" : filtroStatus})
          </h3>
          {loading && <p className="loading">Carregando pedidos...</p>}
          {pedidos.length === 0 && !loading && (
            <p className="sem-pedidos">
              Nenhum pedido encontrado para o período/status selecionado.
            </p>
          )}

          <div className="lista-pedidos-filtrada">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="pedido-card-relatorio">
                <p>
                  <strong>Pedido #{pedido.id}</strong>
                </p>
                <p>Cliente: {pedido.cliente.nome.replace(/\*\*/g, "")}</p>
                <p>
                  Data: {new Date(pedido.data).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(pedido.data).toLocaleTimeString("pt-BR")}
                </p>
                <p>Total: R$ {pedido.total}</p>
              </div>
            ))}
          </div>
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
                <img src={`/${item.imagem}`} alt={item.nome} />
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
