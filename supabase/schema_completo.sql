-- ============================================================
-- PORTAL DE PROCESSOS - SCHEMA COMPLETO / MIGRAÇÃO
-- React + Vite + Supabase + Vercel
-- ============================================================
--
-- Execute este arquivo no SQL Editor do MESMO projeto Supabase
-- configurado em VITE_SUPABASE_URL.
--
-- Fluxo de acesso:
-- 1. Cadastro cria auth.users + profiles.
-- 2. No primeiro login ainda não aprovado, o sistema cria uma solicitação PENDENTE.
-- 3. O administrador aprova/nega.
-- 4. Depois da primeira aprovação, o usuário permanece autorizado.
-- 5. Novos logins não geram novas solicitações para usuários já aprovados.
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  regra text not null default 'usuario'
    check (regra in ('admin', 'usuario')),
  criado_em timestamptz not null default now()
);

alter table public.profiles add column if not exists nome text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists criado_em timestamptz not null default now();

-- Garante que a coluna regra exista em instalações antigas.
alter table public.profiles add column if not exists regra text not null default 'usuario';

-- Normaliza instalações antigas antes de reforçar a restrição.
update public.profiles
set regra = 'usuario'
where regra is null
   or regra not in ('admin', 'usuario');

alter table public.profiles alter column regra set default 'usuario';
alter table public.profiles alter column regra set not null;
alter table public.profiles drop constraint if exists profiles_regra_portal_check;
alter table public.profiles
  add constraint profiles_regra_portal_check
  check (regra in ('admin', 'usuario'));

-- Preenche nome/e-mail de perfis já existentes.
update public.profiles p
set
  email = coalesce(p.email, u.email),
  nome = coalesce(
    nullif(trim(p.nome), ''),
    nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
    split_part(coalesce(u.email, 'Usuário'), '@', 1)
  )
from auth.users u
where u.id = p.id;

-- Cria profiles para usuários antigos que ainda não possuam registro.
insert into public.profiles (id, nome, email, regra)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
    split_part(coalesce(u.email, 'Usuário'), '@', 1)
  ),
  u.email,
  'usuario'
from auth.users u
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, regra)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      split_part(coalesce(new.email, 'Usuário'), '@', 1)
    ),
    new.email,
    'usuario'
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.profiles.nome),
    email = coalesce(excluded.email, public.profiles.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Função central para identificar administrador sem criar recursão de RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.regra = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;

-- Remove políticas antigas desta tabela antes de aplicar o modelo novo.
do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', politica.policyname);
  end loop;
end
$$;

drop policy if exists "profiles_select_proprio_ou_admin" on public.profiles;
create policy "profiles_select_proprio_ou_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;

-- ============================================================
-- 2. SOLICITAÇÕES DE ACESSO
-- ============================================================

create table if not exists public.solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  session_id uuid,
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE', 'APROVADO', 'NEGADO', 'CANCELADO')),
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);

alter table public.solicitacoes_acesso add column if not exists session_id uuid;
alter table public.solicitacoes_acesso add column if not exists aprovado_em timestamptz;

update public.solicitacoes_acesso
set status = 'CANCELADO'
where status is null
   or status not in ('PENDENTE', 'APROVADO', 'NEGADO', 'CANCELADO');

alter table public.solicitacoes_acesso alter column status set default 'PENDENTE';
alter table public.solicitacoes_acesso alter column status set not null;
alter table public.solicitacoes_acesso
  drop constraint if exists solicitacoes_status_portal_check;
alter table public.solicitacoes_acesso
  add constraint solicitacoes_status_portal_check
  check (status in ('PENDENTE', 'APROVADO', 'NEGADO', 'CANCELADO'));

create index if not exists idx_solicitacoes_acesso_user_id
  on public.solicitacoes_acesso(user_id);

create index if not exists idx_solicitacoes_acesso_status
  on public.solicitacoes_acesso(status);

create index if not exists idx_solicitacoes_acesso_session_id
  on public.solicitacoes_acesso(session_id);

create index if not exists idx_solicitacoes_acesso_criado_em
  on public.solicitacoes_acesso(criado_em desc);

-- Solicitações antigas sem session_id não podem autorizar a sessão atual.
update public.solicitacoes_acesso
set status = 'CANCELADO'
where status = 'PENDENTE'
  and session_id is null;

-- Se houver mais de uma pendente por usuário, conserva somente a mais recente.
with pendentes_duplicadas as (
  select
    id,
    row_number() over (
      partition by user_id
      order by criado_em desc, id desc
    ) as posicao
  from public.solicitacoes_acesso
  where status = 'PENDENTE'
)
update public.solicitacoes_acesso s
set status = 'CANCELADO'
from pendentes_duplicadas d
where s.id = d.id
  and d.posicao > 1;

create unique index if not exists ux_solicitacao_pendente_por_usuario
  on public.solicitacoes_acesso(user_id)
  where status = 'PENDENTE';

alter table public.solicitacoes_acesso enable row level security;

-- Remove políticas antigas, inclusive as da primeira versão do projeto,
-- para que uma policy permissiva antiga não contorne a validação por session_id.
do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'solicitacoes_acesso'
  loop
    execute format(
      'drop policy if exists %I on public.solicitacoes_acesso',
      politica.policyname
    );
  end loop;
end
$$;

drop policy if exists "solicitacoes_select" on public.solicitacoes_acesso;
create policy "solicitacoes_select"
on public.solicitacoes_acesso
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists "solicitacoes_insert_propria_sessao" on public.solicitacoes_acesso;
create policy "solicitacoes_insert_propria_sessao"
on public.solicitacoes_acesso
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'PENDENTE'
  and session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
);

