import { Download, FileDown, Pencil, Save, Search, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClassificationSelect } from "@/components/ClassificationSelect";
import { PageHeader } from "@/components/Layout";
import { ClassBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { CSV_TEMPLATE, downloadText, parseStaffCSV, staffToCSV } from "@/lib/csv";
import { detectPixType, formatPix } from "@/lib/pix";
import { byName, CLASS_MAP, useStaff, type Classification, type StaffMember } from "@/lib/staff";
import { brl, cn, parseMoney } from "@/lib/utils";

type Filter = Classification | "todos";

interface Draft {
  name: string;
  pixKey: string;
  classification: Classification;
  value: string;
}

const toDraft = (s: StaffMember): Draft => ({
  name: s.name,
  pixKey: s.pixKey,
  classification: s.classification,
  value: String(s.value).replace(".", ","),
});

export default function Equipe() {
  const { staff, update, remove, clear, addMany, summary } = useStaff();
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...staff]
      .sort(byName)
      .filter((s) => filter === "todos" || s.classification === filter)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.pixKey.toLowerCase().includes(q));
  }, [staff, filter, query]);

  const filteredTotal = list.reduce((a, s) => a + s.value, 0);

  const startEdit = (s: StaffMember) => {
    setEditingId(s.id);
    setDraft(toDraft(s));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    if (!editingId || !draft) return;
    const value = parseMoney(draft.value);
    if (draft.name.trim().length < 3 || !draft.pixKey.trim() || value <= 0) {
      toast.error("Confira nome, chave PIX e valor.");
      return;
    }
    const pixType = detectPixType(draft.pixKey);
    update(editingId, {
      name: draft.name.trim(),
      pixKey: formatPix(draft.pixKey, pixType),
      pixType,
      classification: draft.classification,
      value,
    });
    toast.success("Cadastro atualizado");
    cancelEdit();
  };
  const changeDraftClass = (c: Classification) =>
    setDraft((d) => d && { ...d, classification: c, value: CLASS_MAP[c].defaultValue != null ? String(CLASS_MAP[c].defaultValue) : d.value });

  const onImport = async (file: File) => {
    const { rows, errors } = parseStaffCSV(await file.text());
    if (rows.length) {
      addMany(rows);
      toast.success(`${rows.length} pessoas importadas`);
    }
    if (errors.length) toast.warning(`${errors.length} aviso(s) na importação`, { description: errors.slice(0, 4).join("\n") });
    if (!rows.length && !errors.length) toast.error("Nenhuma linha encontrada.");
  };

  const editingKeys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Equipe"
        description="Efetivo cadastrado, totais por classificação e edição rápida."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> Importar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadText("modelo-grf-equipe.csv", CSV_TEMPLATE)}>
              <FileDown /> Modelo
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!staff.length}
              onClick={() => downloadText("grf-equipe.csv", staffToCSV([...staff].sort(byName)))}
            >
              <Download /> Exportar
            </Button>
            <ConfirmDialog
              title="Apagar toda a equipe?"
              description={`Os ${staff.length} cadastros serão removidos deste navegador. Essa ação não pode ser desfeita — exporte o CSV antes se quiser guardar.`}
              confirmLabel="Apagar tudo"
              onConfirm={() => {
                clear();
                toast.success("Equipe apagada");
              }}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" disabled={!staff.length}>
                  <Trash2 /> Limpar
                </Button>
              }
            />
          </>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          active={filter === "todos"}
          onClick={() => setFilter("todos")}
          label="Total geral"
          count={summary.count}
          total={summary.total}
          dark
        />
        {summary.byType.map((t) => (
          <SummaryCard
            key={t.id}
            active={filter === t.id}
            onClick={() => setFilter(filter === t.id ? "todos" : t.id)}
            label={t.short}
            count={t.count}
            total={t.total}
            dot={t.dot}
          />
        ))}
      </div>

      {/* Busca */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou PIX" className="pl-9" />
        </div>
        <p className="text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "pessoa" : "pessoas"} · <span className="font-semibold text-foreground">{brl(filteredTotal)}</span>
          {filter !== "todos" && (
            <button onClick={() => setFilter("todos")} className="ml-2 text-xs font-medium text-gold-dark underline">
              limpar filtro
            </button>
          )}
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="mt-4 p-10 text-center text-sm text-muted-foreground">
          {staff.length ? "Nenhum resultado para esse filtro." : "Nenhuma pessoa cadastrada ainda. Cadastre na tela Cadastro ou importe um CSV."}
        </Card>
      ) : (
        <>
          {/* Tabela (desktop) */}
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sidebar text-left text-xs uppercase tracking-wider text-sidebar-foreground/80">
                  <tr>
                    <th className="w-12 px-4 py-3">Nº</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="w-52 px-4 py-3">Classificação</th>
                    <th className="w-32 px-4 py-3 text-right">Valor</th>
                    <th className="w-28 px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="zebra">
                  {list.map((s, i) => {
                    const editing = editingId === s.id && draft;
                    return (
                      <tr key={s.id} className={cn("border-t align-middle transition-colors", editing && "!bg-accent/60")}>
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        {editing ? (
                          <>
                            <td className="px-2 py-1.5">
                              <Input autoFocus className="h-9" value={draft.name} onKeyDown={editingKeys} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-9" value={draft.pixKey} onKeyDown={editingKeys} onChange={(e) => setDraft({ ...draft, pixKey: e.target.value })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <ClassificationSelect compact value={draft.classification} onChange={changeDraftClass} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input className="h-9 text-right" inputMode="decimal" value={draft.value} onKeyDown={editingKeys} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="icon" aria-label="Salvar" onClick={saveEdit}>
                                  <Save />
                                </Button>
                                <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={cancelEdit}>
                                  <X />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 font-medium">{s.name}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{s.pixKey}</td>
                            <td className="px-4 py-2.5">
                              <ClassBadge value={s.classification} />
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{brl(s.value)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <RowActions s={s} onEdit={() => startEdit(s)} onRemove={() => remove(s.id)} />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/60 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      Total {filter !== "todos" ? `· ${CLASS_MAP[filter].short}` : ""} — {list.length} pessoas
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(filteredTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Cartões (mobile) */}
          <ul className="mt-4 grid gap-2 md:hidden">
            {list.map((s, i) => {
              const editing = editingId === s.id && draft;
              return (
                <Card key={s.id} className={cn("p-4", i % 2 === 1 && "bg-muted/40", editing && "ring-2 ring-gold")}>
                  {editing ? (
                    <div className="grid gap-2">
                      <Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome" />
                      <Input value={draft.pixKey} onChange={(e) => setDraft({ ...draft, pixKey: e.target.value })} placeholder="Chave PIX" />
                      <div className="grid grid-cols-2 gap-2">
                        <ClassificationSelect compact value={draft.classification} onChange={changeDraftClass} />
                        <Input inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={saveEdit}>
                          <Save /> Salvar
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nº {i + 1}</p>
                        <p className="font-medium">{s.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.pixKey}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <ClassBadge value={s.classification} />
                          <span className="text-sm font-semibold">{brl(s.value)}</span>
                        </div>
                      </div>
                      <RowActions s={s} onEdit={() => startEdit(s)} onRemove={() => remove(s.id)} />
                    </div>
                  )}
                </Card>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function RowActions({ s, onEdit, onRemove }: { s: StaffMember; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button size="icon" variant="ghost" aria-label={`Editar ${s.name}`} onClick={onEdit}>
        <Pencil />
      </Button>
      <ConfirmDialog
        title="Excluir cadastro?"
        description={`${s.name} será removido(a) da equipe.`}
        confirmLabel="Excluir"
        onConfirm={() => {
          onRemove();
          toast.success("Cadastro excluído");
        }}
        trigger={
          <Button size="icon" variant="ghost" aria-label={`Excluir ${s.name}`} className="text-destructive hover:bg-destructive/10">
            <Trash2 />
          </Button>
        }
      />
    </div>
  );
}

function SummaryCard({
  label,
  count,
  total,
  active,
  onClick,
  dot,
  dark,
}: {
  label: string;
  count: number;
  total: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        dark ? "border-sidebar bg-sidebar text-sidebar-foreground" : "bg-card",
        active && "ring-2 ring-gold ring-offset-2 ring-offset-background",
      )}
    >
      <p className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wider", dark ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
        {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{count}</p>
      <p className={cn("text-sm font-semibold tabular-nums", dark ? "text-gold" : "text-foreground/80")}>{brl(total)}</p>
    </button>
  );
}
