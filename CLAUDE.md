@AGENTS.md

# Prism — Design System Reference

## Identity
**Prism** is an AI decision-making platform for founders. The aesthetic is **editorial gravitas with liquid glass material** — a serious financial publication printed on glass. Editorial typography and considered content lead; glass is the surface treatment, never wallpaper.

Reference quality bar: linear.app, mercury.com, vercel.com, attio.com, stripe.com/sessions.

No AI-cliché purple. No gradients-as-decoration. No glassmorphism overuse. No emoji.

---

## Color Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `#FAFAF7` | `#0E0E10` | Page background |
| `--surface` / `--card` | `#FFFFFF` | `#161618` | Card/panel surface |
| `--border-edge` / `--border` | `#E8E6E0` | `#26262A` | Borders |
| `--foreground` | `#18181B` | `#F4F4F0` | Primary text |
| `--muted-foreground` | `#71717A` | `#A1A1A1` | Secondary/muted text |
| `--accent-copper` | `#C8742A` | `#C8742A` | CTAs, key signals only |
| `--success` | `#16A34A` | `#16A34A` | Positive states |
| `--warning` | `#D97706` | `#D97706` | Warning states |
| `--danger` / `--destructive` | `#DC2626` | `#DC2626` | Error/danger states |

Tailwind classes: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-accent-copper`, `text-accent-copper`, `border-border-edge`, `bg-surface`.

---

## Typography

| Font | CSS Variable | Tailwind class | Usage |
|---|---|---|---|
| Fraunces | `--font-fraunces` | `font-display` | Display headlines, pull quotes |
| Inter | `--font-inter` | `font-sans` | UI copy, body text |
| JetBrains Mono | `--font-jb-mono` | `font-mono` | Code, data values |

Type scale:
- Hero headline: `text-5xl lg:text-7xl font-display font-light leading-[1.05] tracking-tight`
- Section h2: `text-3xl lg:text-4xl font-display font-light`
- Body: `text-base font-sans leading-relaxed`
- Muted: `text-sm text-muted-foreground`
- Micro: `text-xs text-muted-foreground`

---

## Spacing & Radius
- 8pt scale. Base unit = `space-2` (8px).
- Card radius: `rounded-[14px]`
- Pill button: `rounded-full`
- Secondary button: `rounded-[10px]`

---

## Liquid Glass System

### `<LiquidGlass>` — `components/ui/liquid-glass.tsx`
Props:
- `variant`: `"default"` | `"prominent"` | `"subtle"` (blur: 28px | 40px | 16px)
- `interactive`: adds hover scale 1.005 + border brightness
- `className`: override

Requires `#liquid-glass-warp` SVG filter defined in root layout.

### `<AmbientBackground>` — `components/ui/ambient-background.tsx`
Slowly drifting warm copper radial blobs. `pointer-events-none`, `aria-hidden`.
Animations pause on `prefers-reduced-motion`. Place inside a `relative overflow-hidden` container.

### `<ThemeToggle>` — `components/ui/theme-toggle.tsx`
Sun/Moon toggle. `next-themes`. Renders null until mounted.

---

## Dark Mode
Default: `dark`. `next-themes` sets `class="dark"` on `<html>`.
`@custom-variant dark (&:is(.dark *))` in CSS. `suppressHydrationWarning` on `<html>`.

---

## Pages
- `/` — Landing (Nav + Hero + How It Works + Frameworks + Pull Quote + Beta CTA + Footer)
- `/signup` — 60/40 split: form left, editorial panel right
- `/signin` — Same layout, different quote

## Architecture Notes
- Server components by default. `'use client'` only for interactivity.
- `HeroSpecimen`: `motion/react` `useMotionValue` + `useSpring` for 3D tilt.
- `Providers` (`components/providers.tsx`) wraps root layout with ThemeProvider.
- SVG `#liquid-glass-warp` defined once in root layout body.

---

## Step 4

