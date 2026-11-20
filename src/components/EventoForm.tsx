import { CalendarPlus, Save } from "lucide-react";
import { useState } from "react";
import { maskPhone } from "@/lib/pix";
import type { EventoInput, EventoResumo } from "@/lib/types";
import { formatDateBR } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/spinner";

export const EVENTO_VAZIO: EventoInput = { nome: "", municipio: "", data: null, organizador: "", telefone: "", observacoes: "" };

interface Props {
  inicial?: EventoInput;
  /** Eventos que podem servir de base para copiar o efetivo (só na criação) */
  copiarDe?: EventoResumo[];
  onSubmit: (data: EventoInput, copiarDeId: string | null) => Promise<unknown>;
}

export function EventoForm({ inicial, copiarDe, onSubmit }: Props) {
  const [f, setF] = useState<EventoInput>(inicial ?? EVENTO_VAZIO);
  const [origem, setOrigem] = useState("nenhum");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<EventoInput>) => setF((v) => ({ ...v, ...patch }));
  const nomeErr = touched && f.nome.trim().length < 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (f.nome.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      await onSubmit({ ...f, nome: f.nome.trim(), data: f.data || null }, origem === "nenhum" ? null : origem);
    } catch {
      /* toast já exibido */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="ev-nome">Nome do evento</Label>
        <Input id="ev-nome" value={f.nome} onChange={(e) => set({ nome: e.target.value })} onBlur={() => setTouched(true)} placeholder="Ex.: Pré-Caju 2026 — Sábado" aria-invalid={nomeErr} />
        {nomeErr && <p className="text-xs text-destructive">Informe o nome do evento.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ev-data">Data</Label>
          <Input id="ev-data" type="date" value={f.data ?? ""} onChange={(e) => set({ data: e.target.value || null })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-mun">Município</Label>
          <Input id="ev-mun" value={f.municipio} onChange={(e) => set({ municipio: e.target.value })} placeholder="Ex.: Aracaju/SE" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-org">Organizador</Label>
          <Input id="ev-org" value={f.organizador} onChange={(e) => set({ organizador: e.target.value })} placeholder="Nome do organizador" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-tel">Telefone de contato</Label>
          <Input id="ev-tel" inputMode="tel" value={f.telefone} onChange={(e) => set({ telefone: maskPhone(e.target.value) })} placeholder="(79) 99999-0000" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-obs">Observações</Label>
        <Textarea id="ev-obs" rows={2} value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Aparecem no relatório" />
      </div>

      {copiarDe && copiarDe.length > 0 && (
        <div className="grid gap-2">
          <Label>Começar com o efetivo de</Label>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum — começar vazio</SelectItem>
              {copiarDe.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                  {e.data ? ` · ${formatDateBR(e.data)}` : ""} ({e.total_pessoas})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
        {busy ? <Spinner /> : inicial ? <Save /> : <CalendarPlus />} {inicial ? "Salvar evento" : "Criar evento"}
      </Button>
    </form>
  );
}
