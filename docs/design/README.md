# Orbit Design System — Foundation

**Owner:** Oluwasekunayo Faseyi (design lead)
**Status:** Draft — direction agreed, pending team review (Iteration 4, due 20 Oct 2026)
**Scope:** shared tokens, a small core component set, and the app shell / start screen for web and mobile.
Full brand identity, motion, dark mode and an accessibility spec are planned for later iterations.

## Why

Every functional area builds its Inception prototype screens this week. Without shared tokens and
components the demo would look like five different apps. This doc fixes the visual language first, so
each champion drops their screens into the same shell.

## Direction: modern Bauhaus

Geometric shapes, a strict grid, flat colour, square corners and heavy type. Colour carries meaning:
it marks the functional area and the status, and is not used for decoration inside content.

- Black sidebar (web), white canvas.
- Page headers carry a small composition of circle, square and triangle in the area colours.
- Cards sit on a light surface with a 6 px coloured top bar. No shadows, no rounded corners.

## Tokens

Source of truth: `packages/design-tokens/src/index.ts` (package `@orbit/design-tokens`), plain
TypeScript with no runtime dependencies. Both apps import from it; nobody hard-codes a hex value.

### Colour

| Token       | Value     | Use                                                  |
|-------------|-----------|------------------------------------------------------|
| `ink`       | `#111111` | Text, sidebar, secondary buttons                     |
| `paper`     | `#FFFFFF` | Page background                                      |
| `surface`   | `#F5F5F5` | Cards, inputs                                        |
| `line`      | `#E5E5E5` | Dividers, table rules                                |
| `muted`     | `#666666` | Labels, secondary text on `paper` / `surface`        |
| `mutedInk`  | `#A3A3A3` | Secondary text on the black sidebar                  |
| `red`       | `#D62839` | Primary action, alerts, errors                       |
| `blue`      | `#1F4FBF` | On track, informational, links                       |
| `yellow`    | `#F4B400` | Warnings, as a **fill only** (never text on white)   |

`red` is darkened from the mockup's `#E63946` (4.17:1 on white, fails AA) to `#D62839` so white
button labels and red text pass.

### Text pairs (checked)

Every foreground/background pair allowed for text, with its WCAG contrast ratio. AA requires 4.5:1
for body text. Any pair not in this list must not be used for text.

| Foreground | Background | Ratio  |
|------------|------------|--------|
| `ink`      | `paper`    | 18.9   |
| `ink`      | `surface`  | 17.3   |
| `muted`    | `paper`    | 5.74   |
| `muted`    | `surface`  | 5.27   |
| `paper`    | `ink`      | 18.9   |
| `mutedInk` | `ink`      | 7.49   |
| `red`      | `paper`    | 4.97   |
| `red`      | `surface`  | 4.56   |
| `paper`    | `red`      | 4.97   |
| `blue`     | `paper`    | 7.17   |
| `paper`    | `blue`     | 7.17   |
| `ink`      | `yellow`   | 10.2   |

The same list is exported as `textPairs` from the tokens package and asserted by the contrast check.

### Status

| Status    | Shape | Colour                    |
|-----------|-------|---------------------------|
| On track  | ●     | `blue`                    |
| Slowed    | ▲     | `yellow` fill, `ink` text |
| Stalled   | ■     | `red`                     |
| Done      | ✓     | `ink`                     |

Status never relies on colour alone; the shape and the label are always shown. Red is shared by the
primary button and the stalled status; the square shape and label keep them distinct.

### Functional areas

Each area has one shape and one colour, used in navigation, page headers and empty states.

| Area                          | Champion      | Web route / feature folder              | Shape          | Colour   |
|-------------------------------|---------------|-----------------------------------------|----------------|----------|
| Organization & Access         | Oluwasekunayo | `/settings/organization` · `features/organization` | circle | `red`    |
| HR                            | Sutha         | `/hr` · `features/hr`                   | square         | `blue`   |
| Process Config & Simulation   | William       | `/production` · `features/production`   | triangle       | `yellow` |
| Inventory & Barcode           | TBD           | `/inventory` · `features/inventory`     | bar            | `ink`    |
| Cost Analytics & Reporting    | Owais         | `/analytics` · `features/analytics`     | quarter circle | `red`    |

