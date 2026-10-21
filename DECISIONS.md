# Teacher Portal — decisions

## 2026-10-02 — Foundation (portal slice 1)
- **API layer mirrors academic:** `lib/api/client.ts` (tenant header + JWT, `/api/backend` proxy in browser, direct fetch server-side), `lib/api/session.ts` (TEACHER_API_URL server-only, `TEACHER_NO_AUTH` dev bypass mirroring backend `AUTH_NO_SESSION`), `app/api/backend/[...path]/route.ts` proxy. Tenant order: explicit arg → `tp_tenant` cookie (set at login, auth slice) → `NEXT_PUBLIC_TENANT_ID` dev fallback.
- **Shell:** `(portal)` group with 8-item sidebar (Dashboard, My Classes, Attendance, Exams & Marks, Timetable, Students, Announcements, Profile); root redirects to `/dashboard`. Dev port 5100.
- **Theme:** teal brand on warm neutrals (deliberately distinct from the academic portal), base-nova tokens, dark variant included.
- **Verification:** tsc + eslint clean, next build 5 routes.

## 2026-10-02 � Dashboard slice + UI conventions
- **Dashboard wired to GET teachers/me/dashboard:** 3 stat cards, quick actions (Take attendance with ?classId, Enter marks for oldest pending exam), today's schedule list, recent announcements with unread badges. Loading skeletons, error+retry, empty states throughout.
- **Primitives ported verbatim from academic:** card, badge, skeleton (+ existing button). Fixed a broken cn import on the way (was 'cn', now @/lib/utils) and added the missing --info dark token.
- **Conventions for all portal slices:** no asChild (base-ui Button has no such prop — style Links with buttonVariants instead); promise-continuation data fetching to satisfy react-hooks/set-state-in-effect (teacher app keeps zero lint errors, unlike academic's house-wide violations); attendance slice must honor the ?classId quick-action param.

## 2026-10-02 — Classes slice
- **List grouped by class** (backend already groups; cards show subject badges + student counts); detail has Students / My subjects / Timetable tabs. Roster and timetable are read-only; no admin actions (capacity, supervisor, edit, fire, transfer) surface here.
- **Ported tabs** verbatim from academic. Fixed a hooks-order slip during writing (useMemo after early return) before verifying.
- **Cross-slice contract:** subject cards link to /exams?subject=<classSubjectId> — honored by the exams slice.

## 2026-10-02 — Students slice
- **Scoped lookup:** name/roll search (350ms debounce) + own-classes filter; initial load shows the full scoped roster. Detail tabs: Overview (no guardians, no documents, no admin actions), Attendance in my classes, Results in my subjects. Backend 404s out-of-scope students indistinguishably.
- **Lint learning:** the set-state-in-effect rule sees through helper calls — initial fetches must inline the promise chain in the effect with states only in continuations.

## 2026-10-02 — Announcements slice
- **Feed** from GET notifications/me with optimistic read marking (reverts on failure); compose dialog sends class-scoped announcements to account-holding parents/students with recipient count feedback. Dialog content remounts per open (fresh form state without reset effects).
- **Ported dialog** verbatim from academic.

## 2026-10-02 — Auth slice (last)
- **Session model:** login route validates against POST /auth/login, requires a TEACHER-role membership (403 otherwise, provisioned-accounts-only message), multi-school accounts pick a tenant (409 + picker). JWT + tenant stored in httpOnly cookies (7d, Secure in prod); the backend proxy injects them as headers so the token never touches JS. Logout clears both.
- **Guard:** Next 16 proxy convention (middleware.ts renamed — old name is deprecated) checking cookie presence on all portal paths; 401s hard-redirect to /login. Sign-out in sidebar.
- **Caveat:** backend dev .env runs AUTH_NO_SESSION=true, so end-to-end login can't be proven until the backend runs with real auth + a provisioned teacher account. Portal-side flow verified by type-check, lint, and build only.

## 2026-10-02 — Profile slice
- **View + self-edit + password:** employment facts read-only (academic-affairs owned); contact edit via PUT auth/me; password change verifies current password server-side with confirm-match + min-8 client checks.

## 2026-10-02 — Exams & Marks slice
- **List tabs:** My Exams (All / Authored by me / I teach in) + Needs marks queue (pending-only, oldest-first from backend order). Honors ?subject= preselect from class pages with a clear-filter path.
- **Detail:** author sees all subjects, assigned teachers see only their own (backend-enforced; UI states it). Per-subject marks grids with max/pass badges, grade display, client-side range validation, one batch save per subject, refresh-after-save.
- **Ported input.tsx** (Input + Textarea + Label + native Select) verbatim from academic for this and upcoming slices.

## 2026-10-02 — Timetable slice
- **Read-only weekly grid** from GET teachers/me/timetable, grouped MON–SUN, period badges, rooms, breaks muted. Print button hides itself and the sidebar via print:hidden (same pattern as the room card).

## 2026-10-02 — Attendance slice
- **Session list** defaults to today (max=today, no future dates), class filter initialized from the dashboard ?classId quick action, status badges (Not started / In progress / Submitted) + Locked badges from the backend editable flag, inline Start session for editable rows without one.
- **Take-attendance grid:** new bespoke toggle-group (radiogroup semantics, keyboard accessible), Present default at save time (unmarked rows save as PRESENT), mark-all-present, per-row remarks, sticky save bar with count, locked sessions render read-only. One batch POST per save.
