'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Pencil, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EditableFieldProps {
  value: string
  onSave: (newValue: string) => Promise<{ ok: boolean; error?: string }>
  variant: 'title' | 'prose'
  placeholder?: string
  label?: string
  maxLength?: number
  disabled?: boolean
}

export function EditableField({
  value,
  onSave,
  variant,
  placeholder,
  label,
  maxLength,
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep draft in sync when parent value changes (e.g. server revalidation)
  useEffect(() => {
    if (!isEditing) setDraft(value)
  }, [value, isEditing])

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [draft, isEditing])

  function openEdit() {
    if (disabled) return
    setDraft(value)
    setIsEditing(true)
    // Focus after state update
    setTimeout(() => {
      inputRef.current?.focus()
      textareaRef.current?.focus()
    }, 0)
  }

  function cancel() {
    setDraft(value)
    setIsEditing(false)
  }

  function save(newValue: string) {
    const trimmed = newValue.trim()
    startTransition(async () => {
      const result = await onSave(trimmed)
      if (result.ok) {
        setIsEditing(false)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 600)
      } else {
        toast.error(result.error ?? 'Failed to save.')
        setDraft(value)
        setIsEditing(false)
      }
    })
  }

  if (variant === 'title') {
    return (
      <div className="relative">
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={maxLength}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); save(draft) }
              if (e.key === 'Escape') cancel()
            }}
            onBlur={() => save(draft)}
            autoFocus
            className={cn(
              'w-full bg-transparent font-display text-[32px] font-light text-foreground leading-tight',
              'border-0 border-b-2 border-accent-copper outline-none pb-0.5',
              'focus:outline-none focus:ring-0',
              isPending && 'opacity-60'
            )}
          />
        ) : (
          <div
            onClick={!disabled ? openEdit : undefined}
            className={cn(
              'font-display text-[32px] font-light text-foreground leading-tight flex items-center gap-2',
              !disabled && 'cursor-text hover:opacity-80 transition-opacity',
              savedFlash && 'border-l-2 border-accent-copper pl-2 transition-all'
            )}
          >
            <span className={cn(savedFlash && 'text-foreground')}>{value}</span>
            {disabled && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        )}
        {isEditing && maxLength && (
          <p className="text-xs text-muted-foreground font-sans text-right mt-1">
            {draft.length}/{maxLength}
          </p>
        )}
        {disabled && (
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Locked while running / after completion.
          </p>
        )}
      </div>
    )
  }

  // variant === 'prose'
  const isEmpty = !value || value.trim() === ''

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={maxLength}
            rows={3}
            placeholder={placeholder}
            className={cn(
              'w-full resize-none bg-transparent font-sans text-base text-muted-foreground leading-relaxed',
              'border border-border rounded-[10px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-copper/40',
              'overflow-hidden transition',
              isPending && 'opacity-60'
            )}
          />
          {maxLength && (
            <p className="text-xs text-muted-foreground font-sans text-right">
              {draft.length}/{maxLength}
            </p>
          )}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => cancel()}
              disabled={isPending}
              className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(draft)}
              disabled={isPending}
              className={cn(
                'flex items-center gap-1.5 rounded-full bg-accent-copper text-white px-4 py-1.5 text-xs font-sans font-medium',
                'hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {isEmpty ? (
            <button
              type="button"
              onClick={!disabled ? openEdit : undefined}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm font-sans text-muted-foreground',
                !disabled && 'hover:border-accent-copper/50 hover:text-accent-copper/80 transition-colors cursor-pointer',
                disabled && 'cursor-default opacity-50'
              )}
            >
              <span>+ Add {label ?? 'content'}</span>
            </button>
          ) : (
            <div
              className={cn(
                'relative whitespace-pre-wrap text-base font-sans text-muted-foreground leading-relaxed',
                !disabled && 'cursor-text',
                savedFlash && 'border-l-2 border-accent-copper pl-3 transition-all'
              )}
              onClick={!disabled ? openEdit : undefined}
            >
              {value}
              {!disabled && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); openEdit() }}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
          )}
          {disabled && !isEmpty && (
            <p className="text-xs text-muted-foreground font-sans mt-1">
              Locked while running / after completion.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
