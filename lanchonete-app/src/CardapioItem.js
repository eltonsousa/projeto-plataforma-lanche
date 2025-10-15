import React from "react";
import "./App.css";

import { formatPrice } from "./utils/format";
import { BsCart3 } from "react-icons/bs";

function CardapioItem({ item, onAdicionar }) {
  // 🟢 NOVO: Flag para identificar itens de pizza, que têm fluxo de compra customizado
  const isPizza = item.categoria === "Pizzas";

  return (
    <div className="cardapio-item pizza-only">
      <img src={item.imagem} alt={item.nome} />
      <div className="item-info">
        <h2>{item.nome}</h2>
        <p>{item.descricao}</p>

        {/* 🟢 NOVO: Só exibe o preço se NÃO for Pizza */}
        {!isPizza && <span className="preco">{formatPrice(item.preco)}</span>}
      </div>

      {/* 🟢 NOVO: Só exibe o botão Adicionar se NÃO for Pizza */}
      {!isPizza && (
        <button
          className="btn btn-verde"
          // 🚨 MUDANÇA AQUI: Recebe 'e' e impede a propagação
          onClick={(e) => {
            e.stopPropagation(); // Impede o clique de atingir o <div> pai
            onAdicionar({ ...item, quantidade: 1 }); // Adiciona com quantidade padrão 1
          }}
        >
          <BsCart3 size={14} /> Adicionar
        </button>
      )}
    </div>
  );
}

export default CardapioItem;
