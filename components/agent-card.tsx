'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { GripVertical, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  role: string | null
  perspective: string | null
  biases: string | null
  locked: boolean
  position: number
}

interface AgentCardProps {
  agent: Agent
  onUpdate: (fields: { name?: string; role?: string; perspective?: string; biases?: string }) => Promise<{ ok: boolean; error?: string }>
  onDelete: () => Promise<{ ok: boolean; error?: string }>
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={cn(
        'w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition overflow-hidden',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    />
  )
}

export function AgentCard({ agent, onUpdate, onDelete }: AgentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: agent.name,
    role: agent.role ?? '',
    perspective: agent.perspective ?? '',
    biases: agent.biases ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agent.id,
    disabled: agent.locked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  function startEdit() {
    setDraft({
      name: agent.name,
      role: agent.role ?? '',
      perspective: agent.perspective ?? '',
      biases: agent.biases ?? '',
    })
    setIsEditing(true)
  }

  function cancel() {
    setDraft({
      name: agent.name,
      role: agent.role ?? '',
      perspective: agent.perspective ?? '',
      biases: agent.biases ?? '',
    })
    setIsEditing(false)
  }

  function save() {
    startTransition(async () => {
      const result = await onUpdate({
        name: draft.name,
        role: draft.role,
        perspective: draft.perspective,
        biases: draft.biases,
      })
      if (result.ok) {
        setIsEditing(false)
      } else {
        // Error handled by parent via toast
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      await onDelete()
    })
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LiquidGlass variant="default" className="p-6">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            {...(!agent.locked ? { ...attributes, ...listeners } : {})}
            type="button"
            title={agent.locked ? "Devil's Advocate is always last" : 'Drag to reorder'}
            className={cn(
              'mt-0.5 shrink-0 touch-none',
              agent.locked
                ? 'cursor-not-allowed opacity-20'
                : 'cursor-grab opacity-40 hover:opacity-80 active:cursor-grabbing transition-opacity'
            )}
          >
            <GripVertical className="h-5 w-5 text-foreground" />
          </button>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-[20px] font-light text-foreground leading-tight">
              {agent.name}
            </p>
            {agent.role && (
              <p className="text-[13px] text-muted-foreground font-sans mt-0.5 leading-snug">
                {agent.role}
              </p>
            )}
          </div>

          {/* Badges + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {agent.locked && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-sans text-muted-foreground">
                Locked
              </span>
            )}
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  title="Edit agent"
                  className="p-1 rounded hover:bg-border/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                {!agent.locked && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    title="Delete agent"
                    className="p-1 rounded hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Read mode: perspective + biases */}
        {!isEditing && (
          <>
            {agent.perspective && (
              <div className="mt-4 pl-8">
                <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-1.5">
                  Perspective
                </p>
                <p className="text-[14px] font-sans text-foreground/80 leading-relaxed">
                  {agent.perspective}
                </p>
              </div>
            )}
            {agent.biases && (
              <div className="mt-3 pl-8">
                <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-1.5">
                  Biases
                </p>
                <p className="text-[14px] font-sans text-foreground/80 leading-relaxed">
                  {agent.biases}
                </p>
              </div>
            )}
          </>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Name
              </label>
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                maxLength={80}
                disabled={agent.locked}
                placeholder="Stakeholder name"
                className={cn(
                  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition',
                  agent.locked && 'opacity-50 cursor-not-allowed'
                )}
              />
              {agent.locked && (
                <p className="text-xs text-muted-foreground font-sans">
                  Locked agent — name cannot be changed.
                </p>
              )}
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.name.length}/80
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Role
              </label>
              <input
                value={draft.role}
                onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
                maxLength={200}
                placeholder="One-line context for who they are in this decision"
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.role.length}/200
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Perspective
              </label>
              <AutoGrowTextarea
                value={draft.perspective}
                onChange={v => setDraft(d => ({ ...d, perspective: v }))}
                placeholder="What they see, what they care about, what success looks like through their eyes."
                rows={3}
                maxLength={600}
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.perspective.length}/600
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Biases
              </label>
              <AutoGrowTextarea
                value={draft.biases}
                onChange={v => setDraft(d => ({ ...d, biases: v }))}
                placeholder="Their predictable blind spots, pressures, or motivated reasoning."
                rows={2}
                maxLength={400}
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.biases.length}/400
              </p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={cancel}
                disabled={isPending}
                className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-full bg-accent-copper text-white px-4 py-1.5 text-xs font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </LiquidGlass>
    </div>
  )
}
