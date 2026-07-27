-- ============================================================
-- MIGRAÇÃO: APROVAÇÃO PERMANENTE POR USUÁRIO
-- Execute no Supabase SQL Editor após publicar o frontend corrigido.
-- Não apaga usuários, solicitações nem documentos existentes.
-- ============================================================

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

-- POPs: leitura permitida para qualquer usuário já aprovado.
drop policy if exists "pops_select_sessao_aprovada" on public.pops;
drop policy if exists "pops_select_usuario_aprovado" on public.pops;

create policy "pops_select_usuario_aprovado"
on public.pops
for select
to authenticated
using ((select public.tem_acesso_portal()));

-- Storage: mesma regra para PDFs privados.
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

-- Conferência opcional: usuários que já possuem aprovação permanente.
-- select distinct p.id, p.nome, p.email
-- from public.profiles p
-- join public.solicitacoes_acesso s on s.user_id = p.id
-- where s.status = 'APROVADO'
-- order by p.nome;
