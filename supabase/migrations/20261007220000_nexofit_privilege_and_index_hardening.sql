create schema if not exists extensions;
alter extension unaccent set schema extensions;

revoke all privileges on table
  public.profiles,
  public.user_preferences,
  public.workout_plans,
  public.workout_days,
  public.workout_exercises,
  public.workout_sessions,
  public.set_logs,
  public.body_metrics,
  public.feedback,
  public.user_roles,
  public.user_points,
  public.user_achievement_unlocks,
  public.user_follows,
  public.feed_posts,
  public.feed_post_likes,
  public.ai_coach_settings,
  public.fitness_reminders
from public, anon;

create index if not exists exercise_substitutions_substitute_exercise_id_idx
  on public.exercise_substitutions (substitute_exercise_id);
create index if not exists feedback_workout_session_id_idx
  on public.feedback (workout_session_id);
create index if not exists set_logs_exercise_id_idx
  on public.set_logs (exercise_id);
create index if not exists user_achievement_unlocks_achievement_id_idx
  on public.user_achievement_unlocks (achievement_id);
create index if not exists workout_days_user_id_idx
  on public.workout_days (user_id);
create index if not exists workout_exercises_exercise_id_idx
  on public.workout_exercises (exercise_id);
create index if not exists workout_exercises_user_id_idx
  on public.workout_exercises (user_id);
create index if not exists workout_sessions_workout_day_id_idx
  on public.workout_sessions (workout_day_id);

drop policy if exists feed_posts_owner_all on public.feed_posts;
drop policy if exists feed_posts_followers_read on public.feed_posts;
drop policy if exists feed_posts_read on public.feed_posts;
create policy feed_posts_read on public.feed_posts for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.user_follows f
      where f.follower_id = (select auth.uid())
        and f.following_id = feed_posts.user_id
    )
  )
);
create policy feed_posts_owner_insert on public.feed_posts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy feed_posts_owner_update on public.feed_posts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy feed_posts_owner_delete on public.feed_posts for delete to authenticated
using ((select auth.uid()) = user_id);
