-- =====================================================================
-- GRF Controle Pessoal — login por nome de usuário
-- Cada membro passa a ter um "login" (ex.: joao.silva). O e-mail vira
-- opcional, só para contato. O e-mail de autenticação do Supabase é
-- gerado a partir do login (grf-<login>@efcsys.com) pela Edge Function.
-- Rode uma vez, depois do schema inicial.
-- =====================================================================

alter table public.grf_membros add column if not exists login text;

-- Preenche quem já existe com a parte antes do @ do e-mail
-- (remove caracteres inválidos; se ficar curto, completa com parte do id)
update public.grf_membros
set login = left(
  case when length(base) >= 3 then base else base || substr(replace(user_id::text, '-', ''), 1, 6) end, 30)
from (
  select user_id as uid,
         regexp_replace(regexp_replace(lower(split_part(coalesce(email, ''), '@', 1)), '[^a-z0-9._-]', '', 'g'), '^[^a-z0-9]+', '') as base
  from public.grf_membros
) b
where b.uid = grf_membros.user_id and grf_membros.login is null;

alter table public.grf_membros
  alter column login set not null,
  add constraint grf_membros_login_formato check (login ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

create unique index if not exists grf_membros_login_unique on public.grf_membros (login);

-- E-mail agora é só contato (opcional)
alter table public.grf_membros alter column email drop not null;

-- E-mail de contato não pode se repetir entre membros (permite entrar com ele)
create unique index if not exists grf_membros_email_unique
  on public.grf_membros (lower(email)) where email is not null;

-- ---------------------------------------------------------------------
-- Entrar com e-mail: devolve o nome de usuário do membro ativo dono
-- daquele e-mail de contato (o app então entra pelo usuário).
-- Não revela senha nem e-mail; só o login, e só de membro ativo.
-- ---------------------------------------------------------------------
create or replace function public.grf_login_por_email(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.login
  from public.grf_membros m
  where m.email is not null
    and lower(m.email) = lower(trim(p_email))
    and m.ativo
  limit 1;
$$;

revoke all on function public.grf_login_por_email(text) from public;
grant execute on function public.grf_login_por_email(text) to anon, authenticated;
