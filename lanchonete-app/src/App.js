import React, { useState, useEffect } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import { BsCart3 } from "react-icons/bs";

// --- FUNÇÕES DE PERSISTÊNCIA (NOVO) ---
// Função que garante um ID único para a sessão do carrinho no navegador
const getSessionId = () => {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    // Gera um ID único simples (UUID)
    sessionId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
};

// --- FUNÇÕES DE PERSISTÊNCIA (NOVO) FIM ---

// COMPONENTE: Ícone do carrinho no cabeçalho
const CartIcon = ({ count, onClick }) => (
  <button className="carrinho-icon-btn" onClick={onClick}>
    <BsCart3 size={24} />
    {count > 0 && <span className="carrinho-count">{count}</span>}
  </button>
);

function App() {
  const sessionId = getSessionId(); // Obtém o ID da sessão na inicialização

  const [carrinho, setCarrinho] = useState([]);
  const [mostraCheckout, setMostraCheckout] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [ultimoPedido, setUltimoPedido] = useState(null);
  const [itensCardapio, setItensCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostraCarrinho, setMostraCarrinho] = useState(false);

  // --- FUNÇÕES ASYNC DE CARRINHO (NOVO) ---

  // FUNÇÃO: Carrega o carrinho do Supabase via Backend
  const loadCarrinhoFromSupabase = async () => {
    try {
      // Busca os itens do carrinho usando a rota do Express/Backend
      const response = await fetch(`/api/carrinho/${sessionId}`);

      if (response.ok) {
        const itens = await response.json();
        if (itens && itens.length > 0) {
          setCarrinho(itens);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho do Supabase:", error);
    }
  };

  // FUNÇÃO: Salva o carrinho no Supabase via Backend
  const saveCarrinhoToSupabase = async (currentCarrinho) => {
    try {
      await fetch("/api/carrinho", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, itens: currentCarrinho }),
      });
    } catch (error) {
      console.error("Erro ao salvar carrinho no Supabase:", error);
    }
  };

  // --- EFEITOS ---

  // EFEITO 1: Carregar Cardápio e o Carrinho Persistido
  useEffect(() => {
    fetchCardapio();
    loadCarrinhoFromSupabase(); // Carrega o carrinho na inicialização

    const intervalId = setInterval(fetchCardapio, 10000);
    return () => clearInterval(intervalId);
  }, []); // Executa apenas uma vez no carregamento

  // EFEITO 2: Persistência (Salva no Supabase sempre que o carrinho muda)
  useEffect(() => {
    // Evita salvar no primeiro carregamento, onde o carrinho é []
    if (loading === false) {
      saveCarrinhoToSupabase(carrinho);
    }

    // Lógica para controle da exibição do ícone do carrinho
    if (carrinho.length === 0) {
      setMostraCarrinho(false);
    }
  }, [carrinho, loading, sessionId]);

  // --- RESTANTE DAS FUNÇÕES (ADICIONAR/REMOVER/CHECKOUT) ---

  const fetchCardapio = async () => {
    // ... (função fetchCardapio, sem alterações)
    try {
      const response = await fetch("/api/cardapio");
      if (!response.ok) {
        throw new Error("Erro ao buscar o cardápio");
      }
      const data = await response.json();
      setItensCardapio(data);
    } catch (error) {
      setError(error.message);
    } finally {
      // Definir loading como false AQUI é crucial para disparar o useEffect de salvar o carrinho
      setLoading(false);
    }
  };

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
    const novoCarrinho = carrinho.filter((item) => item.id !== itemId);
    setCarrinho(novoCarrinho);
  };

  const calcularTotal = () => {
    return carrinho
      .reduce((total, item) => total + item.preco * item.quantidade, 0)
      .toFixed(2);
  };

  const handleToggleCarrinho = () => {
    if (carrinho.length > 0) {
      setMostraCarrinho(!mostraCarrinho);
    }
  };

  const handleFinalizarPedido = () => {
    setMostraCheckout(true);
    setMostraCarrinho(false);
  };

  const handleCheckoutSubmit = async (event) => {
    event.preventDefault();
    // ... (resto da lógica de checkout)

    // ... (cria dadosDoPedido)
    const formData = new FormData(event.target);
    const cliente = {
      nome: formData.get("nome"),
      endereco: formData.get("endereco"),
      pagamento: formData.get("pagamento"),
    };

    const dadosDoPedido = {
      cliente,
      itens: carrinho,
      total: calcularTotal(),
      data: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosDoPedido),
      });

      if (response.ok) {
        alert("Pedido enviado com sucesso para a lanchonete!");
        setUltimoPedido({
          itens: carrinho,
          total: calcularTotal(),
        });
        setCarrinho([]);
        setMostraCheckout(false);
        setPedidoFinalizado(true);
        // 🟢 IMPORTANTE: Deleta o carrinho persistido após finalizar o pedido
        await saveCarrinhoToSupabase([]); // Salva um carrinho vazio no Supabase
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
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (error) {
    return <div className="error">Erro ao carregar o cardápio: {error}</div>;
  }

  const totalItensCarrinho = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );

  return (
    <div className="App">
      <header>
        <h1>Manú Lanches</h1>
        <p>Sua fome acaba aqui. Conheça nossos clássicos!</p>

        {/* ÍCONE DO CARRINHO */}
        {carrinho.length > 0 && !mostraCheckout && !pedidoFinalizado && (
          <CartIcon count={totalItensCarrinho} onClick={handleToggleCarrinho} />
        )}
      </header>

      {/* ... (Restante da renderização, sem alterações) ... */}
      {/* RENDERIZAÇÃO DO CARDÁPIO (PRINCIPAL) */}
      {!mostraCheckout && !pedidoFinalizado && (
        <>
          <main className="cardapio">
            {itensCardapio.map((item) => (
              <CardapioItem
                key={item.id}
                item={item}
                onAdicionar={adicionarAoCarrinho}
              />
            ))}
          </main>

          {/* RENDERIZAÇÃO DO CARRINHO LATERAL (ASIDE) */}
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

      {/* RENDERIZAÇÃO DO CHECKOUT */}
      {mostraCheckout && (
        <div className="checkout-container">
          <h2>Finalizar Pedido</h2>
          <form onSubmit={handleCheckoutSubmit}>
            <label>
              Nome:
              <input type="text" name="nome" required />
            </label>
            <label>
              Endereço de Entrega:
              <input type="text" name="endereco" required />
            </label>
            <label>
              Forma de Pagamento:
              <select name="pagamento" required>
                <option value="">Selecione...</option>
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito/Débito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </label>
            <button type="submit" className="finalizar-pedido">
              Confirmar Pedido
            </button>
          </form>
        </div>
      )}

      {/* RENDERIZAÇÃO DA CONFIRMAÇÃO */}
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
      {/* <footer>
        <p>&copy; 2025 Manú Lanches. Todos os direitos reservados.</p>
      </footer> */}
    </div>
  );
}

export default App;
