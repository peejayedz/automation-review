// Automation Review admin v1.7.0 (redesign v2: the shared shell from lfmp-session.js mountShell — top bar, Me menu, bottom
// tabs — and the shared list look; layout only, same data and actions as v1.6.0).
// Automation Review admin v1.6.0: Review home · Details panel (Overview + Edit tab) · Submissions, on the team site behind
// Google sign-in only. The client pages (plan.html, messages.html, plans/, data/) never load this file. Since v1.6.0 the
// public index.html is only a redirect to Link A or a "This review has moved" page, and the team edits Link B's wording in
// Details → Edit. The classic editor (edit.html) is reachable only from Details → ⋯ → Classic editor (old).
// Backend: the same Apps Script admin actions (admin_ping, admin_all, admin_status, admin_delete, admin_edit) with the same
// fields, sent through the team site's server (/api/review), which adds the review admin key and the signed-in person's
// first name. The browser never holds the key or a GitHub token (lfmp-session.js).
import { startSession, api, ghFetch, signOut, paintMe, mountShell, pageHeadHtml, brandFor, brandSub, brandWord, brandCounts, getBrandFilter, setBrandFilter, wireListFilter, rowHtml as lvRow, statusHtml as lvStatus, SEARCH_ICON, loadingHtml, loadErrorHtml, fadeIn, panelOpen, panelClose, LOAD_LIMIT_MS, LOAD_SLOW_TEXT, loadBuilderRecords, displayName, showNewsCard, hideNewsCard, newsLine, busyButton, noteCount, startJob, confirmAction } from './lfmp-session.js';
import * as L from './review-logic.mjs?v=1.14.0';   // versioned: admin.js needs this release's rules (greet-count.mjs: the same)
import * as GC from './greet-count.mjs?v=1.12.2';   // v1.12.1: the load + the "Needs you" count (list + greeting)
export const VERSION = '1.15.0';

const CFG = window.REVIEW_CONFIG || {};
const SAVE_URL = String(CFG.saveUrl || '').trim();
const TESTS_KEY = GC.TESTS_KEY;   // v1.12.1: the data/ and plans/ lists are read in greet-count.mjs
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
// Who is answering: the signed-in person's first name (the server records the same name).
let ME = null;
const who = fallback => ME?.first || fallback;
function show(view) { for (const v of ['setupView', 'appView']) $(v).hidden = v !== view; }
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }
const fmtDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }); };
const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET`; };
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const EXT = '<span aria-hidden="true">↗</span>';

// ---------- v2 shell: top bar, Me (theme Auto · Light · Dark saved as "lfmp-theme", Show test clients, Refresh now,
// Team sign-ins, What's new, Install the app, Submissions, Sign out) and the phone's bottom tabs (lfmp-session.js) ----------
let shell = null;
// What's new (admin/whats-new.json, same format as the Builder's page/whats-new.json)
const NEWS_SEEN = 'ar-news-seen';
let newsData = null;
const semverNewer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const newsUnseen = () => semverNewer(VERSION, store.get(NEWS_SEEN) || '0.0.0');
async function loadNews() {
  if (newsData) return newsData;
  try { const r = await fetch(`whats-new.json?t=${Date.now()}`, { cache: 'no-store' }); newsData = r.ok ? await r.json() : { versions: [] }; } catch { newsData = { versions: [] }; }
  return newsData;
}
const NEWS_TYPE = { new: 'New', improved: 'Improved', fixed: 'Fixed' };
async function openNews() {
  let d = $('arNews');
  if (!d) { d = document.createElement('dialog'); d.id = 'arNews'; d.className = 'lfmp-dlg'; d.setAttribute('aria-labelledby', 'arNewsT'); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-lfmp-close]')) d.close(); }); document.body.append(d); }
  const head = `<div class="lfmp-dlg-h"><div><h2 id="arNewsT">What's new</h2></div><button class="lfmp-out" type="button" data-lfmp-close>Close</button></div>`;
  d.innerHTML = `${head}<p class="lfmp-dlg-b mut">Loading…</p>`;
  if (!d.open) d.showModal();
  const vs = (await loadNews()).versions || [];
  d.innerHTML = `${head}<div class="lfmp-dlg-b arnews">${vs.length ? vs.map(v => `<section><p class="arnews-v"><b>v${esc(v.version)}</b> · ${esc(v.date || '')}</p><h3>${esc(v.title || '')}</h3><ul>${(v.items || []).map(i => `<li><span class="arnews-t">${esc(NEWS_TYPE[i.type] || i.type || '')}</span> ${esc(i.text)}</li>`).join('')}</ul></section>`).join('') : '<p class="mut">Nothing here yet.</p>'}</div>`;
  d.querySelector('[data-lfmp-close]')?.focus();
  store.set(NEWS_SEEN, VERSION); shell?.setNewsDot(false); hideNewsCard();
}
// v1.16.0 shell: the same What's new card as the Builder and KPI admin, once per version.
// v1.10.0: a card only for a minor release (x.Y.0); on a patch, its minor release's card if still unseen (never the patch's own).
async function showNewsToast() {
  const target = L.cardVersion(VERSION), cardUnseen = () => !!target && L.isMinor(target) && semverNewer(target, store.get(NEWS_SEEN) || '0.0.0');
  if (!cardUnseen()) return;
  const v = ((await loadNews()).versions || []).find(x => x.version === target); if (!v || !cardUnseen()) return;
  showNewsCard({ version: v.version, title: v.title, line: newsLine(v), onSee: () => openNews(), onGot: () => { store.set(NEWS_SEEN, VERSION); shell?.setNewsDot(false); } });
}
const toAnswer = () => (D.loaded ? D.rows.filter(r => L.isReq(r) && (F.tests || !isTest(r.client)) && ['req', 'prog'].includes(L.statusKey(r, D.rows))).length : 0);
function closeMenus() { for (const m of document.querySelectorAll('.menu:not([hidden])')) { m.hidden = true; document.querySelector(`[data-menu="${m.id}"]`)?.setAttribute('aria-expanded', 'false'); } }

// ---------- backend ----------
// Admin actions through the team site's server (no key here). A refusal or a network error is retried once: the first
// call after the Apps Script sits idle can fail. v1.12.1: the load (data/ + plans/ lists, admin_ping, admin_all, data
// files, Content reads, Builder records) lives in greet-count.mjs readData, which the greeting's count also uses.
const post = GC.makePost(api);
// ---------- "Link A sent · Nov 16" (v1.7.0, PJ): Copy on Link A / Link B counts as sent ----------
// The Builder's client record (private repo, records/<id>.json) keeps the latest copy as review.linkSent
// { link: 'A' | 'B', at, by }. Read through the team site exactly as the Builder reads it (allow-list B1); a Copy here
// saves it the same way the Builder does (B2: GET → change → PUT with its sha, retried on 409/422). Any read failure
// just means no "sent" line: the page works as before.
const BREPO = '/repos/peejayedz/ghl-subaccount-builder';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64dec = b => new TextDecoder().decode(Uint8Array.from(atob(String(b).replace(/\s/g, '')), c => c.charCodeAt(0)));
const b64enc = s => { let o = ''; for (const x of new TextEncoder().encode(s)) o += String.fromCharCode(x); return btoa(o); };
// v1.9.0: the Builder records come from the shared loader (lfmp-session.js loadBuilderRecords, same allow-listed reads);
// D.recs = all of them (names, "Create package ›"), D.sent = the ones with a review code, by code (greet-count.mjs loadSent).
const sentDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };   // the viewer's time zone
const sentText = c => { const s = D.sent[c]?.linkSent; return s && (s.link === 'A' || s.link === 'B') && sentDay(s.at) ? `Link ${s.link} sent · ${sentDay(s.at)}` : ''; };
async function markSent(code, link) {
  const rec = D.sent[code]; if (!rec || (link !== 'A' && link !== 'B')) return;   // no Builder record: just copied
  const path = `${BREPO}/contents/records/${rec.id}.json`, by = ME?.name || ME?.email || 'unknown';
  try {
    for (let i = 0; ; i++) {
      const g = await ghFetch('GET', `${path}?ref=main`);
      if (!g.ok) throw new Error(`GitHub answered ${g.status}`);
      const j = await g.json(), x = JSON.parse(b64dec(j.content));
      const linkSent = { link, at: new Date().toISOString(), by };
      x.review = { ...(x.review || {}), linkSent }; x.updatedAt = linkSent.at;
      const p = await ghFetch('PUT', path, { message: `${x.businessName || code}: Link ${link} copied to send (${by})`, content: b64enc(`${JSON.stringify(x, null, 2)}\n`), sha: j.sha, branch: 'main' });
      if (p.ok) { rec.linkSent = linkSent; if (route().screen === 'home') drawHome(); return; }
      if ((p.status === 409 || p.status === 422) && i < 2) { await sleep(800); continue; }
      throw new Error(`GitHub answered ${p.status}`);
    }
  } catch (err) { toast(`Link ${link} copied, but it couldn't be noted as sent: ${err.message}`); }
}

