'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/events'
import { extractFileText } from '@/lib/extractors'
import type { ParseStatus } from '@/lib/database.types'

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const MAX_BYTES = 25 * 1024 * 1024

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
}

export type UploadedFile = {
  id: string
  file_name: string
  byte_size: number
  file_type: string | null
  extracted_text: string | null
  parse_status: ParseStatus
  parse_skipped_reason: string | null
}

export async function uploadDecisionFile(
  decisionId: string,
  formData: FormData
): Promise<{ file?: UploadedFile; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify decision ownership
  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', decisionId)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { error: 'Decision not found.' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided.' }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIMES.has(mime)) return { error: `File type not supported: ${mime}` }
  if (file.size > MAX_BYTES) return { error: 'File exceeds 25MB limit.' }

  const fileId = randomUUID()
  const safeName = sanitizeFilename(file.name)
  const storagePath = `${user.id}/${decisionId}/${fileId}-${safeName}`

  console.log(`[file] uploading ${file.name} ${file.size}`)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('decision-files')
    .upload(storagePath, buffer, { contentType: mime, upsert: false })

  if (uploadError) {
    console.log('[file] error', uploadError.message)
    return { error: uploadError.message }
  }

  const { data: row, error: insertError } = await supabase
    .from('decision_files')
    .insert({
      id: fileId,
      decision_id: decisionId,
      storage_path: storagePath,
      file_name: file.name,
      file_type: mime,
      byte_size: file.size,
      parse_status: 'parsing' as ParseStatus,
    })
    .select('id, file_name, byte_size, file_type, extracted_text, parse_status, parse_skipped_reason')
    .single()

  if (insertError || !row) {
    console.log('[file] error', insertError?.message)
    await supabase.storage.from('decision-files').remove([storagePath])
    return { error: insertError?.message ?? 'Insert failed.' }
  }

  console.log(`[file] parsing ${fileId}`)

  const { text, reason } = await extractFileText(buffer, mime)

  let parse_status: ParseStatus
  let parse_skipped_reason: string | null = null

  if (text !== null) {
    parse_status = 'ready'
    console.log(`[file] ready ${fileId}`)
  } else if (reason === 'vision_pending') {
    parse_status = 'skipped'
    parse_skipped_reason = 'vision_pending'
    console.log(`[file] skipped ${fileId} vision_pending`)
  } else {
    parse_status = 'failed'
    parse_skipped_reason = reason ?? 'unknown'
    console.log(`[file] error ${reason}`)
  }

  const { error: updateError } = await supabase
  .from('decision_files')
  .update({ extracted_text: text, parse_status, parse_skipped_reason })
  .eq('id', fileId)

if (updateError) {
  console.log('[file] update error', updateError.message)
  return { error: updateError.message }
}

try {
  await logEvent('file_uploaded', {
    decision_id: decisionId,
    file_type: mime,
    byte_size: file.size,
    parsed: parse_status === 'ready',
  })
} catch (err) {
  console.log('[file] logEvent error', err instanceof Error ? err.message : String(err))
}

  revalidatePath(`/dashboard/d/${decisionId}`)

  return {
    file: {
      id: fileId,
      file_name: file.name,
      byte_size: file.size,
      file_type: mime,
      extracted_text: text,
      parse_status,
      parse_skipped_reason,
    },
  }
}

export async function deleteDecisionFile(fileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Fetch the file row
  const { data: fileRow } = await supabase
    .from('decision_files')
    .select('id, storage_path, decision_id')
    .eq('id', fileId)
    .single()

  if (!fileRow) return { error: 'File not found.' }

  // Verify ownership through the decision
  const { data: decision } = await supabase
    .from('decisions')
    .select('id')
    .eq('id', fileRow.decision_id)
    .eq('user_id', user.id)
    .single()

  if (!decision) return { error: 'Not authorised.' }

  await supabase.storage.from('decision-files').remove([fileRow.storage_path])
  await supabase.from('decision_files').delete().eq('id', fileId)

  await logEvent('file_deleted', { file_id: fileId, decision_id: fileRow.decision_id })
  revalidatePath(`/dashboard/d/${fileRow.decision_id}`)

  console.log(`[file] deleted ${fileId}`)

  return {}
}
