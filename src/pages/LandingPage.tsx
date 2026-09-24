import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";

const NETWORKS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
] as const;

type FormState = {
  nome_completo: string;
  email: string;
  whatsapp: string;
  nome_conta: string;
  redes_sociais: string[];
};

const INITIAL: FormState = {
  nome_completo: "",
  email: "",
  whatsapp: "",
  nome_conta: "",
  redes_sociais: [],
};

function Marquee({ items }: { items: string[] }) {
  const sequence = [...items, ...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span>
          {sequence.map((item, index) => (
            <em key={`${item}-${index}`}>{item}</em>
          ))}
        </span>
        <span>
          {sequence.map((item, index) => (
            <em key={`dup-${item}-${index}`}>{item}</em>
          ))}
        </span>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleNetwork(id: string) {
    setForm((prev) => {
      const exists = prev.redes_sociais.includes(id);
      return {
        ...prev,
        redes_sociais: exists
          ? prev.redes_sociais.filter((item) => item !== id)
          : [...prev.redes_sociais, id],
      };
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Falha ao enviar");
      }

      navigate("/sucesso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing">
      <Marquee
        items={["ALL IN", "EMBAIXADORES", "ACORDE SUA MENTE", "NO DOUBT"]}
      />

      <header className="landing__nav">
        <img
          src="/brand/logo.png"
          alt="Embaixadores — Acorde sua mente"
          className="landing__logo"
        />
        <Link to="/admin" className="landing__admin-link">
          Área admin
        </Link>
      </header>

      <section className="hero">
        <div className="hero__atmosphere" aria-hidden="true" />
        <div className="hero__rail" aria-hidden="true">
          <span>FOCUS</span>
          <span>ENERGY</span>
          <span>DISCIPLINE</span>
          <span>VICTORY</span>
        </div>

        <div className="hero__copy">
          <p className="hero__eyebrow">Programa Embaixadores da Corda</p>
          <h1 className="hero__title">
            <span className="hero__title-ghost">MATCH</span>
            <span className="hero__title-main">EMBAIXA</span>
            <span className="hero__title-accent">DORES</span>
          </h1>
          <p className="hero__lead">
            Entre pro time. Preencha seus dados, escolha suas redes e aguarde a
            aprovação do perfil.
          </p>
          <a className="btn btn--lime" href="#candidatura">
            Quero ser embaixador
          </a>
        </div>

        <div className="hero__mark" aria-hidden="true">
          <img src="/brand/icone.png" alt="" />
        </div>
      </section>

      <Marquee items={["INSTAGRAM", "TIKTOK", "COMUNIDADE", "PERFORMANCE"]} />

      <section className="apply" id="candidatura">
        <div className="apply__intro">
          <p className="apply__kicker">Candidatura</p>
          <h2 className="apply__title">
            Preencha.
            <br />
            <span>Entre no jogo.</span>
          </h2>
          <p className="apply__text">
            Seleção múltipla de redes — você pode marcar Instagram e TikTok ao
            mesmo tempo.
          </p>
        </div>

        <form className="apply__form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="nome_completo">
              Nome completo <span>*</span>
            </label>
            <input
              id="nome_completo"
              name="nome_completo"
              autoComplete="name"
              placeholder="Seu nome"
              required
              value={form.nome_completo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nome_completo: e.target.value }))
              }
            />
          </div>

          <div className="field">
            <label htmlFor="email">
              E-mail <span>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          <div className="field">
            <label htmlFor="whatsapp">
              WhatsApp <span>*</span>
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              required
              value={form.whatsapp}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, whatsapp: e.target.value }))
              }
            />
          </div>

          <div className="field">
            <label htmlFor="nome_conta">
              Nome da conta <span>*</span>
            </label>
            <input
              id="nome_conta"
              name="nome_conta"
              placeholder="@seuusuario"
              required
              value={form.nome_conta}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nome_conta: e.target.value }))
              }
            />
          </div>

          <fieldset className="field apply__networks">
            <legend>
              Rede social <span>*</span>
            </legend>
            <div className="check-grid">
              {NETWORKS.map((network) => (
                <label className="check" key={network.id}>
                  <input
                    type="checkbox"
                    checked={form.redes_sociais.includes(network.id)}
                    onChange={() => toggleNetwork(network.id)}
                  />
                  <span>{network.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="btn btn--lime" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar candidatura"}
          </button>
        </form>
      </section>

      <footer className="landing__footer">
        <img src="/brand/logo.png" alt="" />
        <p>Embaixadores da Corda · Acorde sua mente</p>
      </footer>
    </div>
  );
}
