import { useCallback, useEffect, useMemo, useState } from "react";
import type { PixType } from "./pix";
import { uid } from "./utils";

/* ---------- Classificações ---------- */
export type Classification = "apoio" | "vigilante" | "grandes_eventos" | "lider" | "especial";

export interface ClassificationInfo {
  id: Classification;
  label: string;
  short: string;
  /** Código usado nas caixas do relatório (GE / VG / AP) */
  code: "AP" | "VG" | "GE" | "LD" | "ES";
  defaultValue: number | null;
  badge: string;
  dot: string;
}

export const CLASSIFICATIONS: ClassificationInfo[] = [
  { id: "apoio", label: "Apoio", short: "Apoio", code: "AP", defaultValue: 110, badge: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  { id: "vigilante", label: "Curso Vigilante", short: "Vigilante", code: "VG", defaultValue: 120, badge: "bg-blue-100 text-blue-800 ring-blue-200", dot: "bg-blue-500" },
  { id: "grandes_eventos", label: "Curso Grandes Eventos", short: "Grandes Eventos", code: "GE", defaultValue: 130, badge: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  { id: "lider", label: "Líder", short: "Líder", code: "LD", defaultValue: 150, badge: "bg-pink-100 text-pink-800 ring-pink-200", dot: "bg-pink-500" },
  { id: "especial", label: "Especial", short: "Especial", code: "ES", defaultValue: null, badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
];

export const CLASS_MAP = Object.fromEntries(CLASSIFICATIONS.map((c) => [c.id, c])) as Record<Classification, ClassificationInfo>;

/** Aceita "Apoio", "AP", "Curso Vigilante", "VG", "GE", "Líder"... */
export function parseClassification(raw: string): Classification | null {
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

/* ---------- Pessoas ---------- */
export interface StaffMember {
  id: string;
  name: string;
  pixKey: string;
  pixType: PixType;
  classification: Classification;
  value: number;
  createdAt: number;
}

export type StaffInput = Omit<StaffMember, "id" | "createdAt">;

/* ---------- Cabeçalho do relatório ---------- */
export interface ReportHeader {
  eventName: string;
  municipality: string;
  date: string; // ISO yyyy-mm-dd
  organizer: string;
  phone: string;
  notes: string;
}

export const EMPTY_HEADER: ReportHeader = {
  eventName: "",
  municipality: "",
  date: "",
  organizer: "",
  phone: "",
  notes: "",
};

/* ---------- Persistência (localStorage) ---------- */
const STAFF_KEY = "grf:staff:v1";
const HEADER_KEY = "grf:report-header:v1";

/** Cópia em memória: o app continua funcionando se o localStorage estiver bloqueado */
const memory = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    memory.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
}

/** Preenche dados de demonstração (usado só no build de preview) */
export function seedIfEmpty(staff: StaffMember[], header: ReportHeader) {
  if (read<StaffMember[]>(STAFF_KEY, []).length === 0) write(STAFF_KEY, staff);
  if (!read<ReportHeader>(HEADER_KEY, EMPTY_HEADER).eventName) write(HEADER_KEY, header);
}

/** Mantém várias abas/telas sincronizadas */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function usePersisted<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => read(key, fallback));

  useEffect(() => {
    const sync = () => setState(read(key, fallback));
    listeners.add(sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      memory.delete(key);
      sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (fn: (prev: T) => T) => {
      const next = fn(read(key, fallback));
      write(key, next);
      emit();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [state, update] as const;
}

export function useStaff() {
  const [staff, setStaff] = usePersisted<StaffMember[]>(STAFF_KEY, []);

  const add = useCallback(
    (input: StaffInput) =>
      setStaff((prev) => [...prev, { ...input, name: input.name.trim(), id: uid(), createdAt: Date.now() }]),
    [setStaff],
  );

  const addMany = useCallback(
    (inputs: StaffInput[]) =>
      setStaff((prev) => [
        ...prev,
        ...inputs.map((i, idx) => ({ ...i, name: i.name.trim(), id: uid(), createdAt: Date.now() + idx })),
      ]),
    [setStaff],
  );

  const update = useCallback(
    (id: string, patch: Partial<StaffInput>) =>
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [setStaff],
  );

  const remove = useCallback((id: string) => setStaff((prev) => prev.filter((s) => s.id !== id)), [setStaff]);
  const clear = useCallback(() => setStaff(() => []), [setStaff]);

  const summary = useMemo(() => summarize(staff), [staff]);

  return { staff, add, addMany, update, remove, clear, summary };
}

export function useReportHeader() {
  const [header, setHeader] = usePersisted<ReportHeader>(HEADER_KEY, EMPTY_HEADER);
  const set = useCallback(
    (patch: Partial<ReportHeader>) => setHeader((prev) => ({ ...EMPTY_HEADER, ...prev, ...patch })),
    [setHeader],
  );
  const reset = useCallback(() => setHeader(() => EMPTY_HEADER), [setHeader]);
  return { header: { ...EMPTY_HEADER, ...header }, set, reset };
}

export function summarize(list: StaffMember[]) {
  const byType = CLASSIFICATIONS.map((c) => {
    const items = list.filter((s) => s.classification === c.id);
    return { ...c, count: items.length, total: items.reduce((a, s) => a + (s.value || 0), 0) };
  });
  return {
    count: list.length,
    total: list.reduce((a, s) => a + (s.value || 0), 0),
    byType,
  };
}

/** Ordena por nome (pt-BR), usado na lista e no relatório */
export const byName = (a: StaffMember, b: StaffMember) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
