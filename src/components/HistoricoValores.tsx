import { History } from "lucide-react";
import { CLASS_MAP } from "@/lib/classificacao";
import { useHistoricoValores } from "@/lib/data";
import { brl } from "@/lib/utils";
import { ClassBadge } from "./ui/badge";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/spinner";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmt = (v: number | null, vazio: string) => (v == null ? vazio : brl(v));

/** Histórico de alterações de valores (padrão quando eventoId não é informado) */
export function HistoricoValores({ eventoId }: { eventoId?: string }) {
  const { data = [], isLoading } = useHistoricoValores(eventoId);
  const vazio = eventoId ? "padrão" : "valor livre";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Histórico de alterações</p>
      </div>
      {isLoading ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : data.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ul className="max-h-80 divide-y overflow-y-auto">
          {data.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <ClassBadge value={h.classificacao} />
              <span className="tabular-nums">
                <span className="text-muted-foreground line-through decoration-muted-foreground/50">{fmt(h.valor_anterior, vazio)}</span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <strong>{fmt(h.valor_novo, vazio)}</strong>
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {quando(h.alterado_em)}
                {h.alterado_por_nome && ` · ${h.alterado_por_nome}`}
              </span>
              <span className="sr-only">{CLASS_MAP[h.classificacao].label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
