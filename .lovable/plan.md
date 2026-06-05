
# kVAssetTracker — Implementation Plan

A transformer asset registry & field maintenance platform for UEDCL. The uploaded prompt pack (P01–P08 + README references P09–P12) targets a vanilla Vite + React Router + Supabase stack. This project is on **Lovable's TanStack Start template with Lovable Cloud** — the same capabilities, but conventions differ. The plan below preserves all business rules and feature scope, and maps each prompt onto the correct conventions for this stack.

## Stack mapping (do this once, applies everywhere)

| Prompt assumption | What we actually use |
|---|---|
| `react-router-dom` + `src/pages/` | TanStack Router file-based routes in `src/routes/` |
| Raw `@supabase/supabase-js` client + `.env` | Lovable Cloud (auto-provisioned Supabase). Browser client at `@/integrations/supabase/client`; server work via `createServerFn` + `requireSupabaseAuth`; admin work via `@/integrations/supabase/client.server` |
| `AuthContext` + `ProtectedRoute` | Integration-managed `src/routes/_authenticated/route.tsx` gate. Auth state read from `supabase.auth` + a lightweight `useAuth` hook for `role/territory_id/service_area_id` |
| `src/lib/supabase.ts` | Already provided by integration — do not create |
| Vercel hosting | Lovable preview + publish |
| Tailwind config file | Tailwind v4 design tokens in `src/styles.css` (`@theme inline` + `oklch` tokens) |
| `vite-plugin-pwa` + service worker | Add in Phase 7; Dexie.js for offline queue is unchanged |

Business rules from the README are non-negotiable and applied throughout:
1. 11kV vs 33kV are always distinct.
2. Network voltage drives the kVA dropdown.
3. `TRF-000001` asset IDs are system-generated, never editable.
4. Every form submission writes a timeline entry.
5. Downtime is computed, never entered.
6. RBAC via a single `canDo(role, action)` helper, enforced in UI + server fns + RLS.
7. Field forms must queue offline and auto-sync.

## Cloud + auth bootstrap (one-time prerequisite)

Before Phase 1 work that touches data:
- Enable **Lovable Cloud**.
- Enable Google sign-in via `supabase--configure_social_auth` *only if* UEDCL wants Google SSO; the PRD says email/password only, so default to email/password only.
- Set Mapbox token as `VITE_MAPBOX_TOKEN` secret (public token, safe to expose).

## Phase 1 — Foundation & Auth (maps P01 + P02)

- Design tokens in `src/styles.css`: navy `#0F2544`, teal `#0D7377`, warning `#C2410C`, success `#15803D`, neutrals, light teal/orange surfaces — converted to `oklch`. Wire them as `--primary`, `--accent`, `--warning`, `--success`, etc.
- `src/types/index.ts` — enums (`Role`, `OperationalStatus`, `FaultSeverity`, `NetworkVoltage = 11 | 33`, etc.) and DTO interfaces.
- Auth:
  - Login at `/auth` (email + password, show/hide toggle, error states, no self-signup).
  - `useAuth()` hook wrapping `supabase.auth` + a `useQuery` that fetches `users` row for `role/territory_id/service_area_id`.
  - All protected pages live under `src/routes/_authenticated/`. The integration-managed gate handles redirect to `/auth`.
  - Sign-out hygiene (cancel queries → clear cache → signOut → navigate replace to `/auth`).
- RBAC:
  - `src/lib/permissions.ts` exporting `canDo(role, action, ctx?)` implementing the full P02 matrix (including "own territory" / "assigned area" scoping via optional context).
  - Role-gated nested layout `src/routes/_authenticated/_admin/` for Super-Admin-only pages (user management).
- Navigation shell (header + sidebar) rendered by `_authenticated/route.tsx`; menu items filtered by `canDo`.

## Phase 2 — Database schema (maps P03)