### Responsiveness primitives
- **`<SubmitButton>`** (`components/ui/submit-button.tsx`) — unified form submit button. Props: `variant` ("primary" | "secondary"), `size` ("default" | "lg"), `pendingLabel`, `disabled`, `className`. Uses `useFormStatus` internally. After 500ms still pending, swaps label to `pendingLabel`. Replaces all inline `DraftButton`/`ContinueButton`/`MagicLinkButton`/`SubmitButton` patterns across auth + decision forms.
- **`useTransition` pattern** — for non-form actions (sign-out in dashboard-nav, file delete). Pattern: `const [isPending, startTransition] = useTransition(); startTransition(async () => { await action() })`. Show Loader2 + disable during pending.
- **`loading.tsx` skeletons** — at `/dashboard`, `/dashboard/new`, `/dashboard/d/[id]`, `/auth/callback`. All use `LiquidGlass` + `animate-pulse` content blocks matching real layout shapes.
- **nprogress bar** — `next-nprogress-bar` `<AppProgressBar>` mounted in `Providers`. Height 2px, color `#C8742A`, no spinner.
- **Prefetch on hover** — `router.prefetch(href)` on `onMouseEnter` in `DashboardNav` links and `DecisionList` cards. `DecisionList` extracted to `components/decision-list.tsx` (client component).
- **`next.config.ts`** — `experimental.optimizePackageImports: ['lucide-react', 'motion/react']`; `serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx']`.

### File upload pipeline
- **Storage bucket** — `decision-files` (private, 25MB limit). Path convention: `{user_id}/{decision_id}/{uuid}-{sanitized_filename}`. RLS policies on `storage.objects` gate by `(storage.foldername(name))[1] = auth.uid()::text`. SQL: `supabase/migrations/0002_storage.sql`.
- **Schema** — `decision_files` extended with `parse_status` (enum: pending | parsing | ready | failed | skipped) and `parse_skipped_reason text`. SQL: `supabase/migrations/0003_files_meta.sql`.
- **Server action lifecycle** (`app/actions/files.ts`): verify ownership → validate mime/size → upload to storage → insert row (parse_status='parsing') → `extractFileText()` → update row (ready/skipped/failed) → `revalidatePath` → `logEvent`.
- **Optimistic UI** — `FileSection` (in `components/file-list.tsx`) uses `useOptimistic<State, Action>` with reducer. Optimistic file shown with parse_status='uploading' immediately on drop. Server revalidation replaces it on completion.
- **Delete** — confirmed via `AlertDialog`, calls `deleteDecisionFile` inside `useTransition`, optimistic removal via `addOptimistic({ type: 'remove', id })`.

### Extractor architecture
- `lib/extractors/` — `pdf.ts` (pdf-parse), `docx.ts` (mammoth), `xlsx.ts` (SheetJS, CSV per sheet), `text.ts` (TextDecoder UTF-8), `index.ts` (dispatcher).
- All capped at **200,000 chars**.
- Returns `{ text: string | null, reason?: string }`. Images return `{ text: null, reason: 'vision_pending' }`.
- Errors caught and returned as `{ text: null, reason: 'extraction_failed: ...' }`.

### parse_status state machine
`pending` → `parsing` (on insert) → `ready` | `skipped` (image) | `failed` (error)
Client shows `uploading` during upload before DB insert completes (optimistic only).

---

## Step 5

### BYOK pattern
- **Encryption** — `lib/crypto/keys.ts`: `encryptApiKey` / `decryptApiKey` use AES-256-GCM. Format: base64 of `[iv(12)|authTag(16)|ciphertext]`. Key source: `ENCRYPTION_KEY` env var (32-byte hex). `maskApiKey` returns `"sk-ant-...••••••{last4}"`.
- **Validation flow** — `validateAnthropicKey(plaintextKey)` in `lib/ai/anthropic.ts` pings `claude-haiku-4-5-20251001` with max_tokens=5. Returns `{ ok: true }` or `{ ok: false, reason: 'invalid_key' | 'rate_limited' | string }`.
- **Masked display** — key is always stored encrypted; displayed masked from re-decryption on read. `getApiKeyStatus()` server action handles the decrypt-then-mask step.
- **`<ApiKeyForm>`** (`components/api-key-form.tsx`) — two-state: no-key form with eye toggle; connected display with Replace/Disconnect. Uses `useActionState` + `saveApiKey` server action.
- **`<ApiKeyModal>`** (`components/api-key-modal.tsx`) — shadcn Dialog wrapping `<ApiKeyForm>`. Used by `<ClarificationsSection>` when generate is triggered with no key.
- **Settings page** at `/dashboard/settings` — three LiquidGlass sections: API key, Profile (read-only), Account (sign-out).

