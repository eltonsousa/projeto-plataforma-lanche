import React from "react";
import "./App.css";
import { BsCart3 } from "react-icons/bs";

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
        className="btn btn-verde"
        onClick={() => onAdicionar(item)} // 1. Chama a função onAdicionar
      >
        <BsCart3 size={14} /> Adicionar
      </button>
    </div>
  );
}

export default CardapioItem;
