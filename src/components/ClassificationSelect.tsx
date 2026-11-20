import { CLASSIFICATIONS, type Classification } from "@/lib/staff";
import { brl, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Props {
  value: Classification;
  onChange: (v: Classification) => void;
  className?: string;
  compact?: boolean;
  id?: string;
}

export function ClassificationSelect({ value, onChange, className, compact, id }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Classification)}>
      <SelectTrigger id={id} className={cn(compact && "h-9", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CLASSIFICATIONS.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", c.dot)} />
              {compact ? c.short : c.label}
              <span className="text-muted-foreground">
                {c.defaultValue != null ? brl(c.defaultValue) : "valor livre"}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
