import React from "react";
import "./App.css";

function CardapioItem({ item, onAdicionar }) {
  // Ajuste nos dados para garantir que sempre haja um preço formatado.
  const precoFormatado = item.preco ? item.preco.toFixed(2) : "0.00";

  return (
    <div className="cardapio-item">
      {/* 1. Imagem: Lado Esquerdo */}
      <img src={item.imagem} alt={item.nome} />

      {/* 2. Informações: Centro, flexível */}
      <div className="item-info">
        <h4>{item.nome}</h4>
        <p>{item.descricao}</p>
        <span className="preco">R$ {precoFormatado}</span>
      </div>

      {/* 3. Ações: Lado Direito, botão no final */}
      <div className="item-acoes">
        <button className="add-carrinho" onClick={() => onAdicionar(item)}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

export default CardapioItem;
