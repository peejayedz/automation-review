# Automation Review admin: handoff

The repo README covers the client pages, the Apps Script and the Sheet. This file covers the team's admin page in `admin/`.

## v1.7.0 Redesign v2 admin: LIVE 17 Nov 2026 (`45e80af` + `1484712` phone "All submissions ›" row)

- **Live:** Pushed + team site deployed 17 Nov 2026 ~10:07 PM Manila (deploy run 44099661971, success). Live check on lfmp-admin.pages.dev, signed in, real data: Clients (2 test records), Scorecards (4 firms · all synced 10:07 PM) + bell top block (Sync every 30 min · last · next, Token keeper OK), Reviews (7 clients · 2 need you · All submissions ›); no sideways scroll, no console errors; the one-time "Update available" bar after the deploy cleared after one Refresh. Screenshots: `assets/images/2026-11-18_redesign-v2/live/`. Phone layout not seen live (Chrome window couldn't be resized and the site refuses framing); proven locally on real data with the same files (`…/real/`). **Follow-up, committed locally, NOT PUSHED:** avatar showed "P" live because the Google name is just "PJ"; shared `initials()` now keeps a one-word all-caps name of 2–3 letters ("PJ" → "PJ"); same file in all 3 repos.

- The admin page uses the shared v2 shell (Builder HANDOFF v1.13.0): `admin/lfmp-session.js` + `admin/lfmp-ui.css` are byte-identical copies of the Builder's (copy, never edit); `admin/tests/shell.test.mjs` identical too. New `admin/whats-new.json` (What's new in Me).
- Status words as the reference only: Needs you (red), Waiting (amber; "Links not opened yet" when nothing was opened), Approved (green, every automation approved) or Done (green).
- Moved: theme / test clients / Refresh / Team sign-ins / Sign out → Me; Submissions → desktop summary "· All submissions ›" and a client's Details → Open items (phone: only through a client); row buttons → the whole row opens Details (Link A/B Open ↗ + Copy there).
- "Link A sent · Nov 16" on Waiting rows = the Builder record's `review.linkSent` (latest Copy of Link A/B in the Builder or here). The admin reads the Builder's `records/` through the team site (B1) and a Copy in Details saves it back (B2, sha-checked, 2 retries). No Builder record (classic clients) → today's text and Copy just copies; GitHub trouble → today's text, never an error banner.
- Client pages (Link A/B, root `index.html`, `plan.html`, `messages.html`, `preview/`, `data/`), `admin/moved.html`, `apps-script/` and the classic editor (`edit.*`) unchanged.

## State (17 Nov 2026)

