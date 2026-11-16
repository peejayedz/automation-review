# Automation Review admin: handoff

The repo README covers the client pages, the Apps Script and the Sheet. This file covers the team's admin page in `admin/`.

## State (15 Nov 2026)

| Area | State |
|---|---|
| v1.4.0 Google sign-in only + Edit wording page + public admin mode removed | **Built and tested locally, NOT pushed or deployed** (16 Nov 2026). e2e: 43/43 against the real team-site server; logic: 6/6; public page client view DOM-identical in 76 views. Goes live together with the Builder's `/api/` server (Pages Functions) once PJ has set the Cloudflare secrets. See CHANGELOG v1.4.0. |
| Admin page v1.3.0 (team site only) | **Live** (commit ad1c997, 16 Nov 2026) only at `https://lfmp-admin.pages.dev/automation-review/admin/`: Cloudflare Pages in PJ's account, behind Access / Google sign-in, deployed by the Builder repo's `admin-site.yml`, which copies `admin/` without `tests/`, `HANDOFF.md` and `moved.html`, plus `config.js`. **After pushing admin files, run** `gh workflow run admin-site.yml -R peejayedz/ghl-subaccount-builder`. v1.2.0 (6a375b6): on the team site `BASE` = the public `dashboard.lawfirmmarketingpros.com/automation-review/` (data + every client link). v1.3.0: on the public site a first script in `index.html` sends visitors to `moved.html` (the shared Moved screen; byte-identical copy of the Builder's `admin-site/moved.html`); the admin never starts there (live check 16 Nov). Client pages byte-identical before/after. PJ signed in on the team site 16 Nov; all works. |
| Admin page v1.1.3 (new address) | **Live** (commit 8bbc006, 16 Nov 2026) at `https://dashboard.lawfirmmarketingpros.com/automation-review/admin/` (old peejayedz.github.io links 301 there). Only the shared sign-in help text changed. On the new host the repo comes from the `peejayedz/automation-review` fallback in `admin.js`. Phase 6 will put `/automation-review/admin/` and `/automation-review/preview/` behind Cloudflare Access; the client pages stay public. `apps-script/Code.gs` `REVIEW_BASE_URL` changes at PJ's next Apps Script deploy. |
| Admin page v1.1.2 (client links A/B, Not started) | **Live** (commit 141d2d4, 16 Nov 2026). Live check 32/32 (`assets/code/2026-11-16_review-admin-v112_live-check.mjs`: real data/ + plans/ listings, Mahdavi A = plans/ page and B both 200, ZZ TEST 2 A/B, Dumas + Palm Beach classic, Copy, Not started; plus the Builder/KPI one-login checks). Screenshots: `assets/images/2026-11-16_review-admin-v112_live/` (live) and `assets/images/2026-11-15_review-admin-v112/` (tests: Mahdavi, ZZ TEST 2 with tests shown, Dumas, 1440 + 390, light + dark). |
| Admin page v1.1.1 (one login only) | **Live** (commit 8b67874, 15 Nov 2026), with Builder v1.3.0 and KPI admin v1.15.0. Live check 29/29 (`assets/code/2026-11-15_legacy-lock-removal_live-check.mjs`; screenshots `assets/images/2026-11-15_legacy-lock-removal_live/`). |
| Admin page v1.1.0 (redesign) | Live 15 Nov 2026 (commit 407db7e). v1.0.0 (c5efbc8) before it. |
| Live check | 10/10 (`assets/code/2026-11-15_review-admin-v110_live-check.mjs` in PJ's LFMP folder): deployed files = pushed, client pages unchanged live, real sign-in at 1440/390 light/dark, deployed code with a test lock + mocked backend (home, Details, Submissions, Save → admin_status). Screenshots: `assets/images/2026-11-15_review-admin-v110-live/`. |
| Not yet seen | PJ's own sign-in with the real ADMIN_KEY and the real Sheet (names from the Content tab, real statuses). |
| Client pages | Unchanged by admin work (index.html, plan.html, messages.html, plans/, data/, preview/, templates/, config.js, apps-script/). |

## How it fits together

- **Files:** `index.html` (shell), `admin.js` (screens, actions), `review-logic.mjs` (pure rules, the same as index.html's), `admin.css`, `edit.html` / `edit.js` / `edit.css` (Edit wording, v1.4.0), plus the shared files (`lfmp-session.js`, `lfmp-ui.css`, `fonts/`). The shared files are byte-identical with the Builder's `page/` and leadpro-kpi `admin/`.
- **Backend:** the same Apps Script URL as the client pages (`../config.js`). Admin actions: `admin_ping` (check key + client list), `admin_all` (every response + log + Sheet tab names), `admin_status`, `admin_delete`, `admin_edit`. Plus the public `GET ?client=` for renames (Content tab). **No Code.gs change.**
- **Key (v1.4.0):** the review ADMIN_KEY is only on the team site's server (Cloudflare secret `REVIEW_ADMIN_KEY`; `/api/review` adds it and the signed-in person's first name). Nothing secret is in the browser, and the public classic page has no admin mode.
- **Client list:** the `data/*.json` files from the GitHub API (public, unauthenticated) plus any client that has responses. Since v1.1.2 it also lists `plans/` (optional: any failure there just means no plans/ page).
- **Client links (v1.1.2), same names and order as the Builder's Review card:** Link A · Plan + review = `plans/<code>.html` when the client has one (Mahdavi's hand-made page, which redirects to plan.html), else `plan.html?c=<code>` when `data/<code>.plan.json` exists. Link B · Review only = `messages.html?c=<code>` when `data/<code>.messages.json` exists. Clients with neither (classic only: Dumas, Palm Beach, Boca, Emery, Hedayati, Sralla) get one "Review page" row with the classic `?c=` link (or `customPage?c=`). Copy copies the full https link. The home row's Review page ↗ opens Link A, else the classic link. Classic dashboard (`?c=…&admin`) sits below, under "For the team".
- **"Sent" mark:** not shown. Builder records keep `review.links.plan/messages` but no field for which link was sent (and this page can't read the private builder repo). If the Builder starts saving one, it needs a public place this page can read.
- **Status rule:** any Changes requested / In progress → Needs you; else any Updated → Waiting; else no responses at all (not even an answer or a Looks good) → grey "○ Not started · Links not opened yet"; else OK. Home order: Needs you, Waiting, Not started, OK. Details shows the same status under the client name.

## Where every old admin action lives now (v1.1.0)

| Classic page (index.html admin) | Now |
|---|---|
| Submissions view | Submissions tab (`#/subs`) |
| Status + reply (Save) | Submissions → open a line → status, Reply to the client, Save |
| Delete one response (two clicks) | Submissions → open a line → ⋯ → Delete… → Click again to delete |
| Filters (open, waiting, approved, answers, automations approved, looks good, everything) | To answer · Waiting for client · Done · Everything (+ type filter in Everything) |
| Client picker | Submissions client picker; Review home rows |
| Search | Review home search (clients); Submissions search (requests) |
| Rename client | Details → ⋯ → Rename client |
| Edit names, summary, version, steps, copy, questions | Details → ⋯ → Edit wording (`edit.html`, team only since v1.4.0; the public page has no admin mode) |
| Clear all responses on an automation | Details → ⋯ → Clear all responses… (every automation or one; type-to-confirm) |
| Client's review page (custom page) | Home row: Review page ↗ (Link A, else the classic link). Details: Client links (A + B, or Review page) with Open ↗ + Copy |
| Open this on the client's dashboard | Submissions → open a line → ⋯ → Open in Edit wording |
| History / timeline of a request | Submissions → open a line → ⋯ → History |
| Reload | Top ⋯ → Refresh |
| Sign out | Top ⋯ → Sign out (Google / Cloudflare Access logout, all three tools) |

## Tests

- `node admin/tests/logic.test.mjs`: the request rules are compared with index.html's own functions, taken from the file.
- `CHROMIUM_PATH=… node admin/tests/e2e.mjs [screenshot folder]`: 29 browser checks against the real Code.gs in a mock. They cover home, Details (client links for Mahdavi / ZZ TEST 2 / Dumas / Palm Beach, Copy + "Copied" for 4 s, Not started), Submissions, every action, the admin_status payload (compared with the classic page's), Delete asking twice, Esc, 1440 and 390 in light and dark, AA contrast and no sideways scroll. Needs `../ghl-subaccount-builder` (playwright-core and `tests/mock/apps-script.mjs`).
- The cross-tool login test is in the builder repo: `tests/e2e/one-login.mjs`.

## Decisions

- PJ approved the look on 15 Nov ("design looks good, just minimize the information"). The home shows only name, status and two buttons. No bell, no "loaded" line, no approved/progress columns.
- Names follow the client page: a rename > the data file name > the Sheet tab name. Tab names are sometimes just the code.
- Clear all responses: every automation or one, type-to-confirm. Replaces the classic page's two-click clear.

## Before pushing

- Ask PJ first; another session may be working in this repo.
- Commit `admin/` only. Check the client-file hash list: `git ls-files | grep -v ^admin/ | xargs shasum -a 256`, before and after. (Exception v1.4.0: `index.html` and `README.md` change on purpose: the admin mode was removed. Client view checked DOM-identical.)
