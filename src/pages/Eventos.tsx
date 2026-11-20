import { CalendarDays, ChevronRight, MapPin, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EventoForm } from "@/components/EventoForm";
import { EmptyState, PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/spinner";
import { api, qk, toastErr, useEventos } from "@/lib/data";
import type { EventoInput } from "@/lib/types";
import { brl, cn, formatDateBR } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const hoje = () => new Date().toISOString().slice(0, 10);

export default function Eventos() {
  const { data: eventos, isLoading, isError, refetch } = useEventos();
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (eventos ?? []).filter((e) => !s || e.nome.toLowerCase().includes(s) || e.municipio.toLowerCase().includes(s) || e.organizador.toLowerCase().includes(s));
  }, [eventos, q]);

  const totais = useMemo(
    () => (eventos ?? []).reduce((a, e) => ({ pessoas: a.pessoas + e.total_pessoas, valor: a.valor + e.valor_total }), { pessoas: 0, valor: 0 }),
    [eventos],
  );

  const criar = async (data: EventoInput, copiarDe: string | null) => {
    try {
      const ev = await api.eventos.create(data);
      let copiados = 0;
      if (copiarDe) copiados = await api.efetivo.copiarDe(copiarDe, ev.id);
      await qc.invalidateQueries({ queryKey: qk.eventos });
      toast.success("Evento criado", { description: copiados ? `${copiados} pessoas copiadas para o efetivo.` : undefined });
      setNovo(false);
      navigate(`/eventos/${ev.id}`);
    } catch (e) {
      toastErr(e);
      throw e;
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Eventos"
        description="Cada evento tem o próprio efetivo e o seu relatório Controle Pessoal."
        actions={
          <Button onClick={() => setNovo(true)} size="lg">
            <Plus /> Novo evento
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon={CalendarDays}
          title="Não foi possível carregar os eventos"
          text="Verifique sua conexão e tente de novo."
          action={<Button variant="outline" onClick={() => refetch()}>Tentar de novo</Button>}
        />
      ) : !eventos?.length ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum evento ainda"
          text="Crie o primeiro evento para montar o efetivo e imprimir o relatório."
          action={
            <Button onClick={() => setNovo(true)}>
              <Plus /> Criar evento
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Stat label="Eventos" value={String(eventos.length)} dark />
            <Stat label="Escalações" value={String(totais.pessoas)} />
            <Stat label="Valor total" value={brl(totais.valor)} />
          </div>

          <div className="relative mb-4 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar evento, município ou organizador" className="pl-9" />
          </div>

          {lista.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum evento encontrado para “{q}”.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {lista.map((e) => {
                const passado = e.data && e.data < hoje();
                const isHoje = e.data === hoje();
                return (
                  <li key={e.id}>
                    <Link
                      to={`/eventos/${e.id}`}
                      className="group flex items-stretch gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-md"
                    >
                      <DateBlock iso={e.data} muted={!!passado} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{e.nome}</p>
                          {isHoje && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-sidebar">Hoje</span>}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {e.municipio || "Município não informado"}
                          {e.organizador && ` · ${e.organizador}`}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <strong className="text-foreground">{e.total_pessoas}</strong> pessoas
                          </span>
                          <span className="font-semibold tabular-nums">{brl(e.valor_total)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold-dark" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent title="Novo evento" description="Os dados aparecem no cabeçalho do relatório.">
          <EventoForm copiarDe={eventos} onSubmit={criar} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function DateBlock({ iso, muted }: { iso: string | null; muted?: boolean }) {
  if (!iso)
    return (
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CalendarDays className="h-5 w-5" />
      </div>
    );
  const [y, m, d] = iso.split("-");
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5",
        muted ? "bg-muted text-muted-foreground" : "bg-sidebar text-sidebar-foreground",
      )}
      title={formatDateBR(iso)}
    >
      <span className={cn("text-[10px] font-bold tracking-wider", !muted && "text-gold")}>{MESES[Number(m) - 1]}</span>
      <span className="font-display text-2xl font-semibold leading-none">{d}</span>
      <span className="text-[10px] opacity-60">{y}</span>
    </div>
  );
}

function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3 shadow-sm sm:p-4", dark ? "border-sidebar bg-sidebar text-sidebar-foreground" : "bg-card")}>
      <p className={cn("text-[11px] font-medium uppercase tracking-wider", dark ? "text-sidebar-foreground/60" : "text-muted-foreground")}>{label}</p>
      <p className={cn("mt-1 truncate text-lg font-bold tabular-nums sm:text-2xl", dark && "text-gold")}>{value}</p>
    </div>
  );
}
