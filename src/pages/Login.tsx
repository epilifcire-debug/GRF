import logo from "@/assets/logo-grf.png";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { supabaseConfigurado } from "@/lib/api-supabase";
import { api, errMsg, useSession } from "@/lib/data";
import { IS_PREVIEW } from "@/lib/utils";

export default function Login() {
  const { user, loading } = useSession();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha || busy) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    setErro("");
    try {
      await api.auth.signIn(email, senha);
    } catch (err) {
      setErro(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      {/* brilho dourado discreto ao fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-gold/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(233,180,76,0.06)_50%,transparent_60%)]" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="GRF Segurança" className="h-28 w-28 object-contain drop-shadow-[0_8px_24px_rgba(233,180,76,0.25)]" />
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-wide text-gold">GRF</h1>
          <p className="text-xs uppercase tracking-[0.25em] text-sidebar-foreground/60">Controle Pessoal</p>
        </div>

        <form onSubmit={entrar} className="grid gap-4 rounded-2xl border border-white/10 bg-card p-6 shadow-2xl" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
          {!IS_PREVIEW && !supabaseConfigurado && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy} className="mt-1">
            {busy ? <Spinner /> : <LogIn />} Entrar
          </Button>
          <p className="text-center text-xs text-muted-foreground">Acesso liberado pelo administrador da GRF.</p>
        </form>

        <p className="mt-8 text-center text-[11px] text-sidebar-foreground/40">
          GRF Segurança Patrimonial Privada Ltda · by: <span className="font-semibold text-sidebar-foreground/60">efcsys</span>
        </p>
      </div>
    </div>
  );
}

export function SemAcesso() {
  const { user } = useSession();
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl">
        <img src={logo} alt="" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-4 text-lg font-semibold">Acesso não liberado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O login <strong>{user?.email}</strong> não está ativo no GRF Controle Pessoal. Peça ao administrador para liberar seu acesso.
        </p>
        <Button variant="outline" className="mt-5 w-full" onClick={() => api.auth.signOut()}>
          Sair
        </Button>
      </div>
    </div>
  );
}
