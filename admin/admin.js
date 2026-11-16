// Automation Review admin v1.3.0: Review home · Details panel · Submissions, behind the one LFMP login.
// The client pages (index.html, plan.html, messages.html, plans/, data/) are NOT changed and never load this file.
// Backend: the same Apps Script and the same admin actions the review page uses (admin_ping, admin_all, admin_status,
// admin_delete, admin_edit), with the same fields. No Code.gs change. The admin key comes from the one-login vault.
// While signed in, the key is also put where index.html looks for it (localStorage "ar_admin_key"), so "Edit wording" and
// "Open their review" open the classic page in admin mode; every lock removes it (lfmp-login.js).
import { createLogin } from './lfmp-login.js';
import * as L from './review-logic.mjs?v=1.3.0';   // versioned: admin.js needs this release's rules

const CFG = window.REVIEW_CONFIG || {};
const SAVE_URL = String(CFG.saveUrl || '').trim();
const AR_KEY = 'ar_admin_key', TESTS_KEY = 'ar-admin-tests';
const { OWNER, REPO } = (() => {
  if (location.hostname.endsWith('.github.io')) return { OWNER: location.hostname.split('.')[0], REPO: location.pathname.split('/')[1] || 'automation-review' };
  return { OWNER: 'peejayedz', REPO: 'automation-review' };
})();
const LIST_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data?ref=main`;
const PLANS_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/plans?ref=main`;   // hand-made plans/<code>.html pages
// v1.2.0: on the team-only admin site (lfmp-admin.pages.dev, behind Google sign-in) the client pages and data/ aren't
// there, so data is read from, and every client link (A/B, ?c=, plans/) points at, the public site. Elsewhere: next door.
const PUBLIC_BASE = 'https://dashboard.lawfirmmarketingpros.com/automation-review/';
const BASE = /(^|\.)lfmp-admin\.pages\.dev$/.test(location.hostname) ? PUBLIC_BASE : '../';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
// Who is answering: the name the review page remembers on this device (as index.html does), else "LFMP team".
const who = fallback => { try { return JSON.parse(store.get('ar_reviewer') || '{}').name || fallback; } catch { return fallback; } };
function show(view) { for (const v of ['setupView', 'keyView', 'appView']) $(v).hidden = v !== view; }
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }
const fmtDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }); };
const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET`; };
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const EXT = '<span aria-hidden="true">↗</span>';

// ---------- theme ----------
const THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];
function applyTheme(mode) {
  if (!THEMES.some(t => t[0] === mode)) mode = 'auto';
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', mode);
  store.set('lfmp-theme', mode === 'auto' ? null : mode);
  $('themeSeg').innerHTML = THEMES.map(([k, l], i) => `${i ? '<span class="sep" aria-hidden="true">·</span>' : ''}<button type="button" data-theme-set="${k}" aria-pressed="${k === mode}" title="${k === 'auto' ? 'Follow this device\'s setting' : `Always ${l.toLowerCase()}`}">${l}</button>`).join('');
}
applyTheme(store.get('lfmp-theme') || 'auto');
function closeMenus() { for (const m of document.querySelectorAll('.menu:not([hidden])')) { m.hidden = true; document.querySelector(`[data-menu="${m.id}"]`)?.setAttribute('aria-expanded', 'false'); } }

// ---------- backend ----------
async function post(obj) {
  let last;
  for (let i = 0; i < 2; i++) {     // retry once: the first call after the script sits idle can fail
    try { const r = await fetch(SAVE_URL, { method: 'POST', body: JSON.stringify(obj) }); return await r.json(); } catch (e) { last = e; }
  }
  throw new Error(`Couldn't reach the review backend (${last?.message || 'network error'}).`);
}
async function listData() {
  const gh = { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } };
  // plans/ is optional (most clients have none): any failure there just means "no plans/ page"
  const [r, plans] = await Promise.all([fetch(LIST_URL, gh), fetch(PLANS_URL, gh).then(x => (x.ok ? x.json() : [])).catch(() => [])]);
  if (!r.ok) throw new Error(r.status === 403 ? 'GitHub is limiting requests from this network for a few minutes. Try Refresh shortly.' : `Couldn't list review clients from GitHub (HTTP ${r.status}).`);
  const names = (await r.json()).map(f => f.name);
  const codes = names.filter(n => /^[a-z0-9-]+\.json$/.test(n)).map(n => n.slice(0, -5));
  const plansPage = new Set((Array.isArray(plans) ? plans : []).map(f => f.name).filter(n => /^[a-z0-9-]+\.html$/.test(n)).map(n => n.slice(0, -5)));
  return { codes, plansPage, plan: new Set(names.filter(n => n.endsWith('.plan.json')).map(n => n.slice(0, -10))), messages: new Set(names.filter(n => n.endsWith('.messages.json')).map(n => n.slice(0, -14))) };
}
const checkKey = async (key, code) => { const j = await post({ action: 'admin_ping', key, client: code }); return j && j.ok ? j : null; };