One migration creating the full schema from P03. Every `public` table includes the required `GRANT` block + RLS:
- Reference: `service_territories`, `service_areas`, `districts`, `feeders`, `transformer_ratings`.
- Core: `transformers` (with `network_voltage_kv CHECK IN (11,33)`, auto `asset_id` via sequence + trigger producing `TRF-000001`).
- Activity: `inspection_records`, `maintenance_records`, `fault_records`, `installation_records`, `replacement_records`.
- Support: `qr_codes`, `photos`, `timeline_events`, `notifications`, `users` (profile), `user_roles` (separate table — roles never live on profile).
- Roles handled via the canonical `app_role` enum + `user_roles` + `has_role(uuid, app_role)` SECURITY DEFINER. RLS policies on transformers/activity tables use `has_role` + `territory_id` / `service_area_id` scoping.
- Seed: territories (Central, Northern, Eastern, Western), districts, both 11kV and 33kV rating rows for 50/100/160/200/250/315/500/630/1000 kVA.
- `addTimelineEntry(transformer_id, event_type, ref_id, summary)` as a Postgres function used by all activity inserts.

## Phase 3 — Asset registration & list (maps P04)

- `_authenticated/transformers/new.tsx` — 4-step wizard (Network/Tech → Location → Nameplate/History → Photos/Confirm) with step indicator.
  - Step 1 hard rule: Network Voltage selected first; kVA dropdown loads from `transformer_ratings` filtered by `network_voltage_kv`.
  - Step 2 GPS: `navigator.geolocation` capture or manual entry; tiny Mapbox preview.
  - Display rating string `{kva}kVA/{network}kV` rendered prominently throughout.
- `_authenticated/transformers/index.tsx` — list page with server-paged query, search (asset_id / serial / site), filters (territory, area, voltage, kVA, status, has_open_fault), sort, CSV export stub.
- All writes go through `createServerFn` with `requireSupabaseAuth` so RLS applies as the user.

## Phase 4 — Mapbox map (maps P05)

- `bun add mapbox-gl react-map-gl`.
- `_authenticated/map.tsx` — full-viewport Mapbox `light-v11`, initial centre `[32.2903, 1.3733]` zoom 7.
- Server fn returns the lean projection (id, asset_id, site_name, kva_rating, network_voltage_kv, operational_status, has_open_fault, last_inspection_date, lat, lng).
- Status-coloured circle markers + Mapbox clustering with worst-status colour roll-up.
- Filter panel (collapsible) + asset search box + marker popup with "View Full Record →" linking to profile.

## Phase 5 — QR codes & asset profile (maps P06)

- `bun add qrcode react-qr-reader`.
- `src/lib/qr.ts`: `generateQRCode`, `downloadQRCode`, `recordQRScan`. QR payload = `{appBaseUrl}/transformers/{id}` (login-gated).
- `_authenticated/qr-scan.tsx` page + nav entry; camera scanner with manual asset-ID fallback.
- `_authenticated/transformers/$id.tsx` — header (asset id, rating badge, phase, status pills, QR controls) + 7-tab profile: Overview, Specifications, Location, Inspections, Maintenance, Faults, Timeline. Tabs driven by URL search param so links are deep-linkable.
- Timeline tab reads `timeline_events`; appears identical regardless of source form.

## Phase 6 — Field forms (maps P07 + P08)

Shared field-form harness (`src/components/field-form/`):
- Auto-GPS on mount, refresh button, accuracy display.
- Auto-populated user (read-only).
- Submit handler: write activity row → call `addTimelineEntry` → optional transformer side-effects → redirect to profile at the right tab.
- Photo uploads go to Lovable Cloud Storage; thumbnails in `photos` table.
- All submit handlers wrapped so they can be queued by Phase 7 offline layer (write goes through a single `submitFieldForm` boundary).

Forms:
1. **Inspection** (`/transformers/$id/inspect`) — visit details, network confirmation toggles (flag `rating_discrepancy_flag` + notify engineers on mismatch), physical condition button groups, oil/breather, electrical (with **live load %** calculator = `current_load_kva / kva_rating * 100`, overload banner ≥80%), action taken, photos.
2. **Maintenance** (`/transformers/$id/maintain`) — work type, parts, hours, cost, before/after photos.
3. **Fault** (`/transformers/$id/fault` + global "Report Fault" with asset search) — fault type card selector, severity (colour-coded), on save: set `has_open_fault`, set `operational_status='faulty'` for major+, notify TMs + Super Admin for critical/complete outage.
4. **Fault management** (on Faults tab) — Assign to Team, Mark In Progress, Mark Resolved (computes `downtime_hours = resolved_at - fault_at`, clears `has_open_fault`, restores `operational_status`).
5. **Installation / Replacement** — installation form; replacement workflow auto-decommissions the predecessor and links both via `replacement_records`.

