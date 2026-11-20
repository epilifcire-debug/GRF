import { CLASS_MAP, type Classification } from "@/lib/staff";
import { cn } from "@/lib/utils";

export function ClassBadge({ value, className }: { value: Classification; className?: string }) {
  const c = CLASS_MAP[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        c.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.short}
    </span>
  );
}
