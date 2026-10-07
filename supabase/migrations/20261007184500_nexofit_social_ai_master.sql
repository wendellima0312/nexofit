create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('master','admin','user')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  points_reward integer not null default 0 check (points_reward >= 0),
  icon text not null default 'medal',
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievement_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text,
  photo_url text,
  visibility text not null default 'followers' check (visibility in ('followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feed_post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.ai_coach_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'openai',
  encrypted_key_reference text,
  personality_notes text,
  system_prompt text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.fitness_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('treino','agua','mobilidade','recuperacao','personalizado')),
  title text not null,
  scheduled_time time not null,
  days_of_week text[] not null default '{}',
  enabled boolean not null default true,
  timezone text not null default 'America/Bahia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_roles_role_idx on public.user_roles (role);
create index if not exists user_follows_following_idx on public.user_follows (following_id);
create index if not exists feed_posts_user_created_idx on public.feed_posts (user_id, created_at desc);
create index if not exists feed_post_likes_user_idx on public.feed_post_likes (user_id);
create index if not exists fitness_reminders_user_enabled_idx on public.fitness_reminders (user_id, enabled);

alter table public.user_roles enable row level security;
alter table public.user_points enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievement_unlocks enable row level security;
alter table public.user_follows enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.ai_coach_settings enable row level security;
alter table public.fitness_reminders enable row level security;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_points_self_read on public.user_points;
create policy user_points_self_read on public.user_points for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select to anon, authenticated using (true);

drop policy if exists achievement_unlocks_self_read on public.user_achievement_unlocks;
create policy achievement_unlocks_self_read on public.user_achievement_unlocks for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_follows_self_all on public.user_follows;
create policy user_follows_self_all on public.user_follows for all to authenticated
using ((select auth.uid()) = follower_id)
with check ((select auth.uid()) = follower_id);

drop policy if exists feed_posts_owner_all on public.feed_posts;
create policy feed_posts_owner_all on public.feed_posts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists feed_posts_followers_read on public.feed_posts;
create policy feed_posts_followers_read on public.feed_posts for select to authenticated
using (
  visibility = 'followers'
  and exists (
    select 1 from public.user_follows f
    where f.follower_id = (select auth.uid())
      and f.following_id = feed_posts.user_id
  )
);

drop policy if exists feed_post_likes_self_all on public.feed_post_likes;
create policy feed_post_likes_self_all on public.feed_post_likes for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists ai_coach_settings_self_all on public.ai_coach_settings;
create policy ai_coach_settings_self_all on public.ai_coach_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists fitness_reminders_self_all on public.fitness_reminders;
create policy fitness_reminders_self_all on public.fitness_reminders for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.achievements (id, name, description, points_reward, icon)
values
  ('first_set','Primeiro registro','Registrou a primeira serie no NexoFit.',25,'medal'),
  ('six_sets','Consistencia inicial','Registrou seis series com consciencia.',40,'flame'),
  ('safe_feedback','Tecnica antes de carga','Informou desconforto ou tecnica ruim e evitou progressao automatica.',30,'shield'),
  ('first_post','Primeiro post','Compartilhou uma foto ou relato de treino no feed.',20,'camera'),
  ('week_streak','Semana presente','Manteve registros durante uma semana de treino.',60,'calendar')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  points_reward = excluded.points_reward,
  icon = excluded.icon;

insert into public.app_content_versions (version, description)
values ('2026.10.07-nexofit-social-ai', 'Pontuacao, niveis, conquistas, feed social, seguidores e configuracao do agente de IA.')
on conflict (version) do nothing;

insert into public.app_content_versions (version, description)
values ('2026.10.07-nexofit-fitness-reminders', 'Lembretes de treino, agua, mobilidade, recuperacao e lembretes personalizados.')
on conflict (version) do nothing;
