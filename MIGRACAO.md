# Migração da versão atual

## 1. Substituir o código

Use os arquivos desta pasta como raiz do repositório. Não crie uma pasta do projeto dentro de outra pasta do projeto.

A raiz deve conter diretamente:

```text
public/
src/
supabase/
package.json
vite.config.js
vercel.json
index.html
```

Remova a pasta antiga `src/Servicos`. O cliente Supabase fica somente em `src/lib/supabase.js`.

## 2. Banco de dados

Antes de testar o novo login, execute:

```text
supabase/schema_completo.sql
```

Esse script:

- atualiza `profiles` com nome e e-mail;
- cria o trigger de cadastro;
- adiciona `session_id` às solicitações;
- configura RLS com aprovação permanente por usuário;
- configura RLS dos documentos;
- transforma o bucket `pops` em privado.

Solicitações pendentes antigas sem `session_id` são canceladas, pois não podem ser associadas com segurança a uma sessão atual.

## 3. Administrador

Confirme que o seu perfil possui:

```text
regra = admin
```

## 4. Variáveis

Configure localmente e na Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## 5. Teste

1. Criar uma conta em `/cadastro`.
2. Confirmar o e-mail, caso essa opção esteja habilitada no Supabase.
3. Fazer login.
4. Conferir uma solicitação `PENDENTE` no painel administrativo.
5. Aprovar.
6. Confirmar que a tela do usuário entra automaticamente na Home.
7. Fazer logout.
8. Fazer login novamente e confirmar que o usuário entra direto, sem nova aprovação.