// ---------- state ----------
let loadSeq = 0, busy = false;
const D = { codes: [], plan: new Set(), messages: new Set(), plansPage: new Set(), files: {}, msgs: {}, content: {}, names: {}, renames: {}, rows: [], log: [], sent: {}, recs: [], loaded: false, error: '' };
const F = { home: 'all', q: '', tests: store.get(TESTS_KEY) === '1', status: 'answer', client: 'all', sq: '', type: 'all', open: null, more: new Set(), armed: null, rowMenu: null, history: null };
// Edit tab: chosen automation per client, the message whose form is open, "new version" armed
const E = { auto: {}, open: null, ver: null };
// v1.9.0: one display name per client in all three tools: the Builder record's name when the client has one (matched by
// review code); otherwise the name the client page shows: a rename (Content tab, newest wins) > the data file's name >
// the Sheet tab name. Display only (displayName adds a lost last dot: "P.C" → "P.C."). v1.12.1: these list rules live in
// greet-count.mjs, so the greeting's "reviews need you" counts exactly as the Needs you filter.
const nameOf = c => GC.nameOf(D, c);
// The client's Builder record: by review code, else the same name. null = none yet.
const normN = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const recOf = c => (D.sent[c] ? { id: D.sent[c].id } : D.recs.find(r => normN(r.name) === normN(nameOf(c))) || null);
// "Create package ›": the Builder record's Review tab, or the Builder's Add existing client with the name filled in.
const BUILDER_PATH = '/ghl-subaccount-builder-page/';
const packageUrl = c => { const r = recOf(c); return r ? `${BUILDER_PATH}?client=${encodeURIComponent(r.id)}&tab=review` : `${BUILDER_PATH}?add=existing&q=${encodeURIComponent(nameOf(c))}`; };
const autoName = (c, a) => { const x = D.files[c]?.automations?.find(y => y.id === a); return x ? x.name : a === 'setup-questions' ? 'Setup questions' : (a || ''); };
const isTest = c => GC.isTest(D, c);
const clientsAll = () => GC.clientsAll(D);
const visibleClients = () => GC.visibleClients(D, F.tests);
// v1.15.0: LFMP / WPP = the Builder record's brand (shared shell brandFor: review code, or the record matched by name); none = LFMP
const codeBrand = c => brandFor(D.recs, { reviewCode: c, id: recOf(c)?.id });
const inBrand = (codes, b = F.brand) => (b === 'LFMP' || b === 'WPP' ? codes.filter(c => codeBrand(c) === b) : codes);
const homeSegs = (b = F.brand) => {
  const st = inBrand(visibleClients(), b).map(c => sumOf(c).state), n = f => st.filter(x => L.inHome(f, x)).length, need = n('need');
  return [{ key: 'all', label: 'All', n: st.length }, { key: 'need', label: `Needs you · ${need}`, red: need > 0, n: need, needs: true }, { key: 'wait', label: 'Waiting', n: n('wait') }, { key: 'unsent', label: 'Not sent', n: n('unsent') }, { key: 'done', label: 'Done', n: n('done') }];
};
// Link B's wording state for a client: current version per automation + the wording edits it shows (review-logic.mjs).
const lbOf = c => GC.lbOf(D, c);
const sumOf = c => GC.sumOf(D, c);
// The classic editor (old, team only, next to this page). Only Details → ⋯ → Classic editor (old) links here.
const classicEditorUrl = c => `edit.html?c=${encodeURIComponent(c)}`;
// Client links, as on the Builder's Review card: A = plan + review (default; the hand-made plans/<code>.html page when the
// client has one, else plan.html?c=), B = messages only (re-reviews). v1.6.0: the classic ?c= page is retired, so a client
// without these pages has no client link yet ("create an A/B package in the Builder").
const linkA = c => (D.plansPage.has(c) ? `${BASE}plans/${encodeURIComponent(c)}.html` : D.plan.has(c) ? `${BASE}plan.html?c=${encodeURIComponent(c)}` : null);
const linkB = c => (D.messages.has(c) ? `${BASE}messages.html?c=${encodeURIComponent(c)}` : null);
const homeLink = c => linkA(c) || linkB(c);
const NO_LINK = 'No client link yet — create an A/B package in the Builder.';
const absUrl = rel => new URL(rel, location.href).href;

// ---------- routing: #/ home · #/client/<code> Details · #/subs[/<code>] Submissions ----------
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch { return ''; } });
  if (p[0] === 'subs') return { screen: 'subs', client: p[1] || null };
  if (p[0] === 'client' && p[1]) return { screen: 'home', details: p[1], tab: p[2] === 'edit' ? 'edit' : 'overview', auto: p[2] === 'edit' ? p[3] || null : null };
  return { screen: 'home' };
}
const go = h => { if (location.hash !== h) location.hash = h; else draw(); };
addEventListener('hashchange', () => draw());

// ---------- sign-in (Google, Cloudflare Access) ----------
let greetReady = () => {};
const greetCount = new Promise(r => { greetReady = r; });
async function start() {
  try { ME = await startSession(); }
  catch (err) { if (err.status !== 401) { show('setupView'); $('setupMsg').textContent = err.message; } return; }   // 401: on the way to /signin/
  if (!SAVE_URL) { show('setupView'); $('setupMsg').textContent = 'The review pages have no backend set (config.js saveUrl is empty), so there is nothing to administer here.'; return; }
  shell = mountShell({
    tool: 'review', me: ME, root: $('appView'), plus: null, bell: null, version: VERSION, newsDot: newsUnseen(),
    showTests: { on: F.tests, label: 'Show test clients', onChange: on => { F.tests = on; store.set(TESTS_KEY, on ? '1' : null); draw(); } },
    onRefresh: async () => { shell.closeMe(); await load(); toast('Refreshed'); },
    onNews: () => openNews(),
    onHome: () => { closeDetails(true); F.home = F.home || 'all'; go('#/'); window.scrollTo(0, 0); },
    greet: { count: () => greetCount },   // v1.12.0: the once-a-day greeting (shell); our count when the list has loaded
  });
  paintMe(ME);   // name, email, "Last signed in …" (lfmp-session.js)
  show('appView'); await load();
  showNewsToast();
}

// ---------- load ----------
async function load() {
  const seq = ++loadSeq;
  const first = !D.loaded;
  D.error = ''; if (first) $('screen').innerHTML = `${headHtml(route().screen)}${loadingHtml('reviews')}`;   // the LFMP blocks until the data arrives
  // never spin forever: after 20 s show the error / Try again state (a late answer is then ignored)
  const slow = setTimeout(() => { if (seq === loadSeq && !D.loaded) { loadSeq++; D.error = LOAD_SLOW_TEXT; draw(); } }, LOAD_LIMIT_MS);
  try {
    // v1.12.1: greet-count.mjs readData (the same load the greeting's count makes), plus Link B's messages for the Edit tab
    const data = await GC.readData({ post, ghFetch, loadBuilderRecords, saveUrl: SAVE_URL, base: BASE }, { messages: true, current: () => seq === loadSeq });
    if (seq !== loadSeq || !data) return;
    Object.assign(D, data);
    D.loaded = true;
    shell?.setUpdated(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));   // Me → Refresh now · updated 4:57 PM
  } catch (err) { if (seq !== loadSeq) return; D.error = err.message; }
  finally { clearTimeout(slow); }
  if (seq !== loadSeq) return;
  draw();
  if (first && D.loaded) fadeIn($('screen').querySelector('.lv-list') || $('screen'));
}

