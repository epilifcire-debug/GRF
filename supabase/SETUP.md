# Configurar o Supabase — GRF Controle Pessoal

Rode tudo no **mesmo projeto** Supabase cujas URL e chave estão nas variáveis do app (hoje: `falwwfviodfxjriyulay`). Todas as tabelas começam com `grf_` e não mexem em nada que já exista no projeto.

## 1. Criar as tabelas

No **SQL Editor** do projeto, rode **na ordem** (cada arquivo inteiro → **Run**):

1. `supabase/migrations/20261120000000_grf_schema.sql`: tabelas, view e RLS.
2. `supabase/migrations/20261120210000_grf_login_usuario.sql`: login por **usuário ou e-mail**. Rode este **depois** de criar o primeiro admin (passo 3), ou rode de novo o comando de admin depois dele; o arquivo já preenche o usuário de quem existir.
3. `supabase/migrations/20261120220000_grf_valores.sql`: **tabela de valores** (padrão por classificação, valores próprios por evento e histórico de alterações). Só o admin altera a tabela padrão; qualquer membro altera os valores de um evento.

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

A tela **Usuários** cria contas, troca usuário e define senha por esta função, que usa a service_role apenas no servidor. **Sempre que este arquivo mudar, publique de novo.**

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

Antes da migração de login (só o schema inicial rodado):

```sql
insert into public.grf_membros (user_id, nome, email, papel, ativo)
select id, 'Eric', email, 'admin', true
from auth.users
where lower(email) = lower('SEU-EMAIL@exemplo.com')
on conflict (user_id) do update set papel = 'admin', ativo = true;
```

Depois da migração de login (coluna `login` já existe):

```sql
insert into public.grf_membros (user_id, nome, login, email, papel, ativo)
select id, 'Eric', 'eric', email, 'admin', true
from auth.users
where lower(email) = lower('SEU-EMAIL@exemplo.com')
on conflict (user_id) do update set papel = 'admin', ativo = true;
```

Deve aparecer *1 row affected*. Se aparecer **0**, o login não existe **neste** projeto: confira se o usuário foi criado no mesmo projeto do app.

Para conferir:

```sql
select u.email, m.papel, m.ativo
from auth.users u
left join public.grf_membros m on m.user_id = u.id
where lower(u.email) = lower('SEU-EMAIL@exemplo.com');
``` Agora é só entrar no app com esse e-mail e senha.

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

## Como funciona o login (usuário ou e-mail)

- Cada membro tem um **usuário** (ex.: `joao.silva`) e, se quiser, um **e-mail de contato**. Os dois servem para entrar.
- O Supabase exige e-mail em toda conta. Por isso, contas criadas pelo app usam um e-mail interno gerado do usuário (`grf-joao.silva@efcsys.com`). Ele não recebe mensagens e a conta já nasce confirmada.
- Quem foi criado direto no painel do Supabase com e-mail real (como o primeiro admin) entra com esse e-mail. Para passar a entrar também pelo usuário, use **Usuários → Usuário** e salve o nome desejado. O e-mail de contato continua servindo para entrar.
- Para trocar o domínio interno, altere `LOGIN_DOMAIN` em `src/lib/login.ts` **e** na Edge Function. As duas precisam ficar iguais.
