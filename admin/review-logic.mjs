// Automation Review admin: pure rules (no DOM), unit-tested in admin/tests/logic.test.mjs.
// The request rules copy index.html's (normStatus, sameV, isReplaced, subStatusKey) so the admin and the client
// page always agree on what is open.

export const ST = { REQ: 'Changes Requested', PROG: 'In Progress', UPD: 'Updated — Ready for Review', OK: 'Approved' };
export const TEAM_ST = [ST.REQ, ST.PROG, ST.UPD];   // Approved is only ever set by the client
export const ST_LABEL = { [ST.REQ]: 'Changes requested', [ST.PROG]: 'In progress', [ST.UPD]: 'Updated — ready for client review' };

export const isReq = r => !!r && (r.action === 'change' || r.action === 'copy');
export function normStatus(s) {
  s = String(s == null ? '' : s).trim(); if (!s) return '';
  const k = s.toLowerCase(), L = { open: ST.REQ, 'in progress': ST.PROG, done: ST.UPD };
  if (L[k]) return L[k];
  const m = Object.values(ST).find(x => x.toLowerCase() === k); if (m) return m;
  return /^updated/i.test(s) ? ST.UPD : s;
}
// Google Sheets can turn "1.0" into the number 1.
export const sameV = (a, b) => String(a) === String(b) || (a !== '' && b !== '' && a != null && b != null && Number(a) === Number(b));
// A later "Looks good" on the same step replaces earlier requests.
export function isReplaced(r, rs) {
  const t = Date.parse(r.timestamp) || 0;
  return rs.some(x => x.step === r.step && x.action === 'approve' && (Date.parse(x.timestamp) || 0) > t);
}
// 'req' | 'prog' | 'upd' | 'ok' for requests; the action ('answer', 'approve', 'approve_all', 'undo') otherwise.
export function statusKey(r, all) {
  if (!isReq(r)) return r.action;
  const st = normStatus(r.status) || ST.REQ;
  if ((st === ST.REQ || st === ST.PROG) && isReplaced(r, all.filter(x => x.client === r.client && x.automation === r.automation && sameV(x.version, r.version)))) return 'ok';
  return st === ST.OK ? 'ok' : st === ST.UPD ? 'upd' : st === ST.PROG ? 'prog' : 'req';
}

// Submissions filters. Everything also has a small type filter.
export const FILTERS = [['answer', 'To answer'], ['waiting', 'Waiting for client'], ['done', 'Done'], ['everything', 'Everything']];
export const TYPES = [['all', 'All types'], ['requests', 'Change requests'], ['answer', 'Answers'], ['approve', 'Looks good clicks'], ['undo', 'Took back looks good'], ['approve_all', 'Automation approvals']];
export function inFilter(k, f) {
  if (f === 'answer') return k === 'req' || k === 'prog';
  if (f === 'waiting') return k === 'upd';
  if (f === 'done') return k === 'ok' || k === 'approve_all';
  return true;
}
export function inType(r, k, t) {
  if (t === 'all') return true;
  if (t === 'requests') return isReq(r);
  return r.action === t;
}

// One client on the home: 'need' (any open request), 'wait' (any updated, waiting on the client), 'new' (no responses at
// all: Not started) or 'ok'. Home order: need, wait, new, ok.
export const STATE_ORDER = { need: 0, wait: 1, new: 2, ok: 3 };
// versions (optional): the current version per automation after the team's "new version" edits (linkB(...).versions).
export function summarize(code, data, all, versions = {}) {
  const rows = all.filter(r => r.client === code);
  let open = 0, waiting = 0;
  for (const r of rows) { if (!isReq(r)) continue; const k = statusKey(r, all); if (k === 'req' || k === 'prog') open++; else if (k === 'upd') waiting++; }
  const autos = (data && data.automations) || [];
  const approved = autos.filter(a => rows.some(r => r.action === 'approve_all' && r.automation === a.id && sameV(r.version, versions[a.id] ?? a.version))).length;
  const last = rows.reduce((m, r) => Math.max(m, Date.parse(r.timestamp) || 0, Date.parse(r.updated_at) || 0), 0);
  return { code, open, waiting, approved, autos: autos.length, last, state: open ? 'need' : waiting ? 'wait' : rows.length ? 'ok' : 'new' };
}
export const isTestClient = (code, name) => /^zz[-\s]/i.test(code || '') || /^zz\b|\btest\b/i.test(name || '');

