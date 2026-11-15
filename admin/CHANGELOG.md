# Automation Review admin: changelog

The team's admin page (`admin/` only). The client pages (index.html, plan.html, messages.html, plans/, data/) have no changelog here and are never changed by admin work.

## v1.1.1 — 15 Nov 2026
- The "one login not set up" fallback text no longer mentions the classic `&admin` sign-in as a way round it; a missing `lfmp-lock.json` shows "Sign-in not ready" with the `set-shared-password.mjs` step. Shared `lfmp-login.js` update (same file as the Builder and KPI admin): no legacy mode, old per-page tokens removed on sign-in, an expired session locks on the next click.

## v1.1.0 — 15 Nov 2026
- Redesign in the approved teal look, kept simple (preview: builder `Claude outputs/design-wc6/review-admin/`). Three screens with hash links: `#/` Review home, `#/client/<code>` Details panel, `#/subs[/<code>]` Submissions.
- **Review home:** top line "N clients / N need you →" (click = Needs you filter); All · Needs you; "Show test clients" (off by default, remembered in this browser; ZZ… and names with "test" are test clients); search. Each row: client name, status (red "! Needs you" + "N requests to answer →", teal "● Waiting · Waiting for the client", green "● OK · Nothing waiting"), Review page ↗ and Details → (gold when the client needs you). Row click = Details. Rule: any Changes requested or In progress → Needs you; else any Updated → Waiting; else OK (a later "Looks good" on the step replaces a request, as on the client page).
- **Details panel** (right; full screen on phones; Esc / ✕ / shade): open requests first (each opens in Submissions), automations approved (N of M, with the list), links (Review page ↗, Classic dashboard ↗, Plan page ↗ and Messages page ↗ when they exist), last activity. ⋯: Rename client (admin_edit `client:name`, same as the classic page), Edit wording (the classic page in edit mode, same tab), Clear all responses (every automation or one; type the client name to confirm; admin_delete).
- **Submissions:** To answer (Changes requested + In progress) · Waiting for client (Updated) · Done (Approved + automation approvals) · Everything (with a small type filter: change requests, answers, Looks good clicks, took back, automation approvals); client picker; search. Grouped by client (name · "N to answer" · Open their review ↗), one line per response (tag, title, automation name without the version, date), "+ N more" after 4. Open a line: their request / wording / screenshots, status + Reply to the client + Save (admin_status with exactly the fields the classic page sends), ⋯ History, Open on the client's dashboard, Delete (asks twice). Approved can't be set by the team (as today).
- Names follow the client page: a rename (Content tab, read with the same public `GET ?client=`) > the data file's name > the Sheet tab name.
- Removed from the home: approved/progress columns and the "Loaded" line. No Code.gs change; no client page change (hash list before/after identical).
- Tests: `node admin/tests/logic.test.mjs` (the request rules are taken from index.html itself and compared), `node admin/tests/e2e.mjs [shots]` (23 browser checks with the real Code.gs in a mock; needs the builder repo for playwright-core).

## v1.0.0 — 15 Nov 2026
- New admin page behind the one LFMP login (Builder · KPI admin · Review): review clients with open requests and approvals; Details and All submissions opened the classic page in admin mode.
