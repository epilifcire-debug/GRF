import { useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Info, Lock, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HistoricoValores } from "@/components/HistoricoValores";
import { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoading, Spinner } from "@/components/ui/spinner";
import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import { api, qk, toastErr, useSession, useValores } from "@/lib/data";
import { brl, cn, parseMoney } from "@/lib/utils";

const paraCampo = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export default function Valores() {
  const { isAdmin } = useSession();
  const { data: valores, isLoading } = useValores();
  const qc = useQueryClient();
  const [campos, setCampos] = useState<Partial<Record<Classificacao, string>>>({});
  const [salvando, setSalvando] = useState<Classificacao | null>(null);

  useEffect(() => {
    if (valores) setCampos(Object.fromEntries(valores.map((v) => [v.classificacao, paraCampo(v.valor)])));
  }, [valores]);

  if (isLoading) return <PageLoading />;

  const atual = (c: Classificacao) => valores?.find((v) => v.classificacao === c)?.valor ?? null;

  const salvar = async (c: Classificacao) => {
    const texto = (campos[c] ?? "").trim();
    const novo = texto ? parseMoney(texto) : null;
    if (texto && (!novo || novo <= 0)) return toast.error("Informe um valor maior que zero.");
    if (!texto && c !== "especial") return toast.error("Essa classificação precisa de um valor.");
    if (novo === atual(c)) return;
    setSalvando(c);
    try {
      await api.valores.update(c, novo);
      qc.invalidateQueries({ queryKey: qk.valores });
      qc.invalidateQueries({ queryKey: qk.historico() });
      toast.success("Valor atualizado", {
        description: "Vale para as próximas escalações. Quem já está escalado mantém o valor — ajuste em cada evento, na aba Valores.",
      });
    } catch (e) {
      toastErr(e);
    } finally {
      setSalvando(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Valores" description="Quanto se paga por classificação. Reajustes feitos aqui valem para todos os eventos que não têm valor próprio." />

      <div className="mb-5 flex gap-3 rounded-xl border border-gold/30 bg-accent/60 p-4 text-sm text-accent-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Mudar um valor aqui <strong>não altera</strong> o que já foi lançado nos eventos (o relatório antigo continua correto). Para um evento ter valores
          diferentes ou receber o reajuste, abra o evento e use a aba <strong>Valores</strong>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CircleDollarSign className="h-4 w-4 text-gold-dark" /> Tabela padrão
            </p>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> só o administrador altera
              </span>
            )}
          </div>
          <ul className="divide-y">
            {CLASSIFICACOES.map((c) => {
              const v = atual(c.id);
              const mudou = paraCampo(v) !== (campos[c.id] ?? "");
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.code ? `Caixa ${c.code} no relatório` : `Aparece como “${c.tag}” no relatório`}
                    </p>
                  </div>
                  {isAdmin ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        salvar(c.id);
                      }}
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                        <Input
                          aria-label={`Valor ${c.label}`}
                          inputMode="decimal"
                          className="h-9 w-32 pl-9 text-right tabular-nums"
                          value={campos[c.id] ?? ""}
                          placeholder={c.id === "especial" ? "livre" : "0,00"}
                          onChange={(e) => setCampos({ ...campos, [c.id]: e.target.value })}
                        />
                      </div>
                      <Button type="submit" size="icon" aria-label={`Salvar ${c.label}`} disabled={!mudou || salvando === c.id} className={cn(!mudou && "opacity-40")}>
                        {salvando === c.id ? <Spinner /> : <Save />}
                      </Button>
                    </form>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">{v != null ? brl(v) : "valor livre"}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            Especial pode ficar sem valor (“livre”): o valor é informado na hora de escalar a pessoa.
          </p>
        </Card>

        <div className="lg:col-span-2">
          <HistoricoValores />
        </div>
      </div>
    </div>
  );
}