// ---------- drawing ----------
// v2 (redesign v2): title + summary (desktop) · search · filter "All · Needs you · n · Waiting · Done" · one list.
// Submissions: its own screen, with "‹ Reviews" back to the list. Reached from the desktop summary line ("· All
// submissions ›"), on a phone from the muted "All submissions ›" row under the list, and from a client's Details → Open items.
// v1.9.0: All · Needs you · n · Waiting · Not sent · Done (review-logic.mjs inHome)
function headHtml(screen) {
  if (screen === 'subs') {
    const n = toAnswer();
    return `<div class="lv-hrow subshead"><div><button type="button" class="lv-back" data-act="gohome"><span aria-hidden="true">‹</span>Reviews</button><h1 class="lv-h1 lv-d">Submissions</h1><div class="lv-sum">${n ? `${n} to answer` : 'Nothing to answer'}</div></div></div>`;
  }
  F.brand ??= getBrandFilter();   // v1.15.0: one setting for the three tools on this device (read once per page)
  const cs = D.loaded ? inBrand(visibleClients()) : [], word = brandWord(F.brand);
  const segs = D.loaded ? homeSegs() : homeSegs('all').map(s => ({ ...s, n: 0 })), cnt = k => segs.find(s => s.key === k)?.n || 0;
  const need = cnt('need'), wait = cnt('wait'), unsent = cnt('unsent');
  // v1.12.0: the greeting's "reviews need you" (the same count as the filter, every brand); kept for the other tools' greetings
  if (D.loaded) { const all = GC.homeCounts(D, F.tests).need; noteCount('reviews', all); greetReady({ reviews: all }); }
  // the summary counts as the filter does: "7 clients · 2 need you · 3 waiting · 1 not sent"
  const summary = [`${cs.length} ${word}client${cs.length === 1 ? '' : 's'}`, need ? `${need} need${need === 1 ? 's' : ''} you` : 'nothing needs you', wait ? `${wait} waiting` : '', unsent ? `${unsent} not sent` : ''].filter(Boolean).join(' · ');
  return pageHeadHtml({ title: 'Reviews', summary: D.loaded ? summary : '',
    search: { id: 'homeQ', placeholder: `Search ${cs.length || ''} ${word}client${cs.length === 1 ? '' : 's'}`.replace('  ', ' '), value: F.q }, active: F.home,
    segs, brand: { value: F.brand, counts: brandCounts((D.loaded ? visibleClients() : []).map(c => ({ brand: codeBrand(c) }))) } });
}
function draw() {
  if ($('appView').hidden || !ME) return;
  const r = route();
  shell?.setTitle(r.screen === 'subs' ? 'Submissions' : 'Reviews');
  if (D.error) { $('screen').innerHTML = `${headHtml(r.screen)}${loadErrorHtml(D.error, { attrs: 'data-act="reload"' })}`; return; }
  if (!D.loaded) return;
  if (r.screen === 'subs') { if (r.client && r.client !== F.client) F.client = r.client; drawSubs(); closeDetails(true); }
  else { drawHome(); if (r.details) openDetails(r.details, r.tab, r.auto); else closeDetails(true); }
}

// ----- status (home row + Details) -----
// Home: "N requests to answer →" links to Details. Details: the same words without the link.
function statusHtml(c, s, { details = false } = {}) {
  if (s.state === 'need') {
    const n = `${s.open} request${s.open === 1 ? '' : 's'} to answer`;
    return `<span class="st need"><i aria-hidden="true">!</i>Needs you</span>${details ? `<span class="stsub">${n}</span>` : `<a class="stlink" href="#/client/${encodeURIComponent(c)}" data-row-stop>${n} ${ARROW}</a>`}`;
  }
  if (s.state === 'wait') return '<span class="st wait"><i aria-hidden="true">●</i>Waiting</span><span class="stsub">Waiting for the client</span>';
  // PJ 18 Nov: never claim anything about opens. No Copy recorded → "Link not copied yet"; after a Copy → "Link A sent · <date>"
  if (s.state === 'new') return `<span class="st wait new"><i aria-hidden="true">●</i>Waiting</span><span class="stsub">${esc(sentText(c) || 'Link not copied yet')}</span>`;
  if (s.state === 'unsent') return '<span class="st unsent"><i aria-hidden="true">●</i>Not sent</span><span class="stsub">No client link yet</span>';
  return `<span class="st ok"><i aria-hidden="true">●</i>${allApproved(s) ? 'Approved' : 'Done'}</span><span class="stsub">Nothing waiting</span>`;
}

// ----- 1) Review home (v2 list) -----
// Row: name + sub-line · status dot + word · Link A/B · Open ›. The whole row opens Details (Review page ↗, Copy, Edit…).
// Needs you (red) · Waiting (amber, only when a client link exists) · Not sent (grey, no client link yet) · Approved / Done (green).
const ROW_ST = { need: ['red', 'Needs you'], wait: ['amber', 'Waiting'], new: ['amber', 'Waiting'], unsent: ['grey', 'Not sent'], ok: ['green', 'Done'] };
const allApproved = s => s.autos > 0 && s.approved === s.autos;
function linksText(c) { const A = linkA(c), B = linkB(c); return A && B ? 'Link A + B' : A ? 'Link A' : B ? 'Link B' : 'No client link yet'; }
function rowSub(x) {
  const s = x.s;
  const what = s.state === 'need' ? `${s.open} request${s.open === 1 ? '' : 's'} to answer` : s.state === 'wait' ? sentText(x.c) || 'Waiting for the client'
    : s.state === 'new' ? sentText(x.c) || 'Link not copied yet' : s.state === 'unsent' ? 'No client link yet' : homeLink(x.c) ? linksText(x.c) : 'Nothing waiting';
  return [isTest(x.c) ? 'Test' : '', what].filter(Boolean).join(' · ');
}
function rowStatus(x) {
  const [tone, label] = ROW_ST[x.s.state];
  return lvStatus(tone, x.s.state === 'ok' && allApproved(x.s) ? 'Approved' : label);
}
// Third column: Not sent → "Create package ›" (Builder); Waiting → "No reply yet" / "Replied · <first answer>"; else the links.
// (PJ 18 Nov: never "Opened": opens are not logged. A real "Opened · <date>" can come if the client pages ever log a view.)
function thirdCell(x) {
  if (x.s.state === 'unsent') return `<a class="lv-mt mkpkg" href="${esc(packageUrl(x.c))}" data-row-stop data-pkg>Create package ›</a>`;
  if (x.s.state === 'new') return '<span class="lv-mt">No reply yet</span>';
  if (x.s.state === 'wait') { const at = L.firstAnswerAt(x.c, D.rows); return `<span class="lv-mt" title="${at ? 'Date of the client\'s first reply' : ''}">Replied${at ? ` · ${esc(fmtDay(at))}` : ''}</span>`; }
  return `<span class="lv-mt">${esc(linksText(x.c))}</span>`;
}
function drawHome() {
  const cs = inBrand(visibleClients()).map(c => ({ c, s: sumOf(c), name: nameOf(c) }));   // v1.15.0: the brand filter first
  const q = F.q.trim().toLowerCase();
  const list = L.homeList(cs, F.home, q);   // v1.10.0: A–Z by the shown name in every filter and search (status still on each row)
  const keepFocus = document.activeElement?.id === 'homeQ';
  const empty = F.brand !== 'all' && !q && !list.length ? `No clients here in this view. <button class="linkbtn" type="button" data-brand-all>Show all</button>` : q ? 'No client matches that search.' : F.home === 'need' ? 'Nothing needs you right now.' : F.home === 'wait' ? 'Nothing is waiting for a client.' : F.home === 'unsent' ? 'Every client has a client link.' : F.home === 'done' ? 'No client is done yet.' : 'No review clients yet.';
  $('screen').innerHTML = `${headHtml('home')}
    ${list.length ? `<div class="lv-list" id="clist" style="--lv-cols:1.5fr 200px 260px 70px">${list.map(x => lvRow({ name: x.name, sub: brandSub(codeBrand(x.c), F.brand, rowSub(x)), label: `${x.name}: open details`,
      attrs: `data-client="${esc(x.c)}" data-state="${esc(x.s.state)}"`, cells: [rowStatus(x), thirdCell(x)] })).join('')}</div>`
      : `<div class="lv-list lv-empty">${empty}</div>`}
    <div class="lv-list subsrow"><a class="lv-row" href="#/subs" aria-label="All submissions"><span class="lv-c0">All submissions</span><span class="lv-chev" aria-hidden="true">›</span></a></div>`;
  if (dpCode) $('screen').querySelector(`.lv-row[data-client="${CSS.escape(dpCode)}"]`)?.classList.add('sel');   // the open client stays marked
  // desktop only (the summary line is hidden on a phone): "7 clients · 2 need you · All submissions ›"
  $('screen').querySelector('[data-lv-sum]')?.insertAdjacentHTML('beforeend', ' · <a class="sumlink" href="#/subs">All submissions ›</a>');
  if (keepFocus) { const i = $('homeQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  wireListFilter($('screen'), { getBrand: () => F.brand, getStatus: () => F.home || 'all', noun: 'client',
    brands: () => brandCounts(visibleClients().map(c => ({ brand: codeBrand(c) }))), segsFor: b => homeSegs(b),
    countFor: (b, s) => inBrand(visibleClients(), b).filter(c => L.inHome(s, sumOf(c).state)).length,
    onChange: ({ brand, status }) => { F.brand = brand; F.home = status; drawHome(); } });
}

