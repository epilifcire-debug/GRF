import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { type Classificacao, valorPadrao } from "@/lib/classificacao";
import { pixKeyNorm } from "@/lib/csv";
import { detectPixType, formatPix, PIX_LABEL } from "@/lib/pix";
import type { Pessoa, PessoaInput, ValorDe } from "@/lib/types";
import { parseMoney } from "@/lib/utils";
import { ClassificationSelect } from "./ClassificationSelect";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";

interface Props {
  /** Pessoas já cadastradas, para avisar sobre duplicidade */
  existentes?: Pessoa[];
  inicial?: Partial<PessoaInput>;
  /** Mostra o campo de valor (quando a pessoa entra direto num evento) */
  comValor?: boolean;
  submitLabel?: string;
  onSubmit: (data: PessoaInput & { valor: number }) => Promise<unknown>;
  ignorarId?: string;
  /** valores vigentes (evento → padrão) */
  valorDe?: ValorDe;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function PessoaForm({ existentes = [], inicial, comValor, submitLabel = "Cadastrar", onSubmit, ignorarId, valorDe }: Props) {
  const vDe = valorDe ?? valorPadrao;
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [pix, setPix] = useState(inicial?.pix_chave ?? "");
  const [classificacao, setClassificacao] = useState<Classificacao>(inicial?.classificacao ?? "apoio");
  const [valor, setValor] = useState(String(vDe(inicial?.classificacao ?? "apoio") ?? ""));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  const pixTipo = detectPixType(pix);
  const valorNum = parseMoney(valor);
  const errors = {
    nome: nome.trim().length < 3 ? "Informe o nome completo." : "",
    pix: pix.trim().length < 3 ? "Informe a chave PIX." : "",
    valor: comValor && valorNum <= 0 ? "Informe um valor maior que zero." : "",
  };
  const show = (k: keyof typeof errors) => touched[k] && errors[k];

  const duplicada = useMemo(() => {
    const n = norm(nome);
    const p = pixKeyNorm(pix);
    return existentes.find((s) => s.id !== ignorarId && ((n.length > 5 && norm(s.nome) === n) || (p.length > 4 && pixKeyNorm(s.pix_chave) === p)));
  }, [existentes, nome, pix, ignorarId]);

  const changeClass = (c: Classificacao) => {
    setClassificacao(c);
    const v = vDe(c);
    setValor(v != null ? String(v) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, pix: true, valor: true });
    if (errors.nome || errors.pix || errors.valor || sending) return;
    setSending(true);
    try {
      await onSubmit({ nome: nome.trim().replace(/\s+/g, " "), pix_chave: formatPix(pix, pixTipo), pix_tipo: pixTipo, classificacao, valor: valorNum });
      if (!inicial) {
        setNome("");
        setPix("");
        setTouched({});
      }
    } catch {
      /* erro já exibido pelo toast */
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="pf-nome">Nome completo</Label>
        <Input
          id="pf-nome"
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, nome: true }))}
          placeholder="Ex.: José Carlos dos Santos"
          aria-invalid={!!show("nome")}
        />
        {show("nome") && <p className="text-xs text-destructive">{errors.nome}</p>}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="pf-pix">Chave PIX</Label>
          {pix.trim() && <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{PIX_LABEL[pixTipo]}</span>}
        </div>
        <Input
          id="pf-pix"
          autoComplete="off"
          value={pix}
          onChange={(e) => setPix(e.target.value)}
          onBlur={() => {
            setPix((v) => formatPix(v));
            setTouched((t) => ({ ...t, pix: true }));
          }}
          placeholder="CPF, telefone, e-mail ou chave aleatória"
          aria-invalid={!!show("pix")}
        />
        {show("pix") && <p className="text-xs text-destructive">{errors.pix}</p>}
      </div>

      <div className={comValor ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <div className="grid gap-2">
          <Label htmlFor="pf-class">{comValor ? "Classificação" : "Classificação padrão"}</Label>
          <ClassificationSelect id="pf-class" value={classificacao} onChange={changeClass} valorDe={valorDe} />
        </div>
        {comValor && (
          <div className="grid gap-2">
            <Label htmlFor="pf-valor">Valor (R$)</Label>
            <Input
              id="pf-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, valor: true }))}
              placeholder={classificacao === "especial" ? "Valor personalizado" : "0,00"}
              aria-invalid={!!show("valor")}
            />
            {show("valor") && <p className="text-xs text-destructive">{errors.valor}</p>}
          </div>
        )}
      </div>

      {duplicada && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Já existe um cadastro parecido: <strong>{duplicada.nome}</strong> ({duplicada.pix_chave}).
        </p>
      )}

      <Button type="submit" size="lg" disabled={sending} className="w-full sm:w-auto sm:justify-self-start">
        {sending ? <Spinner /> : <UserPlus />} {submitLabel}
      </Button>
    </form>
  );
}
