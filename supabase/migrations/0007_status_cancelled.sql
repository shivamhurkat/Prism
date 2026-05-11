-- =============================================================
-- Prism — Add 'cancelled' + 'synthesizing' to status enums
-- Paste into Supabase → SQL Editor → Run
-- =============================================================

ALTER TABLE decisions DROP CONSTRAINT decisions_status_check;
ALTER TABLE decisions ADD CONSTRAINT decisions_status_check
  CHECK (status IN ('draft','configuring','ready','running','synthesizing','completed','archived','failed','cancelled'));

ALTER TABLE runs DROP CONSTRAINT runs_status_check;
ALTER TABLE runs ADD CONSTRAINT runs_status_check
  CHECK (status IN ('pending','running','synthesizing','completed','failed','cancelled'));
