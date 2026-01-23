# 1. Project Intent

This repository serves as a high-fidelity digital representation of my professional history. The objective is to leverage modern web technologies to create a performant, accessible, and semantically rich document system that functions equally well as a web application and a printed asset.

# 2. Core Pillars

## Engineering Excellence

**Zero-Waste Architecture:** Leverage Astro's "Islands" to ensure zero client-side JavaScript by default. Interactivity must be justified by user experience.

**Edge-First:** Deployments utilize Vercel Edge Functions to ensure global low-latency delivery.

**Type Safety:** Absolute adherence to TypeScript. No any types; all interfaces must accurately reflect the underlying data models.

## Accessibility as a Baseline

**Compliance:** Target WCAG 2.1 AAA standards.

**Semantics:** Use the correct HTML element for the job. ARIA should be used to enhance, not to fix broken structural logic.

**Navigation:** Ensure full keyboard navigability and logical focus management.

## Typography & Design Rigour

**Fluid Systems:** Use mathematical scaling for typography and spacing (e.g., clamp() functions) rather than arbitrary breakpoints.

**Design details:** The page must look sleek, elegant, and well thought out, with Swiss Grid excellence. All components should look neat, and well thought about.

**Print Fidelity:** The @media print layer is not an afterthought. It is a primary output target. Layouts must be designed to avoid orphans/widows and ensure logical page breaks.

# 3. Implementation Specifics

**Structured Data:** The JSON-LD (Schema.org) implementation must be exhaustive. The document should be as legible to a machine (crawlers/LLMs) as it is to a human.

**Data Integrity:** The CV content is treated as the "Source of Truth." Any /api endpoints must serve this data with 1:1 parity to the visual representation.

**Metadata:** Comprehensive OpenGraph and Meta-tagging strategy to ensure consistent branding across all sharing platforms.

---

# 4. Design System Guidelines

## Component Architecture

### Hierarchy
Components are organized into distinct layers:
- `ui/` — Atomic primitives (Badge, Section, TechTag, Tooltip, etc.)
- `typography/` — Text styling components (Heading, Text, Label, Metric, Link)
- `layout/` — Structural components (Stack, CardGrid, CVLayout, PrintOnly, ScreenOnly)
- `cv/` — Domain-specific components (ContentCard, ImpactCard, Hero, SkillsTerminal)
- `icons/` — SVG icon components

### Use Design System Components
Never write raw HTML with inline styles. Always use the existing component library:
- **Text**: Use `<Text>` with variants (`body`, `lead`, `summary`, `subtitle`, `small`, `muted`, `mono`)
- **Headings**: Use `<Heading>` with variants (`display`, `default`, `small`, `tiny`, `name`)
- **Labels**: Use `<Label>` with 13+ variants and 6 color options
- **Metrics**: Use `<Metric>` for bold numbers with size/color variants
- **Links**: Use `<Link>` with variants (`default`, `subtle`, `mono`, `action`)
- **Badges**: Use `<Badge>` with variants (`default`, `secondary`, `outline`, `success`, `status`)
- **Layout**: Use `<Stack>` for vertical spacing, `<CardGrid>` for meta+content grids

### CVA (Class Variance Authority) Pattern
All styled components use CVA for variant management:
```astro
// Supports both prop styles:
<Heading small>Title</Heading>
<Heading variant="small">Title</Heading>

// Color variants where applicable:
<Label variant="tech" color="purple">TypeScript</Label>
```

### Slots Pattern
Use named slots for complex layouts:
```astro
<CardGrid>
  <div slot="meta">Left column content</div>
  <div slot="content">Right column content</div>
</CardGrid>
```

## Spacing System

### Fluid Spacing Only
Never use arbitrary spacing values. Always use the fluid spacing scale via CSS variables:
- `--spacing-fluid-xs` — Micro gaps (0.25rem → 0.5rem)
- `--spacing-fluid-sm` — Small gaps (0.75rem → 1.25rem)
- `--spacing-fluid-md` — Medium gaps (1.5rem → 2.5rem)
- `--spacing-fluid-lg` — Large gaps (2.5rem → 4rem)
- `--spacing-fluid-xl` — Section gaps (4rem → 6rem)
- `--spacing-fluid-2xl` — Major divisions (6rem → 10rem)

Apply in Tailwind as:
```html
<div class="gap-[var(--spacing-fluid-sm)]">
<div class="my-[var(--spacing-fluid-md)]">
```

Or use the `<Stack>` component with gap prop:
```astro
<Stack gap="sm">...</Stack>
```

## Typography

### Font Families
Two distinct typographic systems by theme:
- **Dark mode**: Geist (sans) + Geist Mono (monospace)
- **Light mode**: IBM Plex Sans + IBM Plex Mono

Never add additional font families. The theme handles font switching automatically.

### Fluid Text Sizing
Always use fluid text sizes, never fixed px/rem for body text:
- `--text-fluid-xs` through `--text-fluid-5xl`
- Applied via `text-fluid-*` utility classes

### Typography Rules
- Headings have negative letter-spacing that scales with size (h1: -0.04em, h2: -0.03em, etc.)
- Light mode removes uppercase transforms (Swiss typography convention)
- Monospace in light mode disables ligatures (`font-variant-ligatures: none`)
- Print converts all fluid sizes to fixed pt/px values

## Color System

### Semantic Colors
Use semantic color variables, never raw hex values:
- `text-foreground` / `text-muted-foreground`
- `bg-background` / `bg-muted`
- `border-border` / `border-border-subtle`

