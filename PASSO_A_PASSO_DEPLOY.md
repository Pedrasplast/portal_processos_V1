# Passo a passo — substituir o repositório e publicar na Vercel

## 1. Substitua o código do GitHub

A raiz do repositório deve ficar assim:

```text
public/
src/
supabase/
.env.example
.gitignore
.oxlintrc.json
index.html
package.json
vite.config.js
vercel.json
README.md
MIGRACAO.md
```

Não crie outra pasta `portal_processos_restricao_acesso` dentro da raiz.

O arquivo `.env` real não deve ser enviado ao GitHub.

Se o repositório atual já possui `package-lock.json`, pode mantê-lo. As dependências do `package.json` não foram alteradas.

## 2. Execute o SQL antes de testar o novo login

No Supabase:

1. Abra **SQL Editor**.
2. Abra o arquivo `supabase/schema_completo.sql` deste projeto.
3. Cole todo o conteúdo.
4. Clique em **Run**.

O SQL não apaga a tabela antiga `usuarios_pops`, mas o novo frontend não depende dela.

## 3. Defina o administrador

Depois que a conta do administrador existir em Authentication > Users, execute:

```sql
update public.profiles
set regra = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('SEU-EMAIL-ADMIN@EMPRESA.COM')
);
```

## 4. Configure o Supabase Auth

Em **Authentication > URL Configuration**:

- Site URL: `https://portal-processos-restricao-acesso.vercel.app`
- Redirect URL: `https://portal-processos-restricao-acesso.vercel.app/**`
- Para desenvolvimento: `http://localhost:5173/**`

## 5. Configure a Vercel

Em **Project > Settings > Environment Variables**, crie:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use a URL e a chave publishable/anon do mesmo projeto Supabase onde o SQL foi executado.

Depois faça um novo deploy.

O `vercel.json` já está pronto para React Router/Vite.

## 6. Teste o fluxo

### Usuário comum

1. Acesse `/cadastro`.
2. Crie a conta.
3. Confirme o e-mail caso a confirmação esteja habilitada no Supabase.
4. Acesse `/login`.
5. Entre com e-mail e senha.
6. A tela deve ficar em **Aguardando autorização**.

### Administrador

1. Entre em `/login` com a conta `profiles.regra = admin`.
2. Abra **Solicitações de Acesso**.
3. A solicitação do usuário deve aparecer como `PENDENTE`.
4. Clique em **Aprovar**.

### Resultado esperado

O usuário deve sair automaticamente da tela de espera e entrar na Home.

Depois:

1. Faça logout do usuário.
2. Faça login novamente.
3. O usuário deve entrar direto, sem gerar uma nova solicitação.

## 7. Como funciona a aprovação permanente

A primeira vez que um usuário comum entra, o sistema cria uma solicitação `PENDENTE`.
Depois que o administrador muda essa solicitação para `APROVADO`, o sistema considera esse usuário autorizado permanentemente.

Nos próximos logins, o frontend e as políticas RLS procuram qualquer aprovação anterior para o `user_id` autenticado. Encontrando uma, a Home e os documentos são liberados sem um novo pedido.

## 8. PDFs

O bucket `pops` passa a ser privado. O frontend baixa os PDFs usando a sessão autenticada do Supabase, em vez de depender de `getPublicUrl()`.

Para documentos antigos, confirme que a coluna `pops.storage_path` está preenchida. O projeto mantém fallback para `arquivo_url`, mas uma URL pública antiga deixa de funcionar depois que o bucket é privado se não houver `storage_path` correspondente.
