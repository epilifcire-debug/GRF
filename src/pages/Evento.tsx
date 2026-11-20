import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Download, FileDown, FileText, Pencil, Plus, Save, Search, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ClassificationSelect } from "@/components/ClassificationSelect";
import { EventoForm } from "@/components/EventoForm";
import { EmptyState, PageHeader } from "@/components/Layout";
import { PessoaForm } from "@/components/PessoaForm";
import { ClassBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoading, Spinner } from "@/components/ui/spinner";
import { importarParaEvento } from "@/lib/api";
import { CLASS_MAP, CLASSIFICACOES, type Classificacao, valorPadrao } from "@/lib/classificacao";
import { CSV_TEMPLATE, downloadText, efetivoToCSV, parseCSV } from "@/lib/csv";
import { api, qk, toastErr, useEfetivo, useEvento, usePessoas } from "@/lib/data";
import type { EfetivoItem, EventoInput, Pessoa } from "@/lib/types";
import { brl, cn, formatDateBR, parseMoney } from "@/lib/utils";
import { RelatorioEvento } from "./RelatorioEvento";

type Filtro = Classificacao | "todos";

export default function Evento() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") === "relatorio" ? "relatorio" : "efetivo";
  const { data: evento, isLoading } = useEvento(id);
  const { data: itens = [], isLoading: loadingEf } = useEfetivo(id);
  const [editar, setEditar] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.efetivo(id) });
    qc.invalidateQueries({ queryKey: qk.eventos });
  };

  if (isLoading || loadingEf) return <PageLoading />;
  if (!evento)
    return (
      <EmptyState
        icon={CalendarDays}
        title="Evento não encontrado"
        text="Ele pode ter sido excluído por outro usuário."
        action={
          <Button asChild variant="outline">
            <Link to="/">Voltar para eventos</Link>
          </Button>
        }
      />
    );

  const salvarEvento = async (data: EventoInput) => {
    try {
      await api.eventos.update(id, data);
      qc.invalidateQueries({ queryKey: qk.evento(id) });
      qc.invalidateQueries({ queryKey: qk.eventos });
      toast.success("Evento atualizado");
      setEditar(false);
    } catch (e) {
      toastErr(e);
      throw e;
    }
  };

  const excluir = async () => {
    try {
      await api.eventos.remove(id);
      qc.invalidateQueries({ queryKey: qk.eventos });
      toast.success("Evento excluído");
      navigate("/");
    } catch (e) {
      toastErr(e);
    }
  };

  const total = itens.reduce((a, s) => a + s.valor, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        back={
          <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Eventos
          </Link>
        }
        title={evento.nome}
        description={
          <span>
            {[evento.data && formatDateBR(evento.data), evento.municipio, evento.organizador].filter(Boolean).join(" · ") || "Sem data e local"}
            <span className="ml-2 font-medium text-foreground">
              · {itens.length} pessoas · {brl(total)}
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditar(true)}>
              <Pencil /> Editar evento
            </Button>
            <ConfirmDialog
              title="Excluir evento?"
              description={`“${evento.nome}” e o efetivo dele (${itens.length} pessoas) serão excluídos. As pessoas continuam no cadastro.`}
              confirmLabel="Excluir evento"
              onConfirm={excluir}
              trigger={
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                  <Trash2 /> Excluir
                </Button>
              }
            />
          </>
        }
      />

      <div className="no-print mb-6 inline-flex rounded-lg border bg-card p-1 shadow-sm">
        {[
          { id: "efetivo", label: "Efetivo", icon: Users },
          { id: "relatorio", label: "Relatório", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setParams(t.id === "efetivo" ? {} : { aba: t.id }, { replace: true })}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
              aba === t.id ? "bg-sidebar text-gold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {aba === "efetivo" ? (
        <Efetivo eventoId={id} eventoNome={evento.nome} itens={itens} refresh={refresh} />
      ) : (
        <RelatorioEvento evento={evento} itens={itens} onEditar={() => setEditar(true)} />
      )}

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent title="Editar evento" description="Esses dados aparecem no cabeçalho do relatório.">
          <EventoForm
            inicial={{
              nome: evento.nome,
              municipio: evento.municipio,
              data: evento.data,
              organizador: evento.organizador,
              telefone: evento.telefone,
              observacoes: evento.observacoes,
            }}
            onSubmit={salvarEvento}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ====================================================================== */

