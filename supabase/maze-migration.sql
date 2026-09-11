alter table public.score_submissions drop constraint if exists score_submissions_game_key_check;
alter table public.score_submissions add constraint score_submissions_game_key_check check (game_key in ('tetris','snake','pong','breakout','memory','merge','dodge','connect','whack','reaction','tic','simon','rps','math','maze'));
