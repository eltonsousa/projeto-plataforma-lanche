import React, { useState, useEffect, useCallback, useRef } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import "./styles/cardapio.css";
import "./styles/checkout.css";
import "./styles/carrinho.css";
import "./styles/modal-content-detalhes.css";
import "./styles/nav-categorias.css";
import "./styles/status-indicator.css";

import { formatPrice } from "./utils/format";

// ---- Import icones ---- //
import { TbNews } from "react-icons/tb";
import { BsCart3, BsCashCoin, BsPhone, BsShopWindow } from "react-icons/bs";

import {
  AiOutlineMinus,
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineClose,
  AiOutlineCheck,
  AiOutlineUser,
} from "react-icons/ai";
import { MdOutlineArrowBackIosNew } from "react-icons/md";
import { CiDeliveryTruck } from "react-icons/ci";
// ---- Import icones ---- //

// URL base da API
// const API_URL = "http://localhost:3001/api"; // Comentado/Removido, pois a variável não era utilizada.

// ----------------------------------------------------
// 🟢 NOVAS CONFIGURAÇÕES DE PIZZA (Para fins de demonstração)
//    O ideal é que isso seja carregado de uma rota /api/pizzas-config
// ----------------------------------------------------
const PIZZA_TAMANHOS = [
  { nome: "Média", base_preco: 40.0, sigla: "M" },
  { nome: "Grande", base_preco: 55.0, sigla: "G" },
  { nome: "Família", base_preco: 70.0, sigla: "F" },
];

const PIZZA_SABORES = [
  { nome: "Mussarela", valor_referencia: 0.0, categoria: "Padrão" },
  { nome: "Calabresa", valor_referencia: 0.0, categoria: "Padrão" },
  { nome: "4 Queijos", valor_referencia: 5.0, categoria: "Especial" },
  { nome: "Portuguesa", valor_referencia: 5.0, categoria: "Especial" },
  { nome: "Frango c/ Catupiry", valor_referencia: 7.5, categoria: "Premium" },
  { nome: "Camarão", valor_referencia: 10.0, categoria: "Premium" },
];
// ----------------------------------------------------

// ----------------------------------------------------
// 🟢 NOVAS FUNÇÕES E CONFIGURAÇÕES DE HORÁRIO (DINÂMICAS)
// ----------------------------------------------------

