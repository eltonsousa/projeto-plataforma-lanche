import React, { useState, useEffect, useCallback } from "react";
import CardapioItem from "./CardapioItem";
import "./App.css";
import { BsCart3 } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";

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
  // 🟢 NOVO: estado do modal
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  // --- FUNÇÕES ASYNC DE CARRINHO (CORRIGIDO) ---

  // FUNÇÃO: Carrega o carrinho do Supabase via Backend
  const loadCarrinhoFromSupabase = useCallback(async () => {
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
  }, [sessionId]);

  // FUNÇÃO: Salva o carrinho no Supabase via Backend
  const saveCarrinhoToSupabase = useCallback(
    async (currentCarrinho) => {
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
    },
    [sessionId]
  );

  // --- EFEITOS (CORRIGIDO) ---

  // EFEITO 1: Carregar Cardápio e o Carrinho Persistido
  useEffect(() => {
    fetchCardapio();
    loadCarrinhoFromSupabase(); // Carrega o carrinho na inicialização

    const intervalId = setInterval(fetchCardapio, 10000);
    return () => clearInterval(intervalId);
  }, [loadCarrinhoFromSupabase]); // Dependência adicionada

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
  }, [carrinho, loading, sessionId, saveCarrinhoToSupabase]); // Dependência adicionada

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
      // 🟢 NOVO: Adiciona a opção de entrega/retirada
      servico: formData.get("servico"),
      // 🟢 NOVO: O endereço agora é opcional
      endereco: formData.get("endereco") || "",
      pagamento: formData.get("pagamento"),
      troco: formData.get("troco") || "",
    };

    const dadosDoPedido = {
      cliente,
      itens: carrinho,
      total: calcularTotal(),
      data: new Date().toISOString(),
    };

    // 🟢 NOVO: Lógica para montar a mensagem do WhatsApp
    let mensagem = `Olá, *${cliente.nome}*!\n\n`; // Use \n para quebras de linha no código
    mensagem += `*Novo Pedido Recebido!*\n\n`;
    mensagem += `*Itens do Pedido:*\n`;
    carrinho.forEach((item) => {
      mensagem += `- ${item.nome} (x${item.quantidade}) - R$ ${(
        item.preco * item.quantidade
      ).toFixed(2)}\n`;
    });
    mensagem += `\n`;
    mensagem += `*Total:* R$ ${calcularTotal()}\n`;

    // Adiciona a informação de serviço e endereço, se for o caso
    mensagem += `*Serviço:* ${
      cliente.servico === "entrega" ? "Entrega" : "Retirada"
    }\n`;
    if (cliente.servico === "entrega") {
      mensagem += `*Endereço:* ${cliente.endereco}\n`;
    }
    mensagem += `*Pagamento:* ${cliente.pagamento}\n\n`;

    // Adiciona informações de pagamento baseadas na escolha do cliente
    if (cliente.pagamento === "pix") {
      const chavePix = "73064335200";
      mensagem += `*Informação para Pagamento com PIX:*\n`;
      mensagem += `*Chave PIX:* ${chavePix}\n`;
      mensagem += `*Nome: Manú Lanches*\n\n`;
      mensagem += `_Aguardando a confirmação do seu pagamento!_`;
    } else if (cliente.pagamento === "dinheiro") {
      if (cliente.troco) {
        mensagem += `*Observação:* Troco para R$ ${parseFloat(
          cliente.troco
        ).toFixed(2)}\n\n`;
      }
      if (cliente.servico === "entrega") {
        mensagem += `Aguarde a entrega! Tenha o valor do pedido em mãos.`;
      } else {
        mensagem += `Aguarde a retirada! Tenha o valor do pedido em mãos.`;
      }
    } else {
      // Cartão
      if (cliente.servico === "entrega") {
        mensagem += `Aguarde a entrega! Tenha seu cartão em mãos.`;
      } else {
        mensagem += `Aguarde a retirada! Tenha seu cartão em mãos.`;
      }
    }

    // Se for retirada, adiciona o link para a localização
    if (cliente.servico === "retirada") {
      const linkLocalizacao = "https://goo.gl/maps/sua-localizacao";
      mensagem += `\n\n*Local para Retirada:* ${linkLocalizacao}`;
    }

    const numeroWhatsApp = "5592993312208";
    // O encodeURIComponent é a função que fará a conversão para %0A, etc.
    const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
      mensagem
    )}`;

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosDoPedido),
      });

      if (response.ok) {
        // 🟢 NOVO: Abre o WhatsApp
        window.open(whatsappUrl, "_blank");

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

      {/* LISTA DE PRODUTOS */}
      {!mostraCheckout && !pedidoFinalizado && (
        <>
          <main className="cardapio">
            {itensCardapio.map((item) => (
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

      {/* 🟢 NOVO: MODAL DE DETALHES */}
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

            {/* Se o item já está no carrinho, mostra controles */}
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

                {/* 🟢 Novo: total parcial do item */}
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

      {/* RENDERIZAÇÃO DO CHECKOUT */}
      {mostraCheckout && (
        <div className="checkout-container">
          <h2>Finalizar Pedido</h2>
          <form onSubmit={handleCheckoutSubmit}>
            <label>
              Nome:
              <input type="text" name="nome" required />
            </label>

            {/* 🟢 NOVO: Campo para escolher Entrega ou Retirada */}
            <label>
              Tipo de Serviço:
              <select
                name="servico"
                required
                // 🟢 NOVO: Lógica para mostrar/esconder campos
                onChange={(e) => {
                  const servicoEscolhido = e.target.value;
                  const enderecoField = document.querySelector(
                    'input[name="endereco"]'
                  );

                  // Lógica para mostrar/esconder o campo de endereço
                  if (enderecoField) {
                    enderecoField.style.display =
                      servicoEscolhido === "entrega" ? "block" : "none";
                    enderecoField.required = servicoEscolhido === "entrega";
                  }
                }}
              >
                <option value="">Selecione...</option>
                <option value="entrega">Entrega</option>
                <option value="retirada">Retirada</option>
              </select>
            </label>

            {/* 🟢 NOVO: Campo de endereço, inicialmente oculto */}
            <label style={{ display: "none" }}>
              Endereço de Entrega:
              <input type="text" name="endereco" />
            </label>

            <label>
              Forma de Pagamento:
              <select
                name="pagamento"
                required
                onChange={(e) => {
                  const formaPagamento = e.target.value;
                  const trocoField = document.querySelector(
                    'input[name="troco"]'
                  );
                  if (trocoField) {
                    trocoField.style.display =
                      formaPagamento === "dinheiro" ? "block" : "none";
                    trocoField.required = formaPagamento === "dinheiro";
                  }
                }}
              >
                <option value="">Selecione...</option>
                <option value="pix">PIX</option>
                <option value="cartao">Cartão de Crédito/Débito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </label>

            <label style={{ display: "none" }}>
              Troco para:
              <input type="number" name="troco" step="0.01" />
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
      <footer>
        <p>&copy; 2025 Manú Lanches. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default App;
