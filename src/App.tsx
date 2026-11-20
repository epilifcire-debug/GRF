import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "./components/Layout";
import Cadastro from "./pages/Cadastro";
import Equipe from "./pages/Equipe";
import Relatorio from "./pages/Relatorio";

import { IS_PREVIEW } from "./lib/utils";

/** Build de preview (npm run build:preview) roda dentro de um frame: usa rotas em memória */
const Router = IS_PREVIEW ? MemoryRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Cadastro />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="relatorio" element={<Relatorio />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" closeButton />
    </Router>
  );
}
