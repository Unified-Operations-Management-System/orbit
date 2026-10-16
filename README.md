# Orbit

**A unified, configurable operations management platform for small and medium-sized businesses.**

Capstone project · Honours Bachelor of Computer Science (Mobile Computing) · Sheridan College

Orbit gives small manufacturers the operational tools usually only enterprises can afford:
HR and employee self-service, barcode-based inventory tracking, configurable production
workflows with simulation, and cost analytics, all in one platform with role-based access
for employees, supervisors and managers.

> **Status:** Inception phase (Sept–Dec 2026). The repo currently contains the full
> monorepo scaffold (Go API, Next.js web app, Expo mobile app, shared API contract) with a
> demo "todos" feature that shows the end-to-end flow. Real features replace it iteration
> by iteration; see the [roadmap](#roadmap).

---

## Contents

- [About the project](#about-the-project)
- [Team](#team)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Working with the API (spec-first)](#working-with-the-api-spec-first)
- [Mobile development](#mobile-development)
- [Environment variables](#environment-variables)
- [Testing and CI](#testing-and-ci)
- [Contributing](#contributing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

---

## About the project

### The problem

Small manufacturing businesses (NAICS 31–33) coordinate inventory, production, staff and
customer orders, but usually with spreadsheets, paper timesheets and visual stock checks.
That leaves them unable to:

- confirm stock levels in real time, causing production stoppages or over-ordering;
- verify hours, manage leave and pay statements, or restrict access to sensitive HR data;
- "follow the money": connect materials, labour and output at each production stage to
  see where waste happens and what each unit really costs.

About 90% of Canadian food and beverage processors have fewer than 100 employees, so
most cannot justify enterprise ERP or HR software. Our starting example and domain
partner is **INVEX FOODS CANADA CORPORATION** (food manufacturing, NAICS 311).

### The solution

| Functional area | What it does | Champion |
|---|---|---|
| Organization and Access Management | Company setup, invitations, roles and scoped permissions | Oluwasekunayo Faseyi |
| HR Management | Clock in/out, shifts, scheduling, leave, pay statements | Suthakaran Siva |
| Inventory and Barcode Tracking | Scan materials and products in and out, live stock levels | William Galvin |
| Process Configuration and Simulation | Define production workflows, visualize and simulate them | William Galvin |
| Cost Analytics and Reporting | Landed cost, cost per unit, margins, AI-supported insights | Muhammad Owais Siddiqui |

- **Mobile app (iOS + Android):** mainly the employee-facing HR tools: shifts, clock
  in/out, time off, pay stubs, plus phone-based barcode scanning.
- **Web app:** manufacturing and management workflows, built for a stationed desktop on
  the production floor.
- **Backend:** all business logic lives in one Go API; the front ends stay thin.

**Advanced areas of computer science**

- **Internet of Things:** barcode scanners and printers connected to computers and phones,
  linking physical inventory to the system in real time.
- **Modelling and simulation:** visualizing user-configured production processes (material
  flow, stages, bottlenecks) and simulating changes before applying them.

### Project links

| | |
|---|---|
| Project Management Plan (JIRA) | [SCRUM project](https://sheridancollege-team-s10tmwmg.atlassian.net/jira/software/projects/SCRUM/summary) |
| Risk Management Plan (JIRA) | [RMP project](https://sheridancollege-team-s10tmwmg.atlassian.net/jira/software/projects/RMP/summary) |
| Ideation mind map | [Mindomo](https://www.mindomo.com/mindmap/e425f381ffbc4adb97dde79b27598fff) |

---

## Team

| Member | Project roles | Contact |
|---|---|---|
| **Oluwasekunayo Faseyi** | Project Owner, Requirements/Business Analyst, Requirements Model Lead, QA Lead | faseyi@sheridancollege.ca |
| **Suthakaran Siva** | Scrum Master, UX Design Lead, Interaction Model Lead, Test Model Lead | sivasu@sheridancollege.ca |
| **William Galvin** | Software Architect, Design Model Lead, Integration/DevOps Lead, Tool and Devices Support | galvinw@sheridancollege.ca |
| **Muhammad Owais Siddiqui** | Risk Analyst, Domain Model Lead, Deployment Model Lead | siddiq59@sheridancollege.ca |

All four members are full-stack developers and act as Functional Area Champion and
V&V Champion for their own area (see [the solution table](#the-solution)).

- **Supervisor:** Prof. Omer Mohamed, Sheridan College (omer.mohamed@sheridancollege.ca)
- **Domain expert:** Ayodele Sokefun, Part Owner, INVEX FOODS CANADA CORPORATION

---

## Tech stack

| Layer | In the repo now | Planned |
|---|---|---|
| Mobile | Expo SDK 57 (React Native 0.86), Expo Router, TanStack Query | Camera barcode scanning, offline support |
| Web | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4 | Playwright end-to-end tests |
| API | Go 1.27, `net/http`, oapi-codegen (strict server), spec-driven request validation | PostgreSQL, Firebase Auth |
| API contract | OpenAPI 3.1 split by domain, Redocly, Prism mock, oasdiff | |
| Shared | `@orbit/api-client`: typed client from openapi-typescript + openapi-fetch | |
| Tooling | pnpm 12 workspaces, Turborepo, mise, GitHub Actions, Docker Compose | Kubernetes, QuickBooks integration |

---

## Repository layout

```
orbit/
├── apps/
│   ├── web/                    Next.js web app (app/ = routes, features/ = domains; see apps/web/README.md)
│   └── mobile/                 Expo app (src/app/ = screens, src/lib/api.ts, eas.json)
├── services/
│   ├── api/                    Go API
│   │   ├── cmd/api/            server entrypoint
│   │   ├── internal/oapi/      generated server interface + models (do not edit)
│   │   ├── internal/server/    handlers implementing the interface  ← backend code goes here
│   │   ├── internal/httpx/     request validation, error responses, CORS, /docs
│   │   └── internal/app/       HTTP wiring + contract tests
│   └── sim/                    C++ simulation service (CMake)
├── packages/
│   ├── api-spec/               the OpenAPI contract  ← every API change starts here
│   ├── api-client/             typed TS client shared by web + mobile
│   └── tsconfig/               shared TypeScript config
├── .github/                    CI workflow + CODEOWNERS
├── turbo.json                  task graph (what runs before what)
├── mise.toml                   pinned Go, Node and pnpm versions
└── compose.yaml                production-like Docker run of api + web
```

How the pieces connect:

```
packages/api-spec/src/**/*.yaml       hand-written contract, split by domain
          │  redocly bundle
          ▼
packages/api-spec/dist/openapi.yaml   (committed)
          ├─► services/api/internal/oapi/oapi.gen.go      Go server interface   → Go API
          ├─► packages/api-client/src/schema.gen.ts      TS types              → web + mobile
          ├─► Prism mock server on :4010                  build UIs before the backend exists
          └─► oasdiff in CI                               blocks breaking changes
```

---

## Getting started

> **Run every command from the repo root** (`orbit/`) unless a section says otherwise.
> Turborepo runs each task in the right package for you.

### 1. Install the toolchains (once per machine)

The repo pins **Go 1.27, Node 24 and pnpm 12** in `mise.toml`. The easiest way to get the
exact versions:

```bash
curl https://mise.run | sh     # install mise, then follow its prompt to activate it in your shell
mise install                   # installs Go, Node and pnpm from mise.toml
```

You can install them yourself instead; just match the versions.

For mobile you also need one of: **Xcode** (iOS Simulator, macOS only), **Android Studio**
(Android Emulator), or a physical phone.

### 2. Install dependencies

```bash
pnpm install
```

Run it again whenever `package.json` or `pnpm-lock.yaml` changes after a pull. Go
modules download automatically the first time the API runs.

### 3. Run

```bash
pnpm dev           # everything: API + web + mobile
pnpm dev:web       # API + web only
pnpm dev:mobile    # API + mobile only
```

| What | Where |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:8080 |
| API docs (interactive) | http://localhost:8080/docs |
| Mobile (Metro bundler) | :8081, see [Mobile development](#mobile-development) |

This opens Turborepo's terminal UI. Use the arrow keys to pick a task and see its logs,
and `Ctrl+C` to stop everything.

While it runs, saving a file under `packages/api-spec/src/` re-bundles the spec,
regenerates the Go and TypeScript code and restarts the API. Next.js and Metro
hot-reload on their own.

---

## Commands

All from the repo root.

| Command | What it does |
|---|---|
| `pnpm dev` / `dev:web` / `dev:mobile` | Run the apps in watch mode (see above) |
| `pnpm mock` | Mock API on :4010 that answers from the spec's examples |
| `pnpm gen` | Bundle the spec and regenerate the Go + TS code once |
| `pnpm lint` | Redocly (spec rules) + `go vet` + ESLint (web) + `expo lint` (mobile) |
| `pnpm typecheck` | TypeScript checks for web, mobile and the API client |
| `pnpm test` | Go tests, including contract tests that check responses against the spec |
| `pnpm build` | Go binary, Next.js production build, Expo JS bundles and C++ simulator |
| `pnpm --filter sim build` | Build the C++ simulator with CMake |
| `pnpm --filter sim test` | Run CTest for the C++ simulator |
| `pnpm api:breaking` | Would this branch break existing clients? (compares with `origin/main`) |
| `pnpm api:changelog` | Readable list of every API change vs `origin/main` |
| `docker compose up --build` | API + web as production containers (needs Docker running) |

Run a script in a single package with `pnpm --filter <name> <script>`. Package names:
`api`, `web`, `mobile`, `sim`, `@orbit/api-spec`, `@orbit/api-client`. For example,
`pnpm --filter web dev`.

**Before pushing,** run what CI runs:

```bash
pnpm gen && pnpm turbo run lint typecheck test build
```

---

## Working with the API (spec-first)

The OpenAPI contract in `packages/api-spec` is the **single source of truth**. Nobody
hand-writes request or response types anywhere else. The full process, including review
and the breaking-change policy, is in
[`packages/api-spec/README.md`](packages/api-spec/README.md). In short:

1. **Describe the endpoint** in `packages/api-spec/src/`: a path file under
   `paths/<domain>/`, schemas under `components/schemas/<domain>/`, and a reference in
   `src/openapi.yaml`. Then run `pnpm gen` and `pnpm lint`.
2. **Backend:** implement the new method on `Server` in `services/api/internal/server/`.
   The Go build fails until you do. Requests are validated against the spec before your
   handler runs, so you don't re-check required fields or lengths.
3. **Web and mobile:** call it with full types. Until the backend lands, point them at
   the mock:

   ```bash
   pnpm mock                                             # terminal 1
   API_URL=http://localhost:4010 pnpm --filter web dev   # terminal 2: web against the mock
   EXPO_PUBLIC_API_PORT=4010 pnpm --filter mobile dev    # or mobile against the mock
   ```

4. **Commit the generated files** with the spec change:
   `packages/api-spec/dist/openapi.yaml`, `services/api/internal/oapi/oapi.gen.go` and
   `packages/api-client/src/schema.gen.ts`. CI fails if they're out of date.

Calling the API:

```ts
// Web: Server Component or Server Action (Client Components use browserApi from @/lib/api/browser)
import { api } from "@/lib/api/server";
const { data, error } = await api.PATCH("/todos/{id}", {
  params: { path: { id: 1 } },
  body: { done: true },
});

// Mobile: TanStack Query hooks generated from the same types
import { $api } from "@/lib/api";
const { data } = $api.useQuery("get", "/todos");
const create = $api.useMutation("post", "/todos");
```

**Breaking changes:** mobile app versions stay installed on phones for months, so the
API must stay backward compatible. Adding endpoints, optional request fields or response
fields is always fine. To remove or rename something, add the replacement, mark the old
one `deprecated: true`, ship web and mobile updates, and only then remove it. Check with
`pnpm api:breaking` (run `git fetch origin main` first).

### How each app reaches the API

- **Web:** Server Components and Server Actions call Go directly using `API_URL`. Browser
  code calls `/api/*`, which `next.config.ts` rewrites to the Go server, so there is no
  CORS and cookies work.
- **Mobile:** the URL is resolved in `apps/mobile/src/lib/api.ts`: `EXPO_PUBLIC_API_URL`
  if set, otherwise your computer's LAN IP on port 8080 (so a phone on the same Wi-Fi
  just works), otherwise `localhost:8080`.

---

## Mobile development

Start the API and Metro together from the root:

```bash
pnpm dev:mobile
```

In the Turborepo UI, select the `mobile:dev` task with the arrow keys and press `i` to
interact with it (`Ctrl+Z` to stop interacting). Then use Expo's keys:

| Key | Opens the app in |
|---|---|
| `i` | iOS Simulator (needs Xcode) |
| `a` | Android Emulator (needs Android Studio with an emulator running) |
| `w` | Web browser |
| `s` | Switch between development build and Expo Go |

**On a physical phone:** connect it to the same Wi-Fi as your computer and scan the QR
code. The app finds the API on your computer automatically.

**Development builds:** the app includes `expo-dev-client`. For day-to-day work on real
features (camera, barcode scanning and other native modules), use a development build
instead of Expo Go. Build one with EAS, from `apps/mobile`:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init                                         # once: link to the team's Expo account
npx eas-cli@latest build --profile development --platform ios   # or android
```

**Development build on your own iPhone, without EAS** (needs a Mac with Xcode; a free Apple
ID works, but the app expires after 7 days and you rebuild). Apple bundle IDs belong to
one signing team, so each developer uses their own:

1. In `apps/mobile/.env`, set `IOS_BUNDLE_ID=com.yourname.orbit` (see `.env.example`).
   `app.config.ts` applies it on top of `app.json`.
2. Plug in the iPhone, tap **Trust**, and turn on **Settings → Privacy & Security →
   Developer Mode**.
3. From `apps/mobile`:

   ```bash
   pnpm exec expo prebuild --platform ios --clean   # after changing IOS_BUNDLE_ID
   pnpm exec expo run:ios --device
   ```

4. On first launch, trust your Apple ID under **Settings → General → VPN & Device
   Management**.

After that, `pnpm dev:mobile` and scanning the QR code opens your build.

Other EAS profiles in `eas.json`: `development-simulator`, `preview` (internal testing)
and `production` (store builds, then `npx eas-cli@latest submit`).

**Adding a mobile dependency:** run `npx expo install <package>` from `apps/mobile`, not
`pnpm add`. It picks versions compatible with the Expo SDK.

---

## Environment variables

| Variable | App | Default | Notes |
|---|---|---|---|
| `PORT` | api | `8080` | |
| `ALLOWED_ORIGINS` | api | `http://localhost:8081` | Browser origins allowed cross-origin (Expo web). Set `""` in production to disable. |
| `API_URL` | web | `http://localhost:8080` | Needed at **build time and runtime**; Next.js bakes the rewrite into the build. |
| `EXPO_PUBLIC_API_URL` | mobile | unset in dev | Set per EAS profile for deployed APIs. Inlined into the app bundle, so **never put secrets in `EXPO_PUBLIC_*`**. |
| `EXPO_PUBLIC_API_PORT` | mobile | `8080` | Dev only. Set `4010` to use the mock server. |
| `IOS_BUNDLE_ID` | mobile | `ios.bundleIdentifier` in `app.json` | Dev only. Your own bundle ID for building to your iPhone with your Apple ID. |

Each app has a `.env.example`. Copy it to `.env` (or `.env.local` for web) to override
values locally. `.env` files are gitignored.

---

## Testing and CI

| Level | Tools | Status |
|---|---|---|
| API unit + contract tests | Go `testing`; responses checked against the spec | In place |
| Spec linting | Redocly (`packages/api-spec/redocly.yaml`) | In place |
| Breaking-change detection | oasdiff | In place |
| Web and mobile unit tests | Jest + React Testing Library | Planned |
| Integration | Test database + Firebase Emulator Suite | Planned |
| End-to-end (web) | Playwright | Planned |
| Mobile + barcode hardware | Manual testing with physical scanners and printers | Planned |

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

- **ci:** regenerates the spec bundle, Go code and TS types and fails if they differ from
  what's committed, then runs lint, typecheck, test and build for every app.
- **api-breaking-changes:** fails a PR that would break existing clients. For an
  intentional break approved by the team, add the `api-breaking-change` label.

---

## Contributing

1. Pick up a story in [JIRA](https://sheridancollege-team-s10tmwmg.atlassian.net/jira/software/projects/SCRUM/summary)
   and create a branch for it.
2. Changing the API? Start with the spec (see [above](#working-with-the-api-spec-first)).
3. Run `pnpm gen && pnpm turbo run lint typecheck test build` before pushing.
4. Open a pull request. It needs a passing CI run and a review from another team member
   before it merges.

Work is "done" when it is merged into the main branch and covered by tests.

### Repository setup still to do

- [ ] Replace the `@your-org/*` placeholders in `.github/CODEOWNERS` with real GitHub
      teams or usernames.
- [ ] Branch protection on `main`: require the `ci` and `api-breaking-changes` checks,
      one approving review, and review from Code Owners.
- [ ] Create the `api-breaking-change` label.
- [ ] Set the real `ios.bundleIdentifier` and `android.package` in
      `apps/mobile/app.json` (currently `com.example.orbit`) and the API URLs in
      `apps/mobile/eas.json` before the first EAS build.

---

## Deployment

- **Locally, production-like:** `docker compose up --build` builds `services/api/Dockerfile`
  and `apps/web/Dockerfile` and runs them together.
- **API + web:** the same two images run on any container platform. The target is
  Kubernetes, with PostgreSQL and Firebase as backing services.
- **Mobile:** EAS Build and Submit (see [Mobile development](#mobile-development)).
  Production builds must use an **https** API URL; iOS and Android block plain http.

---

## Roadmap

Six releases across two terms: **Inception**, **Architecture** and **Elaboration** in
Sept–Dec 2026, then **Alpha**, **Beta** and **Final** in Sept–Dec 2027. Iterations are
one week in 2026 and two weeks in 2027. No capstone coursework runs Jan–Aug 2027.

<details>
<summary>Iteration goals</summary>

| # | Dates | Goal |
|---|---|---|
| 1 | Sep 22–28, 2026 | An employee can open the Orbit mobile app, sign in, and land on a home screen for their role. |
| 2 | Sep 29–Oct 5 | An employee can clock in and out and view their upcoming shifts in the mobile app. |
| 3 | Oct 6–12 | A warehouse worker can scan a barcode with their phone and see the matching item's details. |
| 4 | Oct 13–19 | A business owner can open a dashboard showing stock levels, staff on shift and material costs. |
| 5 | Oct 20–26 | A business owner can register their company and invite employees, with accounts stored securely in the cloud. |
| 6 | Oct 27–Nov 2 | An administrator can assign roles, and each user sees only the screens and records their role permits. |
| 7 | Nov 3–9 | A supervisor can see employees' clock-ins as they happen, saved to the cloud. |
| 8 | Nov 10–16 | A supervisor can see stock levels update on the web dashboard as soon as a worker scans an item. |
| 9 | Nov 17–23 | A supervisor can record a purchase order and the shipment costs that came with it. |
| 10 | Nov 24–30 | A business owner can see the landed cost of each material, broken down by freight, duty and other charges. |
| 11 | Dec 1–7 | A business owner can build a simple production workflow and watch items move through its stages. |
| 12 | Dec 8–14 | A supervisor can follow a batch from received materials through production and see its cost per unit. |
| 13 | Dec 15–18 | A business owner can use every inception-phase feature in one stable build without errors. |
| 14 | Sep 6–19, 2027 | A supervisor can run a full production cycle, from material receipt to finished goods, in one system. |
| 15 | Sep 20–Oct 3 | A business owner can see cost and margin for each production run, product and customer. |
| 16 | Oct 4–17 | A business owner can simulate a change to a workflow and compare the predicted result with current performance. |
| 17 | Oct 18–31 | A business owner can have invoices, payments and approved hours sent to QuickBooks without retyping them. |
| 18 | Nov 1–14 | An employee can keep working through busy periods and dropped connections without losing data. |
| 19 | Nov 15–28 | A new employee can complete every task their role requires using only the app, without help. |
| 20 | Nov 29–Dec 12 | A new business can set up its company, workflows and existing records on its own. |
| 21 | Dec 13–19 | A business owner can run their daily operations entirely in Orbit. |

</details>

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `command not found: pnpm` / `go` | Run `mise install` and make sure mise is activated in your shell (restart the terminal). |
| Port 8080, 3000 or 8081 already in use | Stop the other process, or run that app with a different `PORT`. |
| Phone can't reach the API | Phone and computer must be on the same Wi-Fi, and your firewall must allow incoming connections on 8080. School and guest networks often block device-to-device traffic; use a hotspot or the simulator instead. |
| CI fails on "generated code is up to date" | Run `pnpm gen` and commit the changed generated files. |
| Go build error about a missing method after a spec change | Expected: implement the new operation in `services/api/internal/server/`. |
| Weird dependency errors after pulling | Run `pnpm install` again. For mobile, `pnpm --filter mobile doctor` checks Expo versions. |
