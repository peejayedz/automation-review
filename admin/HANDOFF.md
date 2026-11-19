# Automation Review admin: handoff

The repo README covers the client pages, the Apps Script and the Sheet. This file covers the team's admin page in `admin/`.

## Review admin v1.13.0 Part 2: a Done popup for every save (shared shell 2.5.0): LIVE 20 Nov 2026 (KPI `3e98f83` → Review `64bba24` → Builder `4def994`; admin-site run 44625556680 green, "Changed: deploying admin-site 89d244fbcc5a34e2" = the local build, 103 files). Live check (PJ's Chrome, signed in as the LFMP account): KPI admin Edit mapping on ZZ TEST 2 → Re-read GHL (read only) showed the cyclist + "Reading ZZ TEST 2's pipelines from GHL…" / "Asking GHL nicely for your pipelines…", then after 13 s the popup "Done: pipelines updated · Pipelines 1 · Stages 12 · no new stages · Close / Review mapping"; the bell badge 1 → its Recent jobs line; the Builder and Review admin load with their new bell (the same job listed); no console errors on any of the three
- **What it is:** CHANGELOG v1.13.0. Save wording (bar on the Edit tab), Start new version, Save reply, Delete response, Rename client, Clear test responses end with the shared Done / Didn't work popup; the page has a bell (recent jobs from all three tools). `admin.js?v=1.13.0`.
- **Tests (20 Nov, local):** `admin/tests/e2e.mjs` 66/66 (new: every save's Done popup; the Builder harness's `autoResults` records and closes popups), `logic.test.mjs` 12/12, `shell.test.mjs` 42/42, `logo-pages.mjs` 40/40.

## Builder v1.23.0 (no change in this repo): classic packages linked "as it is": LIVE 20 Nov 2026 (Builder `9115bd3`, admin-site 53c2914f639fe7fe)
- Classic one-page reviews are retired. A Builder client linked "as it is" to one (Dumas & Sanclemente, `dumas-sanclemente-mo5cay`) had dead links: Link A "This review has moved", Link B "couldn't find this review page".
- The Builder's Review tab now flags it (amber note) and offers "Move to links A/B (keep <code>)". Its links can't be opened or copied there.
- Adding a client with a classic package offers only the move.
- Nothing here changed: `data/dumas-sanclemente-mo5cay.json` is untouched until someone moves Dumas and presses Publish in the Builder. See the Builder HANDOFF v1.23.0.

## v1.12.2 The greeting's numbers at once (shared shell 2.4.2): DEPLOYED 19 Nov 2026 (`b268957`; KPI `3d4b9ca` before, Builder `8ee757a` after; admin-site run 44496387224 green, admin-site c7bd791fc03d7012 = the local build)
- **Live check: PJ to test by Sign out → sign in.** No Chrome live check was run.
- **What it is:** see CHANGELOG v1.12.2 and the Builder HANDOFF v1.22.2. The team site's `/api/greet-counts` counts "Needs you" with `admin/greet-count.mjs` `readCounts()` (hidden + shown), making this page's reads on the server (admin_ping / admin_all, the public data files, the Apps Script `?client=` read). Its ~9 s now happens in the background, never in front of anyone.
- **Push order:** KPI and Review first, the Builder last.

## v1.12.1 Greeting after Sign out + all three numbers (shared shell 2.4.1): LIVE 19 Nov 2026 (`67ad062`; KPI `f5b959c` before, Builder `8ae7acd` after; admin-site run 44359509100, admin-site 4935c6c871b5ab14 = the local build)
- **Live check (read-only):** serves 1.12.1 (`admin.js?v=1.12.1`, whats-new); fresh `readCount` = Needs you filter = 2; 8 rows, no error card. Sign out not pressed.
- **OPEN:** this count's live read takes ~9.3 s (Apps Script), far past the greeting's ~1.35 s cut, so the other tools' greetings show the last known count (≤ 12 h) or leave it out. See the Builder HANDOFF v1.22.1 for the options.
- **What it is:** see CHANGELOG v1.12.1 (with Builder v1.22.1 and KPI v1.29.1). Sign out clears "greeted today"; the greeting reads all three counts fresh. `admin/greet-count.mjs` = this page's load (`readData`) + the "Needs you" count (`homeCounts`); admin.js uses both, so the greeting's number and the filter come from the same code. From another tool, `readCount()` reads `saveUrl` from `../config.js` (already public).
- **Timing:** this page's load waits on the Apps Script (admin_ping, then admin_all + Content reads), so it is the slowest of the three; a late read shows the last known count in the other tools' greeting, and is noted for next time.
- **Push order:** KPI and Review first, the Builder last (its push deploys); see the Builder HANDOFF v1.22.1.
- **Tests (19 Nov, local):** `admin/tests/logic.test.mjs` + `admin/tests/shell.test.mjs` 34/34, `admin/tests/e2e.mjs` 65/65; cross-tool: Builder `tests/e2e/greet-fresh.mjs` 27/27.

