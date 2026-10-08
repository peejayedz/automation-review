/**
 * LFMP Automation Review: response + content storage (v6)
 *
 * Screenshots: clients can attach up to 3 images to a change request. They're saved to Google Drive in
 * "Automation Review Attachments/<client tab>" (viewable by anyone with the link) and linked in the attachments column.
 *
 * "To-do" tab: rebuilt automatically from every client tab. Lists what still needs doing (open change
 * requests and new wording), the client's answers to questions, and what was finished in the last 14 days.
 *
 * One tab per client (named in CLIENT_TABS below): every response from that client
 * (looks good / change request / new wording / answer / approval).
 *   Team columns: status (Open -> In progress -> Done) and lfmp_reply, shown to the client on the page.
 * "Content" tab: admin edits made on the page (automation name, summary, version, SMS/email copy).
 *   The page applies these on top of the data file, newest edit wins.
 *
 * Admin key: set it in Project Settings > Script properties as ADMIN_KEY. Never put it in this file,
 * because this file is also published in the public GitHub repo.
 */

// ---- Settings ----------------------------------------------------------
// Client codes allowed to save. Must match the file name in data/<code>.json.
const ALLOWED_CLIENTS = ['boca-dental-e770de', 'palm-beach-plastic-n9umxi', 'sralla-family-law-rbi2yj', 'hedayati-law-m90omb', 'dumas-sanclemente-mo5cay'];
// The Sheet tab each client's responses go to. A client not listed here gets a tab named after its code.
const CLIENT_TABS = {
  'boca-dental-e770de': 'Boca Dental',
  'palm-beach-plastic-n9umxi': 'Palm Beach Plastic',
  'sralla-family-law-rbi2yj': 'Sralla Family Law',
  'hedayati-law-m90omb': 'Hedayati Law Group',
  'dumas-sanclemente-mo5cay': 'Dumas & Sanclemente'
};
// Slack alerts: put a Slack incoming-webhook URL in Project Settings > Script properties as SLACK_WEBHOOK_URL.
// Every new client response is then posted there. Leave it unset to turn Slack alerts off.
// Add a new client WITHOUT editing this file or redeploying: Project Settings > Script properties >
// CLIENTS = comma-separated entries, each "code=Tab name", e.g. "acme-law-x1y2z3=Acme Law, other-firm-a1b2c3=Other Firm".
// Who gets an email for each new client response. Leave '' to turn emails off.
const NOTIFY_EMAIL = '';
// Link used in the notification email.
const REVIEW_BASE_URL = 'https://peejayedz.github.io/automation-review/';
// -----------------------------------------------------------------------

const LEGACY_SHEET = 'Responses'; // the old single tab. Its rows all belonged to Boca Dental.
const HEADERS = ['id', 'timestamp', 'client', 'automation', 'version', 'step', 'step_title', 'action',
                 'type', 'details', 'new_copy', 'name', 'email', 'status', 'lfmp_reply', 'attachments'];
const CONTENT_SHEET = 'Content';
const CONTENT_HEADERS = ['timestamp', 'client', 'automation', 'field', 'value', 'edited_by'];
const ACTIONS = ['approve', 'change', 'copy', 'answer', 'approve_all'];
const STATUSES = ['Open', 'In progress', 'Done'];

function extraClients_() {
  // Script property CLIENTS: "code=Tab name, code2=Tab name 2" (the "=Tab name" part is optional).
  return (PropertiesService.getScriptProperties().getProperty('CLIENTS') || '')
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(s => { const i = s.indexOf('='); return i === -1 ? { code: s, tab: '' } : { code: s.slice(0, i).trim(), tab: s.slice(i + 1).trim() }; });
}
function tabName_(client) {
  if (CLIENT_TABS[client]) return CLIENT_TABS[client];
  const x = extraClients_().find(e => e.code === client);
  return (x && x.tab) || client;
}