drop policy if exists "solicitacoes_update_usuario_ou_admin" on public.solicitacoes_acesso;
create policy "solicitacoes_update_usuario_ou_admin"
on public.solicitacoes_acesso
for update
to authenticated
using (
  (
    user_id = (select auth.uid())
    and status = 'PENDENTE'
  )
  or (select public.is_admin())
)
with check (
  (
    user_id = (select auth.uid())
    and status = 'CANCELADO'
  )
  or (select public.is_admin())
);

revoke all on public.solicitacoes_acesso from anon;
revoke update on public.solicitacoes_acesso from authenticated;
grant select, insert on public.solicitacoes_acesso to authenticated;
grant update (status, aprovado_em) on public.solicitacoes_acesso to authenticated;

-- Acesso permanente: basta existir uma aprovação anterior para o usuário.
-- A session_id continua armazenada nas solicitações para auditoria, mas não
-- limita mais a autorização depois que o administrador aprovou o usuário.
create or replace function public.tem_acesso_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (select public.is_admin())
    or exists (
      select 1
      from public.solicitacoes_acesso s
      where s.user_id = (select auth.uid())
        and s.status = 'APROVADO'
    );
$$;

revoke all on function public.tem_acesso_portal() from public;
grant execute on function public.tem_acesso_portal() to authenticated;

-- Mantém a função antiga como alias de compatibilidade para instalações
-- que ainda tenham referências a ela em políticas ou consultas antigas.
create or replace function public.tem_acesso_sessao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tem_acesso_portal();
$$;

revoke all on function public.tem_acesso_sessao() from public;
grant execute on function public.tem_acesso_sessao() to authenticated;

-- ============================================================
-- 3. DOCUMENTOS (POPS)
-- ============================================================

create table if not exists public.pops (
  id bigint generated by default as identity primary key,
  titulo text not null,
  setor text not null,
  tipo_documento text not null,
  arquivo_url text,
  storage_path text,
  criado_em timestamptz not null default now()
);

alter table public.pops add column if not exists tipo_documento text;
alter table public.pops add column if not exists arquivo_url text;
alter table public.pops add column if not exists storage_path text;
alter table public.pops add column if not exists criado_em timestamptz not null default now();

-- O código novo usa storage_path; arquivo_url fica apenas para compatibilidade legada.
alter table public.pops alter column arquivo_url drop not null;

create index if not exists idx_pops_setor on public.pops(setor);
create index if not exists idx_pops_tipo_documento on public.pops(tipo_documento);

alter table public.pops enable row level security;

-- Substitui políticas antigas da tabela pelos controles abaixo.
do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pops'
  loop
    execute format('drop policy if exists %I on public.pops', politica.policyname);
  end loop;
end
$$;

drop policy if exists "pops_select_sessao_aprovada" on public.pops;
drop policy if exists "pops_select_usuario_aprovado" on public.pops;
create policy "pops_select_usuario_aprovado"
on public.pops
for select
to authenticated
using ((select public.tem_acesso_portal()));

drop policy if exists "pops_insert_admin" on public.pops;
create policy "pops_insert_admin"
on public.pops
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists "pops_update_admin" on public.pops;
create policy "pops_update_admin"
on public.pops
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "pops_delete_admin" on public.pops;
create policy "pops_delete_admin"
on public.pops
for delete
to authenticated
using ((select public.is_admin()));

revoke all on public.pops from anon;
grant select, insert, update, delete on public.pops to authenticated;

-- ============================================================
-- 4. STORAGE PRIVADO DOS PDFs
-- ============================================================

insert into storage.buckets (id, name, public)
values ('pops', 'pops', false)
on conflict (id)
do update set public = false;

-- Remove somente políticas de Storage cujo nome identifica este bucket/projeto.
-- Políticas de outros buckets permanecem intactas.
do $$
declare
  politica record;
begin
  for politica in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and lower(policyname) like '%pops%'
  loop
    execute format('drop policy if exists %I on storage.objects', politica.policyname);
  end loop;
end
$$;

drop policy if exists "storage_pops_select_sessao_aprovada" on storage.objects;
drop policy if exists "storage_pops_select_usuario_aprovado" on storage.objects;
create policy "storage_pops_select_usuario_aprovado"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pops'
  and (select public.tem_acesso_portal())
);

drop policy if exists "storage_pops_insert_admin" on storage.objects;
create policy "storage_pops_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pops'
  and (select public.is_admin())
);

drop policy if exists "storage_pops_update_admin" on storage.objects;
create policy "storage_pops_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pops'
  and (select public.is_admin())
)
with check (
  bucket_id = 'pops'
  and (select public.is_admin())
);

drop policy if exists "storage_pops_delete_admin" on storage.objects;
create policy "storage_pops_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pops'
  and (select public.is_admin())
);

-- ============================================================
-- 5. DEFINIR ADMINISTRADOR
-- ============================================================
-- Execute o bloco abaixo separadamente, trocando pelo e-mail real:
--
-- update public.profiles
-- set regra = 'admin'
-- where id = (
--   select id
--   from auth.users
--   where lower(email) = lower('SEU-EMAIL-ADMIN@EMPRESA.COM')
-- );
--
-- ============================================================
-- 6. CONFERÊNCIA
-- ============================================================
-- select * from public.profiles order by criado_em desc;
-- select * from public.solicitacoes_acesso order by criado_em desc;
-- select * from public.pops order by titulo;
-- select id, name, public from storage.buckets where id = 'pops';
-- ============================================================
