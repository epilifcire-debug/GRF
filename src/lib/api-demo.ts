/**
 * Camada de dados em memória — usada SOMENTE no build de preview
 * (npm run build:preview). Dados fictícios, nada é salvo.
 */
import { AppError, type Api } from "./api";
import { CLASSIFICACOES, type Classificacao, valorPadrao } from "./classificacao";
import { pixKeyNorm } from "./csv";
import type { AuthUser, EfetivoItem, Evento, HistoricoValor, Membro, Pessoa, ValorEvento, ValorPadrao } from "./types";
import { uid } from "./utils";

const now = () => new Date().toISOString();
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

const NOMES = [
  "Adriana Oliveira Nascimento", "Aline Ferreira Costa", "Ana Rodrigues Lima", "Antônia Costa Pereira",
  "Bruno Barbosa Oliveira", "Camila Almeida Rodrigues", "Carlos Gomes Santos", "Diego Silva Menezes",
  "Fernanda Pereira Souza", "Francisca Souza Ribeiro", "Gustavo Lima Carvalho", "João Santos Almeida",
  "José Carlos dos Santos", "Juliana Menezes Barbosa", "Larissa Carvalho Gomes", "Lucas Ribeiro Ferreira",
  "Marcos Nascimento Silva", "Maria da Silva Costa", "Patrícia Almeida Lima", "Paulo Ferreira Santos",
  "Rafael Costa Oliveira", "Rodrigo Souza Menezes", "Thiago Barbosa Ribeiro", "Vanessa Gomes Carvalho",
];
const CLASSES: Classificacao[] = ["apoio", "vigilante", "apoio", "grandes_eventos", "apoio", "vigilante", "lider", "apoio", "grandes_eventos", "apoio", "vigilante", "apoio", "grandes_eventos", "apoio", "vigilante", "apoio", "lider", "apoio", "grandes_eventos", "vigilante", "apoio", "especial", "vigilante", "grandes_eventos"];

const pixDe = (i: number, nome: string): Pick<Pessoa, "pix_chave" | "pix_tipo"> => {
  if (i % 3 === 0) return { pix_chave: `(79) 9${8100 + i * 37}-${1000 + i * 271}`.slice(0, 15), pix_tipo: "telefone" };
  if (i % 3 === 1) {
    const [p, s] = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(" ");
    return { pix_chave: `${p}.${s}@email.com`, pix_tipo: "email" };
  }
  const d = String(10000000000 + i * 734918263).slice(-11);
  return { pix_chave: `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`, pix_tipo: "cpf" };
};

const pessoas: Pessoa[] = NOMES.map((nome, i) => ({
  id: `p${i}`,
  nome,
  ...pixDe(i, nome),
  classificacao: CLASSES[i],
  created_at: now(),
}));

const eventos: Evento[] = [
  { id: "e1", nome: "Festival de Verão", municipio: "Aracaju/SE", data: "2026-12-12", organizador: "Produtora Exemplo", telefone: "(79) 99999-0000", observacoes: "Chegada 15h. Dados fictícios para avaliar o layout.", created_at: now() },
  { id: "e2", nome: "Show na Orla", municipio: "Aracaju/SE", data: "2026-11-29", organizador: "Eventos Litoral", telefone: "(79) 98888-1111", observacoes: "", created_at: now() },
  { id: "e3", nome: "Feira de Negócios", municipio: "Nossa Senhora do Socorro/SE", data: "2026-11-08", organizador: "Associação Comercial", telefone: "(79) 3222-0000", observacoes: "", created_at: now() },
];

type Row = Omit<EfetivoItem, "pessoa">;
let efetivo: Row[] = [
  ...pessoas.map((p) => ({ id: uid(), evento_id: "e1", pessoa_id: p.id, classificacao: p.classificacao, valor: p.classificacao === "lider" ? 160 : valorPadrao(p.classificacao) ?? 180, created_at: now() })),
  ...pessoas.slice(0, 14).map((p) => ({ id: uid(), evento_id: "e2", pessoa_id: p.id, classificacao: p.classificacao, valor: valorPadrao(p.classificacao) ?? 180, created_at: now() })),
  ...pessoas.slice(6, 18).map((p) => ({ id: uid(), evento_id: "e3", pessoa_id: p.id, classificacao: p.classificacao, valor: valorPadrao(p.classificacao) ?? 180, created_at: now() })),
];

