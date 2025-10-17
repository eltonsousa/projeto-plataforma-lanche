import React, { useEffect, useState } from "react";
import "./styles/ConfigLoja.css";

function ConfigLoja() {
  const [config, setConfig] = useState({
    chave_pix: "",
    endereco_loja: "",
    link_localizacao: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // 🔑 Função utilitária para obter o token
  const getToken = () => {
    return localStorage.getItem("adminToken");
  };

  // 🟢 Carregar configurações atuais do Supabase
  useEffect(() => {
    const fetchConfig = async () => {
      const token = getToken();
      if (!token) {
        setMensagem("❌ Sessão expirada. Faça login novamente.");
        return;
      }

      try {
        const res = await fetch("/api/configuracoes", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // 🔑 ANEXA O TOKEN AQUI
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          // Se o servidor retornar 401/403, a sessão está inválida
          if (res.status === 401 || res.status === 403) {
            throw new Error("Acesso negado. Token inválido/expirado.");
          }
          throw new Error("Falha ao buscar configurações.");
        }
        const data = await res.json();

        if (data) {
          setConfig({
            chave_pix: data.chave_pix || "",
            endereco_loja: data.endereco_loja || "",
            link_localizacao: data.link_localizacao || "",
          });
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
        setMensagem("❌ Erro ao carregar configurações.");
      }
    };
    fetchConfig();
  }, []);

  // 🟢 Salvar alterações no Supabase
  const salvarConfig = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem("");

    const token = getToken();
    if (!token) {
      setMensagem("❌ Sessão expirada. Faça login novamente.");
      setSalvando(false);
      return;
    }

    try {
      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`, // 🔑 ANEXA O TOKEN AQUI
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Acesso negado. Token inválido/expirado.");
        }
        throw new Error("Falha ao salvar alterações.");
      }
      setMensagem("✅ Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      setMensagem(`❌ Erro ao salvar configurações: ${err.message}`);
    } finally {
      setSalvando(false);
      setTimeout(() => setMensagem(""), 4000);
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

      {mensagem && (
        <p
          style={{
            color: mensagem.includes("Erro") ? "#e74c3c" : "#27ae60",
            marginTop: "10px",
          }}
        >
          {mensagem}
        </p>
      )}
    </div>
  );
}

export default ConfigLoja;
