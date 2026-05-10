-- Add parse status tracking to decision_files
ALTER TABLE decision_files
  ADD COLUMN parse_status text NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending', 'parsing', 'ready', 'failed', 'skipped')),
  ADD COLUMN parse_skipped_reason text;
