import { Check, UserPlus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ClassificationSelect } from "@/components/ClassificationSelect";
import { PageHeader } from "@/components/Layout";
import { ClassBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { detectPixType, formatPix, PIX_LABEL } from "@/lib/pix";
import { CLASS_MAP, useStaff, type Classification } from "@/lib/staff";
import { brl, parseMoney } from "@/lib/utils";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const pixDigits = (s: string) => (s.includes("@") ? s.toLowerCase().trim() : s.replace(/\D/g, ""));

export default function Cadastro() {
  const { staff, add } = useStaff();
  const [name, setName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [classification, setClassification] = useState<Classification>("apoio");
  const [value, setValue] = useState("110");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const pixType = detectPixType(pixKey);
  const nameError = submitted && name.trim().length < 3 ? "Informe o nome completo." : "";
  const pixError = submitted && !pixKey.trim() ? "Informe a chave PIX." : "";
  const numericValue = parseMoney(value);
  const valueError = submitted && numericValue <= 0 ? "Informe um valor maior que zero." : "";

  const duplicate = useMemo(() => {
    const n = norm(name);
    const p = pixDigits(pixKey);
    return staff.find((s) => (n.length > 3 && norm(s.name) === n) || (p.length > 4 && pixDigits(s.pixKey) === p));
  }, [staff, name, pixKey]);

  const changeClass = (c: Classification) => {
    setClassification(c);
    const def = CLASS_MAP[c].defaultValue;
    setValue(def != null ? String(def) : "");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (name.trim().length < 3 || !pixKey.trim() || numericValue <= 0) return;
    add({ name, pixKey: formatPix(pixKey, pixType), pixType, classification, value: numericValue });
    toast.success(`${name.trim()} cadastrado(a)`, { description: `${CLASS_MAP[classification].label} · ${brl(numericValue)}` });
    setName("");
    setPixKey("");
    setSubmitted(false);
    nameRef.current?.focus();
  };

  const recent = [...staff].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Cadastro de pessoal" description="Registre cada integrante do efetivo do evento." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Novo integrante</CardTitle>
            <CardDescription>O valor é preenchido pela classificação e pode ser ajustado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-5" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  ref={nameRef}
                  autoFocus
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: José Carlos dos Santos"
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pix">Chave PIX</Label>
                  {pixKey.trim() && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {PIX_LABEL[pixType]}
                    </span>
                  )}
                </div>
                <Input
                  id="pix"
                  autoComplete="off"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  onBlur={() => setPixKey((v) => formatPix(v))}
                  placeholder="CPF, telefone ou e-mail"
                  aria-invalid={!!pixError}
                />
                {pixError && <p className="text-xs text-destructive">{pixError}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="class">Classificação</Label>
                  <ClassificationSelect id="class" value={classification} onChange={changeClass} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Valor do pagamento (R$)</Label>
                  <Input
                    id="value"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={classification === "especial" ? "Valor personalizado" : "0,00"}
                    aria-invalid={!!valueError}
                  />
                  {valueError && <p className="text-xs text-destructive">{valueError}</p>}
                </div>
              </div>

              {duplicate && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                  Atenção: já existe um cadastro parecido — <strong>{duplicate.name}</strong> ({duplicate.pixKey}).
                </p>
              )}

              <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start">
                <UserPlus /> Cadastrar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Últimos cadastros</CardTitle>
            <CardDescription>
              {staff.length} {staff.length === 1 ? "pessoa" : "pessoas"} no efetivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum cadastro ainda. Você também pode importar uma planilha CSV na tela <Link to="/equipe" className="font-medium text-gold-dark underline">Equipe</Link>.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.pixKey}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <ClassBadge value={s.classification} />
                      <span className="text-xs font-semibold">{brl(s.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {staff.length > 0 && (
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/equipe">
                  <Check /> Ver equipe completa
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