### Anthropic infrastructure
- **Client factory** — `getAnthropicClientForUser(userId)` in `lib/ai/anthropic.ts`: queries `api_keys`, decrypts, returns `new Anthropic({ apiKey })` or `null`.
- **MODELS constants** — `lib/ai/models.ts`: `light = 'claude-sonnet-4-6'`, `heavy = 'claude-opus-4-7'`, `validation = 'claude-haiku-4-5-20251001'`.
- **PRICING** — `lib/ai/pricing.ts`: `PRICING` record + `getCostUsd(model, inputTokens, outputTokens)`.
- **`callJsonModel`** (`lib/ai/call.ts`): gets client → times call → calls API → strips ` ```json ``` ` fences → JSON.parse with one retry on bad JSON → calls `logAiCall` → returns `{ data, usage }`. Throws `AiError` with codes `no_api_key | invalid_response | rate_limited | server_error`.
- **`logAiCall`** (`lib/events.ts`): inserts `ai_call` event + increments `decisions.actual_cost_usd`.

### Clarifications schema + generation_id versioning
- **Table** `decision_clarifications` (migration: `supabase/migrations/0004_clarifications.sql`): `id, decision_id, question, suggested_answers jsonb, user_answer, position, generation_id uuid, created_at`. Index on `(decision_id, generation_id, position)`. RLS via decision ownership.
- **generation_id convention** — each call to `generateClarifications` creates a new UUID `generation_id` for that batch. UI always displays only the latest batch (max `created_at` generation). Prior generations are retained in DB for history but never displayed.
- **Server actions** (`app/actions/clarifications.ts`): `generateClarifications(decisionId)` and `saveClarificationAnswers(decisionId, answers[])`.

### buildDecisionContext
- `lib/ai/context.ts` — `buildDecisionContext({ decision, files })` composes title + question + context_text + file extracted_text sections. Hard cap 120,000 chars; truncates proportionally across files with `[truncated]` markers. Reused by agents and synthesis (future steps).

### Rotating loading messages pattern
For any AI call with a multi-second wait: cycle through static messages every 2s using `setInterval` in a `useEffect` keyed on the `isPending` boolean. Array: `['Reading your decision...', 'Identifying gaps in context...', 'Drafting questions a sharp advisor would ask...', 'Almost there...']`. Clear interval on unmount or pending=false.

---

## Step 6

### Inline edit pattern — EditableField
- **Component** `components/ui/editable-field.tsx` — reusable client component. Props: `value, onSave, variant, placeholder, label, maxLength, disabled`.
- **variant="title"**: renders value as Fraunces 32px; click swaps to borderless input with copper underline. Enter or blur saves; Escape cancels.
- **variant="prose"**: renders value as Inter 16px muted. Pencil icon top-right on hover; click opens auto-grow textarea. Save/Cancel buttons bottom-right. Empty state shows "+ Add {label}" pill.
- **Optimistic UI**: on save, shows copper left-border flash for 600ms. If `onSave` returns `{ ok: false }`, reverts and toasts error.
- **Disabled mode**: `disabled={true}` renders read-only; title variant shows a lock icon; prose variant shows "Locked while running / after completion.". No pencil, no click.
- **onSave** is a server action (inline `'use server'` function) passed from the page server component, capturing the decision ID in its closure.

### updateDecisionBasics — status-based freeze
- `app/actions/decisions.ts` — `updateDecisionBasics(decisionId, fields)`:
  - Editable statuses: `draft | configuring | ready | failed`. Rejects with error if status is `running` or `completed`.
  - Validates title (1–120 chars) and question (min 50 chars) only if those fields are supplied.
  - Updates only supplied fields; calls `revalidatePath` and logs `decision_basics_updated`.
- **Page freeze**: `FROZEN_STATUSES = new Set(['running', 'completed'])`. All three `EditableField` instances get `disabled={isLocked}`.