// ----- 2) Details panel -----
let dpReturn = null, dpCode = null, dpMode = null, dpTab = 'overview';
function openDetails(code, tab = 'overview', auto = null) {
  if (!clientsAll().includes(code)) { go('#/'); return; }
  if (dpCode !== code) { dpReturn = document.activeElement; dpMode = null; E.open = null; E.ver = null; }
  if (dpTab !== tab) { E.open = null; E.ver = null; dpMode = null; }
  dpCode = code; dpTab = tab;
  if (auto) E.auto[code] = auto;
  const s = sumOf(code), name = nameOf(code), file = D.files[code];
  const autos = file?.automations || [];
  const body = dpMode === 'rename' ? renameHtml(code, name) : dpMode === 'clear' ? clearHtml(code, name, autos) : tab === 'edit' ? editTabHtml(code) : overviewHtml(code, s, autos);
  const enc = encodeURIComponent(code);
  $('dPanel').innerHTML = `<div class="dhead"><div><p class="ey">Client details</p><h2 class="disp" id="dpTitle">${esc(name)}</h2><p class="dstat">${statusHtml(code, s, { details: true })}</p></div>
      <div class="dtools"><span class="menuwrap"><button class="btn icon iconbtn" type="button" data-menu="dpMenu" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(name)}">⋯</button>
        <div class="menu" id="dpMenu" role="menu" hidden>
          <button type="button" role="menuitem" data-dp="rename">Rename client</button>
          <button type="button" role="menuitem" class="danger" data-dp="clear">Clear test responses…</button>
          <button type="button" role="menuitem" class="danger" data-dp-rmpkg>Remove review package…</button>
          <a role="menuitem" class="menuold" href="${esc(classicEditorUrl(code))}">Classic editor (old)</a>
        </div></span>
      <button class="btn icon iconbtn dclose" type="button" data-act="closedet" aria-label="Close details"><span class="x" aria-hidden="true">✕</span><span class="bk"><span aria-hidden="true">‹</span> Reviews</span></button></div></div>
    <nav class="dtabs" aria-label="Client details sections"><a href="#/client/${enc}" ${tab === 'overview' ? 'aria-current="page"' : ''}>Overview</a><a href="#/client/${enc}/edit" ${tab === 'edit' ? 'aria-current="page"' : ''}>Edit</a></nav>
    <div class="dbody">${body}</div>`;
  const wasHidden = $('dPanel').hidden;
  $('dPanel').hidden = false; $('dpShade').hidden = false; document.body.classList.add('dp-open');
  panelOpen($('dPanel'), $('dpShade'));   // slides in (shared shell); an open panel only swaps its content
  $('dPanel').classList.toggle('wide', tab === 'edit' && !dpMode);
  for (const r of document.querySelectorAll('.lv-row[data-client]')) r.classList.toggle('sel', r.dataset.client === code);
  if (wasHidden) $('dPanel').querySelector('[data-act="closedet"]').focus();
  else if (dpMode) $('dPanel').querySelector('input')?.focus();
}
function overviewHtml(code, s, autos) {
  const open = D.rows.filter(r => r.client === code && L.isReq(r) && ['req', 'prog'].includes(L.statusKey(r, D.rows))).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const versions = lbOf(code).versions;
  const A = linkA(code), B = linkB(code);
  const clientLinks = [A && ['a', 'Link A · Plan + review', 'Send this one first', A], B && ['b', 'Link B · Review only', 'For re-reviews', B]].filter(Boolean);
  return `
    <section class="dsec"><h3 class="lbl">Open items${open.length ? ` · ${open.length}` : ''}</h3>
      ${open.length ? `<ul class="olist">${open.map(r => { const [t, c] = L.tagOf(r, L.statusKey(r, D.rows)); return `<li><button type="button" class="oitem" data-open-sub="${esc(r.id)}" data-client="${esc(code)}"><span class="tag tg-${c}">${esc(t)}</span><span class="ot"><b>${esc(r.step_title || r.step || 'Request')}</b><small>${esc(autoName(code, r.automation))} · ${esc(fmtDay(r.timestamp))}</small></span>${ARROW}</button></li>`; }).join('')}</ul>`
        : `<p class="sub">${s.waiting ? `Nothing to answer. ${s.waiting} update${s.waiting === 1 ? ' is' : 's are'} waiting for the client.` : 'Nothing to answer.'}</p>`}
    </section>
    <section class="dsec"><h3 class="lbl">Automations approved</h3><p class="big">${s.approved} <span>of ${s.autos}</span></p>
      ${autos.length ? `<ul class="alist">${autos.map(a => { const ok = D.rows.some(r => r.client === code && r.action === 'approve_all' && r.automation === a.id && L.sameV(r.version, versions[a.id] ?? a.version)); return `<li><span class="${ok ? 'aok' : 'ano'}" aria-hidden="true">${ok ? '✓' : '·'}</span>${esc(a.name)}<span class="sr">${ok ? ' (approved)' : ' (not approved yet)'}</span></li>`; }).join('')}</ul>` : ''}
    </section>
    <section class="dsec" aria-labelledby="clTitle"><h3 class="lbl" id="clTitle">Client links <span class="lblnote">(send to the client)</span></h3>
      ${clientLinks.length ? `<ul class="clinks">${clientLinks.map(([k, label, hint, rel]) => { const url = absUrl(rel); return `<li data-link="${k}">
        <div class="clt"><b>${esc(label)}</b><small>${esc(hint)}</small><span class="url mono">${esc(url.replace(/^https?:\/\//, ''))}</span></div>
        <div class="cla"><a class="btn sm" href="${esc(rel)}" target="_blank" rel="noopener" aria-label="Open ${esc(label)} (new tab)">Open ${EXT}</a><button class="btn sm" type="button" data-copy="${esc(url)}" aria-label="Copy ${esc(label)}">Copy</button><span class="copied" aria-live="polite"></span></div>
      </li>`; }).join('')}</ul>` : `<p class="nolinkbox" data-link="none">${esc(NO_LINK)} <a class="mkpkg" href="${esc(packageUrl(code))}" data-pkg>Create package ›</a></p>`}
    </section>
    <section class="dsec"><h3 class="lbl">Last activity</h3><p class="sub">${s.last ? esc(fmtWhen(new Date(s.last).toISOString())) : 'No responses yet.'}</p></section>`;
}

