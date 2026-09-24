import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ADMIN_PASSWORD: string;
  ADMIN_API_TOKEN: string;
};

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
  updated_at: string;
};

type SubmitBody = {
  nome_completo?: string;
  email?: string;
  whatsapp?: string;
  nome_conta?: string;
  redes_sociais?: string[];
};

const ALLOWED_NETWORKS = new Set(["instagram", "tiktok"]);

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

function getSupabase(env: Bindings): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

function normalizePhone(whatsapp: string): string {
  return whatsapp.replace(/\D/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function requireAdmin(
  request: Request,
  env: Bindings,
): Promise<Response | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !(await timingSafeEqual(token, env.ADMIN_PASSWORD))) {
    return jsonError("Não autorizado", 401);
  }
  return null;
}

app.get("/api/health", (c) =>
  c.json({ ok: true, service: "embaixadores-forms" }),
);

app.post("/api/applications", async (c) => {
  let body: SubmitBody;
  try {
    body = await c.req.json<SubmitBody>();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const nomeCompleto = body.nome_completo?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const whatsapp = body.whatsapp?.trim() ?? "";
  const nomeConta = body.nome_conta?.trim() ?? "";
  const redes = Array.isArray(body.redes_sociais)
    ? [
        ...new Set(
          body.redes_sociais
            .map((r) => r.trim().toLowerCase())
            .filter((r) => ALLOWED_NETWORKS.has(r)),
        ),
      ]
    : [];

  if (!nomeCompleto || nomeCompleto.length < 2) {
    return jsonError("Informe o nome completo", 400);
  }
  if (!email || !isValidEmail(email)) {
    return jsonError("Informe um e-mail válido", 400);
  }
  if (!whatsapp || normalizePhone(whatsapp).length < 10) {
    return jsonError("Informe um WhatsApp válido", 400);
  }
  if (!nomeConta) {
    return jsonError("Informe o nome da conta", 400);
  }
  if (redes.length === 0) {
    return jsonError("Selecione ao menos uma rede social", 400);
  }

  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from("applications")
    .insert({
      nome_completo: nomeCompleto,
      email,
      whatsapp: normalizePhone(whatsapp),
      nome_conta: nomeConta,
      redes_sociais: redes,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("Este e-mail já foi cadastrado", 409);
    }
    console.error("insert_error", error);
    return jsonError("Não foi possível enviar a candidatura", 500);
  }

  return c.json({ ok: true, id: data.id }, 201);
});

app.post("/api/admin/login", async (c) => {
  let body: { password?: string };
  try {
    body = await c.req.json<{ password?: string }>();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const password = body.password ?? "";
  if (!(await timingSafeEqual(password, c.env.ADMIN_PASSWORD))) {
    return jsonError("Senha incorreta", 401);
  }

  return c.json({ ok: true, token: c.env.ADMIN_PASSWORD });
});

app.get("/api/admin/applications", async (c) => {
  const unauthorized = await requireAdmin(c.req.raw, c.env);
  if (unauthorized) return unauthorized;

  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.rpc("admin_list_applications", {
    p_token: c.env.ADMIN_API_TOKEN,
  });

  if (error) {
    console.error("list_error", error);
    return jsonError("Falha ao listar candidaturas", 500);
  }

  return c.json({ applications: (data ?? []) as Application[] });
});

app.patch("/api/admin/applications/:id", async (c) => {
  const unauthorized = await requireAdmin(c.req.raw, c.env);
  if (unauthorized) return unauthorized;

  const id = c.req.param("id");
  let body: { status?: ApplicationStatus };
  try {
    body = await c.req.json<{ status?: ApplicationStatus }>();
  } catch {
    return jsonError("JSON inválido", 400);
  }

  if (body.status !== "approved" && body.status !== "rejected" && body.status !== "pending") {
    return jsonError("Status inválido", 400);
  }

  const supabase = getSupabase(c.env);
  const { data, error } = await supabase.rpc("admin_update_application_status", {
    p_token: c.env.ADMIN_API_TOKEN,
    p_id: id,
    p_status: body.status,
  });

  if (error) {
    console.error("update_error", error);
    if (error.message?.includes("not_found")) {
      return jsonError("Candidatura não encontrada", 404);
    }
    return jsonError("Falha ao atualizar status", 500);
  }

  return c.json({ application: data as Application });
});

app.all("/api/*", () => jsonError("Não encontrado", 404));

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Bindings>;
