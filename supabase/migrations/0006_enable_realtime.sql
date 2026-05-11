-- =============================================================
-- Prism — Enable Realtime for runs + run_tasks
-- Paste into Supabase → SQL Editor → Run
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE runs;
ALTER PUBLICATION supabase_realtime ADD TABLE run_tasks;