// ---------- state ----------
let login = null, adminKey = null, loadSeq = 0, busy = false;
const D = { codes: [], plan: new Set(), messages: new Set(), plansPage: new Set(), files: {},names: {}, renames: {}, rows: [], log: [], loaded: false, error: '' };
const F = { home: 'all', q: '', tests: store.get(TESTS_KEY) === '1', status: 'answer', client: 'all', sq: '', type: 'all', open: null, more: new Set(), armed: null, rowMenu: null, history: null };
// Same name the client page shows: a rename (Content tab, newest wins) > the data file's name > the Sheet tab name.
const nameOf = c => D.renames[c] || D.files[c]?.client?.name || D.names[c] || L.prettyClient(c);
const autoName = (c, a) => { const x = D.files[c]?.automations?.find(y => y.id === a); return x ? x.name : a === 'setup-questions' ? 'Setup questions' : (a || ''); };
const isTest = c => L.isTestClient(c, nameOf(c));
const clientsAll = () => [...new Set([...D.codes, ...D.rows.map(r => r.client)])].filter(Boolean);
const visibleClients = () => clientsAll().filter(c => F.tests || !isTest(c));
const sumOf = c => L.summarize(c, D.files[c], D.rows);
const reviewUrl = c => (D.files[c]?.customPage ? `${D.files[c].customPage}?c=${encodeURIComponent(c)}` : `${BASE}?c=${encodeURIComponent(c)}`);
const classicUrl = (c, a) => `${BASE}?c=${encodeURIComponent(c)}${a ? `&a=${encodeURIComponent(a)}` : ''}&admin`;
// Client links, as on the Builder's Review card: A = plan + review (default; the hand-made plans/<code>.html page when the
// client has one, else plan.html?c=), B = messages only (re-reviews). Clients without these pages have the classic ?c= link.
const linkA = c => (D.plansPage.has(c) ? `${BASE}plans/${encodeURIComponent(c)}.html` : D.plan.has(c) ? `${BASE}plan.html?c=${encodeURIComponent(c)}` : null);
const linkB = c => (D.messages.has(c) ? `${BASE}messages.html?c=${encodeURIComponent(c)}` : null);
const homeLink = c => linkA(c) || reviewUrl(c);
const absUrl = rel => new URL(rel, location.href).href;

// ---------- routing: #/ home · #/client/<code> Details · #/subs[/<code>] Submissions ----------
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch { return ''; } });
  if (p[0] === 'subs') return { screen: 'subs', client: p[1] || null };
  if (p[0] === 'client' && p[1]) return { screen: 'home', details: p[1] };
  return { screen: 'home' };
}
const go = h => { if (location.hash !== h) location.hash = h; else draw(); };
addEventListener('hashchange', () => draw());

// ---------- sign-in ----------
async function unlocked({ vault }) {
  closeMenus();
  if (!SAVE_URL) { show('setupView'); $('setupMsg').textContent = 'The review pages have no backend set (config.js saveUrl is empty), so there is nothing to administer here.'; return; }
  if (!vault.reviewKey) return askKey();
  adminKey = vault.reviewKey; store.set(AR_KEY, adminKey);
  show('appView'); await load();
}
function askKey(why, { change = false } = {}) {
  if (!change) { adminKey = null; store.set(AR_KEY, null); }
  $('keyCancel').hidden = !change;
  show('keyView'); $('keyErr').textContent = why || ''; $('keyIn').value = ''; $('keyIn').type = 'password'; $('keyEye').textContent = 'Show';
  $('keyIn').focus();
}
function locked() { adminKey = null; closeMenus(); closeDetails(true); closeDialog(); $('screen').innerHTML = ''; D.loaded = false; D.rows = []; D.log = []; show(null); }
$('keyEye').addEventListener('click', () => { const i = $('keyIn'), shown = i.type === 'text'; i.type = shown ? 'password' : 'text'; $('keyEye').textContent = shown ? 'Show' : 'Hide'; $('keyEye').setAttribute('aria-label', `${shown ? 'Show' : 'Hide'} key`); i.focus(); });
$('keyForm').addEventListener('submit', async e => {
  e.preventDefault();
  const k = $('keyIn').value.trim(); if (!k) { $('keyErr').textContent = 'Paste the review admin key.'; return; }
  $('keyGo').disabled = true; $('keyGo').textContent = 'Checking…'; $('keyErr').textContent = '';
  try {
    if (!D.codes.length) Object.assign(D, await listData());
    if (!D.codes.length) throw new Error('No review clients found to check the key against.');
    if (!(await checkKey(k, D.codes[0]))) { $('keyErr').textContent = "That key didn't work. Check it's the ADMIN_KEY from the Apps Script's Script properties."; return; }
    await login.vaultSet({ reviewKey: k }); $('keyIn').value = '';
    adminKey = k; store.set(AR_KEY, k);
    show('appView'); toast('Review admin key saved'); await load();
  } catch (err) { $('keyErr').textContent = err.message; }
  finally { $('keyGo').disabled = false; $('keyGo').textContent = 'Check and save'; }
});

