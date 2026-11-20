// Edge Function: grf-usuarios
// Ações administrativas que precisam da service_role (nunca exposta no app):
//   { acao: "criar", nome, email, senha, papel }   -> cria login + membro
//   { acao: "senha", user_id, senha }              -> redefine a senha de um membro
// Só membros ativos com papel "admin" podem chamar.
import { createClient } from "npm:@supabase/supabase-js@2";

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
  const { data: me } = await admin
    .from("grf_membros")
    .select("papel, ativo")
    .eq("user_id", caller.user.id)
    .maybeSingle();
  if (!me || !me.ativo || me.papel !== "admin") return json({ error: "Apenas administradores" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo inválido" }, 400);
  }

  const senha = String(body.senha ?? "");
  if (senha.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres" }, 400);

  if (body.acao === "criar") {
    const nome = String(body.nome ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const papel = body.papel === "admin" ? "admin" : "equipe";
    if (nome.length < 2) return json({ error: "Informe o nome" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, app: "grf" },
    });
    if (error || !created.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      return json({ error: exists ? "Já existe um login com esse e-mail" : "Não foi possível criar o login" }, 400);
    }

    const { error: insErr } = await admin
      .from("grf_membros")
      .insert({ user_id: created.user.id, nome, email, papel });
    if (insErr) {
      await admin.auth.admin.deleteUser(created.user.id); // desfaz para não deixar login órfão
      return json({ error: "Não foi possível cadastrar o membro" }, 500);
    }
    return json({ ok: true, user_id: created.user.id });
  }

  if (body.acao === "senha") {
    const userId = String(body.user_id ?? "");
    const { data: alvo } = await admin.from("grf_membros").select("user_id").eq("user_id", userId).maybeSingle();
    if (!alvo) return json({ error: "Membro não encontrado" }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
    if (error) return json({ error: "Não foi possível alterar a senha" }, 500);
    return json({ ok: true });
  }

  return json({ error: "Ação desconhecida" }, 400);
});