/** The response tab for one client. Created (and formatted) the first time it's needed. */
function sheet_(client) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = tabName_(client);
  let sh = ss.getSheetByName(name);
  if (!sh && client === 'boca-dental-e770de') {
    // One-time move: the old "Responses" tab only ever held Boca Dental, so it becomes their tab.
    const old = ss.getSheetByName(LEGACY_SHEET);
    if (old) { old.setName(name); sh = old; }
  }
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  if (sh.getLastColumn() < HEADERS.length) {
    // Older tabs: add any new header columns (e.g. attachments) without touching existing rows.
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }
  const props = PropertiesService.getScriptProperties();
  const flag = 'FORMATTED_' + name;
  if (!props.getProperty(flag)) {
    // One-time per tab: keep the version column as text (so "1.0" stays "1.0") and add the status dropdown.
    sh.getRange(2, HEADERS.indexOf('version') + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
    sh.getRange(2, HEADERS.indexOf('status') + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
    props.setProperty(flag, '1');
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
  const extra = extraClients_().map(e => e.code);
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
  const rows = sheet_(client).getDataRange().getValues().slice(1)
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
      const sh = sheet_(d.client);
      const vals = sh.getDataRange().getValues();
      let deleted = 0;
      const aCol = HEADERS.indexOf('attachments');
      for (let i = vals.length - 1; i >= 1; i--) {
        if (vals[i][2] === d.client && ids.indexOf(String(vals[i][0])) !== -1) {
          trashAttachments_(vals[i][aCol]);
          sh.deleteRow(i + 1); deleted++;
        }
      }
      try { buildTodo(); } catch (err) {}
      return json_({ ok: true, deleted: deleted });
    }
    if (d.action === 'admin_status') {
      if (!isAdmin_(d.key)) return json_({ ok: false, error: 'Not authorized' });
      const sh = sheet_(d.client);
      const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => r[0]);
      const i = ids.indexOf(d.id);
      if (i === -1) return json_({ ok: false, error: 'Response not found' });
      const rowNum = i + 2;
      if (d.status && STATUSES.indexOf(d.status) !== -1) sh.getRange(rowNum, HEADERS.indexOf('status') + 1).setValue(d.status);
      if (d.lfmp_reply != null) sh.getRange(rowNum, HEADERS.indexOf('lfmp_reply') + 1).setValue(safe_(clip_(d.lfmp_reply, 2000)));
      const updated = toObj_(HEADERS, sh.getRange(rowNum, 1, 1, HEADERS.length).getValues()[0]);
      try { buildTodo(); } catch (err) {}
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
      lfmp_reply: '',
      attachments: ''
    };
    if ((d.action === 'change' || d.action === 'copy') && Array.isArray(d.attachments) && d.attachments.length) {
      row.attachments = saveAttachments_(d.client, row.id, d.attachments).join('\n');
    }
    sheet_(d.client).appendRow(HEADERS.map(h => safe_(row[h])));
    try { buildTodo(); } catch (err) { console.warn('To-do rebuild failed: ' + err); }
    try { notify_(row); } catch (err) { console.warn('Email alert failed: ' + err); }
    try { slack_(row); } catch (err) { console.warn('Slack alert failed: ' + err); }
    return json_({ ok: true, row: row });
  } finally {
    lock.releaseLock();
  }
}

// ---- To-do summary tab --------------------------------------------------
const TODO_SHEET = 'To-do';

/** Adds a menu to the Sheet so the To-do tab can be refreshed by hand. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Automation Review')
    .addItem('Refresh To-do list', 'buildTodo')
    .addToUi();
}

/** Keeps the To-do tab current when a status or reply is changed directly in a client tab. */
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() === TODO_SHEET || sh.getName() === CONTENT_SHEET) return;
    const col = e.range.getColumn();
    if (col === HEADERS.indexOf('status') + 1 || col === HEADERS.indexOf('lfmp_reply') + 1) buildTodo();
  } catch (err) {}
}

