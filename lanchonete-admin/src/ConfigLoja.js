import React, { useEffect, useState } from "react";
import { getApiUrl } from "./utils/api";
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

  // Função para enviar imagem (logo ou favicon)
  const handleUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imagem", file);
    formData.append("originalFileName", file.name);

    try {
      const apiUrl = getApiUrl(); // ✅ usa a URL correta (localhost ou produção)
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.url) {
        setConfig((prev) => ({ ...prev, [fieldName]: data.url }));
      } else {
        alert("Falha ao enviar imagem");
        console.error("Erro no upload:", data);
      }
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      alert("Erro ao se conectar com o servidor.");
    }
  };

  return (
    <div className="config-loja-container">
      <h2>⚙️ Configurações da Loja</h2>
      {mensagem && <p className="mensagem">{mensagem}</p>}

      <form onSubmit={handleSalvar} className="config-form">
        <h3>Informações da Loja</h3>

        <label>
          Nome da Loja:
          <input
            type="text"
            value={config.nome}
            onChange={(e) => setConfig({ ...config, nome: e.target.value })}
          />
        </label>

        <label>
          Slogan / Descrição curta:
          <input
            type="text"
            value={config.slogan || ""}
            onChange={(e) => setConfig({ ...config, slogan: e.target.value })}
          />
        </label>

        <label>
          Slug (URL da loja):
          <input
            type="text"
            value={config.slug}
            onChange={(e) => setConfig({ ...config, slug: e.target.value })}
          />
        </label>

        <label>
          Telefone (WhatsApp):
          <input
            type="tel"
            value={config.telefone}
            onChange={(e) => setConfig({ ...config, telefone: e.target.value })}
          />
        </label>

        <h3>Endereço e Pagamento</h3>
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

        <h3>🎨 Personalização Visual</h3>

        <label>
          Cor Principal:
          <input
            type="color"
            value={config.cor_principal}
            onChange={(e) =>
              setConfig({ ...config, cor_principal: e.target.value })
            }
          />
        </label>

        <label>
          Cor Secundária:
          <input
            type="color"
            value={config.cor_secundaria}
            onChange={(e) =>
              setConfig({ ...config, cor_secundaria: e.target.value })
            }
          />
        </label>

        <label>
          Logo da Loja:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e, "logo_url")}
          />
        </label>
        {config.logo_url && (
          <img
            src={config.logo_url}
            alt="Logo da Loja"
            style={{ height: 50, marginTop: 8 }}
          />
        )}

        <label>
          Favicon:
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e, "favicon_url")}
          />
        </label>
        {config.favicon_url && (
          <img
            src={config.favicon_url}
            alt="Favicon"
            style={{ height: 24, marginTop: 8 }}
          />
        )}

        <button type="submit" className="btn btn-verde">
          💾 Salvar Configurações
        </button>
      </form>
    </div>
  );
}

export default ConfigLoja;
