# NexoFit

Aplicativo mobile-first de musculacao em portugues do Brasil, com Next.js App Router, Supabase Auth/Postgres/RLS e deploy na Vercel.

## O que esta implementado

- Interface PWA responsiva com tema claro/escuro, navegacao inferior e controles grandes para treino.
- Onboarding/perfil adaptavel com limites de seguranca para menores de 18 anos, gravidez/pos-parto, lesao, dor, cirurgia recente, condicao clinica relevante ou restricao medica.
- Gerador deterministico de treinos por dias, duracao, objetivo, experiencia, local, equipamentos e exclusoes.
- Catalogo inicial versionado com mais de 100 exercicios, descricoes em portugues, substituicoes e midia esquematica SVG propria.
- Modo de treino com instrucao, substituicoes, registro simples de series, desconforto e historico local.
- Migracao Supabase com tabelas de perfil, preferencias, planos, dias, exercicios prescritos, sessoes, series, metricas corporais, feedback, catalogo, midias e versao de conteudo.
- RLS para dados de usuario por `user_id = auth.uid()` e catalogo publico somente leitura.
- Testes automatizados de criterios centrais do gerador/catalogo.

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Crie `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Nunca exponha `SUPABASE_SECRET_KEY` ou `service_role` no cliente.

## Supabase

O schema principal esta em:

```text
supabase/migrations/20261007180000_nexofit_schema_and_seed.sql
```

Aplicar local/remoto:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

A migracao e idempotente para o catalogo inicial: `exercises`, `exercise_media`, `exercise_substitutions` e `app_content_versions` usam `on conflict` quando apropriado.

### Usuario MASTER

O dono da plataforma fica com papel `master` em `user_roles`. Para criar/atualizar o usuario sem gravar senha no repositório:

```bash
$env:NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
$env:SUPABASE_SECRET_KEY="sua-service-role-ou-secret-key"
$env:MASTER_NAME="Wendel Carlos"
$env:MASTER_EMAIL="wendellima0312@gmail.com"
$env:MASTER_PASSWORD="senha-informada-com-seguranca"
npm run create:master
```

Use a senha apenas em variavel de ambiente local/segura. Nao versione esse valor.

## Vercel

Configure as variaveis de ambiente no projeto Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`, somente se for criar rotas administrativas server-side. Nunca use no cliente.

Para o agente de IA, a tela ja aceita uma chave. Em producao, guarde a chave em ambiente/segredo server-side ou em cofre e grave somente uma referencia criptografada em `ai_coach_settings`.

Variaveis usadas pelo agente:

```bash
OPENROUTER_API_KEY=sua-chave-openrouter
AI_MODEL=anthropic/claude-haiku-5.5
NEXT_PUBLIC_APP_URL=https://seu-dominio
```

Depois publique pelo Git conectado ou CLI:

```bash
vercel --prod
```

## Conteudo E Licencas

As ilustracoes de exercicio sao SVGs esquematicos originais do projeto (`public/exercise-fallback.svg`) e podem ser usadas comercialmente neste app. O app nao usa fotos de pessoas, marcas de terceiros ou midias externas sem licenca.

## Verificacao

```bash
npm test
npm run lint
npm run build
```

Criterios cobertos por testes: catalogo com 100+ exercicios, montagem para adulto, respeito a dias/equipamentos/exclusoes e bloqueio de seguranca.
