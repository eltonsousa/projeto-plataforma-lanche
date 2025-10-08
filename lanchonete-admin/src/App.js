import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// --- Import de ìcones
import { AiOutlineDelete, AiOutlineEdit, AiOutlineCheck } from "react-icons/ai";
import {
  MdOutlinePlaylistAdd,
  MdOutlineAddPhotoAlternate,
} from "react-icons/md";
// --- Import de ìcones

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
  const [isAuthLoading, setIsAuthLoading] = useState(false); // 🟢 NOVO ESTADO DE CARREGAMENTO
  const [usuarioLogado, setUsuarioLogado] = useState(null); // 🟢 NOVO ESTADO
  const [mostraSenha, setMostraSenha] = useState(false);
  const [currentPage, setCurrentPage] = useState("pedidos");
  const [itemForm, setItemForm] = useState({
    id: null,
    nome: "",
    descricao: "",
    preco: "",
    imagem: "",
    categoria: "Sanduíches",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isFormEmphasized, setIsFormEmphasized] = useState(false); // 🟢 ADICIONE ESTA LINHA
  const formRef = useRef(null); // 🟢 NOVO: Referência para o formulário
  const nomeInputRef = useRef(null); // 🟢 NOVO: Referência para o input

  // 🟢 ESTADOS DE RELATÓRIO E FILTRO DE STATUS
  const [filtroPeriodo, setFiltroPeriodo] = useState("geral");
  const [resumoRelatorio, setResumoRelatorio] = useState({
    totalPedidos: 0,
    faturamento: "0.00",
  });
  const [filtroStatus, setFiltroStatus] = useState("todos"); // Novo filtro de status

  // 🟢 NOVOS ESTADOS PARA O CONTROLE DE STATUS DA LOJA
  const [isStoreForcedOpen, setIsStoreForcedOpen] = useState(false); // Status da flag de override
  const [isStatusLoading, setIsStatusLoading] = useState(true); // Carregamento do status inicial

  const [isImageUploading, setIsImageUploading] = useState(false);

  // adicionais
  const [adicionais, setAdicionais] = useState(itemForm?.adicionais || []);

  const addAdicional = () =>
    setAdicionais([...adicionais, { nome: "", preco: "" }]);

  const updateAdicional = (index, field, value) => {
    const newAdicionais = [...adicionais];
    newAdicionais[index][field] = value;
    setAdicionais(newAdicionais);
  };

  const removeAdicional = (index) => {
    const newAdicionais = [...adicionais];
    newAdicionais.splice(index, 1);
    setAdicionais(newAdicionais);
  };
  // adicionais

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
      // Primeira requisição: atualiza o status no banco de dados
      await fetch(`/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }), // Adicione esta linha
      });

      // Segunda requisição: envia a mensagem do WhatsApp
      if (novoStatus === "Pronto para entrega") {
        await fetch(`/api/pedidos/${pedidoId}/enviar-whatsapp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: novoStatus }), // Adicione esta linha
        });
      }

      // Atualiza a lista de pedidos após a mudança
      fetchRelatorio(filtroPeriodo, filtroStatus);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
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
      const itemToSave = {
        ...itemForm,
        preco: parseFloat(itemForm.preco),
        adicionais,
      };

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemToSave),
      });
      fetchCardapio();
      setItemForm({ id: null, nome: "", descricao: "", preco: "", imagem: "" });
      setAdicionais([]); // limpa os adicionais após salvar
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar item:", error);
    }
  };

  const handleEdit = (item) => {
    setItemForm({
      ...item,
      // Garante que o itemForm receba a categoria do item (ou um padrão se estiver faltando)
      categoria: item.categoria || "Sanduíches",
    });
    setAdicionais(item.adicionais || []);
    setIsEditing(true);

    // 🟢 NOVA LÓGICA DE ROLAGEM
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // 🟢 Adiciona a lógica para focar o input
    if (nomeInputRef.current) {
      nomeInputRef.current.focus();
    }

    // 🟢 Lógica de ênfase
    setIsFormEmphasized(true);
    setTimeout(() => {
      setIsFormEmphasized(false);
    }, 500); // Remove a ênfase após 0.5s
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

  // ---------------------------------------------
  // FUNÇÕES DE STATUS DA LOJA (ABERTO/FECHADO FORÇADO)
  // ---------------------------------------------

  const fetchStoreStatus = async () => {
    try {
      const response = await fetch("/api/admin/status");
      if (!response.ok) throw new Error("Erro ao buscar status da loja.");

      const data = await response.json();

      // Atualiza o estado local com o valor lido do servidor
      setIsStoreForcedOpen(data.isForcedOpen);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar status da loja:", error);
      setError(error.message);
    } finally {
      // Desliga o loading
      setIsStatusLoading(false);
    }
  };

  const handleToggleStoreStatus = async (newStatus) => {
    setIsStatusLoading(true);
    try {
      const response = await fetch("/api/admin/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Envia o novo status (true ou false) no corpo da requisição
        body: JSON.stringify({ isForcedOpen: newStatus }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar status da loja.");

      // Se a atualização foi bem-sucedida, atualiza o estado local e dá feedback
      setIsStoreForcedOpen(newStatus);
      alert(
        `Status da Loja atualizado para: ${
          newStatus ? "ABERTA (Forçado)" : "Seguindo Horário"
        }`
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao tentar atualizar o status da loja.");
    } finally {
      setIsStatusLoading(false);
    }
  };

  // FUNÇÕES DE AUTENTICAÇÃO (Inalteradas)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); // 🟢 Inicia o carregamento
    try {
      const response = await fetch("/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setIsLoggedIn(true);
        sessionStorage.setItem("isLoggedIn", "true"); // PERSISTE O LOGIN
        // 🟢 SALVA O NOME DO USUÁRIO NO SESSION STORAGE E NO ESTADO
        sessionStorage.setItem("usuarioLogado", formData.nome);
        setUsuarioLogado(formData.nome);
        setFormData({ nome: "", senha: "" });
        setCurrentPage("pedidos");
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      alert("Erro ao fazer login. Verifique o servidor.");
    } finally {
      setIsAuthLoading(false); // 🟢 Finaliza o carregamento (sempre)
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); // 🟢 Inicia o carregamento
    try {
      const response = await fetch("/api/usuarios/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.status === 201) {
        // 🟢 LINHAS ADICIONADAS
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("usuarioLogado", formData.nome);
        setUsuarioLogado(formData.nome);

        alert("Usuário registrado com sucesso! Faça login.");
        setIsLogin(true);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Erro ao registrar. Verifique o servidor.");
    } finally {
      setIsAuthLoading(false); // 🟢 Finaliza o carregamento (sempre)
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn"); // 📢 Limpa a chave de persistência
    setCurrentPage("pedidos");
    alert("Logout realizado com sucesso!");
  };

  // 🟢 NOVA FUNÇÃO PARA ATUALIZAÇÃO MANUAL
  const handleRefresh = () => {
    fetchRelatorio(filtroPeriodo, filtroStatus);
  };

  // EFEITOS
  useEffect(() => {
    const storedUser = sessionStorage.getItem("usuarioLogado");
    if (storedUser) {
      setUsuarioLogado(storedUser);
    }

    if (isLoggedIn) {
      if (currentPage === "pedidos" || currentPage === "relatorios") {
        // Chama a busca apenas quando a página ou os filtros mudam
        fetchRelatorio(filtroPeriodo, filtroStatus);
        fetchStoreStatus();
      } else if (currentPage === "cardapio") {
        fetchCardapio();
      }
    }
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
          <button type="submit" disabled={isAuthLoading}>
            {isAuthLoading ? "Carregando..." : isLogin ? "Entrar" : "Registrar"}
          </button>
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
        <p>Olá, {usuarioLogado}!</p>
        <nav className="nav-menu">
          <button onClick={() => setCurrentPage("pedidos")}>Pedidos</button>
          {/* 🟢 Botão de Relatórios adicionado */}
          <button onClick={() => setCurrentPage("relatorios")}>
            Relatórios
          </button>
          <button onClick={() => setCurrentPage("cardapio")}>Cardápio</button>
          <button onClick={() => setCurrentPage("configuracoes")}>
            Configurações
          </button>
          <button onClick={handleLogout}>Sair</button>
        </nav>
      </header>

      {/* 🟢 CONTEÚDO DA PÁGINA DE CONFIGURAÇÕES */}
      {currentPage === "configuracoes" && (
        <main className="painel-configuracoes">
          <h2>Configurações da Loja</h2>
          <div className="config-card">
            <h3>Status de Abertura Forçada</h3>
            <p>
              Esta opção permite que você force a loja a aparecer como ABERTA
              para todos os clientes, ignorando o horário de funcionamento.
            </p>

            {isStatusLoading ? (
              <p className="loading">Carregando status...</p>
            ) : (
              <div className="status-toggle-container">
                <span style={{ fontWeight: "bold" }}>
                  Status Atual:
                  {isStoreForcedOpen
                    ? " 🟢 ABERTA (Forçado)"
                    : " 🟠 Seguindo Horário"}
                </span>

                <button
                  className={`btn ${
                    isStoreForcedOpen ? "btn-vermelho" : "btn-verde"
                  }`}
                  onClick={() => handleToggleStoreStatus(!isStoreForcedOpen)}
                  disabled={isStatusLoading}
                  style={{ marginLeft: "20px" }}
                >
                  {isStoreForcedOpen
                    ? "Desativar Forçar Abertura"
                    : "Forçar Loja Aberta Agora"}
                </button>
              </div>
            )}
          </div>
          {error && (
            <p className="error" style={{ marginTop: "20px" }}>
              Erro: {error}
            </p>
          )}
        </main>
      )}

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
              {/* 🟢 BOTÃO DE ATUALIZAR */}
              <button
                onClick={handleRefresh}
                className="botao-atualizar btn btn-laranja"
              >
                Atualizar Pedidos
              </button>
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
                      className="concluir-btn btn btn-verde"
                      // 🟢 ATUALIZAÇÃO: Chama a função atualizarStatus com o status 'Concluído'
                      onClick={() => atualizarStatus(pedido.id, "Concluído")}
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
            <h4>Adicionar Produtos:</h4>
            <form
              ref={formRef}
              onSubmit={handleItemSubmit}
              className={`formulario-item ${
                isFormEmphasized ? "form-emphasis" : ""
              }`}
            >
              <input
                type="text"
                name="nome"
                placeholder="Nome do Item"
                value={itemForm.nome}
                onChange={handleItemFormChange}
                ref={nomeInputRef} // 🟢 Associe a referência aqui
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

              <h4>Incluir adicionais:</h4>
              {adicionais.map((ad, i) => (
                <div className="adicionais" key={i}>
                  <input
                    placeholder="Nome Adicional"
                    value={ad.nome}
                    onChange={(e) => updateAdicional(i, "nome", e.target.value)}
                  />
                  <input
                    placeholder="Preço R$"
                    type="number"
                    value={ad.preco}
                    onChange={(e) =>
                      updateAdicional(i, "preco", e.target.value)
                    }
                  />
                  <button
                    className="btn-remover-adicionais btn btn-vermelho"
                    type="button"
                    onClick={() => removeAdicional(i)}
                  >
                    <AiOutlineDelete size={20} /> Remover
                  </button>
                </div>
              ))}
              <button
                className="btn-add-adicionais btn btn-azul"
                type="button"
                onClick={addAdicional}
              >
                <MdOutlinePlaylistAdd size={24} /> Adicional
              </button>

              <div className="custom-file-upload">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Preview local
                    const previewUrl = URL.createObjectURL(file);
                    setItemForm({ ...itemForm, imagem: previewUrl });

                    // Upload para backend (que manda ao Supabase)
                    const formData = new FormData();
                    formData.append("imagem", file);

                    setIsImageUploading(true);

                    try {
                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const data = await res.json();

                      if (!res.ok) {
                        // Trata mensagens vindas do backend
                        if (data.error?.includes("file too large")) {
                          alert(
                            "⚠️ A imagem é muito grande. O limite é de 2 MB."
                          );
                        } else if (
                          data.error?.includes("Tipo de arquivo inválido")
                        ) {
                          alert(
                            "⚠️ Formato inválido. Use apenas JPG, PNG ou WEBP."
                          );
                        } else {
                          alert(
                            "⚠️ Erro ao enviar imagem: " +
                              (data.error || "desconhecido")
                          );
                        }
                        return;
                      }

                      if (data.url) {
                        setItemForm((prev) => ({ ...prev, imagem: data.url }));
                      }
                    } catch (err) {
                      alert(
                        "❌ Falha na conexão com o servidor. Tente novamente."
                      );
                      console.error("Erro ao enviar imagem:", err);
                    } finally {
                      setIsImageUploading(false);
                      e.target.value = null;
                    }
                  }}
                />
                <label
                  htmlFor="file-upload"
                  className="btn btn-laranja btn-upload"
                >
                  <MdOutlineAddPhotoAlternate size={20} />
                  {isImageUploading ? (
                    "Carregando..."
                  ) : itemForm.imagem ? (
                    "Trocar Imagem"
                  ) : (
                    <span>Escolher Imagem</span>
                  )}
                </label>
              </div>

              {isImageUploading && (
                <p style={{ color: "#3f51b5", fontWeight: "bold" }}>
                  Enviando Imagem... Aguarde.
                </p>
              )}

              {itemForm.imagem && (
                <img
                  src={itemForm.imagem}
                  alt="Prévia"
                  style={{ maxWidth: "200px", marginTop: "10px" }}
                />
              )}

              <select
                name="categoria"
                value={itemForm.categoria}
                onChange={handleItemFormChange}
                required
              >
                <option value="" disabled>
                  Selecione a Categoria
                </option>
                <option value="Sanduíches">Sanduíches</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Fritas">Fritas</option>
                <option value="Comidas">Comidas</option>
                <option value="Pizzas">Pizzas</option>
              </select>

              <button
                class="btn-add-item btn btn-verde"
                type="submit"
                disabled={isImageUploading}
              >
                <AiOutlineCheck size={20} />{" "}
                {isEditing ? "Salvar Alterações" : "Adicionar Item"}
              </button>
            </form>
          </div>
          <div className="cardapio-lista">
            <h3>Itens Atuais</h3>
            {cardapio.map((item) => (
              <div key={item.id} className="item-cardapio-admin">
                <img src={item.imagem} alt={item.nome} />
                <div className="item-info-admin">
                  <h4>{item.nome}</h4>
                  <p class="valor-item-info-admin">
                    R$ {item.preco ? item.preco.toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="item-botoes-admin">
                  <button
                    class="btn btn-verde"
                    onClick={() => handleEdit(item)}
                  >
                    <AiOutlineEdit size={20} /> Editar
                  </button>
                  <button
                    class="btn btn-laranja"
                    onClick={() => handleDelete(item.id)}
                  >
                    <AiOutlineDelete size={20} /> Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
      <footer>
        <p className="footer-admin">
          &copy; 2025 Manú Lanches. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

export default App;
