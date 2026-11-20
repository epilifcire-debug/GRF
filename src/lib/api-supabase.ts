import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { AppError, type Api } from "./api";
import type { EfetivoItem, EventoResumo, Membro } from "./types";

/** Chaves públicas: primeiro as do servidor (/config.js), depois as do build (.env) */
const runtime = (window as { __GRF_CONFIG__?: { supabaseUrl?: string; supabaseKey?: string } }).__GRF_CONFIG__;
const url = runtime?.supabaseUrl || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const key = runtime?.supabaseKey || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);

const urlValida = /^https?:\/\/[^\s]+$/i.test(url ?? "");
export const supabaseConfigurado = Boolean(urlValida && key);
if (!supabaseConfigurado) {
  console.error("[grf] Supabase mal configurado: VITE_SUPABASE_URL deve ser a URL do projeto (https://xxxx.supabase.co) e VITE_SUPABASE_PUBLISHABLE_KEY a chave pública.");
}

// Com configuração inválida o app não quebra: mostra o aviso na tela de login
export const supabase = createClient(urlValida ? url! : "http://localhost", key || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "grf-auth" },
});

/** Traduz erros do Postgres/PostgREST para mensagens claras */
function fail(error: PostgrestError | null, ctx?: "pessoa" | "efetivo" | "evento" | "membro"): void {
  if (!error) return;
  console.error(error);
  if (error.code === "23505") {
    if (ctx === "pessoa") throw new AppError("Já existe uma pessoa com essa chave PIX.");
    if (ctx === "efetivo") throw new AppError("Essa pessoa já está no efetivo deste evento.");
    throw new AppError("Registro duplicado.");
  }
  if (error.code === "23503" && ctx === "pessoa") throw new AppError("Essa pessoa está escalada em eventos. Remova-a dos eventos antes de excluir.");
  if (error.code === "23514") throw new AppError("Algum campo está fora do formato esperado.");
  if (error.code === "42501" || /row-level security/i.test(error.message)) throw new AppError("Você não tem permissão para essa ação.");
  throw new AppError("Não foi possível salvar. Verifique a conexão e tente de novo.");
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

const PESSOA_COLS = "id, nome, pix_chave, pix_tipo, classificacao, created_at";

export const supabaseApi: Api = {
  auth: {
    async getUser() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      return u ? { id: u.id, email: u.email ?? "" } : null;
    },
    onChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        const u = session?.user;
        cb(u ? { id: u.id, email: u.email ?? "" } : null);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, senha) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
      if (error) {
        if (/invalid/i.test(error.message)) throw new AppError("E-mail ou senha incorretos.");
        throw new AppError("Não foi possível entrar agora. Tente de novo em instantes.");
      }
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async trocarSenha(nova) {
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) throw new AppError(/weak|short/i.test(error.message) ? "Senha muito fraca." : "Não foi possível alterar a senha.");
    },
    async membro(userId) {
      const { data, error } = await supabase.from("grf_membros").select("*").eq("user_id", userId).maybeSingle();
      if (error) {
        console.error("[grf] erro ao consultar grf_membros", error);
        throw new AppError(`${error.code ?? ""} ${error.message}`.trim());
      }
      return (data as Membro) ?? null;
    },
  },

  pessoas: {
    async list() {
      const { data, error } = await supabase.from("grf_pessoas").select(PESSOA_COLS).order("nome");
      fail(error);
      return data ?? [];
    },
    async create(input) {
      const { data, error } = await supabase.from("grf_pessoas").insert(input).select(PESSOA_COLS).single();
      fail(error, "pessoa");
      return data!;
    },
    async update(id, patch) {
      const { error } = await supabase.from("grf_pessoas").update(patch).eq("id", id);
      fail(error, "pessoa");
    },
    async remove(id) {
      const { error } = await supabase.from("grf_pessoas").delete().eq("id", id);
      fail(error, "pessoa");
    },
  },

  eventos: {
    async list() {
      const { data, error } = await supabase
        .from("grf_eventos_resumo")
        .select("*")
        .order("data", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      fail(error);
      return (data ?? []).map((e) => ({ ...e, total_pessoas: num(e.total_pessoas), valor_total: num(e.valor_total) })) as EventoResumo[];
    },
    async get(id) {
      const { data, error } = await supabase.from("grf_eventos").select("*").eq("id", id).maybeSingle();
      fail(error);
      return data ?? null;
    },
    async create(input) {
      const { data, error } = await supabase.from("grf_eventos").insert(input).select("*").single();
      fail(error, "evento");
      return data!;
    },
    async update(id, patch) {
      const { error } = await supabase.from("grf_eventos").update(patch).eq("id", id);
      fail(error, "evento");
    },
    async remove(id) {
      const { error } = await supabase.from("grf_eventos").delete().eq("id", id);
      fail(error, "evento");
    },
  },

  efetivo: {
    async list(eventoId) {
      const { data, error } = await supabase
        .from("grf_efetivo")
        .select(`id, evento_id, pessoa_id, classificacao, valor, created_at, pessoa:grf_pessoas(${PESSOA_COLS})`)
        .eq("evento_id", eventoId);
      fail(error);
      return (data ?? []).map((r) => ({ ...r, valor: num(r.valor) })) as unknown as EfetivoItem[];
    },
    async add(eventoId, pessoaId, classificacao, valor) {
      const { error } = await supabase.from("grf_efetivo").insert({ evento_id: eventoId, pessoa_id: pessoaId, classificacao, valor });
      fail(error, "efetivo");
    },
    async addMany(eventoId, items) {
      const { error } = await supabase.from("grf_efetivo").insert(items.map((i) => ({ ...i, evento_id: eventoId })));
      fail(error, "efetivo");
    },
    async update(id, patch) {
      const { error } = await supabase.from("grf_efetivo").update(patch).eq("id", id);
      fail(error, "efetivo");
    },
    async remove(id) {
      const { error } = await supabase.from("grf_efetivo").delete().eq("id", id);
      fail(error, "efetivo");
    },
    async copiarDe(origemId, destinoId) {
      const [origem, destino] = await Promise.all([this.list(origemId), this.list(destinoId)]);
      const ja = new Set(destino.map((d) => d.pessoa_id));
      const novos = origem
        .filter((o) => !ja.has(o.pessoa_id))
        .map((o) => ({ pessoa_id: o.pessoa_id, classificacao: o.classificacao, valor: o.valor }));
      if (novos.length) await this.addMany(destinoId, novos);
      return novos.length;
    },
  },

  membros: {
    async list() {
      const { data, error } = await supabase.from("grf_membros").select("*").order("nome");
      fail(error);
      return (data ?? []) as Membro[];
    },
    async criar(input) {
      const { data, error } = await supabase.functions.invoke("grf-usuarios", { body: { acao: "criar", ...input } });
      if (error) {
        const msg = await readFnError(error);
        throw new AppError(msg ?? "Não foi possível criar o usuário.");
      }
      if (data?.error) throw new AppError(data.error);
    },
    async update(userId, patch) {
      const { error } = await supabase.from("grf_membros").update(patch).eq("user_id", userId);
      fail(error, "membro");
    },
    async definirSenha(userId, senha) {
      const { data, error } = await supabase.functions.invoke("grf-usuarios", { body: { acao: "senha", user_id: userId, senha } });
      if (error) throw new AppError((await readFnError(error)) ?? "Não foi possível alterar a senha.");
      if (data?.error) throw new AppError(data.error);
    },
  },
};

async function readFnError(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      return typeof body?.error === "string" ? body.error : null;
    }
  } catch {
    /* ignora */
  }
  return null;
}
