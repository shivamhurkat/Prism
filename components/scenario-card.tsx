'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { GripVertical, Pencil, Trash2, Loader2, Lock } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { cn } from '@/lib/utils'

interface Scenario {
  id: string
  name: string
  description: string | null
  assumptions: string | null
  time_horizon: string | null
  locked: boolean
  position: number
}

interface ScenarioCardProps {
  scenario: Scenario
  onUpdate: (fields: { name?: string; description?: string; assumptions?: string; time_horizon?: string }) => Promise<{ ok: boolean; error?: string }>
  onDelete: () => Promise<{ ok: boolean; error?: string }>
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  helper,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  helper?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])

  return (
    <div className="space-y-1">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition overflow-hidden"
      />
      {helper && <p className="text-xs text-muted-foreground font-sans">{helper}</p>}
    </div>
  )
}

function parseAssumptions(raw: string): string[] {
  const lines = raw.split('\n')
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim())
    .filter(Boolean)
}

export function ScenarioCard({ scenario, onUpdate, onDelete }: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: scenario.name,
    description: scenario.description ?? '',
    assumptions: scenario.assumptions ?? '',
    time_horizon: scenario.time_horizon ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scenario.id,
    disabled: scenario.locked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  function startEdit() {
    setDraft({
      name: scenario.name,
      description: scenario.description ?? '',
      assumptions: scenario.assumptions ?? '',
      time_horizon: scenario.time_horizon ?? '',
    })
    setIsEditing(true)
  }

  function cancel() {
    setDraft({
      name: scenario.name,
      description: scenario.description ?? '',
      assumptions: scenario.assumptions ?? '',
      time_horizon: scenario.time_horizon ?? '',
    })
    setIsEditing(false)
  }

  function save() {
    startTransition(async () => {
      const result = await onUpdate({
        name: draft.name,
        description: draft.description,
        assumptions: draft.assumptions,
        time_horizon: draft.time_horizon,
      })
      if (result.ok) {
        setIsEditing(false)
      }
    })
  }

  function handleDelete() {
    startDelete(async () => {
      await onDelete()
    })
  }

  const assumptionBullets = parseAssumptions(scenario.assumptions ?? '')

  return (
    <div ref={setNodeRef} style={style}>
      <LiquidGlass variant="default" className="p-6">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <button
            {...(!scenario.locked ? { ...attributes, ...listeners } : {})}
            type="button"
            title={scenario.locked ? 'Premortem is always last' : 'Drag to reorder'}
            className={cn(
              'mt-0.5 shrink-0 touch-none',
              scenario.locked
                ? 'cursor-not-allowed opacity-20'
                : 'cursor-grab opacity-40 hover:opacity-80 active:cursor-grabbing transition-opacity'
            )}
          >
            <GripVertical className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-[20px] font-light text-foreground leading-tight">
                {scenario.name}
              </p>
              {scenario.time_horizon && (
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-sans text-muted-foreground shrink-0">
                  {scenario.time_horizon}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {scenario.locked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-sans text-muted-foreground">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  title="Edit scenario"
                  className="p-1 rounded hover:bg-border/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                {!scenario.locked && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    title="Delete scenario"
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

        {/* Read mode */}
        {!isEditing && (
          <>
            {scenario.description && (
              <div className="mt-4 pl-8">
                <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-1.5">
                  Description
                </p>
                <p className="text-[14px] font-sans text-foreground/80 leading-relaxed">
                  {scenario.description}
                </p>
              </div>
            )}
            {scenario.assumptions && (
              <div className="mt-3 pl-8">
                <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-1.5">
                  Load-bearing assumptions
                </p>
                {assumptionBullets.length > 0 ? (
                  <ul className="space-y-1">
                    {assumptionBullets.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] font-sans text-foreground/80 leading-relaxed">
                        <span className="text-muted-foreground mt-0.5 shrink-0">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[14px] font-sans text-foreground/80 leading-relaxed">
                    {scenario.assumptions}
                  </p>
                )}
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
                disabled={scenario.locked}
                placeholder="Scenario name"
                className={cn(
                  'w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition',
                  scenario.locked && 'opacity-50 cursor-not-allowed'
                )}
              />
              {scenario.locked && (
                <p className="text-xs text-muted-foreground font-sans">
                  Locked scenario — name cannot be changed.
                </p>
              )}
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.name.length}/80
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Description
              </label>
              <AutoGrowTextarea
                value={draft.description}
                onChange={v => setDraft(d => ({ ...d, description: v }))}
                placeholder="1–2 sentences setting the world of this scenario."
                rows={2}
                maxLength={400}
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.description.length}/400
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Load-bearing assumptions
              </label>
              <AutoGrowTextarea
                value={draft.assumptions}
                onChange={v => setDraft(d => ({ ...d, assumptions: v }))}
                placeholder="One per line, starting with '- '"
                rows={4}
                maxLength={800}
                helper="One per line, starting with '- '"
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.assumptions.length}/800
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">
                Time horizon
              </label>
              <input
                value={draft.time_horizon}
                onChange={e => setDraft(d => ({ ...d, time_horizon: e.target.value }))}
                maxLength={60}
                placeholder="e.g. 24 months, next quarter, 5 years"
                className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
              />
              <p className="text-xs text-muted-foreground font-sans text-right">
                {draft.time_horizon.length}/60
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
