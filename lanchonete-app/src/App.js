import React, { useState, useEffect, useCallback, useRef } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import "./styles/checkout.css";
import { formatPrice } from "./utils/format";

// --- Import de ìcones "react-icons/bs"
import { BsCart3, BsCashCoin, BsPhone } from "react-icons/bs";

// --- Importe iconesd "react-icons/ai"
import {
  AiOutlineMinus,
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineClose,
  AiOutlineCheck,
  AiOutlineUser,
} from "react-icons/ai";

import { CiDeliveryTruck } from "react-icons/ci";

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
const CartIcon = ({ count, onClick }) => (
  <button className="carrinho-icon-btn" onClick={onClick}>
    <BsCart3 size={24} />
    {count > 0 && <span className="carrinho-count">{count}</span>}
  </button>
);

function App() {
  const sessionId = getSessionId();

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
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Sanduíches");
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
      default:
        return "";
    }
  };

  // --- EFEITOS ---
  useEffect(() => {
    // primeira carga com spinner
    fetchCardapio(true);
    loadCarrinhoFromSupabase();

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
  const adicionarAoCarrinho = (item) => {
    const itemExistente = carrinho.find((c) => c.id === item.id);
    if (itemExistente) {
      setCarrinho(
        carrinho.map((c) =>
          c.id === item.id ? { ...c, quantidade: c.quantidade + 1 } : c
        )
      );
    } else {
      setCarrinho([...carrinho, { ...item, quantidade: 1 }]);
    }
  };

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
        total + parseFloat(item.preco) * parseInt(item.quantidade),
      0
    );

  const handleToggleCarrinho = () => {
    if (carrinho.length > 0) setMostraCarrinho(!mostraCarrinho);
  };

  const handleFinalizarPedido = () => {
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
      <header>
        <h1>Manú Lanches</h1>
        <p>Sua fome acaba aqui. Conheça nossos clássicos!</p>
        {carrinho.length > 0 && !mostraCheckout && !pedidoFinalizado && (
          <CartIcon count={totalItensCarrinho} onClick={handleToggleCarrinho} />
        )}
      </header>

      {/* LISTA DE PRODUTOS */}
      {!mostraCheckout && !pedidoFinalizado && (
        <>
          <main className="cardapio">
            {/* 🟢 Menu de Categorias */}
            <nav className="cardapio-categorias" ref={categoriaNavRef}>
              {/* Define as categorias e mapeia para botões */}
              {["Sanduíches", "Bebidas", "Fritas", "Comidas"].map((cat) => (
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
                      inline: "start", // Rola para o início do contêiner
                      block: "nearest", // Garante que o elemento esteja visível na vertical
                    });
                  }}
                >
                  <span className="categoria-icon">{getCategoryIcon(cat)}</span>
                  {cat}
                </button>
              ))}
            </nav>
            {/* 🟢 FIM: Menu de Categorias */}

            {/* 🟢 LISTA DE ITENS FILTRADOS (Agora sem a verificação cardapioLoading redundante) */}
            {cardapioFiltrado.length > 0 ? (
              // Mapeia a lista FILTRADA
              cardapioFiltrado.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setProdutoSelecionado(item)}
                  style={{
                    cursor: "pointer",
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
                      <span>{formatPrice(item.preco * item.quantidade)}</span>
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
                  className="btn btn-laranja"
                  onClick={handleFinalizarPedido}
                >
                  Finalizar Pedido
                </button>
              </div>
            </aside>
          )}
        </>
      )}

      {/* MODAL DETALHES */}
      {produtoSelecionado && (
        <div
          className="modal-overlay"
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

            {carrinho.some((c) => c.id === produtoSelecionado.id) ? (
              <>
                <div className="quantidade-botoes">
                  <div className="modal-actions-bar">
                    <button
                      className="btn btn-vermelho btn-circle"
                      onClick={() => diminuirQuantidade(produtoSelecionado.id)}
                    >
                      <AiOutlineMinus size={20} />
                    </button>
                    <span>
                      {
                        carrinho.find((c) => c.id === produtoSelecionado.id)
                          ?.quantidade
                      }
                    </span>
                    <button
                      className="btn btn-verde btn-circle"
                      onClick={() => aumentarQuantidade(produtoSelecionado.id)}
                    >
                      <AiOutlinePlus size={20} />
                    </button>
                    <button
                      className="btn btn-vermelho btn-circle"
                      onClick={() => removerDoCarrinho(produtoSelecionado.id)}
                    >
                      <AiOutlineDelete size={20} />
                    </button>
                  </div>
                </div>
                <div className="total-item">
                  Total:{" "}
                  {formatPrice(
                    carrinho.find((c) => c.id === produtoSelecionado.id)
                      ?.quantidade * produtoSelecionado.preco
                  )}
                </div>
              </>
            ) : (
              <button
                className="btn btn-verde"
                onClick={() => adicionarAoCarrinho(produtoSelecionado)}
              >
                <BsCart3 size={20} /> Adicionar ao Carrinho
              </button>
            )}
            <AiOutlineClose
              className="modal-close-icon"
              onClick={() => setProdutoSelecionado(null)}
            />
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {mostraCheckout && (
        <div className="checkout-container">
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
                Telefone (com DDD, somente números):
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
      )}

      {/* CONFIRMAÇÃO */}
      {pedidoFinalizado && ultimoPedido && (
        <div className="confirmacao-container">
          <h2>Pedido Confirmado!</h2>
          <p>Obrigado por sua compra! Seu pedido será preparado em breve.</p>
          <div className="resumo-pedido">
            <h3>Resumo do Pedido:</h3>
            <ul>
              {ultimoPedido.itens.map((item) => (
                <li key={item.id}>
                  {item.nome} (x{item.quantidade}) -{" "}
                  {formatPrice(item.preco * item.quantidade)}
                </li>
              ))}
            </ul>
            <div className="total-resumo">
              <strong>Total: {formatPrice(ultimoPedido.total)}</strong>
            </div>
          </div>
          <button onClick={handleNovoPedido} className="btn btn-laranja">
            Fazer um novo pedido
          </button>
        </div>
      )}

      <footer>
        <p>&copy; 2025 Manú Lanches. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
