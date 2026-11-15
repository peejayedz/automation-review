# Automation Review admin: handoff

The repo README covers the client pages, the Apps Script and the Sheet. This file covers the team's admin page in `admin/`.

## State (15 Nov 2026)

| Area | State |
|---|---|
| Admin page v1.0.0 | Live (commit c5efbc8), behind the one LFMP login. |
| Admin page v1.1.0 (redesign) | Built and tested, **not pushed yet** (waiting for PJ). |
| Client pages | Unchanged by admin work (index.html, plan.html, messages.html, plans/, data/, preview/, templates/, config.js, apps-script/). |

## How it fits together

- **Files:** `index.html` (shell), `admin.js` (screens, actions), `review-logic.mjs` (pure rules, the same as index.html's), `admin.css`, plus the shared one-login files (`lfmp-login.js/.css`, `lfmp-ui.css`, `fonts/`, `lfmp-lock.json`). The shared files are byte-identical with the Builder's `page/` and leadpro-kpi `admin/`.
- **Backend:** the same Apps Script URL as the client pages (`../config.js`). Admin actions: `admin_ping` (check key + client list), `admin_all` (every response + log + Sheet tab names), `admin_status`, `admin_delete`, `admin_edit`. Plus the public `GET ?client=` for renames (Content tab). **No Code.gs change.**
- **Key:** the review ADMIN_KEY sits in the one-login vault. While signed in it is also put in `localStorage.ar_admin_key`, where the classic page looks, so links into the classic page open in admin mode. Every lock removes it.
- **Client list:** the `data/*.json` files from the GitHub API (public, unauthenticated) plus any client that has responses.

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
| Edit names, summary, version, steps, copy | Details → ⋯ → Edit wording (classic page in edit mode, same tab) |
| Clear all responses on an automation | Details → ⋯ → Clear all responses… (every automation or one; type-to-confirm) |
| Client's review page (custom page) | Review page ↗ (home row and Details), using `customPage` when the client has one |
| Open this on the client's dashboard | Submissions → open a line → ⋯ → Open on the client's dashboard |
| History / timeline of a request | Submissions → open a line → ⋯ → History |
| Reload | Top ⋯ → Refresh |
| Sign out | Top ⋯ → Lock (locks all three tools) |

## Tests

- `node admin/tests/logic.test.mjs`: the request rules are compared with index.html's own functions, taken from the file.
- `CHROMIUM_PATH=… node admin/tests/e2e.mjs [screenshot folder]`: 23 browser checks against the real Code.gs in a mock. They cover home, Details, Submissions, every action, the admin_status payload (compared with the classic page's), Delete asking twice, Esc, 1440 and 390 in light and dark, AA contrast and no sideways scroll. Needs `../ghl-subaccount-builder` (playwright-core and `tests/mock/apps-script.mjs`).
- The cross-tool login test is in the builder repo: `tests/e2e/one-login.mjs`.

## Before pushing

- Ask PJ first; another session may be working in this repo.
- Commit `admin/` only. Check the client-file hash list: `git ls-files | grep -v ^admin/ | xargs shasum -a 256`, before and after.
