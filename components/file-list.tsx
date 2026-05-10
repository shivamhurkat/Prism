'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  FileText,
  FileType,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteDecisionFile, uploadDecisionFile } from '@/app/actions/files'
import type { Tables } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { FileDropzone } from '@/components/file-dropzone'

type FileRow = Pick<
  Tables<'decision_files'>,
  'id' | 'file_name' | 'byte_size' | 'file_type' | 'extracted_text' | 'parse_status' | 'parse_skipped_reason' | 'created_at'
>

type OptimisticParseStatus = FileRow['parse_status'] | 'uploading'

type OptimisticFile = Omit<FileRow, 'parse_status'> & {
  parse_status: OptimisticParseStatus
  optimistic?: true
}

type FilesAction =
  | { type: 'add'; file: OptimisticFile }
  | { type: 'remove'; id: string }

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncateMiddle(str: string, max: number): string {
  if (str.length <= max) return str
  const half = Math.floor((max - 3) / 2)
  return `${str.slice(0, half)}…${str.slice(-half)}`
}

function FileIcon({ mime }: { mime: string | null }) {
  const cls = 'h-[18px] w-[18px] text-muted-foreground shrink-0'
  if (!mime) return <File className={cls} />
  if (mime === 'application/pdf') return <FileText className={cls} />
  if (mime.includes('wordprocessingml')) return <FileType className={cls} />
  if (mime.includes('spreadsheetml')) return <FileSpreadsheet className={cls} />
  if (mime.startsWith('image/')) return <FileImage className={cls} />
  return <File className={cls} />
}

function StatusPill({ status, reason }: { status: OptimisticParseStatus; reason: string | null }) {
  if (status === 'uploading' || status === 'parsing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-copper px-2 py-0.5 text-xs font-sans uppercase tracking-wide text-accent-copper">
        <Loader2 className="h-3 w-3 animate-spin" />
        {status === 'uploading' ? 'Uploading' : 'Parsing'}
      </span>
    )
  }
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-sans uppercase tracking-wide text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Ready
      </span>
    )
  }
  if (status === 'skipped') {
    return (
      <span title={reason ?? undefined} className="cursor-help rounded-full px-2 py-0.5 text-xs font-sans uppercase tracking-wide text-muted-foreground">
        Skipped
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span title={reason ?? undefined} className="cursor-help rounded-full px-2 py-0.5 text-xs font-sans uppercase tracking-wide text-destructive">
        Failed
      </span>
    )
  }
  return null
}

function FileRowItem({
  file,
  onDelete,
}: {
  file: OptimisticFile
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [isDeleting, startDelete] = useTransition()

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteDecisionFile(file.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        onDelete(file.id)
      }
    })
  }

  const hasText = !!file.extracted_text
  const previewText = hasText
    ? showFull
      ? file.extracted_text!.slice(0, 5000)
      : file.extracted_text!.slice(0, 600)
    : null

  return (
    <LiquidGlass variant="subtle" className="px-4 py-3">
      <div className="flex items-center gap-3">
        <FileIcon mime={file.file_type} />

        <span className="flex-1 min-w-0 text-sm font-sans text-foreground truncate">
          {truncateMiddle(file.file_name, 60)}
        </span>

        <span className="text-xs font-sans text-muted-foreground shrink-0">
          {formatBytes(file.byte_size)}
        </span>

        <StatusPill status={file.parse_status} reason={file.parse_skipped_reason} />

        {hasText && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        {!file.optimistic && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                aria-label="Delete file"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                <AlertDialogDescription>
                  Its extracted text will no longer be part of your decision context.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {expanded && hasText && (
        <LiquidGlass variant="subtle" className="mt-3 p-4">
          <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {previewText}
            {!showFull && file.extracted_text!.length > 600 && (
              <>
                {'…'}
                <button
                  type="button"
                  onClick={() => setShowFull(true)}
                  className="ml-1 text-accent-copper underline underline-offset-2"
                >
                  Show full
                </button>
              </>
            )}
            {showFull && file.extracted_text!.length > 5000 && (
              <span className="text-muted-foreground"> [truncated to 5000 chars]</span>
            )}
          </p>
        </LiquidGlass>
      )}
    </LiquidGlass>
  )
}

interface FileSectionProps {
  decisionId: string
  initialFiles: FileRow[]
}

export function FileSection({ decisionId, initialFiles }: FileSectionProps) {
  const [_isPending, startTransition] = useTransition()
  const [files, addOptimistic] = useOptimistic<OptimisticFile[], FilesAction>(
    initialFiles as OptimisticFile[],
    (state, action) => {
      if (action.type === 'add') return [...state, action.file]
      if (action.type === 'remove') return state.filter((f) => f.id !== action.id)
      return state
    }
  )

  function handleFilesSelected(selectedFiles: File[]) {
    for (const file of selectedFiles) {
      const tempId = `opt-${Date.now()}-${Math.random()}`
      const optimisticFile: OptimisticFile = {
        id: tempId,
        file_name: file.name,
        byte_size: file.size,
        file_type: file.type,
        extracted_text: null,
        parse_status: 'uploading',
        parse_skipped_reason: null,
        created_at: new Date().toISOString(),
        optimistic: true,
      }

      startTransition(async () => {
        addOptimistic({ type: 'add', file: optimisticFile })
        const fd = new FormData()
        fd.set('file', file)
        const result = await uploadDecisionFile(decisionId, fd)
        if (result.error) {
          toast.error(`${file.name}: ${result.error}`)
        }
      })
    }
  }

  function handleDelete(id: string) {
    addOptimistic({ type: 'remove', id })
  }

  return (
    <div className="space-y-3">
      <FileDropzone onFilesSelected={handleFilesSelected} />
      {files.map((f) => (
        <FileRowItem key={f.id} file={f} onDelete={handleDelete} />
      ))}
    </div>
  )
}
