import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HistoricoValores } from "@/components/HistoricoValores";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CLASS_MAP, CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import { api, qk, toastErr, useValores, useValoresEvento } from "@/lib/data";
import type { EfetivoItem } from "@/lib/types";
import { brl, cn, parseMoney } from "@/lib/utils";

const paraCampo = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

interface Pendente {
  c: Classificacao;
  valor: number;
  qtd: number;
}

export function ValoresEvento({ eventoId, itens, refresh }: { eventoId: string; itens: EfetivoItem[]; refresh: () => void }) {
  const { data: padrao = [] } = useValores();
  const { data: doEvento = [] } = useValoresEvento(eventoId);
  const qc = useQueryClient();
  const [campos, setCampos] = useState<Partial<Record<Classificacao, string>>>({});
  const [salvando, setSalvando] = useState<Classificacao | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    setCampos(Object.fromEntries(doEvento.map((v) => [v.classificacao, paraCampo(v.valor)])));
  }, [doEvento]);

  const valorPadrao = (c: Classificacao) => padrao.find((v) => v.classificacao === c)?.valor ?? null;
  const valorEvento = (c: Classificacao) => doEvento.find((v) => v.classificacao === c)?.valor ?? null;
  const vigente = (c: Classificacao) => valorEvento(c) ?? valorPadrao(c);

  const resumo = useMemo(
    () =>
      Object.fromEntries(
        CLASSIFICACOES.map((c) => {
          const r = itens.filter((i) => i.classificacao === c.id);
          const v = vigente(c.id);
          return [c.id, { total: r.length, diferentes: v == null ? 0 : r.filter((i) => i.valor !== v).length }];
        }),
      ) as Record<Classificacao, { total: number; diferentes: number }>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, padrao, doEvento],
  );

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: qk.valoresEvento(eventoId) });
    qc.invalidateQueries({ queryKey: qk.historico(eventoId) });
  };

  const salvar = async (c: Classificacao, limpar = false) => {
    const texto = limpar ? "" : (campos[c] ?? "").trim();
    const novo = texto ? parseMoney(texto) : null;
    if (texto && (!novo || novo <= 0)) return toast.error("Informe um valor maior que zero.");
    if (novo === valorEvento(c)) return;
    setSalvando(c);
    try {
      await api.valores.definirNoEvento(eventoId, c, novo);
      invalidar();
      const efetivo = novo ?? valorPadrao(c);
      toast.success(novo == null ? `${CLASS_MAP[c].short}: voltou ao valor padrão` : `${CLASS_MAP[c].short}: ${brl(novo)} neste evento`);
      const qtd = efetivo == null ? 0 : itens.filter((i) => i.classificacao === c && i.valor !== efetivo).length;
      if (efetivo != null && qtd > 0) setPendente({ c, valor: efetivo, qtd });
    } catch (e) {
      toastErr(e);
    } finally {
      setSalvando(null);
    }
  };

  const aplicar = async () => {
    if (!pendente) return;
    setAplicando(true);
    try {
      const n = await api.valores.aplicarNoEfetivo(eventoId, pendente.c, pendente.valor);
      toast.success(`${n} ${n === 1 ? "pessoa atualizada" : "pessoas atualizadas"} para ${brl(pendente.valor)}`);
      refresh();
      setPendente(null);
    } catch (e) {
      toastErr(e);
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="overflow-hidden lg:col-span-3">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Valores deste evento</p>
          <p className="text-xs text-muted-foreground">Deixe em branco para usar o valor padrão. O valor vigente é o sugerido ao escalar pessoas.</p>
        </div>

        <div className="hidden grid-cols-[1fr_6rem_9.5rem_7rem] gap-3 border-b bg-muted/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
          <span>Classificação</span>
          <span className="text-right">Padrão</span>
          <span className="text-right">Neste evento</span>
          <span className="text-right">Escalados</span>
        </div>

        <ul className="divide-y">
          {CLASSIFICACOES.map((c) => {
            const pv = valorPadrao(c.id);
            const ev = valorEvento(c.id);
            const mudou = paraCampo(ev) !== (campos[c.id] ?? "");
            const r = resumo[c.id];
            return (
              <li key={c.id} className="grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_6rem_9.5rem_9rem]">
                <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                  <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
                  <span className="text-sm font-medium">{c.label}</span>
                  {ev != null && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-dark">próprio</span>}
                </div>
                <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
                  <span className="sm:hidden">Padrão: </span>
                  {pv != null ? brl(pv) : "livre"}
                </span>
                <form
                  className="flex items-center justify-end gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    salvar(c.id);
                  }}
                >
                  <Input
                    aria-label={`Valor de ${c.label} neste evento`}
                    inputMode="decimal"
                    className={cn("h-9 w-24 text-right tabular-nums", ev != null && "border-gold/60")}
                    placeholder="padrão"
                    value={campos[c.id] ?? ""}
                    onChange={(e) => setCampos({ ...campos, [c.id]: e.target.value })}
                  />
                  {mudou ? (
                    <Button type="submit" size="icon" className="h-9 w-9" aria-label="Salvar" disabled={salvando === c.id}>
                      {salvando === c.id ? <Spinner /> : <Save />}
                    </Button>
                  ) : ev != null ? (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="Voltar ao valor padrão" aria-label="Voltar ao valor padrão" onClick={() => salvar(c.id, true)}>
                      <RotateCcw />
                    </Button>
                  ) : (
                    <span className="w-9" />
                  )}
                </form>
                <div className="col-span-2 flex items-center justify-end gap-2 text-sm sm:col-span-1">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {r.total}
                  </span>
                  {r.diferentes > 0 && (
                    <button
                      type="button"
                      onClick={() => setPendente({ c: c.id, valor: vigente(c.id)!, qtd: r.diferentes })}
                      className="whitespace-nowrap rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200"
                      title="Há pessoas escaladas com valor diferente do vigente"
                    >
                      {r.diferentes} diferente{r.diferentes > 1 && "s"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="lg:col-span-2">
        <HistoricoValores eventoId={eventoId} />
      </div>

      <Dialog open={!!pendente} onOpenChange={(o) => !o && setPendente(null)}>
        {pendente && (
          <DialogContent
            title="Atualizar quem já está escalado?"
            description={`${pendente.qtd} ${pendente.qtd === 1 ? "pessoa escalada" : "pessoas escaladas"} como ${CLASS_MAP[pendente.c].label} neste evento ${
              pendente.qtd === 1 ? "está" : "estão"
            } com valor diferente de ${brl(pendente.valor)}.`}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={aplicar} disabled={aplicando}>
                {aplicando && <Spinner />} Aplicar {brl(pendente.valor)} a todas
              </Button>
              <Button variant="outline" onClick={() => setPendente(null)}>
                Manter como está
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Quem tem valor ajustado individualmente também será atualizado.</p>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
