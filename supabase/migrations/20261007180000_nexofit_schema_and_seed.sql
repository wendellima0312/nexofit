create extension if not exists pgcrypto;
create extension if not exists unaccent;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2),
  add column if not exists primary_goal text,
  add column if not exists experience_level text,
  add column if not exists consent_version text,
  add column if not exists health_consent_at timestamptz,
  add column if not exists safety_flags jsonb not null default '{}'::jsonb,
  add column if not exists nexofit_preferences jsonb not null default '{}'::jsonb;

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated
using ((select auth.uid()) = id);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function private.handle_nexofit_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Atleta'),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_user_create_nexofit_profile on auth.users;
create trigger auth_user_create_nexofit_profile
after insert on auth.users
for each row execute function private.handle_nexofit_new_user();

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  alternative_name text,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  movement_pattern text not null check (movement_pattern in ('empurrar','puxar','agachar','dobrar-quadril','unilateral','core','acessorio')),
  equipment text not null,
  location text not null check (location in ('academia','casa','ambos')),
  complexity text not null check (complexity in ('baixa','media','alta')),
  steps text[] not null,
  start_position text not null,
  phases text not null,
  breathing text not null,
  common_mistakes text[] not null default '{}',
  tips text[] not null default '{}',
  cautions text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null references public.exercises(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','svg','animation')),
  url text not null,
  source text not null,
  license text not null,
  attribution text,
  alt_text text not null,
  caption text not null,
  is_fallback boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_substitutions (
  exercise_id text not null references public.exercises(id) on delete cascade,
  substitute_exercise_id text not null references public.exercises(id) on delete cascade,
  reason text not null,
  primary key (exercise_id, substitute_exercise_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  days_per_week integer not null check (days_per_week between 1 and 6),
  session_minutes integer not null check (session_minutes between 20 and 120),
  location text not null check (location in ('academia','casa','ambos')),
  equipment text[] not null default '{}',
  avoid_exercise_ids text[] not null default '{}',
  limitations text,
  notifications_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  parameters jsonb not null,
  explanation text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null check (day_index > 0),
  title text not null,
  focus text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete restrict,
  position integer not null check (position > 0),
  role text not null check (role in ('aquecimento','principal','acessorio')),
  sets integer not null check (sets between 1 and 8),
  reps text not null,
  rest_seconds integer not null check (rest_seconds between 30 and 300),
  target_rir text not null,
  notes text not null
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid references public.workout_days(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  recovery_feedback text,
  notes text
);

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete restrict,
  set_index integer not null check (set_index > 0),
  load_kg numeric(6,2),
  reps integer not null check (reps >= 0),
  perceived_effort integer check (perceived_effort between 1 and 10),
  rir integer check (rir between 0 and 10),
  pain boolean not null default false,
  technique_ok boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_session_id uuid references public.workout_sessions(id) on delete cascade,
  effort integer check (effort between 1 and 10),
  recovery text,
  discomfort text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.app_content_versions (
  version text primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

create index if not exists exercise_media_exercise_id_idx on public.exercise_media (exercise_id);
create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);
create index if not exists workout_days_plan_user_idx on public.workout_days (workout_plan_id, user_id);
create index if not exists workout_exercises_day_user_idx on public.workout_exercises (workout_day_id, user_id);
create index if not exists workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index if not exists set_logs_session_idx on public.set_logs (workout_session_id);
create index if not exists set_logs_user_exercise_idx on public.set_logs (user_id, exercise_id, created_at desc);
create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, measured_at desc);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);

alter table public.exercises enable row level security;
alter table public.exercise_media enable row level security;
alter table public.exercise_substitutions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.feedback enable row level security;
alter table public.app_content_versions enable row level security;

drop policy if exists exercises_read_catalog on public.exercises;
create policy exercises_read_catalog on public.exercises for select to anon, authenticated using (status = 'active');
drop policy if exists exercise_media_read_catalog on public.exercise_media;
create policy exercise_media_read_catalog on public.exercise_media for select to anon, authenticated using (true);
drop policy if exists exercise_substitutions_read_catalog on public.exercise_substitutions;
create policy exercise_substitutions_read_catalog on public.exercise_substitutions for select to anon, authenticated using (true);
drop policy if exists app_content_versions_read on public.app_content_versions;
create policy app_content_versions_read on public.app_content_versions for select to anon, authenticated using (true);

drop policy if exists user_preferences_owner_select on public.user_preferences;
create policy user_preferences_owner_select on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_preferences_owner_insert on public.user_preferences;
create policy user_preferences_owner_insert on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_preferences_owner_update on public.user_preferences;
create policy user_preferences_owner_update on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists user_preferences_owner_delete on public.user_preferences;
create policy user_preferences_owner_delete on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists workout_plans_owner_all on public.workout_plans;
create policy workout_plans_owner_all on public.workout_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists workout_days_owner_all on public.workout_days;
create policy workout_days_owner_all on public.workout_days for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists workout_exercises_owner_all on public.workout_exercises;
create policy workout_exercises_owner_all on public.workout_exercises for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists workout_sessions_owner_all on public.workout_sessions;
create policy workout_sessions_owner_all on public.workout_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists set_logs_owner_all on public.set_logs;
create policy set_logs_owner_all on public.set_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists body_metrics_owner_all on public.body_metrics;
create policy body_metrics_owner_all on public.body_metrics for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists feedback_owner_all on public.feedback;
create policy feedback_owner_all on public.feedback for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into public.app_content_versions (version, description)
values ('2026.10.07-nexofit-initial', 'Catalogo inicial NexoFit com exercicios e midias esquematicas proprias.')
on conflict (version) do nothing;

with groups(primary_muscle, movement_pattern, bases, secondary_muscles) as (
  values
    ('Peitoral','empurrar',array['supino','flexao','crucifixo','mergulho'],array['triceps','deltoides']),
    ('Costas','puxar',array['remada','puxada','barra assistida','pullover'],array['biceps','posterior de ombro']),
    ('Quadriceps','agachar',array['agachamento','leg press','afundo','step-up'],array['gluteos','core']),
    ('Posterior de coxa','dobrar-quadril',array['levantamento romeno','mesa flexora','ponte de gluteos','bom dia'],array['gluteos','lombar']),
    ('Ombros','empurrar',array['desenvolvimento','elevacao lateral','elevacao frontal','face pull'],array['trapezio','core']),
    ('Biceps','acessorio',array['rosca direta','rosca alternada','rosca martelo','rosca inclinada'],array['antebraco']),
    ('Triceps','acessorio',array['triceps corda','triceps testa','triceps banco','extensao acima da cabeca'],array['ombros']),
    ('Core','core',array['prancha','dead bug','abdominal reverso','pallof press'],array['estabilizadores']),
    ('Gluteos','unilateral',array['elevacao pelvica','abducao de quadril','passada','coice'],array['posterior de coxa','core']),
    ('Panturrilhas','acessorio',array['panturrilha em pe','panturrilha sentado','panturrilha unilateral','saltito controlado'],array['tornozelos'])
),
variants(suffix, equipment, location, complexity) as (
  values
    ('com halteres','halteres','ambos','media'),
    ('com peso corporal','peso corporal','casa','baixa'),
    ('na maquina','maquina','academia','baixa'),
    ('com elastico','elastico','ambos','baixa'),
    ('com barra','barra','academia','alta'),
    ('no cabo','cabo','academia','media')
),
expanded as (
  select
    lower(regexp_replace(unaccent(base || ' ' || suffix), '[^a-zA-Z0-9]+', '-', 'g')) as id,
    initcap(base || ' ' || suffix) as name,
    initcap(base) as alternative_name,
    primary_muscle,
    secondary_muscles,
    movement_pattern,
    equipment,
    location,
    complexity,
    array[
      'Prepare o equipamento e confira se ha espaco livre ao redor.',
      'Assuma a posicao inicial com controle, coluna neutra e respiracao calma.',
      'Execute a fase principal sem impulso, mantendo a amplitude confortavel.',
      'Retorne devagar, pare se houver dor e registre como a serie se sentiu.'
    ] as steps,
    'Posicione-se para ' || base || ' usando ' || equipment || ', com apoios firmes e movimento sob controle.' as start_position,
    'Fase de preparacao, fase principal com controle e retorno lento ate a posicao inicial.' as phases,
    'Inspire antes da fase mais dificil e solte o ar durante o esforco, sem prender a respiracao por tempo excessivo.' as breathing,
    array['Usar impulso','Perder controle da amplitude','Ignorar dor ou desconforto agudo'] as common_mistakes,
    array['Comece leve','Mantenha uma margem de 1 a 3 repeticoes em reserva','Priorize tecnica antes de carga'] as tips,
    'Evite se gerar dor aguda, tontura, falta de ar incomum, dor no peito ou mal-estar importante.' as cautions
  from groups, unnest(bases) base, variants
)
insert into public.exercises (
  id, name, alternative_name, primary_muscle, secondary_muscles, movement_pattern, equipment, location, complexity,
  steps, start_position, phases, breathing, common_mistakes, tips, cautions
)
select id, name, alternative_name, primary_muscle, secondary_muscles, movement_pattern, equipment, location, complexity,
  steps, start_position, phases, breathing, common_mistakes, tips, cautions
from expanded
on conflict (id) do update set
  name = excluded.name,
  alternative_name = excluded.alternative_name,
  primary_muscle = excluded.primary_muscle,
  secondary_muscles = excluded.secondary_muscles,
  movement_pattern = excluded.movement_pattern,
  equipment = excluded.equipment,
  location = excluded.location,
  complexity = excluded.complexity,
  steps = excluded.steps,
  start_position = excluded.start_position,
  phases = excluded.phases,
  breathing = excluded.breathing,
  common_mistakes = excluded.common_mistakes,
  tips = excluded.tips,
  cautions = excluded.cautions,
  updated_at = now();

insert into public.exercise_media (exercise_id, media_type, url, source, license, attribution, alt_text, caption, is_fallback)
select id, 'svg', '/exercise-fallback.svg', 'Ilustracao esquematica original do projeto NexoFit',
  'Propria do projeto; uso comercial permitido neste app', 'NexoFit',
  'Diagrama simples indicando o padrao ' || movement_pattern || ' para ' || name || '.',
  'Ilustracao propria. Use como guia geral e leia as instrucoes antes da serie.', true
from public.exercises
on conflict do nothing;

insert into public.exercise_substitutions (exercise_id, substitute_exercise_id, reason)
select e.id, s.id, 'Mesmo padrao de movimento para substituicao conservadora.'
from public.exercises e
join lateral (
  select id
  from public.exercises
  where movement_pattern = e.movement_pattern and id <> e.id
  order by primary_muscle = e.primary_muscle desc, id
  limit 3
) s on true
on conflict do nothing;
