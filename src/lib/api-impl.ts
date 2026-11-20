// Implementação de produção. No build de preview o vite.config troca
// este arquivo por api-impl.demo.ts (dados fictícios em memória).
export { supabaseApi as api } from "./api-supabase";
