/**
 * LFMP Automation Review: response storage
 * Saves every client response (looks good / change request / new wording / answer / approval)
 * as a row in the "Responses" tab of the Google Sheet this script is attached to,
 * and returns them to the review page so statuses show on the page.
 *
 * Team workflow in the Sheet:
 *   - "status" column: Open -> In progress -> Done  (the page shows this to the client)
 *   - "lfmp_reply" column: a short note shown under the client's request on the page
 */

// ---- Settings ----------------------------------------------------------
// Client codes allowed to save. Must match the file name in data/<code>.json.
const ALLOWED_CLIENTS = ['boca-dental-e770de'];
// Who gets an email for each new response. Leave '' to turn emails off.
const NOTIFY_EMAIL = '';
// Link used in the notification email.
const REVIEW_BASE_URL = 'https://peejayedz.github.io/automation-review/';
// -----------------------------------------------------------------------

const SHEET_NAME = 'Responses';
const HEADERS = ['id', 'timestamp', 'client', 'automation', 'version', 'step', 'step_title', 'action',
                 'type', 'details', 'new_copy', 'name', 'email', 'status', 'lfmp_reply'];
const ACTIONS = ['approve', 'change', 'copy', 'answer', 'approve_all'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    const statusCol = HEADERS.indexOf('status') + 1;
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Open', 'In progress', 'Done'], true).build();
    sh.getRange(2, statusCol, 999, 1).setDataValidation(rule);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clip_(v, n) { return String(v == null ? '' : v).slice(0, n); }

function rowToObj_(r) {
  const o = {};
  HEADERS.forEach((h, i) => { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
  return o;
}

/** GET ?client=<code>  -> all responses for that client, oldest first */
function doGet(e) {
  const client = (e.parameter.client || '').trim();
  if (ALLOWED_CLIENTS.indexOf(client) === -1) return json_({ ok: false, error: 'Unknown client' });
  const values = sheet_().getDataRange().getValues();
  const rows = values.slice(1).filter(r => r[2] === client).map(rowToObj_);
  return json_({ ok: true, rows: rows });
}

/** POST (JSON body as text/plain) -> append one response */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  if (ALLOWED_CLIENTS.indexOf(d.client) === -1) return json_({ ok: false, error: 'Unknown client' });
  if (ACTIONS.indexOf(d.action) === -1) return json_({ ok: false, error: 'Unknown action' });
  if (!String(d.name || '').trim()) return json_({ ok: false, error: 'Name required' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const row = {
      id: Utilities.getUuid(),
      timestamp: new Date().toISOString(),
      client: d.client,
      automation: clip_(d.automation, 80),
      version: clip_(d.version, 20),
      step: clip_(d.step, 40),
      step_title: clip_(d.step_title, 200),
      action: d.action,
      type: clip_(d.type, 80),
      details: clip_(d.details, 3000),
      new_copy: clip_(d.new_copy, 5000),
      name: clip_(d.name, 120),
      email: clip_(d.email, 200),
      status: (d.action === 'change' || d.action === 'copy') ? 'Open' : '',
      lfmp_reply: ''
    };
    // Prefix "'" stops Sheets treating client text that starts with = + - @ as a formula.
    const safe = HEADERS.map(h => {
      const v = row[h];
      return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
    });
    sheet_().appendRow(safe);
    notify_(row);
    return json_({ ok: true, row: row });
  } finally {
    lock.releaseLock();
  }
}

function notify_(row) {
  if (!NOTIFY_EMAIL) return;
  const label = {
    approve: 'marked a step as looks good', change: 'requested a change', copy: 'sent new wording',
    answer: 'answered a question', approve_all: 'APPROVED the automation'
  }[row.action];
  if (row.action === 'approve') return; // skip noise; the sheet still records it
  const link = REVIEW_BASE_URL + '?c=' + encodeURIComponent(row.client) + '&a=' + encodeURIComponent(row.automation);
  const body = [
    row.name + ' ' + label + '.',
    '',
    'Client: ' + row.client,
    'Automation: ' + row.automation + ' (v' + row.version + ')',
    'Step: ' + row.step_title,
    row.type ? 'Type: ' + row.type : '',
    row.details ? 'Details: ' + row.details : '',
    row.new_copy ? 'New wording:\n' + row.new_copy : '',
    '',
    'Review page: ' + link,
    'Responses sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].filter(Boolean).join('\n');
  MailApp.sendEmail(NOTIFY_EMAIL, '[Automation Review] ' + row.name + ' ' + label + ' · ' + row.automation, body);
}
