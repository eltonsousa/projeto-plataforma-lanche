import React, { useState, useEffect, useRef, useCallback } from "react";
import Categorias from "./Categorias";
import ConfigLoja from "./ConfigLoja";
import "./App.css";
import "./styles/config_pizza.css";

import { formatPrice } from "./utils/format";

// --- Import de ìcones
import {
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineCheck,
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlinePlus,
} from "react-icons/ai";
import {
  MdOutlinePlaylistAdd,
  MdOutlineAddPhotoAlternate,
} from "react-icons/md";
import { BsToggleOff, BsToggleOn, BsClockFill } from "react-icons/bs";
// --- Import de ìcones

// Estrutura de horário padrão para a semana (0=Domingo, 6=Sábado)
const defaultSchedule = [
  { day: 0, name: "Domingo", isActive: false, start: "18:00", end: "23:00" },
  {
    day: 1,
    name: "Segunda-feira",
    isActive: true,
    start: "18:00",
    end: "23:00",
  },
  { day: 2, name: "Terça-feira", isActive: true, start: "18:00", end: "23:00" },
  {
    day: 3,
    name: "Quarta-feira",
    isActive: true,
    start: "18:00",
    end: "23:00",
  },
  {
    day: 4,
    name: "Quinta-feira",
    isActive: true,
    start: "18:00",
    end: "23:00",
  },
  { day: 5, name: "Sexta-feira", isActive: true, start: "18:00", end: "23:00" },
  { day: 6, name: "Sábado", isActive: true, start: "18:00", end: "23:00" },
];