| Area | State |
|---|---|
| **Apps Script v11 (Slack DMs + team links + ADMIN_KEY rotation)** | **IN REPO 18 Nov 2026, NOT DEPLOYED.** Ships in ONE Apps Script deploy (new version, same URL) together with the `ADMIN_KEY` rotation. Order: (1) PJ makes a new key; (2) puts it in Script properties `ADMIN_KEY`, Cloudflare `REVIEW_ADMIN_KEY` (lfmp-admin) and the Builder's GitHub secret `ADMIN_KEY`; (3) adds a NEW script property `SLACK_DM_WEBHOOK_URL` = his DM webhook (leave `SLACK_WEBHOOK_URL`, the shared channel, exactly as it is: the channel keeps getting every response as before); (4) pastes Code.gs v11 and deploys a new version; (5) runs `testSlackDm` (DM only; `testSlack` still tests the channel); (6) checks the Review admin loads clients and one test change request on ZZ TEST 2 sends a DM. Until all three keys match, the Review admin and the Builder's Publish answer "Not authorized". Details: CHANGELOG "Apps Script v11"; the morning summary and other alerts: Builder HANDOFF v1.12.0. |
| v1.6.0 Classic page retired + Edit tab + Link B fix | **LIVE 17 Nov 2026** (`db75dba`; team site deploy run 43941578259, admin-site fingerprint 46ee799675474f26, 80 files, 8 changed; github.io README `73fb0be`). Live check 14/14 (`assets/code/2026-11-17_review-admin-v160_live-check.mjs` in PJ's LFMP folder): live files = pushed, Mahdavi + ZZ TEST 2 classic links → Link A with #hash, Dumas / Palm Beach / preview/ → moved page with no data/ request, old preview files 404, Link B loads, every team-site tool address requires sign-in; screenshots `assets/images/2026-11-17_review-admin-v160_live/`. **Not yet seen live:** the Edit tab signed in on lfmp-admin (needs PJ's Google sign-in). Details → Edit tab (Link B wording + new version), classic links hidden, classic editor only via Details → ⋯ → Classic editor (old) with the "Old editor" banner, public `index.html?c=` = redirect to Link A or "This review has moved", classic-only clients show "No client link yet — create an A/B package in the Builder.". **Client-page fix:** `messages.html` about 8 lines. An edited message the client never responded to, or had approved before the edit, shows the new wording + a small "Updated" tag, no "Was:", and is to review again. Change requests marked Updated are unchanged. Identical otherwise: 14/14 states, 33/33 checks (`assets/code/2026-11-17_linkb-dom-identity.mjs`). peejayedz.github.io README preview/ line corrected (not pushed). `preview/` (public classic copy with Hedayati's data) moved to the workspace `archive/2026-11-17_automation-review-preview/`; `/automation-review/preview/` = static moved page. Who may hit the moved page: none of the six classic-only clients responded in the last 30 days (Submissions, 17 Nov); page opens aren't recorded anywhere. logic 9/9, e2e 56/56. See CHANGELOG v1.6.0. |
| **TODO ~15 Dec 2026: delete the classic editor** | Noted 17 Nov 2026. After 2–4 weeks of the Edit tab working for real (target **~15 Dec 2026**), delete `admin/edit.html`, `edit.js`, `edit.css`, the ⋯ → Classic editor (old) item and its e2e section. Then keep `isReplaced` / `subStatusKey` as fixtures in `tests/logic.test.mjs` (they are read from `edit.js` today). Before deleting, ask PJ whether anyone still needs the fields the Edit tab doesn't offer (automation name, summary, glance boxes, step title/when/gap/note, questions): those only ever showed on the retired classic page. |
| v1.5.0 Sign out button, Last signed in, ⋯ → Team sign-ins | **17 Nov 2026.** Sign out next to the name (phone: ⋯) → Cloudflare Access logout → `/signin/?out=1` "You've been signed out." (never the team-domain logout: live it answered "Failed to log out."); "Last signed in …" under the name; Team sign-ins dialog (from the shared `lfmp-session.js`). e2e 45/45. Details: Builder HANDOFF v1.8.0. |
| v1.4.0 Google sign-in only + Edit wording page + public admin mode removed | **LIVE 17 Nov 2026** (`484327e`, team site deploy 43912763840). Edit wording has no client buttons (only clients respond and approve). e2e: 44/44 against the real team-site server; logic: 6/6; public page client view DOM-identical in 76 views. See CHANGELOG v1.4.0. |
| Admin page v1.3.0 (team site only) | **Live** (commit ad1c997, 16 Nov 2026) only at `https://lfmp-admin.pages.dev/automation-review/admin/`: Cloudflare Pages in PJ's account, behind Access / Google sign-in, deployed by the Builder repo's `admin-site.yml`, which copies `admin/` without `tests/`, `HANDOFF.md` and `moved.html`, plus `config.js`. **After pushing admin files, run** `gh workflow run admin-site.yml -R peejayedz/ghl-subaccount-builder`. v1.2.0 (6a375b6): on the team site `BASE` = the public `dashboard.lawfirmmarketingpros.com/automation-review/` (data + every client link). v1.3.0: on the public site a first script in `index.html` sends visitors to `moved.html` (the shared Moved screen; byte-identical copy of the Builder's `admin-site/moved.html`); the admin never starts there (live check 16 Nov). Client pages byte-identical before/after. PJ signed in on the team site 16 Nov; all works. |
| Admin page v1.1.3 (new address) | **Live** (commit 8bbc006, 16 Nov 2026) at `https://dashboard.lawfirmmarketingpros.com/automation-review/admin/` (old peejayedz.github.io links 301 there). Only the shared sign-in help text changed. On the new host the repo comes from the `peejayedz/automation-review` fallback in `admin.js`. Phase 6 will put `/automation-review/admin/` and `/automation-review/preview/` behind Cloudflare Access; the client pages stay public. `apps-script/Code.gs` `REVIEW_BASE_URL` changes at PJ's next Apps Script deploy. |
| Admin page v1.1.2 (client links A/B, Not started) | **Live** (commit 141d2d4, 16 Nov 2026). Live check 32/32 (`assets/code/2026-11-16_review-admin-v112_live-check.mjs`: real data/ + plans/ listings, Mahdavi A = plans/ page and B both 200, ZZ TEST 2 A/B, Dumas + Palm Beach classic, Copy, Not started; plus the Builder/KPI one-login checks). Screenshots: `assets/images/2026-11-16_review-admin-v112_live/` (live) and `assets/images/2026-11-15_review-admin-v112/` (tests: Mahdavi, ZZ TEST 2 with tests shown, Dumas, 1440 + 390, light + dark). |
| Admin page v1.1.1 (one login only) | **Live** (commit 8b67874, 15 Nov 2026), with Builder v1.3.0 and KPI admin v1.15.0. Live check 29/29 (`assets/code/2026-11-15_legacy-lock-removal_live-check.mjs`; screenshots `assets/images/2026-11-15_legacy-lock-removal_live/`). |
| Admin page v1.1.0 (redesign) | Live 15 Nov 2026 (commit 407db7e). v1.0.0 (c5efbc8) before it. |
| Live check | 10/10 (`assets/code/2026-11-15_review-admin-v110_live-check.mjs` in PJ's LFMP folder): deployed files = pushed, client pages unchanged live, real sign-in at 1440/390 light/dark, deployed code with a test lock + mocked backend (home, Details, Submissions, Save → admin_status). Screenshots: `assets/images/2026-11-15_review-admin-v110-live/`. |
| Not yet seen | PJ's own sign-in with the real ADMIN_KEY and the real Sheet (names from the Content tab, real statuses). |
| Client pages | Unchanged by admin work (plan.html, plans/, data/, templates/, config.js, apps-script/). Changed on purpose in v1.6.0 (tagged [client] in CHANGELOG): index.html (redirect / moved page), messages.html (3-line Link B fix), preview/ (now only the moved page). |

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
