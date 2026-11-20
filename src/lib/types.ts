import type { Classificacao } from "./classificacao";
import type { PixType } from "./pix";

export interface Pessoa {
  id: string;
  nome: string;
  pix_chave: string;
  pix_tipo: PixType;
  classificacao: Classificacao;
  created_at: string;
}
export type PessoaInput = Pick<Pessoa, "nome" | "pix_chave" | "pix_tipo" | "classificacao">;

export interface Evento {
  id: string;
  nome: string;
  municipio: string;
  data: string | null; // yyyy-mm-dd
  organizador: string;
  telefone: string;
  observacoes: string;
  created_at: string;
}
export type EventoInput = Omit<Evento, "id" | "created_at">;
export interface EventoResumo extends Evento {
  total_pessoas: number;
  valor_total: number;
}

export interface EfetivoItem {
  id: string;
  evento_id: string;
  pessoa_id: string;
  classificacao: Classificacao;
  valor: number;
  created_at: string;
  pessoa: Pessoa;
}

export interface Membro {
  user_id: string;
  nome: string;
  /** nome de usuário usado para entrar (ex.: joao.silva) */
  login: string;
  /** e-mail de contato (opcional) */
  email: string | null;
  papel: "admin" | "equipe";
  ativo: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

/** Linha vinda da importação de CSV */
export interface LinhaImportada extends PessoaInput {
  valor: number;
}

export interface ImportacaoResultado {
  pessoasCriadas: number;
  adicionados: number;
  jaNoEvento: number;
}

/** Valor padrão de uma classificação (tabela de valores) */
export interface ValorPadrao {
  classificacao: Classificacao;
  valor: number | null;
  updated_at: string;
}

/** Valor diferente só para um evento */
export interface ValorEvento {
  evento_id: string;
  classificacao: Classificacao;
  valor: number;
}

export interface HistoricoValor {
  id: number;
  evento_id: string | null;
  classificacao: Classificacao;
  valor_anterior: number | null;
  valor_novo: number | null;
  alterado_em: string;
  alterado_por_nome: string | null;
}

/** Resolve o valor de uma classificação (evento → padrão) */
export type ValorDe = (c: Classificacao) => number | null;