## v1.12.0 Greeting + name menu (shared shell 2.4.0): LIVE 18 Nov 2026 14:54 UTC (`7dc6f8b` + `4bbc014`; deployed by the Builder's admin-site run 44329460367, admin-site 7674f3d040aacd3b)
- **What it is:** the once-a-day greeting (shared shell). This page gives "reviews need you" (= the Needs you filter) and notes it for the other two tools. The bar shows the initials only; the name menu holds the name, Last signed in, Theme, What's new v1.12.0, Team sign-ins, Install and Sign out.
- **FIX 3.3:** the menu is fully opaque from its first frame and above the list's "Open ›" column.
- **Live check (read-only, PJ's Chrome):** no second greeting; the menu is opaque and every item is on top; noted "reviews need you" = 2 = the filter. Sign out not pressed; the What's new card left unread.

## Review pages: client logo: LIVE 19 Nov 2026 (`d35cea5`, Andy approved; GitHub Pages run 44347725392 green; Builder v1.22.0 `88a039f` right after)
- **What it is:** when a package's `brand.logo` is set (saved by the Builder's Overview → Logo), Link A (plan.html) and Link B (messages.html) show the client's logo in the name's spot (34 px, alt = the name, white chip in dark mode). No logo = as before.
- **Live check (read-only):** Mahdavi's live Link A / Link B rendered DOM and pixels identical before and after, 8/8 (both pages × 1440 / 390 × light / dark). No package has a logo yet: one shows only after it is picked in the Builder and the package is published again.
- **Tests:** `node admin/tests/logo-pages.mjs [folder]` (every package: no logo = identical to HEAD; with a logo: spot / alt / size / chip).

## v1.10.0 + v1.11.0: LIVE 18 Nov 2026 07:09 UTC (`aec9959`; deploy 44256607647, fingerprint 04ab155bfbfef86b; live: A–Z, real Boca "Not sent", dark mode clean; Builder HANDOFF v1.18.0)

## v1.11.0 Busy states ("no silent clicks"): LIVE 18 Nov 2026 (with Builder v1.18.0, KPI v1.27.0)

- Shared `lfmp-session.js` / `lfmp-ui.css` 2.3.0 (Builder HANDOFF v1.18.0): press feedback, gold fill on the pressed button ("Saving…", "Deleting…", "Starting…" on the details forms via `busyButton`; any other button that starts a request automatically), gold top line while any request runs. Client pages unchanged. Cache `lfmp-ui.css?v=2.3.0`, `admin.css` / `admin.js` / `review-logic.mjs?v=1.11.0`.

## v1.10.0 Clients A–Z, What's new for minor releases only, details header shadow: COMMITTED LOCALLY 19 Nov 2026 (overnight run Part 1, not pushed; with Builder v1.17.0, KPI v1.26.0)

- Reviews list A–Z by the shown name in every filter and search (`homeList`, shared `byName`; "The Mahdavi Law Firm" under M); the status dots and filter counts still show urgency. What's new card only for x.Y.0. The details header (name, buttons, tabs) keeps its solid background and 1px line, plus a soft shadow once the body scrolls. Client pages unchanged. Shared `lfmp-session.js` has `byName`: deploy it with this version.

## v1.9.1 Shared stylesheet fix: LIVE 18 Nov 2026 (Builder `f42bdf6`, KPI `8d37f1d`, Review `5bcc965`; admin-site.yml run 44186335198 green, "Changed: deploying admin-site e41d91c8b689d668" = local build of the 3 pushed commits) (no change visible in this tool; Builder HANDOFF v1.16.1)

## v1.9.0 Honest statuses + v2 pop-ups: LIVE 18 Nov 2026 (`2f0e26f`; deploy 44174855128; live check in the Builder HANDOFF v1.16.0)

