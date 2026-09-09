create table if not exists public.score_submissions (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 2 and 16),
  game_key text not null check (game_key in ('tetris','snake','pong','breakout','memory','merge','dodge','connect','whack','reaction','tic','simon','rps','math')),
  score integer not null check (score >= 0 and score <= 1000000),
  created_at timestamptz not null default now()
);
create index if not exists score_submissions_game_score_idx on public.score_submissions (game_key, score desc, created_at asc);
alter table public.score_submissions enable row level security;
create policy "Public can view scores" on public.score_submissions for select using (true);
create policy "Public can submit valid scores" on public.score_submissions for insert with check (char_length(trim(player_name)) between 2 and 16 and score >= 0 and score <= 1000000);
create or replace view public.game_leaderboard as select distinct on (game_key, player_name) game_key, player_name, score, created_at from public.score_submissions order by game_key, player_name, score desc, created_at asc;
create or replace view public.monthly_general_leaderboard as with ranked as (select date_trunc('month', created_at)::date as month, player_name, game_key, score, row_number() over (partition by date_trunc('month', created_at), player_name, game_key order by score desc, created_at asc) as position from public.score_submissions) select month, player_name, sum(score)::integer as total_score, count(*)::integer as games_played from ranked where position = 1 group by month, player_name;
grant select on public.game_leaderboard, public.monthly_general_leaderboard to anon;
