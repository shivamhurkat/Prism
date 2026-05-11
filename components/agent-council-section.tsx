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
import { AgentCard } from '@/components/agent-card'
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
  generateAgentCouncil,
  updateAgent,
  addAgent,
  deleteAgent,
  reorderAgents,
} from '@/app/actions/agents'

const LOADING_MESSAGES = [
  'Mapping the stakeholder landscape...',
  'Drafting perspectives...',
  'Surfacing biases honestly...',
  'Adding the Devil\'s Advocate...',
]

interface Agent {
  id: string
  name: string
  role: string | null
  perspective: string | null
  biases: string | null
  locked: boolean
  position: number
}

interface Props {
  decisionId: string
  agents: Agent[]
  hasApiKey: boolean
}

export function AgentCouncilSection({ decisionId, agents: initialAgents, hasApiKey }: Props) {
  const [agents, setAgents] = useState(initialAgents)
  const [isGenerating, startGenerate] = useTransition()
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
  const [pendingRetry, setPendingRetry] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', role: '', perspective: '', biases: '' })
  const [isAdding, startAdd] = useTransition()
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync when server revalidates
  useEffect(() => {
    setAgents(initialAgents)
  }, [initialAgents])

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
      const result = await generateAgentCouncil(decisionId)
      if ('error' in result) {
        if (result.code === 'no_api_key') {
          setApiKeyModalOpen(true)
          setPendingRetry(true)
        } else {
          toast.error(result.error || 'Failed to generate council.')
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

    const oldIndex = agents.findIndex(a => a.id === active.id)
    const newIndex = agents.findIndex(a => a.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...agents]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Enforce DA stays last
    const daIndex = reordered.findIndex(a => a.locked)
    if (daIndex !== -1 && daIndex !== reordered.length - 1) {
      const [da] = reordered.splice(daIndex, 1)
      reordered.push(da)
    }

    setAgents(reordered)
    reorderAgents(decisionId, reordered.map(a => a.id))
      .then(result => {
        if (!result.ok) toast.error(result.error)
      })
  }

  async function handleUpdateAgent(agentId: string, fields: { name?: string; role?: string; perspective?: string; biases?: string }) {
    const result = await updateAgent(agentId, fields)
    if (!result.ok) {
      toast.error(result.error)
    }
    return result
  }

  async function handleDeleteAgent(agentId: string) {
    const result = await deleteAgent(agentId)
    if (!result.ok) {
      toast.error(result.error)
    } else {
      setAgents(prev => prev.filter(a => a.id !== agentId))
    }
    return result
  }

  function handleAddSave() {
    if (!newAgent.name.trim()) { toast.error('Name is required.'); return }
    startAdd(async () => {
      const result = await addAgent(decisionId, {
        name: newAgent.name.trim(),
        role: newAgent.role.trim(),
        perspective: newAgent.perspective.trim(),
        biases: newAgent.biases.trim(),
      })
      if (result.ok) {
        setShowAddForm(false)
        setNewAgent({ name: '', role: '', perspective: '', biases: '' })
      } else {
        toast.error(result.error)
      }
    })
  }

  const isEmpty = agents.length === 0

  return (
    <>
      <div className="border-t border-border pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[24px] font-light text-foreground">Council</h2>
            {isEmpty && (
              <p className="text-sm text-muted-foreground font-sans mt-1 max-w-md">
                A council of stakeholder agents will deliberate this decision from their own perspectives. Prism suggests them based on your context, including a locked Devil&apos;s Advocate.
              </p>
            )}
          </div>
          {!isEmpty && (
            <span className="text-sm text-muted-foreground font-sans shrink-0 mt-1">
              {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
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
                Generate council
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
                items={agents.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onUpdate={fields => handleUpdateAgent(agent.id, fields)}
                      onDelete={() => handleDeleteAgent(agent.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add agent inline form */}
            {showAddForm && (
              <LiquidGlass variant="subtle" className="p-6 space-y-4">
                <p className="font-display text-[18px] font-light text-foreground">New agent</p>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Name</label>
                  <input
                    value={newAgent.name}
                    onChange={e => setNewAgent(d => ({ ...d, name: e.target.value }))}
                    maxLength={80}
                    placeholder="Stakeholder name"
                    className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Role</label>
                  <input
                    value={newAgent.role}
                    onChange={e => setNewAgent(d => ({ ...d, role: e.target.value }))}
                    maxLength={200}
                    placeholder="One-line context"
                    className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Perspective</label>
                  <textarea
                    value={newAgent.perspective}
                    onChange={e => setNewAgent(d => ({ ...d, perspective: e.target.value }))}
                    maxLength={600}
                    rows={3}
                    placeholder="What they see, what they care about, what success looks like through their eyes."
                    className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground">Biases</label>
                  <textarea
                    value={newAgent.biases}
                    onChange={e => setNewAgent(d => ({ ...d, biases: e.target.value }))}
                    maxLength={400}
                    rows={2}
                    placeholder="Their predictable blind spots or motivated reasoning."
                    className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-copper/40 transition"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setNewAgent({ name: '', role: '', perspective: '', biases: '' }) }}
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
                    Add agent
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
                + Add agent
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={isGenerating}
                    className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Regenerate council
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Replace all agents?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Edits to current agents will be lost. The Devil&apos;s Advocate stays.
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
