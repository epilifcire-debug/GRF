import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "preview" ? [viteSingleFile()] : [])],
  resolve: {
    alias: [
      // No preview, a camada de dados vira a versão em memória com dados fictícios
      ...(mode === "preview" ? [{ find: /^\.\/api-impl$/, replacement: path.resolve(__dirname, "./src/lib/api-impl.demo.ts") }] : []),
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: mode === "preview" ? { outDir: "dist-preview", assetsInlineLimit: 100_000_000 } : { chunkSizeWarningLimit: 700 },
  server: { host: true, port: 5173 },
}));
