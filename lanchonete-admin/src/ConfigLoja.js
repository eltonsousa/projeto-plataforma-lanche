import React, { useEffect, useState } from "react";
import "./styles/ConfigLoja.css";

function ConfigLoja() {
  const [config, setConfig] = useState({
    chave_pix: "",
    endereco_loja: "",
    link_localizacao: "",
  });
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);

  // === Buscar configuração da loja ===
  useEffect(() => {
    const lojaId = localStorage.getItem("lojaId");
    if (!lojaId) {
      setMensagem("❌ Sessão expirada. Faça login novamente.");
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/configuracoes-loja?loja_id=${lojaId}`);
        if (!res.ok) throw new Error("Erro ao carregar configuração da loja");
        const data = await res.json();
        if (data) {
          setConfig(data);
        } else {
          setMensagem("Nenhuma configuração encontrada.");
        }
      } catch (err) {
        console.error("Erro ao buscar configuração da loja:", err);
        setMensagem("Erro ao carregar configurações da loja.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // === Atualizar configuração ===
  const handleSalvar = async (e) => {
    e.preventDefault();
    const lojaId = localStorage.getItem("lojaId");
    if (!lojaId) {
      setMensagem("❌ Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      const res = await fetch("/api/configuracoes-loja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, loja_id: lojaId }),
      });

      if (!res.ok) throw new Error("Falha ao salvar configurações.");
      setMensagem("✅ Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      setMensagem("❌ Erro ao salvar configurações.");
    }
  };

  if (loading) return <p>Carregando configurações...</p>;

  return (
    <div className="config-loja-container">
      <h2>⚙️ Configurações da Loja</h2>
      {mensagem && <p className="mensagem">{mensagem}</p>}

      <form onSubmit={handleSalvar} className="config-form">
        <label>
          Chave PIX:
          <input
            type="text"
            value={config.chave_pix}
            onChange={(e) =>
              setConfig({ ...config, chave_pix: e.target.value })
            }
          />
        </label>

        <label>
          Endereço da Loja:
          <input
            type="text"
            value={config.endereco_loja}
            onChange={(e) =>
              setConfig({ ...config, endereco_loja: e.target.value })
            }
          />
        </label>

        <label>
          Link da Localização:
          <input
            type="text"
            value={config.link_localizacao}
            onChange={(e) =>
              setConfig({ ...config, link_localizacao: e.target.value })
            }
          />
        </label>

        <button type="submit" className="btn btn-verde">
          💾 Salvar Configurações
        </button>
      </form>
    </div>
  );
}

export default ConfigLoja;