// What the client did, in words (same wording as index.html's Submissions).
export function kindText(r) {
  if (r.action === 'answer') return 'Answered a question';
  if (r.action === 'approve_all') return 'Approved the whole automation';
  if (r.action === 'approve') return r.type === 'Everything else looks good' ? 'Marked looks good (Everything else looks good)' : 'Marked looks good';
  if (r.action === 'undo') return 'Took back “looks good”';
  if (r.action === 'copy') return 'Sent new wording';
  return r.type || 'Requested a change';
}
// Short tag per line: request status, or the kind of response.
export function tagOf(r, k) {
  if (isReq(r)) return { req: ['Change', 'red'], prog: ['In progress', 'blue'], upd: ['Updated', 'tool'], ok: ['Approved', 'green'] }[k];
  return { answer: ['Answer', 'mut'], approve: ['Looks good', 'green'], approve_all: ['Approved', 'green'], undo: ['Took back', 'mut'] }[r.action] || [r.action || 'Response', 'mut'];
}
export const prettyClient = c => String(c || '').replace(/-(?=[a-z0-9]*\d)[a-z0-9]{6}$/i, '').split('-').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

// ---------- Edit tab (v1.6.0): the wording Link B (messages.html) shows ----------
// The same rules as messages.html's applyContent() and updated() (compared in admin/tests/logic.test.mjs). Content rows
// are the Sheet's Content tab (admin_edit). Newest edit wins; a "version" edit starts a new review round and, on Link B,
// drops that automation's earlier wording edits.
export function linkB(content, base) {
  const versions = {}, edits = {};
  ((base && base.automations) || []).forEach(a => { versions[a.id] = String(a.version || '1'); });
  (content || []).slice().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).forEach(c => {
    const f = String(c.field || ''), v = c.value == null ? '' : String(c.value);
    if (f === 'version') { versions[c.automation] = v; Object.keys(edits).forEach(k => { if (k.startsWith(c.automation + '.')) delete edits[k]; }); return; }
    const m = f.match(/^step:([^:]+):(sms|body|email\.subject|email\.body)$/); if (!m) return;
    const k = c.automation + '.' + m[1]; edits[k] = edits[k] || {}; edits[k][m[2]] = v;
  });
  return { versions, edits };
}
// The wording Link B shows for one message ({subject, text}), and whether it differs from the messages file.
export function shownWording(m, edits) {
  const e = edits[m.id] || {};
  let subject = m.subject, text = m.text;
  if (e['email.subject'] != null) subject = e['email.subject'];
  if (e['email.body'] != null) text = e['email.body'];
  if (e.sms != null) text = e.sms;
  if (e.body != null) { const x = e.body.match(/^Subject:\s*(.*)\n+([\s\S]*)$/); if (x) { subject = x[1]; text = x[2]; } else text = e.body; }
  return { subject, text, edited: !(subject === m.subject && text === m.text) };
}
export const isEmailMsg = m => m.subject != null || /email/i.test(String(m.kind || ''));
// The admin_edit fields to save so Link B shows {subject, text}. Link B reads the fields in a fixed order
// (email.subject, email.body, sms, then body last), so a change goes into the strongest field already in use for that
// message; otherwise email → email.subject / email.body, text → sms. [] when nothing changes.
export function editFieldsFor(m, edits, subject, text) {
  const e = edits[m.id] || {}, now = shownWording(m, edits), email = isEmailMsg(m);
  const step = m.id.slice(m.id.lastIndexOf('.') + 1), f = x => `step:${step}:${x}`;
  if (email ? subject === now.subject && text === now.text : text === now.text) return [];
  if (e.body != null) return [[f('body'), email || /^Subject:\s*(.*)\n+([\s\S]*)$/.test(e.body) ? `Subject: ${email ? subject : now.subject}\n\n${text}` : text]];
  if (e.sms != null) { const out = [[f('sms'), text]]; if (email && subject !== now.subject) out.unshift([f('email.subject'), subject]); return out; }
  if (!email) return [[f('sms'), text]];
  const out = [];
  if (subject !== now.subject) out.push([f('email.subject'), subject]);
  if (text !== now.text) out.push([f('email.body'), text]);
  return out;
}
// Same as the classic editor's "Start new review round": 1.0 → 1.1, 1.9 → 1.10, 2 → 2.1.
export function nextVersion(v) {
  const m = String(v || '1.0').match(/^(\d+)\.(\d+)$/);
  return m ? `${m[1]}.${Number(m[2]) + 1}` : (Number(v) ? (Number(v) + 0.1).toFixed(1) : `${String(v || '1')}.1`);
}
