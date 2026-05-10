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
