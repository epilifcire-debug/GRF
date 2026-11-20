import { CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import { brl, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Props {
  value: Classificacao;
  onChange: (v: Classificacao) => void;
  className?: string;
  compact?: boolean;
  id?: string;
}

export function ClassificationSelect({ value, onChange, className, compact, id }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Classificacao)}>
      <SelectTrigger id={id} className={cn(compact && "h-9", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CLASSIFICACOES.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", c.dot)} />
              {compact ? c.short : c.label}
              <span className="text-muted-foreground">{c.valorPadrao != null ? brl(c.valorPadrao) : "valor livre"}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
