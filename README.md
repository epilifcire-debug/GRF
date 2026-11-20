# GRF Controle Pessoal

Sistema de controle de efetivo da **GRF Segurança Patrimonial Privada Ltda**: cadastro do pessoal por evento, totais por classificação e relatório "Controle Pessoal" pronto para impressão.

## Funcionalidades

- **Cadastro**: nome, chave PIX (detecta CPF, telefone ou e-mail e aplica a máscara), classificação e valor (preenchido pela classificação, mas editável). Avisa quando o nome ou a chave PIX já foram cadastrados.
- **Equipe**: cards de resumo por tipo (clique para filtrar), busca, tabela zebrada, edição inline (Enter salva, Esc cancela), exclusão com confirmação.
- **CSV**: importação (separador `;`, `,` ou TAB, com ou sem cabeçalho), exportação e planilha modelo.
- **Relatório**: cabeçalho editável (evento, município, data com calendário, organizador, contato, observações), cabeçalho oficial da GRF, tabela Nº | Nome | GE/VG/AP | Chave PIX | Valor | Assinatura, linhas em branco opcionais, filtro por classificação, totais e impressão limpa em A4.
- **PWA**: dá pra instalar no celular e no computador (botão "Instalar app" no menu quando o navegador permitir). Funciona em tela cheia e abre mesmo sem internet, porque o service worker guarda só os arquivos do app, nunca os dados. Quando sai versão nova, aparece um aviso "Atualizar".
- **Dados**: ficam salvos no `localStorage` do navegador (não há backend).

| Classificação | Código | Valor padrão |
|---|---|---|
| Apoio | AP | R$ 110 |
| Curso Vigilante | VG | R$ 120 |
| Curso Grandes Eventos | GE | R$ 130 |
| Líder | — (aparece "LÍDER") | R$ 150 |
| Especial | — (aparece "ESP.") | valor livre |

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + componentes no padrão shadcn/ui (Radix) + lucide-react + sonner.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera a pasta dist/
npm run preview    # serve o build em http://localhost:8080
```

## Deploy (Shard Cloud ou qualquer Docker)

O `Dockerfile` faz o build e serve com nginx na porta **80**. O `nginx.conf` já trata as rotas da SPA.

```bash
docker build -t grf-controle-pessoal .
docker run -p 8080:80 grf-controle-pessoal
```

Como a pasta `dist/` é estática, também roda em GitHub Pages, Vercel ou Netlify. Nesses casos, configure o fallback de rotas para `index.html`.

## Formato do CSV

```
Nome;Chave PIX;Classificação;Valor
Maria da Silva;123.456.789-09;Apoio;110
João Santos;(79) 99999-0000;VG;120
```

A coluna Classificação aceita o nome ou o código (Apoio/AP, Vigilante/VG, Grandes Eventos/GE, Líder, Especial). Se o Valor ficar vazio, entra o valor padrão da classificação.

## Estrutura

```
src/
  lib/staff.ts      classificações, tipos e persistência (localStorage)
  lib/pix.ts        detecção, validação e máscaras de PIX
  lib/csv.ts        importação e exportação de CSV
  pages/Cadastro.tsx
  pages/Equipe.tsx
  pages/Relatorio.tsx
  components/       layout (sidebar escura e nav mobile) e componentes de UI
public/             logos e ícones da GRF
```

Para migrar para o Supabase no futuro, basta trocar a persistência em `src/lib/staff.ts`. As telas usam somente os hooks `useStaff` e `useReportHeader`.

---
by: efcsys
