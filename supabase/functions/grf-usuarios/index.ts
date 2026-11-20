// Edge Function: grf-usuarios
// Ações administrativas que precisam da service_role (nunca exposta no app):
//   { acao: "criar", nome, login, senha, papel, email? } -> cria a conta + membro
//   { acao: "senha", user_id, senha }                    -> redefine a senha
//   { acao: "login", user_id, login }                    -> troca o nome de usuário
// Só membros ativos com papel "admin" podem chamar.
//
// Login por nome de usuário: o Supabase exige um e-mail por conta, então o
// e-mail de autenticação é gerado a partir do login (nunca recebe mensagens,
// a conta já nasce confirmada). Mantenha LOGIN_DOMAIN igual ao do app
// (src/lib/login.ts).
import { createClient } from "npm:@supabase/supabase-js@2";

const LOGIN_PREFIX = "grf-";
const LOGIN_DOMAIN = "efcsys.com";
const authEmail = (login: string) => `${LOGIN_PREFIX}${login}@${LOGIN_DOMAIN}`;
const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Quem está chamando?
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller.user) return json({ error: "Sessão inválida" }, 401);

  // 2. É admin ativo do GRF?
  const { data: me } = await admin.from("grf_membros").select("papel, ativo").eq("user_id", caller.user.id).maybeSingle();
  if (!me || !me.ativo || me.papel !== "admin") return json({ error: "Apenas administradores" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }

  const loginOk = async (login: string, ignorarUserId?: string) => {
    if (!LOGIN_RE.test(login)) return "Usuário deve ter de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _";
    let q = admin.from("grf_membros").select("user_id").eq("login", login);
    if (ignorarUserId) q = q.neq("user_id", ignorarUserId);
    const { data } = await q.maybeSingle();
    return data ? "Esse usuário já existe" : null;
  };

  /* ---------- criar ---------- */
  if (body.acao === "criar") {
    const nome = String(body.nome ?? "").trim();
    const login = String(body.login ?? "").trim().toLowerCase();
    const senha = String(body.senha ?? "");
    const papel = body.papel === "admin" ? "admin" : "equipe";
    const contato = String(body.email ?? "").trim().toLowerCase() || null;

    if (nome.length < 2) return json({ error: "Informe o nome" }, 400);
    const loginErr = await loginOk(login);
    if (loginErr) return json({ error: loginErr }, 400);
    if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);
    if (contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) return json({ error: "E-mail de contato inválido" }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email: authEmail(login),
      password: senha,
      email_confirm: true,
      user_metadata: { nome, login, app: "grf" },
    });
    if (error || !created.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      console.error("createUser", error);
      return json({ error: exists ? "Esse usuário já existe" : `Não foi possível criar o login (${error?.message ?? "erro"})` }, 400);
    }

    const { error: insErr } = await admin.from("grf_membros").insert({ user_id: created.user.id, nome, login, email: contato, papel });
    if (insErr) {
      await admin.auth.admin.deleteUser(created.user.id); // não deixa conta órfã
      console.error("insert membro", insErr);
      return json({ error: "Não foi possível cadastrar o membro" }, 500);
    }
    return json({ ok: true, user_id: created.user.id });
  }

  /* ---------- senha ---------- */
  if (body.acao === "senha") {
    const userId = String(body.user_id ?? "");
    const senha = String(body.senha ?? "");
    if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);
    const { data: alvo } = await admin.from("grf_membros").select("user_id").eq("user_id", userId).maybeSingle();
    if (!alvo) return json({ error: "Membro não encontrado" }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
    if (error) return json({ error: "Não foi possível alterar a senha" }, 500);
    return json({ ok: true });
  }

  /* ---------- login (trocar nome de usuário) ---------- */
  if (body.acao === "login") {
    const userId = String(body.user_id ?? "");
    const login = String(body.login ?? "").trim().toLowerCase();
    const { data: alvo } = await admin.from("grf_membros").select("user_id, login").eq("user_id", userId).maybeSingle();
    if (!alvo) return json({ error: "Membro não encontrado" }, 404);
    const loginErr = await loginOk(login, userId);
    if (loginErr) return json({ error: loginErr }, 400);

    const { error } = await admin.auth.admin.updateUserById(userId, { email: authEmail(login), email_confirm: true });
    if (error) {
      console.error("update email", error);
      return json({ error: `Não foi possível alterar o usuário (${error.message})` }, 400);
    }
    const { error: upErr } = await admin.from("grf_membros").update({ login }).eq("user_id", userId);
    if (upErr) return json({ error: "Login alterado, mas não foi possível atualizar o cadastro" }, 500);
    return json({ ok: true });
  }

  return json({ error: "Ação desconhecida" }, 400);
});