const membros: Membro[] = [
  { user_id: "u1", nome: "Administrador (demo)", login: "admin", email: null, papel: "admin", ativo: true, created_at: now() },
  { user_id: "u2", nome: "Coordenador de Equipe", login: "coordenador", email: "coordenador@email.com", papel: "equipe", ativo: true, created_at: now() },
];

const valores: ValorPadrao[] = CLASSIFICACOES.map((c) => ({ classificacao: c.id, valor: c.valorPadrao, updated_at: now() }));
let valoresEvento: ValorEvento[] = [{ evento_id: "e1", classificacao: "lider", valor: 160 }];
const historico: HistoricoValor[] = [
  { id: 2, evento_id: "e1", classificacao: "lider", valor_anterior: null, valor_novo: 160, alterado_em: "2026-11-18T14:20:00Z", alterado_por_nome: "Administrador (demo)" },
  { id: 1, evento_id: null, classificacao: "apoio", valor_anterior: 100, valor_novo: 110, alterado_em: "2026-10-01T12:00:00Z", alterado_por_nome: "Administrador (demo)" },
];
let histSeq = 3;
const logHist = (evento_id: string | null, c: Classificacao, antes: number | null, depois: number | null) => {
  if (antes === depois) return;
  historico.unshift({ id: histSeq++, evento_id, classificacao: c, valor_anterior: antes, valor_novo: depois, alterado_em: now(), alterado_por_nome: "Administrador (demo)" });
};

let user: AuthUser | null = { id: "u1", email: "admin" };
const authSubs = new Set<(u: AuthUser | null) => void>();

const withPessoa = (r: Row): EfetivoItem => ({ ...r, pessoa: pessoas.find((p) => p.id === r.pessoa_id)! });

