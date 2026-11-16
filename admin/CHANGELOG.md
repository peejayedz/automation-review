# Automation Review admin: changelog

The team's admin page (`admin/` only). The client pages (index.html, plan.html, messages.html, plans/, data/) have no changelog here and are never changed by admin work.

## v1.5.0 — 17 Nov 2026
- **Sign out** is a visible button next to your name in the top bar (phone: in ⋯). It ends the Google sign-in for all three tools (Cloudflare Access logout) and lands on `/signin/`: "You've been signed out. See you next shift." Edit wording's Sign out does the same.
- **Last signed in <day date, time>** under your name (your previous Google sign-in; recorded on the team site's server only, 90 days).
- ⋯ → **Team sign-ins** (Refresh · Team sign-ins · Sign out): name, email, last sign-in, sign-ins in 30 days.
- Shared `lfmp-session.js` / `lfmp-ui.css` updated (byte-identical with the Builder and the KPI admin).

## v1.4.0 — 16 Nov 2026 (live 17 Nov)
- **Google sign-in only (no admin password, no review key in the browser):** `lfmp-login.js`, `lfmp-login.css` and `lfmp-lock.json` are removed. The shared `lfmp-session.js` (a byte-identical copy of the Builder's `page/lfmp-session.js`) replaces them. The page asks the team site's server who is signed in (`/api/me`). The top bar shows the Google name, and ⋯ has **Refresh · Sign out** (Cloudflare Access logout). "Add / Change review admin key" and Lock are gone.
- **Admin actions go through the server:** `admin_ping/all/status/delete/edit` go to `/api/review` with the same fields as before, minus `key`. The server adds `REVIEW_ADMIN_KEY` and sets `name` to the signed-in person's first name.
- **Client list:** `data/` and `plans/` are read through `/api/gh` (server allow-list rule A1, GitHub token on the server), so the old "GitHub is limiting requests" error is gone.
- Old browser leftovers are wiped on every load: the vault, `ar_admin_key`, the lock markers and the old session.
- **New team page: Edit wording** (`admin/edit.html` + `edit.js` + `edit.css`). It is the classic review page with its edit controls on, so every editing feature of the old public `&admin` mode is kept:
  - name, summary and summary boxes, and a new review round (version)
  - step title, timing, description and note; text and email copy; questions
  - rename client, status + reply, delete, clear all responses on an automation
  - the all-clients Submissions view and the client picker

  The client's own buttons are not on this page: Looks good, Request a change, Edit the wording, overview corrections, question answers and Approve automation. Only clients respond and approve, on their own review page. The team page shows the client's answers and the approval status, and its code can't send a client response.
  
  Data comes from the public site, and saves go through `/api/review`. A client with a custom page isn't redirected here. On the public site the address shows the Moved page, as for the rest of `admin/`.
- **Links:**
  - Details ⋯ Edit wording → `edit.html?c=`.
  - Submissions "Open their review" → the plain client link (Link A, else `?c=`) in a new tab.
  - Row ⋯ "Open in Edit wording" → `edit.html?c=&a=`.
  - "For the team: Classic dashboard ↗" → `?c=<code>&classic` (client view).
- **Public `index.html` (client page): admin mode removed.**
  - Removed: the header "🔒 Admin login" button, the admin bar with Team sign-in (password), the footer "Team sign-in" link, `ar_admin_key`, every `admin_*` call, the ✎ edit buttons and forms, status forms, delete/clear, the Submissions view, the client picker, and the admin-only CSS.
  - `&admin` and `?view=submissions` are ignored, and the custom-page redirect now skips only for `&classic`.
  - Client view checked unchanged: 76 views (every client, a 2nd automation, demo mode, `&admin`, `?view=submissions`; 1440/390, light/dark) have the same DOM before and after, apart from the three removed admin entry points.
- Tests:
  - `admin/tests/e2e.mjs` runs against the real team-site server (`api.mjs`) with a Cloudflare Access stand-in: 43 checks.
  - `logic.test.mjs` reads `subStatusKey` from `edit.js` and checks that the client rules match between `index.html` and `edit.js` (6/6).

## v1.3.0 — 16 Nov 2026
- **Team site only:** the admin runs only at https://lfmp-admin.pages.dev/automation-review/admin/ (Google sign-in). On the public site (`dashboard.lawfirmmarketingpros.com`, `peejayedz.github.io`) a first script in `index.html` sends the address to `moved.html` before anything else loads: the shared "Moved" screen with "Open LFMP tools →". `moved.html` is a byte-identical copy of the Builder's `admin-site/moved.html` and is not copied to the team site. The client pages (index.html, plan.html, messages.html, plans/, data/) are unchanged.
- `lfmp-login.js` (shared): Forgot password names lfmp-admin.pages.dev.

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
