import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppError, type Api } from "./api";
import { api as impl } from "./api-impl";
import type { AuthUser, Membro } from "./types";

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
      } catch {
        if (alive) setState({ loading: false, user, membro: null, isAdmin: false });
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