### Typography

Font: **Jost** (open source, Futura-like geometric sans). Web loads it from the self-hosted `@fontsource-variable/jost` package (`next/font/google` fails under this repo's Turbopack config);
mobile with `@expo-google-fonts/jost`.

| Token     | Size / weight      | Notes                         |
|-----------|--------------------|-------------------------------|
| `display` | 32 / 800           | Page greeting, tight leading  |
| `h2`      | 22 / 700           | Section headings              |
| `body`    | 15 / 400           | Default                       |
| `label`   | 12 / 700           | Uppercase, 0.12em tracking    |
| `stat`    | 40 / 800           | Numbers on stat cards         |

### Space, shape, elevation

- Spacing: 4 pt scale (`1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32).
- Radius: `0` everywhere. Exception: status dots and avatars are circles.
- Elevation: none. Separate layers with `surface`, `line` and the top bar.
- Touch targets: minimum 44 × 44 pt on mobile.
- Light theme only for now: remove the `prefers-color-scheme: dark` block in `apps/web/app/globals.css`
  and the `DarkTheme` switch in `apps/mobile/src/app/_layout.tsx`.

## How each app consumes tokens

- **Package:** new workspace package `packages/design-tokens` (`@orbit/design-tokens`). Add
  `"@orbit/design-tokens": "workspace:*"` to `apps/web` and `apps/mobile`; add
  `@expo-google-fonts/jost` and `expo-font` to `apps/mobile`.
- **Web (Tailwind v4):** `apps/web/app/globals.css` declares the tokens in `@theme` by hand
  (`--color-ink`, `--color-red`, …, `--font-sans`), so classes like `bg-ink text-paper` work. Values
  must match `src/index.ts`; the contrast check also compares them.
- **Mobile (React Native):** `apps/mobile/src/theme.ts` re-exports the tokens for `StyleSheet.create`.
  No extra styling library.

## Core components (this release)

Web lives in `apps/web/components/ui/`, mobile in `apps/mobile/src/components/ui/`.

| Component     | Web | Mobile | Variants / props                                |
|---------------|-----|--------|-------------------------------------------------|
| `Button`      | ✓   | ✓      | `primary` (red), `secondary` (ink), `ghost`     |
| `Input`       | ✓   | ✓      | label, hint, error                              |
| `Card`        | ✓   | ✓      | `accent` (area or status colour → top bar)      |
| `StatCard`    | ✓   | ✓      | label, value, accent                            |
| `StatusPill`  | ✓   | ✓      | `onTrack` · `slowed` · `stalled` · `done`       |
| `PageHeader`  | ✓   | ✓      | title, eyebrow label, decorative shapes (web)   |
| `EmptyState`  | ✓   | ✓      | area shape at large size, title, action         |
| `AreaIcon`    | ✓   | ✓      | `area` → shape + colour (SVG / react-native-svg)|
| `Dialog`      | ✓   |        | needed for the invite-member prototype          |
| `Select`      | ✓   | ✓      | custom listbox (web) / sheet picker (mobile); never the native control |
| `Textarea`    | ✓   |        | label, hint, error                              |
| `Checkbox`    | ✓   | ✓      | custom square box, label (+ description on web) |
| `Tabs` / `Segmented` | ✓ | ✓ | red underline on the active tab, arrow keys (web) |
| `DataTable`   | ✓   |        | typed columns with `render`, empty row          |
| `ListRow`     |     | ✓      | title, subtitle, leading, right, optional press |
| `Sheet`       |     | ✓      | bottom sheet with red top bar, safe-area aware  |
| `ProgressBar` | ✓   | ✓      | label, value/max, accent colour                 |
| `BarChart`    | ✓   |        | horizontal bars, accessible labels              |
| `Toast`       |     | ✓      | info / success / error, polite live region      |
| `DateInput`   | ✓   |        | custom calendar + 15-min time list; date, time, datetime |
| `SearchInput` | ✓   | ✓      | clear button, hidden label                      |
| `Badge`       | ✓   | ✓      | neutral / info / success / warning / danger     |
| `Avatar`      | ✓   | ✓      | initials circle                                 |
| `Alert`       | ✓   | ✓      | left colour bar + status shape                  |
| `Stepper`     | ✓   | ✓      | production stages (done / current / upcoming)   |
| `Timeline`    | ✓   | ✓      | audit history, production log                   |
| `Pagination`  | ✓   |        | previous / next with page count                 |
| `Skeleton`    | ✓   | ✓      | loading placeholder, respects reduced motion    |
| `QuantityInput` |   | ✓      | −/+ counter, adjustable for screen readers      |

## App shell

### Role picker (Inception only)

- **Web:** `apps/web/app/(auth)/sign-in/page.tsx`. **Mobile:** `apps/mobile/src/app/sign-in.tsx`.
- Three buttons: **Owner**, **Supervisor**, **Employee**. No real authentication.
- The chosen role lives in a `RoleProvider` React context (web also persists it to `localStorage`;
  mobile keeps it in memory). No role → redirect to sign-in.
- Navigation entries carry a `roles` list and are hidden for other roles. Real Firebase sign-in
  replaces this later (Organization & Access Management backlog).

### Web (`apps/web`)

- `AppShell` becomes a black sidebar listing the five areas with `AreaIcon`s, plus the current role
  and a sign-out link at the bottom. `nav-items.ts` entries gain `area` and `roles`.
- `/` (Home) shows the same layout for every role with hard-coded, role-specific content:
  - **Owner:** greeting, `StatCard`s for yield, low stock and on floor, process list with
    `StatusPill`s.
  - **Supervisor:** team on shift, tasks behind schedule, process list.
  - **Employee:** today's shift and assigned tasks.
  - A **Clock in** primary button for Supervisor and Employee.
- The Todos demo page and `features/todos` usage are removed from Home.
- Each area route gets a `page.tsx` with a `PageHeader` and an `EmptyState`; champions replace the
  empty state with their screens.

### Mobile (`apps/mobile`)

- Restructure routing into `src/app/(tabs)/_layout.tsx` with four screens:
  `index.tsx` (Home), `shift.tsx` (My shift), `tasks.tsx` (Tasks), `more.tsx` (More).
- Tab icons (Bauhaus shapes, not area icons): Home = square `ink`, My shift = circle `blue`,
  Tasks = triangle `yellow` with `ink` outline, More = three bars `ink`. Active tab uses a `red`
  indicator bar.
- Home is worker-first: today's shift, a large **Clock in** button and assigned tasks.
- Area screens on mobile go in `src/features/<domain>/` (created as needed).

## Rules for contributors

1. Import colours, type and spacing from tokens only; no raw hex, no ad-hoc font sizes.
2. Reach for a `ui/` component before writing a new one; if one is missing, add it to `ui/`. Don't use native `<select>`, checkbox or date inputs directly; use `Select`, `Checkbox` and `DateInput` so every control matches.
3. Build area screens in `apps/web/features/<domain>/` or `apps/mobile/src/features/<domain>/`.
4. Yellow is never used as text colour; only pairs in the text-pairs table are used for text.
5. Every status shows a shape and a label, not colour alone.

## Verification

- `packages/design-tokens/scripts/check-contrast.ts` asserts every `textPairs` entry meets 4.5:1 and
  that the `@theme` values in `globals.css` match `src/index.ts`. Run with
  `pnpm --filter @orbit/design-tokens test`.
- `pnpm typecheck` and `pnpm build` pass.
- The shell PR includes before/after screenshots (web via headless Chrome, mobile via the iOS
  simulator).

## Out of scope for this release

Brand identity and logo system, full component library, motion, dark mode, formal accessibility
spec, tablet-specific layouts, CI wiring for the contrast check. Tracked for later iterations.