export const demoApi: Api = {
  auth: {
    async getUser() {
      return user;
    },
    onChange(cb) {
      authSubs.add(cb);
      return () => authSubs.delete(cb);
    },
    async signIn(email) {
      await wait(300);
      user = { id: "u1", email };
      authSubs.forEach((cb) => cb(user));
    },
    async signOut() {
      user = null;
      authSubs.forEach((cb) => cb(null));
    },
    async trocarSenha() {
      await wait();
    },
    async membro(userId) {
      return membros.find((m) => m.user_id === userId) ?? null;
    },
  },
  pessoas: {
    async list() {
      await wait();
      return [...pessoas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    },
    async create(input) {
      await wait();
      if (pessoas.some((p) => pixKeyNorm(p.pix_chave) === pixKeyNorm(input.pix_chave))) throw new AppError("Já existe uma pessoa com essa chave PIX.");
      const p = { ...input, id: uid(), created_at: now() };
      pessoas.push(p);
      return p;
    },
    async update(id, patch) {
      await wait();
      if (patch.pix_chave && pessoas.some((p) => p.id !== id && pixKeyNorm(p.pix_chave) === pixKeyNorm(patch.pix_chave!)))
        throw new AppError("Já existe uma pessoa com essa chave PIX.");
      Object.assign(pessoas.find((p) => p.id === id)!, patch);
    },
    async remove(id) {
      await wait();
      if (efetivo.some((e) => e.pessoa_id === id)) throw new AppError("Essa pessoa está escalada em eventos. Remova-a dos eventos antes de excluir.");
      pessoas.splice(pessoas.findIndex((p) => p.id === id), 1);
    },
  },
  eventos: {
    async list() {
      await wait();
      return [...eventos]
        .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
        .map((e) => {
          const rows = efetivo.filter((r) => r.evento_id === e.id);
          return { ...e, total_pessoas: rows.length, valor_total: rows.reduce((a, r) => a + r.valor, 0) };
        });
    },
    async get(id) {
      await wait();
      return eventos.find((e) => e.id === id) ?? null;
    },
    async create(input) {
      await wait();
      const e = { ...input, id: uid(), created_at: now() };
      eventos.push(e);
      return e;
    },
    async update(id, patch) {
      await wait(60);
      Object.assign(eventos.find((e) => e.id === id)!, patch);
    },
    async remove(id) {
      await wait();
      eventos.splice(eventos.findIndex((e) => e.id === id), 1);
      efetivo = efetivo.filter((r) => r.evento_id !== id);
    },
  },
  efetivo: {
    async list(eventoId) {
      await wait();
      return efetivo.filter((r) => r.evento_id === eventoId).map(withPessoa);
    },
    async add(eventoId, pessoaId, classificacao, valor) {
      await wait();
      if (efetivo.some((r) => r.evento_id === eventoId && r.pessoa_id === pessoaId)) throw new AppError("Essa pessoa já está no efetivo deste evento.");
      efetivo.push({ id: uid(), evento_id: eventoId, pessoa_id: pessoaId, classificacao, valor, created_at: now() });
    },
    async addMany(eventoId, items) {
      await wait();
      items.forEach((i) => efetivo.push({ id: uid(), evento_id: eventoId, ...i, created_at: now() }));
    },
    async update(id, patch) {
      await wait();
      Object.assign(efetivo.find((r) => r.id === id)!, patch);
    },
    async remove(id) {
      await wait();
      efetivo = efetivo.filter((r) => r.id !== id);
    },
    async copiarDe(origemId, destinoId) {
      await wait();
      const ja = new Set(efetivo.filter((r) => r.evento_id === destinoId).map((r) => r.pessoa_id));
      const novos = efetivo.filter((r) => r.evento_id === origemId && !ja.has(r.pessoa_id));
      novos.forEach((r) => efetivo.push({ ...r, id: uid(), evento_id: destinoId, created_at: now() }));
      return novos.length;
    },
  },
  valores: {
    async list() {
      await wait();
      return valores.map((v) => ({ ...v }));
    },
    async update(c, valor) {
      await wait();
      const v = valores.find((x) => x.classificacao === c)!;
      logHist(null, c, v.valor, valor);
      v.valor = valor;
      v.updated_at = now();
    },
    async doEvento(eventoId) {
      await wait();
      return valoresEvento.filter((v) => v.evento_id === eventoId).map((v) => ({ ...v }));
    },
    async definirNoEvento(eventoId, c, valor) {
      await wait();
      const atual = valoresEvento.find((v) => v.evento_id === eventoId && v.classificacao === c);
      logHist(eventoId, c, atual?.valor ?? null, valor);
      valoresEvento = valoresEvento.filter((v) => !(v.evento_id === eventoId && v.classificacao === c));
      if (valor != null) valoresEvento.push({ evento_id: eventoId, classificacao: c, valor });
    },
    async aplicarNoEfetivo(eventoId, c, valor) {
      await wait();
      const alvo = efetivo.filter((r) => r.evento_id === eventoId && r.classificacao === c && r.valor !== valor);
      alvo.forEach((r) => (r.valor = valor));
      return alvo.length;
    },
    async historico(eventoId) {
      await wait();
      return historico.filter((h) => (eventoId ? h.evento_id === eventoId : h.evento_id === null));
    },
  },
  membros: {
    async list() {
      await wait();
      return [...membros];
    },
    async criar(input) {
      await wait(400);
      if (membros.some((m) => m.login === input.login)) throw new AppError("Esse usuário já existe");
      membros.push({ user_id: uid(), nome: input.nome, login: input.login, email: input.email || null, papel: input.papel, ativo: true, created_at: now() });
    },
    async update(userId, patch) {
      await wait();
      Object.assign(membros.find((m) => m.user_id === userId)!, patch);
    },
    async definirSenha() {
      await wait(300);
    },
    async definirLogin(userId, login) {
      await wait(300);
      if (membros.some((m) => m.login === login && m.user_id !== userId)) throw new AppError("Esse usuário já existe");
      membros.find((m) => m.user_id === userId)!.login = login;
    },
  },
};