// ----- Edit tab: Link B's message wording (the only wording a client sees change) + new version -----
// Saves the same admin_edit fields the classic editor used (step:<id>:sms | email.subject | email.body | body, and
// version) through /api/review. Newest edit wins; Link B shows it on its next load. Link A (plan page) never changes.
function editMsgs(code) {
  const M = D.msgs[code]; if (!M?.sections) return [];
  return M.sections.flatMap(g => (g.msgs || []).map(m => ({ ...m, section: g.title, auto: m.id.slice(0, m.id.lastIndexOf('.')) })));
}
function editTabHtml(code) {
  const A = linkA(code), B = linkB(code);
  if (!B) return `<section class="dsec"><p class="nolinkbox" data-link="none">${esc(NO_LINK)} <a class="mkpkg" href="${esc(packageUrl(code))}" data-pkg>Create package ›</a></p><p class="sub edmore">${A ? 'This client has a plan page (Link A) but no review page (Link B), so there is no wording to edit here.' : 'Edits made here show on the client\'s Link B, so a client needs an A/B package first. Their past answers stay in Submissions.'}</p></section>`;
  if (!D.msgs[code]) return `<section class="dsec"><div class="errbox">Couldn't load this client's messages (data/${esc(code)}.messages.json). <button class="lnk" type="button" data-act="reload">Try again</button></div></section>`;
  const all = editMsgs(code), lb = lbOf(code), file = D.files[code];
  const autoIds = [...new Set(all.map(m => m.auto))];
  if (!autoIds.length) return '<section class="dsec"><p class="sub">This client\'s Link B has no messages to edit.</p></section>';
  const cur = autoIds.includes(E.auto[code]) ? E.auto[code] : autoIds[0]; E.auto[code] = cur;
  const ver = lb.versions[cur] ?? String(file?.automations?.find(a => a.id === cur)?.version || '1'), nv = L.nextVersion(ver);
  const list = all.filter(m => m.auto === cur);
  const nEdited = list.filter(m => L.shownWording(m, lb.edits).edited).length;
  return `<section class="dsec edintro">
      <p class="sub">Changes show on <b>Link B · Review only</b> as soon as you save (the client sees them next time the page loads). Link A, the plan page, doesn't change.</p>
      <div class="btnrow"><span class="lbl edlbl">Preview as client</span>${A ? `<a class="btn sm" href="${esc(A)}" target="_blank" rel="noopener" data-preview="a">Link A ${EXT}</a>` : ''}<a class="btn sm" href="${esc(B)}" target="_blank" rel="noopener" data-preview="b">Link B ${EXT}</a></div>
    </section>
    <section class="dsec">
      <div class="edbar">
        <label class="f edpick" for="edAuto">Automation<select id="edAuto">${autoIds.map(id => `<option value="${esc(id)}" ${id === cur ? 'selected' : ''}>${esc(autoName(code, id))}</option>`).join('')}</select></label>
        <div class="edver"><span class="lbl">Version</span><b class="mono" id="edVer">v${esc(ver)}</b>${E.ver === cur ? '' : `<button class="btn sm" type="button" data-ed-ver="${esc(cur)}">Start new version…</button>`}${L.undoVersion(cur, D.content[code], file) ? `<button class="btn sm linkred" type="button" data-ed-verundo="${esc(cur)}">Undo version…</button>` : ''}</div>
      </div>
      ${E.ver === cur ? `<div class="edconfirm" role="alert"><p><b>Start version ${esc(nv)}?</b> Every message in ${esc(autoName(code, cur))} goes back to “to review” for the client, who reviews it again on Link B. Earlier responses stay in Submissions. Your current wording carries over${nEdited ? ` (${nEdited} edited message${nEdited === 1 ? '' : 's'})` : ''}.</p>
        <div class="btnrow"><button class="btn p" type="button" data-ed-ver-go="${esc(cur)}">Start v${esc(nv)}</button><button class="btn" type="button" data-ed-ver-cancel>Cancel</button></div></div>` : ''}
      <p class="sub edcount">${list.length} message${list.length === 1 ? '' : 's'}${nEdited ? ` · ${nEdited} edited` : ''}</p>
      <ul class="edlist">${list.map(m => editMsgHtml(code, m, lb)).join('')}</ul>
    </section>`;
}
function lastEditOf(code, m, versions) {
  // newest content row for this message's wording fields since the automation's current version
  const step = m.id.slice(m.id.lastIndexOf('.') + 1), rows = (D.content[code] || []).filter(c => c.automation === m.auto);
  const since = rows.filter(c => c.field === 'version' && String(c.value) === String(versions[m.auto])).map(c => String(c.timestamp)).sort().pop() || '';
  const pre = `step:${step}:`, isWording = f => String(f).startsWith(pre) && ['sms', 'body', 'email.subject', 'email.body'].includes(String(f).slice(pre.length));
  return rows.filter(c => isWording(c.field) && String(c.timestamp) >= since)
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).pop() || null;
}
function editMsgHtml(code, m, lb) {
  const w = L.shownWording(m, lb.edits), email = L.isEmailMsg(m), open = E.open === m.id, last = w.edited ? lastEditOf(code, m, lb.versions) : null;
  const kind = email ? 'Email' : (m.kind || 'Text');
  const undo = !open && w.edited && L.undoEditFields(m, D.content[code], D.files[code]) ? `<button class="btn sm linkred" type="button" data-ed-undo="${esc(m.id)}" aria-label="Undo the last edit: ${esc(m.when || m.id)}">Undo edit…</button>` : '';
  const head = `<div class="edm-h"><span class="tag tg-mut">${esc(kind)}</span><span class="edwhen">${esc(m.when || '')}${m.to ? ` · ${esc(m.to)}` : ''}</span>${w.edited ? `<span class="edtag" title="${last ? esc(`Edited ${fmtWhen(last.timestamp)}${last.edited_by ? ` by ${last.edited_by}` : ''}`) : 'Edited'}">Edited${last ? ` · ${esc(fmtDay(last.timestamp))}${last.edited_by ? ` · ${esc(last.edited_by)}` : ''}` : ''}</span>` : ''}${undo}${open ? '' : `<button class="btn sm" type="button" data-ed-open="${esc(m.id)}" aria-label="Edit ${esc(kind.toLowerCase())}: ${esc(m.when || m.id)}">Edit</button>`}</div>`;
  if (!open) return `<li class="edmsg" data-msg="${esc(m.id)}">${head}${email ? `<p class="edsubj"><span class="mut">Subject:</span> ${esc(w.subject || '')}</p>` : ''}<div class="edtext">${esc(String(w.text || '').replace(/\n{2,}/g, '\n'))}</div></li>`;
  const rows = Math.min(16, Math.max(5, String(w.text || '').split('\n').length + 2));
  return `<li class="edmsg on" data-msg="${esc(m.id)}">${head}
    <form class="dform edform" data-form="edmsg" data-msg="${esc(m.id)}">
      ${email ? `<label class="f" for="edSubj">Subject<input type="text" id="edSubj" value="${esc(w.subject || '')}" maxlength="300" required></label>` : ''}
      <label class="f" for="edText">${email ? 'Email body' : 'Text message'}<textarea id="edText" rows="${rows}" required>${esc(w.text || '')}</textarea></label>
      <p class="sub edhint">Write names as [First name], [Office phone]. They fill in for each lead.</p>
      <div data-lv-jobhost="ar:ed"></div><p class="ferr" id="edErr" role="alert"></p>
      <div class="btnrow"><button class="btn p" type="submit">Save</button><button class="btn" type="button" data-ed-cancel>Cancel</button>${w.edited ? `<button class="btn lnkbtn" type="button" data-ed-restore="${esc(m.id)}" title="Puts the original wording back in the boxes. Nothing is saved until you click Save.">Restore original</button>` : ''}</div>
    </form></li>`;
}
function renameHtml(code, name) {
  return `<form class="dsec dform" data-form="rename"><h3 class="lbl">Rename client</h3>
    <p class="sub">How the name shows on the client's review pages and here. Saved to the Sheet (Content tab), like the classic page's Rename.</p>
    <label class="f" for="renIn">Client name<input type="text" id="renIn" value="${esc(name)}" maxlength="120" required></label>
    <div class="btnrow"><button class="btn p" type="submit">Save name</button><button class="btn" type="button" data-dp="back">Cancel</button></div></form>`;
}
function clearHtml(code, name, autos) {
  const n = D.rows.filter(r => r.client === code).length;
  return `<form class="dsec dform danger" data-form="clear"><h3 class="lbl">Clear test responses</h3>
    <p class="sub">Deletes the client's responses for good (for clearing test data). The review pages and their wording stay.</p>
    <label class="f" for="clrScope">Which responses<select id="clrScope"><option value="">Every automation (${n})</option>${autos.map(a => `<option value="${esc(a.id)}">${esc(a.name)} (${D.rows.filter(r => r.client === code && r.automation === a.id).length})</option>`).join('')}</select></label>
    <label class="f" for="clrIn">Type the client name to confirm<input type="text" id="clrIn" autocomplete="off" placeholder="${esc(name)}"></label>
    <p class="ferr" id="clrErr" role="alert"></p>
    <div class="btnrow"><button class="btn danger" type="submit" id="clrGo" disabled>Delete responses</button><button class="btn" type="button" data-dp="back">Cancel</button></div></form>`;
}
function closeDetails(silent) {
  if ($('dPanel').hidden) { dpCode = null; return; }
  document.body.classList.remove('dp-open');
  for (const r of document.querySelectorAll('.lv-row.sel')) r.classList.remove('sel');
  const back = dpReturn && document.body.contains(dpReturn) ? dpReturn : document.querySelector(`.lv-row[data-client="${CSS.escape(dpCode || '')}"]`);
  dpCode = null; dpMode = null; dpReturn = null; dpTab = 'overview'; E.open = null; E.ver = null;
  // slides out, then hides (after dpCode is cleared: with reduced motion done() runs at once)
  panelClose($('dPanel'), $('dpShade'), () => { if (dpCode) return; $('dPanel').hidden = true; $('dpShade').hidden = true; $('dPanel').innerHTML = ''; $('dPanel').classList.remove('wide'); });
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
  $('screen').innerHTML = `${headHtml('subs')}
    <div class="subsbar">
      <div class="segscroll"><div class="lv-seg" role="group" aria-label="Show">${L.FILTERS.map(([k, l]) => `<button type="button" class="lv-hit" data-subs-filter="${k}" aria-pressed="${F.status === k}">${l} · ${counts[k]}</button>`).join('')}</div></div>
      <div class="subsf">
        <select id="subsClient" aria-label="Client"><option value="all">All clients</option>${clients.map(c => `<option value="${esc(c)}" ${F.client === c ? 'selected' : ''}>${esc(nameOf(c))}</option>`).join('')}</select>
        ${F.status === 'everything' ? `<select id="subsType" aria-label="Type">${L.TYPES.map(([k, l]) => `<option value="${k}" ${F.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}
        <label class="lv-search lv-hit">${SEARCH_ICON}<input type="search" id="subsQ" placeholder="Search submissions" aria-label="Search submissions" value="${esc(F.sq)}"></label>
      </div>
    </div>
    ${groups.map(g => groupHtml(g)).join('') || `<div class="lv-list lv-empty">${F.status === 'answer' ? 'Nothing to answer.' : F.status === 'waiting' ? 'Nothing waiting for a client.' : 'Nothing here.'}${q ? ' Try another search.' : ''}</div>`}`;
  if (keep === 'subsQ') { const i = $('subsQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  if (F.open) $('screen').querySelector(`[data-sub="${CSS.escape(F.open)}"]`)?.scrollIntoView({ block: 'nearest' });
}
function groupHtml(g) {
  const all = D.rows, openIdx = g.rows.findIndex(r => r.id === F.open);
  const limit = F.more.has(g.c) ? g.rows.length : Math.max(4, openIdx + 1);
  const shown = g.rows.slice(0, limit), rest = g.rows.length - shown.length;
  return `<section class="grp" aria-label="${esc(nameOf(g.c))}">
    <div class="gh"><h2 class="disp">${esc(nameOf(g.c))}</h2>${g.toAnswer ? `<span class="gcnt">${g.toAnswer} to answer</span>` : ''}${homeLink(g.c) ? `<a class="lk gopen" href="${esc(homeLink(g.c))}" target="_blank" rel="noopener">Open their review ${EXT}</a>` : '<span class="nolink gopen">No client link yet</span>'}</div>
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
      ${linkB(r.client) ? `<a role="menuitem" href="#/client/${encodeURIComponent(r.client)}/edit/${encodeURIComponent(r.automation || '')}">Edit wording (Link B)</a>` : ''}
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
// v1.13.0 (Part 2, shared shell 2.5.0): every save here ends with the Done / Didn't work popup (and a line in the bell).
// Saves take a second or two: the clicked button's gold fill is the progress; Save wording also shows the working bar.
const arJob = (o) => startJob({ tool: 'review', kind: 'other', ...o });
async function saveStatus(form) {
  if (busy) { toast('Still saving, one moment…'); return; }
  const id = form.dataset.id, client = form.dataset.client, status = form.status.value, reply = form.reply.value.trim();
  const btn = form.querySelector('[type="submit"]'); busy = true; busyButton(btn, 'Saving…', { ms: 3000 });   // v1.11.0: the gold fill (shared)
  const job = arJob({ client: nameOf(client), what: 'Save reply', title: `Saving the reply for ${nameOf(client)}…`, typicalMs: 3000 });
  try {
    const j = await post({ action: 'admin_status', client, id, status, lfmp_reply: reply, name: who('LFMP team') });
    if (!j.ok) throw new Error(j.error || 'Could not save');
    const i = D.rows.findIndex(r => r.id === id);
    if (i > -1) D.rows[i] = { ...D.rows[i], ...(j.row || { status, lfmp_reply: reply }), status: L.normStatus((j.row || {}).status || status) };
    D.log.push({ timestamp: new Date().toISOString(), client, request_id: id, event: 'status', status, note: reply, by: who('LFMP team') });
    toast('Saved. The client sees it straight away.');
    job.done({ title: 'Done: reply saved', lead: 'The client sees it straight away on Link B.', line: 'Reply saved', items: [['Status', status]] });
  } catch (err) { toast(`Couldn't save: ${err.message}`); job.fail({ reason: `Couldn't save: ${err.message}`, nothingChanged: 'the client sees the same as before.', line: 'Reply not saved', onRetry: () => saveStatus(form) }); }
  finally { busy = false; draw(); }
}
async function deleteRow(id) {
  const r = D.rows.find(x => x.id === id); if (!r) return;
  if (busy) { toast('Still saving, one moment…'); return; }
  busy = true; toast('Deleting…');
  const job = arJob({ kind: 'remove', client: nameOf(r.client), what: 'Delete response', title: `Deleting one response for ${nameOf(r.client)}…`, typicalMs: 3000 });
  try {
    const j = await post({ action: 'admin_delete', client: r.client, ids: [id] });
    if (!j.ok || !j.deleted) throw new Error(j.error || 'Not found');
    D.rows = D.rows.filter(x => x.id !== id); F.open = null; F.armed = null; toast('Deleted');
    job.done({ title: 'Done: response deleted', lead: `One response for ${nameOf(r.client)} was deleted from the Sheet.`, line: 'Response deleted' });
  } catch (err) { toast(`Couldn't delete: ${err.message}`); job.fail({ reason: `Couldn't delete: ${err.message}`, nothingChanged: true, line: 'Response not deleted' }); }
  finally { busy = false; draw(); }
}
async function rename(code, value) {
  const j = await post({ action: 'admin_edit', client: code, automation: '', field: 'client:name', value, name: who('Admin') });
  if (!j.ok) throw new Error(j.error || 'Could not save');
  D.renames[code] = value;
}
async function clearResponses(code, autoId) {
  const ids = D.rows.filter(r => r.client === code && (!autoId || r.automation === autoId)).map(r => r.id);
  if (!ids.length) return 0;
  const j = await post({ action: 'admin_delete', client: code, ids });
  if (!j.ok) throw new Error(j.error || 'Could not delete');
  D.rows = D.rows.filter(r => !ids.includes(r.id));
  return ids.length;
}

// ----- Edit tab saves (admin_edit through /api/review; the server adds the key and the first name) -----
async function saveEdits(code, automation, fields) {
  for (const [field, value] of fields) {
    const j = await post({ action: 'admin_edit', client: code, automation, field, value, name: who('Admin') });
    if (!j.ok) throw new Error(j.error || 'Could not save');
    (D.content[code] ||= []).push(j.content && j.content.field ? j.content : { timestamp: new Date().toISOString(), client: code, automation, field, value, edited_by: who('Admin') });
  }
}
async function saveMsg(form) {
  const code = dpCode, m = editMsgs(code).find(x => x.id === form.dataset.msg); if (!m) return;
  const email = L.isEmailMsg(m), subj = email ? $('edSubj').value.trim() : undefined, text = $('edText').value.replace(/\s+$/, '').replace(/^\n+/, '');
  if (email && !subj) { $('edErr').textContent = 'Add a subject.'; $('edSubj').focus(); return; }
  if (!text.trim()) { $('edErr').textContent = `Add the ${email ? 'email body' : 'text message'}.`; $('edText').focus(); return; }
  const fields = L.editFieldsFor(m, lbOf(code).edits, subj, text);
  if (!fields.length) { E.open = null; openDetails(code, 'edit'); toast('No changes'); return; }
  if (busy) { toast('Still saving, one moment…'); return; }
  // v1.14.0 (Part 4): asks first (it's on the client's page straight away)
  if (!await confirmAction({ title: `Save the new wording for ${nameOf(code)}?`, ok: 'Save wording',
    will: [['Client page', `${nameOf(code)}'s Link B shows this wording the next time it loads`], ['Sheet', 'one edit row in the Content tab (who and when)']],
    wont: ['Link A (the plan page) doesn\'t change', 'Nothing is sent to the client', 'Nothing in GHL changes'] })) return;
  const b = form.querySelector('[type="submit"]'); busy = true; busyButton(b, 'Saving…', { ms: 3000 }); $('edErr').textContent = '';
  const job = arJob({ client: nameOf(code), what: 'Save wording', title: `Saving the new wording for ${nameOf(code)}…`, host: 'ar:ed', typicalMs: 3000 });
  try {
    await saveEdits(code, m.auto, fields); E.open = null; toast('Saved. Link B shows the new wording.'); openDetails(code, 'edit'); $('dPanel').querySelector(`[data-ed-open="${CSS.escape(m.id)}"]`)?.focus();
    job.done({ title: 'Done: wording saved', lead: `The client's Link B shows the new wording for ${nameOf(code)} straight away.`, line: 'Wording saved', items: [['Shows on', 'Link B (the client\'s page)']] });
  }
  catch (err) { $('edErr').textContent = `Couldn't save: ${err.message}`; b.disabled = false; b.textContent = 'Save'; job.fail({ reason: `Couldn't save: ${err.message}`, nothingChanged: 'Link B shows the same wording as before.', line: 'Wording not saved' }); }
  finally { busy = false; }
}
async function startVersion(code, auto) {
  if (busy) { toast('Still saving, one moment…'); return; }
  const lb = lbOf(code), ver = lb.versions[auto] ?? String(D.files[code]?.automations?.find(a => a.id === auto)?.version || '1'), nv = L.nextVersion(ver);
  // Link B drops an automation's wording edits when a new version starts, so the current wording is saved again after it.
  const carry = editMsgs(code).filter(m => m.auto === auto).map(m => [m, L.shownWording(m, lb.edits)]).filter(([, w]) => w.edited);
  busy = true; const b = $('dPanel').querySelector('[data-ed-ver-go]'); if (b) busyButton(b, 'Starting…', { ms: 3000 });
  const job = arJob({ client: nameOf(code), what: 'Start new version', title: `Starting version ${nv} for ${nameOf(code)}…`, typicalMs: 4000 });
  try {
    await saveEdits(code, auto, [['version', nv]]);
    for (const [m, w] of carry) await saveEdits(code, auto, L.editFieldsFor(m, {}, w.subject, w.text));
    E.ver = null; toast(`Version ${nv} started. The client reviews it again on Link B.`);
    job.done({ title: `Done: version ${nv} started`, lead: 'The client reviews this automation again on Link B. Earlier answers are kept.', line: `Version ${nv} started` });
  } catch (err) { toast(`Couldn't start the new version: ${err.message}`); job.fail({ reason: `Couldn't start the new version: ${err.message}`, line: 'New version not started' }); }
  finally { busy = false; openDetails(code, 'edit'); drawHome(); }
}

// ---------- v1.14.0 (Part 4): undo an edit / a version; remove a client's review package ----------
// Undo = rows that bring back what Link B showed before (nothing is deleted from the Sheet; the history keeps both).
async function undoEdit(code, msgId) {
  const m = editMsgs(code).find(x => x.id === msgId); if (!m || busy) return;
  const u = L.undoEditFields(m, D.content[code], D.files[code]); if (!u) { toast('Nothing to undo for this message'); return; }
  const name = nameOf(code);
  if (!await confirmAction({ title: `Undo the last edit for ${name}?`, danger: true, typeName: name, ok: 'Undo edit',
    will: [['Client page', `Link B shows the wording from before that edit: "${String(u.before.text || '').slice(0, 80)}${String(u.before.text || '').length > 80 ? '…' : ''}"`], ['Sheet', 'new Content rows that bring it back (the edit stays in the history)']],
    wont: ['Nothing is deleted from the Sheet', 'The client\'s answers are kept', 'Nothing in GHL changes'] })) return;
  busy = true;
  const job = arJob({ kind: 'remove', client: name, what: 'Undo edit', title: `Bringing back the earlier wording for ${name}…`, host: 'ar:ed', typicalMs: 3000 });
  try { await saveEdits(code, m.auto, u.fields); await logRemoval(code, 'wording edit', `${m.id} (undone)`); openDetails(code, 'edit'); job.done({ title: 'Done: edit undone', lead: `Link B shows the earlier wording for ${name} again.`, line: 'Edit undone' }); }
  catch (err) { job.fail({ reason: `Couldn't save: ${err.message}`, nothingChanged: 'Link B shows the same wording as before.', line: 'Edit not undone' }); }
  finally { busy = false; }
}
async function undoVer(code, auto) {
  const u = L.undoVersion(auto, D.content[code], D.files[code]); if (!u || busy) return;
  const name = nameOf(code), lb = lbOf(code);
  if (!await confirmAction({ title: `Undo version ${u.from} for ${name}?`, danger: true, typeName: name, ok: `Back to v${u.to}`,
    will: [['Client page', `${autoName(code, auto)} on Link B goes back to version ${u.to}, with the wording it shows now`], ['Sheet', 'new Content rows (the version stays in the history)']],
    wont: ['Nothing is deleted from the Sheet', 'Answers for both versions are kept', 'Nothing in GHL changes'] })) return;
  busy = true;
  const carry = editMsgs(code).filter(m => m.auto === auto).map(m => [m, L.shownWording(m, lb.edits)]).filter(([, w]) => w.edited);
  const job = arJob({ kind: 'remove', client: name, what: 'Undo version', title: `Going back to version ${u.to} for ${name}…`, typicalMs: 4000 });
  try {
    await saveEdits(code, auto, [['version', u.to]]);
    for (const [m, w] of carry) await saveEdits(code, auto, L.editFieldsFor(m, {}, w.subject, w.text));
    await logRemoval(code, 'review version', `${auto} v${u.from} → v${u.to}`);
    job.done({ title: `Done: back to version ${u.to}`, lead: `${autoName(code, auto)} on Link B is version ${u.to} again.`, line: `Version ${u.from} undone` });
  } catch (err) { job.fail({ reason: `Couldn't save: ${err.message}`, line: 'Version not undone' }); }
  finally { busy = false; openDetails(code, 'edit'); drawHome(); }
}
// The Builder record that made this client's package (Remove runs the Builder's review-remove.yml, as its Review tab does).
const BUILDER = '/repos/peejayedz/ghl-subaccount-builder';
// v1.14.1: the shared loader gives short rows ({ id, reviewCode, … }), so match on reviewCode, then read that one record
// in full (its review.status says published / preview / removed). A read that fails → null (Remove then says so).
async function builderRecordFor(code, { removable = false } = {}) {
  const recs = await loadBuilderRecords({ fresh: true }).catch(() => []);
  const row = (recs || []).find(r => r.reviewCode === code); if (!row) return null;
  try {
    const r = await ghFetch('GET', `${BUILDER}/contents/records/${row.id}.json?ref=main`, null, { raw: true }); if (!r.ok) return null;
    const rec = JSON.parse(await r.text());
    if (rec?.id !== row.id || rec.review?.code !== code || rec.review?.status === 'removed') return null;
    // removable: only a package the Builder made (as its Review tab: preview / published / publish failed), not "linked"
    return !removable || ['preview', 'published', 'publish_failed'].includes(rec.review?.status) ? rec : null;
  } catch { return null; }
}
async function logRemoval(code, what, detail) {   // on the Builder record when there is one (who, when, what); never blocks
  try {
    const rec = await builderRecordFor(code); if (!rec) return;
    const path = `${BUILDER}/contents/records/${rec.id}.json`;
    const cur = await (await ghFetch('GET', `${path}?ref=main`)).json();
    const x = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cur.content.replace(/\s/g, '')), c => c.charCodeAt(0))));
    x.removals = [...(x.removals || []), { what, at: new Date().toISOString(), by: who('Review admin'), detail }];
    const b = new TextEncoder().encode(JSON.stringify(x, null, 2) + '\n'); let bin = ''; for (const c of b) bin += String.fromCharCode(c);
    await ghFetch('PUT', path, { message: `${x.businessName || code}: ${what} undone in Review admin`, content: btoa(bin), sha: cur.sha, branch: 'main' });
  } catch {}
}
async function removePackage(code) {
  const name = nameOf(code), rec = await builderRecordFor(code, { removable: true });
  if (!rec) { await confirmAction({ title: `${name}'s package wasn't made in the Builder`, lead: 'Only packages made in the Builder can be removed from here. Ask PJ to take this one off by hand.', ok: 'OK' }); return; }
  const published = ['published', 'publish_failed'].includes(rec.review?.status);
  if (!await confirmAction({ title: `Remove ${name}'s review package?`, danger: true, typeName: name, ok: 'Remove review package',
    will: published ? [['Client pages', `Link A and Link B say "This review isn't available. Your ${String(rec.brand || '').toUpperCase() === 'WPP' ? 'WPP' : 'LFMP'} team will be in touch."`], ['automation-review', `the package's 3 files (${code}) are replaced by a small "removed" note`], ['Builder', 'the preview and the links A / B on the client record']]
      : [['Builder', 'the review package preview (never published: nothing on the client\'s pages)']],
    wont: ['The client\'s earlier answers and Submissions are kept (the Sheet isn\'t touched)', 'Nothing in GHL is deleted: no workflow, template or contact', `The code ${code} stays with this client`] })) return;
  const rid = `ar-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, t0 = Date.now();
  const job = arJob({ kind: 'remove', client: name, what: 'Remove review package', title: `Removing ${name}'s review package…`, typicalMs: 90000,
    check: { repo: 'peejayedz/ghl-subaccount-builder', workflow: 'review-remove.yml', title: `review-remove ${rid}` } });
  try {
    const r = await ghFetch('POST', `${BUILDER}/actions/workflows/review-remove.yml/dispatches`, { ref: 'main', inputs: { payload: JSON.stringify({ recordId: rec.id, by: who('Review admin') }), request_id: rid } });
    if (!r.ok) throw new Error(`GitHub didn't start it (${r.status}). Nothing was removed.`);
    for (;;) {
      await new Promise(res => setTimeout(res, 5000));
      const fr = await ghFetch('GET', `${BUILDER}/contents/runs/review-remove-${rid}.json?ref=main`, null, { raw: true });
      if (fr.status === 404) { if (Date.now() - t0 > 3 * 60e3) throw new Error('GitHub didn\'t start the remove within 3 minutes. Nothing was removed. Try again.'); continue; }
      const f = JSON.parse(await fr.text());
      job.progress(['check', 'commit', 'save'].filter(k => f.steps?.[k]?.state === 'ok').length / 3);
      if (f.status === 'failed') throw new Error(f.error?.message || 'The remove stopped.');
      if (f.status === 'done') break;
      if (Date.now() - t0 > 10 * 60e3) throw new Error('The remove is taking longer than expected. Check again later; it keeps going on GitHub.');
    }
    job.done({ title: 'Done: review package removed', lead: published ? `Link A and Link B now say "This review isn't available". ${name}'s answers and Submissions are kept.` : 'The preview is gone. Nothing was on the client\'s pages.', line: 'Review package removed',
      items: [...(published ? [['Client pages', 'say it isn\'t available']] : []), ['Answers + Submissions', 'kept'], ['GHL', 'nothing changed']] });
    load();
  } catch (err) { job.fail({ reason: err.message, nothingChanged: /Nothing was removed/.test(err.message), line: 'Review package not removed', onRetry: () => removePackage(code) }); }
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
  // v1.7.0: a copied Link A / B counts as sent (saved on the client's Builder record, if it has one)
  const k = btn.closest('li[data-link]')?.dataset.link;
  if (ok && dpCode && (k === 'a' || k === 'b')) await markSent(dpCode, k.toUpperCase());
}

