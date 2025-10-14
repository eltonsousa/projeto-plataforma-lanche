import React, { useEffect, useState } from "react";
import { AiOutlineDelete, AiOutlineEdit, AiOutlineCheck } from "react-icons/ai";
import "./Categorias.css";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editando, setEditando] = useState(null);
  const [valorEditado, setValorEditado] = useState("");

  // Buscar categorias
  const fetchCategorias = async () => {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  };

  // Adicionar categoria
  const adicionarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return alert("Informe o nome da categoria.");

    await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novaCategoria }),
    });

    setNovaCategoria("");
    fetchCategorias();
  };

  // Excluir categoria
  const excluirCategoria = async (id) => {
    if (!window.confirm("Deseja excluir esta categoria?")) return;

    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    fetchCategorias();
  };

  // Salvar edição
  const salvarEdicao = async (id) => {
    await fetch(`/api/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: valorEditado }),
    });
    setEditando(null);
    fetchCategorias();
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  return (
    <div className="painel-categorias">
      <h2>Gerenciar Categorias</h2>

      <div className="config-card">
        <form onSubmit={adicionarCategoria} className="form-categorias">
          <input
            type="text"
            placeholder="Nova categoria..."
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
          />
          <button className="btn-add-categoria btn btn-verde" type="submit">
            Adicionar
          </button>
        </form>

        <ul className="lista-categorias">
          {categorias.map((cat) => (
            <li key={cat.id}>
              {editando === cat.id ? (
                <>
                  <input
                    value={valorEditado}
                    onChange={(e) => setValorEditado(e.target.value)}
                  />
                  <button
                    className="btn btn-verde"
                    onClick={() => salvarEdicao(cat.id)}
                  >
                    <AiOutlineCheck />
                  </button>
                </>
              ) : (
                <>
                  <span>{cat.nome}</span>
                  <div className="acoes">
                    <button
                      className="btn-editar-categoria btn btn-azul"
                      onClick={() => {
                        setEditando(cat.id);
                        setValorEditado(cat.nome);
                      }}
                    >
                      <AiOutlineEdit />
                    </button>
                    <button
                      className="btn-remover-categoria btn btn-vermelho"
                      onClick={() => excluirCategoria(cat.id)}
                    >
                      <AiOutlineDelete />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Categorias;