### Accent Colors
Six accent colors available, each with light/dark variants:
- `--color-accent-purple` — Primary accent
- `--color-accent-green` — Success/terminal
- `--color-accent-blue` — Links/info
- `--color-accent-orange` — Warnings/highlights
- `--color-accent-red` — Errors/alerts
- `--color-accent-cyan` — Secondary accent

Light mode transforms these to a Swiss architectural palette (terracotta, forest green, ink blue, etc.)

## Light/Dark Mode

### Theme Strategy
- Dark mode is **default** (no attribute)
- Light mode uses `[data-theme="light"]` on `<html>`
- Use `light:` Tailwind prefix for light-mode-specific overrides

### Mode-Specific Behaviors
**Dark Mode:**
- Glowing animations (glimmer sweep, conic gradients)
- 1px borders
- Uppercase labels and micro-typography

**Light Mode:**
- Offset shadows (2px 2px) instead of glows
- Hairline borders (0.5px)
- Normal case text, medium font weights
- All animations disabled

### Writing Theme-Aware Styles
```html
<!-- Tailwind prefix approach -->
<div class="border-border light:border-[0.5px]">

<!-- For complex rules, use scoped styles -->
<style>
  :global([data-theme='light']) .my-class {
    /* light mode overrides */
  }
</style>
```

## Tailwind-First, Minimal CSS

### Strict Tailwind Usage
- Prefer Tailwind utilities for all styling
- Only use `<style>` blocks for CSS that cannot be expressed in Tailwind:
  - Keyframe animations
  - Complex pseudo-element effects (::after underlines)
  - Gradient masks and compositing
  - Theme-scoped overrides requiring `:global()`

### No Inline Styles
Never use `style=""` attributes. All styling through Tailwind classes or scoped `<style>` blocks.

### Class Organization
Order classes consistently:
1. Layout (flex, grid, position)
2. Spacing (p-, m-, gap-)
3. Sizing (w-, h-, max-w-)
4. Typography (text-, font-, leading-)
5. Colors (text-, bg-, border-)
6. Effects (shadow-, opacity-, transition-)
7. Responsive variants (sm:, md:, lg:)
8. Theme variants (light:, dark:)
9. Print variants (print:)

## Print Styles

### Print is a Primary Output
Every component must consider print layout:
- Add `print:` variants for typography (fixed sizes in px/pt)
- Add `print:` variants for spacing (tighter, no fluid values)
- Use `break-inside-avoid` and `break-before-avoid` for cards
- Hide decorative elements with `print:hidden`

### Print-Specific Components
- `<PrintOnly>` — Content visible only in print
- `<ScreenOnly>` — Content hidden in print
- `<PrintHeader>` — Compact header for printed pages
- `<TechStackPrint>` — Condensed tech display for print

### Print Typography
- Convert fluid sizes to fixed: `print:text-[10px]`
- Tighten line-heights: `print:leading-[1.4]`
- Use print color variables: `--color-print-foreground`, etc.

## Animation Guidelines

### Dark Mode Only
All decorative animations are dark-mode-only:
- TechTag glimmer sweep
- ImpactCard spinning border
- Odometer scramble effect
- GlitchEffect text scramble
- BlueprintSpotlight grid pattern

### Respect Reduced Motion
All animations must respect `prefers-reduced-motion: reduce`. Use:
```css
@media (prefers-reduced-motion: reduce) {
  .animated-element { animation: none; }
}
```

### Light Mode Alternatives
Replace animations with static effects:
- Glows → Offset shadows (2px 2px)
- Animated borders → Border color transitions
- Scramble effects → Instant display

## Accessibility

### Focus States
All interactive elements need visible focus:
```html
class="focus-visible:outline-2 focus-visible:ring-2 focus-visible:outline-offset-2"
```

### Semantic HTML
- `<section>` with `aria-labelledby` for content groups
- `<article>` for cards
- `<address>` for contact information
- `<details>/<summary>` for collapsible content
- `.sr-only` for screen-reader-only content

### ARIA Enhancement
Use ARIA to enhance, not replace, semantic HTML:
- `aria-labelledby` for section headings
- `aria-controls` for toggle relationships
- `aria-hidden="true"` for decorative elements
- `aria-label` for icon-only buttons

## Data Attributes

Use data attributes for JavaScript hooks and CSS targeting:
- `data-section` — Section scroll tracking
- `data-theme` — Light/dark mode toggle
- `data-content` — Collapsible content wrapper
- `data-card-accent` — Per-card accent color CSS variable

## Responsive Design

### Custom Breakpoints
```
--breakpoint-sm: 560px
--breakpoint-md: 730px
--breakpoint-lg: 960px
--breakpoint-xl: 1300px
```

### Mobile-First
Write base styles for mobile, then add responsive overrides:
```html
<div class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

### Responsive Grids
Use `minmax()` for flexible column widths:
```html
class="grid-cols-[minmax(125px,165px)_1fr]"
```

---

# 5. Code Quality Standards

## Component Props
- All components use TypeScript interfaces for props
- Optional props have sensible defaults
- Destructure from `Astro.props` in Astro components

## Data Flow
- CV data flows from YAML → Zod validation → DTOs → Components
- Never hardcode content in components
- Components receive shaped data as props

## File Naming
- Components: PascalCase (`ContentCard.astro`)
- Utilities: camelCase (`cv-data.ts`)
- Styles: kebab-case (`global.css`)

This is a Tailwind only repository. Do not use explicit css styles for it.