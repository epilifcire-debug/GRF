// Servidor de produção do GRF Controle Pessoal (Shard Cloud / qualquer Node).
// - Se ainda não existir build (dist/), roda "npm run build" uma vez.
// - Serve os arquivos estáticos com fallback de SPA (rotas do React).
// - Entrega /config.js com as chaves PÚBLICAS do Supabase lidas das
//   variáveis de ambiente (ou do arquivo .env), sem precisar recompilar.
// Sem dependências externas.
import { execSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST = resolve(ROOT, "dist");
const PORT = Number(process.env.PORT) || 80;

/* ---------- .env opcional (não sobrescreve variáveis já definidas) ---------- */
for (const file of [".env.production", ".env"]) {
  const p = join(ROOT, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/* ---------- build na primeira inicialização ---------- */
if (!existsSync(join(DIST, "index.html"))) {
  console.log("[grf] dist/ não encontrado — gerando build...");
  if (!existsSync(join(ROOT, "node_modules", "vite"))) {
    execSync("npm install --include=dev --no-audit --no-fund", { cwd: ROOT, stdio: "inherit" });
  }
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
}

/* ---------- config pública do Supabase ---------- */
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  supabaseKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "",
};
if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn("[grf] ATENÇÃO: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (variáveis de ambiente ou .env).");
}
const configJs = `window.__GRF_CONFIG__=${JSON.stringify(config)};`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESS = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt"]);
const gzCache = new Map();

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
};

function send(req, res, filePath, cacheControl) {
  const ext = extname(filePath);
  const headers = { ...SECURITY_HEADERS, "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": cacheControl };
  const acceptsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  if (acceptsGzip && COMPRESS.has(ext)) {
    const mtime = statSync(filePath).mtimeMs;
    let hit = gzCache.get(filePath);
    if (!hit || hit.mtime !== mtime) {
      hit = { mtime, body: gzipSync(readFileSync(filePath)) };
      gzCache.set(filePath, hit);
    }
    res.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
    return res.end(req.method === "HEAD" ? undefined : hit.body);
  }
  res.writeHead(200, headers);
  if (req.method === "HEAD") return res.end();
  createReadStream(filePath).pipe(res);
}

createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, SECURITY_HEADERS);
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://x").pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end();
  }

  if (pathname === "/config.js") {
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" });
    return res.end(configJs);
  }
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }

  // impede sair da pasta dist (path traversal)
  const filePath = normalize(join(DIST, pathname));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end();
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const cache = pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : pathname === "/sw.js" || pathname.endsWith(".webmanifest") || pathname.endsWith(".html")
        ? "no-cache"
        : "public, max-age=86400";
    return send(req, res, filePath, cache);
  }

  // arquivo inexistente com extensão → 404; rota do app → index.html
  if (extname(pathname)) {
    res.writeHead(404, SECURITY_HEADERS);
    return res.end("Not found");
  }
  return send(req, res, join(DIST, "index.html"), "no-cache");
}).listen(PORT, "0.0.0.0", () => console.log(`[grf] GRF Controle Pessoal rodando na porta ${PORT}`));