function Efetivo({ eventoId, eventoNome, itens, refresh }: { eventoId: string; eventoNome: string; itens: EfetivoItem[]; refresh: () => void }) {
  const { data: pessoas = [] } = usePessoas();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [novaPessoa, setNovaPessoa] = useState(false);
  const [especial, setEspecial] = useState<Pessoa | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ classificacao: Classificacao; valor: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const noEvento = useMemo(() => new Set(itens.map((i) => i.pessoa_id)), [itens]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...itens]
      .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR", { sensitivity: "base" }))
      .filter((s) => filtro === "todos" || s.classificacao === filtro)
      .filter((s) => !q || s.pessoa.nome.toLowerCase().includes(q) || s.pessoa.pix_chave.toLowerCase().includes(q));
  }, [itens, filtro, busca]);

  const resumo = useMemo(
    () =>
      CLASSIFICACOES.map((c) => {
        const r = itens.filter((s) => s.classificacao === c.id);
        return { ...c, count: r.length, total: r.reduce((a, s) => a + s.valor, 0) };
      }),
    [itens],
  );
  const totalGeral = itens.reduce((a, s) => a + s.valor, 0);
  const totalFiltrado = lista.reduce((a, s) => a + s.valor, 0);

  /* ---- ações ---- */
  const adicionar = async (p: Pessoa, valor?: number) => {
    const v = valor ?? valorPadrao(p.classificacao);
    if (v == null) {
      setEspecial(p);
      return;
    }
    try {
      await api.efetivo.add(eventoId, p.id, p.classificacao, v);
      toast.success(`${p.nome} adicionado(a)`);
      refresh();
    } catch (e) {
      toastErr(e);
    }
  };

  const criarEAdicionar = async (data: Parameters<typeof api.pessoas.create>[0] & { valor: number }) => {
    try {
      const { valor, ...input } = data;
      const p = await api.pessoas.create(input);
      await api.efetivo.add(eventoId, p.id, p.classificacao, valor);
      qc.invalidateQueries({ queryKey: qk.pessoas });
      toast.success(`${p.nome} cadastrado(a) e adicionado(a)`);
      refresh();
    } catch (e) {
      toastErr(e);
      throw e;
    }
  };

  const salvarEdicao = async () => {
    if (!editId || !draft) return;
    const valor = parseMoney(draft.valor);
    if (valor <= 0) return toast.error("Informe um valor maior que zero.");
    setSavingId(editId);
    try {
      await api.efetivo.update(editId, { classificacao: draft.classificacao, valor });
      refresh();
      setEditId(null);
      setDraft(null);
    } catch (e) {
      toastErr(e);
    } finally {
      setSavingId(null);
    }
  };

  const remover = async (s: EfetivoItem) => {
    try {
      await api.efetivo.remove(s.id);
      toast.success(`${s.pessoa.nome} removido(a) do evento`);
      refresh();
    } catch (e) {
      toastErr(e);
    }
  };

  const importar = async (file: File) => {
    const { rows, errors } = parseCSV(await file.text());
    if (!rows.length) {
      toast.error(errors[0] ?? "Nenhuma linha válida no arquivo.");
      return;
    }
    setImportando(true);
    try {
      const r = await importarParaEvento(api, eventoId, rows);
      qc.invalidateQueries({ queryKey: qk.pessoas });
      refresh();
      toast.success(`${r.adicionados} pessoas adicionadas ao evento`, {
        description: [r.pessoasCriadas && `${r.pessoasCriadas} novas no cadastro`, r.jaNoEvento && `${r.jaNoEvento} já estavam no evento`].filter(Boolean).join(" · ") || undefined,
      });
      if (errors.length) toast.warning(`${errors.length} linha(s) com aviso`, { description: errors.slice(0, 4).join("\n") });
    } catch (e) {
      toastErr(e);
      refresh();
    } finally {
      setImportando(false);
    }
  };

  const startEdit = (s: EfetivoItem) => {
    setEditId(s.id);
    setDraft({ classificacao: s.classificacao, valor: String(s.valor).replace(".", ",") });
  };
  const changeDraftClass = (c: Classificacao) =>
    setDraft((d) => d && { classificacao: c, valor: valorPadrao(c) != null ? String(valorPadrao(c)) : d.valor });
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") salvarEdicao();
    if (e.key === "Escape") setEditId(null);
  };

  const nomeArquivo = eventoNome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase();

  return (
    <div>
      {/* Adicionar */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex-1">
            <AdicionarPessoa pessoas={pessoas} noEvento={noEvento} onPick={adicionar} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setNovaPessoa(true)}>
              <UserPlus /> Nova pessoa
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importando}>
              {importando ? <Spinner /> : <Upload />} Importar CSV
            </Button>
            <Button variant="ghost" size="icon" title="Baixar modelo de CSV" aria-label="Baixar modelo de CSV" onClick={() => downloadText("modelo-grf-efetivo.csv", CSV_TEMPLATE)}>
              <FileDown />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Exportar efetivo em CSV"
              aria-label="Exportar efetivo em CSV"
              disabled={!itens.length}
              onClick={() => downloadText(`grf-${nomeArquivo}.csv`, efetivoToCSV(lista))}
            >
              <Download />
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ResumoCard active={filtro === "todos"} onClick={() => setFiltro("todos")} label="Total geral" count={itens.length} total={totalGeral} dark />
        {resumo.map((t) => (
          <ResumoCard
            key={t.id}
            active={filtro === t.id}
            onClick={() => setFiltro(filtro === t.id ? "todos" : t.id)}
            label={t.short}
            count={t.count}
            total={t.total}
            dot={t.dot}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar efetivo por nome ou PIX" className="pl-9" />
        </div>
        <p className="text-sm text-muted-foreground">
          {lista.length} {lista.length === 1 ? "pessoa" : "pessoas"} · <span className="font-semibold text-foreground">{brl(totalFiltrado)}</span>
          {filtro !== "todos" && (
            <button onClick={() => setFiltro("todos")} className="ml-2 text-xs font-medium text-gold-dark underline">
              limpar filtro
            </button>
          )}
        </p>
      </div>

      {itens.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title="Efetivo vazio"
            text="Busque pessoas já cadastradas no campo acima, cadastre uma nova ou importe uma planilha CSV."
            action={
              <Button onClick={() => setNovaPessoa(true)}>
                <Plus /> Adicionar a primeira pessoa
              </Button>
            }
          />
        </div>
      ) : lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum resultado para esse filtro.</p>
      ) : (
        <>
          {/* Tabela desktop */}
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
                  {lista.map((s, i) => {
                    const editing = editId === s.id && draft;
                    return (
                      <tr key={s.id} className={cn("border-t align-middle", editing && "!bg-accent/60")}>
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{s.pessoa.nome}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.pessoa.pix_chave}</td>
                        {editing ? (
                          <>
                            <td className="px-2 py-1.5">
                              <ClassificationSelect compact value={draft.classificacao} onChange={changeDraftClass} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input autoFocus className="h-9 text-right" inputMode="decimal" value={draft.valor} onKeyDown={keys} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} />
                            </td>
                            <td className="px-4 py-1.5 text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="icon" aria-label="Salvar" onClick={salvarEdicao} disabled={savingId === s.id}>
                                  {savingId === s.id ? <Spinner /> : <Save />}
                                </Button>
                                <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditId(null)}>
                                  <X />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5">
                              <ClassBadge value={s.classificacao} />
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{brl(s.valor)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Acoes s={s} onEdit={() => startEdit(s)} onRemove={() => remover(s)} />
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
                      Total {filtro !== "todos" ? `· ${CLASS_MAP[filtro].short}` : ""} — {lista.length} pessoas
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(totalFiltrado)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Cartões mobile */}
          <ul className="mt-4 grid gap-2 md:hidden">
            {lista.map((s, i) => {
              const editing = editId === s.id && draft;
              return (
                <Card key={s.id} className={cn("p-4", i % 2 === 1 && "bg-muted/40", editing && "ring-2 ring-gold")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Nº {i + 1}</p>
                      <p className="font-medium">{s.pessoa.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.pessoa.pix_chave}</p>
                      {!editing && (
                        <div className="mt-2 flex items-center gap-2">
                          <ClassBadge value={s.classificacao} />
                          <span className="text-sm font-semibold">{brl(s.valor)}</span>
                        </div>
                      )}
                    </div>
                    {!editing && <Acoes s={s} onEdit={() => startEdit(s)} onRemove={() => remover(s)} />}
                  </div>
                  {editing && (
                    <div className="mt-3 grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <ClassificationSelect compact value={draft.classificacao} onChange={changeDraftClass} />
                        <Input inputMode="decimal" value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={salvarEdicao} disabled={savingId === s.id}>
                          {savingId === s.id ? <Spinner /> : <Save />} Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setEditId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </ul>
        </>
      )}

      <Dialog open={novaPessoa} onOpenChange={setNovaPessoa}>
        <DialogContent title="Nova pessoa" description="Entra no cadastro geral e já é adicionada a este evento.">
          <PessoaForm existentes={pessoas} comValor submitLabel="Cadastrar e adicionar" onSubmit={criarEAdicionar} />
        </DialogContent>
      </Dialog>

      <ValorEspecial
        pessoa={especial}
        onClose={() => setEspecial(null)}
        onConfirm={async (v) => {
          if (especial) await adicionar(especial, v);
          setEspecial(null);
        }}
      />
    </div>
  );
}

function AdicionarPessoa({ pessoas, noEvento, onPick }: { pessoas: Pessoa[]; noEvento: Set<string>; onPick: (p: Pessoa) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!s) return [];
    const digits = s.replace(/\D/g, "");
    return pessoas
      .filter((p) => !noEvento.has(p.id))
      .filter((p) => {
        const n = p.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return n.includes(s) || p.pix_chave.toLowerCase().includes(s) || (digits.length >= 4 && p.pix_chave.replace(/\D/g, "").includes(digits));
      })
      .slice(0, 8);
  }, [q, pessoas, noEvento]);

  const pick = async (p: Pessoa) => {
    setBusy(p.id);
    await onPick(p);
    setBusy(null);
    setQ("");
    setCursor(0);
  };

  return (
    <div className="relative">
      <Label htmlFor="add-pessoa" className="sr-only">
        Adicionar pessoa cadastrada
      </Label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="add-pessoa"
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setCursor((c) => Math.min(c + 1, results.length - 1));
          if (e.key === "ArrowUp") setCursor((c) => Math.max(c - 1, 0));
          if (e.key === "Enter" && results[cursor]) {
            e.preventDefault();
            pick(results[cursor]);
          }
        }}
        placeholder={`Adicionar pessoa cadastrada — buscar por nome ou PIX (${pessoas.length} no cadastro)`}
        className="h-11 pl-9"
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg animate-fade-in">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Ninguém encontrado fora deste evento. Use “Nova pessoa”.</p>
          ) : (
            <ul>
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(p)}
                    onMouseEnter={() => setCursor(i)}
                    className={cn("flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left", i === cursor && "bg-accent")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.pix_chave}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <ClassBadge value={p.classificacao} />
                      {busy === p.id ? <Spinner /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ValorEspecial({ pessoa, onClose, onConfirm }: { pessoa: Pessoa | null; onClose: () => void; onConfirm: (v: number) => Promise<void> }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const n = parseMoney(v);
  return (
    <Dialog open={!!pessoa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Valor do pagamento" description={`${pessoa?.nome} é classificação Especial: informe o valor para este evento.`}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (n <= 0) return;
            setBusy(true);
            await onConfirm(n);
            setBusy(false);
            setV("");
          }}
        >
          <Input autoFocus inputMode="decimal" placeholder="Ex.: 180" value={v} onChange={(e) => setV(e.target.value)} />
          <Button type="submit" disabled={n <= 0 || busy}>
            {busy && <Spinner />} Adicionar com {brl(n)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Acoes({ s, onEdit, onRemove }: { s: EfetivoItem; onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button size="icon" variant="ghost" aria-label={`Editar ${s.pessoa.nome}`} title="Editar classificação e valor" onClick={onEdit}>
        <Pencil />
      </Button>
      <ConfirmDialog
        title="Remover do evento?"
        description={`${s.pessoa.nome} sai do efetivo deste evento (continua no cadastro de pessoas).`}
        confirmLabel="Remover"
        onConfirm={onRemove}
        trigger={
          <Button size="icon" variant="ghost" aria-label={`Remover ${s.pessoa.nome}`} title="Remover do evento" className="text-destructive hover:bg-destructive/10">
            <Trash2 />
          </Button>
        }
      />
    </div>
  );
}

function ResumoCard({ label, count, total, active, onClick, dot, dark }: { label: string; count: number; total: number; active: boolean; onClick: () => void; dot?: string; dark?: boolean }) {
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
