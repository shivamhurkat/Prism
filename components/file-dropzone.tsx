'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { cn } from '@/lib/utils'

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

function mimeLabel(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/webp': 'WEBP',
  }
  return map[mime] ?? mime
}

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
}

export function FileDropzone({ onFilesSelected }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function validateAndEmit(rawFiles: FileList | File[]) {
    const valid: File[] = []
    for (const file of Array.from(rawFiles)) {
      const mime = file.type || 'application/octet-stream'
      if (!ALLOWED_MIMES.has(mime)) {
        toast.error(`${file.name}: unsupported file type (${mimeLabel(mime) || mime})`)
        continue
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: exceeds 25MB limit`)
        continue
      }
      valid.push(file)
    }
    if (valid.length > 0) onFilesSelected(valid)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      validateAndEmit(e.target.files)
      e.target.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) validateAndEmit(e.dataTransfer.files)
  }

  return (
    <LiquidGlass
      variant="subtle"
      className={cn(
        'p-8 cursor-pointer relative flex flex-col items-center gap-3',
        'outline-dashed outline-1 outline-offset-[-8px]',
        isDragging
          ? 'outline-accent-copper bg-accent-copper/5'
          : 'outline-border'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Upload files"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={handleChange}
      />
      <Upload
        className={cn('h-7 w-7', isDragging ? 'text-accent-copper' : 'text-muted-foreground')}
        aria-hidden
      />
      <p className="text-base font-sans text-foreground select-none">
        Drop files here or click to browse
      </p>
      <p className="text-xs font-sans text-muted-foreground select-none">
        PDF · DOCX · XLSX · TXT · MD · PNG · JPG · 25MB each
      </p>
    </LiquidGlass>
  )
}
