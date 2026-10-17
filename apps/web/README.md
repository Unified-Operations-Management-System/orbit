# Web app structure

The web app is organized **by business domain**, not by file type. Each functional area
(organization, HR, inventory, production, analytics) owns one folder under `features/`.

```
apps/web/
├── app/                      Routes only. Pages compose features and stay small.
│   ├── layout.tsx            Root layout (html, body, global CSS)
│   ├── (dashboard)/          Signed-in pages; wrapped in the app shell
│   │   ├── layout.tsx
│   │   ├── page.tsx          /
│   │   └── <domain>/...      /inventory, /hr, ...
│   └── (auth)/               (later) pages without the shell: login, accept invite
├── features/<domain>/        Everything specific to one domain
│   ├── components/           UI for this domain
│   ├── actions.ts            Server Actions (mutations), "use server"
│   ├── queries.ts            Server-side reads, `import "server-only"`
│   ├── schemas.ts            (optional) form validation
│   ├── hooks/                (optional) client hooks
│   └── index.ts              Public API: the only file other code may import
├── components/               Shared UI that knows nothing about any domain (app shell, ...)
└── lib/                      Infrastructure: API clients, auth, env, utilities
    └── api/
        ├── server.ts         `api`: Server Components / Server Actions → Go directly
        └── browser.ts        `browserApi`: Client Components → /api rewrite → Go
```

`features/todos/` is the reference implementation. Copy its shape when starting a domain.

## Domains

Folders for each functional area already exist (empty ones hold a `.gitkeep`; delete it once
real files land):

| Domain | Feature code | Routes | Champion |
|---|---|---|---|
| Organization and Access | `features/organization/` | `app/(dashboard)/settings/organization/` → `/settings/organization` | Oluwasekunayo Faseyi |
| HR Management | `features/hr/` | `app/(dashboard)/hr/` → `/hr` | Suthakaran Siva |
| Inventory and Barcode Tracking | `features/inventory/` | `app/(dashboard)/inventory/` → `/inventory` | William Galvin |
| Process Configuration and Simulation | `features/production/` | `app/(dashboard)/production/` → `/production` | William Galvin |
| Cost Analytics and Reporting | `features/analytics/` | `app/(dashboard)/analytics/` → `/analytics` | Muhammad Owais Siddiqui |

A route folder becomes a real URL only once it contains a `page.tsx`, so these placeholders
don't create empty pages.

## Rules

1. **Imports flow one way:** `app → features → components / lib`. ESLint enforces this
   (`eslint.config.mjs`), and CI fails on violations.
2. **Use a feature only through its `index.ts`:** `import { TodoList } from "@/features/todos"`,
   never `@/features/todos/components/todo-list`. Anything not exported from `index.ts`
   can change without breaking other teams.
3. **Combine features in pages, not in features.** If the analytics page needs an inventory
   widget, the page under `app/` renders both.
4. **`components/` and `lib/` never import from `features/`.** Shared code takes data as props.
5. **Start local, promote later.** New code goes inside its feature. Move it to
   `components/` or `lib/` only once a second feature needs it.
6. **Server code stays on the server.** Anything that imports `@/lib/api/server` or has
   `import "server-only"` fails the build if a Client Component pulls it in.
7. **Business rules live in the Go API.** `queries.ts` and `actions.ts` call the typed client
   and map errors to UI. Hiding a button by role is UX only; the API enforces permissions.

## Adding a domain

1. Create `features/<domain>/` with `components/`, `queries.ts`, `actions.ts` and `index.ts`.
2. Add pages under `app/(dashboard)/<domain>/`.
3. Add the nav entry in `components/app-shell/nav-items.ts`.
4. Add the folder to `.github/CODEOWNERS` so the domain's champion reviews changes.

## Conventions

- kebab-case file names, named exports (except Next.js special files like `page.tsx`)
- Tests sit next to the file they test: `stock-table.test.tsx` beside `stock-table.tsx`
