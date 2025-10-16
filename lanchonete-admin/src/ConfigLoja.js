import React, { useEffect, useState } from "react";
import "./styles/ConfigLoja.css";

function ConfigLoja() {
  const [config, setConfig] = useState({
    chave_pix: "",
    endereco_loja: "",
    link_localizacao: "",
  });
  const [salvando, setSalvando] = useState(false);
  const lojaId = "loja_padrao"; // Pode ser dinâmico futuramente

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/configuracoes/${lojaId}`);
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    };
    fetchConfig();
  }, []);

  const salvarConfig = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await fetch(`/api/configuracoes/${lojaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="config-loja-container">
      <h2>Configurações da Loja 🏪</h2>
      <form onSubmit={salvarConfig}>
        <label>
          <span>Chave PIX:</span>
          <input
            type="text"
            value={config.chave_pix}
            onChange={(e) =>
              setConfig({ ...config, chave_pix: e.target.value })
            }
            placeholder="Ex: 000.111.222-33"
            required
          />
        </label>

        <label>
          <span>Endereço:</span>
          <input
            type="text"
            value={config.endereco_loja}
            onChange={(e) =>
              setConfig({ ...config, endereco_loja: e.target.value })
            }
            placeholder="Rua, número, cidade..."
            required
          />
        </label>

        <label>
          <span>Link da Localização (Google Maps):</span>
          <input
            type="url"
            value={config.link_localizacao}
            onChange={(e) =>
              setConfig({ ...config, link_localizacao: e.target.value })
            }
            placeholder="https://maps.google.com/?q=-23.55,-46.63"
            required
          />
        </label>

        <button type="submit" className="btn btn-verde" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </form>
    </div>
  );
}

export default ConfigLoja;
