// Review admin rules = the client pages' rules. The functions are taken from the files themselves (read only), so a later
// change to a client page that the admin doesn't follow fails here. Run: node admin/tests/logic.test.mjs  (Node 20+, no install)
// v1.6.0: the classic index.html is retired (a redirect / "moved" page), so the request rules come from messages.html
// (Link B, the page clients use) and the Submissions rule (isReplaced, subStatusKey) from admin/edit.js (classic editor,
// to be deleted ~15 Dec 2026: then keep those two as fixtures here). The Edit tab's wording rules come from messages.html.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as L from '../review-logic.mjs';

const html = await readFile(new URL('../../messages.html', import.meta.url), 'utf8');
const editJs = await readFile(new URL('../edit.js', import.meta.url), 'utf8');
const grab = (re, what, text = html, file = 'messages.html') => { const m = text.match(re); if (!m) throw new Error(`${file}: ${what} not found`); return m[0]; };
const src = [
  grab(/const ST = \{[^\n]*\};/, 'ST'),
  grab(/const isReq = [^\n]*;/, 'isReq'),
  grab(/function normStatus\(s\)\{[\s\S]*?return m \|\| [^\n]*\}/, 'normStatus'),
  grab(/const sameV = [^\n]*;/, 'sameV'),
  grab(/function isReplaced\(r, rs\)\{[\s\S]*?\n\}/, 'isReplaced', editJs, 'admin/edit.js'),
  grab(/function subStatusKey\(r, all\)\{[\s\S]*?\n\}/, 'subStatusKey', editJs, 'admin/edit.js'),
  'let versions = {}, edits = {}, editAt = {};',
  grab(/function applyContent\(content, base\)\{[\s\S]*?\n\}/, 'applyContent'),
  grab(/function updated\(m\)\{[\s\S]*?\n\}/, 'updated'),
].join('\n') + '\nthis.X = { ST, isReq, normStatus, sameV, isReplaced, subStatusKey, applyContent, updated, get versions(){ return versions; }, get edits(){ return edits; } };';
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

