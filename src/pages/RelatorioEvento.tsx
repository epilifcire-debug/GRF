import logo from "@/assets/logo-grf.png";
import { Pencil, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASS_MAP, CLASSIFICACOES, type Classificacao } from "@/lib/classificacao";
import type { EfetivoItem, Evento } from "@/lib/types";
import { brl, cn, formatDateBR, IS_PREVIEW } from "@/lib/utils";

type Filtro = Classificacao | "todos";
const CODES = ["GE", "VG", "AP"] as const;

export function RelatorioEvento({ evento, itens, onEditar }: { evento: Evento; itens: EfetivoItem[]; onEditar: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [linhasExtras, setLinhasExtras] = useState(0);

  const rows = useMemo(
    () =>
      itens
        .filter((s) => filtro === "todos" || s.classificacao === filtro)
        .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR", { sensitivity: "base" })),
    [itens, filtro],
  );
  const total = rows.reduce((a, s) => a + s.valor, 0);
  const porTipo = CLASSIFICACOES.map((c) => {
    const r = rows.filter((s) => s.classificacao === c.id);
    return { ...c, count: r.length, total: r.reduce((a, s) => a + s.valor, 0) };
  }).filter((t) => t.count > 0);

  const imprimir = () =>
    IS_PREVIEW
      ? toast.info("A impressão funciona no app instalado", { description: "No preview o navegador bloqueia a janela de impressão." })
      : window.print();

  return (
    <div>
      <Card className="no-print mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
          <div className="grid gap-2">
            <Label>Pessoas no relatório</Label>
            <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo o efetivo</SelectItem>
                {CLASSIFICACOES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Somente {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="extras">Linhas em branco no final</Label>
            <Input
              id="extras"
              type="number"
              min={0}
              max={50}
              value={linhasExtras}
              onChange={(e) => setLinhasExtras(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEditar}>
            <Pencil /> Editar cabeçalho
          </Button>
          <Button onClick={imprimir}>
            <Printer /> Imprimir
          </Button>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <article className="print-area mx-auto min-w-[720px] max-w-[900px] bg-white p-8 text-[11px] text-black shadow-lg ring-1 ring-black/5">
          <header className="flex items-center gap-4 border-b-2 border-black pb-3">
            <img src={logo} alt="GRF Segurança" className="h-20 w-20 shrink-0 object-contain" />
            <div className="flex-1 text-center">
              <h2 className="font-display text-[20px] font-bold leading-tight tracking-wide">GRF SEGURANÇA PATRIMONIAL PRIVADA LTDA</h2>
              <p className="mt-0.5 text-[12px] italic">Empresa de Segurança Credenciada Pela Polícia Federal</p>
            </div>
            <div className="w-20 shrink-0" />
          </header>

          <section className="mt-3 grid grid-cols-6 border border-black">
            <Box label="EVENTO" value={evento.nome} className="col-span-4" />
            <Box label="DATA" value={formatDateBR(evento.data ?? "")} className="col-span-2 border-l" />
            <Box label="MUNICÍPIO" value={evento.municipio} className="col-span-2 border-t" />
            <Box label="ORGANIZADOR" value={evento.organizador} className="col-span-2 border-l border-t" />
            <Box label="CONTATO" value={evento.telefone} className="col-span-2 border-l border-t" />
            <Box label="OBS" value={evento.observacoes} className="col-span-6 border-t" multiline />
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
                  <td className="border border-black px-2 py-[5px] font-medium uppercase">{s.pessoa.nome}</td>
                  <td className="border border-black px-1 py-[5px] text-center">
                    <ClassBoxes value={s.classificacao} />
                  </td>
                  <td className="break-all border border-black px-2 py-[5px]">{s.pessoa.pix_chave}</td>
                  <td className="border border-black px-1 py-[5px] text-right tabular-nums">{brl(s.valor)}</td>
                  <td className="border border-black px-1 py-[5px]" />
                </tr>
              ))}
              {Array.from({ length: linhasExtras }).map((_, i) => (
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
              {rows.length === 0 && linhasExtras === 0 && (
                <tr>
                  <td colSpan={6} className="border border-black py-6 text-center text-neutral-500">
                    Nenhuma pessoa no efetivo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <footer className="mt-3 break-inside-avoid">
            <div className="grid grid-cols-2 border border-black text-[12px] font-bold">
              <div className="flex items-center justify-between px-3 py-2">
                <span>VALOR TOTAL DO EFETIVO</span>
                <span className="tabular-nums">{brl(total)}</span>
              </div>
              <div className="flex items-center justify-between border-l border-black px-3 py-2">
                <span>TOTAL DE PESSOAS</span>
                <span className="tabular-nums">{rows.length}</span>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-neutral-700">
              {porTipo.map((t) => (
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

function Box({ label, value, className, multiline }: { label: string; value: string; className?: string; multiline?: boolean }) {
  return (
    <div className={cn("flex gap-1.5 border-black px-2 py-1.5", multiline ? "min-h-[34px] items-start" : "items-baseline", className)}>
      <span className="shrink-0 text-[10px] font-bold">{label}:</span>
      <span className={cn("flex-1 text-[12px] uppercase", multiline && "whitespace-pre-wrap normal-case")}>{value}</span>
    </div>
  );
}

function ClassBoxes({ value }: { value?: Classificacao }) {
  const info = value ? CLASS_MAP[value] : null;
  return (
    <span className="inline-flex items-center justify-center gap-x-1.5 whitespace-nowrap font-mono text-[10px]">
      {CODES.map((c) => (
        <span key={c} className={cn(info?.code === c && "font-bold")}>
          {c}({info?.code === c ? "x" : " "})
        </span>
      ))}
      {info?.tag && <span className="font-sans font-bold">{info.tag}</span>}
    </span>
  );
}
