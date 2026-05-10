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
