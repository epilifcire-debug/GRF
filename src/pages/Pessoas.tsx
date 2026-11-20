import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/Layout";
import { PessoaForm } from "@/components/PessoaForm";
import { ClassBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/spinner";
import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import { api, qk, toastErr, usePessoas } from "@/lib/data";
import type { Pessoa, PessoaInput } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filtro = Classificacao | "todos";

export default function Pessoas() {
  const { data: pessoas = [], isLoading } = usePessoas();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState<Pessoa | null>(null);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return pessoas
      .filter((p) => filtro === "todos" || p.classificacao === filtro)
      .filter((p) => !s || p.nome.toLowerCase().includes(s) || p.pix_chave.toLowerCase().includes(s));
  }, [pessoas, q, filtro]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.pessoas });
    qc.invalidateQueries({ queryKey: ["efetivo"] });
  };

  const criar = async ({ valor: _v, ...input }: PessoaInput & { valor: number }) => {
    try {
      await api.pessoas.create(input);
      invalidate();
      toast.success(`${input.nome} cadastrado(a)`);
    } catch (e) {
      toastErr(e);
      throw e;
    }
  };

  const salvar = async ({ valor: _v, ...input }: PessoaInput & { valor: number }) => {
    if (!editando) return;
    try {
      await api.pessoas.update(editando.id, input);
      invalidate();
      toast.success("Cadastro atualizado");
      setEditando(null);
    } catch (e) {
      toastErr(e);
      throw e;
    }
  };

  const excluir = async (p: Pessoa) => {
    try {
      await api.pessoas.remove(p.id);
      invalidate();
      toast.success(`${p.nome} excluído(a)`);
    } catch (e) {
      toastErr(e);
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pessoas"
        description="Cadastro único do pessoal. Nos eventos, basta buscar e adicionar."
        actions={
          <Button size="lg" onClick={() => setNova(true)}>
            <UserPlus /> Nova pessoa
          </Button>
        }
      />

      {pessoas.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma pessoa cadastrada"
          text="Cadastre aqui ou importe uma planilha CSV dentro de um evento — as pessoas entram no cadastro automaticamente."
          action={
            <Button onClick={() => setNova(true)}>
              <UserPlus /> Cadastrar pessoa
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou PIX" className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "todos" as const, short: "Todos", dot: "" }, ...CLASSIFICACOES].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFiltro(c.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filtro === c.id ? "border-sidebar bg-sidebar text-gold" : "bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.dot && <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />}
                  {c.short}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground sm:ml-auto">{lista.length} pessoas</p>
          </div>

          {lista.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum resultado.</p>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {lista.map((p, i) => (
                  <li key={p.id} className={cn("flex items-center gap-3 px-4 py-3", i % 2 === 1 && "bg-muted/40")}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar font-display text-sm font-semibold text-gold">
                      {p.nome
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.pix_chave}</p>
                    </div>
                    <ClassBadge value={p.classificacao} className="hidden sm:inline-flex" />
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Editar ${p.nome}`} onClick={() => setEditando(p)}>
                        <Pencil />
                      </Button>
                      <ConfirmDialog
                        title="Excluir do cadastro?"
                        description={`${p.nome} será excluído(a). Só é possível se não estiver em nenhum evento.`}
                        confirmLabel="Excluir"
                        onConfirm={() => excluir(p)}
                        trigger={
                          <Button size="icon" variant="ghost" aria-label={`Excluir ${p.nome}`} className="text-destructive hover:bg-destructive/10">
                            <Trash2 />
                          </Button>
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <Dialog open={nova} onOpenChange={setNova}>
        <DialogContent title="Nova pessoa" description="A classificação padrão é sugerida quando ela entra num evento.">
          <PessoaForm existentes={pessoas} onSubmit={criar} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        {editando && (
          <DialogContent title="Editar pessoa" description="Nome e PIX mudam em todos os eventos e relatórios.">
            <PessoaForm key={editando.id} existentes={pessoas} ignorarId={editando.id} inicial={editando} submitLabel="Salvar" onSubmit={salvar} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