t('ST, normStatus, sameV, isReq are the same as messages.html (Link B)', () => {
  eq(L.ST, I.ST);
  for (const s of ['', 'Open', 'in progress', 'DONE', 'Approved', 'Updated — Ready for Review', 'Updated', 'weird', null]) eq(L.normStatus(s), I.normStatus(s), `normStatus(${s})`);
  for (const [a, b] of [['1.0', 1], ['1.0', '1'], ['1.1', '1.10'], ['2', '1.0'], ['', 0]]) eq(L.sameV(a, b), I.sameV(a, b), `sameV(${a},${b})`);
  for (const r of rows) eq(L.isReq(r), I.isReq(r), `isReq ${r.id}`);
});
t('statusKey = subStatusKey (admin/edit.js) for every kind of row (incl. a later Looks good replacing a request)', () => {
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

// ---------- Edit tab (v1.6.0): the wording Link B shows, from messages.html's own applyContent() / updated() ----------
const BASE = { automations: [{ id: 'nl', version: '1.0' }, { id: 'ns', version: 2 }] };
const MSGS = [
  { id: 'nl.s3', kind: 'Email', subject: 'Welcome', text: 'Hi [First name],\n\nThanks.' },
  { id: 'nl.s5', kind: 'Text', text: 'Hi [First name], call us.' },
  { id: 'ns.s2', kind: 'Email', subject: 'Missed you', text: 'Body' },
];
let seed = 7; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
const FIELDS = ['email.subject', 'email.body', 'sms', 'body', 'title', 'note'];
function randomContent(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = MSGS[rnd(3)], a = m.id.split('.')[0], s = m.id.split('.')[1], kind = rnd(9);
    if (kind === 0) out.push({ timestamp: T(10 + rnd(15)), automation: a, field: 'version', value: `1.${rnd(5)}` });
    else { const f = FIELDS[rnd(FIELDS.length)]; out.push({ timestamp: T(10 + rnd(15)), automation: a, field: `step:${s}:${f}`, value: f === 'body' && rnd(2) ? `Subject: S${i}\n\nB${i}` : `v${i}` }); }
  }
  if (rnd(3) === 0) out.push({ timestamp: T(26), automation: '', field: 'client:name', value: 'New name' });
  return out;
}
const iShown = m => { const u = I.updated(m); return u ? { subject: u.subject, text: u.text } : { subject: m.subject, text: m.text }; };
t('Link B wording = messages.html applyContent()/updated() for 300 random edit histories (versions, every field, body with Subject:)', () => {
  for (let k = 0; k < 300; k++) {
    const content = randomContent(1 + rnd(8));
    I.applyContent(content, BASE); const mine = L.linkB(content, BASE);
    eq(mine.versions, JSON.parse(JSON.stringify(I.versions)), `versions #${k}`);
    for (const m of MSGS) { const s = L.shownWording(m, mine.edits); eq({ subject: s.subject, text: s.text }, iShown(m), `${m.id} #${k}`); eq(s.edited, !!I.updated(m), `edited ${m.id} #${k}`); }
  }
});
t('Edit tab save: the fields it writes make Link B (messages.html) show exactly the new wording, whatever was edited before', () => {
  for (let k = 0; k < 300; k++) {
    const content = randomContent(rnd(8));
    const m = MSGS[rnd(3)], email = L.isEmailMsg(m);
    const want = { subject: email ? `New subject ${k}` : L.shownWording(m, L.linkB(content, BASE).edits).subject, text: `New text ${k}\n\nSecond paragraph` };   // a text has no subject box: it stays
    const fields = L.editFieldsFor(m, L.linkB(content, BASE).edits, want.subject, want.text);
    const after = [...content, ...fields.map(([field, value], i) => ({ timestamp: `2026-10-28T12:00:0${i}Z`, automation: m.id.split('.')[0], field, value }))];
    I.applyContent(after, BASE);
    eq(iShown(m), want, `${m.id} #${k} after ${JSON.stringify(fields)}`);
    for (const o of MSGS.filter(x => x !== m)) { I.applyContent(content, BASE); const before = iShown(o); I.applyContent(after, BASE); eq(iShown(o), before, `other message ${o.id} unchanged #${k}`); }
  }
  // no change → nothing written; email → email.subject / email.body; text → sms
  const none = L.linkB([], BASE).edits;
  eq(L.editFieldsFor(MSGS[0], none, 'Welcome', MSGS[0].text), []);
  eq(L.editFieldsFor(MSGS[0], none, 'Hello', MSGS[0].text), [['step:s3:email.subject', 'Hello']]);
  eq(L.editFieldsFor(MSGS[1], none, undefined, 'Hi'), [['step:s5:sms', 'Hi']]);
});
t('new version = the classic editor\'s nextVersion(); Automations approved follows the current version', () => {
  const cx = {}; vm.runInNewContext(grab(/function nextVersion\(v\)\{[\s\S]*?\n\}/, 'nextVersion', editJs, 'admin/edit.js') + '\nthis.f = nextVersion;', cx);
  for (const v of ['1.0', '1.9', '2', 2, '', 'x', '3.10']) eq(L.nextVersion(v), cx.f(v), `nextVersion(${v})`);
  const rowsV = [{ client: 'c', automation: 'nl', version: '1.0', action: 'approve_all', timestamp: T(1) }];
  eq(L.summarize('c', BASE, rowsV).approved, 1);
  eq(L.summarize('c', BASE, rowsV, { nl: '1.1', ns: '2' }).approved, 0, 'approval of the old version no longer counts');
});

t('v1.9.0 honest statuses: no client link → Not sent (never Waiting); Needs you and Done stay; filters and order', () => {
  eq(L.homeState('new', false), 'unsent'); eq(L.homeState('wait', false), 'unsent');
  eq(L.homeState('new', true), 'new'); eq(L.homeState('wait', true), 'wait');
  eq(L.homeState('need', false), 'need', 'an open request still needs you'); eq(L.homeState('ok', false), 'ok');
  eq(L.HOME_FILTERS, ['all', 'need', 'wait', 'unsent', 'done']);
  const states = ['need', 'wait', 'new', 'unsent', 'ok'];
  eq(states.filter(s => L.inHome('wait', s)), ['wait', 'new'], 'Waiting = waiting on the client, link sent or not opened yet');
  eq(states.filter(s => L.inHome('unsent', s)), ['unsent']); eq(states.filter(s => L.inHome('need', s)), ['need']);
  eq(states.filter(s => L.inHome('done', s)), ['ok']); eq(states.filter(s => L.inHome('all', s)), states);
  eq([...states].sort((a, b) => L.STATE_ORDER[a] - L.STATE_ORDER[b]), states, 'order: need, wait, new, unsent, ok');
  eq(L.firstAnswerAt('c', [{ client: 'c', timestamp: T(5) }, { client: 'd', timestamp: T(1) }, { client: 'c', timestamp: T(3) }]), new Date(T(3)).toISOString(), 'opened by = first answer');
  eq(L.firstAnswerAt('x', []), '');
});

t('v1.10.0 A–Z: the home list is A–Z by the shown name in every filter and in search ("The " ignored, case-insensitive)', () => {
  const cs = [
    { c: 'zz-test-2-qpqhx7', name: 'ZZ TEST 2', s: { state: 'new' } },
    { c: 'mahdavi-law-mc1mar', name: 'The Mahdavi Law Firm', s: { state: 'need' } },
    { c: 'boca-dental-e770de', name: 'boca Dental', s: { state: 'unsent' } },
    { c: 'emery-law-x1', name: 'Emery Law Office', s: { state: 'ok' } },
    { c: 'hedayati-x2', name: 'Hedayati Law Group, P.C.', s: { state: 'wait' } },
    { c: 'acme-x3', name: 'Acme Law', s: { state: 'need' } },
    { c: 'sralla-x4', name: 'Sralla Family Law, PLLC', s: { state: 'unsent' } },
    { c: 'mccarthy-x5', name: 'McCarthy & Akers, PLC', s: { state: 'ok' } },
  ];
  const names = (f, q) => L.homeList(cs, f, q).map(x => x.name);
  eq(names('all'), ['Acme Law', 'boca Dental', 'Emery Law Office', 'Hedayati Law Group, P.C.', 'The Mahdavi Law Firm', 'McCarthy & Akers, PLC', 'Sralla Family Law, PLLC', 'ZZ TEST 2'], 'All: A–Z, Mahdavi under M, "boca" lower case under B');
  eq(names('need'), ['Acme Law', 'The Mahdavi Law Firm'], 'Needs you: A–Z (was most open requests first)');
  eq(names('wait'), ['Hedayati Law Group, P.C.', 'ZZ TEST 2']);
  eq(names('unsent'), ['boca Dental', 'Sralla Family Law, PLLC']);
  eq(names('done'), ['Emery Law Office', 'McCarthy & Akers, PLC']);
  eq(names('all', 'LAW'), ['Acme Law', 'Emery Law Office', 'Hedayati Law Group, P.C.', 'The Mahdavi Law Firm', 'Sralla Family Law, PLLC'], 'search results A–Z too');
  eq(names('need', 'm'), ['Acme Law', 'The Mahdavi Law Firm'], 'filter + search: A–Z ("m" in acme-x3 / Mahdavi)');
  eq(names('bogus'), names('all'), 'an unknown filter = All');
  eq(names('all', 'nobody'), []);
});

const adminJs = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
const newsJson = await readFile(new URL('../whats-new.json', import.meta.url), 'utf8');
t('v1.10.0 What\'s new: a card only for minor releases; a patch never pops its own card', () => {
  eq([L.isMinor('1.10.0'), L.isMinor('1.9.1'), L.isMinor('1.10.10'), L.isMinor('')], [true, false, false, false]);
  eq([L.cardVersion('1.10.0'), L.cardVersion('1.10.2'), L.cardVersion('x')], ['1.10.0', '1.10.0', null], 'a patch shows its minor release\'s card (if unseen), never its own');
  const js = adminJs;
  const toast = js.match(/async function showNewsToast\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  if (!/L\.cardVersion\(VERSION\)/.test(toast) || !/L\.isMinor\(target\)/.test(toast) || !/x\.version === target/.test(toast)) throw new Error('showNewsToast must pick the card by cardVersion(VERSION) and isMinor');
  const VERSION = js.match(/VERSION = '([\d.]+)'/)[1];
  const news = JSON.parse(newsJson);
  if (!news.versions.find(v => v.version === L.cardVersion(VERSION))?.title) throw new Error(`whats-new.json has no card for ${L.cardVersion(VERSION)}`);
});

console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