// 🟢 NOVO COMPONENTE: Gerenciamento de Configurações de Pizza
const PizzaConfig = () => {
  const [tamanhos, setTamanhos] = useState([]);
  const [sabores, setSabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTamanhoId, setEditingTamanhoId] = useState(null);
  const [editingSaborId, setEditingSaborId] = useState(null);
  const [currentEditingTamanho, setCurrentEditingTamanho] = useState(null);
  const [currentEditingSabor, setCurrentEditingSabor] = useState(null);

  // Estados para o novo tamanho/sabor a ser adicionado
  const [newTamanho, setNewTamanho] = useState({
    nome: "",
    base_preco: 0,
    sigla: "",
  });
  const [newSabor, setNewSabor] = useState({
    nome: "",
    valor_referencia: 0,
    categoria: "Padrão", // Default
  });

  const fetchPizzaConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) throw new Error("lojaId não encontrado.");

      const res = await fetch(`/api/pizzas-config?loja_id=${lojaId}`);
      if (!res.ok) throw new Error("Erro ao carregar configurações de pizza.");

      const data = await res.json();
      setTamanhos(data.tamanhos || []);
      setSabores(data.sabores || []);
    } catch (err) {
      console.error("Erro ao buscar config de pizza:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPizzaConfig();
  }, [fetchPizzaConfig]);

  // Função para salvar as configurações
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pizzas-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tamanhos, sabores }),
      });

      if (!res.ok) throw new Error("Falha ao salvar as configurações.");

      alert("Configurações de Pizza salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config de pizza:", err);
      setError(err.message);
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Lógica de Tamanhos ---

  const handleAddTamanho = (e) => {
    e.preventDefault();
    if (newTamanho.nome && newTamanho.sigla && newTamanho.base_preco >= 0) {
      setTamanhos([
        ...tamanhos,
        {
          ...newTamanho,
          base_preco: parseFloat(newTamanho.base_preco),
          id: Date.now(), // ID temporário para edição local
        },
      ]);
      setNewTamanho({ nome: "", base_preco: 0, sigla: "" }); // Reset
    }
  };

  const handleDeleteTamanho = (id) => {
    setTamanhos(tamanhos.filter((t) => t.id !== id));
  };

  // 🟢 FUNÇÕES DE EDIÇÃO DE TAMANHO
  const handleEditTamanhoStart = (tamanho) => {
    setEditingTamanhoId(tamanho.id);
    setCurrentEditingTamanho(tamanho);
  };

  const handleEditTamanhoChange = (e) => {
    const { name, value } = e.target;
    setCurrentEditingTamanho((prev) => ({
      ...prev,
      [name]: name === "base_preco" ? parseFloat(value) : value,
    }));
  };

  const handleEditTamanhoSave = () => {
    if (
      currentEditingTamanho.nome &&
      currentEditingTamanho.sigla &&
      currentEditingTamanho.base_preco >= 0
    ) {
      setTamanhos((prevTamanhos) =>
        prevTamanhos.map((t) =>
          t.id === editingTamanhoId ? currentEditingTamanho : t
        )
      );
      setEditingTamanhoId(null);
      setCurrentEditingTamanho(null);
    } else {
      alert("Por favor, preencha todos os campos do Tamanho.");
    }
  };

  // --- Lógica de Sabores ---

  const handleAddSabor = (e) => {
    e.preventDefault();
    if (newSabor.nome && newSabor.categoria) {
      setSabores([
        ...sabores,
        {
          ...newSabor,
          valor_referencia: parseFloat(newSabor.valor_referencia || 0),
          id: Date.now(), // ID temporário para edição local
        },
      ]);
      setNewSabor({ nome: "", valor_referencia: 0, categoria: "Padrão" }); // Reset
    }
  };

  const handleDeleteSabor = (id) => {
    setSabores(sabores.filter((s) => s.id !== id));
  };

  // 🟢 FUNÇÕES DE EDIÇÃO DE SABOR
  const handleEditSaborStart = (sabor) => {
    setEditingSaborId(sabor.id);
    setCurrentEditingSabor(sabor);
  };

  const handleEditSaborChange = (e) => {
    const { name, value } = e.target;
    setCurrentEditingSabor((prev) => ({
      ...prev,
      [name]: name === "valor_referencia" ? parseFloat(value) : value,
    }));
  };

  const handleEditSaborSave = () => {
    if (currentEditingSabor.nome && currentEditingSabor.categoria) {
      setSabores((prevSabores) =>
        prevSabores.map((s) =>
          s.id === editingSaborId ? currentEditingSabor : s
        )
      );
      setEditingSaborId(null);
      setCurrentEditingSabor(null);
    } else {
      alert("Por favor, preencha todos os campos do Sabor.");
    }
  };

  if (loading) return <main>Carregando configurações de pizza...</main>;

  return (
    <main className="pizza-config-page">
      <h2>Gerenciar Pizzas</h2>
      <p className="description">
        Defina os tamanhos (preço base) e a lista de sabores (valor de
        referência para adicionar ao preço base).
      </p>

      {error && <p className="error-message">Erro: {error}</p>}

      <div className="pizza-sections">
        {/* --- Seção de Tamanhos --- */}
        <section className="pizza-section">
          <h3>Tamanhos e Preços Base</h3>
          <form onSubmit={handleAddTamanho} className="add-form">
            <input
              type="text"
              placeholder="Nome (ex: Grande)"
              value={newTamanho.nome}
              onChange={(e) =>
                setNewTamanho({ ...newTamanho, nome: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Sigla (ex: G)"
              value={newTamanho.sigla}
              maxLength={3}
              onChange={(e) =>
                setNewTamanho({
                  ...newTamanho,
                  sigla: e.target.value.toUpperCase(),
                })
              }
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço Base (R$)"
              value={newTamanho.base_preco}
              onChange={(e) =>
                setNewTamanho({ ...newTamanho, base_preco: e.target.value })
              }
              min="0"
              required
            />
            <button type="submit" className="btn btn-verde btn-add-tam">
              <AiOutlinePlus size={20} /> Add Tamanho
            </button>
          </form>

          <ul className="config-list">
            {tamanhos.map((t) => {
              const isEditing = t.id === editingTamanhoId;
              return (
                <li key={t.id}>
                  {isEditing ? (
                    // MODO EDIÇÃO
                    <div className="editing-fields">
                      <input
                        type="text"
                        name="nome"
                        value={currentEditingTamanho.nome}
                        onChange={handleEditTamanhoChange}
                        placeholder="Nome"
                      />
                      <input
                        type="text"
                        name="sigla"
                        value={currentEditingTamanho.sigla}
                        onChange={handleEditTamanhoChange}
                        placeholder="Sigla"
                        maxLength={3}
                      />
                      <input
                        type="number"
                        name="base_preco"
                        step="0.01"
                        value={currentEditingTamanho.base_preco}
                        onChange={handleEditTamanhoChange}
                        placeholder="Preço Base (R$)"
                      />
                    </div>
                  ) : (
                    // MODO VISUALIZAÇÃO
                    <span>
                      {t.nome} ({t.sigla}) - {formatPrice(t.base_preco)}
                    </span>
                  )}

                  <div className="item-botoes-admin">
                    {isEditing ? (
                      <button
                        className="btn btn-verde"
                        onClick={handleEditTamanhoSave}
                      >
                        <AiOutlineCheck size={16} /> Salvar
                      </button>
                    ) : (
                      <button
                        className="btn btn-verde"
                        onClick={() => handleEditTamanhoStart(t)}
                      >
                        <AiOutlineEdit size={16} /> Editar
                      </button>
                    )}
                    <button
                      className="btn btn-laranja"
                      onClick={() => handleDeleteTamanho(t.id)}
                      disabled={isEditing} // Desabilita o delete durante a edição
                    >
                      <AiOutlineDelete size={16} /> Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* --- Seção de Sabores --- */}
        <section className="pizza-section">
          <h3>Sabores e Valores de Referência</h3>
          <form onSubmit={handleAddSabor} className="add-form">
            <input
              type="text"
              placeholder="Nome do Sabor (ex: Calabresa)"
              value={newSabor.nome}
              onChange={(e) =>
                setNewSabor({ ...newSabor, nome: e.target.value })
              }
              required
            />
            <select
              value={newSabor.categoria}
              onChange={(e) =>
                setNewSabor({ ...newSabor, categoria: e.target.value })
              }
            >
              <option value="Padrão">Padrão</option>
              <option value="Premium">Premium</option>
              <option value="Especial">Especial</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Valor Ref. (R$)"
              value={newSabor.valor_referencia}
              onChange={(e) =>
                setNewSabor({ ...newSabor, valor_referencia: e.target.value })
              }
              min="0"
              required
            />
            <button type="submit" className="btn btn-verde btn-add-sabor">
              <AiOutlinePlus size={20} /> Add Sabor
            </button>
          </form>

          <ul className="config-list">
            {sabores.map((s) => {
              const isEditing = s.id === editingSaborId;
              return (
                <li key={s.id}>
                  {isEditing ? (
                    // MODO EDIÇÃO
                    <div className="editing-fields">
                      <input
                        type="text"
                        name="nome"
                        value={currentEditingSabor.nome}
                        onChange={handleEditSaborChange}
                        placeholder="Nome do Sabor"
                      />
                      <select
                        name="categoria"
                        value={currentEditingSabor.categoria}
                        onChange={handleEditSaborChange}
                      >
                        <option value="Padrão">Padrão</option>
                        <option value="Premium">Premium</option>
                        <option value="Especial">Especial</option>
                      </select>
                      <input
                        type="number"
                        name="valor_referencia"
                        step="0.01"
                        value={currentEditingSabor.valor_referencia}
                        onChange={handleEditSaborChange}
                        placeholder="Valor Ref. (R$)"
                      />
                    </div>
                  ) : (
                    // MODO VISUALIZAÇÃO
                    <span>
                      {s.nome} ({s.categoria}) - Adicional:{" "}
                      {formatPrice(s.valor_referencia)}
                    </span>
                  )}

                  <div className="item-botoes-admin">
                    {isEditing ? (
                      <button
                        className="btn btn-verde"
                        onClick={handleEditSaborSave}
                      >
                        <AiOutlineCheck size={16} /> Salvar
                      </button>
                    ) : (
                      <button
                        className="btn btn-verde"
                        onClick={() => handleEditSaborStart(s)}
                      >
                        <AiOutlineEdit size={16} /> Editar
                      </button>
                    )}
                    <button
                      className="btn btn-laranja"
                      onClick={() => handleDeleteSabor(s.id)}
                      disabled={isEditing} // Desabilita o delete durante a edição
                    >
                      <AiOutlineDelete size={16} /> Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <button
        onClick={handleSaveConfig}
        className="btn btn-azul btn-save-config"
        disabled={isSaving}
      >
        <AiOutlineCheck size={22} />
        {isSaving ? "Salvando..." : "Salvar Configurações de Pizza"}
      </button>
    </main>
  );
};

// ... (fim do componente PizzaConfig)

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

  // 🔑 NOVO: Declare o estado para a mensagem de erro
  const [errorMessage, setErrorMessage] = useState("");

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
  const [categorias, setCategorias] = useState([]);
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

  // 🟢 NOVOS ESTADOS PARA CONFIGURAÇÕES DE HORÁRIO (ADICIONE AQUI)
  const [scheduleConfig, setScheduleConfig] = useState(defaultSchedule); // Estado principal do horário
  const [isScheduleSaving, setIsScheduleSaving] = useState(false); // Estado de carregamento do formulário de horário
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false); // Estado de sucesso (feedback visual)

  // ESTADO E FUNÇÕES DO MENU HAMBÚRGUER (ADICIONE ESTE TRECHO)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Esta função garante que o menu feche ao mudar de página
  const changePage = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };
  // FIM ESTADO E FUNÇÕES DO MENU HAMBÚRGUER

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
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) {
        console.warn("lojaId não encontrado — relatório não será carregado.");
        return;
      }
      url += `&loja_id=${lojaId}`;
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
        body: JSON.stringify({
          status: novoStatus,
          loja_id: localStorage.getItem("lojaId"),
        }),
      });

      // Segunda requisição: envia a mensagem do WhatsApp
      if (novoStatus === "Pronto para entrega") {
        await fetch(`/api/pedidos/${pedidoId}/enviar-whatsapp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: novoStatus,
            loja_id: localStorage.getItem("lojaId"),
          }),
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
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) {
        console.error("❌ lojaId não encontrado no localStorage.");
        return;
      }

      const response = await fetch(`/api/cardapio?loja_id=${lojaId}`);
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
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) {
        alert("lojaId não encontrado. Faça login novamente.");
        return;
      }

      // Cria um objeto com os valores corretos (preço já é um número)
      const itemToSave = {
        ...itemForm,
        preco: parseFloat(itemForm.preco),
        adicionais,
        loja_id: lojaId,
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
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) {
        alert("lojaId não encontrado. Faça login novamente.");
        return;
      }

      await fetch(`/api/cardapio/${itemId}?loja_id=${lojaId}`, {
        method: "DELETE",
      });
      fetchCardapio();
    } catch (error) {
      console.error("Erro ao deletar item:", error);
    }
  };

  // ---------------------------------------------
  // FUNÇÕES DE STATUS DA LOJA E HORÁRIO (COMPLETAS E DINÂMICAS)
  // ---------------------------------------------

  // 🟢 NOVO: Manipula a mudança de inputs no formulário de horário
  const handleScheduleChange = (day, field, value) => {
    const newSchedule = scheduleConfig.map((s) => {
      if (s.day === day) {
        return {
          ...s,
          [field]: value, // Atualiza o campo (isActive, start, end)
        };
      }
      return s;
    });
    setScheduleConfig(newSchedule);
  };

  // 🟢 NOVO: Salva a configuração de horários no servidor
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setIsScheduleSaving(true);
    setScheduleSaveSuccess(false);

    try {
      // Usa a nova rota genérica de PUT
      const response = await fetch("/api/admin/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Envia o payload com o nome do campo do banco de dados
        body: JSON.stringify({
          loja_id: localStorage.getItem("lojaId"),
          schedule_config: scheduleConfig,
        }),
      });

      if (!response.ok) throw new Error("Falha ao salvar horários.");

      const data = await response.json();
      setScheduleConfig(data.scheduleConfig); // Sincroniza com o valor confirmado do servidor

      setScheduleSaveSuccess(true);
      setTimeout(() => setScheduleSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar horários:", err);
      alert("Erro ao salvar horários de funcionamento. Verifique o console.");
    } finally {
      setIsScheduleSaving(false);
    }
  };

  // 🟢 ATUALIZADA: Busca status forçado E configuração de horário
  const fetchStoreStatus = async () => {
    try {
      const lojaId = localStorage.getItem("lojaId");
      if (!lojaId) throw new Error("lojaId não encontrado.");

      const response = await fetch(`/api/admin/status?loja_id=${lojaId}`);
      if (!response.ok) throw new Error("Erro ao buscar status da loja.");

      const data = await response.json();
      setIsStoreForcedOpen(data.isForcedOpen);
      setScheduleConfig(data.scheduleConfig || defaultSchedule);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar status da loja:", error);
      setError(error.message);
    } finally {
      setIsStatusLoading(false);
    }
  };

  // 🟢 ATUALIZADA: Agora usa a rota genérica PUT /api/admin/configuracoes
  const handleToggleStoreStatus = async (newState) => {
    setIsStatusLoading(true);
    try {
      const response = await fetch("/api/admin/configuracoes", {
        // 👈 NOVA ROTA
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Envia o novo status no corpo com o nome do campo do banco de dados
        body: JSON.stringify({
          loja_id: localStorage.getItem("lojaId"),
          is_forced_open: newState,
        }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar status da loja.");

      const data = await response.json();
      // Atualiza o estado local com o valor retornado pelo servidor
      setIsStoreForcedOpen(data.isForcedOpen);

      alert(
        `Status da Loja atualizado para: ${newState ? "ABERTO" : "FECHADO"}`
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao tentar atualizar o status da loja.");
    } finally {
      setIsStatusLoading(false);
    }
  };

  // ---------------------------------------------
  // FIM FUNÇÕES DE STATUS DA LOJA E HORÁRIO
  // ---------------------------------------------

  // FUNÇÕES DE AUTENTICAÇÃO (Inalteradas)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); // 🟢 Inicia o carregamento
    setErrorMessage(""); // 🔑 Limpa o erro anterior antes de começar

    try {
      const response = await fetch("/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json(); // 🔑 Ler a resposta (que contém o token)

      if (response.ok) {
        // 🔑 NOVO: Armazenar o token e o loja_id no localStorage
        if (data.token) {
          localStorage.setItem("adminToken", data.token); // Usamos localStorage
          localStorage.setItem("lojaId", data.loja_id); // Loja ID para referência futura

          setIsLoggedIn(true);
          // O sessionStorage não é o mais seguro, mas vamos manter o nome
          sessionStorage.setItem("usuarioLogado", formData.nome);
          sessionStorage.setItem("isLoggedIn", "true"); // PERSISTE O LOGIN

          setUsuarioLogado(formData.nome);
          setFormData({ nome: "", senha: "" });
          setCurrentPage("pedidos");
          setErrorMessage(""); // Limpa qualquer erro prévio
        } else {
          setErrorMessage("Erro: Token não recebido após login bem-sucedido.");
        }
      } else {
        // alert(data.message);
        setErrorMessage(
          data.message || "Credenciais inválidas ou erro no servidor."
        ); // 🔑 Usa setErrorMessage
      }
    } catch (error) {
      // alert("Erro ao fazer login. Verifique o servidor.");
      setErrorMessage("Erro de conexão. Verifique se o servidor está ativo."); // 🔑 Usa setErrorMessage
    } finally {
      setIsAuthLoading(false); // 🟢 Finaliza o carregamento (sempre)
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true); // 🟢 Inicia o carregamento
    setErrorMessage(""); // 🔑 Limpa o erro anterior
    try {
      // ⚠️ ATENÇÃO: Se o seu registro NÃO tem o campo loja_id no frontend,
      // ele falhará. Por enquanto, só vamos corrigir o comportamento pós-registro.
      const dataToSend = { ...formData, loja_id: 5 }; // 👈 ASSUMINDO LOJA ID FIXO 5 PARA TESTE
      const response = await fetch("/api/usuarios/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend), // 👈 Envia o loja_id
      });

      const data = await response.json();

      if (response.status === 201) {
        alert("Usuário registrado com sucesso! Faça login.");
        setIsLogin(true); // Redireciona para o login
        setErrorMessage(""); // Limpa o erro, se houver
      } else {
        // alert(data.message);
        setErrorMessage(
          data.message || "Erro desconhecido ao registrar usuário."
        ); // 🔑 Usa setErrorMessage
      }
    } catch (error) {
      // alert("Erro ao registrar. Verifique o servidor.");
      setErrorMessage("Erro de conexão. Não foi possível registrar o usuário."); // 🔑 Usa setErrorMessage
    } finally {
      setIsAuthLoading(false); // 🟢 Finaliza o carregamento (sempre)
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("usuarioLogado"); // Limpar o nome
    localStorage.removeItem("adminToken"); // 🔑 NOVO: Limpa o token
    localStorage.removeItem("lojaId"); // 🔑 NOVO: Limpa o loja ID
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

    // 🔹 função interna que busca categorias
    const fetchCategorias = async () => {
      try {
        const lojaId = localStorage.getItem("lojaId");
        if (!lojaId) {
          console.warn(
            "lojaId não encontrado — categorias não serão carregadas."
          );
          return;
        }

        const response = await fetch(`/api/categorias?loja_id=${lojaId}`);
        const data = await response.json();
        setCategorias(data);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      }
    };

    if (isLoggedIn) {
      if (currentPage === "pedidos" || currentPage === "relatorios") {
        fetchRelatorio(filtroPeriodo, filtroStatus);
        fetchStoreStatus();
      } else if (currentPage === "cardapio") {
        // 🟢 carrega cardápio e categorias juntos
        fetchCardapio();
        fetchCategorias();
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

          {/* 🔑 Insira aqui: */}
          {errorMessage && (
            <p style={{ color: "red", marginTop: "10px" }}>{errorMessage}</p>
          )}

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
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        ></link>

        {/* 1. ÍCONE DO HAMBÚRGUER (Visível apenas no mobile) className="hamburger-icon" */}
        <div
          className="hamburger-icon" // Uma nova classe para estilizar, se necessário
          onClick={toggleMenu}
        >
          {/* Se o menu estiver aberto, mostra o ícone de fechar (X); senão, mostra o ícone de menu */}
          {isMenuOpen ? (
            <AiOutlineClose size={30} />
          ) : (
            <AiOutlineMenu size={30} />
          )}
        </div>

        {/* 2. MENU LATERAL (Visível apenas no mobile) */}
        <nav className={`menu-sidebar ${isMenuOpen ? "open" : ""}`}>
          <ul>
            <li>
              <button onClick={() => changePage("pedidos")}>Pedidos</button>
            </li>
            <li>
              <button onClick={() => changePage("relatorios")}>
                Relatórios
              </button>
            </li>
            <li>
              <button onClick={() => changePage("cardapio")}>Cardápio</button>
            </li>
            <li>
              <button onClick={() => changePage("configuracoes")}>
                Horário de Funcionamento
              </button>
            </li>
            <li>
              <button onClick={() => changePage("categorias")}>
                Categorias
              </button>
            </li>
            <li>
              <button onClick={() => changePage("pizzaconfig")}>
                Configurações Pizza
              </button>
            </li>
            <li>
              <button onClick={() => changePage("configloja")}>
                Configuração da Loja
              </button>
            </li>
            <li>
              <button onClick={handleLogout}>Sair</button>
            </li>
          </ul>
        </nav>

        {/* 3. NAVEGAÇÃO DESKTOP (Usaremos a classe 'desktop-only-nav' para escondê-la no mobile) */}
        <nav className="nav-menu desktop-only-nav">
          <button onClick={() => changePage("pedidos")}>Pedidos</button>
          <button onClick={() => changePage("relatorios")}>Relatórios</button>
          <button onClick={() => changePage("cardapio")}>Cardápio</button>
          <button onClick={() => changePage("configuracoes")}>
            Horário de Funcionamento
          </button>
          <button onClick={() => changePage("categorias")}>Categorias</button>
          <button onClick={() => changePage("pizzaconfig")}>
            Configurações Pizza
          </button>
          <button onClick={() => changePage("configloja")}>
            Configuração da Loja
          </button>
          <button onClick={handleLogout}>Sair</button>
        </nav>
      </header>

      {/* 🟢 CONTEÚDO DA PÁGINA DE CONFIGURAÇÕES */}
      {currentPage === "configuracoes" && (
        <main className="painel-configuracoes">
          <h2>Configurações da Loja</h2>

          {/* ------------------------------------------------------------- */}
          {/* 🟢 NOVO CARD: CONFIGURAÇÃO DE HORÁRIOS */}
          {/* ------------------------------------------------------------- */}
          <div className="config-card">
            <div className="titulo-config-card">
              <BsClockFill size={24} style={{ marginRight: "10px" }} />
              <h3>Horário de Funcionamento Programado</h3>
            </div>
            <p>
              Defina os dias e horários em que a loja aceita pedidos
              automaticamente. Esta configuração é ignorada se o{" "}
              <span style={{ color: "#f44336" }}>
                Status de Abertura Forçada
              </span>{" "}
              abaixo estiver ativo.
            </p>

            <form onSubmit={handleSaveSchedule}>
              {/* 🚨 Atenção: Este CSS (.schedule-form-grid e .schedule-row) deve ser adicionado ao seu App.css! */}
              <div className="schedule-form-grid">
                <label>Dia:</label>
                <label>Aberto:</label>
                <label>Início (HH:MM)</label>
                <label>Fim (HH:MM)</label>
              </div>

              {scheduleConfig.map((dayConfig) => (
                <div key={dayConfig.day} className="schedule-row">
                  <span>{dayConfig.name}</span>

                  <input
                    type="checkbox"
                    checked={dayConfig.isActive}
                    onChange={(e) =>
                      handleScheduleChange(
                        dayConfig.day,
                        "isActive",
                        e.target.checked
                      )
                    }
                  />

                  <input
                    type="time"
                    value={dayConfig.start}
                    onChange={(e) =>
                      handleScheduleChange(
                        dayConfig.day,
                        "start",
                        e.target.value
                      )
                    }
                    disabled={!dayConfig.isActive}
                    required
                  />

                  <input
                    type="time"
                    value={dayConfig.end}
                    onChange={(e) =>
                      handleScheduleChange(dayConfig.day, "end", e.target.value)
                    }
                    disabled={!dayConfig.isActive}
                    required
                  />
                </div>
              ))}

              <button
                type="submit"
                className={`btn ${
                  isScheduleSaving ? "btn-laranja" : "btn-verde"
                }`}
                disabled={isScheduleSaving}
              >
                <AiOutlineCheck size={20} />
                {isScheduleSaving ? "Salvando Horários..." : "Salvar Horários"}
              </button>

              {scheduleSaveSuccess && (
                <p style={{ color: "green", marginTop: "10px" }}>
                  Horários salvos com sucesso!
                </p>
              )}
            </form>
          </div>
          {/* ------------------------------------------------------------- */}
          {/* FIM NOVO CARD: CONFIGURAÇÃO DE HORÁRIOS */}
          {/* ------------------------------------------------------------- */}

          {/* CARD EXISTENTE: STATUS DE ABERTURA FORÇADA (COMEÇA AQUI) */}
          <div className="config-card">
            <div className="titulo-config-card">
              <BsClockFill size={24} style={{ marginRight: "10px" }} />
              <h3>Status de Abertura Forçada</h3>
            </div>
            <p>
              Esta opção permite que você force a loja a aparecer como ABERTA
              para todos os clientes, ignorando o horário de funcionamento.
            </p>

            {isStatusLoading ? (
              <p className="loading">Carregando status...</p>
            ) : (
              <div className="status-toggle-container">
                <span>
                  Status Atual:
                  {isStoreForcedOpen ? " 🟢 ABERTA" : " 🟠 FECHADO"}
                </span>

                <button
                  className={`btn ${
                    isStoreForcedOpen ? "btn-vermelho" : "btn-verde"
                  }`}
                  onClick={() => handleToggleStoreStatus(!isStoreForcedOpen)}
                  disabled={isStatusLoading}
                >
                  {isStoreForcedOpen ? (
                    // Icone 'ON' quando a loja está forçada a ABRIR
                    <>
                      <BsToggleOff size={20} style={{ marginRight: "5px" }} />
                      Fechar Loja
                    </>
                  ) : (
                    // Icone 'OFF' quando a loja está forçada a FECHAR
                    <>
                      <BsToggleOn size={20} style={{ marginRight: "5px" }} />
                      Abrir Loja
                    </>
                  )}
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
                  {formatPrice(resumoRelatorio.faturamento)}
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
                <p>Total: {formatPrice(pedido.total)}</p>
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
              <h4>Escolha a categoria:</h4>
              <select
                name="categoria"
                required
                value={itemForm.categoria || ""}
                onChange={(e) =>
                  setItemForm({ ...itemForm, categoria: e.target.value })
                }
              >
                <option value="" disabled>
                  Selecione a Categoria
                </option>

                {categorias.length > 0 ? (
                  categorias.map((cat) => (
                    <option key={cat.id} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))
                ) : (
                  <option disabled>Carregando categorias...</option>
                )}
              </select>

              <button
                className="btn-add-item btn btn-verde"
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
                  <p className="valor-item-info-admin">
                    R$ {item.preco ? item.preco.toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="item-botoes-admin">
                  <button
                    className="btn btn-verde"
                    onClick={() => handleEdit(item)}
                  >
                    <AiOutlineEdit size={20} /> Editar
                  </button>
                  <button
                    className="btn btn-laranja"
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
      {currentPage === "categorias" && <Categorias />}
      {currentPage === "pizzaconfig" && <PizzaConfig />}
      {currentPage === "configloja" && <ConfigLoja />}
      <footer>
        <p className="footer-admin">
          &copy; 2025 Manú Lanches. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

export default App;
