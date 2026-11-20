import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui/spinner";
import { SessionProvider, useSession } from "./lib/data";
import { IS_PREVIEW } from "./lib/utils";
import Evento from "./pages/Evento";
import Eventos from "./pages/Eventos";
import Login, { SemAcesso } from "./pages/Login";
import Pessoas from "./pages/Pessoas";
import Usuarios from "./pages/Usuarios";

/** Build de preview (npm run build:preview) roda dentro de um frame: usa rotas em memória */
const Router = IS_PREVIEW ? MemoryRouter : BrowserRouter;

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 } },
});

function Protegido() {
  const { loading, user, membro } = useSession();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar text-gold">
        <Spinner className="h-6 w-6" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!membro?.ativo) return <SemAcesso />;
  return <Outlet />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protegido />}>
              <Route element={<Layout />}>
                <Route index element={<Eventos />} />
                <Route path="eventos/:id" element={<Evento />} />
                <Route path="pessoas" element={<Pessoas />} />
                <Route path="usuarios" element={<Usuarios />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster richColors position="top-right" closeButton />
      </SessionProvider>
    </QueryClientProvider>
  );
}
