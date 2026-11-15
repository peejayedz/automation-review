// Automation Review admin (v1.0.0): the team's home for review packages, behind the one LFMP login.
// The client pages (index.html, plan.html, messages.html) are NOT changed and never load this file or the vault.
// While you're signed in, this page puts the review admin key where index.html already looks for it
// (localStorage "ar_admin_key", the same place its own sign-in uses), so admin mode and Submissions turn on by
// themselves. Every lock (Lock in any tool, 30 minutes idle, another tab) removes it again (lfmp-login.js).
import { createLogin } from './lfmp-login.js';

const CFG = window.REVIEW_CONFIG || {};
const SAVE_URL = String(CFG.saveUrl || '').trim();
const AR_KEY = 'ar_admin_key';
const { OWNER, REPO } = (() => {
  if (location.hostname.endsWith('.github.io')) return { OWNER: location.hostname.split('.')[0], REPO: location.pathname.split('/')[1] || 'automation-review' };
  return { OWNER: 'peejayedz', REPO: 'automation-review' };
})();
const LIST_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data?ref=main`;
const BASE = '../';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
function show(view) { for (const v of ['setupView', 'keyView', 'appView']) $(v).hidden = v !== view; }
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }

// ---------- theme: Auto · Light · Dark (same control and saved key "lfmp-theme" as the other tools) ----------
const THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
function applyTheme(mode) {
  if (!THEMES.some(t => t[0] === mode)) mode = 'auto';
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', mode);
  store.set('lfmp-theme', mode === 'auto' ? null : mode);
  $('themeSeg').innerHTML = THEMES.map(([k, l], i) => `${i ? '<span class="sep" aria-hidden="true">·</span>' : ''}<button type="button" data-theme-set="${k}" aria-pressed="${k === mode}" title="${k === 'auto' ? 'Follow this device\'s setting' : `Always ${l.toLowerCase()}`}">${l}</button>`).join('');
}
applyTheme(store.get('lfmp-theme') || 'auto');

// ---------- menus ----------
function closeMenus() { for (const m of document.querySelectorAll('.menu:not([hidden])')) { m.hidden = true; document.querySelector(`[data-menu="${m.id}"]`)?.setAttribute('aria-expanded', 'false'); } }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

// ---------- backend (the same Apps Script the review pages use) ----------
async function post(obj) {
  let last;
  for (let i = 0; i < 2; i++) {      // retry once: the first call after the script sits idle can fail
    try { const r = await fetch(SAVE_URL, { method: 'POST', body: JSON.stringify(obj) }); return await r.json(); } catch (e) { last = e; }
  }
  throw new Error(`Couldn't reach the review backend (${last?.message || 'network error'}).`);
}
// Client codes = the data files in the public repo (data/<code>.json).
async function listCodes() {
  const r = await fetch(LIST_URL, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(r.status === 403 ? 'GitHub is limiting requests from this network for a few minutes. Try Refresh shortly.' : `Couldn't list review clients from GitHub (HTTP ${r.status}).`);
  return (await r.json()).map(f => f.name).filter(n => /^[a-z0-9-]+\.json$/.test(n)).map(n => n.slice(0, -5));
}
async function checkKey(key, codes) {
  const j = await post({ action: 'admin_ping', key, client: codes[0] });
  return j && j.ok ? j : null;
}

// ---------- state ----------
let login = null, adminKey = null, codes = [], loadSeq = 0;
const ST = { REQ: 'changes requested', PROG: 'in progress', UPD: 'updated', OK: 'approved' };
const isReq = r => r && (r.action === 'change' || r.action === 'copy');
const stOf = r => { const s = String(r.status || '').trim().toLowerCase(); if (!s || s === 'open') return 'REQ'; if (s === 'in progress') return 'PROG'; if (s === 'done' || s.startsWith('updated')) return 'UPD'; if (s === 'approved') return 'OK'; return 'REQ'; };
const sameV = (a, b) => String(a ?? '').trim() === String(b ?? '').trim();
const isTest = name => /^zz\b|\btest\b/i.test(name || '');

// ---------- sign-in ----------
async function unlocked({ vault }) {
  closeMenus();
  if (!SAVE_URL) { show('setupView'); $('setupMsg').textContent = 'The review pages have no backend set (config.js saveUrl is empty), so there is nothing to administer here.'; return; }
  if (!vault.reviewKey) return askKey();
  adminKey = vault.reviewKey;
  store.set(AR_KEY, adminKey);
  show('appView');
  await load();
}
function askKey(why, { change = false } = {}) {
  if (!change) { adminKey = null; store.set(AR_KEY, null); }
  $('keyCancel').hidden = !change;
  show('keyView'); $('keyErr').textContent = why || ''; $('keyIn').value = ''; $('keyIn').type = 'password'; $('keyEye').textContent = 'Show';
  $('keyIn').focus();
}
function locked() {
  adminKey = null; closeMenus(); $('screen').innerHTML = ''; show(null);
}
$('keyEye').addEventListener('click', () => { const i = $('keyIn'), shown = i.type === 'text'; i.type = shown ? 'password' : 'text'; $('keyEye').textContent = shown ? 'Show' : 'Hide'; $('keyEye').setAttribute('aria-label', `${shown ? 'Show' : 'Hide'} key`); i.focus(); });
$('keyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const k = $('keyIn').value.trim(); if (!k) { $('keyErr').textContent = 'Paste the review admin key.'; return; }
  $('keyGo').disabled = true; $('keyGo').textContent = 'Checking…'; $('keyErr').textContent = '';
  try {
    if (!codes.length) codes = await listCodes();
    if (!codes.length) throw new Error('No review clients found to check the key against.');
    if (!(await checkKey(k, codes))) { $('keyErr').textContent = "That key didn't work. Check it's the ADMIN_KEY from the Apps Script's Script properties."; return; }
    await login.vaultSet({ reviewKey: k }); $('keyIn').value = '';
    adminKey = k; store.set(AR_KEY, k);
    show('appView'); toast('Review admin key saved'); await load();
  } catch (err) { $('keyErr').textContent = err.message; }
  finally { $('keyGo').disabled = false; $('keyGo').textContent = 'Check and save'; }
});

