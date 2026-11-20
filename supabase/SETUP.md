# Configurar o Supabase — GRF Controle Pessoal

O GRF usa o projeto **Monitoramento**. Todas as tabelas começam com `grf_` e não mexem em nada que já exista lá.

## 1. Criar as tabelas

1. Abra o projeto **Monitoramento** no Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/migrations/20261120000000_grf_schema.sql`.
3. Clique em **Run**. Deve aparecer *Success. No rows returned*.

Isso cria:

| Objeto | Para quê |
|---|---|
| `grf_membros` | Quem pode usar o app (nome, e-mail, perfil admin/equipe, ativo) |
| `grf_pessoas` | Cadastro único do pessoal (nome, PIX, classificação padrão) |
| `grf_eventos` | Eventos, ou seja, o cabeçalho do relatório |
| `grf_efetivo` | Quem trabalha em cada evento, com classificação e valor do dia |
| `grf_eventos_resumo` | View com total de pessoas e valor por evento |
| schema `grf_private` | Funções internas de permissão (não ficam expostas na API) |

**Segurança (RLS ligada em tudo):**
- Só usuários cadastrados e **ativos** em `grf_membros` veem ou alteram dados.
- Um login do Monitoramento que não esteja em `grf_membros` não vê nada do GRF.
- Só **admin** cria, edita ou desativa usuários. O admin não consegue desativar nem rebaixar a si mesmo.
- Uma chave PIX não pode ser cadastrada duas vezes. Uma pessoa que está em algum evento não pode ser excluída.

## 2. Publicar a Edge Function (criar usuários pelo app)

A tela **Usuários** cria logins por esta função, que usa a service_role apenas no servidor.

**Pelo painel:** **Edge Functions** → **Deploy a new function** → **Via Editor** → nome `grf-usuarios` → cole o conteúdo de `supabase/functions/grf-usuarios/index.ts` → **Deploy**.

**Ou pela CLI:**
```bash
supabase functions deploy grf-usuarios --project-ref sszshzatzrvxvtmnaysc
```

Deixe **Verify JWT** ligado (é o padrão). Não precisa cadastrar nenhum segredo: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem nas funções.

## 3. Criar o primeiro administrador

O primeiro admin é criado à mão, uma única vez. Depois disso, os outros usuários são criados pelo próprio app.

1. **Authentication** → **Users** → **Add user** → **Create new user**: informe seu e-mail e uma senha, e marque **Auto Confirm User**.
2. No **SQL Editor**, rode o comando abaixo trocando o e-mail e o nome:

```sql
insert into public.grf_membros (user_id, nome, email, papel)
select id, 'Eric', email, 'admin'
from auth.users
where email = 'SEU-EMAIL@exemplo.com';
```

Deve aparecer *1 row inserted*. Agora é só entrar no app com esse e-mail e senha.

## 4. Chaves do app

Em **Project Settings** → **API**, copie:

- **Project URL** → `VITE_SUPABASE_URL`
- **Publishable key** (ou a *anon* legada) → `VITE_SUPABASE_PUBLISHABLE_KEY`

Essas chaves são públicas por natureza e vão no navegador. **Nunca** use a `service_role` no app.

- **Local:** copie `.env.example` para `.env` e preencha.
- **Shard Cloud / Docker:** passe as duas como *build args* (veja o README).

## Conferir

- **Advisors → Security** no painel não deve acusar tabelas `grf_` sem RLS.
- Entre com um login que **não** está em `grf_membros`: o app mostra "Acesso não liberado".
