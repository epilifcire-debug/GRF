export type Classificacao = "apoio" | "vigilante" | "grandes_eventos" | "lider" | "especial";

export interface ClassificacaoInfo {
  id: Classificacao;
  label: string;
  short: string;
  /** Caixa marcada no relatório (GE / VG / AP); Líder e Especial não têm caixa */
  code: "AP" | "VG" | "GE" | null;
  tag?: string;
  valorPadrao: number | null;
  badge: string;
  dot: string;
}

export const CLASSIFICACOES: ClassificacaoInfo[] = [
  { id: "apoio", label: "Apoio", short: "Apoio", code: "AP", valorPadrao: 110, badge: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  { id: "vigilante", label: "Curso Vigilante", short: "Vigilante", code: "VG", valorPadrao: 120, badge: "bg-blue-100 text-blue-800 ring-blue-200", dot: "bg-blue-500" },
  { id: "grandes_eventos", label: "Curso Grandes Eventos", short: "Grandes Eventos", code: "GE", valorPadrao: 130, badge: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  { id: "lider", label: "Líder", short: "Líder", code: null, tag: "LÍDER", valorPadrao: 150, badge: "bg-pink-100 text-pink-800 ring-pink-200", dot: "bg-pink-500" },
  { id: "especial", label: "Especial", short: "Especial", code: null, tag: "ESP.", valorPadrao: null, badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
];

export const CLASS_MAP = Object.fromEntries(CLASSIFICACOES.map((c) => [c.id, c])) as Record<Classificacao, ClassificacaoInfo>;

/** Aceita "Apoio", "AP", "Curso Vigilante", "VG", "GE", "Líder"... */
export function parseClassificacao(raw: string): Classificacao | null {
  const s = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "ap" || s.startsWith("apoio")) return "apoio";
  if (s === "vg" || s.includes("vigilante")) return "vigilante";
  if (s === "ge" || s.includes("grandes")) return "grandes_eventos";
  if (s === "ld" || s.startsWith("lider")) return "lider";
  if (s === "es" || s.startsWith("especial")) return "especial";
  return null;
}

export const valorPadrao = (c: Classificacao) => CLASS_MAP[c].valorPadrao;
