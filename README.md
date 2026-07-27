# Portal de Processos

Portal React/Vite com Supabase para consulta e administração de POPs, Fluxogramas e Mapas Visuais.

## Fluxo de acesso

1. O usuário cria a própria conta em `/cadastro`.
2. O Supabase Auth cria `auth.users` e o trigger cria `public.profiles`.
3. O usuário faz login.
4. Administradores (`profiles.regra = 'admin'`) entram direto no painel.
5. Usuários comuns que ainda não foram aprovados geram uma solicitação `PENDENTE` em `solicitacoes_acesso`.
6. O administrador aprova ou nega no painel.
7. Ao aprovar, a tela de espera libera automaticamente a Home.
8. Essa aprovação passa a valer permanentemente para o usuário.
9. Nos próximos logins, o sistema encontra a aprovação anterior e entra direto, sem criar nova solicitação.

## Estrutura

```text
src/
├── components/
│   ├── feedback/
│   ├── layout/
│   └── routes/
├── config/
├── context/
├── hooks/
├── lib/
├── pages/
│   ├── Admin/
│   ├── Home/
│   ├── Login/
│   ├── Register/
│   └── Repository/
├── services/
├── styles/
└── utils/
```

A antiga pasta `src/Servicos` foi removida. Existe somente um cliente Supabase em `src/lib/supabase.js`.

## Banco de dados

Execute no Supabase SQL Editor:

```text
supabase/schema_completo.sql
```

O projeto usa:

- `auth.users` — autenticação;
- `public.profiles` — nome, e-mail e perfil (`admin` / `usuario`);
- `public.solicitacoes_acesso` — histórico e aprovação permanente do usuário;
- `public.pops` — metadados dos documentos;
- Storage bucket `pops` — PDFs privados.

A tabela antiga `usuarios_pops` não é mais necessária para o fluxo atual. Ela pode continuar no banco para histórico, mas o frontend não a consulta.

## Administrador

Depois de criar a conta do administrador, execute no SQL Editor:

```sql
update public.profiles
set regra = 'admin'
where id = (
  select id
  from auth.users
  where lower(email) = lower('SEU-EMAIL-ADMIN@EMPRESA.COM')
);
```

## Ambiente local

Crie `.env` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLISHABLE_OU_ANON
```

Nunca use `service_role` no frontend.

Depois:

```bash
npm install
npm run dev
```

## Vercel

O arquivo `vercel.json` já contém o rewrite necessário para React Router.

Na Vercel, configure em **Settings → Environment Variables**:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Marque Production, Preview e Development e faça novo deploy.

No Supabase, em **Authentication → URL Configuration**:

- Site URL: URL oficial da Vercel;
- Redirect URL: `https://SEU-PROJETO.vercel.app/**`;
- Desenvolvimento: `http://localhost:5173/**`.

O cadastro usa `window.location.origin`, portanto o redirecionamento funciona tanto localmente quanto na Vercel.

## Segurança

O acesso não depende apenas do React. O SQL cria RLS para exigir que o usuário autenticado tenha pelo menos uma solicitação `APROVADO` antes de ler `pops` ou baixar PDFs. Depois da primeira aprovação, novos logins continuam autorizados.

O bucket `pops` é privado. O download é feito pela API autenticada do Supabase Storage.