/** Rebuilds the To-do tab from every client tab. */
function buildTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const all = [];
  clients_().forEach(code => {
    const sh = ss.getSheetByName(tabName_(code));
    if (!sh || sh.getLastRow() < 2) return;
    sh.getDataRange().getValues().slice(1).forEach(r => { const o = toObj_(HEADERS, r); o._tab = tabName_(code); all.push(o); });
  });
  const when = ts => { const d = new Date(ts); return isNaN(d) ? '' : Utilities.formatDate(d, 'America/New_York', 'MMM d, h:mm a') + ' ET'; };
  const link = r => REVIEW_BASE_URL + '?c=' + encodeURIComponent(r.client) + '&a=' + encodeURIComponent(r.automation);
  const what = r => [r.details, r.new_copy ? 'NEW WORDING:\n' + r.new_copy : '', r.attachments ? 'SCREENSHOTS:\n' + r.attachments : ''].filter(String).join('\n\n');
  const byTime = (a, b) => String(a.timestamp).localeCompare(String(b.timestamp));

  const isReq = r => r.action === 'change' || r.action === 'copy';
  // A request is replaced when the client later marked that same step "Looks good".
  const replaced = r => all.some(x => x.client === r.client && x.automation === r.automation && x.step === r.step &&
                                      x.action === 'approve' && String(x.timestamp) > String(r.timestamp));
  const open = all.filter(r => isReq(r) && r.status !== 'Done' && !replaced(r)).sort(byTime);
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString();
  const done = all.filter(r => isReq(r) && r.status === 'Done' && String(r.timestamp) >= cutoff).sort(byTime).reverse();
  // Latest answer per question.
  const ansMap = {};
  all.filter(r => r.action === 'answer').sort(byTime).forEach(r => { ansMap[r.client + '|' + r.automation + '|' + r.step] = r; });
  const answers = Object.keys(ansMap).map(k => ansMap[k]);
  const approvals = all.filter(r => r.action === 'approve_all').sort(byTime).reverse();

  let sh = ss.getSheetByName(TODO_SHEET);
  if (!sh) { sh = ss.insertSheet(TODO_SHEET, 0); }
  sh.clear(); sh.clearConditionalFormatRules();
  const COLS = ['Status', 'Client', 'Automation', 'Step', 'Request', 'Details / new wording', 'Requested by', 'When', 'Version', 'LFMP reply', 'Review page'];
  const rows = [];
  const fmts = []; // [rowIndex, kind]
  const section = (title) => { rows.push([title].concat(Array(COLS.length - 1).fill(''))); fmts.push([rows.length, 'section']); };
  rows.push(['Automation Review · To-do', '', '', '', '', 'Updated ' + when(new Date().toISOString()) + '. Change statuses on the review page or in the client tab.', '', '', '', '', '']);
  fmts.push([1, 'title']);
  rows.push(COLS); fmts.push([2, 'header']);
  section('TO DO · ' + open.length + ' open request' + (open.length === 1 ? '' : 's'));
  if (!open.length) rows.push(['Nothing open 🎉'].concat(Array(COLS.length - 1).fill('')));
  open.forEach(r => rows.push([r.status || 'Open', r._tab, r.automation, r.step_title || r.step, r.type || (r.action === 'copy' ? 'New wording' : 'Change'),
    what(r), r.name + (r.email ? ' <' + r.email + '>' : ''), when(r.timestamp), 'v' + r.version, r.lfmp_reply, link(r)]));
  section('CLIENT ANSWERS TO QUESTIONS · ' + answers.length);
  answers.forEach(r => rows.push(['Answered', r._tab, r.automation, r.step_title, 'Answer', r.details, r.name, when(r.timestamp), 'v' + r.version, r.lfmp_reply, link(r)]));
  section('APPROVED AUTOMATIONS · ' + approvals.length);
  approvals.forEach(r => rows.push(['Approved', r._tab, r.automation, r.step_title, 'Approved', r.details, r.name, when(r.timestamp), 'v' + r.version, '', link(r)]));
  section('DONE IN THE LAST 14 DAYS · ' + done.length);
  done.forEach(r => rows.push(['Done', r._tab, r.automation, r.step_title || r.step, r.type || 'Change', what(r), r.name, when(r.timestamp), 'v' + r.version, r.lfmp_reply, link(r)]));

  sh.getRange(1, 1, rows.length, COLS.length).setValues(rows.map(r => r.map(v => safe_(v == null ? '' : v))));
  sh.setFrozenRows(2);
  sh.getRange(1, 1, rows.length, COLS.length).setVerticalAlignment('top').setWrap(true).setFontSize(10);
  [110, 140, 130, 220, 150, 420, 160, 120, 70, 220, 120].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  fmts.forEach(([r, kind]) => {
    const rg = sh.getRange(r, 1, 1, COLS.length);
    if (kind === 'title') rg.setFontWeight('bold').setFontSize(13).setBackground('#EFEAF8');
    if (kind === 'header') rg.setFontWeight('bold').setBackground('#16202B').setFontColor('#FFFFFF');
    if (kind === 'section') rg.setFontWeight('bold').setBackground('#DCE2E9');
  });
  const statusCol = sh.getRange(3, 1, Math.max(rows.length - 2, 1), 1);
  const rule = (text, bg, fg) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([statusCol]).build();
  sh.setConditionalFormatRules([rule('Open', '#E8F0FE', '#1A4FA0'), rule('In progress', '#FDF1DC', '#9A5B00'),
    rule('Done', '#E3F4EC', '#13795B'), rule('Approved', '#E3F4EC', '#13795B'), rule('Answered', '#F5F7FA', '#5B6775')]);
  return open.length;
}

