import { detectPixType } from "./pix";
import { CLASS_MAP, parseClassification, type StaffInput, type StaffMember } from "./staff";
import { parseMoney } from "./utils";

/** Detecta ; , ou TAB (Excel em pt-BR exporta com ;) */
function detectDelimiter(line: string) {
  const counts = [";", ",", "\t"].map((d) => [d, line.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

function parseLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export interface ImportResult {
  rows: StaffInput[];
  errors: string[];
}

/**
 * Colunas aceitas (cabeçalho opcional, ordem livre quando há cabeçalho):
 * Nome ; Chave PIX ; Classificação ; Valor
 */
export function parseStaffCSV(text: string): ImportResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { rows: [], errors: ["Arquivo vazio."] };

  const delim = detectDelimiter(lines[0]);
  const first = parseLine(lines[0], delim).map(norm);
  const hasHeader = first.some((c) => /nome|pix|classif|valor|tipo/.test(c));

  let idx = { name: 0, pix: 1, cls: 2, value: 3 };
  if (hasHeader) {
    const find = (re: RegExp) => first.findIndex((c) => re.test(c));
    idx = {
      name: find(/nome/),
      pix: find(/pix|chave/),
      cls: find(/classif|tipo|categoria|funcao/),
      value: find(/valor|pagamento|diaria/),
    };
    if (idx.name < 0) return { rows: [], errors: ["Não encontrei a coluna 'Nome' no cabeçalho."] };
  }

  const rows: StaffInput[] = [];
  lines.slice(hasHeader ? 1 : 0).forEach((line, i) => {
    const cols = parseLine(line, delim);
    const lineNo = i + (hasHeader ? 2 : 1);
    const name = cols[idx.name] ?? "";
    if (!name) {
      errors.push(`Linha ${lineNo}: sem nome, ignorada.`);
      return;
    }
    const pixKey = idx.pix >= 0 ? cols[idx.pix] ?? "" : "";
    const classification = (idx.cls >= 0 && parseClassification(cols[idx.cls] ?? "")) || "apoio";
    if (idx.cls >= 0 && cols[idx.cls] && !parseClassification(cols[idx.cls])) {
      errors.push(`Linha ${lineNo}: classificação "${cols[idx.cls]}" não reconhecida — usei Apoio.`);
    }
    const rawValue = idx.value >= 0 ? cols[idx.value] ?? "" : "";
    const value = rawValue ? parseMoney(rawValue) : CLASS_MAP[classification].defaultValue ?? 0;
    rows.push({ name, pixKey, pixType: detectPixType(pixKey), classification, value });
  });

  return { rows, errors };
}

export function staffToCSV(list: StaffMember[]): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = "Nº;Nome;Chave PIX;Classificação;Valor";
  const body = list.map((s, i) =>
    [String(i + 1), s.name, s.pixKey, CLASS_MAP[s.classification].label, s.value.toFixed(2).replace(".", ",")]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [header, ...body].join("\r\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CSV_TEMPLATE =
  "﻿Nome;Chave PIX;Classificação;Valor\r\nMaria da Silva;123.456.789-09;Apoio;110\r\nJoão Santos;(79) 99999-0000;Vigilante;120\r\nAna Souza;ana@email.com;GE;130\r\n";
