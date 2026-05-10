-- Create private storage bucket for decision files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'decision-files',
  'decision-files',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
);

-- RLS: users can only access files in their own folder (path: {user_id}/{decision_id}/{file})
CREATE POLICY "Users read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'decision-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users insert own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'decision-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'decision-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'decision-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