// ---- Screenshot attachments -----------------------------------------------
function attachFolder_(client) {
  const rootName = 'Automation Review Attachments';
  const roots = DriveApp.getFoldersByName(rootName);
  const root = roots.hasNext() ? roots.next() : DriveApp.createFolder(rootName);
  const name = tabName_(client);
  const subs = root.getFoldersByName(name);
  return subs.hasNext() ? subs.next() : root.createFolder(name);
}
/** Saves up to 3 images (base64) to Drive and returns their view links. */
function saveAttachments_(client, id, list) {
  const folder = attachFolder_(client);
  const urls = [];
  list.slice(0, 3).forEach((a, i) => {
    try {
      const type = /^image\/(png|jpeg|gif|webp)$/.test(a.type) ? a.type : 'image/jpeg';
      const data = String(a.data || '');
      if (!data || data.length > 8e6) return; // about 6 MB max per image
      const blob = Utilities.newBlob(Utilities.base64Decode(data), type, clip_(id + '-' + (i + 1) + '-' + (a.name || 'screenshot'), 120));
      const f = folder.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push('https://drive.google.com/file/d/' + f.getId() + '/view');
    } catch (err) { console.warn('Attachment failed: ' + err); }
  });
  return urls;
}
function trashAttachments_(cell) {
  String(cell || '').split(/\s+/).forEach(u => {
    const m = u.match(/\/d\/([\w-]+)/);
    if (m) { try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (err) {} }
  });
}

const LABELS = {
  approve: 'marked a step as looks good', change: 'requested a change', copy: 'sent new wording',
  answer: 'answered a question', approve_all: 'APPROVED the automation'
};
function reviewLink_(row) {
  return REVIEW_BASE_URL + '?c=' + encodeURIComponent(row.client) + '&a=' + encodeURIComponent(row.automation);
}

/** Posts a new response to Slack (incoming webhook in the SLACK_WEBHOOK_URL script property). */
function slack_(row) {
  const url = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  if (!url) return;
  const icon = { approve: ':white_check_mark:', change: ':pencil2:', copy: ':memo:', answer: ':speech_balloon:', approve_all: ':tada:' }[row.action] || ':bell:';
  const lines = [
    icon + ' *' + row.name + '* ' + LABELS[row.action] + ' · *' + tabName_(row.client) + '*',
    '*Automation:* ' + row.automation + ' (v' + row.version + ')',
    row.step_title ? '*Step:* ' + row.step_title : '',
    row.type ? '*Type:* ' + row.type : '',
    row.details ? '*Details:* ' + clip_(row.details, 600) : '',
    row.new_copy ? '*New wording:*\n>' + clip_(row.new_copy, 1500).replace(/\n/g, '\n>') : '',
    row.attachments ? ':paperclip: ' + String(row.attachments).split('\n').map((u, i) => '<' + u + '|Screenshot ' + (i + 1) + '>').join(' · ') : '',
    '<' + reviewLink_(row) + '|Open the review page> · <' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '|Open the Sheet>'
  ].filter(Boolean);
  UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ text: lines.join('\n') })
  });
}

/** One-off test: run this from the Apps Script editor to check the Slack alert works. */
function testSlack() {
  slack_({ client: 'boca-dental-e770de', automation: 'new-patient', version: '1.0', step_title: 'Test alert',
           action: 'change', type: 'Test', details: 'If you can read this, Slack alerts are working.', new_copy: '', name: 'LFMP test' });
}

function notify_(row) {
  if (!NOTIFY_EMAIL || row.action === 'approve') return;
  const label = LABELS[row.action];
  const link = reviewLink_(row);
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
