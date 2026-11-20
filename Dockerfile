# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime ----
# server.js serve o build e entrega /config.js com as chaves PÚBLICAS do
# Supabase lidas das variáveis de ambiente do container (painel da Shard):
#   VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80
COPY --from=build /app/dist ./dist
COPY server.js package.json ./
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "server.js"]
