// Review admin rules = index.html's rules. The functions are taken from index.html itself (read only), so a later change
// to the client page that the admin doesn't follow fails here. Run: node admin/tests/logic.test.mjs  (Node 20+, no install)
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as L from '../review-logic.mjs';

// v1.4.0: the Submissions rule (subStatusKey) moved with the admin mode from index.html to admin/edit.js (Edit wording).
const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const editJs = await readFile(new URL('../edit.js', import.meta.url), 'utf8');
const grab = (re, what, text = html, file = 'index.html') => { const m = text.match(re); if (!m) throw new Error(`${file}: ${what} not found`); return m[0]; };
const src = [
  grab(/const ST = \{[^\n]*\};/, 'ST'),
  grab(/const isReq = [^\n]*;/, 'isReq'),
  grab(/function normStatus\(s\)\{[\s\S]*?\n\}/, 'normStatus'),
  grab(/const sameV = [^\n]*;/, 'sameV'),
  grab(/function isReplaced\(r, rs\)\{[\s\S]*?\n\}/, 'isReplaced'),
  grab(/function subStatusKey\(r, all\)\{[\s\S]*?\n\}/, 'subStatusKey', editJs, 'admin/edit.js'),
].join('\n') + '\nthis.X = { ST, isReq, normStatus, sameV, isReplaced, subStatusKey };';
// edit.js keeps the same client rules as index.html (it is the classic page with its edit controls)
for (const [re, what] of [[/const ST = \{[^\n]*\};/, 'ST'], [/const isReq = [^\n]*;/, 'isReq'], [/function normStatus\(s\)\{[\s\S]*?\n\}/, 'normStatus'], [/const sameV = [^\n]*;/, 'sameV'], [/function isReplaced\(r, rs\)\{[\s\S]*?\n\}/, 'isReplaced']]) {
  if (grab(re, what) !== grab(re, what, editJs, 'admin/edit.js')) throw new Error(`${what} differs between index.html and admin/edit.js`);
}
const ctx = {}; vm.runInNewContext(src, ctx); const I = ctx.X;

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log(`✓ ${name}`); } catch (e) { fail++; console.log(`✗ ${name}\n    ${e.message}`); } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

const T = d => `2026-10-${String(d).padStart(2, '0')}T12:00:00Z`;
const rows = [
  { id: 'a', client: 'c1', automation: 'x', version: '1.0', step: 's1', action: 'change', status: 'Changes Requested', timestamp: T(1) },
  { id: 'b', client: 'c1', automation: 'x', version: 1, step: 's2', action: 'copy', status: 'In progress', timestamp: T(2) },
  { id: 'c', client: 'c1', automation: 'x', version: '1.0', step: 's3', action: 'change', status: 'Done', timestamp: T(3) },
  { id: 'd', client: 'c1', automation: 'x', version: '1.0', step: 's4', action: 'change', status: 'Approved', timestamp: T(4) },
  { id: 'e', client: 'c1', automation: 'x', version: '1.0', step: 's5', action: 'change', status: '', timestamp: T(5) },
  { id: 'f', client: 'c1', automation: 'x', version: '1.0', step: 's5', action: 'approve', timestamp: T(6) },                // replaces e
  { id: 'g', client: 'c2', automation: 'y', version: '2.0', step: 's1', action: 'change', status: 'Open', timestamp: T(7) },
  { id: 'h', client: 'c2', automation: 'y', version: '2.0', step: 's1', action: 'approve', timestamp: T(6) },                // earlier: doesn't replace g
  { id: 'i', client: 'c2', automation: 'y', version: '2.0', action: 'approve_all', timestamp: T(8) },
  { id: 'j', client: 'c2', automation: 'y', version: '2.0', step: 'q1', action: 'answer', details: 'Yes', timestamp: T(8) },
  { id: 'k', client: 'c2', automation: 'y', version: '2.0', step: 's2', action: 'undo', timestamp: T(9) },
  { id: 'l', client: 'c2', automation: 'y', version: '2.0', step: 's3', action: 'change', status: 'Updated — Ready for Review', timestamp: T(9) },
  { id: 'm', client: 'c2', automation: 'y', version: '1.0', step: 's1', action: 'change', status: 'Changes Requested', timestamp: T(1) }, // other version
];

