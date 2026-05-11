'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { ScenarioCard } from '@/components/scenario-card'
import { ApiKeyModal } from '@/components/api-key-modal'
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
import {
  generateScenarios,
  updateScenario,
  addScenario,
  deleteScenario,
  reorderScenarios,
} from '@/app/actions/scenarios'

const LOADING_MESSAGES = [
  'Mapping plausible futures...',
  'Stating load-bearing assumptions...',
  'Naming the shock scenario...',
  'Adding the Premortem...',
]

interface Scenario {
  id: string
  name: string
  description: string | null
  assumptions: string | null
  time_horizon: string | null
  locked: boolean
  position: number
}

interface Props {
  decisionId: string
  scenarios: Scenario[]
  hasApiKey: boolean
}

export function ScenariosSection({ decisionId, scenarios: initialScenarios, hasApiKey }: Props) {
  const [scenarios, setScenarios] = useState(initialScenarios)
  const [isGenerating, startGenerate] = useTransition()
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [pendingRetry, setPendingRetry] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newScenario, setNewScenario] = useState({ name: '', description: '', assumptions: '', time_horizon: '' })
  const [isAdding, startAdd] = useTransition()
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setScenarios(initialScenarios)
  }, [initialScenarios])

  useEffect(() => {
    if (isGenerating) {
      setLoadingMsgIdx(0)
      loadingTimerRef.current = setInterval(() => {
        setLoadingMsgIdx(i => Math.min(i + 1, LOADING_MESSAGES.length - 1))
      }, 2000)
    } else {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current)
    }
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current)
    }
  }, [isGenerating])

  function handleGenerate() {
    startGenerate(async () => {
      const result = await generateScenarios(decisionId)
      if ('error' in result) {
        if (result.code === 'no_api_key') {
          setApiKeyModalOpen(true)
          setPendingRetry(true)
        } else {
          toast.error(result.error || 'Failed to generate scenarios.')
        }
        return
      }
    })
  }

  function handleApiKeySuccess() {
    if (pendingRetry) {
      setPendingRetry(false)
      handleGenerate()
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = scenarios.findIndex(s => s.id === active.id)
    const newIndex = scenarios.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...scenarios]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const pmIndex = reordered.findIndex(s => s.locked)
    if (pmIndex !== -1 && pmIndex !== reordered.length - 1) {
      const [pm] = reordered.splice(pmIndex, 1)
      reordered.push(pm)
    }

    setScenarios(reordered)
    reorderScenarios(decisionId, reordered.map(s => s.id))
      .then(result => {
        if (!result.ok) toast.error(result.error)
      })
  }

  async function handleUpdateScenario(
    scenarioId: string,
    fields: { name?: string; description?: string; assumptions?: string; time_horizon?: string }
  ) {
    const result = await updateScenario(scenarioId, fields)
    if (!result.ok) toast.error(result.error)
    return result
  }

  async function handleDeleteScenario(scenarioId: string) {
    const result = await deleteScenario(scenarioId)
    if (!result.ok) {
      toast.error(result.error)
    } else {
      setScenarios(prev => prev.filter(s => s.id !== scenarioId))
    }
    return result
  }

  function handleAddSave() {
    if (!newScenario.name.trim()) { toast.error('Name is required.'); return }
    startAdd(async () => {
      const result = await addScenario(decisionId, {
        name: newScenario.name.trim(),
        description: newScenario.description.trim(),
        assumptions: newScenario.assumptions.trim(),
        time_horizon: newScenario.time_horizon.trim(),
      })
      if (result.ok) {
        setShowAddForm(false)
        setNewScenario({ name: '', description: '', assumptions: '', time_horizon: '' })
      } else {
        toast.error(result.error)
      }
    })
  }

  const isEmpty = scenarios.length === 0

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[24px] font-light text-foreground">Scenarios</h2>
            <p className="text-sm text-muted-foreground font-sans mt-1 max-w-lg">
              Futures and framings through which your council will evaluate this decision. Prism suggests 3–5 plus a locked Premortem that assumes the decision has already failed.
            </p>
          </div>
          {!isEmpty && (
            <span className="text-sm text-muted-foreground font-sans shrink-0 mt-1">
              {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
            </span>
          )}
        </div>

        {/* Empty state */}
        {isEmpty && !isGenerating && (
          <LiquidGlass variant="subtle" className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rounded-full bg-accent-copper text-white px-6 py-2.5 text-sm font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate scenarios
              </button>
            </div>
          </LiquidGlass>
        )}

        {/* Loading state */}
        {isGenerating && (
          <LiquidGlass variant="subtle" className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent-copper" />
              <p className="text-sm text-muted-foreground font-sans transition-opacity">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            </div>
          </LiquidGlass>
        )}

        {/* Loaded state */}
        {!isEmpty && !isGenerating && (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scenarios.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {scenarios.map(scenario => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onUpdate={fields => handleUpdateScenario(scenario.id, fields)}
                      onDelete={() => handleDeleteScenario(scenario.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add scenario inline form */}
            {showAddForm && (
              <LiquidGlass variant="subtle" className="p-6 space-y-4">
                <p className="font-display text-[18px] font-light text-foreground">New scenario</p>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Name</label>
                  <input
                    value={newScenario.name}
                    onChange={e => setNewScenario(d => ({ ...d, name: e.target.value }))}
                    maxLength={80}
                    placeholder="Scenario name"
                    className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Description</label>
                  <textarea
                    value={newScenario.description}
                    onChange={e => setNewScenario(d => ({ ...d, description: e.target.value }))}
                    maxLength={400}
                    rows={2}
                    placeholder="1–2 sentences setting the world of this scenario."
                    className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Load-bearing assumptions</label>
                  <textarea
                    value={newScenario.assumptions}
                    onChange={e => setNewScenario(d => ({ ...d, assumptions: e.target.value }))}
                    maxLength={800}
                    rows={4}
                    placeholder="One per line, starting with '- '"
                    className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                  <p className="text-xs text-muted-foreground font-sans">One per line, starting with &apos;- &apos;</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Time horizon</label>
                  <input
                    value={newScenario.time_horizon}
                    onChange={e => setNewScenario(d => ({ ...d, time_horizon: e.target.value }))}
                    maxLength={60}
                    placeholder="e.g. 24 months, next quarter"
                    className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setNewScenario({ name: '', description: '', assumptions: '', time_horizon: '' }) }}
                    disabled={isAdding}
                    className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSave}
                    disabled={isAdding}
                    className="flex items-center gap-1.5 rounded-full bg-accent-copper text-white px-4 py-1.5 text-xs font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add scenario
                  </button>
                </div>
              </LiquidGlass>
            )}

            {/* Bottom actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                disabled={showAddForm}
                className="rounded-[10px] border border-border px-4 py-2 text-sm font-sans text-foreground hover:bg-surface/50 transition-colors disabled:opacity-50"
              >
                + Add scenario
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={isGenerating}
                    className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Regenerate scenarios
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Replace all scenarios?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Edits to current scenarios will be lost. The Premortem stays.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerate}>Regenerate</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>

      <ApiKeyModal
        open={apiKeyModalOpen}
        onOpenChange={open => {
          setApiKeyModalOpen(open)
          if (!open) setPendingRetry(false)
        }}
        onSuccess={handleApiKeySuccess}
      />
    </>
  )
}
