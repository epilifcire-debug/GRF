-- =====================================================================
-- GRF Controle Pessoal — tabela de valores pagos
--  * grf_valores            valor padrão de cada classificação (reajustes)
--  * grf_evento_valores     valor diferente só para um evento (opcional)
--  * grf_valores_historico  quem mudou o quê, quando, de quanto para quanto
-- Rode depois das migrações anteriores.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Valores padrão
-- ---------------------------------------------------------------------
create table public.grf_valores (
  classificacao text primary key check (classificacao in ('apoio', 'vigilante', 'grandes_eventos', 'lider', 'especial')),
  valor         numeric(10, 2) check (valor is null or (valor > 0 and valor < 100000)),
  updated_at    timestamptz not null default now(),
  updated_by    uuid default auth.uid() references auth.users (id) on delete set null
);

insert into public.grf_valores (classificacao, valor) values
  ('apoio', 110), ('vigilante', 120), ('grandes_eventos', 130), ('lider', 150), ('especial', null)
on conflict (classificacao) do nothing;

-- ---------------------------------------------------------------------
-- Valores por evento (sobrepõem o padrão só naquele evento)
-- ---------------------------------------------------------------------
create table public.grf_evento_valores (
  evento_id     uuid not null references public.grf_eventos (id) on delete cascade,
  classificacao text not null check (classificacao in ('apoio', 'vigilante', 'grandes_eventos', 'lider', 'especial')),
  valor         numeric(10, 2) not null check (valor > 0 and valor < 100000),
  updated_at    timestamptz not null default now(),
  updated_by    uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (evento_id, classificacao)
);

create trigger grf_valores_updated_at before update on public.grf_valores
  for each row execute function grf_private.set_updated_at();
create trigger grf_evento_valores_updated_at before update on public.grf_evento_valores
  for each row execute function grf_private.set_updated_at();

-- ---------------------------------------------------------------------
-- Histórico (escrito só pelos triggers abaixo)
-- ---------------------------------------------------------------------
create table public.grf_valores_historico (
  id             bigint generated always as identity primary key,
  evento_id      uuid references public.grf_eventos (id) on delete cascade, -- null = tabela padrão
  classificacao  text not null,
  valor_anterior numeric(10, 2),
  valor_novo     numeric(10, 2),
  alterado_por   uuid references public.grf_membros (user_id) on delete set null,
  alterado_em    timestamptz not null default now()
);

create index grf_valores_historico_evento_idx on public.grf_valores_historico (evento_id, alterado_em desc);

create or replace function grf_private.log_valor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid;
  v_class  text;
  v_old    numeric;
  v_new    numeric;
  v_user   uuid := auth.uid();
begin
  if tg_table_name = 'grf_evento_valores' then
    v_evento := coalesce(new.evento_id, old.evento_id);
  end if;
  v_class := coalesce(new.classificacao, old.classificacao);
  v_old := case when tg_op in ('UPDATE', 'DELETE') then old.valor end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then new.valor end;

  if v_old is distinct from v_new then
    insert into public.grf_valores_historico (evento_id, classificacao, valor_anterior, valor_novo, alterado_por)
    values (
      v_evento, v_class, v_old, v_new,
      case when exists (select 1 from public.grf_membros m where m.user_id = v_user) then v_user end
    );
  end if;
  return coalesce(new, old);
end;
$$;

create trigger grf_valores_log after insert or update on public.grf_valores
  for each row execute function grf_private.log_valor();
create trigger grf_evento_valores_log after insert or update or delete on public.grf_evento_valores
  for each row execute function grf_private.log_valor();

-- ---------------------------------------------------------------------
-- RLS
--  * valores padrão: membros leem; só admin altera
--  * valores do evento: membros fazem tudo
--  * histórico: membros leem; ninguém escreve direto
-- ---------------------------------------------------------------------
alter table public.grf_valores enable row level security;
alter table public.grf_evento_valores enable row level security;
alter table public.grf_valores_historico enable row level security;

create policy "grf_valores_select" on public.grf_valores for select to authenticated using ((select grf_private.is_member()));
create policy "grf_valores_update_admin" on public.grf_valores for update to authenticated
  using ((select grf_private.is_admin())) with check ((select grf_private.is_admin()));

create policy "grf_evento_valores_select" on public.grf_evento_valores for select to authenticated using ((select grf_private.is_member()));
create policy "grf_evento_valores_insert" on public.grf_evento_valores for insert to authenticated with check ((select grf_private.is_member()));
create policy "grf_evento_valores_update" on public.grf_evento_valores for update to authenticated using ((select grf_private.is_member())) with check ((select grf_private.is_member()));
create policy "grf_evento_valores_delete" on public.grf_evento_valores for delete to authenticated using ((select grf_private.is_member()));

create policy "grf_valores_historico_select" on public.grf_valores_historico for select to authenticated using ((select grf_private.is_member()));

revoke all on public.grf_valores, public.grf_evento_valores, public.grf_valores_historico from anon;
revoke insert, update, delete on public.grf_valores_historico from authenticated;
revoke insert, delete on public.grf_valores from authenticated;
