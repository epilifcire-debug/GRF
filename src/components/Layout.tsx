import logo from "@/assets/logo-grf.png";
import { CalendarDays, Download, KeyRound, LogOut, Menu, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { api, toastErr, useSession } from "@/lib/data";
import { useInstallPrompt } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Spinner } from "./ui/spinner";

function useNav() {
  const { isAdmin } = useSession();
  return [
    { to: "/", label: "Eventos", icon: CalendarDays, end: true },
    { to: "/pessoas", label: "Pessoas", icon: Users },
    ...(isAdmin ? [{ to: "/usuarios", label: "Usuários", icon: ShieldCheck }] : []),
  ];
}

function SidebarContent({ onNavigate, onSenha }: { onNavigate?: () => void; onSenha: () => void }) {
  const nav = useNav();
  const { membro, user } = useSession();
  const { canInstall, install } = useInstallPrompt();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <img src={logo} alt="GRF Segurança" className="h-12 w-12 object-contain" />
        <div className="leading-tight">
          <p className="font-display text-xl font-semibold tracking-wide text-gold">GRF</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">Controle Pessoal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold/15 text-gold ring-1 ring-inset ring-gold/30"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-muted hover:text-sidebar-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {canInstall && (
        <button
          onClick={install}
          className="mx-3 mt-4 flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
        >
          <Download className="h-4 w-4" /> Instalar app
        </button>
      )}

      <div className="mt-auto px-3 pb-3">
        <div className="rounded-xl bg-sidebar-muted p-3">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{membro?.nome ?? user?.email}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">
            {membro?.papel === "admin" ? "Administrador" : "Equipe"} · {user?.email}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onSenha}
              className="flex items-center justify-center gap-1.5 rounded-md bg-black/20 px-2 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-black/40 hover:text-sidebar-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" /> Senha
            </button>
            <button
              onClick={() => api.auth.signOut()}
              className="flex items-center justify-center gap-1.5 rounded-md bg-black/20 px-2 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-black/40 hover:text-sidebar-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
        <p className="px-2 pt-4 text-[11px] text-sidebar-foreground/40">
          by: <span className="font-semibold text-sidebar-foreground/60">efcsys</span>
        </p>
      </div>
    </div>
  );
}

function TrocarSenha({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [busy, setBusy] = useState(false);
  const erro = senha && senha.length < 8 ? "Use pelo menos 8 caracteres." : conf && conf !== senha ? "As senhas não conferem." : "";

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (erro || !senha || busy) return;
    setBusy(true);
    try {
      await api.auth.trocarSenha(senha);
      toast.success("Senha alterada");
      setSenha("");
      setConf("");
      onOpenChange(false);
    } catch (err) {
      toastErr(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Alterar minha senha">
        <form onSubmit={salvar} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ns">Nova senha</Label>
            <Input id="ns" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cs">Confirme a nova senha</Label>
            <Input id="cs" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          <Button type="submit" disabled={busy || !!erro || !senha || conf !== senha}>
            {busy && <Spinner />} Salvar senha
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState(false);
  const nav = useNav();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent onSenha={() => setSenha(true)} />
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-sidebar-foreground lg:hidden">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-semibold tracking-wide text-gold">GRF</span>
          <span className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Controle Pessoal</span>
        </div>
        <button aria-label="Abrir menu" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-sidebar-muted">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar pb-[env(safe-area-inset-bottom)] text-sidebar-foreground shadow-2xl animate-in slide-in-from-left duration-200">
            <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-sidebar-muted">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              onNavigate={() => setOpen(false)}
              onSenha={() => {
                setOpen(false);
                setSenha(true);
              }}
            />
          </aside>
        </div>
      )}

      <main className="print-shell flex-1 lg:pl-64">
        <div className="print-shell mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:py-8 lg:pb-8">
          <Outlet />
        </div>
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", isActive ? "text-gold-dark" : "text-muted-foreground")
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <TrocarSenha open={senha} onOpenChange={setSenha} />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Users; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-accent p-3 text-gold-dark">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
