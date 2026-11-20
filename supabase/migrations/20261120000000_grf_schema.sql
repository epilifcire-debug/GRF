-- =====================================================================
-- GRF Controle Pessoal — schema
-- Projeto Supabase compartilhado (Monitoramento): todas as tabelas do
-- GRF usam o prefixo grf_ e as funções auxiliares ficam no schema
-- grf_private (não exposto pela API).
--
-- Acesso: somente usuários cadastrados em grf_membros (e ativos).
-- Todos os membros veem e editam eventos, pessoas e efetivo.
-- Somente admin gerencia membros.
-- =====================================================================

create schema if not exists grf_private;
revoke all on schema grf_private from public;
grant usage on schema grf_private to authenticated;

-- ---------------------------------------------------------------------
-- Membros (quem pode usar o app)
-- ---------------------------------------------------------------------
create table public.grf_membros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (char_length(trim(nome)) between 2 and 120),
  email      text not null,
  papel      text not null default 'equipe' check (papel in ('admin', 'equipe')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- Funções auxiliares para RLS (security definer para não cair em
-- recursão de policy ao consultar grf_membros)
create or replace function grf_private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grf_membros m
    where m.user_id = (select auth.uid()) and m.ativo
  );
$$;

create or replace function grf_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grf_membros m
    where m.user_id = (select auth.uid()) and m.ativo and m.papel = 'admin'
  );
$$;

revoke all on function grf_private.is_member() from public;
revoke all on function grf_private.is_admin() from public;
grant execute on function grf_private.is_member() to authenticated;
grant execute on function grf_private.is_admin() to authenticated;

alter table public.grf_membros enable row level security;

-- Cada usuário sempre enxerga o próprio registro (o app usa isso para
-- saber se o login tem acesso); membros enxergam a lista toda.
create policy "grf_membros_select" on public.grf_membros
  for select to authenticated
  using (user_id = (select auth.uid()) or (select grf_private.is_member()));

create policy "grf_membros_insert_admin" on public.grf_membros
  for insert to authenticated
  with check ((select grf_private.is_admin()));

-- Admin não pode rebaixar nem desativar a si mesmo (evita ficar sem admin)
create policy "grf_membros_update_admin" on public.grf_membros
  for update to authenticated
  using ((select grf_private.is_admin()))
  with check (
    (select grf_private.is_admin())
    and (user_id <> (select auth.uid()) or (papel = 'admin' and ativo))
  );

create policy "grf_membros_delete_admin" on public.grf_membros
  for delete to authenticated
  using ((select grf_private.is_admin()) and user_id <> (select auth.uid()));

-- ---------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------
create or replace function grf_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Pessoas (cadastro único, reaproveitado em todos os eventos)
-- ---------------------------------------------------------------------
create table public.grf_pessoas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (char_length(trim(nome)) between 3 and 160),
  pix_chave     text not null check (char_length(trim(pix_chave)) between 3 and 140),
  pix_tipo      text not null default 'outro' check (pix_tipo in ('cpf', 'telefone', 'email', 'aleatoria', 'outro')),
  classificacao text not null default 'apoio' check (classificacao in ('apoio', 'vigilante', 'grandes_eventos', 'lider', 'especial')),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Evita a mesma chave PIX cadastrada duas vezes: CPF/telefone comparam só
-- os dígitos; e-mail e chave aleatória comparam o texto em minúsculas
create unique index grf_pessoas_pix_unique
  on public.grf_pessoas ((case when pix_chave ~ '[A-Za-z@]' then lower(trim(pix_chave))
                              else regexp_replace(pix_chave, '\D', '', 'g') end));
create index grf_pessoas_nome_idx on public.grf_pessoas (lower(nome));

create trigger grf_pessoas_updated_at before update on public.grf_pessoas
  for each row execute function grf_private.set_updated_at();

-- ---------------------------------------------------------------------
-- Eventos (cabeçalho do relatório)
-- ---------------------------------------------------------------------
create table public.grf_eventos (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(trim(nome)) between 2 and 160),
  municipio    text not null default '',
  data         date,
  organizador  text not null default '',
  telefone     text not null default '',
  observacoes  text not null default '',
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index grf_eventos_data_idx on public.grf_eventos (data desc nulls last);

create trigger grf_eventos_updated_at before update on public.grf_eventos
  for each row execute function grf_private.set_updated_at();

-- ---------------------------------------------------------------------
-- Efetivo (pessoa escalada em um evento, com classificação e valor do dia)
-- ---------------------------------------------------------------------
create table public.grf_efetivo (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.grf_eventos (id) on delete cascade,
  pessoa_id     uuid not null references public.grf_pessoas (id) on delete restrict,
  classificacao text not null check (classificacao in ('apoio', 'vigilante', 'grandes_eventos', 'lider', 'especial')),
  valor         numeric(10, 2) not null check (valor > 0 and valor < 100000),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (evento_id, pessoa_id)
);

create index grf_efetivo_pessoa_idx on public.grf_efetivo (pessoa_id);

-- ---------------------------------------------------------------------
-- Resumo por evento (respeita a RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.grf_eventos_resumo
with (security_invoker = true) as
select
  e.*,
  count(f.id)::int                as total_pessoas,
  coalesce(sum(f.valor), 0)::numeric(12, 2) as valor_total
from public.grf_eventos e
left join public.grf_efetivo f on f.evento_id = e.id
group by e.id;

-- ---------------------------------------------------------------------
-- RLS: membros ativos fazem tudo em pessoas, eventos e efetivo
-- ---------------------------------------------------------------------
alter table public.grf_pessoas enable row level security;
alter table public.grf_eventos enable row level security;
alter table public.grf_efetivo enable row level security;

create policy "grf_pessoas_select" on public.grf_pessoas for select to authenticated using ((select grf_private.is_member()));
create policy "grf_pessoas_insert" on public.grf_pessoas for insert to authenticated with check ((select grf_private.is_member()));
create policy "grf_pessoas_update" on public.grf_pessoas for update to authenticated using ((select grf_private.is_member())) with check ((select grf_private.is_member()));
create policy "grf_pessoas_delete" on public.grf_pessoas for delete to authenticated using ((select grf_private.is_member()));

create policy "grf_eventos_select" on public.grf_eventos for select to authenticated using ((select grf_private.is_member()));
create policy "grf_eventos_insert" on public.grf_eventos for insert to authenticated with check ((select grf_private.is_member()));
create policy "grf_eventos_update" on public.grf_eventos for update to authenticated using ((select grf_private.is_member())) with check ((select grf_private.is_member()));
create policy "grf_eventos_delete" on public.grf_eventos for delete to authenticated using ((select grf_private.is_member()));

create policy "grf_efetivo_select" on public.grf_efetivo for select to authenticated using ((select grf_private.is_member()));
create policy "grf_efetivo_insert" on public.grf_efetivo for insert to authenticated with check ((select grf_private.is_member()));
create policy "grf_efetivo_update" on public.grf_efetivo for update to authenticated using ((select grf_private.is_member())) with check ((select grf_private.is_member()));
create policy "grf_efetivo_delete" on public.grf_efetivo for delete to authenticated using ((select grf_private.is_member()));

-- Nada para usuários anônimos
revoke all on public.grf_membros, public.grf_pessoas, public.grf_eventos, public.grf_efetivo, public.grf_eventos_resumo from anon;