### Agent council architecture
- **Table** `agent_charters` (defined in `0001_initial.sql`): `id, decision_id, name, role, perspective, biases, locked, position`. Already in `database.types.ts`.
- **AI prompt** `lib/ai/prompts/agents.ts` — `AGENTS_SYSTEM` + `buildAgentsUserPrompt(context)`. Asks for 5–7 distinct stakeholders with name/role/perspective/biases. Explicitly excludes Devil's Advocate.
- **Devil's Advocate constant** `lib/ai/devils-advocate.ts` — `DEVILS_ADVOCATE` object. Always inserted last with `locked=true`. Its name is immutable; perspective/biases are editable.
- **`buildDecisionContext`** updated to accept optional `clarifications?: Array<{question, user_answer}>`. When supplied, appends `# Clarifying Q&A` section before files.
- **Server actions** `app/actions/agents.ts`: `generateAgentCouncil`, `updateAgent`, `addAgent`, `deleteAgent`, `reorderAgents`.

### Locked-row rules (agent_charters)
- `locked=true` rows (Devil's Advocate): name is immutable, `role/perspective/biases` are editable.
- Cannot be deleted — `deleteAgent` rejects locked rows with a user-facing message.
- Cannot be dragged from last position — `reorderAgents` snaps DA back to last silently.
- Drag handle in `AgentCard` is `disabled` for locked agents (cursor-not-allowed, tooltip).

### Edit/Add/Delete/Reorder semantics
- **Edit**: `updateAgent(agentId, fields)` — partial update, validates lengths, respects locked-name rule.
- **Add**: `addAgent(decisionId, fields)` — inserts at DA's current position, bumps DA's position by 1 so it stays last.
- **Delete**: `deleteAgent(agentId)` — renumbers remaining positions after delete.
- **Reorder**: `reorderAgents(decisionId, orderedIds[])` — bulk position update; enforces DA remains at the end.
- **Regenerate**: deletes ALL existing rows, re-inserts AI agents + DA. Status advances to `configuring` if previously `draft`.

### Component structure
- `components/agent-card.tsx` — `AgentCard` (client). Read mode: drag handle, name, role, locked badge, edit/delete icons, perspective, biases. Edit mode: all four fields as inputs/textareas with live char counters.
- `components/agent-council-section.tsx` — `AgentCouncilSection` (client). Three states: empty (generate CTA), loading (spinner + rotating messages), loaded (DndContext + SortableContext + agent cards + add/regenerate buttons).
- Drag-drop uses `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (installed step 6).

### Console.log groups added in step 6
- `[decision] basics updated {fields}` / `[decision] basics error {reason}` (in `updateDecisionBasics`)
- `[agents] generating {decisionId}` / `[agents] generated {n} +1 DA cost {$}` / `[agents] error {msg}` (in `generateAgentCouncil`)
- `[agents] updated {agentId} {fields}` / `[agents] updated error {msg}` (in `updateAgent`)
- `[agents] added to {decisionId}` / `[agents] added error {msg}` (in `addAgent`)
- `[agents] deleted {agentId}` / `[agents] deleted error {msg}` (in `deleteAgent`)
- `[agents] reordered {decisionId}` (in `reorderAgents`)

---

## Step 7

### AI layer migration — Vercel AI SDK (supersedes Step 5 BYOK + AI infrastructure notes)
- **Removed** `@anthropic-ai/sdk` (and `lib/ai/anthropic.ts`). Installed `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `zod`.
- **`generateObject`** (from `ai`) with a **Zod schema** replaces the manual `messages.create` + JSON parse + retry loop. The SDK handles structured output natively (tool-call mode for Anthropic, native structured output for Google). No more "Reply with valid JSON only" in prompts.
- **`callJsonModel<T>`** now takes `{ userId, decisionId?, kind, modelTier, system, user, schema: z.ZodSchema<T>, schemaName }` and returns `{ data: T, usage }`. `data` is already typed and validated — callers consume it directly with no casting.
- Error codes: `no_api_key | invalid_response | rate_limited | server_error | no_key_for_provider`.

### Two-provider support — Anthropic + Google
- **`lib/ai/models.ts`** — `MODELS: Record<Provider, Record<ModelTier, string>>`. `Provider = 'anthropic' | 'google'`. `ModelTier = 'light' | 'heavy' | 'validation'`.
- **`lib/ai/providers.ts`** — replaces `lib/ai/anthropic.ts`. `getProviderForUser(userId)` reads `profiles.preferred_provider`, fetches the corresponding `api_keys` row, decrypts, builds a provider factory via `createAnthropic` or `createGoogleGenerativeAI`, and returns `{ provider, modelFor(tier), modelIdFor(tier) }`. Returns null if no key. `validateProviderKey(provider, key)` pings the validation model with `generateText`.
- **`lib/ai/pricing.ts`** — extended with Gemini rates (`gemini-2.5-flash`, `gemini-2.5-pro`).

### Profile schema change
- `profiles.preferred_provider` column added (migration: `supabase/migrations/0005_preferred_provider.sql`). Default `'anthropic'`. Routes all AI calls via `getProviderForUser`.
- `api_keys` table already keyed by `(user_id, provider)` — now multi-row, one per provider. First key saved also sets `preferred_provider`.

### Multi-provider API key UI
- **`api-keys.ts`** — `getApiKeyStatus()` now returns `{ keys: ProviderKeyStatus[], preferredProvider }`. `saveApiKey` reads `provider` from formData. `deleteApiKey(provider)` is now provider-scoped. `setPreferredProvider(provider)` updates `profiles.preferred_provider` after verifying a key exists.
- **`ApiKeyForm`** — now provider-specific. Takes `provider` prop. Hidden `<input name="provider" />` included. Placeholder and help link differ per provider.
- **`ProviderCard`** (`components/provider-card.tsx`) — LiquidGlass card rendering one `ApiKeyForm` per provider with connected/not-connected status.
- **`PreferredProviderSwitcher`** (`components/preferred-provider-switcher.tsx`) — segmented radio with optimistic update; only shown when BOTH providers connected.
- **`ApiKeyModal`** — tabbed (shadcn Tabs); "Anthropic" and "Google Gemini" tabs each render an `ApiKeyForm`. Tab selection does not affect which provider is preferred; user connects independently.
- **Settings page** — "API keys" section has two ProviderCards. If both connected, `PreferredProviderSwitcher` appears above the cards.
- **DashboardNav** — accepts `hasNoKeys?: boolean`; shows a copper dot on avatar when no keys connected.

### Prompt template changes
- `CLARIFICATIONS_SYSTEM` and `AGENTS_SYSTEM`: removed "Reply with valid JSON only..." trailing paragraph. Structured output is enforced by the SDK's `generateObject` call, not by prompt instructions.

### Console.log groups added in step 7
- `[provider] resolving {provider}` / `[provider] no key for {provider}` (in `getProviderForUser`)
- `[provider] validating {provider}` / `[provider] valid {provider}` / `[provider] invalid {provider} {reason}` (in `validateProviderKey`)
- `[provider] saved {provider}` (in `saveApiKey`)
- `[provider] switched {from}→{to}` (in `setPreferredProvider`)

---

## Step 8

### Decision workspace wizard
- `/dashboard/d/[id]` is now a **5-step wizard** (context · clarifications · council · scenarios · review) driven by `?step` URL param. No step's content is visible unless it's the current step. Refreshing or sharing a URL preserves step. `searchParams` is a `Promise` in Next 16: `const sp = await searchParams`.
- **Reachability** is derived from data (not DB state) via `lib/wizard/reachability.ts`. Thresholds: context=always, clarifications/council=title≥1 char AND question≥50 chars, scenarios=agents≥2, review=scenarios≥2. `getStepStatus` returns `completed | current | reachable | unreachable`.
- **Motion transitions**: `AnimatePresence mode="wait"` from `motion/react`; `initial {opacity:0, x:16}` → `animate {opacity:1, x:0}` → `exit {opacity:0, x:-16}`, 220ms easeOut, keyed on currentStep.

### Wizard file map
- `lib/wizard/reachability.ts` — `WizardStep`, `WIZARD_STEPS`, `StepData`, `getStepStatus`, `canAdvanceFrom`, `nextStep`, `prevStep`, `STEP_LABELS`, `ADVANCE_HINTS`
- `components/decision-workspace.tsx` — top-level client shell; sticky top bar (breadcrumb, title read-only, status pill, last-saved relative); renders stepper, step frame with content, wizard nav
- `components/decision-stepper.tsx` — desktop: 5 circle nodes with connecting hairlines (copper for past, border for future); mobile: "Step N of 5 · Label" + copper progress bar
- `components/step-frame.tsx` — `AnimatePresence` wrapper keyed on currentStep
- `components/wizard-nav.tsx` — desktop: inline at bottom with border-t; mobile: fixed bottom z-30 with backdrop-blur; Back disabled on context, Next hidden on review, disabled with `ADVANCE_HINTS` hint text when thresholds not met
- `components/wizard/context-step.tsx` — renders EditableField (title, question, context_text) + FileSection; heading rendered by the wrapper (only step that does this)
- `components/wizard/clarifications-step.tsx` — renders ClarificationsSection + skip link when no clarifications exist
- `components/wizard/council-step.tsx` — renders AgentCouncilSection verbatim
- `components/wizard/scenarios-step.tsx` — renders ScenariosSection verbatim
- `components/wizard/review-step.tsx` — renders PreRunReview verbatim
- All prior section components (ClarificationsSection, AgentCouncilSection) keep their own headings. ContextStep is the only wizard wrapper that renders a heading.

### Scenarios architecture
- Mirrors agents exactly. AI generates 3–5 non-Premortem scenarios + locked Premortem at last position.
- **`lib/ai/premortem.ts`** — `PREMORTEM` constant (name, description, assumptions, time_horizon, locked=true)
- **`lib/ai/prompts/scenarios.ts`** — `SCENARIOS_SYSTEM` + `buildScenariosUserPrompt`
- **`app/actions/scenarios.ts`** — `generateScenarios`, `updateScenario`, `addScenario`, `deleteScenario`, `reorderScenarios`. Same locked-row rules as agents: name immutable for locked, description/assumptions/time_horizon editable, cannot delete Premortem, snaps to last on reorder.
- **`components/scenario-card.tsx`** — mirrors AgentCard; read mode shows description + assumptions parsed as bullet list when "- "-prefixed; edit mode has name (disabled if locked), description, assumptions (with "One per line, starting with '- '" helper), time_horizon
- **`components/scenarios-section.tsx`** — mirrors AgentCouncilSection; three states (empty/loading/loaded); dnd-kit reorder; Premortem locked
- `scenarios` table already existed in `0001_initial.sql`

### Cost estimator + pre-run review
- **`lib/ai/estimator.ts`** — `estimateRunCost({ agentsCount, scenariosCount, contextChars, provider })`. Formula: contextTokens=chars/4, analysisCalls=agents×scenarios, critiqueCalls=agents, totalCalls=analysisCalls+critiqueCalls+1. Input tokens: analysisCalls×(contextTokens+1200)+critiqueCalls×3500+9000. Output tokens: analysisCalls×1000+critiqueCalls×700+3000. Always uses `MODELS[provider].heavy`. Minutes: max(2, ceil(totalCalls×25/60/3)) — 3 concurrent, 25s avg.
- **`components/pre-run-review.tsx`** — LiquidGlass prominent card: (A) 4-col metric grid (agents/scenarios/deliberations/files), (B) agents×scenarios matrix grid with lock icons, (C) cost+time flex row, (D) Run button disabled when !hasApiKey OR agents<2 OR scenarios<2 with specific helper text. Enabled click toasts step-9 placeholder and logs `[run] requested`.

### Console.log groups added in step 8
- `[wizard] navigated {from}→{to}` (in DecisionStepper and WizardNav on step change)
- `[scenarios] generating {decisionId}` / `[scenarios] generated {n} +1 Premortem cost {$}` / `[scenarios] error {reason}` (in `generateScenarios`)
- `[run] requested { decisionId, estimate }` (in PreRunReview on Run click)

### Future note
When the deliberation engine ships in step 9, a 6th "Run" stepper state will be added — it's not part of the 5 wizard steps; running/completed status takes over the workspace.

---

## Step 9

### Deliberation engine architecture
- **Inngest function** `deliberation-run` triggered by `deliberation/start` event; three sequential phases: (1) analysis batched ×4 in parallel, (2) critique batched ×4 in parallel, (3) synthesis single call. Cancellation gates between phases via `run.status === 'cancelled'` checks.
- **Inngest v4 API**: `createFunction(options, handler)` — 2 args. Triggers live inside `options.triggers`. Route handler at `app/api/inngest/route.ts`; `signingKey` read automatically from `INNGEST_SIGNING_KEY` env var (not passed to `serve()`).
- **Local dev**: Run `npx inngest-cli@latest dev` in a second terminal alongside `npm run dev`. The CLI proxies events to your local server.

### Prompts and schemas
- `lib/ai/prompts/analysis.ts` — `ANALYSIS_SYSTEM`, `buildAnalysisUserPrompt`, `AnalysisSchema`. Placeholders `{{AGENT_NAME}}`, `{{AGENT_ROLE}}`, `{{AGENT_PERSPECTIVE}}`, `{{AGENT_BIASES}}` substituted at runtime via `fillSystemPlaceholders`.
- `lib/ai/prompts/critique.ts` — `CRITIQUE_SYSTEM`, `buildCritiqueUserPrompt`, `CritiqueSchema`.
- `lib/ai/prompts/synthesis.ts` — `SYNTHESIS_SYSTEM`, `buildSynthesisUserPrompt`, `SynthesisSchema`.
- All three passes use `modelTier='heavy'`.

### Task processors
- `lib/ai/run-processor.ts` — `processAnalysisTask`, `processCritiqueTask`, `processSynthesisTask`.
- Per-task failure semantics: analysis and critique failures are tolerated (logged, `updateTaskFailed`, no rethrow). Synthesis failure is fatal — retried once internally, then marks whole run failed.
- Synthesis success inserts into `run_synthesis` table with 7 fields (verdict, confidence_pct, confidence_reasoning, top_risks, decision_criteria, what_would_change_my_mind, summary_text).

### DB helpers (service role)
- `lib/db/run-helpers.ts` uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. This is the **only** place outside admin paths where RLS is bypassed. Inngest functions have no user session; service-role is required. The security reasoning is documented in the file header.

### Status state machine
- `decisions.status`: `draft → configuring → running → synthesizing → completed | failed | cancelled`
- `cancelled` and `failed` return decision to editable states (`configuring`).
- `runs.status`: `pending → running → synthesizing → completed | failed | cancelled`
- Both tables updated via migration `0007_status_cancelled.sql`.

### Live progress UI
- Status-based view switching in `/dashboard/d/[id]/page.tsx`:
  - `running | synthesizing` → `<LiveRunView>` (client component)
  - `completed` → `<CompletedRunPlaceholder>` (temporary until step 10)
  - `failed` → wizard with `<FailedBanner>` + "Try again" button
  - `cancelled` → wizard with muted cancelled banner
  - `archived` → `<ArchivedNotice>` stub
- `LiveRunView` subscribes to Supabase Realtime channels on `runs` and `run_tasks`. On `completed | failed` run update, calls `router.refresh()` to trigger server re-render and view switch.
- `CompletedRunPlaceholder` shows verdict summary + confidence% + actual cost + collapsible raw outputs.

### Server actions
- `app/actions/runs.ts`: `startDeliberation(decisionId)`, `cancelRun(runId)`, `retryFailedRun(decisionId)`.
- `startDeliberation` stores cost estimate on `decisions.cost_estimate_usd` (runs table has no estimate column).

### Realtime setup (SQL)
- `supabase/migrations/0006_enable_realtime.sql` — `ALTER PUBLICATION supabase_realtime ADD TABLE runs; ADD TABLE run_tasks;` — paste into Supabase SQL Editor.
- `supabase/migrations/0007_status_cancelled.sql` — drops and recreates status check constraints for both tables — paste into Supabase SQL Editor.

### Console.log groups added in step 9
- `[run] started {runId} tasks={n} estimate=${cost}` (in `startDeliberation`)
- `[run] cancelled {runId}` (in `cancelRun`)
- `[run-task] analysis {agentName}×{scenarioName} start` / `done {durationMs}ms` / `failed {reason}` (in `processAnalysisTask`)
- `[run-task] critique {agentName} start` / `done {durationMs}ms` / `failed {reason}` (in `processCritiqueTask`)
- `[run-task] synthesis {taskId} start` / `done {durationMs}ms` / `failed {reason}` (in `processSynthesisTask`)
- `[realtime] subscribed run={runId}` / `update task={taskId} status={status}` (in `LiveRunView`)