// ---------- load + draw ----------
async function load() {
  const seq = ++loadSeq;
  $('screen').innerHTML = `${heroHtml(null)}<div class="loading">Loading review clients…</div>`;
  try {
    codes = await listCodes();
    if (!codes.length) throw new Error('No review clients found in the repo.');
    const ping = await checkKey(adminKey, codes);
    if (seq !== loadSeq) return;
    if (!ping) { await login.vaultSet({ reviewKey: null }); return askKey('The saved review admin key no longer works (it was changed in Apps Script). Paste the new one.'); }
    const [all, files] = await Promise.all([
      post({ action: 'admin_all', key: adminKey, client: codes[0] }),
      Promise.all(codes.map(c => fetch(`${BASE}data/${encodeURIComponent(c)}.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null))),
    ]);
    if (seq !== loadSeq) return;
    if (!all?.ok) throw new Error(all?.error || "The backend didn't return the submissions.");
    const names = { ...(ping.names || {}), ...(all.clients || {}) };
    const registered = new Set(ping.clients || []);
    const rows = all.rows || [];
    const clients = codes.map((code, i) => summarize(code, files[i], rows.filter(r => r.client === code), names[code], registered.has(code)));
    clients.sort((a, b) => (a.test - b.test) || (b.open - a.open) || a.name.localeCompare(b.name));
    draw(clients);
    $('loadedAt').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (err) {
    if (seq !== loadSeq) return;
    $('screen').innerHTML = `${heroHtml(null)}<div class="errbox">${esc(err.message)} <button class="lnk" type="button" data-act="reload">Try again</button></div>`;
  }
}
function summarize(code, data, rows, sheetName, registered) {
  const autos = data?.automations || [];
  const name = data?.client?.name || sheetName || code;
  const reqs = rows.filter(isReq);
  const open = reqs.filter(r => ['REQ', 'PROG'].includes(stOf(r))).length;
  const ready = reqs.filter(r => stOf(r) === 'UPD').length;
  const approved = autos.filter(a => rows.some(r => r.action === 'approve_all' && r.automation === a.id && sameV(r.version, a.version))).length;
  const last = rows.reduce((m, r) => Math.max(m, Date.parse(r.timestamp) || 0), 0);
  const versions = [...new Set(autos.map(a => String(a.version || '1.0')))];
  return { code, name, autos, open, ready, approved, last, versions, registered, test: isTest(name) ? 1 : 0 };
}
const heroHtml = c => `<section class="hero"><div><p class="ey">LFMP · Review</p><h1 class="disp">Automation <span class="g">reviews.</span></h1></div>
  ${c && c.length ? `<a class="btn p" href="${esc(`${BASE}?c=${encodeURIComponent(c[0].code)}&view=submissions&admin`)}">All submissions →</a>` : ''}</section>`;
function statusHtml(c) {
  if (c.open) return `<span class="st warn"><i aria-hidden="true">!</i>${c.open} open request${c.open === 1 ? '' : 's'}</span>`;
  if (c.autos.length && c.approved === c.autos.length) return `<span class="st ok"><i aria-hidden="true">✓</i>All approved</span>`;
  if (c.ready) return `<span class="st wait"><i aria-hidden="true">↻</i>${c.ready} updated, with the client</span>`;
  if (!c.registered) return `<span class="st none"><i aria-hidden="true">–</i>Not connected to the Sheet</span>`;
  return `<span class="st none"><i aria-hidden="true">·</i>With the client${c.last ? ` <small>· last reply ${esc(ago(c.last))}</small>` : ''}</span>`;
}
function ago(t) { const m = Math.round((Date.now() - t) / 60e3); if (m < 60) return `${Math.max(1, m)} min ago`; const h = Math.round(m / 60); if (h < 48) return `${h} h ago`; return `${Math.round(h / 24)} days ago`; }
function draw(clients) {
  const open = clients.reduce((n, c) => n + c.open, 0), done = clients.filter(c => c.autos.length && c.approved === c.autos.length).length;
  $('screen').innerHTML = `${heroHtml(clients)}
    <div class="strip"><span>${clients.length} client${clients.length === 1 ? '' : 's'}</span><span>${open} open request${open === 1 ? '' : 's'}</span><span>${done} fully approved</span></div>
    <div class="list" role="table" aria-label="Review clients">
      <div class="lhead" role="row"><span role="columnheader">Client</span><span role="columnheader">Automations</span><span role="columnheader">Status</span><span role="columnheader"><span class="sr">Open</span></span></div>
      ${clients.map(c => `<div class="row" role="row" data-code="${esc(c.code)}">
        <div class="nm" role="cell" title="${esc(c.name)}">${esc(c.name)}<small>${c.test ? 'Test client · ' : ''}${esc(c.code)}</small></div>
        <div class="au" role="cell">${c.autos.length} automation${c.autos.length === 1 ? '' : 's'}<small>${c.versions.length ? `Round ${esc(c.versions.join(' / '))}` : 'No data file'} · ${c.approved} approved</small></div>
        <div class="stc" role="cell">${statusHtml(c)}</div>
        <div class="acts" role="cell"><a class="btn sm" href="${esc(`${BASE}?c=${encodeURIComponent(c.code)}&admin`)}" aria-label="Open ${esc(c.name)}'s review">Details →</a></div>
      </div>`).join('')}
    </div>
    <p class="note">Details opens the client's review page with admin mode on (edit copy, set request status, reply). Use the browser's Back button to come back here.</p>`;
}

// ---------- clicks ----------
document.addEventListener('click', e => {
  const m = e.target.closest('[data-menu]');
  if (m) { const menu = $(m.dataset.menu); const open = menu.hidden; closeMenus(); menu.hidden = !open; m.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button')?.focus(); return; }
  if (!e.target.closest('.menu')) closeMenus();
  const t = e.target.closest('[data-theme-set]'); if (t) { applyTheme(t.dataset.themeSet); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  closeMenus();
  if (a.dataset.act === 'lock') login.lock('');
  else if (a.dataset.act === 'reload') load();
  else if (a.dataset.act === 'changekey') askKey('Paste the new review admin key. The saved one stays until the new one is checked.', { change: true });
  else if (a.dataset.act === 'keycancel') { show('appView'); }
});

// ---------- start ----------
login = createLogin({ tool: 'review', onUnlock: unlocked, onLock: locked });
const mode = await login.start();
if (mode === 'legacy') show('setupView');
else if (mode === 'error') { show('setupView'); $('setupMsg').textContent = login.error; }
