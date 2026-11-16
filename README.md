# Automation Review pages

Client-facing pages where a client can see how an automation flows, read every text and email, and respond:

- **Looks good** on a step
- **Request a change** (timing, remove, add a step, notify someone, other)
- **Edit the wording** of a text or email
- **Answer questions** we raise
- **Approve** the whole automation

Every response is saved as a row in a Google Sheet that LFMP owns. The page reads those rows back, so the client (and the team) can see where each request stands. Clients don't need a login.

## Files

| File | What it is |
|---|---|
| `index.html` | The review page. Same file for every client. |
| `config.js` | Holds the Google Apps Script URL (`saveUrl`). Empty means demo mode, where responses save only in the viewer's browser. |
| `data/<client-code>.json` | One file per client: their automations, steps and message copy. |
| `apps-script/Code.gs` | The save/load backend. Paste it into Apps Script (see step 2). |

A client's link looks like this: `https://peejayedz.github.io/automation-review/?c=boca-dental-e770de`. Add `&a=new-patient` to open a specific automation.

## One-time setup: connect the Google Sheet (about 5 minutes)

1. Create a Google Sheet named **Automation Review Responses** in LFMP's Drive.
2. In the Sheet, go to **Extensions › Apps Script**. Delete the sample code and paste in everything from `apps-script/Code.gs`.
3. At the top of the script, set `NOTIFY_EMAIL` to the address that should get an email for each response, or leave it `''`. Check that `ALLOWED_CLIENTS` lists every client code.
4. Click **Deploy › New deployment**. Choose type **Web app**. Set *Execute as*: **Me**, and *Who has access*: **Anyone**. Click Deploy and authorize.
5. Copy the **Web app URL** (it ends in `/exec`) and paste it into `config.js` as `saveUrl`.
6. Open a review link and click **Looks good** on a step. A row should appear in the **Responses** tab.

After you change `Code.gs`, use **Deploy › Manage deployments › Edit › Version: New version**. That keeps the same URL.

## Working the responses (team)

The **Responses** tab is the change queue.

| Column | Who fills it | Shown to the client |
|---|---|---|
| `status` | Team: `Open` → `In progress` → `Done` | Yes, under their request |
| `lfmp_reply` | Team: short note, e.g. "Moved to Day 2 in v1.1" | Yes |
| everything else | Saved automatically | n/a |

Definition of done for one request:

1. Make the change in GHL. Update the workflow step itself, not just the snippet or template.
2. Update the client's `data/<client-code>.json` so the page shows the new copy or timing.
3. Set `status` to **Done** and add an `lfmp_reply`.
4. When all requests are done, bump the automation's `version` (e.g. `1.0` → `1.1`) in the JSON. The client then sees a fresh review round, and older responses stay in the step history, labeled v1.0.

An **approve_all** row is the client's sign-off. It records who approved, which version and when. Publish in GHL only after that row exists.

## Team editing (Review admin + Edit wording, team site only)

Since 16 Nov 2026 the public review page (`index.html`) has **no admin mode**: no `&admin`, no Team sign-in, no edit controls. `&admin` and `?view=submissions` are ignored and show the normal client view. The team works only on the team site, behind Google sign-in (`@lawfirmmarketingpros.com`):

- **Review admin:** `https://lfmp-admin.pages.dev/automation-review/admin/`. Shows every client, their submissions, status + reply, delete/clear, and rename client.
- **Edit wording:** Review admin → a client's Details → ⋯ → Edit wording (`admin/edit.html?c=<code>`). This is the classic page with its edit controls on. You can edit an automation's **name, summary and summary boxes**, **start a new review round** (version 1.0 → 1.1), edit **step title, timing, description and note**, edit the **copy of any text or email**, edit **questions**, set **status + reply**, delete a response, and **clear all responses** on an automation. It also has the all-clients Submissions view and the client picker.

Edits are saved to the **Content** tab of the Sheet and shown to everyone straight away. The data file in GitHub stays as the starting point, and the newest edit wins. The browser never holds the admin key. The team site's server (`/api/review`, in the ghl-subaccount-builder repo) adds it, along with the signed-in person's first name.

**`ADMIN_KEY`:** in Apps Script, open **Project Settings › Script properties** and set `ADMIN_KEY` to a long random value. Put the same value in the team site's Cloudflare secret `REVIEW_ADMIN_KEY`, then redeploy the Apps Script (Deploy › Manage deployments › Edit › Version: New version). Never put the key in `Code.gs`, because that file is public in the repo.

## Refresh

The **↻ Refresh** button at the top reloads the data file and everything in the Sheet without reloading the page. Use it after you change a status or reply directly in the Sheet. The time next to it shows when the page last loaded.

## What the client sees when something is approved

- A step marked **Looks good** gets a green check in the flow.
- When the automation is approved, a green **Approved by [name] on [date] · version** banner appears at the top. The automation's tab shows a check, and the step buttons lock.
- **Approve automation** stays disabled while any change request is still open (not Done).

## Adding a new client or automation

1. Copy `data/boca-dental-e770de.json` to `data/<client>-<6 random letters/numbers>.json`. The random part keeps links hard to guess.
2. Edit the automations. Each step has `day`, `when`, `gap` (text on the connector line), `type` (`start`, `sms`, `email`, `call`, `vm`, `team`, `end`), `who` (`patient` or `team`), `title` and `body`. Texts use `sms`, emails use `email.subject` and `email.body`, and `note` holds an LFMP flag. Write merge fields as `[First name]`.
3. Add the client code to `ALLOWED_CLIENTS` in Apps Script, then redeploy as a new version.
4. Send the client their link.

## Good to know

- The GitHub repo is public, so anyone who finds a data file can read that client's message copy. The random client code keeps links unlisted, but not secret. If that’s a concern, host the page somewhere private instead.
- Anyone with a client's link can submit responses as that client. That's normal for an unlisted review link. Every row includes the name the person typed.
