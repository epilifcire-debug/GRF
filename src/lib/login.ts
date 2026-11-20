/**
 * Login por nome de usuário.
 * O Supabase exige e-mail, então a conta usa um e-mail interno gerado do
 * usuário (nunca recebe mensagens). Mantenha igual à Edge Function
 * supabase/functions/grf-usuarios/index.ts.
 */
export const LOGIN_PREFIX = "grf-";
export const LOGIN_DOMAIN = "efcsys.com";
export const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** "João Silva" -> "joao.silva" */
export function normalizarLogin(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);
}

/** Sugestão de usuário a partir do nome: primeiro + último nome */
export function sugerirLogin(nome: string): string {
  const partes = normalizarLogin(nome).split(".").filter(Boolean);
  if (partes.length === 0) return "";
  return partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
}

/** O que a pessoa digitou na tela de login -> e-mail usado no Supabase */
export function emailDeLogin(entrada: string): string {
  const v = entrada.trim().toLowerCase();
  return v.includes("@") ? v : `${LOGIN_PREFIX}${normalizarLogin(v)}@${LOGIN_DOMAIN}`;
}

export const loginErro = (login: string) =>
  LOGIN_RE.test(login) ? "" : "De 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _.";
