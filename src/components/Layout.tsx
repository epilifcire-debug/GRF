import logo from "@/assets/logo-grf.png";
import { Download, FileText, Menu, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useInstallPrompt } from "@/lib/pwa";
import { useStaff } from "@/lib/staff";
import { brl, cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Cadastro", icon: UserPlus, end: true },
  { to: "/equipe", label: "Equipe", icon: Users },
  { to: "/relatorio", label: "Relatório", icon: FileText },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { summary } = useStaff();
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
        {NAV.map(({ to, label, icon: Icon, end }) => (
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

      <div className="mx-3 mt-6 rounded-xl bg-sidebar-muted p-4">
        <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">Efetivo atual</p>
        <p className="mt-1 text-2xl font-bold text-sidebar-foreground">{summary.count}</p>
        <p className="text-sm font-semibold text-gold">{brl(summary.total)}</p>
      </div>

      {canInstall && (
        <button
          onClick={install}
          className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-3 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
        >
          <Download className="h-4 w-4" /> Instalar app
        </button>
      )}

      <div className="mt-auto px-5 py-5 text-[11px] leading-relaxed text-sidebar-foreground/40">
        <p>GRF Segurança Patrimonial Privada Ltda</p>
        <p className="mt-2">
          by: <span className="font-semibold text-sidebar-foreground/60">efcsys</span>
        </p>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent />
      </aside>

      {/* Topo mobile */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-semibold tracking-wide text-gold">GRF</span>
          <span className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Controle Pessoal</span>
        </div>
        <button
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-sidebar-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 hover:bg-sidebar-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="print-shell flex-1 lg:pl-64">
        <div className="print-shell mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:py-8 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                isActive ? "text-gold-dark" : "text-muted-foreground",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
