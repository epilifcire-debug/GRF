# GRF Controle Pessoal

Sistema de controle de efetivo da **GRF Segurança Patrimonial Privada Ltda**: eventos, cadastro único do pessoal, efetivo por evento e relatório "Controle Pessoal" pronto para impressão. Os dados ficam no **Supabase**, com login.

## Funcionalidades

- **Login por usuário ou e-mail**: só entra quem o administrador liberou. O e-mail é opcional e não há confirmação por e-mail. Cada usuário pode trocar a própria senha.
- **Eventos**: lista com data, município, número de pessoas e valor. Ao criar um evento, dá pra começar com o efetivo de outro evento.
- **Efetivo do evento**:
  - busca rápida pra adicionar pessoas já cadastradas (Enter adiciona);
  - botão "Nova pessoa", que cadastra e já adiciona ao evento;
  - cards de total por classificação (clicar filtra a tabela);
  - edição na própria linha da classificação e do valor do dia;
  - importação e exportação de CSV.
- **Relatório**: modelo GRF com cabeçalho do evento, caixas GE/VG/AP, coluna de assinatura, totais, linhas em branco opcionais e impressão limpa em A4.
- **Pessoas**: cadastro único com nome, chave PIX (detecta CPF, telefone, e-mail ou chave aleatória) e classificação padrão. Não aceita a mesma chave PIX duas vezes.
- **Usuários** (só admin): criar conta (o usuário é sugerido a partir do nome), trocar usuário, definir senha, trocar perfil (Equipe/Administrador) e desativar.
- **PWA**: instalável no celular e no computador, com aviso de nova versão.

| Classificação | Código no relatório | Valor padrão |
|---|---|---|
| Apoio | AP | R$ 110 |
| Curso Vigilante | VG | R$ 120 |
| Curso Grandes Eventos | GE | R$ 130 |
| Líder | "LÍDER" | R$ 150 |
| Especial | "ESP." | valor livre |

## Stack

React 18, TypeScript, Vite, Tailwind CSS e componentes shadcn/ui (Radix), com TanStack Query no front. No Supabase: Postgres com RLS, Auth e uma Edge Function.

## 1. Banco (uma vez)

Siga o passo a passo em [`supabase/SETUP.md`](supabase/SETUP.md): SQL das tabelas, Edge Function `grf-usuarios` e primeiro administrador.

## 2. Rodar localmente

```bash
cp .env.example .env      # preencha URL e publishable key do Supabase
npm install
npm run dev               # http://localhost:5173  (desenvolvimento)
npm run build && npm start  # servidor de produção (server.js)
```

## 3. Deploy na Shard Cloud (Docker — recomendado)

Crie a aplicação na Shard do tipo **Docker / Dockerfile**, apontando para este repositório ou enviando o zip. O `Dockerfile`:
1. instala as dependências e gera o build;
2. sobe uma imagem enxuta (`node:22-alpine`) que roda `node server.js` na porta **80**.

No painel da aplicação, defina as **variáveis de ambiente**, que são as chaves públicas do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

O `server.js` lê essas variáveis quando o container inicia e entrega o valor ao app em `/config.js`. Não precisa passar *build args*, e trocar a chave só exige reiniciar o container. Há um health check em `/health`.

### Alternativa: aplicação Node (sem Docker)

Se criar a aplicação como **Node.js**, use **entrypoint `server.js`** (ou o comando `node server.js`). O arquivo `.shardcloud` já vem com `MAIN=server.js`. Na primeira inicialização, o servidor gera o build sozinho.

### Local com Docker

```bash
docker build -t grf-controle-pessoal .
docker run -p 8080:80 -e VITE_SUPABASE_URL=... -e VITE_SUPABASE_PUBLISHABLE_KEY=... grf-controle-pessoal
```

## Preview (mockup navegável)

`npm run build:preview` gera `dist-preview/index.html`: um arquivo único com dados **fictícios** em memória, sem Supabase, usado só pra avaliar layout e tipografia. O build normal (`npm run build`) não inclui esses dados.

## Formato do CSV

```
Nome;Chave PIX;Classificação;Valor
Maria da Silva;123.456.789-09;Apoio;110
João Santos;(79) 99999-0000;VG;120
```

Na importação dentro de um evento, quem já está no cadastro (mesma chave PIX) é reaproveitado, os novos são cadastrados, e quem já estava no evento não é duplicado.

## Estrutura

```
supabase/
  migrations/…_grf_schema.sql   tabelas, view, RLS
  functions/grf-usuarios/       Edge Function (criar usuário / definir senha)
  SETUP.md                      passo a passo do banco
src/
  lib/api.ts                    contrato da camada de dados + importação CSV
  lib/api-supabase.ts           implementação Supabase (produção)
  lib/api-demo.ts               dados fictícios (só no preview)
  lib/data.ts                   sessão e hooks (TanStack Query)
  pages/                        Login, Eventos, Evento (efetivo + relatório), Pessoas, Usuários
  components/                   layout, formulários e componentes de UI
public/                         ícones, manifest e service worker
```

---
by: efcsys
