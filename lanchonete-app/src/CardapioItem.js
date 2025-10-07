import React from "react";
import "./App.css";
import { formatPrice } from "./utils/format";
import { BsCart3 } from "react-icons/bs";

function CardapioItem({ item, onAdicionar }) {
  return (
    <div className="cardapio-item">
      <img src={item.imagem} alt={item.nome} />
      <div className="item-info">
        <h2>{item.nome}</h2>
        <p>{item.descricao}</p>
        <span className="preco">{formatPrice(item.preco)}</span>
      </div>
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
    </div>
  );
}

export default CardapioItem;
