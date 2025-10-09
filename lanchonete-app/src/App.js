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

/* Código antigo não usar!!! */
// 🟢 MODO DE DESENVOLVIMENTO/MANUTENÇÃO UTILIZANDO .ENV.LOCAL
// Se TRUE, a loja SEMPRE estará aberta, ignorando o horário.
// Mude para FALSE ao fazer o deploy para produção.
// LÊ DO ARQUIVO .env.local: (REACT_APP_FORCE_OPEN_DEV = true)
// const IS_DEV_OVERRIDE_ACTIVE = process.env.REACT_APP_FORCE_OPEN_DEV === "true";

// 🟢 DEBUG CRÍTICO: Verifique o valor lido no console
// console.log("Variável lida do .env:", process.env.REACT_APP_FORCE_OPEN_DEV);
// console.log(
//   "Status de Sobrescrita Ativo (TRUE esperado):",
//   IS_DEV_OVERRIDE_ACTIVE
// );
/* Código antigo não usar!!! */

// ----------------------------------------------------
// 🟢 NOVAS FUNÇÕES E CONFIGURAÇÕES DE HORÁRIO
// ----------------------------------------------------

// 1. CONFIGURAÇÃO DE HORÁRIO: 18:00h às 23:40h, todos os dias (0=Dom, 6=Sáb)
const BUSINESS_HOURS = {
  0: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  1: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  2: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  3: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  4: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  5: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
  6: {
    isOpen: true,
    startHour: 18,
    startMinute: 0,
    endHour: 23,
    endMinute: 40,
  },
};

// 2. LÓGICA DE VERIFICAÇÃO (Agora aceita um objeto de sobrescrita)
const checkIsStoreOpen = (overrideStatus = { isForcedOpen: false }) => {
  // 🟢 PRIORIDADE MÁXIMA: Se o painel de administração forçar a abertura, retorna TRUE.
  if (overrideStatus.isForcedOpen) {
    return true;
  }

  // Lógica de horário base (só é executada se não houver sobrescrita)
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  // ... (Restante da sua lógica de horário) ...
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const dayHours = BUSINESS_HOURS[currentDay];

  if (!dayHours || !dayHours.isOpen) {
    return false;
  }

  const openingTimeInMinutes = dayHours.startHour * 60 + dayHours.startMinute;
  const closingTimeInMinutes = dayHours.endHour * 60 + dayHours.endMinute;

  const isCurrentlyOpen =
    currentTimeInMinutes >= openingTimeInMinutes &&
    currentTimeInMinutes < closingTimeInMinutes;

  return isCurrentlyOpen;
};

