import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import "./AdminPage.css";

type ApplicationStatus = "pending" | "approved" | "rejected";

type Application = {
  id: string;
  nome_completo: string;
  email: string;
  whatsapp: string;
  nome_conta: string;
  redes_sociais: string[];
  status: ApplicationStatus;
  created_at: string;
};

const TOKEN_KEY = "embaixadores_admin_token";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return value;
}

function formatHandle(value: string) {
  const clean = value.replace(/^@+/, "").trim();
  return clean ? `@${clean}` : value;
}

function instagramUrl(value: string) {
  const clean = value.replace(/^@+/, "").trim();
  return clean ? `https://instagram.com/${encodeURIComponent(clean)}` : "#";
}

function tiktokUrl(value: string) {
  const clean = value.replace(/^@+/, "").trim();
  return clean ? `https://www.tiktok.com/@${encodeURIComponent(clean)}` : "#";
}

function accountLinks(nomeConta: string) {
  const links: { label: string; href: string }[] = [];
  const instagram = nomeConta.match(/Instagram\s+(@?\S+)/i)?.[1];
  const tiktok = nomeConta.match(/TikTok\s+(@?\S+)/i)?.[1];

  if (instagram) {
    links.push({
      label: `Instagram ${formatHandle(instagram)}`,
      href: instagramUrl(instagram),
    });
  }
  if (tiktok) {
    links.push({
      label: `TikTok ${formatHandle(tiktok)}`,
      href: tiktokUrl(tiktok),
    });
  }
  if (links.length === 0 && nomeConta.trim()) {
    links.push({
      label: formatHandle(nomeConta),
      href: instagramUrl(nomeConta),
    });
  }
  return links;
}

export function AdminPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((item) => item.status === filter);
  }, [applications, filter]);

  const counts = useMemo(() => {
    return applications.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }, [applications]);

  async function loadApplications(authToken: string) {
    setLoading(true);
    setListError("");
    try {
      const response = await fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const payload = (await response.json()) as {
        applications?: Application[];
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken("");
        }
        throw new Error(payload.error || "Falha ao carregar");
      }

      setApplications(payload.applications ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      void loadApplications(token);
    }
  }, [token]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoggingIn(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as {
        token?: string;
        error?: string;
      };

      if (!response.ok || !payload.token) {
        throw new Error(payload.error || "Senha incorreta");
      }

      sessionStorage.setItem(TOKEN_KEY, payload.token);
      setToken(payload.token);
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoggingIn(false);
    }
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as {
        application?: Application;
        error?: string;
      };

      if (!response.ok || !payload.application) {
        throw new Error(payload.error || "Falha ao atualizar");
      }

      setApplications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...payload.application } : item,
        ),
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setUpdatingId(null);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setApplications([]);
  }

  if (!token) {
    return (
      <main className="admin-login">
        <form className="admin-login__panel" onSubmit={onLogin}>
          <img src="/brand/iam-logo.png" alt="iAM" className="admin-login__logo" />
          <p className="admin-login__kicker">Administração</p>
          <h1>Entrar</h1>
          <p className="admin-login__hint">
            Acesse para aprovar ou rejeitar candidaturas.
          </p>
          <div className="admin-field">
            <label htmlFor="admin-password">Senha</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {loginError ? <div className="admin-error">{loginError}</div> : null}
          <button
            className="admin-btn admin-btn--primary"
            type="submit"
            disabled={loggingIn}
          >
            {loggingIn ? "Entrando..." : "Continuar"}
          </button>
          <Link to="/" className="admin-login__back">
            Voltar ao formulário
          </Link>
        </form>
      </main>
    );
  }

  return (
    <div className="admin">
      <header className="admin__top">
        <div className="admin__brand">
          <img src="/brand/iam-logo.png" alt="iAM" />
          <div>
            <p className="admin__kicker">Administração</p>
            <h1>Candidaturas</h1>
          </div>
        </div>
        <div className="admin__top-actions">
          <button
            className="admin-btn admin-btn--secondary"
            type="button"
            onClick={() => void loadApplications(token)}
          >
            Atualizar
          </button>
          <button
            className="admin-btn admin-btn--secondary"
            type="button"
            onClick={logout}
          >
            Sair
          </button>
        </div>
      </header>

      <section className="admin__stats" aria-label="Resumo">
        <article>
          <strong>{counts.pending}</strong>
          <span>Pendentes</span>
        </article>
        <article>
          <strong>{counts.approved}</strong>
          <span>Aprovados</span>
        </article>
        <article>
          <strong>{counts.rejected}</strong>
          <span>Rejeitados</span>
        </article>
      </section>

      <div className="admin__filters" role="tablist" aria-label="Filtros">
        {(
          [
            ["pending", "Pendentes"],
            ["approved", "Aprovados"],
            ["rejected", "Rejeitados"],
            ["all", "Todos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={filter === value ? "is-active" : undefined}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {listError ? <div className="admin-error admin__error">{listError}</div> : null}

      {loading ? (
        <p className="admin__empty">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="admin__empty">Nenhuma candidatura neste filtro.</p>
      ) : (
        <div className="admin__list">
          {filtered.map((item) => (
            <article className="admin-card" key={item.id}>
              <div className="admin-card__head">
                <div>
                  <h2>{item.nome_completo}</h2>
                  <div className="admin-card__handles">
                    {accountLinks(item.nome_conta).map((link) => (
                      <a
                        key={link.href}
                        className="admin-card__handle"
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <span className={`admin-badge admin-badge--${item.status}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>

              <dl className="admin-card__meta">
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    <a
                      href={`https://wa.me/55${item.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {formatPhone(item.whatsapp)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Redes</dt>
                  <dd>{item.redes_sociais.join(" · ")}</dd>
                </div>
                <div>
                  <dt>Enviado em</dt>
                  <dd>{formatDate(item.created_at)}</dd>
                </div>
              </dl>

              <div className="admin-card__actions">
                <button
                  className="admin-btn admin-btn--ok"
                  type="button"
                  disabled={updatingId === item.id || item.status === "approved"}
                  onClick={() => void updateStatus(item.id, "approved")}
                >
                  Aprovar
                </button>
                <button
                  className="admin-btn admin-btn--danger"
                  type="button"
                  disabled={updatingId === item.id || item.status === "rejected"}
                  onClick={() => void updateStatus(item.id, "rejected")}
                >
                  Rejeitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
