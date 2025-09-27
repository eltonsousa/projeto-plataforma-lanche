import React, { useState, useEffect, useCallback } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import { BsCart3 } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";

// URL base da API
const API_URL = "/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagamento, setPagamento] = useState("dinheiro"); // Estado para tipo de pagamento

  // Categoria selecionada para filtro
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("Todos");

  // =============================================================
  // FUNÇÕES MEMOIZADAS (useCallback)
  // =============================================================

  // 1. Atualizar o carrinho no servidor
  const updateCartOnServer = useCallback(
    async (itens) => {
      try {
        const response = await fetch(`${API_URL}/carrinho/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itens }),
        });
        if (!response.ok) {
          throw new Error("Falha ao salvar o carrinho no servidor.");
        }
      } catch (err) {
        console.error("Erro ao salvar carrinho:", err);
      }
    },
    [sessionId]
  );

  // 2. Buscar o cardápio
  const fetchMenu = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/cardapio`);
      if (!response.ok) {
        throw new Error("Falha ao carregar o cardápio.");
      }
      const data = await response.json();
      setItensCardapio(data);
    } catch (err) {
      console.error("Erro ao carregar cardápio:", err);
      setError("Não foi possível carregar o cardápio.");
    } finally {
      // O loading é encerrado no fetchCart para garantir que ambos tenham terminado
    }
  }, []); // Dependência vazia

  // 3. Buscar o carrinho
  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/carrinho/${sessionId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar o carrinho.");
      }
      const itens = await response.json();
      setCarrinho(itens || []);
    } catch (err) {
      console.error("Erro ao carregar carrinho:", err);
      setError("Não foi possível carregar seu carrinho.");
    } finally {
      setLoading(false); // Resetar loading após a carga inicial de dados
    }
  }, [sessionId]); // Depende apenas de sessionId

  // =============================================================
  // useEffects para Carga de Dados
  // =============================================================

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Adicionar item ao carrinho
  const handleAdicionarAoCarrinho = useCallback(
    (item) => {
      setCarrinho((carrinhoAtual) => {
        const itemExistente = carrinhoAtual.find((i) => i.id === item.id);
        let novoCarrinho;

        if (itemExistente) {
          novoCarrinho = carrinhoAtual.map((i) =>
            i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
          );
        } else {
          // Adiciona o item com quantidade 1
          novoCarrinho = [...carrinhoAtual, { ...item, quantidade: 1 }];
        }

        updateCartOnServer(novoCarrinho);
        return novoCarrinho;
      });
    },
    [updateCartOnServer]
  );

  // Remover item do carrinho ou diminuir quantidade
  const handleRemoverDoCarrinho = useCallback(
    (itemId) => {
      setCarrinho((carrinhoAtual) => {
        const itemExistente = carrinhoAtual.find((i) => i.id === itemId);
        let novoCarrinho;

        if (itemExistente && itemExistente.quantidade > 1) {
          novoCarrinho = carrinhoAtual.map((i) =>
            i.id === itemId ? { ...i, quantidade: i.quantidade - 1 } : i
          );
        } else {
          // Remove completamente se a quantidade for 1 ou menos
          novoCarrinho = carrinhoAtual.filter((i) => i.id !== itemId);
        }

        updateCartOnServer(novoCarrinho);
        return novoCarrinho;
      });
    },
    [updateCartOnServer]
  );

  // Abrir/Fechar Checkout
  const toggleCheckout = () => {
    setMostraCheckout((prev) => !prev);
  };

  // Processar o pedido
  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const cliente = {
      nome: formData.get("nome"),
      endereco: formData.get("endereco"),
      pagamento: formData.get("pagamento"),
      troco: formData.get("troco"),
      observacoes: formData.get("observacoes"),
    };

    const total = carrinho
      .reduce((acc, item) => acc + item.preco * item.quantidade, 0)
      .toFixed(2);

    const pedido = {
      sessionId,
      cliente,
      itens: carrinho,
      total,
      data: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_URL}/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      if (!response.ok) {
        throw new Error("Falha ao finalizar o pedido.");
      }

      setUltimoPedido(pedido);
      setPedidoFinalizado(true);
      setMostraCheckout(false);

      // Limpar o carrinho após a finalização
      setCarrinho([]);
      updateCartOnServer([]); // Limpa também no servidor
    } catch (err) {
      console.error("Erro ao finalizar pedido:", err);
      // Aqui você pode mostrar uma mensagem de erro para o usuário
    }
  };

  // Iniciar um novo pedido (retorna ao cardápio)
  const handleNovoPedido = () => {
    setPedidoFinalizado(false);
    setUltimoPedido(null);
    setLoading(true);
    fetchMenu(); // Garante que o cardápio seja recarregado se necessário
  };

  // Cálculos
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const valorTotal = carrinho
    .reduce((acc, item) => acc + item.preco * item.quantidade, 0)
    .toFixed(2);

  // Lógica para obter categorias únicas
  const categorias = [
    "Todos",
    ...new Set(itensCardapio.map((item) => item.categoria).filter(Boolean)),
  ];

  // Lógica para filtrar itens
  const itensFiltrados =
    categoriaSelecionada === "Todos"
      ? itensCardapio
      : itensCardapio.filter((item) => item.categoria === categoriaSelecionada);

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header>
          <h1>Manú Lanches</h1>
        </header>
        <main className="container error-message">
          <p>{error}</p>
        </main>
        <footer>
          <p>&copy; 2025 Manú Lanches. Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>Manú Lanches</h1>
        <p>Seu lanche rápido e delicioso!</p>
        {/* Ícone do carrinho: SÓ MOSTRA SE O CARDÁPIO CARREGOU E O PEDIDO NÃO FOI FINALIZADO */}
        {itensCardapio.length > 0 && !pedidoFinalizado && (
          <CartIcon count={totalItens} onClick={toggleCheckout} />
        )}
      </header>

      <main className="container">
        {/* CONFIRMAÇÃO (Apenas se o pedido foi finalizado) */}
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

        {/* Cardápio (Apenas se o pedido NÃO foi finalizado) */}
        {!pedidoFinalizado && (
          <section className="cardapio">
            <h2>Cardápio do Dia</h2>

            {/* BOTÕES DE FILTRO DE CATEGORIA */}
            <div className="categorias-botoes">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  className={`categoria-btn ${
                    categoria === categoriaSelecionada ? "active" : ""
                  }`}
                  onClick={() => setCategoriaSelecionada(categoria)}
                >
                  {categoria}
                </button>
              ))}
            </div>

            {itensCardapio.length === 0 ? (
              <p>Nenhum item disponível no momento.</p>
            ) : (
              <div className="cardapio-grid">
                {itensFiltrados.map(
                  (
                    item // USANDO ITENS FILTRADOS
                  ) => (
                    <CardapioItem
                      key={item.id}
                      item={item}
                      onAdicionar={handleAdicionarAoCarrinho}
                    />
                  )
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL DE CHECKOUT/CARRINHO */}
      {mostraCheckout && !pedidoFinalizado && (
        <div className="modal-overlay" onClick={toggleCheckout}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()} // Impede o fechamento ao clicar no conteúdo
          >
            <AiOutlineClose
              className="fechar-modal"
              onClick={toggleCheckout}
              size={24}
            />
            <h2>Seu Carrinho</h2>
            {carrinho.length === 0 ? (
              <p>O carrinho está vazio.</p>
            ) : (
              <>
                <ul className="carrinho-lista">
                  {carrinho.map((item) => (
                    <li key={item.id} className="carrinho-item">
                      <div className="item-detalhes">
                        <h4>{item.nome}</h4>
                        <span className="preco">
                          R$ {(item.preco * item.quantidade).toFixed(2)}
                        </span>
                      </div>
                      <div className="item-quantidade">
                        <button
                          className="qnt-btn"
                          onClick={() => handleRemoverDoCarrinho(item.id)}
                        >
                          -
                        </button>
                        <span>{item.quantidade}</span>
                        <button
                          className="qnt-btn"
                          onClick={() => handleAdicionarAoCarrinho(item)}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="carrinho-rodape">
                  <div className="total-valor">
                    <strong>Total:</strong>
                    <span className="preco-final">R$ {valorTotal}</span>
                  </div>

                  {/* Formulário de Checkout */}
                  <form
                    onSubmit={handleFinalizarPedido}
                    className="checkout-form"
                  >
                    <h3>Detalhes da Entrega</h3>
                    <label>
                      Nome:
                      <input type="text" name="nome" required />
                    </label>
                    <label>
                      Endereço (Rua, Número, Bairro, Cidade):
                      <input type="text" name="endereco" required />
                    </label>
                    <label>
                      Observações (Ex: Sem cebola, Ponto da carne):
                      <textarea name="observacoes" rows="2"></textarea>
                    </label>

                    <h3>Pagamento</h3>
                    <label>
                      Forma de Pagamento:
                      <select
                        name="pagamento"
                        value={pagamento}
                        onChange={(e) => setPagamento(e.target.value)}
                        required
                      >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="cartao">Cartão de Crédito/Débito</option>
                      </select>
                    </label>

                    {pagamento === "dinheiro" && (
                      <label>
                        Troco para:
                        <input
                          type="number"
                          name="troco"
                          step="0.01"
                          // 🟢 CORRIGIDO: Adicionado placeholder dinâmico e min para troco
                          placeholder={
                            parseFloat(valorTotal) > 0
                              ? `Ex: ${parseFloat(valorTotal) + 5}`
                              : "0.00"
                          }
                          min={valorTotal}
                          required
                        />
                      </label>
                    )}

                    <button type="submit" className="finalizar-pedido">
                      Confirmar Pedido (R$ {valorTotal})
                    </button>
                  </form>
                </div>
              </>
            )}
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
