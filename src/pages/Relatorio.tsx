import logo from "@/assets/logo-grf.png";
import { Eraser, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskPhone } from "@/lib/pix";
import { byName, CLASSIFICATIONS, summarize, useReportHeader, useStaff, type Classification } from "@/lib/staff";
import { toast } from "sonner";
import { brl, cn, formatDateBR, IS_PREVIEW } from "@/lib/utils";

type Filter = Classification | "todos";

const CODES = ["GE", "VG", "AP"] as const;
const CODE_OF: Record<Classification, (typeof CODES)[number] | null> = {
  grandes_eventos: "GE",
  vigilante: "VG",
  apoio: "AP",
  lider: null,
  especial: null,
};
const EXTRA_TAG: Partial<Record<Classification, string>> = { lider: "LÍDER", especial: "ESP." };

export default function Relatorio() {
  const { staff } = useStaff();
  const { header, set, reset } = useReportHeader();
  const [filter, setFilter] = useState<Filter>("todos");
  const [blankRows, setBlankRows] = useState(0);

  const rows = useMemo(
    () => [...staff].sort(byName).filter((s) => filter === "todos" || s.classification === filter),
    [staff, filter],
  );
  const totals = summarize(rows);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatório"
        description="Preencha o cabeçalho e imprima o Controle Pessoal no modelo GRF."
        actions={
          <Button
            size="lg"
            onClick={() =>
              IS_PREVIEW
                ? toast.info("A impressão funciona no app instalado", { description: "No preview o navegador bloqueia a janela de impressão." })
                : window.print()
            }
          >
            <Printer /> Imprimir
          </Button>
        }
      />

      {/* Cabeçalho editável */}
      <Card className="no-print mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Dados do evento</CardTitle>
          <Button variant="ghost" size="sm" onClick={reset}>
            <Eraser /> Limpar cabeçalho
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Evento" className="lg:col-span-2">
            <Input value={header.eventName} onChange={(e) => set({ eventName: e.target.value })} placeholder="Nome do evento" />
          </Field>
          <Field label="Data">
            <Input type="date" value={header.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Município">
            <Input value={header.municipality} onChange={(e) => set({ municipality: e.target.value })} placeholder="Ex.: Aracaju/SE" />
          </Field>
          <Field label="Organizador">
            <Input value={header.organizer} onChange={(e) => set({ organizer: e.target.value })} placeholder="Nome do organizador" />
          </Field>
          <Field label="Telefone de contato">
            <Input
              inputMode="tel"
              value={header.phone}
              onChange={(e) => set({ phone: maskPhone(e.target.value) })}
              placeholder="(79) 99999-0000"
            />
          </Field>
          <Field label="Observações" className="sm:col-span-2 lg:col-span-3">
            <Textarea value={header.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Observações do relatório" rows={2} />
          </Field>
          <Field label="Pessoas no relatório">
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Toda a equipe</SelectItem>
                {CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Somente {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Linhas em branco no final">
            <Input
              type="number"
              min={0}
              max={50}
              value={blankRows}
              onChange={(e) => setBlankRows(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Folha do relatório */}
      <div className="overflow-x-auto">
        <article className="print-area mx-auto min-w-[720px] max-w-[900px] bg-white p-8 text-[11px] text-black shadow-lg ring-1 ring-black/5">
          {/* Cabeçalho GRF */}
          <header className="flex items-center gap-4 border-b-2 border-black pb-3">
            <img src={logo} alt="GRF Segurança" className="h-20 w-20 shrink-0 object-contain" />
            <div className="flex-1 text-center">
              <h2 className="font-display text-[20px] font-bold leading-tight tracking-wide">GRF SEGURANÇA PATRIMONIAL PRIVADA LTDA</h2>
              <p className="mt-0.5 text-[12px] italic">Empresa de Segurança Credenciada Pela Polícia Federal</p>
            </div>
            <div className="w-20 shrink-0" />
          </header>

          {/* Campos do evento */}
          <section className="mt-3 grid grid-cols-6 border border-black">
            <Box label="EVENTO" value={header.eventName} className="col-span-4" />
            <Box label="DATA" value={formatDateBR(header.date)} className="col-span-2 border-l" />
            <Box label="MUNICÍPIO" value={header.municipality} className="col-span-2 border-t" />
            <Box label="ORGANIZADOR" value={header.organizer} className="col-span-2 border-l border-t" />
            <Box label="CONTATO" value={header.phone} className="col-span-2 border-l border-t" />
            <Box label="OBS" value={header.notes} className="col-span-6 border-t" multiline />
          </section>

          <h3 className="mt-4 border border-black bg-black py-1.5 text-center font-display text-[15px] font-bold tracking-[0.25em] text-white">
            CONTROLE PESSOAL
          </h3>

          <table className="report-table w-full border-collapse">
            <thead>
              <tr className="bg-neutral-200 text-[10px] font-bold uppercase">
                <th className="w-8 border border-black px-1 py-1.5">Nº</th>
                <th className="border border-black px-2 py-1.5 text-left">Nome</th>
                <th className="w-[178px] border border-black px-1 py-1.5">Classificação</th>
                <th className="w-[150px] border border-black px-2 py-1.5 text-left">Chave PIX</th>
                <th className="w-[72px] border border-black px-1 py-1.5">Valor</th>
                <th className="w-[140px] border border-black px-1 py-1.5">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.id} className={cn(i % 2 === 1 && "bg-neutral-100")}>
                  <td className="border border-black px-1 py-[5px] text-center tabular-nums">{i + 1}</td>
                  <td className="border border-black px-2 py-[5px] font-medium uppercase">{s.name}</td>
                  <td className="border border-black px-1 py-[5px] text-center">
                    <ClassBoxes value={s.classification} />
                  </td>
                  <td className="border border-black px-2 py-[5px] break-all">{s.pixKey}</td>
                  <td className="border border-black px-1 py-[5px] text-right tabular-nums">{brl(s.value)}</td>
                  <td className="border border-black px-1 py-[5px]" />
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b${i}`}>
                  <td className="border border-black px-1 py-[7px] text-center tabular-nums">{rows.length + i + 1}</td>
                  <td className="border border-black" />
                  <td className="border border-black px-1 py-[5px] text-center">
                    <ClassBoxes />
                  </td>
                  <td className="border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                </tr>
              ))}
              {rows.length === 0 && blankRows === 0 && (
                <tr>
                  <td colSpan={6} className="border border-black py-6 text-center text-neutral-500">
                    Nenhuma pessoa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Rodapé de totais */}
          <footer className="mt-3 break-inside-avoid">
            <div className="grid grid-cols-2 border border-black text-[12px] font-bold">
              <div className="flex items-center justify-between px-3 py-2">
                <span>VALOR TOTAL DO EFETIVO</span>
                <span className="tabular-nums">{brl(totals.total)}</span>
              </div>
              <div className="flex items-center justify-between border-l border-black px-3 py-2">
                <span>TOTAL DE PESSOAS</span>
                <span className="tabular-nums">{totals.count}</span>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-neutral-700">
              {totals.byType
                .filter((t) => t.count > 0)
                .map((t) => (
                  <span key={t.id}>
                    {t.label}: {t.count} · {brl(t.total)}
                  </span>
                ))}
            </div>

            <div className="mt-12 grid grid-cols-2 gap-12 text-center text-[10px]">
              <div className="border-t border-black pt-1">Responsável GRF</div>
              <div className="border-t border-black pt-1">Organizador do evento</div>
            </div>
          </footer>
        </article>
      </div>

      <p className="no-print mt-4 text-center text-xs text-muted-foreground">
        Dica: na janela de impressão, desative “Cabeçalhos e rodapés” para uma folha limpa.
      </p>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Box({ label, value, className, multiline }: { label: string; value: string; className?: string; multiline?: boolean }) {
  return (
    <div className={cn("flex gap-1.5 border-black px-2 py-1.5", multiline ? "min-h-[34px] items-start" : "items-baseline", className)}>
      <span className="shrink-0 text-[10px] font-bold">{label}:</span>
      <span className={cn("flex-1 text-[12px] uppercase", multiline && "whitespace-pre-wrap normal-case")}>{value}</span>
    </div>
  );
}

function ClassBoxes({ value }: { value?: Classification }) {
  const marked = value ? CODE_OF[value] : null;
  const tag = value ? EXTRA_TAG[value] : undefined;
  return (
    <span className="inline-flex items-center justify-center gap-x-1.5 whitespace-nowrap font-mono text-[10px]">
      {CODES.map((c) => (
        <span key={c} className={cn(marked === c && "font-bold")}>
          {c}({marked === c ? "x" : " "})
        </span>
      ))}
      {tag && <span className="font-sans font-bold">{tag}</span>}
    </span>
  );
}
