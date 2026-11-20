import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading, Spinner } from "@/components/ui/spinner";
import { api, qk, toastErr, useMembros, useSession } from "@/lib/data";
import type { Membro } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Usuarios() {
  const { isAdmin, user } = useSession();
  const { data: membros = [], isLoading } = useMembros();
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [senhaDe, setSenhaDe] = useState<Membro | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (isLoading) return <PageLoading />;

  const atualizar = async (m: Membro, patch: Partial<Pick<Membro, "papel" | "ativo">>) => {
    setBusy(m.user_id);
    try {
      await api.membros.update(m.user_id, patch);
      qc.invalidateQueries({ queryKey: qk.membros });
      toast.success("Usuário atualizado");
    } catch (e) {
      toastErr(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Usuários"
        description="Quem pode entrar no app. Todos os usuários ativos veem e editam eventos e pessoas."
        actions={
          <Button size="lg" onClick={() => setNovo(true)}>
            <UserPlus /> Novo usuário
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {membros.map((m) => {
            const eu = m.user_id === user?.id;
            return (
              <li key={m.user_id} className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center", !m.ativo && "opacity-60")}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", m.papel === "admin" ? "bg-sidebar text-gold" : "bg-muted text-muted-foreground")}>
                    {m.papel === "admin" ? <ShieldCheck className="h-5 w-5" /> : <span className="font-semibold">{m.nome[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {m.nome} {eu && <span className="text-xs font-normal text-muted-foreground">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={m.papel} disabled={eu || busy === m.user_id} onValueChange={(v) => atualizar(m, { papel: v as Membro["papel"] })}>
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipe">Equipe</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setSenhaDe(m)}>
                    <KeyRound /> Senha
                  </Button>
                  <Button
                    variant={m.ativo ? "ghost" : "outline"}
                    size="sm"
                    disabled={eu || busy === m.user_id}
                    className={cn(m.ativo && "text-destructive hover:bg-destructive/10")}
                    onClick={() => atualizar(m, { ativo: !m.ativo })}
                  >
                    {busy === m.user_id && <Spinner />}
                    {m.ativo ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <NovoUsuario open={novo} onOpenChange={setNovo} onDone={() => qc.invalidateQueries({ queryKey: qk.membros })} />
      <DefinirSenha membro={senhaDe} onClose={() => setSenhaDe(null)} />
    </div>
  );
}

function NovoUsuario({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [f, setF] = useState({ nome: "", email: "", senha: "", papel: "equipe" as Membro["papel"] });
  const [busy, setBusy] = useState(false);
  const valido = f.nome.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) && f.senha.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || busy) return;
    setBusy(true);
    try {
      await api.membros.criar({ ...f, nome: f.nome.trim(), email: f.email.trim() });
      toast.success("Usuário criado", { description: `Envie o e-mail e a senha provisória para ${f.nome.trim()}.` });
      setF({ nome: "", email: "", senha: "", papel: "equipe" });
      onDone();
      onOpenChange(false);
    } catch (err) {
      toastErr(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Novo usuário" description="O login já sai liberado. A pessoa pode trocar a senha depois em “Senha”, no menu.">
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nu-nome">Nome</Label>
            <Input id="nu-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nu-email">E-mail (login)</Label>
            <Input id="nu-email" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nu-senha">Senha provisória</Label>
              <Input id="nu-senha" type="text" autoComplete="off" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} placeholder="mín. 8 caracteres" />
            </div>
            <div className="grid gap-2">
              <Label>Perfil</Label>
              <Select value={f.papel} onValueChange={(v) => setF({ ...f, papel: v as Membro["papel"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipe">Equipe</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={!valido || busy}>
            {busy ? <Spinner /> : <UserPlus />} Criar usuário
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DefinirSenha({ membro, onClose }: { membro: Membro | null; onClose: () => void }) {
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={!!membro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Definir nova senha" description={`Para ${membro?.nome} (${membro?.email}).`}>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!membro || senha.length < 8) return;
            setBusy(true);
            try {
              await api.membros.definirSenha(membro.user_id, senha);
              toast.success("Senha alterada");
              setSenha("");
              onClose();
            } catch (err) {
              toastErr(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input autoFocus type="text" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mín. 8 caracteres)" />
          <Button type="submit" disabled={senha.length < 8 || busy}>
            {busy && <Spinner />} Salvar senha
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
