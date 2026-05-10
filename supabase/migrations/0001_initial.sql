-- =============================================================
-- Prism — Initial Schema
-- Paste into Supabase → SQL Editor → Run
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS
-- =============================================================


-- -------------------------------------------------------
-- TABLES
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL,
  full_name      text,
  avatar_url     text,
  company_name   text,
  role           text,
  team_size      text,
  industry       text,
  primary_use_case text,
  onboarded_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.decisions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          text NOT NULL,
  question       text,
  context_text   text,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','configuring','ready','running','completed','archived','failed')),
  cost_estimate_usd numeric(10,4),
  actual_cost_usd   numeric(10,4),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

CREATE TABLE IF NOT EXISTS public.decision_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id    uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  file_name      text NOT NULL,
  file_type      text,
  byte_size      bigint,
  extracted_text text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_charters (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id    uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  role           text,
  perspective    text,
  biases         text,
  locked         boolean NOT NULL DEFAULT false,
  position       int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scenarios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id    uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  assumptions    text,
  time_horizon   text,
  locked         boolean NOT NULL DEFAULT false,
  position       int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id         uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','running','synthesizing','completed','failed')),
  progress_pct        int NOT NULL DEFAULT 0,
  started_at          timestamptz,
  completed_at        timestamptz,
  total_input_tokens  bigint NOT NULL DEFAULT 0,
  total_output_tokens bigint NOT NULL DEFAULT 0,
  total_cost_usd      numeric(10,4) NOT NULL DEFAULT 0,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.run_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  agent_charter_id  uuid REFERENCES public.agent_charters(id) ON DELETE SET NULL,
  scenario_id       uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  kind              text NOT NULL CHECK (kind IN ('analysis','critique','synthesis')),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed')),
  output            text,
  input_tokens      int,
  output_tokens     int,
  started_at        timestamptz,
  completed_at      timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.run_synthesis (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL UNIQUE REFERENCES public.runs(id) ON DELETE CASCADE,
  verdict                   text,
  confidence_pct            int,
  top_risks                 jsonb,
  decision_criteria         jsonb,
  what_would_change_my_mind text,
  summary_text              text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider          text NOT NULL DEFAULT 'anthropic',
  encrypted_key     text NOT NULL,
  last_validated_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.outcomes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id     uuid NOT NULL UNIQUE REFERENCES public.decisions(id) ON DELETE CASCADE,
  decision_made   text,
  actual_outcome  text,
  lessons         text,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name  text NOT NULL,
  properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- -------------------------------------------------------
-- INDEXES
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS decisions_user_created
  ON public.decisions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS decision_files_decision
  ON public.decision_files (decision_id);

CREATE INDEX IF NOT EXISTS agent_charters_decision_position
  ON public.agent_charters (decision_id, position);

CREATE INDEX IF NOT EXISTS scenarios_decision_position
  ON public.scenarios (decision_id, position);

CREATE INDEX IF NOT EXISTS runs_decision_created
  ON public.runs (decision_id, created_at DESC);

CREATE INDEX IF NOT EXISTS run_tasks_run
  ON public.run_tasks (run_id);

CREATE INDEX IF NOT EXISTS events_user_created
  ON public.events (user_id, created_at DESC);


-- -------------------------------------------------------
-- TRIGGER FUNCTIONS
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- -------------------------------------------------------
-- TRIGGERS
-- -------------------------------------------------------

-- New user → profile row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at maintenance
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_decisions_updated_at ON public.decisions;
CREATE TRIGGER set_decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_runs_updated_at ON public.runs;
CREATE TRIGGER set_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- -------------------------------------------------------
-- ROW-LEVEL SECURITY
-- -------------------------------------------------------

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_charters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_synthesis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------
-- RLS POLICIES — profiles
-- -------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- INSERT is handled by the trigger (service-definer); no direct insert allowed.


-- -------------------------------------------------------
-- RLS POLICIES — decisions
-- -------------------------------------------------------

DROP POLICY IF EXISTS "decisions_all_own" ON public.decisions;
CREATE POLICY "decisions_all_own" ON public.decisions
  FOR ALL USING (user_id = auth.uid());


-- -------------------------------------------------------
-- RLS POLICIES — decision_files
-- -------------------------------------------------------

DROP POLICY IF EXISTS "decision_files_all_own" ON public.decision_files;
CREATE POLICY "decision_files_all_own" ON public.decision_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = decision_files.decision_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — agent_charters
-- -------------------------------------------------------

DROP POLICY IF EXISTS "agent_charters_all_own" ON public.agent_charters;
CREATE POLICY "agent_charters_all_own" ON public.agent_charters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = agent_charters.decision_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — scenarios
-- -------------------------------------------------------

DROP POLICY IF EXISTS "scenarios_all_own" ON public.scenarios;
CREATE POLICY "scenarios_all_own" ON public.scenarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = scenarios.decision_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — runs
-- -------------------------------------------------------

DROP POLICY IF EXISTS "runs_all_own" ON public.runs;
CREATE POLICY "runs_all_own" ON public.runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = runs.decision_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — run_tasks
-- -------------------------------------------------------

DROP POLICY IF EXISTS "run_tasks_all_own" ON public.run_tasks;
CREATE POLICY "run_tasks_all_own" ON public.run_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.runs r
      JOIN public.decisions d ON d.id = r.decision_id
      WHERE r.id = run_tasks.run_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — run_synthesis
-- -------------------------------------------------------

DROP POLICY IF EXISTS "run_synthesis_all_own" ON public.run_synthesis;
CREATE POLICY "run_synthesis_all_own" ON public.run_synthesis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.runs r
      JOIN public.decisions d ON d.id = r.decision_id
      WHERE r.id = run_synthesis.run_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — api_keys
-- -------------------------------------------------------

DROP POLICY IF EXISTS "api_keys_all_own" ON public.api_keys;
CREATE POLICY "api_keys_all_own" ON public.api_keys
  FOR ALL USING (user_id = auth.uid());


-- -------------------------------------------------------
-- RLS POLICIES — outcomes
-- -------------------------------------------------------

DROP POLICY IF EXISTS "outcomes_all_own" ON public.outcomes;
CREATE POLICY "outcomes_all_own" ON public.outcomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.decisions d
      WHERE d.id = outcomes.decision_id
        AND d.user_id = auth.uid()
    )
  );


-- -------------------------------------------------------
-- RLS POLICIES — events
-- -------------------------------------------------------

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "events_select_own" ON public.events;
CREATE POLICY "events_select_own" ON public.events
  FOR SELECT USING (user_id = auth.uid());
