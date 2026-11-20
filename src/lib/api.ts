import type { Classificacao } from "./classificacao";
import { pixKeyNorm } from "./csv";
import type {
  AuthUser,
  EfetivoItem,
  Evento,
  EventoInput,
  EventoResumo,
  ImportacaoResultado,
  LinhaImportada,
  Membro,
  Pessoa,
  PessoaInput,
} from "./types";

/** Contrato da camada de dados. Implementado pelo Supabase (produção) e em memória (preview). */
export interface Api {
  auth: {
    getUser(): Promise<AuthUser | null>;
    onChange(cb: (user: AuthUser | null) => void): () => void;
    signIn(email: string, senha: string): Promise<void>;
    signOut(): Promise<void>;
    trocarSenha(nova: string): Promise<void>;
    membro(userId: string): Promise<Membro | null>;
  };
  pessoas: {
    list(): Promise<Pessoa[]>;
    create(input: PessoaInput): Promise<Pessoa>;
    update(id: string, patch: Partial<PessoaInput>): Promise<void>;
    remove(id: string): Promise<void>;
  };
  eventos: {
    list(): Promise<EventoResumo[]>;
    get(id: string): Promise<Evento | null>;
    create(input: EventoInput): Promise<Evento>;
    update(id: string, patch: Partial<EventoInput>): Promise<void>;
    remove(id: string): Promise<void>;
  };
  efetivo: {
    list(eventoId: string): Promise<EfetivoItem[]>;
    add(eventoId: string, pessoaId: string, classificacao: Classificacao, valor: number): Promise<void>;
    addMany(eventoId: string, items: { pessoa_id: string; classificacao: Classificacao; valor: number }[]): Promise<void>;
    update(id: string, patch: { classificacao?: Classificacao; valor?: number }): Promise<void>;
    remove(id: string): Promise<void>;
    copiarDe(origemId: string, destinoId: string): Promise<number>;
  };
  membros: {
    list(): Promise<Membro[]>;
    criar(input: { nome: string; email: string; senha: string; papel: Membro["papel"] }): Promise<void>;
    update(userId: string, patch: Partial<Pick<Membro, "nome" | "papel" | "ativo">>): Promise<void>;
    definirSenha(userId: string, senha: string): Promise<void>;
  };
}

/** Erro com mensagem pronta para o usuário */
export class AppError extends Error {}

/**
 * Importa linhas de CSV para um evento:
 * reaproveita pessoas já cadastradas (mesma chave PIX), cria as novas
 * e adiciona ao evento só quem ainda não está nele.
 */
export async function importarParaEvento(api: Api, eventoId: string, linhas: LinhaImportada[]): Promise<ImportacaoResultado> {
  const [pessoas, efetivo] = await Promise.all([api.pessoas.list(), api.efetivo.list(eventoId)]);
  const porPix = new Map(pessoas.map((p) => [pixKeyNorm(p.pix_chave), p]));
  const noEvento = new Set(efetivo.map((e) => e.pessoa_id));

  let pessoasCriadas = 0;
  let jaNoEvento = 0;
  const novos: { pessoa_id: string; classificacao: Classificacao; valor: number }[] = [];

  for (const l of linhas) {
    const key = pixKeyNorm(l.pix_chave);
    let p = porPix.get(key);
    if (!p) {
      p = await api.pessoas.create({ nome: l.nome, pix_chave: l.pix_chave, pix_tipo: l.pix_tipo, classificacao: l.classificacao });
      porPix.set(key, p);
      pessoasCriadas++;
    }
    if (noEvento.has(p.id)) {
      jaNoEvento++;
      continue;
    }
    noEvento.add(p.id);
    novos.push({ pessoa_id: p.id, classificacao: l.classificacao, valor: l.valor });
  }

  if (novos.length) await api.efetivo.addMany(eventoId, novos);
  return { pessoasCriadas, adicionados: novos.length, jaNoEvento };
}