// Unsaved wording in the open message form?
function edDirty() {
  const m = E.open && editMsgs(dpCode).find(x => x.id === E.open); if (!m || !$('edText')) return false;
  const w = L.shownWording(m, lbOf(dpCode).edits);
  return $('edText').value !== (w.text || '') || ($('edSubj') && $('edSubj').value !== (w.subject || ''));
}

// ---------- dialog (reserved for future confirmations; Esc closes) ----------
function closeDialog() { $('ovl').hidden = true; $('dlg').innerHTML = ''; }

// ---------- events ----------
// v1.10.0: header shadow once the details body scrolls
document.addEventListener('scroll', e => { const b = e.target; if (b?.classList?.contains('dbody')) b.closest('.dpanel')?.classList.toggle('scrolled', b.scrollTop > 4); }, true);
document.addEventListener('click', async e => {
  const m = e.target.closest('[data-menu]');
  if (m) { const menu = $(m.dataset.menu); const open = menu.hidden; closeMenus(); menu.hidden = !open; m.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button,a')?.focus(); return; }
  if (!e.target.closest('.menu')) closeMenus();
  const cp = e.target.closest('[data-copy]'); if (cp) { copyLink(cp); return; }
  if (e.target.closest('#dpShade')) { closeDetails(); return; }
  if (e.target.closest('[data-brand-all]')) { F.brand = setBrandFilter('all'); F.home = 'all'; drawHome(); return; }   // v1.15.0: empty view → Show all
  const hf = e.target.closest('[data-home-filter], [data-lv-seg]'); if (hf) { F.home = hf.dataset.homeFilter || hf.dataset.lvSeg; if (route().screen !== 'home') go('#/'); else drawHome(); return; }
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
  const eo = e.target.closest('[data-ed-open]');
  if (eo) { if (E.open && edDirty()) { toast('Save or cancel the message you\'re editing first'); $('edText')?.focus(); return; } E.open = eo.dataset.edOpen; E.ver = null; openDetails(dpCode, 'edit'); $('edSubj')?.focus() || $('edText')?.focus(); return; }
  if (e.target.closest('[data-ed-cancel]')) { const id = E.open; E.open = null; openDetails(dpCode, 'edit'); $('dPanel').querySelector(`[data-ed-open="${CSS.escape(id || '')}"]`)?.focus(); return; }
  const er = e.target.closest('[data-ed-restore]');
  if (er) { const m = editMsgs(dpCode).find(x => x.id === er.dataset.edRestore); if (m) { if ($('edSubj')) $('edSubj').value = m.subject || ''; $('edText').value = m.text || ''; toast('Original wording put back. Click Save to use it.'); } return; }
  const ev = e.target.closest('[data-ed-ver]'); if (ev) { E.ver = ev.dataset.edVer; E.open = null; openDetails(dpCode, 'edit'); $('dPanel').querySelector('[data-ed-ver-go]')?.focus(); return; }
  if (e.target.closest('[data-ed-ver-cancel]')) { E.ver = null; openDetails(dpCode, 'edit'); return; }
  const eg = e.target.closest('[data-ed-ver-go]'); if (eg) { await startVersion(dpCode, eg.dataset.edVerGo); return; }
  if (e.target.closest('[data-dp-rmpkg]')) { closeMenus(); removePackage(dpCode); return; }   // v1.14.0 (Part 4)
  const eu = e.target.closest('[data-ed-undo]'); if (eu) { undoEdit(dpCode, eu.dataset.edUndo); return; }
  const vu = e.target.closest('[data-ed-verundo]'); if (vu) { undoVer(dpCode, vu.dataset.edVerundo); return; }
  const dp = e.target.closest('[data-dp]');
  if (dp) { closeMenus(); dpMode = dp.dataset.dp === 'back' ? null : dp.dataset.dp; openDetails(dpCode, dpTab); return; }
  if (e.target.closest('[data-row-stop]')) return;      // links inside a row work as links
  const row = e.target.closest('.lv-row[data-client]'); if (row) { go(`#/client/${encodeURIComponent(row.dataset.client)}`); return; }   // the whole row opens Details
  const a = e.target.closest('[data-act]'); if (!a) return;
  closeMenus();
  if (a.dataset.act === 'signout') signOut();   // the "not ready" screen (the shell's Me has its own Sign out)
  else if (a.dataset.act === 'reload') { await load(); toast('Refreshed'); }
  else if (a.dataset.act === 'closedet') closeDetails();
  else if (a.dataset.act === 'gohome') go('#/');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.querySelector('.menu:not([hidden])')) { closeMenus(); return; }
    if (!$('ovl').hidden) { closeDialog(); return; }
    if (!$('dPanel').hidden) {
      if (dpMode) { dpMode = null; openDetails(dpCode, dpTab); }
      else if (E.ver) { E.ver = null; openDetails(dpCode, 'edit'); }
      else if (E.open) { const id = E.open; E.open = null; openDetails(dpCode, 'edit'); $('dPanel').querySelector(`[data-ed-open="${CSS.escape(id)}"]`)?.focus(); }
      else closeDetails();
      return;
    }
    if (F.armed) { F.armed = null; drawSubs(); return; }
    if (F.open && route().screen === 'subs') { const id = F.open; F.open = null; drawSubs(); $('screen').querySelector(`[data-sub="${CSS.escape(id)}"]`)?.focus(); }
    return;
  }
  // Enter / Space on a list row: the shell clicks it (lfmp-session.js), which opens Details
});
document.addEventListener('input', e => {
  if (e.target.id === 'homeQ') { F.q = e.target.value; drawHome(); }
  else if (e.target.id === 'subsQ') { F.sq = e.target.value; drawSubs(); }
  else if (e.target.id === 'clrIn') { $('clrGo').disabled = e.target.value.trim().toLowerCase() !== nameOf(dpCode).trim().toLowerCase(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'subsClient') { F.client = e.target.value; F.open = null; F.more.clear(); go(F.client === 'all' ? '#/subs' : `#/subs/${encodeURIComponent(F.client)}`); }
  else if (e.target.id === 'subsType') { F.type = e.target.value; drawSubs(); }
  else if (e.target.id === 'edAuto') { E.auto[dpCode] = e.target.value; E.open = null; E.ver = null; openDetails(dpCode, 'edit'); $('edAuto')?.focus(); }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  if (f.dataset.form === 'status') return saveStatus(f);
  if (f.dataset.form === 'edmsg') return saveMsg(f);
  if (f.dataset.form === 'rename') {
    const v = $('renIn').value.trim(); if (!v) { $('renIn').focus(); return; }
    if (v === nameOf(dpCode)) { dpMode = null; openDetails(dpCode, dpTab); toast('No changes'); return; }
    const b = f.querySelector('[type="submit"]'); busyButton(b, 'Saving…', { ms: 3000 });
    const job = arJob({ client: nameOf(dpCode), what: 'Rename client', title: `Saving the new name…`, typicalMs: 3000 });
    try { await rename(dpCode, v); dpMode = null; toast('Client name saved'); drawHome(); openDetails(dpCode, dpTab); job.done({ title: 'Done: client name saved', lead: `Shown as "${v}" in Review admin.`, line: 'Client name saved' }); }
    catch (err) { toast(`Couldn't save: ${err.message}`); b.disabled = false; b.textContent = 'Save name'; job.fail({ reason: `Couldn't save: ${err.message}`, nothingChanged: true, line: 'Name not saved' }); }
    return;
  }
  if (f.dataset.form === 'clear') {
    if ($('clrIn').value.trim().toLowerCase() !== nameOf(dpCode).trim().toLowerCase()) { $('clrErr').textContent = 'Type the client name exactly to confirm.'; return; }
    const b = $('clrGo'); busyButton(b, 'Deleting…', { ms: 4000 });
    const nm = nameOf(dpCode), job = arJob({ kind: 'remove', client: nm, what: 'Clear test responses', title: `Deleting ${nm}'s test responses…`, typicalMs: 4000 });
    try { const n = await clearResponses(dpCode, $('clrScope').value); dpMode = null; toast(n ? `Cleared ${n} response${n === 1 ? '' : 's'}` : 'Nothing to clear'); drawHome(); openDetails(dpCode, dpTab); job.done({ title: n ? 'Done: responses cleared' : 'Done: nothing to clear', lead: n ? `${n} response${n === 1 ? '' : 's'} for ${nm} deleted from the Sheet.` : `${nm} had no responses to clear.`, line: n ? `Cleared ${n} response${n === 1 ? '' : 's'}` : 'Nothing to clear' }); }
    catch (err) { $('clrErr').textContent = `Couldn't clear: ${err.message}`; b.disabled = false; b.textContent = 'Delete responses'; job.fail({ reason: `Couldn't clear: ${err.message}`, nothingChanged: true, line: 'Responses not cleared' }); }
  }
});

// ---------- start ----------
await start();
