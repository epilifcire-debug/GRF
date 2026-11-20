import { CLASS_MAP, parseClassificacao } from "./classificacao";
import { detectPixType, formatPix } from "./pix";
import type { EfetivoItem, LinhaImportada, ValorDe } from "./types";
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

export interface ParseResult {
  rows: LinhaImportada[];
  errors: string[];
}

/**
 * Colunas aceitas (cabeçalho opcional, ordem livre quando há cabeçalho):
 * Nome ; Chave PIX ; Classificação ; Valor
 */
export function parseCSV(text: string, valorDe?: ValorDe): ParseResult {
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

  const rows: LinhaImportada[] = [];
  lines.slice(hasHeader ? 1 : 0).forEach((line, i) => {
    const cols = parseLine(line, delim);
    const lineNo = i + (hasHeader ? 2 : 1);
    const nome = (cols[idx.name] ?? "").replace(/\s+/g, " ").trim();
    const pixRaw = idx.pix >= 0 ? cols[idx.pix] ?? "" : "";
    if (nome.length < 3) {
      errors.push(`Linha ${lineNo}: sem nome, ignorada.`);
      return;
    }
    if (pixRaw.trim().length < 3) {
      errors.push(`Linha ${lineNo} (${nome}): sem chave PIX, ignorada.`);
      return;
    }
    const clsRaw = idx.cls >= 0 ? cols[idx.cls] ?? "" : "";
    const classificacao = parseClassificacao(clsRaw) ?? "apoio";
    if (clsRaw && !parseClassificacao(clsRaw)) errors.push(`Linha ${lineNo}: classificação "${clsRaw}" não reconhecida — usei Apoio.`);
    const rawValue = idx.value >= 0 ? cols[idx.value] ?? "" : "";
    const valor = rawValue ? parseMoney(rawValue) : (valorDe ? valorDe(classificacao) : CLASS_MAP[classificacao].valorPadrao) ?? 0;
    if (valor <= 0) {
      errors.push(`Linha ${lineNo} (${nome}): sem valor, ignorada.`);
      return;
    }
    const pix_tipo = detectPixType(pixRaw);
    rows.push({ nome, pix_chave: formatPix(pixRaw, pix_tipo), pix_tipo, classificacao, valor });
  });

  return { rows, errors };
}

export function efetivoToCSV(list: EfetivoItem[]): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = "Nº;Nome;Chave PIX;Classificação;Valor";
  const body = list.map((s, i) =>
    [String(i + 1), s.pessoa.nome, s.pessoa.pix_chave, CLASS_MAP[s.classificacao].label, s.valor.toFixed(2).replace(".", ",")]
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

/** Chave PIX normalizada (igual ao índice único do banco) */
export const pixKeyNorm = (s: string) => (/[A-Za-z@]/.test(s) ? s.trim().toLowerCase() : s.replace(/\D/g, ""));
