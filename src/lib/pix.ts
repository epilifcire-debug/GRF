export type PixType = "cpf" | "telefone" | "email" | "aleatoria" | "outro";

const digits = (s: string) => s.replace(/\D/g, "");

export function detectPixType(value: string): PixType {
  const v = value.trim();
  if (!v) return "outro";
  if (v.includes("@")) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return "aleatoria";
  const d = digits(v);
  if (/^[\d.\-\s()+]+$/.test(v)) {
    const looksLikePhone = v.includes("(") || v.startsWith("+");
    if (d.length === 11 && isValidCPF(d) && !looksLikePhone) return "cpf";
    if (d.length >= 10 && d.length <= 13) return "telefone";
  }
  return "outro";
}

export function isValidCPF(cpf: string): boolean {
  const d = digits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== Number(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === Number(d[10]);
}

export const maskCPF = (v: string) =>
  digits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskPhone = (v: string) => {
  const d = digits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

/** Formata a chave para exibição de acordo com o tipo */
export function formatPix(value: string, type: PixType = detectPixType(value)): string {
  if (type === "cpf") return maskCPF(value);
  if (type === "telefone") return maskPhone(value);
  return value.trim();
}

export const PIX_LABEL: Record<PixType, string> = {
  cpf: "CPF",
  telefone: "Telefone",
  email: "E-mail",
  aleatoria: "Aleatória",
  outro: "Outro",
};
