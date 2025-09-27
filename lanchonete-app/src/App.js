import React, { useState, useEffect, useCallback } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import { BsCart3 } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";

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

// COMPONENTE: Ícone do carrinho
const CartIcon = ({ count, onClick }) => (
  <button className="carrinho-icon-btn" onClick={onClick}>
    <BsCart3 size={24} />
    {count > 0 && <span className="carrinho-count">{count}</span>}
  </button>
);

function App() {
  const sessionId = getSessionId();

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
  // 🟢 ATUALIZADA: Agora usa setCardapioLoading corretamente
  const fetchCardapio = useCallback(async () => {
    setCardapioLoading(true); // Inicia o carregamento
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
      setCardapioLoading(false); // Finaliza o carregamento
    }
  }, []); // Dependências vazias, já que não usa estados externos

  // --- EFEITOS ---
  useEffect(() => {
    fetchCardapio();
    loadCarrinhoFromSupabase();
    // Use cardapioLoading como dependência se precisar esperar o carregamento, mas
    // o useCallback() resolve o aviso de dependência.
    const intervalId = setInterval(fetchCardapio, 10000);
    return () => clearInterval(intervalId);
  }, [fetchCardapio, loadCarrinhoFromSupabase]);

  // Efeito para persistir carrinho no Supabase
  // ✅ MODIFICADO: Condição agora verifica cardapioLoading
  useEffect(() => {
    if (!cardapioLoading) saveCarrinhoToSupabase(carrinho);
    if (carrinho.length === 0) setMostraCarrinho(false);
  }, [carrinho, cardapioLoading, saveCarrinhoToSupabase]);

  // ❌ REMOVIDO: Efeito de carregamento inicial (agora controlado por cardapioLoading)
  /*
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500); // só libera depois de 0,5s
    return () => clearTimeout(timer);
  }, []);
  */

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
    carrinho
      .reduce((total, item) => total + item.preco * item.quantidade, 0)
      .toFixed(2);

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
      troco: pagamento === "dinheiro" ? formData.get("troco") : "",
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
            <nav className="cardapio-categorias">
              {/* Define as categorias e mapeia para botões */}
              {["Sanduíches", "Bebidas", "Fritas", "Comidas"].map((cat) => (
                <button
                  key={cat}
                  // Adiciona a classe 'categoria-ativa' se for a selecionada
                  className={
                    categoriaSelecionada === cat ? "categoria-ativa" : ""
                  }
                  // Ao clicar, atualiza o estado de filtro
                  onClick={() => setCategoriaSelecionada(cat)}
                >
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
                    <div className="item-info">
                      <p>{item.nome}</p>
                      <p>R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                    </div>
                    <div className="carrinho-botoes">
                      <div className="quantidade-botoes">
                        <button onClick={() => diminuirQuantidade(item.id)}>
                          -
                        </button>
                        <span>{item.quantidade}</span>
                        <button onClick={() => aumentarQuantidade(item.id)}>
                          +
                        </button>
                      </div>
                      <button
                        className="remover-item"
                        onClick={() => removerDoCarrinho(item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="carrinho-total">
                <h3>Total: R$ {calcularTotal()}</h3>
                <button
                  className="finalizar-pedido"
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
              R$ {produtoSelecionado.preco.toFixed(2)}
            </span>

            {carrinho.some((c) => c.id === produtoSelecionado.id) ? (
              <>
                <div className="quantidade-botoes">
                  <button
                    onClick={() => diminuirQuantidade(produtoSelecionado.id)}
                  >
                    -
                  </button>
                  <span>
                    {
                      carrinho.find((c) => c.id === produtoSelecionado.id)
                        ?.quantidade
                    }
                  </span>
                  <button
                    onClick={() => aumentarQuantidade(produtoSelecionado.id)}
                  >
                    +
                  </button>
                  <button
                    className="remover-item"
                    onClick={() => removerDoCarrinho(produtoSelecionado.id)}
                  >
                    Remover
                  </button>
                </div>
                <div className="total-item">
                  Total: R${" "}
                  {(
                    carrinho.find((c) => c.id === produtoSelecionado.id)
                      ?.quantidade * produtoSelecionado.preco
                  ).toFixed(2)}
                </div>
              </>
            ) : (
              <button
                className="add-carrinho"
                onClick={() => adicionarAoCarrinho(produtoSelecionado)}
              >
                Adicionar ao Carrinho
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
              Nome:
              <input type="text" name="nome" required />
            </label>

            {/* --- NOVO CAMPO --- */}
            <label>
              Telefone (com DDD, somente números):
              <input
                type="tel"
                name="telefone"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                pattern="[0-9]{11}"
                title="Formato: 11987654321"
              />
            </label>

            <label>
              Tipo de Serviço:
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
              Forma de Pagamento:
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

            <button type="submit" className="finalizar-pedido">
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
                  {item.nome} (x{item.quantidade}) - R${" "}
                  {(item.preco * item.quantidade).toFixed(2)}
                </li>
              ))}
            </ul>
            <div className="total-resumo">
              <strong>Total: R$ {ultimoPedido.total}</strong>
            </div>
          </div>
          <button onClick={handleNovoPedido} className="novo-pedido-btn">
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
