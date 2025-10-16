import React, { useEffect, useState } from "react";
import { AiOutlineDelete, AiOutlineEdit, AiOutlineCheck } from "react-icons/ai";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./Categorias.css";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editando, setEditando] = useState(null);
  const [valorEditado, setValorEditado] = useState("");

  // === Buscar categorias ===
  const fetchCategorias = async () => {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  };

  // === Adicionar categoria ===
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

  // === Excluir categoria ===
  const excluirCategoria = async (id) => {
    if (!window.confirm("Deseja excluir esta categoria?")) return;

    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    fetchCategorias();
  };

  // === Salvar edição ===
  const salvarEdicao = async (id) => {
    await fetch(`/api/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: valorEditado }),
    });
    setEditando(null);
    fetchCategorias();
  };

  // === Reordenar categorias (drag & drop) ===
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const reordered = Array.from(categorias);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Atualiza visualmente
    setCategorias(reordered);

    // Atualiza no banco (ordem = índice)
    for (let i = 0; i < reordered.length; i++) {
      const cat = reordered[i];
      await fetch(`/api/categorias/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: i + 1 }),
      });
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  return (
    <div className="painel-categorias">
      <h2>Gerenciar Categorias</h2>

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

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categorias">
          {(provided) => (
            <ul
              className="lista-categorias"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {categorias.map((cat, index) => (
                <Draggable
                  key={cat.id}
                  draggableId={cat.id.toString()}
                  index={index}
                >
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
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
                              className="btn-editar-categoria btn btn-circle btn-azul"
                              onClick={() => {
                                setEditando(cat.id);
                                setValorEditado(cat.nome);
                              }}
                            >
                              <AiOutlineEdit />
                            </button>
                            <button
                              className="btn-remover-categoria btn btn-circle btn-vermelho"
                              onClick={() => excluirCategoria(cat.id)}
                            >
                              <AiOutlineDelete />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default Categorias;
