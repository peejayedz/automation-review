# Automation Review admin: changelog

The team's admin page (`admin/` only). The client pages (index.html, plan.html, messages.html, plans/, data/) have no changelog here and are never changed by admin work.

## v1.2.0 — 16 Nov 2026
- **Team-only admin site:** the admin also runs from https://lfmp-admin.pages.dev/automation-review/admin/ (Cloudflare Pages in PJ's account, behind Google sign-in; deployed by the Builder repo's `admin-site.yml`, which copies `admin/` without `tests/` and `HANDOFF.md`, plus `config.js`). There, `BASE` = `https://dashboard.lawfirmmarketingpros.com/automation-review/`: client data (`data/<code>.json`) is read from the public site, and every client link (Link A/B, `?c=`, plans/, Copy) is the public client address, never the admin site. On github.io and in tests `BASE` is still `../`.

## v1.1.3 — 16 Nov 2026
- **New address:** the admin moves to https://dashboard.lawfirmmarketingpros.com/automation-review/admin/ (behind Google sign-in via Cloudflare Access). Old peejayedz.github.io links redirect there. On the new host the repo comes from the existing fallback (`peejayedz/automation-review`), so the client list and plans load the same way.
- `lfmp-login.js` (shared with the Builder and KPI admin): Forgot password names the new site for the saved password-manager login.
- Not changed: the client pages, and the Apps Script email links (`REVIEW_BASE_URL` in `apps-script/Code.gs` stays on the old address, which redirects; PJ changes it at the next Apps Script deploy).

## v1.1.2 — 15 Nov 2026
- **Client links in Details:** the Links block is now "CLIENT LINKS (send to the client)", with the same names and order as the Builder's Review card. **Link A · Plan + review** ("Send this one first") is `plans/<code>.html` when the client has one (Mahdavi), else `plan.html?c=<code>`. **Link B · Review only** ("For re-reviews") is `messages.html?c=<code>`. Each row has Open ↗ and Copy (the full link; "Copied" shows next to the button for 4 s). Clients without A/B pages (classic only, e.g. Dumas, Palm Beach) get one "Review page" row with the `?c=` link they were sent. Below, smaller, "For the team": Classic dashboard ↗. No "Sent" mark: the Builder record doesn't say which link was sent.
- **Home row Review page ↗** opens Link A when the client has one, else the classic `?c=` link.
- **Not started:** a client with no responses at all shows a grey "○ Not started · Links not opened yet" instead of "OK", on the home row and in Details (Details now shows the status under the client name). Needs you and Waiting rules unchanged. Home order: Needs you, Waiting, Not started, OK.
- "Sign-in not ready" keeps the formatted `set-shared-password.mjs` text (the same message is no longer swapped for a plain copy).
- `plans/` is listed from the GitHub API alongside `data/` (a failure there only hides the plans/ link). `review-logic.mjs` is now imported with `?v=` so a cached old copy can't break the page. Tests: logic 6/6 (Not started rule + order), e2e 29 checks.

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