t('ST, normStatus, sameV, isReq are the same as index.html', () => {
  eq(L.ST, I.ST);
  for (const s of ['', 'Open', 'in progress', 'DONE', 'Approved', 'Updated — Ready for Review', 'Updated', 'weird', null]) eq(L.normStatus(s), I.normStatus(s), `normStatus(${s})`);
  for (const [a, b] of [['1.0', 1], ['1.0', '1'], ['1.1', '1.10'], ['2', '1.0'], ['', 0]]) eq(L.sameV(a, b), I.sameV(a, b), `sameV(${a},${b})`);
  for (const r of rows) eq(L.isReq(r), I.isReq(r), `isReq ${r.id}`);
});
t('statusKey = index.html subStatusKey for every kind of row (incl. a later Looks good replacing a request)', () => {
  const norm = rows.map(r => (I.isReq(r) ? { ...r, status: I.normStatus(r.status) || I.ST.REQ } : r));   // admin_all / normRows do this
  for (const r of norm) eq(L.statusKey(r, norm), I.subStatusKey(r, norm), `row ${r.id}`);
  eq(norm.map(r => L.statusKey(r, norm)).join(','), 'req,prog,upd,ok,ok,approve,req,approve,approve_all,answer,undo,upd,req');
});
t('home status rule: any Changes requested / In progress → Needs you; else any Updated → Waiting; no responses at all → Not started; else OK', () => {
  const norm = rows.map(r => (L.isReq(r) ? { ...r, status: L.normStatus(r.status) || L.ST.REQ } : r));
  const c1 = L.summarize('c1', { automations: [{ id: 'x', version: '1.0' }] }, norm);
  eq([c1.state, c1.open, c1.waiting, c1.approved], ['need', 2, 1, 0]);
  const c2 = L.summarize('c2', { automations: [{ id: 'y', version: '2.0' }, { id: 'z', version: '1.0' }] }, norm);
  eq([c2.state, c2.open, c2.waiting, c2.approved, c2.autos], ['need', 2, 1, 1, 2]);
  const w = L.summarize('c2', null, norm.filter(r => r.id === 'l')); eq(w.state, 'wait');
  // c3 answered a question and clicked Looks good: nothing open or waiting → OK
  eq(L.summarize('c3', null, [...norm, { client: 'c3', action: 'answer', step: 'q1', timestamp: '2026-11-01T00:00:00Z' }, { client: 'c3', action: 'approve', step: 's1', timestamp: '2026-11-01T00:01:00Z' }]).state, 'ok');
  // no rows at all (not even an answer or a Looks good) → Not started; a single answer → OK
  const none = L.summarize('nobody', { automations: [{ id: 'x', version: '1.0' }] }, norm);
  eq([none.state, none.open, none.waiting, none.approved, none.last], ['new', 0, 0, 0, 0]);
  eq(L.summarize('a1', null, [{ client: 'a1', action: 'answer', timestamp: '2026-11-01T00:00:00Z' }]).state, 'ok');
  // home order: Needs you, Waiting, Not started, OK
  eq(['ok', 'new', 'need', 'wait'].sort((a, b) => L.STATE_ORDER[a] - L.STATE_ORDER[b]), ['need', 'wait', 'new', 'ok']);
});
t('Submissions filters: To answer = req+prog · Waiting = upd · Done = approved + automation approvals · Everything = all', () => {
  eq(['req', 'prog', 'upd', 'ok', 'approve_all', 'answer'].map(k => L.FILTERS.map(([f]) => +L.inFilter(k, f)).join('')).join(' '), '1001 1001 0101 0011 0011 0001');
  eq(L.TEAM_ST, [L.ST.REQ, L.ST.PROG, L.ST.UPD], 'Approved is never offered to the team');
});
t('test clients: ZZ… codes / names and names with "test"', () => {
  eq([L.isTestClient('zz-test-2-qpqhx7', 'ZZ TEST 2'), L.isTestClient('boca-dental-e770de', 'Boca Dental'), L.isTestClient('x', 'Acme Test Firm'), L.isTestClient('mahdavi-law-mc1mar', 'The Mahdavi Law Firm')], [true, false, true, false]);
});
t('wording matches the Edit wording page\'s Submissions (formerly index.html)', () => {
  eq(L.kindText({ action: 'approve', type: 'Everything else looks good' }), 'Marked looks good (Everything else looks good)');
  eq(L.kindText({ action: 'copy' }), 'Sent new wording'); eq(L.kindText({ action: 'change', type: 'Change timing' }), 'Change timing');
  eq(L.prettyClient('boca-dental-e770de'), 'Boca Dental');
});

console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