## Phase 7 — Manager dashboard & reports (P09 + P10)

- `_authenticated/dashboard.tsx` (role-gated to Manager/Engineer/Super Admin):
  - 7-tile KPI strip (totals split by 11kV / 33kV, active, faulty, overdue inspections, open critical faults, mean downtime).
  - Alert panel (open critical faults, overdue inspections, rating discrepancies).
  - 5 Recharts charts (faults by month, by territory, by network voltage, kVA distribution, downtime trend).
  - Activity feed (latest 20 timeline events).
  - 3 decision-support tables (worst-performing transformers, replacement candidates, overdue inspections).
  - All data via dedicated server fns that respect territory scoping.
- Reports page (`/reports`): Excel exports (SheetJS), PDF district summary (jsPDF). `bun add xlsx jspdf jspdf-autotable`.

## Phase 8 — Offline PWA (P11)

- `bun add vite-plugin-pwa dexie`.
- Vite PWA plugin: precache app shell, runtime cache for Mapbox tiles + Supabase REST GETs (network-first with timeout fallback).
- Dexie DB: `outbox` (pending writes), `cache_transformers`, `cache_lookups`.
- `submitFieldForm` boundary: if offline → push to outbox with idempotency key + queued attachments (as Blobs) → optimistic timeline entry locally → background sync on `online`.
- Sync engine: drains outbox FIFO, retries with exponential backoff, surfaces sync banner with pending count + last-sync timestamp. Conflict policy: server wins on transformer fields, append-only on activity records.

## Phase 9 — Bulk import (P12)

- `/admin/import` (Super Admin only). Upload XLSX/CSV → column mapping UI → row-level validation (network voltage ∈ {11,33}, kVA exists in `transformer_ratings` for chosen voltage, GPS valid, required fields) → preview with row-level errors → commit in batched transactions via a server fn using `supabaseAdmin`. Each import produces an `import_batches` row enabling rollback (soft-delete by `batch_id`).

## Phase 10 — Pre-demo seed + verification

- Seed script (server fn, Super-Admin gated): 20+ sample transformers across Central + Northern, both voltages, mixed kVA (100/315/500), mixed statuses, ≥3 with inspections, ≥2 open faults (one critical), ≥1 full lifecycle, geographically dispersed.
- Walk the README's post-build checklist; fix gaps.

## Cross-cutting technical notes

- **RLS is the source of truth.** UI `canDo` is defence-in-depth; the same scoping is encoded in every policy (`has_role` + territory/service-area match).
- **Server functions own writes.** No direct mutating Supabase calls from components. Public/aggregate reads on the dashboard use `supabaseAdmin` *inside* the handler with explicit projection — never returning PII beyond what the role allows.
- **Asset ID generation** is a Postgres trigger using a dedicated sequence so concurrent inserts can't collide.
- **Photos** stored in a `transformer-photos` bucket with RLS keyed to `transformers.territory_id`.
- **Notifications**: a `notifications` table + realtime subscription in the nav shell; high-severity fault creation inserts rows for all matching `user_roles`.
- **Tests**: keep critical helpers (`canDo`, load % calculator, downtime calc, asset-id formatter, kVA-by-voltage filter) under unit tests.

## Deliverable order (what gets shipped per turn)

1. Phase 1 (Cloud enablement + tokens + auth + RBAC + shell).
2. Phase 2 (full schema migration + seeds).
3. Phase 3 (registration wizard + asset list).
4. Phase 4 (map).
5. Phase 5 (QR + profile).
6. Phase 6 (inspection → maintenance → fault → installation/replacement).
7. Phase 7 (dashboard + reports).
8. Phase 8 (offline PWA).
9. Phase 9 (bulk import).
10. Phase 10 (seed + verification pass).

Confirm to start with **Phase 1** (enable Lovable Cloud, install tokens, build login + RBAC + protected shell), or tell me to jump to a different phase.
