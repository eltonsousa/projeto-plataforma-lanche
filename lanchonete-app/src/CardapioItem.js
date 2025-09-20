import React from "react";
import "./App.css";

function CardapioItem({ item, onAdicionar }) {
  return (
    <div className="cardapio-item">
      <img src={item.imagem} alt={item.nome} />
      <div className="item-info">
        <h2>{item.nome}</h2>
        <p>{item.descricao}</p>
        <span className="preco">R$ {item.preco}</span>
      </div>
      <button
        className="add-carrinho"
        onClick={() => onAdicionar(item)} // 1. Chama a função onAdicionar
      >
        Adicionar
      </button>
    </div>
  );
}

export default CardapioItem;
