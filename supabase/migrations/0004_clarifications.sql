-- Paste this into the Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE TABLE decision_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  question text NOT NULL,
  suggested_answers jsonb DEFAULT '[]'::jsonb,
  user_answer text,
  position int NOT NULL DEFAULT 0,
  generation_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_decision_clarifications_lookup
  ON decision_clarifications (decision_id, generation_id, position);

-- RLS: users can only touch clarifications that belong to their own decisions
ALTER TABLE decision_clarifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own clarifications"
  ON decision_clarifications
  FOR SELECT
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert own clarifications"
  ON decision_clarifications
  FOR INSERT
  WITH CHECK (
    decision_id IN (
      SELECT id FROM decisions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "update own clarifications"
  ON decision_clarifications
  FOR UPDATE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "delete own clarifications"
  ON decision_clarifications
  FOR DELETE
  USING (
    decision_id IN (
      SELECT id FROM decisions WHERE user_id = auth.uid()
    )
  );
