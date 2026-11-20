import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "preview" ? [viteSingleFile()] : [])],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: mode === "preview" ? { outDir: "dist-preview", assetsInlineLimit: 100_000_000 } : {},
  server: { host: true, port: 5173 },
}));