// 🟢 1. FUNÇÃO DE CÁLCULO: Verifica se a loja está aberta APENAS pelo horário programado
const isStoreOpenBySchedule = (scheduleConfig) => {
  // Se a configuração ainda não carregou ou está vazia (nunca foi salva)
  if (!scheduleConfig || scheduleConfig.length === 0) return false;

  const now = new Date();
  // getDay retorna: 0 (Domingo), 1 (Segunda), ..., 6 (Sábado)
  const dayOfWeek = now.getDay();
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Encontra a configuração do dia atual (o formato é um array de objetos, não um objeto indexado)
  const todaySchedule = scheduleConfig.find((s) => s.day === dayOfWeek);

  // 2. Se o dia não tem configuração ou está desativado no Admin
  if (!todaySchedule || !todaySchedule.isActive) return false;

  // Função utilitária para converter "HH:MM" para minutos totais
  const timeToMinutes = (timeStr) => {
    // Assume o formato "HH:MM" que o Admin envia
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  try {
    const startMinutes = timeToMinutes(todaySchedule.start);
    const endMinutes = timeToMinutes(todaySchedule.end);

    // Caso normal (Ex: 18:00 - 23:00)
    if (startMinutes <= endMinutes) {
      return (
        currentTimeInMinutes >= startMinutes &&
        currentTimeInMinutes <= endMinutes
      );
    } else {
      // Caso que vira o dia (Ex: 22:00 - 02:00)
      // Aberto se (Hora atual >= Hora de início) OU (Hora atual <= Hora de fim)
      return (
        currentTimeInMinutes >= startMinutes ||
        currentTimeInMinutes <= endMinutes
      );
    }
  } catch (e) {
    console.error("Erro ao processar horário dinâmico:", e);
    return false;
  }
};

// 2. LÓGICA DE VERIFICAÇÃO (Agora aceita a configuração completa)
const checkIsStoreOpen = (
  overrideStatus = { isForcedOpen: false, scheduleConfig: null } // 🟢 Recebe a configuração
) => {
  // 🟢 PRIORIDADE MÁXIMA: Se o painel de administração forçar a abertura, retorna TRUE.
  if (overrideStatus.isForcedOpen) {
    return true;
  }

  // 🟢 NOVO CÁLCULO: Usa o horário configurado no Admin
  return isStoreOpenBySchedule(overrideStatus.scheduleConfig);
};

// 3. CUSTOM HOOK PARA USAR O STATUS NO COMPONENTE (Agora busca status completo do servidor)
const useOperatingStatus = () => {
  // Estado para armazenar o status de abertura forçada lido do servidor
  const [storeOverride, setStoreOverride] = useState({
    isForcedOpen: false,
    scheduleConfig: null, // 🟢 NOVO CAMPO NO ESTADO
    isFetching: true,
  });

  const [isStoreOpen, setIsStoreOpen] = useState(
    checkIsStoreOpen({ isForcedOpen: false, scheduleConfig: null }) // Inicialização com valores nulos
  );

  // Função para buscar o status no seu backend a cada 30 segundos
  const fetchOverrideStatus = useCallback(async () => {
    try {
      // Esta rota DEVE AGORA retornar { isForcedOpen, scheduleConfig }
      const response = await fetch("/api/admin/status");
      if (response.ok) {
        const data = await response.json();

        // 🟢 ATUALIZA O ESTADO COM AMBOS OS CAMPOS
        setStoreOverride({
          isForcedOpen: data.isForcedOpen,
          scheduleConfig: data.scheduleConfig,
          isFetching: false,
        });
      }
    } catch (error) {
      console.error("Falha ao buscar status do Admin:", error);
      setStoreOverride((prev) => ({ ...prev, isFetching: false }));
    }
  }, []);

  // Efeito 1: Busca o status do admin a cada 30 segundos
  useEffect(() => {
    fetchOverrideStatus();
    const intervalId = setInterval(fetchOverrideStatus, 30000); // Repete a cada 30s
    return () => clearInterval(intervalId);
  }, [fetchOverrideStatus]);

  // Efeito 2: Recalcula o status de abertura quando a hora, sobrescrita ou o SCHEDULE muda
  useEffect(() => {
    const calculateStatus = () => {
      // 🟢 Passa a configuração completa para a lógica de verificação
      setIsStoreOpen(checkIsStoreOpen(storeOverride));
    };

    calculateStatus(); // Roda quando o storeOverride muda

    // Verifica a cada minuto (60000ms) para atualização em tempo real
    const intervalId = setInterval(calculateStatus, 60000);

    return () => clearInterval(intervalId);
  }, [storeOverride]); // O hook reage a qualquer mudança em storeOverride (incluindo scheduleConfig)

  return {
    isStoreOpen: isStoreOpen, // O status booleano
    storeOverride: storeOverride, // 🟢 Retorna as configurações lidas do servidor (inclui scheduleConfig)
  };
};

// 4. COMPONENTE INDICADOR DE STATUS (O FLAG)
const StatusIndicator = ({ isStoreOpen, onClick }) => {
  const text = isStoreOpen ? "Aberto" : "Fechado";

  // Usa BsShopWindow para ambos os estados
  const IconComponent = BsShopWindow;

  // Define a classe dinâmica com base no status (para a cor)
  const statusClass = isStoreOpen ? "aberta" : "fechada";

  return (
    <div
      className={`status-indicator ${statusClass}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <IconComponent size={12} />
      <span>{text}</span>
    </div>
  );
};

// 5. NOVO COMPONENTE: Modal de Horários
const ScheduleModal = ({ scheduleConfig, onClose }) => {
  // 🟢 CORREÇÃO 1: Usar scheduleConfig (a prop) para a verificação.
  if (!scheduleConfig || scheduleConfig.isFetching) return null;

  const defaultScheduleNames = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  // 🟢 CORREÇÃO 2: Acessar o array de horários via scheduleConfig.scheduleConfig
  const sortedSchedule = [...scheduleConfig.scheduleConfig].sort(
    (a, b) => a.day - b.day
  );

  return (
    <div className="modal-overlay overlay" onClick={onClose}>
      <div
        className="modal-content modal-schedule"
        onClick={(e) => e.stopPropagation()}
      >
        <AiOutlineClose className="modal-close-icon" onClick={onClose} />

        <h2>Horário de Funcionamento</h2>
        <div className="schedule-list">
          {sortedSchedule.map((dayConfig) => (
            <div key={dayConfig.day} className="schedule-item">
              <strong>{defaultScheduleNames[dayConfig.day]}:</strong>
              <span>
                {dayConfig.isActive
                  ? `${dayConfig.start}h às ${dayConfig.end}h`
                  : "Fechado"}
              </span>
            </div>
          ))}
        </div>

        <p className="info-schedule">
          *Os horários são configurados pelo administrador. Verifique o status
          atual da loja.
        </p>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// FIM: NOVAS FUNÇÕES
// ----------------------------------------------------

// --- FUNÇÕES DE PERSISTÊNCIA ---
const getSessionId = () => {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

// 🟢 NOVO HOOK PARA ARRASTAR COM O MOUSE
const useDraggableScroll = () => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e) => {
      setIsDragging(true);
      setStartX(e.pageX - el.offsetLeft);
      setScrollLeft(el.scrollLeft);
      // Impede a seleção de texto ao arrastar
      e.preventDefault();
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      // Calcula o quanto o mouse se moveu
      const x = e.pageX - el.offsetLeft;
      // Calcula a distância para mover a rolagem
      const walk = (x - startX) * 1.5; // Multiplicador para deslizar mais rápido
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isDragging, startX, scrollLeft]);

  return ref;
};

// COMPONENTE: Ícone do carrinho
const CartIcon = ({ count, onClick, isStoreOpen }) => (
  <button
    className="carrinho-icon-btn"
    onClick={isStoreOpen ? onClick : null} // 🔴 Desativa o click se estiver fechada
    disabled={!isStoreOpen} // 🔴 Desabilita o botão visualmente
    style={{
      opacity: isStoreOpen ? 1 : 0.5,
      cursor: isStoreOpen ? "pointer" : "not-allowed",
    }}
  >
    <BsCart3 size={24} />
    {count > 0 && <span className="carrinho-count">{count}</span>}
  </button>
);

function App() {
  const sessionId = getSessionId();
  const { isStoreOpen, storeOverride } = useOperatingStatus();
  const categoriaNavRef = useDraggableScroll();
  const [carrinho, setCarrinho] = useState([]);
  const [mostraCheckout, setMostraCheckout] = useState(false);
  // 🟢 NOVO ESTADO: Controla a visibilidade do Modal de Horário
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [ultimoPedido, setUltimoPedido] = useState(null);
  const [itensCardapio, setItensCardapio] = useState([]);
  const [error, setError] = useState(null);
  const [mostraCarrinho, setMostraCarrinho] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeProduto, setQuantidadeProduto] = useState(1);
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Sanduíches");
  const [categorias, setCategorias] = useState([]);

  // ----------------------------------------------------
  // 🟢 NOVOS ESTADOS PARA O FLUXO DE PIZZA (INSERIR AQUI)
  // ----------------------------------------------------
  const [isPizzaModalVisible, setIsPizzaModalVisible] = useState(false);
  const [pizzaConfig, setPizzaConfig] = useState({
    tamanho: null,
    sabores: [], // Máximo 2 objetos de sabor
    preco_base: 0,
    preco_final: 0,
  });
  // ----------------------------------------------------

  // Observação
  const [observacao, setObservacao] = useState("");

  // Adicionais com quantidade
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState({});

  // ----------------------------------------------------
  // 🟢 INÍCIO DAS FUNÇÕES DE PIZZA (MOVIDAS PARA DENTRO)
  // ----------------------------------------------------

  // Função para calcular o preço final da pizza (com a regra do sabor mais caro)
  // 🟢 CORREÇÃO: Esta função estava duplicada no escopo global (com useCallback), causando erro.
  const calcularPrecoPizza = useCallback((tamanho, sabores) => {
    if (!tamanho) return 0;

    let precoFinal = tamanho.base_preco;

    if (sabores.length === 0) {
      return precoFinal;
    }

    const valorAdicionalMaximo = sabores.reduce((max, sabor) => {
      return Math.max(max, sabor.valor_referencia);
    }, 0);

    precoFinal += valorAdicionalMaximo;
    return precoFinal;
  }, []);

  // 🟢 NOVO: Função para calcular o total da pizza (base + adicionais)
  const calcularTotalPizzaComAdicionais = useCallback(
    (precoBaseSabores, adicionais) => {
      const precoAdicionais = Object.values(adicionais).reduce(
        (total, ad) => total + ad.preco * ad.quantidade,
        0
      );
      return precoBaseSabores + precoAdicionais;
    },
    []
  );

  // Efeito para recalcular o preco_final sempre que os sabores, tamanho ou adicionais mudarem
  useEffect(() => {
    // 1. Calcula o preço base (tamanho + sabor mais caro)
    const precoBaseSabores = calcularPrecoPizza(
      pizzaConfig.tamanho,
      pizzaConfig.sabores
    );

    // 2. Calcula o total com adicionais
    const novoPrecoFinal = calcularTotalPizzaComAdicionais(
      precoBaseSabores,
      adicionaisSelecionados
    );

    // 3. Atualiza o estado
    // CRÍTICO: Usamos um `setPizzaConfig` com o valor direto, não a função de callback,
    // pois `precoBaseSabores` e `novoPrecoFinal` já foram calculados fora.
    setPizzaConfig((prev) => ({
      ...prev,
      preco_base: precoBaseSabores,
      preco_final: novoPrecoFinal,
    }));
  }, [
    pizzaConfig.tamanho,
    pizzaConfig.sabores,
    adicionaisSelecionados,
    calcularPrecoPizza,
    calcularTotalPizzaComAdicionais,
  ]);

  // 1. Inicia o modal de pizza
  const handleOpenPizzaModal = () => {
    setPizzaConfig({
      tamanho: null,
      sabores: [],
      preco_base: 0,
      preco_final: 0,
    });
    setProdutoSelecionado(null);
    setAdicionaisSelecionados({}); // <--- Reseta adicionais
    setObservacao(""); // <--- Reseta observação
    setIsPizzaModalVisible(true);
  };

  // 2. Manipula a escolha do tamanho (Função mantida, mas agora o useEffect faz o cálculo final)
  const handleSelectTamanho = (tamanho) => {
    setPizzaConfig((prev) => ({
      ...prev,
      tamanho: tamanho,
      // preco_base e preco_final serão ajustados pelo useEffect
    }));
  };

  // 3. Manipula a escolha/desescolha do sabor (Função mantida, mas agora o useEffect faz o cálculo final)
  const handleSelectSabor = (saborSelecionado) => {
    setPizzaConfig((prev) => {
      if (!prev.tamanho) return prev;

      const isSelected = prev.sabores.some(
        (s) => s.nome === saborSelecionado.nome
      );
      let novosSabores;

      if (isSelected) {
        novosSabores = prev.sabores.filter(
          (s) => s.nome !== saborSelecionado.nome
        );
      } else {
        if (prev.sabores.length < 2) {
          novosSabores = [...prev.sabores, saborSelecionado];
        } else {
          alert("Você pode escolher no máximo 2 sabores (Meia/Meia).");
          return prev;
        }
      }

      return {
        ...prev,
        sabores: novosSabores,
        // preco_final será ajustado pelo useEffect
      };
    });
  };

  // 4. Adiciona a pizza montada ao carrinho (Inalterada, pois usa o estado final)
  const handleAddPizzaToCart = () => {
    if (!pizzaConfig.tamanho) {
      alert("Por favor, escolha um tamanho.");
      return;
    }
    if (pizzaConfig.sabores.length === 0) {
      alert("Por favor, escolha pelo menos 1 sabor.");
      return;
    }

    const nomeItem = `Pizza ${pizzaConfig.tamanho.nome}`;
    const detalhesSabores = pizzaConfig.sabores.map((s) => s.nome).join(" / ");

    // Pega os adicionais e a observação do estado global
    const adicionaisParaCarrinho = Object.values(adicionaisSelecionados);

    // Concatena os sabores com a observação do usuário
    let finalObservation = `Sabores: ${detalhesSabores}`;
    if (observacao.trim()) {
      finalObservation += ` | Obs: ${observacao.trim()}`;
    }

    const pizzaItem = {
      id: `pizza-${Date.now()}`,
      nome: nomeItem,
      categoria: "Pizzas",
      preco: pizzaConfig.preco_final, // Usa o preço final com adicionais
      quantidade: 1,
      observacao: finalObservation, // Inclui sabores + observação do usuário (se houver)
      adicionais: adicionaisParaCarrinho, // Inclui os adicionais
    };

    setCarrinho((prev) => [...prev, pizzaItem]);
    setIsPizzaModalVisible(false);

    // CRITICAL: Reset general states after adding the item
    setAdicionaisSelecionados({});
    setObservacao("");
  };

  // ----------------------------------------------------
  // 🟢 FUNÇÃO MODIFICADA: GATILHO PARA ABRIR FLUXO DE PIZZA
  // 🟢 CORREÇÃO: Movida para dentro do componente `App` para ter acesso aos setters de estado.
  // ----------------------------------------------------
  const handleAddItemToCart = (item) => {
    // Se for categoria Pizzas, ABRE O MODAL ESPECIAL
    if (item.categoria === "Pizzas") {
      handleOpenPizzaModal();
      return;
    }

    // SENÃO, abre o modal de detalhes original (seu fluxo padrão)
    if (isStoreOpen) {
      setProdutoSelecionado(item);
      setQuantidadeProduto(1);
      setAdicionaisSelecionados({});
      setObservacao("");
    }
  };

  // ----------------------------------------------------
  // 🟢 FIM DAS FUNÇÕES DE PIZZA
  // ----------------------------------------------------

  // Funções
  const aumentarAdicional = (adicional) => {
    setAdicionaisSelecionados((prev) => ({
      ...prev,
      [adicional.nome]: {
        ...adicional,
        quantidade: (prev[adicional.nome]?.quantidade || 0) + 1,
      },
    }));
  };

  const diminuirAdicional = (adicional) => {
    setAdicionaisSelecionados((prev) => {
      const atual = prev[adicional.nome]?.quantidade || 0;
      if (atual <= 1) {
        const novo = { ...prev };
        delete novo[adicional.nome];
        return novo;
      }
      return {
        ...prev,
        [adicional.nome]: {
          ...adicional,
          quantidade: atual - 1,
        },
      };
    });
  };

  // 🛑 CORREÇÃO PRINCIPAL: Substituição da lógica incorreta/duplicada
  const adicionarAoCarrinho = (produto) => {
    // Cria um array de adicionais limpo para o objeto do carrinho
    const adicionaisParaCarrinho = Object.values(adicionaisSelecionados);

    // Adiciona o item como novo, garantindo um ID único no carrinho,
    // o que é essencial para diferenciar itens com as mesmas bases,
    // mas com adicionais ou observações diferentes.
    setCarrinho((prevCarrinho) => [
      ...prevCarrinho,
      {
        ...produto, // Base item data (id original, nome, preco base, categoria)
        // Sobrescreve/adiciona as propriedades do carrinho.
        // Isso resolve o erro 'no-dupe-keys' ao garantir que 'adicionais' e 'observacao'
        // só são definidos explicitamente aqui, após o spread, e não são copiados duplicadamente.
        id: `${produto.id}-${Date.now()}`, // CRÍTICO: Usa um ID único para o item no carrinho
        quantidade: quantidadeProduto, // CORREÇÃO: Usa a quantidade do estado (quantidadeProduto)
        adicionais: adicionaisParaCarrinho, // Adiciona os adicionais selecionados
        observacao, // Adiciona a observação do usuário
      },
    ]);

    // Limpa campos e fecha modal
    setAdicionaisSelecionados({});
    setObservacao("");
  };

  // 🟢 ESTADO USADO PARA CONTROLE DE CARREGAMENTO
  const [cardapioLoading, setCardapioLoading] = useState(true);

  // const cardapioFiltrado = itensCardapio.filter(
  //   (item) => item.categoria === categoriaSelecionada
  // );

  // 🟢 Estados do checkout
  const [servico, setServico] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [telefone, setTelefone] = useState(""); // <-- NOVO ESTADO
  // --- FUNÇÕES ASYNC ---
  const loadCarrinhoFromSupabase = useCallback(async () => {
    try {
      const response = await fetch(`/api/carrinho/${sessionId}`);
      if (response.ok) {
        const itens = await response.json();
        if (itens && itens.length > 0) setCarrinho(itens);
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
    }
  }, [sessionId]);

  const saveCarrinhoToSupabase = useCallback(
    async (currentCarrinho) => {
      try {
        await fetch("/api/carrinho", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, itens: currentCarrinho }),
        });
      } catch (error) {
        console.error("Erro ao salvar carrinho:", error);
      }
    },
    [sessionId]
  );

  // --- FUNÇÕES DE CARDÁPIO ---
  // 🟢 ATUALIZADA: Agora aceita um parâmetro (isInitial) para controlar se deve
  // mostrar o loading. Assim atualizações periódicas não disparam o spinner.
  const fetchCardapio = useCallback(async (isInitial = false) => {
    if (isInitial) setCardapioLoading(true); // só ativa o loading na primeira vez
    try {
      const response = await fetch("/api/cardapio");
      if (!response.ok) throw new Error("Erro ao buscar o cardápio");
      const data = await response.json();
      setItensCardapio(data);
      setError(null);
    } catch (error) {
      console.error("Erro ao buscar cardápio:", error);
      setError(error.message);
    } finally {
      if (isInitial) setCardapioLoading(false); // só desativa o loading inicial
    }
  }, []); // Dependências vazias, já que não usa estados externos

  // 🟢 NOVA FUNÇÃO: Carrega categorias dinamicamente
  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch("/api/categorias");
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      const data = await res.json();
      setCategorias(data);

      // Se for a primeira vez, define a primeira categoria como selecionada
      setCategoriaSelecionada((prev) => (prev ? prev : data[0]?.nome || ""));
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  }, []); // <-- 🔴 sem dependências

  // 🟢 NOVO: Função para obter ícone baseado na categoria
  // const getCategoryIcon = (category) => {
  //   switch (category) {
  //     case "Sanduíches":
  //       return "🍔"; // Hambúrguer
  //     case "Bebidas":
  //       return "🥤"; // Copo de bebida
  //     case "Fritas":
  //       return "🍟"; // Batata Frita
  //     case "Comidas":
  //       return "🍝"; // Macarrão/Prato
  //     case "Pizzas":
  //       return "🍕";
  //     default:
  //       return "";
  //   }
  // };

  const getCategoryIcon = (category) => {
    const nome = category.toLowerCase();
    if (nome.includes("pizza")) return "🍕";
    if (nome.includes("lanche") || nome.includes("sandu")) return "🍔";
    if (nome.includes("bebida") || nome.includes("refri")) return "🥤";
    if (nome.includes("frita")) return "🍟";
    if (nome.includes("comida") || nome.includes("prato")) return "🍝";
    return "📦";
  };

  // --- Helpers para scroll e agrupamento ---

  // Gera um id seguro para usar em `id` de sections (remove espaços/caracteres)
  const slugify = (text) =>
    text
      .toString()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  // Rola suavemente até a section da categoria e marca como selecionada
  const scrollToCategoria = (nome) => {
    const id = slugify(nome);
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      // marca visualmente (opcional: mantém botão ativo)
      setCategoriaSelecionada(nome);
    }
  };

  // Agrupa o cardápio por categoria (memoizado)
  const cardapioAgrupado = React.useMemo(() => {
    // preserva a ordem das categorias vindas do backend
    return categorias.map((cat) => ({
      nome: cat.nome,
      id: slugify(cat.nome),
      itens: itensCardapio.filter((it) => it.categoria === cat.nome),
    }));
  }, [categorias, itensCardapio]);

  // --- EFEITOS ---
  useEffect(() => {
    // primeira carga com spinner
    fetchCardapio(true);
    loadCarrinhoFromSupabase();
    fetchCategorias();

    // 🟢 NOVO: Tenta carregar o telefone do Local Storage
    const telefoneSalvo = localStorage.getItem("lanchonete_telefone");
    if (telefoneSalvo) {
      setTelefone(telefoneSalvo);
    }

    // atualizações periódicas em segundo plano (sem spinner)
    const intervalId = setInterval(() => fetchCardapio(false), 10000);
    return () => clearInterval(intervalId);
  }, [fetchCardapio, loadCarrinhoFromSupabase, fetchCategorias]);

  // Efeito para persistir carrinho no Supabase
  // ✅ MODIFICADO: Condição agora verifica cardapioLoading
  useEffect(() => {
    if (!cardapioLoading) saveCarrinhoToSupabase(carrinho);
    if (carrinho.length === 0) setMostraCarrinho(false);
  }, [carrinho, cardapioLoading, saveCarrinhoToSupabase]);

  // --- FUNÇÕES DE CARRINHO ---
  const aumentarQuantidade = (itemId) => {
    setCarrinho(
      carrinho.map((item) =>
        item.id === itemId ? { ...item, quantidade: item.quantidade + 1 } : item
      )
    );
  };

  const diminuirQuantidade = (itemId) => {
    const novoCarrinho = carrinho
      .map((item) =>
        item.id === itemId ? { ...item, quantidade: item.quantidade - 1 } : item
      )
      .filter((item) => item.quantidade > 0);
    setCarrinho(novoCarrinho);
  };

  const removerDoCarrinho = (itemId) => {
    setCarrinho(carrinho.filter((item) => item.id !== itemId));
  };

  const calcularTotal = () =>
    carrinho.reduce((total, item) => {
      // Se o item já tem o preço final (pizza), não somar adicionais novamente
      const totalItem =
        item.categoria === "Pizzas"
          ? item.preco * item.quantidade
          : item.preco * item.quantidade +
            (item.adicionais
              ? item.adicionais.reduce(
                  (acc, ad) => acc + ad.preco * ad.quantidade * item.quantidade,
                  0
                )
              : 0);

      return total + totalItem;
    }, 0);

  const handleToggleCarrinho = () => {
    // 🔴 ATUALIZADO: Só abre o carrinho se a loja estiver aberta
    if (carrinho.length > 0 && isStoreOpen) setMostraCarrinho(!mostraCarrinho);
  };

  const handleFinalizarPedido = () => {
    // 🔴 ATUALIZADO: Só permite finalizar se a loja estiver aberta
    if (!isStoreOpen) return;
    setMostraCheckout(true);
    setMostraCarrinho(false);
  };

  // --- CHECKOUT ---
  const handleCheckoutSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const cliente = {
      nome: formData.get("nome"),
      telefone: telefone, // <-- ATUALIZAÇÃO
      servico: servico,
      endereco: servico === "entrega" ? formData.get("endereco") : "",
      pagamento: pagamento,
      troco: pagamento === "dinheiro" ? parseFloat(formData.get("troco")) : 0,
    };

    const dadosDoPedido = {
      cliente,
      itens: carrinho,
      total: calcularTotal(),
      data: new Date().toISOString(),
      tipo_servico: servico, // <-- ATUALIZAÇÃO
    };

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosDoPedido),
      });

      if (response.ok) {
        localStorage.setItem("lanchonete_telefone", telefone);
        setUltimoPedido({ itens: carrinho, total: calcularTotal() });
        await saveCarrinhoToSupabase([]); // limpa no backend
        setCarrinho([]); // limpa no front
        setMostraCheckout(false);
        setPedidoFinalizado(true);
      } else {
        alert("Erro ao enviar o pedido. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      alert("Erro ao se conectar com o servidor.");
    }
  };

  const handleNovoPedido = () => {
    setPedidoFinalizado(false);
    setMostraCarrinho(false);
    setServico("");
    setPagamento("");
  };

  // --- RENDERIZAÇÃO ---
  // ✅ MODIFICADO: Usa cardapioLoading para o loading inicial
  if (cardapioLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando o cardápio...</p>
      </div>
    );
  }
  if (error)
    return <div className="error">Erro ao carregar cardápio: {error}</div>;

  const totalItensCarrinho = carrinho.reduce((t, i) => t + i.quantidade, 0);

  // 🟢 NOVO: Busca o item base de Pizza para extrair a lista de adicionais
  const basePizzaItem = itensCardapio.find(
    (item) => item.categoria === "Pizzas"
  );

  return (
    <div className="App">
      {/* 🔴 NOVO: O FLAG de status no canto da tela */}
      <StatusIndicator
        isStoreOpen={isStoreOpen}
        // 🟢 PASSA A FUNÇÃO PARA ABRIR O MODAL
        onClick={() => setIsScheduleModalVisible(true)}
      />

      {/* 🟢 NOVO MODAL DE HORÁRIOS */}
      {isScheduleModalVisible && (
        // 🟢 PASSA A CONFIGURAÇÃO DE HORÁRIO LIDA DO ADMIN
        <ScheduleModal
          scheduleConfig={storeOverride}
          onClose={() => setIsScheduleModalVisible(false)}
        />
      )}

      <header>
        <h1>Manú Lanches</h1>
        <p>Sua fome acaba aqui. Conheça nossos clássicos!</p>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        ></link>

        {carrinho.length > 0 && !mostraCheckout && !pedidoFinalizado && (
          <CartIcon
            count={totalItensCarrinho}
            onClick={handleToggleCarrinho}
            isStoreOpen={isStoreOpen} // 🔴 Passa o status para desabilitar o ícone
          />
        )}
      </header>

      {/* LISTA DE PRODUTOS */}
      {!mostraCheckout && !pedidoFinalizado && (
        <>
          {/* 🟢 MENU DE CATEGORIAS */}
          <nav className="cardapio-categorias" ref={categoriaNavRef}>
            {categorias && categorias.length > 0 ? (
              categorias.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={
                    categoriaSelecionada === cat.nome ? "categoria-ativa" : ""
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToCategoria(cat.nome);
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      inline: "center",
                      block: "nearest",
                    });
                  }}
                >
                  <span className="categoria-icon">
                    {getCategoryIcon(cat.nome)}
                  </span>
                  {cat.nome}
                </button>
              ))
            ) : (
              <p style={{ padding: "10px", opacity: 0.7 }}>
                Carregando categorias...
              </p>
            )}
          </nav>
          {/* 🟢 FIM MENU DE CATEGORIAS */}
          <main className="cardapio">
            {cardapioAgrupado.map((grupo) => (
              <section
                key={grupo.id}
                id={grupo.id}
                className="categoria-section"
              >
                <h2 className="categoria-titulo">{grupo.nome}</h2>

                {grupo.itens.length > 0 ? (
                  grupo.itens.map((item) => (
                    <div
                      key={item.id}
                      onClick={
                        isStoreOpen ? () => handleAddItemToCart(item) : null
                      }
                      style={{
                        cursor: isStoreOpen ? "pointer" : "not-allowed",
                        opacity: isStoreOpen ? 1 : 0.6,
                        display: "flex",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <CardapioItem
                        item={item}
                        onAdicionar={adicionarAoCarrinho}
                      />
                    </div>
                  ))
                ) : (
                  <p className="sem-itens-cardapio">
                    Nenhum item encontrado na categoria {grupo.nome}.
                  </p>
                )}
              </section>
            ))}
          </main>

          {/* CARRINHO */}
          {carrinho.length > 0 && mostraCarrinho && (
            <aside className="carrinho-container">
              <h2>Seu Carrinho</h2>
              <div className="carrinho-itens">
                {carrinho.map((item) => (
                  <div key={item.id} className="carrinho-item">
                    <div className="item-info-carrinho">
                      <span>{item.nome}</span>
                      <span>
                        {formatPrice(
                          // Se for Pizza (preço já inclui adicionais), não some os adicionais novamente
                          item.categoria === "Pizzas"
                            ? item.preco * item.quantidade
                            : item.preco * item.quantidade +
                                (item.adicionais
                                  ? item.adicionais.reduce(
                                      (acc, ad) =>
                                        acc +
                                        ad.preco *
                                          ad.quantidade *
                                          item.quantidade,
                                      0
                                    )
                                  : 0)
                        )}
                      </span>
                    </div>
                    <div className="carrinho-botoes">
                      <div className="quantidade-botoes-carrinho">
                        <button
                          className="btn btn-vermelho btn-circle"
                          onClick={() => diminuirQuantidade(item.id)}
                        >
                          <AiOutlineMinus size={20} />
                        </button>
                        <span>{item.quantidade}</span>
                        <button
                          className="btn btn-verde btn-circle"
                          onClick={() => aumentarQuantidade(item.id)}
                        >
                          <AiOutlinePlus size={20} />
                        </button>
                      </div>
                      <button
                        className="btn btn-vermelho btn-circle"
                        onClick={() => removerDoCarrinho(item.id)}
                      >
                        <AiOutlineDelete size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="carrinho-total">
                <h3>Total: {formatPrice(calcularTotal())}</h3>
                <button
                  className="btn btn-azul"
                  onClick={handleFinalizarPedido}
                  disabled={!isStoreOpen} // 🔴 DESABILITA o botão Finalizar Pedido
                  style={{ opacity: isStoreOpen ? 1 : 0.5 }}
                >
                  Finalizar Pedido
                </button>
                {/* 🔴 FEEDBACK VISUAL: Mensagem de loja fechada perto do botão principal */}
                {!isStoreOpen && (
                  <p style={{ color: "red", marginTop: "10px" }}>
                    Fechado para pedidos. Horário: 18:00h às 23:40h
                  </p>
                )}
              </div>
            </aside>
          )}
        </>
      )}

      {/* MODAL DETALHES */}
      {produtoSelecionado && isStoreOpen && (
        <div
          className="modal-overlay overlay"
          onClick={() => setProdutoSelecionado(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={produtoSelecionado.imagem}
              alt={produtoSelecionado.nome}
            />
            <h2>{produtoSelecionado.nome}</h2>
            <p>{produtoSelecionado.descricao}</p>
            <span className="preco">
              {formatPrice(produtoSelecionado.preco)}
            </span>

            {/* ADICIONAIS */}
            {produtoSelecionado.adicionais &&
              produtoSelecionado.adicionais.length > 0 && (
                <div className="adicionais-modal">
                  <h3>Adicionais:</h3>
                  {produtoSelecionado.adicionais.map((ad, index) => (
                    <div key={index} className="adicional-item">
                      <span>
                        {ad.nome} (+{formatPrice(ad.preco)})
                      </span>
                      <div className="adicional-quantidade">
                        <button
                          className="btn btn-vermelho btn-circle"
                          onClick={() => diminuirAdicional(ad)}
                        >
                          <AiOutlineMinus size={16} />
                        </button>
                        <span>
                          {adicionaisSelecionados[ad.nome]?.quantidade || 0}
                        </span>
                        <button
                          className="btn btn-verde btn-circle"
                          onClick={() => aumentarAdicional(ad)}
                        >
                          <AiOutlinePlus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* OBSERVAÇÕES */}
            <div className="observacoes">
              <h3>Observações:</h3>
              <textarea
                placeholder="Ex: sem salada, sem maionese..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            {/* CONTROLES DE QUANTIDADE DO PRODUTO */}
            <div className="quantidade-botoes">
              <div className="modal-actions-bar">
                <button
                  className="btn btn-vermelho btn-circle"
                  onClick={() =>
                    setQuantidadeProduto((prev) => Math.max(1, prev - 1))
                  }
                >
                  <AiOutlineMinus size={20} />
                </button>

                <span>{quantidadeProduto}</span>

                <button
                  className="btn btn-verde btn-circle"
                  onClick={() => setQuantidadeProduto((prev) => prev + 1)}
                >
                  <AiOutlinePlus size={20} />
                </button>

                <button
                  className="btn btn-azul"
                  onClick={() => {
                    adicionarAoCarrinho({
                      ...produtoSelecionado,
                      quantidade: quantidadeProduto,
                    });
                    setProdutoSelecionado(null); // fecha o modal
                  }}
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>

            {/* TOTAL */}
            <div className="total-item">
              Total:{" "}
              {formatPrice(
                (produtoSelecionado.preco +
                  Object.values(adicionaisSelecionados).reduce(
                    (acc, ad) => acc + ad.preco * ad.quantidade,
                    0
                  )) *
                  quantidadeProduto
              )}
            </div>

            <AiOutlineClose
              className="modal-close-icon"
              onClick={() => setProdutoSelecionado(null)}
            />
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 🟢 NOVO MODAL DE MONTAGEM DE PIZZA */}
      {/* ---------------------------------------------------- */}
      {isPizzaModalVisible && (
        <div className="modal-overlay overlay">
          <div
            className="modal-content modal-pizza"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Monte sua Pizza 🍕</h3>

            <div className="pizza-resumo">
              {/* Exibe o resumo dinâmico no topo */}
              <p>
                <span>Tamanho:</span>{" "}
                {pizzaConfig.tamanho ? pizzaConfig.tamanho.nome : "Aguardando"}
              </p>
              <p>
                <span>Sabores ({pizzaConfig.sabores.length}/2):</span>
                {pizzaConfig.sabores.length > 0
                  ? pizzaConfig.sabores.map((s) => s.nome).join(" / ")
                  : "Escolha seu(s) sabor(es)"}
              </p>
              <p className="preco-final">
                Total: {formatPrice(pizzaConfig.preco_final)}
              </p>
            </div>

            {/* Passo 1: Escolha do Tamanho */}
            <h4>1. Escolha o Tamanho:</h4>
            <div className="pizza-opcoes-tamanho">
              {PIZZA_TAMANHOS.map((tamanho) => (
                <button
                  key={tamanho.sigla}
                  onClick={() => handleSelectTamanho(tamanho)}
                  className={
                    pizzaConfig.tamanho?.sigla === tamanho.sigla
                      ? "selected"
                      : ""
                  }
                  btn
                >
                  {tamanho.nome} ({formatPrice(tamanho.base_preco)})
                </button>
              ))}
            </div>

            {/* Passo 2: Escolha dos Sabores */}
            {pizzaConfig.tamanho && (
              <>
                <h4>2. Escolha os Sabores (Máx. 2):</h4>
                <p className="info-meia-meia">
                  *O preço é ajustado pelo sabor de maior valor.
                </p>
                <div className="pizza-opcoes-sabores">
                  {PIZZA_SABORES.map((sabor) => {
                    const isSelected = pizzaConfig.sabores.some(
                      (s) => s.nome === sabor.nome
                    );
                    const isBlocked =
                      pizzaConfig.sabores.length === 2 && !isSelected;
                    const valorAdicional =
                      sabor.valor_referencia > 0
                        ? `(+${formatPrice(sabor.valor_referencia)})`
                        : "(Padrão)";

                    return (
                      <button
                        key={sabor.nome}
                        onClick={() => handleSelectSabor(sabor)}
                        disabled={isBlocked}
                        className={
                          isSelected ? "selected" : isBlocked ? "blocked" : ""
                        }
                      >
                        {sabor.nome} {valorAdicional}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* 🟢 NOVO: ADICIONAIS PARA PIZZA (Usando o basePizzaItem para lista) */}
            {basePizzaItem &&
              basePizzaItem.adicionais &&
              basePizzaItem.adicionais.length > 0 && (
                <div className="adicionais-modal">
                  <h3>Adicionais (Opcional):</h3>
                  {basePizzaItem.adicionais.map((ad, index) => (
                    <div key={index} className="adicional-item">
                      <span>
                        {ad.nome} (+{formatPrice(ad.preco)})
                      </span>
                      <div className="adicional-quantidade">
                        <button
                          className="btn btn-vermelho btn-circle"
                          onClick={() => diminuirAdicional(ad)}
                        >
                          <AiOutlineMinus size={16} />
                        </button>
                        <span>
                          {adicionaisSelecionados[ad.nome]?.quantidade || 0}
                        </span>
                        <button
                          className="btn btn-verde btn-circle"
                          onClick={() => aumentarAdicional(ad)}
                        >
                          <AiOutlinePlus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* 🟢 NOVO: OBSERVAÇÕES PARA PIZZA */}
            <div className="observacoes">
              <h3>Observações:</h3>
              <textarea
                placeholder="Ex: Sem cebola, massa crocante..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            {/* Botões de Ação */}
            <div className="modal-actions">
              <button
                onClick={() => setIsPizzaModalVisible(false)}
                className="cancel-button btn btn-vermelho"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPizzaToCart}
                disabled={
                  !pizzaConfig.tamanho || pizzaConfig.sabores.length === 0
                }
                className="add-to-cart-button btn btn-azul"
              >
                Adicionar ao Carrinho ({formatPrice(pizzaConfig.preco_final)})
              </button>
            </div>
            <AiOutlineClose
              className="modal-close-icon"
              onClick={() => setIsPizzaModalVisible(false)}
            />
          </div>
        </div>
      )}
      {/* ---------------------------------------------------- */}

      {/* CHECKOUT */}
      {mostraCheckout && (
        <div className="overlay">
          <div className="checkout-container">
            <MdOutlineArrowBackIosNew
              className="btn-voltar-checkout"
              onClick={() => {
                setMostraCheckout(false); // Fecha o checkout
                setMostraCarrinho(true); // Reabre o carrinho (se houver itens)
              }}
            />

            <h2>Finalizar Pedido</h2>
            <form onSubmit={handleCheckoutSubmit}>
              <label>
                <div className="icones-finalizar-pedido">
                  <AiOutlineUser />
                  Nome:
                </div>
                <input type="text" name="nome" required />
              </label>

              {/* --- NOVO CAMPO --- */}
              <label>
                <div className="icones-finalizar-pedido">
                  <BsPhone />
                  Telefone (DDD + números):
                </div>

                <input
                  type="tel"
                  name="telefone"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  pattern="[0-9]{11}"
                  title="Formato: 11987654321"
                  placeholder="92999999999"
                />
              </label>

              <label>
                <div className="icones-finalizar-pedido">
                  <CiDeliveryTruck size={18} />
                  Tipo de Serviço:
                </div>

                <select
                  name="servico"
                  required
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="entrega">Entrega</option>
                  <option value="retirada">Retirada</option>
                </select>
              </label>

              {servico === "entrega" && (
                <label>
                  Endereço de Entrega:
                  <input type="text" name="endereco" required />
                </label>
              )}

              <label>
                <div className="icones-finalizar-pedido">
                  <BsCashCoin />
                  Forma de Pagamento:
                </div>

                <select
                  name="pagamento"
                  required
                  value={pagamento}
                  onChange={(e) => setPagamento(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão de Crédito/Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </label>

              {pagamento === "dinheiro" && (
                <label>
                  Troco para:
                  <input type="number" name="troco" step="0.01" required />
                </label>
              )}

              <button
                type="submit"
                className="btn-confirmar-pedido btn btn-verde"
              >
                <AiOutlineCheck />
                Confirmar Pedido
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO */}
      {pedidoFinalizado && ultimoPedido && (
        <div className="overlay">
          <div className="confirmacao-container">
            <h2>Pedido Confirmado!</h2>
            <p>Obrigado por sua compra! Seu pedido será preparado em breve.</p>
            <div className="resumo-pedido">
              <h3>Resumo do Pedido:</h3>
              <ul>
                {ultimoPedido.itens.map((item) => (
                  <li key={item.id}>
                    <strong>
                      {item.nome} (x{item.quantidade})
                    </strong>{" "}
                    - {formatPrice(item.preco * item.quantidade)}
                    {/* Adicionais */}
                    {item.adicionais && item.adicionais.length > 0 && (
                      <ul className="adicionais-resumo">
                        {item.adicionais.map((ad, i) => (
                          <li key={i}>
                            {ad.nome} (x{ad.quantidade}) —{" "}
                            {formatPrice(ad.preco)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Observação */}
                    {item.observacao && <p>Observação: {item.observacao}</p>}
                  </li>
                ))}
              </ul>
              <div className="total-resumo">
                <strong>Total: {formatPrice(ultimoPedido.total)}</strong>
              </div>
            </div>
            <button
              onClick={handleNovoPedido}
              className="btn-new-pedido btn btn-azul"
            >
              <TbNews size={22} />
              Fazer um novo pedido
            </button>
          </div>
        </div>
      )}

      <footer>
        <p>&copy; 2025 Manú Lanches. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