// 3. CUSTOM HOOK PARA USAR O STATUS NO COMPONENTE (Agora busca status do servidor)
const useOperatingStatus = () => {
  // Estado para armazenar o status de abertura forçada lido do servidor
  const [storeOverride, setStoreOverride] = useState({
    isForcedOpen: false,
    isFetching: true,
  });

  const [isStoreOpen, setIsStoreOpen] = useState(
    checkIsStoreOpen({ isForcedOpen: false })
  );

  // Função para buscar o status no seu backend a cada 30 segundos
  const fetchOverrideStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/status");
      if (response.ok) {
        const data = await response.json();
        setStoreOverride({
          isForcedOpen: data.isForcedOpen,
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

  // Efeito 2: Recalcula o status de abertura quando a hora ou a sobrescrita muda
  useEffect(() => {
    const calculateStatus = () => {
      setIsStoreOpen(checkIsStoreOpen(storeOverride));
    };

    calculateStatus(); // Roda quando o storeOverride muda

    // Verifica a cada minuto (60000ms) para atualização em tempo real
    const intervalId = setInterval(calculateStatus, 60000);

    return () => clearInterval(intervalId);
  }, [storeOverride]);

  return isStoreOpen;
};

// 4. COMPONENTE INDICADOR DE STATUS (O FLAG)
const StatusIndicator = ({ isStoreOpen }) => {
  const text = isStoreOpen ? "Aberto" : "Fechado";

  // Usa BsShopWindow para ambos os estados
  const IconComponent = BsShopWindow;

  // Define a classe dinâmica com base no status (para a cor)
  const statusClass = isStoreOpen ? "aberta" : "fechada";

  return (
    <div className={`status-indicator ${statusClass}`}>
      {/* 🟢 ÍCONE E TEXTO AGORA SÃO FILHOS DIRETOS DO STATUS-INDICATOR */}
      <IconComponent size={12} />{" "}
      {/* Reduzi o size para 12px para caber melhor no font-size 0.7rem */}
      <span>{text}</span>
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

  const isStoreOpen = useOperatingStatus();

  // 🟢 REFERÊNCIA para o elemento de categorias (para o hook)
  const categoriaNavRef = useDraggableScroll();
  const [carrinho, setCarrinho] = useState([]);
  const [mostraCheckout, setMostraCheckout] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [ultimoPedido, setUltimoPedido] = useState(null);
  const [itensCardapio, setItensCardapio] = useState([]);
  // ❌ REMOVIDO: [loading, setLoading] para usar apenas cardapioLoading
  const [error, setError] = useState(null);
  const [mostraCarrinho, setMostraCarrinho] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeProduto, setQuantidadeProduto] = useState(1);
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Sanduíches");

  // Observação
  const [observacao, setObservacao] = useState("");

  // Adicionais com quantidade
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState({});

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

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find((c) => c.id === produto.id);

    if (itemExistente) {
      // Se o item já existir, apenas soma a quantidade
      setCarrinho(
        carrinho.map((c) =>
          c.id === produto.id
            ? {
                ...c,
                quantidade: c.quantidade + produto.quantidade,
                adicionais: [
                  ...(c.adicionais || []),
                  ...Object.values(adicionaisSelecionados),
                ],
                observacao: observacao
                  ? `${c.observacao || ""} ${observacao}`
                  : c.observacao,
              }
            : c
        )
      );
    } else {
      // Se for novo item, adiciona normalmente com a quantidade escolhida
      setCarrinho([
        ...carrinho,
        {
          ...produto,
          quantidade: produto.quantidade,
          adicionais: Object.values(adicionaisSelecionados),
          observacao,
        },
      ]);
    }

    // Limpa campos e fecha modal
    setAdicionaisSelecionados({});
    setObservacao("");
  };

  // 🟢 ESTADO USADO PARA CONTROLE DE CARREGAMENTO
  const [cardapioLoading, setCardapioLoading] = useState(true);

  const cardapioFiltrado = itensCardapio.filter(
    (item) => item.categoria === categoriaSelecionada
  );

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

  // 🟢 NOVO: Função para obter ícone baseado na categoria
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Sanduíches":
        return "🍔"; // Hambúrguer
      case "Bebidas":
        return "🥤"; // Copo de bebida
      case "Fritas":
        return "🍟"; // Batata Frita
      case "Comidas":
        return "🍝"; // Macarrão/Prato
      case "Pizzas":
        return "🍕";
      default:
        return "";
    }
  };

  // --- EFEITOS ---
  useEffect(() => {
    // primeira carga com spinner
    fetchCardapio(true);
    loadCarrinhoFromSupabase();

    // 🟢 NOVO: Tenta carregar o telefone do Local Storage
    const telefoneSalvo = localStorage.getItem("lanchonete_telefone");
    if (telefoneSalvo) {
      setTelefone(telefoneSalvo);
    }

    // atualizações periódicas em segundo plano (sem spinner)
    const intervalId = setInterval(() => fetchCardapio(false), 10000);
    return () => clearInterval(intervalId);
  }, [fetchCardapio, loadCarrinhoFromSupabase]);

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
    carrinho.reduce(
      (total, item) =>
        total +
        parseFloat(item.preco) * parseInt(item.quantidade) +
        (item.adicionais
          ? item.adicionais.reduce(
              (acc, ad) => acc + ad.preco * ad.quantidade * item.quantidade,
              0
            )
          : 0),
      0
    );

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

  return (
    <div className="App">
      {/* 🔴 NOVO: O FLAG de status no canto da tela */}
      <StatusIndicator isStoreOpen={isStoreOpen} />
      <header>
        <h1>Manú Lanches</h1>
        <p>Sua fome acaba aqui. Conheça nossos clássicos!</p>
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
          <main className="cardapio">
            {/* 🟢 Menu de Categorias */}
            <nav className="cardapio-categorias" ref={categoriaNavRef}>
              {/* Define as categorias e mapeia para botões */}
              {["Sanduíches", "Bebidas", "Fritas", "Comidas", "Pizzas"].map(
                (cat) => (
                  <button
                    key={cat}
                    className={
                      categoriaSelecionada === cat ? "categoria-ativa" : ""
                    }
                    // 🟢 ATUALIZAÇÃO: Adicionamos o evento 'e' para rolar o elemento
                    onClick={(e) => {
                      setCategoriaSelecionada(cat);

                      // 🟢 CRÍTICO: Rola o botão clicado para a esquerda (start) do contêiner
                      e.currentTarget.scrollIntoView({
                        behavior: "smooth", // Efeito de rolagem suave
                        inline: "center", // Rola para o início do contêiner
                        block: "nearest", // Garante que o elemento esteja visível na vertical
                      });
                    }}
                  >
                    <span className="categoria-icon">
                      {getCategoryIcon(cat)}
                    </span>
                    {cat}
                  </button>
                )
              )}
            </nav>
            {/* 🟢 FIM: Menu de Categorias */}

            {/* 🟢 LISTA DE ITENS FILTRADOS (Agora sem a verificação cardapioLoading redundante) */}
            {cardapioFiltrado.length > 0 ? (
              // Mapeia a lista FILTRADA
              cardapioFiltrado.map((item) => (
                <div
                  key={item.id}
                  // 🔴 ATUALIZADO: Só permite abrir o modal se a loja estiver aberta
                  onClick={
                    isStoreOpen
                      ? () => {
                          setProdutoSelecionado(item);
                          setQuantidadeProduto(1);
                          setAdicionaisSelecionados({});
                          setObservacao("");
                        }
                      : null
                  }
                  style={{
                    cursor: isStoreOpen ? "pointer" : "not-allowed", // 🔴 Muda o cursor
                    opacity: isStoreOpen ? 1 : 0.6, // 🔴 Efeito visual de desabilitado
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <CardapioItem item={item} onAdicionar={adicionarAoCarrinho} />
                </div>
              ))
            ) : (
              // Mensagem quando não há itens na categoria
              <p className="sem-itens-cardapio">
                Nenhum item encontrado na categoria {categoriaSelecionada}.
              </p>
            )}
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
                          item.preco * item.quantidade +
                            (item.adicionais
                              ? item.adicionais.reduce(
                                  (acc, ad) => acc + ad.preco * item.quantidade,
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
