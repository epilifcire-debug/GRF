import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppError, type Api } from "./api";
import { api as impl } from "./api-impl";
import { type Classificacao, valorPadrao } from "./classificacao";
import type { AuthUser, Membro, ValorDe } from "./types";

/** Produção usa o Supabase; o build de preview usa dados em memória (ver vite.config.ts) */
export const api: Api = impl;

export const errMsg = (e: unknown) => (e instanceof AppError ? e.message : "Algo deu errado. Tente de novo.");
export const toastErr = (e: unknown) => toast.error(errMsg(e));

/* ---------------- Sessão ---------------- */
interface Session {
  loading: boolean;
  user: AuthUser | null;
  membro: Membro | null;
  isAdmin: boolean;
  /** Falha ao consultar o cadastro de membro (diferente de "não cadastrado") */
  erro?: string;
}
const SessionCtx = createContext<Session>({ loading: true, user: null, membro: null, isAdmin: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session>({ loading: true, user: null, membro: null, isAdmin: false });
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    const load = async (user: AuthUser | null) => {
      if (!user) {
        qc.clear();
        if (alive) setState({ loading: false, user: null, membro: null, isAdmin: false });
        return;
      }
      try {
        const membro = await api.auth.membro(user.id);
        if (alive) setState({ loading: false, user, membro, isAdmin: !!membro?.ativo && membro.papel === "admin" });
      } catch (e) {
        if (alive) setState({ loading: false, user, membro: null, isAdmin: false, erro: e instanceof Error ? e.message : String(e) });
      }
    };
    api.auth.getUser().then(load);
    const off = api.auth.onChange((u) => {
      setState((s) => (s.user?.id === u?.id && !s.loading ? s : { ...s, loading: true }));
      load(u);
    });
    return () => {
      alive = false;
      off();
    };
  }, [qc]);

  return createElement(SessionCtx.Provider, { value: state }, children);
}

export const useSession = () => useContext(SessionCtx);

/* ---------------- Consultas ---------------- */
export const qk = {
  valores: ["valores"] as const,
  valoresEvento: (id: string) => ["valores-evento", id] as const,
  historico: (id?: string) => ["historico-valores", id ?? "padrao"] as const,
  eventos: ["eventos"] as const,
  evento: (id: string) => ["evento", id] as const,
  efetivo: (id: string) => ["efetivo", id] as const,
  pessoas: ["pessoas"] as const,
  membros: ["membros"] as const,
};

export const useEventos = () => useQuery({ queryKey: qk.eventos, queryFn: api.eventos.list });
export const useEvento = (id: string) => useQuery({ queryKey: qk.evento(id), queryFn: () => api.eventos.get(id) });
export const useEfetivo = (id: string) => useQuery({ queryKey: qk.efetivo(id), queryFn: () => api.efetivo.list(id) });
export const usePessoas = () => useQuery({ queryKey: qk.pessoas, queryFn: api.pessoas.list });
export const useMembros = () => useQuery({ queryKey: qk.membros, queryFn: api.membros.list });
export const useValores = () => useQuery({ queryKey: qk.valores, queryFn: api.valores.list });
export const useValoresEvento = (id: string) => useQuery({ queryKey: qk.valoresEvento(id), queryFn: () => api.valores.doEvento(id) });
export const useHistoricoValores = (id?: string) => useQuery({ queryKey: qk.historico(id), queryFn: () => api.valores.historico(id) });

/**
 * Valor de cada classificação: valor do evento (se houver) → tabela padrão.
 * Sem eventoId, só a tabela padrão. Antes de carregar, usa os valores iniciais.
 */
export function useValorDe(eventoId?: string): ValorDe {
  const { data: padrao } = useValores();
  const { data: doEvento } = useQuery({
    queryKey: qk.valoresEvento(eventoId ?? "-"),
    queryFn: () => (eventoId ? api.valores.doEvento(eventoId) : Promise.resolve([])),
    enabled: !!eventoId,
  });
  return useMemo(() => {
    const p = new Map((padrao ?? []).map((v) => [v.classificacao, v.valor]));
    const e = new Map((doEvento ?? []).map((v) => [v.classificacao, v.valor]));
    return (c: Classificacao) => e.get(c) ?? (p.has(c) ? p.get(c)! : valorPadrao(c));
  }, [padrao, doEvento]);
}

/** Mutação com tratamento de erro padrão e invalidação das chaves informadas */
export function useAction<TArgs, TResult = unknown>(
  fn: (args: TArgs) => Promise<TResult>,
  invalidate: (args: TArgs) => readonly (readonly unknown[])[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onError: toastErr,
    onSettled: (_d, _e, args) => invalidate(args).forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}