- Live (real data): "7 clients · 2 need you · 1 waiting · 4 not sent"; Mahdavi Waiting · "Link not copied yet" · "No reply yet"; Boca / Emery / Hedayati / Sralla Not sent + Create package › (Boca → its Builder record's Review tab, the others → Add existing with the name); no "Opened" anywhere. PJ 18 Nov: sub-line "Link not copied yet", last column "No reply yet" / "Replied · <date>".

- Full notes: Builder HANDOFF v1.16.0. Here: `review-logic.mjs` `homeState(state, hasLink)` → 'unsent' when there is no Link A/B and the client would have been Waiting; `inHome(filter, state)`; `HOME_FILTERS`; `firstAnswerAt(code, rows)`; `STATE_ORDER` need · wait · new · unsent · ok.
- `admin.js`: `sumOf` applies `homeState`; grey "Not sent" + "No client link yet" + "Create package ›" (`packageUrl`: Builder `?client=<id>&tab=review` when a Builder record matches by review code or name, else `?add=existing&q=<name>`); Waiting sub-line "Link A sent · <date>" after a Copy, else "Link not copied yet" (was "Links not opened yet"); Waiting third column "No reply yet" / "Replied · <first answer date>" (PJ: never "Opened"; opens are not logged; real "Opened" only if the client pages log a view one day); filter All · Needs you · n · Waiting · Not sent · Done; summary counts the same way; the details' no-link box has Create package ›.
- Names: `nameOf` = Builder record name (by review code) > rename > data file > Sheet > code, through `displayName`. `loadSent` now uses the shared `loadBuilderRecords()` (same allow-listed reads); `D.recs` holds all records.
- Shared What's new card on first visit of v1.9.0. Cache `lfmp-ui.css?v=2.2.0`, `admin.css` / `admin.js?v=1.9.0`, `review-logic.mjs?v=1.9.0`. No client page changed.

## v1.8.0 Admin motion: LIVE 18 Nov 2026 (`f987e05`; with Builder v1.15.0 `b51e558`, KPI v1.24.0)

- Shared shell (`admin/lfmp-session.js` + `admin/lfmp-ui.css`, byte-identical in the 3 repos; full notes in the Builder HANDOFF v1.15.0): the list shows the LFMP loading mark + "Loading reviews…" (summary empty) → fades in; after 20 s (timer in `load()`, a late answer is ignored) or a load error → the v2 error card with "Try again" (`data-act="reload"`). Details slide in/out (0.50 s / 0.40 s) with the dim; ✕, Esc, ‹ Reviews, click on the dim. `closeDetails` starts `panelClose` after `dpCode` is cleared (with reduced motion `done()` runs at once; the other order left the panel unhidden).
- No client page changed (index.html, plan.html, messages.html, plans/, data/ untouched). Live 18 Nov (deploy run 44149546862): `lfmp-ui.css?v=2.1.0`, `admin.css` / `admin.js?v=1.8.0` served; slide, dim, Esc close checked signed in, no console errors. Tests: `admin/tests/e2e.mjs` 61 (reduced motion; the version check now reads `admin.js` VERSION), shell test 16.

## v1.7.0 Redesign v2 admin: LIVE 17 Nov 2026 (`45e80af` + `1484712` phone "All submissions ›" row)

- **Live:** Pushed + team site deployed 17 Nov 2026 ~10:07 PM Manila (deploy run 44099661971, success). Live check on lfmp-admin.pages.dev, signed in, real data: Clients (2 test records), Scorecards (4 firms · all synced 10:07 PM) + bell top block (Sync every 30 min · last · next, Token keeper OK), Reviews (7 clients · 2 need you · All submissions ›); no sideways scroll, no console errors; the one-time "Update available" bar after the deploy cleared after one Refresh. Screenshots: `assets/images/2026-11-18_redesign-v2/live/`. Phone layout not seen live (Chrome window couldn't be resized and the site refuses framing); proven locally on real data with the same files (`…/real/`). **Follow-up LIVE 17 Nov (deploy run 44108208698):** avatar showed "P" live because the Google name is just "PJ"; shared `initials()` now keeps a one-word all-caps name of 2–3 letters ("PJ" → "PJ"); same file in all 3 repos (Builder `3e93748`, KPI `f6c0fb0`, Review `91b722c`). Live: "PJ" in Clients, Scorecards and Reviews (`live/2026-11-18_live-avatar-pj.jpg`).

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