// ---------- load ----------
async function load() {
  const seq = ++loadSeq;
  D.error = ''; if (!D.loaded) $('screen').innerHTML = `${heroHtml(route().screen)}<div class="loading">Loading review clients…</div>`;
  try {
    Object.assign(D, await listData());
    if (!D.codes.length) throw new Error('No review clients found in the repo.');
    const ping = await checkKey(adminKey, D.codes[0]);
    if (seq !== loadSeq) return;
    if (!ping) { await login.vaultSet({ reviewKey: null }); return askKey('The saved review admin key no longer works (it was changed in Apps Script). Paste the new one.'); }
    const [all, files, content] = await Promise.all([
      post({ action: 'admin_all', key: adminKey, client: D.codes[0] }),
      Promise.all(D.codes.map(c => fetch(`${BASE}data/${encodeURIComponent(c)}.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null))),
      // renames live in the Content tab: the same public read the client page makes (GET ?client=)
      Promise.all(D.codes.map(c => fetch(`${SAVE_URL}?client=${encodeURIComponent(c)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null))),
    ]);
    if (seq !== loadSeq) return;
    if (!all?.ok) throw new Error(all?.error || "The backend didn't return the submissions.");
    D.files = Object.fromEntries(D.codes.map((c, i) => [c, files[i]]));
    D.names = { ...(ping.names || {}), ...(all.clients || {}) };
    D.renames = {};
    D.codes.forEach((c, i) => { const ren = (content[i]?.content || []).filter(x => String(x.field) === 'client:name' && String(x.value || '').trim()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).pop(); if (ren) D.renames[c] = String(ren.value).trim(); });
    D.rows = (all.rows || []).map(r => (L.isReq(r) ? { ...r, status: L.normStatus(r.status) || L.ST.REQ } : r));
    D.log = all.log || [];
    D.loaded = true;
  } catch (err) { if (seq !== loadSeq) return; D.error = err.message; }
  draw();
}

// ---------- drawing ----------
function heroHtml(screen) {
  const n = D.loaded ? D.rows.filter(r => L.isReq(r) && (F.tests || !isTest(r.client)) && ['req', 'prog'].includes(L.statusKey(r, D.rows))).length : 0;
  const head = screen === 'subs'
    ? '<section class="hero"><div><p class="ey">LFMP · Automation review</p><h1 class="disp">Client <span class="g">submissions.</span></h1></div></section>'
    : '<section class="hero"><div><p class="ey">LFMP · Automation review</p><h1 class="disp">Automation <span class="g">reviews.</span></h1></div></section>';
  const strip = screen === 'subs' || !D.loaded ? '' : (() => {
    const cs = visibleClients(), need = cs.filter(c => sumOf(c).state === 'need').length;
    return `<div class="strip"><span>${cs.length} client${cs.length === 1 ? '' : 's'}</span>${need ? `<button class="stripbtn need" type="button" data-home-filter="need">${need} need${need === 1 ? 's' : ''} you ${ARROW}</button>` : '<span>Nothing needs you</span>'}</div>`;
  })();
  const tabs = `<nav class="tabs2" aria-label="Review admin sections"><a href="#/" ${screen === 'home' ? 'aria-current="page"' : ''}>Clients</a><a href="#/subs" ${screen === 'subs' ? 'aria-current="page"' : ''}>Submissions${n ? ` <b class="cnt" aria-label="${n} to answer">${n}</b>` : ''}</a></nav>`;
  return head + strip + tabs;
}
function draw() {
  if ($('appView').hidden || !adminKey) return;
  const r = route();
  if (D.error) { $('screen').innerHTML = `${heroHtml(r.screen)}<div class="errbox">${esc(D.error)} <button class="lnk" type="button" data-act="reload">Try again</button></div>`; return; }
  if (!D.loaded) return;
  if (r.screen === 'subs') { if (r.client && r.client !== F.client) F.client = r.client; drawSubs(); closeDetails(true); }
  else { drawHome(); if (r.details) openDetails(r.details); else closeDetails(true); }
}

// ----- status (home row + Details) -----
// Home: "N requests to answer →" links to Details. Details: the same words without the link.
function statusHtml(c, s, { details = false } = {}) {
  if (s.state === 'need') {
    const n = `${s.open} request${s.open === 1 ? '' : 's'} to answer`;
    return `<span class="st need"><i aria-hidden="true">!</i>Needs you</span>${details ? `<span class="stsub">${n}</span>` : `<a class="stlink" href="#/client/${encodeURIComponent(c)}" data-row-stop>${n} ${ARROW}</a>`}`;
  }
  if (s.state === 'wait') return '<span class="st wait"><i aria-hidden="true">●</i>Waiting</span><span class="stsub">Waiting for the client</span>';
  if (s.state === 'new') return '<span class="st new"><i aria-hidden="true">○</i>Not started</span><span class="stsub">Links not opened yet</span>';
  return '<span class="st ok"><i aria-hidden="true">●</i>OK</span><span class="stsub">Nothing waiting</span>';
}

// ----- 1) Review home -----
function drawHome() {
  const cs = visibleClients().map(c => ({ c, s: sumOf(c), name: nameOf(c) }));
  const need = cs.filter(x => x.s.state === 'need').length, q = F.q.trim().toLowerCase();
  const list = cs.filter(x => (F.home !== 'need' || x.s.state === 'need') && (!q || `${x.name} ${x.c}`.toLowerCase().includes(q)))
    .sort((a, b) => L.STATE_ORDER[a.s.state] - L.STATE_ORDER[b.s.state] || b.s.open - a.s.open || a.name.localeCompare(b.name));
  const stat = x => statusHtml(x.c, x.s);
  const keepFocus = document.activeElement?.id === 'homeQ';
  $('screen').innerHTML = `${heroHtml('home')}
    <div class="toolbar">
      <div class="seg" role="group" aria-label="Show"><button type="button" data-home-filter="all" aria-pressed="${F.home === 'all'}">All <span class="n">${cs.length}</span></button><button type="button" data-home-filter="need" aria-pressed="${F.home === 'need'}">Needs you <span class="n">${need}</span></button></div>
      <label class="chk"><input type="checkbox" id="showTests" ${F.tests ? 'checked' : ''}> Show test clients</label>
      <input type="search" id="homeQ" class="search" placeholder="Search clients…" aria-label="Search clients" value="${esc(F.q)}">
    </div>
    <div class="clist">${list.map(x => `<div class="crow" data-client="${esc(x.c)}" tabindex="0" role="link" aria-label="${esc(x.name)}: open details">
        <div class="cname"><span class="disp">${esc(x.name)}</span>${isTest(x.c) ? '<span class="testtag">Test</span>' : ''}</div>
        <div class="cstat">${stat(x)}</div>
        <div class="cacts"><a class="btn sm" href="${esc(homeLink(x.c))}" target="_blank" rel="noopener" data-row-stop aria-label="Open ${esc(x.name)}'s review page (new tab)">Review page ${EXT}</a><a class="btn sm${x.s.state === 'need' ? ' p' : ''}" href="#/client/${encodeURIComponent(x.c)}" data-row-stop>Details ${ARROW}</a></div>
      </div>`).join('') || `<div class="empty">${q ? 'No client matches that search.' : F.home === 'need' ? 'Nothing needs you right now.' : 'No review clients yet.'}</div>`}</div>`;
  if (keepFocus) { const i = $('homeQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
}

// ----- 2) Details panel -----
let dpReturn = null, dpCode = null, dpMode = null;
function openDetails(code) {
  if (!clientsAll().includes(code)) { go('#/'); return; }
  if (dpCode !== code) { dpReturn = document.activeElement; dpMode = null; }
  dpCode = code;
  const s = sumOf(code), name = nameOf(code), file = D.files[code];
  const open = D.rows.filter(r => r.client === code && L.isReq(r) && ['req', 'prog'].includes(L.statusKey(r, D.rows))).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const A = linkA(code), B = linkB(code);
  const clientLinks = A || B
    ? [A && ['a', 'Link A · Plan + review', 'Send this one first', A], B && ['b', 'Link B · Review only', 'For re-reviews', B]].filter(Boolean)
    : [['c', 'Review page', 'The link this client was sent', reviewUrl(code)]];
  const autos = file?.automations || [];
  const body = dpMode === 'rename' ? renameHtml(code, name) : dpMode === 'clear' ? clearHtml(code, name, autos) : `
    <section class="dsec"><h3 class="lbl">Open items${open.length ? ` · ${open.length}` : ''}</h3>
      ${open.length ? `<ul class="olist">${open.map(r => { const [t, c] = L.tagOf(r, L.statusKey(r, D.rows)); return `<li><button type="button" class="oitem" data-open-sub="${esc(r.id)}" data-client="${esc(code)}"><span class="tag tg-${c}">${esc(t)}</span><span class="ot"><b>${esc(r.step_title || r.step || 'Request')}</b><small>${esc(autoName(code, r.automation))} · ${esc(fmtDay(r.timestamp))}</small></span>${ARROW}</button></li>`; }).join('')}</ul>`
        : `<p class="sub">${s.waiting ? `Nothing to answer. ${s.waiting} update${s.waiting === 1 ? ' is' : 's are'} waiting for the client.` : 'Nothing to answer.'}</p>`}
    </section>
    <section class="dsec"><h3 class="lbl">Automations approved</h3><p class="big">${s.approved} <span>of ${s.autos}</span></p>
      ${autos.length ? `<ul class="alist">${autos.map(a => { const ok = D.rows.some(r => r.client === code && r.action === 'approve_all' && r.automation === a.id && L.sameV(r.version, a.version)); return `<li><span class="${ok ? 'aok' : 'ano'}" aria-hidden="true">${ok ? '✓' : '·'}</span>${esc(a.name)}<span class="sr">${ok ? ' (approved)' : ' (not approved yet)'}</span></li>`; }).join('')}</ul>` : ''}
    </section>
    <section class="dsec" aria-labelledby="clTitle"><h3 class="lbl" id="clTitle">Client links <span class="lblnote">(send to the client)</span></h3>
      <ul class="clinks">${clientLinks.map(([k, label, hint, rel]) => { const url = absUrl(rel); return `<li data-link="${k}">
        <div class="clt"><b>${esc(label)}</b><small>${esc(hint)}</small><span class="url mono">${esc(url.replace(/^https?:\/\//, ''))}</span></div>
        <div class="cla"><a class="btn sm" href="${esc(rel)}" target="_blank" rel="noopener" aria-label="Open ${esc(label)} (new tab)">Open ${EXT}</a><button class="btn sm" type="button" data-copy="${esc(url)}" aria-label="Copy ${esc(label)}">Copy</button><span class="copied" aria-live="polite"></span></div>
      </li>`; }).join('')}</ul>
      <p class="lbl team">For the team</p><a class="lk sm" href="${esc(classicUrl(code))}" target="_blank" rel="noopener">Classic dashboard ${EXT}</a>
    </section>
    <section class="dsec"><h3 class="lbl">Last activity</h3><p class="sub">${s.last ? esc(fmtWhen(new Date(s.last).toISOString())) : 'No responses yet.'}</p></section>`;
  $('dPanel').innerHTML = `<div class="dhead"><div><p class="ey">Client details</p><h2 class="disp" id="dpTitle">${esc(name)}</h2><p class="dstat">${statusHtml(code, s, { details: true })}</p></div>
      <div class="dtools"><span class="menuwrap"><button class="btn icon iconbtn" type="button" data-menu="dpMenu" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(name)}">⋯</button>
        <div class="menu" id="dpMenu" role="menu" hidden>
          <button type="button" role="menuitem" data-dp="rename">Rename client</button>
          <a role="menuitem" href="${esc(classicUrl(code))}">Edit wording (names, summary, version, steps)</a>
          <button type="button" role="menuitem" class="danger" data-dp="clear">Clear all responses…</button>
        </div></span>
      <button class="btn icon iconbtn" type="button" data-act="closedet" aria-label="Close details">✕</button></div></div>
    <div class="dbody">${body}</div>`;
  const wasHidden = $('dPanel').hidden;
  $('dPanel').hidden = false; $('dpShade').hidden = false; document.body.classList.add('dp-open');
  for (const r of document.querySelectorAll('.crow')) r.classList.toggle('sel', r.dataset.client === code);
  if (wasHidden) $('dPanel').querySelector('[data-act="closedet"]').focus();
  else if (dpMode) $('dPanel').querySelector('input')?.focus();
}
function renameHtml(code, name) {
  return `<form class="dsec dform" data-form="rename"><h3 class="lbl">Rename client</h3>
    <p class="sub">How the name shows on the client's review pages and here. Saved to the Sheet (Content tab), like the classic page's Rename.</p>
    <label class="f" for="renIn">Client name<input type="text" id="renIn" value="${esc(name)}" maxlength="120" required></label>
    <div class="btnrow"><button class="btn p" type="submit">Save name</button><button class="btn" type="button" data-dp="back">Cancel</button></div></form>`;
}
function clearHtml(code, name, autos) {
  const n = D.rows.filter(r => r.client === code).length;
  return `<form class="dsec dform danger" data-form="clear"><h3 class="lbl">Clear all responses</h3>
    <p class="sub">Deletes the client's responses for good (for clearing test data). The review page and its wording stay.</p>
    <label class="f" for="clrScope">Which responses<select id="clrScope"><option value="">Every automation (${n})</option>${autos.map(a => `<option value="${esc(a.id)}">${esc(a.name)} (${D.rows.filter(r => r.client === code && r.automation === a.id).length})</option>`).join('')}</select></label>
    <label class="f" for="clrIn">Type the client name to confirm<input type="text" id="clrIn" autocomplete="off" placeholder="${esc(name)}"></label>
    <p class="ferr" id="clrErr" role="alert"></p>
    <div class="btnrow"><button class="btn danger" type="submit" id="clrGo" disabled>Delete responses</button><button class="btn" type="button" data-dp="back">Cancel</button></div></form>`;
}
function closeDetails(silent) {
  if ($('dPanel').hidden) { dpCode = null; return; }
  $('dPanel').hidden = true; $('dpShade').hidden = true; $('dPanel').innerHTML = ''; document.body.classList.remove('dp-open');
  for (const r of document.querySelectorAll('.crow.sel')) r.classList.remove('sel');
  const back = dpReturn && document.body.contains(dpReturn) ? dpReturn : document.querySelector(`.crow[data-client="${CSS.escape(dpCode || '')}"]`);
  dpCode = null; dpMode = null; dpReturn = null;
  if (!silent && route().details) go('#/');
  back?.focus?.({ preventScroll: true });
}

// ----- 3) Submissions -----
function drawSubs() {
  const all = D.rows, q = F.sq.trim().toLowerCase();
  const clients = clientsAll().filter(c => F.tests || !isTest(c) || c === F.client).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const pool = all.filter(r => (F.client === 'all' ? (F.tests || !isTest(r.client)) : r.client === F.client));
  const counts = Object.fromEntries(L.FILTERS.map(([k]) => [k, pool.filter(r => L.inFilter(L.statusKey(r, all), k) && (k !== 'done' || L.isReq(r) || r.action === 'approve_all')).length]));
  const want = r => {
    const k = L.statusKey(r, all);
    if (!L.inFilter(k, F.status)) return false;
    if (F.status === 'done' && !L.isReq(r) && r.action !== 'approve_all') return false;
    if (F.status === 'everything' && !L.inType(r, k, F.type)) return false;
    if (q && ![r.details, r.new_copy, r.step_title, r.name, r.type, r.lfmp_reply, autoName(r.client, r.automation), nameOf(r.client)].join(' ').toLowerCase().includes(q)) return false;
    return true;
  };
  const list = pool.filter(want).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const groups = [...new Set(list.map(r => r.client))].map(c => ({ c, rows: list.filter(r => r.client === c), toAnswer: all.filter(r => r.client === c && L.isReq(r) && ['req', 'prog'].includes(L.statusKey(r, all))).length }))
    .sort((a, b) => b.toAnswer - a.toAnswer || nameOf(a.c).localeCompare(nameOf(b.c)));
  const keep = document.activeElement?.id;
  $('screen').innerHTML = `${heroHtml('subs')}
    <div class="toolbar subsbar">
      <div class="segscroll"><div class="seg" role="group" aria-label="Show">${L.FILTERS.map(([k, l]) => `<button type="button" data-subs-filter="${k}" aria-pressed="${F.status === k}">${l} <span class="n">${counts[k]}</span></button>`).join('')}</div></div>
      <select id="subsClient" aria-label="Client"><option value="all">All clients</option>${clients.map(c => `<option value="${esc(c)}" ${F.client === c ? 'selected' : ''}>${esc(nameOf(c))}</option>`).join('')}</select>
      ${F.status === 'everything' ? `<select id="subsType" aria-label="Type">${L.TYPES.map(([k, l]) => `<option value="${k}" ${F.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
      <input type="search" id="subsQ" class="search" placeholder="Search…" aria-label="Search submissions" value="${esc(F.sq)}">
    </div>
    ${groups.map(g => groupHtml(g)).join('') || `<div class="empty">${F.status === 'answer' ? 'Nothing to answer.' : F.status === 'waiting' ? 'Nothing waiting for a client.' : 'Nothing here.'}${q ? ' Try another search.' : ''}</div>`}`;
  if (keep === 'subsQ') { const i = $('subsQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  if (F.open) $('screen').querySelector(`[data-sub="${CSS.escape(F.open)}"]`)?.scrollIntoView({ block: 'nearest' });
}
function groupHtml(g) {
  const all = D.rows, openIdx = g.rows.findIndex(r => r.id === F.open);
  const limit = F.more.has(g.c) ? g.rows.length : Math.max(4, openIdx + 1);
  const shown = g.rows.slice(0, limit), rest = g.rows.length - shown.length;
  return `<section class="grp" aria-label="${esc(nameOf(g.c))}">
    <div class="gh"><h2 class="disp">${esc(nameOf(g.c))}</h2>${g.toAnswer ? `<span class="gcnt">${g.toAnswer} to answer</span>` : ''}<a class="lk gopen" href="${esc(classicUrl(g.c))}">Open their review ${EXT}</a></div>
    ${shown.map(r => { const k = L.statusKey(r, all), [t, c] = L.tagOf(r, k), open = F.open === r.id;
      return `<button type="button" class="sline${open ? ' on' : ''}" data-sub="${esc(r.id)}" aria-expanded="${open}"><span class="tag tg-${c}">${esc(t)}</span><span class="st2"><b>${esc(r.step_title || r.step || L.kindText(r))}</b><small>${esc(autoName(r.client, r.automation))}</small></span><span class="sdate">${esc(fmtDay(r.timestamp))}</span></button>${open ? openHtml(r, k) : ''}`; }).join('')}
    ${rest > 0 ? `<button type="button" class="smore" data-more="${esc(g.c)}">+ ${rest} more</button>` : ''}
  </section>`;
}
function shotsHtml(v) {
  const urls = String(v || '').split(/\s+/).filter(u => /^(https?:|data:image)/.test(u));
  if (!urls.length) return '';
  return `<div class="shots">${urls.map((u, i) => { const m = u.match(/\/d\/([\w-]+)/); const th = m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400` : u; return `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(th)}" alt="Attached screenshot ${i + 1}" loading="lazy"></a>`; }).join('')}</div>`;
}
function historyHtml(r) {
  const ev = D.log.filter(l => l.request_id === r.id && l.event !== 'requested' && l.event !== 'content').sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const lab = s => { s = L.normStatus(s) || L.ST.REQ; return s === L.ST.OK ? '✓ Approved' : s === L.ST.UPD ? 'Updated · ready for review' : s === L.ST.PROG ? 'In progress' : 'Changes requested'; };
  return `<div class="hist"><h4 class="lbl">History</h4><ol>
    <li><span>${esc(fmtWhen(r.timestamp))}${r.name ? ` · ${esc(r.name)}` : ''}</span>Sent by the client</li>
    ${ev.map(l => `<li><span>${esc(fmtWhen(l.timestamp))}${l.by ? ` · ${esc(l.by)}` : ''}</span>${l.event === 'approved' ? esc(l.note || 'Approved') : esc(lab(l.status))}${l.event !== 'approved' && l.note ? ` · “${esc(l.note)}”` : ''}</li>`).join('')}
    ${!ev.length && r.updated_at ? `<li><span>${esc(fmtWhen(r.updated_at))}${r.updated_by ? ` · ${esc(r.updated_by)}` : ''}</span>Last updated</li>` : ''}
  </ol></div>`;
}
function openHtml(r, k) {
  const st = L.normStatus(r.status) || L.ST.REQ, approved = L.isReq(r) && st === L.ST.OK;
  const armed = F.armed === r.id;
  const menu = `<span class="menuwrap"><button class="btn icon iconbtn" type="button" data-menu="rm-${esc(r.id)}" aria-haspopup="menu" aria-expanded="false" aria-label="More for this response">⋯</button>
    <div class="menu" id="rm-${esc(r.id)}" role="menu" hidden>
      <button type="button" role="menuitem" data-hist="${esc(r.id)}">${F.history === r.id ? 'Hide history' : 'History'}</button>
      <a role="menuitem" href="${esc(classicUrl(r.client, r.automation))}">Open on the client's dashboard</a>
      <button type="button" role="menuitem" class="danger" data-subdel="${esc(r.id)}">Delete…</button>
    </div></span>`;
  return `<div class="sopen" id="so-${esc(r.id)}">
    <p class="kind">${esc(L.kindText(r))}${r.action === 'answer' ? `: <b>${esc(r.details)}</b>` : ''}${r.name ? ` <span class="mut">· ${esc(r.name)}</span>` : ''}</p>
    ${r.action !== 'answer' && r.details ? `<div class="quote">${esc(r.details)}</div>` : ''}
    ${r.new_copy ? `<div class="quote copy">${esc(r.new_copy)}<span class="mut"> (their new wording)</span></div>` : ''}
    ${shotsHtml(r.attachments)}
    ${r.lfmp_reply && approved ? `<p class="reply"><b>Your reply:</b> ${esc(r.lfmp_reply)}</p>` : ''}
    ${armed ? `<div class="confirm" role="alert"><span>Delete this response for good? This can't be undone.</span><button class="btn sm danger" type="button" data-subdel="${esc(r.id)}" data-confirm="1">Click again to delete</button><button class="btn sm" type="button" data-unarm>Cancel</button></div>` : ''}
    ${L.isReq(r) && !approved ? `<form class="sform" data-form="status" data-id="${esc(r.id)}" data-client="${esc(r.client)}">
        <select name="status" aria-label="Status">${L.TEAM_ST.map(o => `<option value="${esc(o)}" ${st === o ? 'selected' : ''}>${esc(L.ST_LABEL[o])}</option>`).join('')}</select>
        <input type="text" name="reply" aria-label="Reply to the client" placeholder="Reply to the client (what you changed)" value="${esc(r.lfmp_reply || '')}">
        <button class="btn p" type="submit">Save</button>${menu}</form>`
      : `<div class="sform"><p class="sub">${approved ? '✓ Approved by the client. Nothing more to do.' : 'Nothing to answer: this is the client\'s own response.'}</p>${menu}</div>`}
    ${F.history === r.id ? historyHtml(r) : ''}
  </div>`;
}

// ---------- actions ----------
async function saveStatus(form) {
  if (busy) { toast('Still saving, one moment…'); return; }
  const id = form.dataset.id, client = form.dataset.client, status = form.status.value, reply = form.reply.value.trim();
  const btn = form.querySelector('[type="submit"]'); busy = true; btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const j = await post({ action: 'admin_status', key: adminKey, client, id, status, lfmp_reply: reply, name: who('LFMP team') });
    if (!j.ok) throw new Error(j.error || 'Could not save');
    const i = D.rows.findIndex(r => r.id === id);
    if (i > -1) D.rows[i] = { ...D.rows[i], ...(j.row || { status, lfmp_reply: reply }), status: L.normStatus((j.row || {}).status || status) };
    D.log.push({ timestamp: new Date().toISOString(), client, request_id: id, event: 'status', status, note: reply, by: who('LFMP team') });
    toast('Saved. The client sees it straight away.');
  } catch (err) { toast(`Couldn't save: ${err.message}`); }
  finally { busy = false; draw(); }
}
async function deleteRow(id) {
  const r = D.rows.find(x => x.id === id); if (!r) return;
  if (busy) { toast('Still saving, one moment…'); return; }
  busy = true; toast('Deleting…');
  try {
    const j = await post({ action: 'admin_delete', key: adminKey, client: r.client, ids: [id] });
    if (!j.ok || !j.deleted) throw new Error(j.error || 'Not found');
    D.rows = D.rows.filter(x => x.id !== id); F.open = null; F.armed = null; toast('Deleted');
  } catch (err) { toast(`Couldn't delete: ${err.message}`); }
  finally { busy = false; draw(); }
}
async function rename(code, value) {
  const j = await post({ action: 'admin_edit', key: adminKey, client: code, automation: '', field: 'client:name', value, name: who('Admin') });
  if (!j.ok) throw new Error(j.error || 'Could not save');
  D.renames[code] = value;
}
async function clearResponses(code, autoId) {
  const ids = D.rows.filter(r => r.client === code && (!autoId || r.automation === autoId)).map(r => r.id);
  if (!ids.length) return 0;
  const j = await post({ action: 'admin_delete', key: adminKey, client: code, ids });
  if (!j.ok) throw new Error(j.error || 'Could not delete');
  D.rows = D.rows.filter(r => !ids.includes(r.id));
  return ids.length;
}

// ---------- Copy (client links): the full link; "Copied" next to the button for 4 s ----------
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok;
}
async function copyLink(btn) {
  const note = btn.parentElement.querySelector('.copied'), ok = await copyText(btn.dataset.copy);
  note.textContent = ok ? 'Copied' : "Couldn't copy"; note.classList.toggle('bad', !ok);
  clearTimeout(note.t); note.t = setTimeout(() => { note.textContent = ''; }, 4000);
}

// ---------- dialog (reserved for future confirmations; Esc closes) ----------
function closeDialog() { $('ovl').hidden = true; $('dlg').innerHTML = ''; }

// ---------- events ----------
document.addEventListener('click', async e => {
  const m = e.target.closest('[data-menu]');
  if (m) { const menu = $(m.dataset.menu); const open = menu.hidden; closeMenus(); menu.hidden = !open; m.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button,a')?.focus(); return; }
  if (!e.target.closest('.menu')) closeMenus();
  const t = e.target.closest('[data-theme-set]'); if (t) { applyTheme(t.dataset.themeSet); return; }
  const cp = e.target.closest('[data-copy]'); if (cp) { copyLink(cp); return; }
  if (e.target.closest('#dpShade')) { closeDetails(); return; }
  const hf = e.target.closest('[data-home-filter]'); if (hf) { F.home = hf.dataset.homeFilter; if (route().screen !== 'home') go('#/'); else drawHome(); return; }
  const sf = e.target.closest('[data-subs-filter]'); if (sf) { F.status = sf.dataset.subsFilter; F.open = null; F.more.clear(); drawSubs(); return; }
  const more = e.target.closest('[data-more]'); if (more) { F.more.add(more.dataset.more); drawSubs(); return; }
  const line = e.target.closest('[data-sub]'); if (line) { F.open = F.open === line.dataset.sub ? null : line.dataset.sub; F.armed = null; F.history = null; drawSubs(); if (F.open) $('screen').querySelector(`#so-${CSS.escape(F.open)} select, #so-${CSS.escape(F.open)} .iconbtn`)?.focus(); return; }
  const hist = e.target.closest('[data-hist]'); if (hist) { closeMenus(); F.history = F.history === hist.dataset.hist ? null : hist.dataset.hist; drawSubs(); return; }
  const del = e.target.closest('[data-subdel]');
  if (del) { closeMenus(); const id = del.dataset.subdel;
    if (!del.dataset.confirm) { F.armed = id; drawSubs(); $('screen').querySelector('.confirm .danger')?.focus(); setTimeout(() => { if (F.armed === id && !busy) { F.armed = null; if (route().screen === 'subs') drawSubs(); } }, 8000); return; }
    await deleteRow(id); return; }
  if (e.target.closest('[data-unarm]')) { F.armed = null; drawSubs(); return; }
  const oi = e.target.closest('[data-open-sub]');
  if (oi) { F.status = 'answer'; F.client = oi.dataset.client; F.open = oi.dataset.openSub; F.more.add(oi.dataset.client); go(`#/subs/${encodeURIComponent(oi.dataset.client)}`); return; }
  const dp = e.target.closest('[data-dp]');
  if (dp) { closeMenus(); dpMode = dp.dataset.dp === 'back' ? null : dp.dataset.dp; openDetails(dpCode); return; }
  if (e.target.closest('[data-row-stop]')) return;      // links inside a row work as links
  const row = e.target.closest('.crow'); if (row) { go(`#/client/${encodeURIComponent(row.dataset.client)}`); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  closeMenus();
  if (a.dataset.act === 'lock') login.lock('');
  else if (a.dataset.act === 'reload') { await load(); toast('Refreshed'); }
  else if (a.dataset.act === 'changekey') askKey('Paste the new review admin key. The saved one stays until the new one is checked.', { change: true });
  else if (a.dataset.act === 'keycancel') show('appView');
  else if (a.dataset.act === 'closedet') closeDetails();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.querySelector('.menu:not([hidden])')) { closeMenus(); return; }
    if (!$('ovl').hidden) { closeDialog(); return; }
    if (!$('dPanel').hidden) { if (dpMode) { dpMode = null; openDetails(dpCode); } else closeDetails(); return; }
    if (F.armed) { F.armed = null; drawSubs(); return; }
    if (F.open && route().screen === 'subs') { const id = F.open; F.open = null; drawSubs(); $('screen').querySelector(`[data-sub="${CSS.escape(id)}"]`)?.focus(); }
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('crow')) { e.preventDefault(); go(`#/client/${encodeURIComponent(e.target.dataset.client)}`); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'homeQ') { F.q = e.target.value; drawHome(); }
  else if (e.target.id === 'subsQ') { F.sq = e.target.value; drawSubs(); }
  else if (e.target.id === 'clrIn') { $('clrGo').disabled = e.target.value.trim().toLowerCase() !== nameOf(dpCode).trim().toLowerCase(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'showTests') { F.tests = e.target.checked; store.set(TESTS_KEY, F.tests ? '1' : null); draw(); }
  else if (e.target.id === 'subsClient') { F.client = e.target.value; F.open = null; F.more.clear(); go(F.client === 'all' ? '#/subs' : `#/subs/${encodeURIComponent(F.client)}`); }
  else if (e.target.id === 'subsType') { F.type = e.target.value; drawSubs(); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f || f.id === 'keyForm') return;
  e.preventDefault();
  if (f.dataset.form === 'status') return saveStatus(f);
  if (f.dataset.form === 'rename') {
    const v = $('renIn').value.trim(); if (!v) { $('renIn').focus(); return; }
    if (v === nameOf(dpCode)) { dpMode = null; openDetails(dpCode); toast('No changes'); return; }
    const b = f.querySelector('[type="submit"]'); b.disabled = true; b.textContent = 'Saving…';
    try { await rename(dpCode, v); dpMode = null; toast('Client name saved'); drawHome(); openDetails(dpCode); }
    catch (err) { toast(`Couldn't save: ${err.message}`); b.disabled = false; b.textContent = 'Save name'; }
    return;
  }
  if (f.dataset.form === 'clear') {
    if ($('clrIn').value.trim().toLowerCase() !== nameOf(dpCode).trim().toLowerCase()) { $('clrErr').textContent = 'Type the client name exactly to confirm.'; return; }
    const b = $('clrGo'); b.disabled = true; b.textContent = 'Deleting…';
    try { const n = await clearResponses(dpCode, $('clrScope').value); dpMode = null; toast(n ? `Cleared ${n} response${n === 1 ? '' : 's'}` : 'Nothing to clear'); drawHome(); openDetails(dpCode); }
    catch (err) { $('clrErr').textContent = `Couldn't clear: ${err.message}`; b.disabled = false; b.textContent = 'Delete responses'; }
  }
});

// ---------- start ----------
login = createLogin({ tool: 'review', onUnlock: unlocked, onLock: locked });
// One message only: the page's own "file is missing" text (with the command formatted), or the other reason in its place.
if (await login.start() === 'error') { show('setupView'); if (!/lfmp-lock\.json is missing/.test(login.error)) $('setupMsg').textContent = login.error; }
