/**
 * LFMP Automation Review: response + content storage (v2)
 *
 * "Responses" tab: every client response (looks good / change request / new wording / answer / approval).
 *   Team columns: status (Open -> In progress -> Done) and lfmp_reply, shown to the client on the page.
 * "Content" tab: admin edits made on the page (automation name, summary, version, SMS/email copy).
 *   The page applies these on top of the data file, newest edit wins.
 *
 * Admin key: set it in Project Settings > Script properties as ADMIN_KEY. Never put it in this file,
 * because this file is also published in the public GitHub repo.
 */

// ---- Settings ----------------------------------------------------------
// Client codes allowed to save. Must match the file name in data/<code>.json.
const ALLOWED_CLIENTS = ['boca-dental-e770de'];
// You can also add client codes without editing this file: Project Settings > Script properties >
// CLIENTS = comma-separated codes, e.g. "boca-dental-e770de, palm-beach-plastic-surgery-4b9c21".
// Who gets an email for each new client response. Leave '' to turn emails off.
const NOTIFY_EMAIL = '';
// Link used in the notification email.
const REVIEW_BASE_URL = 'https://peejayedz.github.io/automation-review/';
// -----------------------------------------------------------------------

const SHEET_NAME = 'Responses';
const HEADERS = ['id', 'timestamp', 'client', 'automation', 'version', 'step', 'step_title', 'action',
                 'type', 'details', 'new_copy', 'name', 'email', 'status', 'lfmp_reply'];
const CONTENT_SHEET = 'Content';
const CONTENT_HEADERS = ['timestamp', 'client', 'automation', 'field', 'value', 'edited_by'];
const ACTIONS = ['approve', 'change', 'copy', 'answer', 'approve_all'];
const STATUSES = ['Open', 'In progress', 'Done'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  if (!PropertiesService.getScriptProperties().getProperty('FORMATTED')) {
    // One-time: keep the version column as text (so "1.0" stays "1.0") and add the status dropdown.
    sh.getRange(2, HEADERS.indexOf('version') + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
    sh.getRange(2, HEADERS.indexOf('status') + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
    PropertiesService.getScriptProperties().setProperty('FORMATTED', '1');
  }
  return sh;
}

function contentSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONTENT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CONTENT_SHEET);
    sh.appendRow(CONTENT_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, CONTENT_HEADERS.length).setFontWeight('bold');
    sh.getRange(2, 1, sh.getMaxRows() - 1, CONTENT_HEADERS.length).setNumberFormat('@');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clip_(v, n) { return String(v == null ? '' : v).slice(0, n); }
function safe_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function toObj_(headers, r) {
  const o = {};
  headers.forEach((h, i) => { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
  return o;
}
function clients_() {
  const extra = (PropertiesService.getScriptProperties().getProperty('CLIENTS') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return ALLOWED_CLIENTS.concat(extra.filter(k => ALLOWED_CLIENTS.indexOf(k) === -1));
}
function isAdmin_(key) {
  const k = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return !!k && String(key || '') === k;
}

/** GET ?client=<code>  -> responses + content edits for that client */
function doGet(e) {
  const client = (e.parameter.client || '').trim();
  if (clients_().indexOf(client) === -1) return json_({ ok: false, error: 'Unknown client' });
  const rows = sheet_().getDataRange().getValues().slice(1)
    .filter(r => r[2] === client).map(r => toObj_(HEADERS, r));
  const content = contentSheet_().getDataRange().getValues().slice(1)
    .filter(r => r[1] === client).map(r => toObj_(CONTENT_HEADERS, r));
  return json_({ ok: true, rows: rows, content: content, serverTime: new Date().toISOString() });
}

/** POST (JSON body as text/plain) */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  if (clients_().indexOf(d.client) === -1) return json_({ ok: false, error: 'Unknown client' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // ---- Admin actions ----
    if (d.action === 'admin_ping') {
      // A correct password also returns the client list for the client switcher.
      return isAdmin_(d.key) ? json_({ ok: true, clients: clients_() }) : json_({ ok: false });
    }
    if (d.action === 'admin_edit') {
      if (!isAdmin_(d.key)) return json_({ ok: false, error: 'Not authorized' });
      const row = {
        timestamp: new Date().toISOString(), client: d.client,
        automation: clip_(d.automation, 80), field: clip_(d.field, 120),
        value: clip_(d.value, 8000), edited_by: clip_(d.name || 'Admin', 120)
      };
      contentSheet_().appendRow(CONTENT_HEADERS.map(h => safe_(row[h])));
      return json_({ ok: true, content: row });
    }
    if (d.action === 'admin_delete') {
      // Permanently removes responses (for clearing test data). Only rows for this client are touched.
      if (!isAdmin_(d.key)) return json_({ ok: false, error: 'Not authorized' });
      const ids = (d.ids || []).map(String);
      const sh = sheet_();
      const vals = sh.getDataRange().getValues();
      let deleted = 0;
      for (let i = vals.length - 1; i >= 1; i--) {
        if (vals[i][2] === d.client && ids.indexOf(String(vals[i][0])) !== -1) { sh.deleteRow(i + 1); deleted++; }
      }
      return json_({ ok: true, deleted: deleted });
    }
    if (d.action === 'admin_status') {
      if (!isAdmin_(d.key)) return json_({ ok: false, error: 'Not authorized' });
      const sh = sheet_();
      const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
      const i = ids.indexOf(d.id);
      if (i === -1) return json_({ ok: false, error: 'Response not found' });
      const rowNum = i + 2;
      if (d.status && STATUSES.indexOf(d.status) !== -1) sh.getRange(rowNum, HEADERS.indexOf('status') + 1).setValue(d.status);
      if (d.lfmp_reply != null) sh.getRange(rowNum, HEADERS.indexOf('lfmp_reply') + 1).setValue(safe_(clip_(d.lfmp_reply, 2000)));
      const updated = toObj_(HEADERS, sh.getRange(rowNum, 1, 1, HEADERS.length).getValues()[0]);
      return json_({ ok: true, row: updated });
    }

    // ---- Client responses ----
    if (ACTIONS.indexOf(d.action) === -1) return json_({ ok: false, error: 'Unknown action' });
    if (!String(d.name || '').trim()) return json_({ ok: false, error: 'Name required' });
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
    sheet_().appendRow(HEADERS.map(h => safe_(row[h])));
    notify_(row);
    return json_({ ok: true, row: row });
  } finally {
    lock.releaseLock();
  }
}

function notify_(row) {
  if (!NOTIFY_EMAIL || row.action === 'approve') return;
  const label = {
    change: 'requested a change', copy: 'sent new wording',
    answer: 'answered a question', approve_all: 'APPROVED the automation'
  }[row.action];
  const link = REVIEW_BASE_URL + '?c=' + encodeURIComponent(row.client) + '&a=' + encodeURIComponent(row.automation);
  const body = [
    row.name + ' ' + label + '.', ' ',
    'Client: ' + row.client,
    'Automation: ' + row.automation + ' (v' + row.version + ')',
    'Step: ' + row.step_title,
    row.type ? 'Type: ' + row.type : '',
    row.details ? 'Details: ' + row.details : '',
    row.new_copy ? 'New wording:\n' + row.new_copy : '', ' ',
    'Review page: ' + link,
    'Responses sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].filter(Boolean).join('\n');
  MailApp.sendEmail(NOTIFY_EMAIL, '[Automation Review] ' + row.name + ' ' + label + ' · ' + row.automation, body);
}
