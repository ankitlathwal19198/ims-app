# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server (Turbopack) on http://localhost:3000
- `npm run build` — production build
- `npm start` — run the production build
- `npm run lint` — ESLint (config: `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test runner is configured in this repo.

## Required environment variables

API routes will throw at runtime without these:

- `GOOGLE_CREDENTIALS` — base64-encoded JSON of a Google service account key. Decoded inside `lib/googleSheetsFetch.ts` and `lib/masterData.ts` to authorize Sheets API calls.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for the NextAuth Google provider in `auth.ts`.
- `FG_STOCK_SHEET_ID` (optional) — overrides the hardcoded finished-goods sheet ID in `app/api/finished-goods/route.ts`. Other sheet IDs are currently hardcoded in their route files.

## Architecture

This is a Next.js 16 + React 19 App Router project (TypeScript, Tailwind v4 via `@tailwindcss/postcss`). It is an internal IMS (inventory management) UI for H.R. Exports that **does not own a database** — all data lives in Google Sheets, fetched read-only by API routes and held in Redux on the client.

### Data flow (Sheets → API → Redux → UI)

1. `lib/googleSheetsFetch.ts` reads a sheet range, takes the first row as headers, normalizes them to `snake_case`, and returns `Array<Record<string,string>>` of data rows. `lib/masterData.ts` does the inverse for writes (`appendItemsToSheet` reads the header row to determine column order, then appends items in that order).
2. Each `app/api/<resource>/route.ts` is a thin wrapper that calls one of those helpers with a hardcoded `sheetId` + `range`. Resources: `master-data` (GET + POST), `sales-order` (GET), `finished-goods` (GET), `material-received` (GET).
3. Redux slices in `store/slices/*.ts` each define a `createAsyncThunk` that fetches its corresponding `/api/<resource>` route. All four slices share the same shape: `{ data, loading, error, lastFetchedAt }`. Store is wired in `store/store.ts`; typed hooks live in `store/hooks.ts` (`useAppDispatch`, `useAppSelector`).
4. `components/GlobalDataLoader.tsx` is mounted inside the `/app` layout and dispatches all four thunks on first mount (only when `lastFetchedAt === null`). Pages then read from Redux instead of refetching. Cross-resource computations (e.g. SO planned-vs-packed in `app/app/page.tsx`) happen client-side in `useMemo` over the slices.

When adding a new sheet-backed resource, the pattern is: new helper call in a route file → new slice with the same 4-field shape → register in `store/store.ts` → add to `GlobalDataLoader`.

### Auth + routing

- `auth.ts` configures NextAuth v5 with **Google** and a hardcoded **Credentials** provider (`test-user` / `mis@systems`). The Google `signIn` callback restricts access to `@shaziarice.com` emails (plus one whitelisted gmail).
- **Next.js 16 specific:** middleware lives in `proxy.ts` (not `middleware.ts`) and exports a function named `proxy`. It wraps the request with `auth()` and redirects unauthenticated users to `/login` unless the path is in `PUBLIC_PATHS` or under `/api/`. The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/auth`, `login`. If you rename middleware back to `middleware.ts` it will not run on Next 16 — keep it as `proxy.ts`.
- `next.config.ts` redirects `/` → `/app`. The dashboard tree is at `app/app/*` (note the doubled directory: outer `app/` is the App Router root, inner `app/` is the `/app` URL segment).
- `app/app/layout.tsx` is `force-dynamic` (`revalidate = 0`, `runtime = "nodejs"`) and wraps children with `DashboardShell` (sidebar + topbar) → `ReduxProvider` → `GlobalDataLoader`. The root `app/layout.tsx` adds `SessionProvider`, `next-themes`, and `react-hot-toast`.

### Path alias

`@/*` resolves to the project root (see `tsconfig.json`). Example: `@/store/hooks`, `@/lib/googleSheetsFetch`, `@/auth`.

## Conventions worth knowing

- **Header-driven Sheets I/O.** Both read and write helpers derive column keys from the first row of the sheet via `toSnakeCase`. If a column header changes in the spreadsheet, the corresponding `*_route.ts` consumer keys (and Redux row types in `types.ts`) must change in lockstep — there is no schema validation layer.
- **Sheet IDs are hardcoded** in route files (`master-data`, `sales-order`, `material-received`). Only `finished-goods` honors an env override. When changing target sheets, edit the route file directly.
- **Client components everywhere.** Most pages and shell components are `"use client"` because they use Redux. Server data preloading was scaffolded (`ReduxHydrator`, `getGlobalData`) but is commented out — the current pattern is "fetch on mount via `GlobalDataLoader`".
- **Redux thunks dispatched in components.** `app/app/page.tsx` re-dispatches the same thunks that `GlobalDataLoader` already runs; this is intentional (idempotent) but means slices should stay tolerant of duplicate fetches.
- **Theming via CSS variables.** Tailwind classes reference `var(--c-primary)`, `var(--c-card)`, etc. (defined in `app/globals.css`). `next-themes` is configured with `attribute="class"` and `defaultTheme="light"`, system theme disabled.
