// The greeting's "reviews need you" (v1.12.1, shell v2.4.1): the Reviews list's load and its "Needs you" filter as ONE
// set of functions that the page (admin.js) and the greeting both use, so the greeting's number always equals the filter.
// readCount() is what the other two tools' greetings call (lfmp-session.js readOtherCount): the same read-only calls this
// page makes on load (the data/ and plans/ lists on GitHub through /api/gh, admin_ping + admin_all through /api/review,
// the public data files and Content reads, the Builder records), then the same count. No writes, no GHL, no DOM; the
// caller passes its own api / ghFetch / loadBuilderRecords. Never shown on screen.
import * as L from './review-logic.mjs?v=1.12.1';
import { displayName } from './lfmp-session.js';

export const TESTS_KEY = 'ar-admin-tests';   // Me → "Show test clients" (per browser), as the list
const REPO_PATH = '/repos/peejayedz/automation-review';
const LIST_PATH = `${REPO_PATH}/contents/data?ref=main`;
const PLANS_PATH = `${REPO_PATH}/contents/plans?ref=main`;   // hand-made plans/<code>.html pages
// On the team-only admin site the client pages and data/ aren't there: they're read from the public site. Elsewhere
// (local tests): next door to admin/.
export const PUBLIC_BASE = 'https://dashboard.lawfirmmarketingpros.com/automation-review/';
export const baseFor = (host = globalThis.location?.hostname || '') => (/(^|\.)lfmp-admin\.pages\.dev$/.test(host) ? PUBLIC_BASE : new URL('../', import.meta.url).href);

// Admin actions through the team site's server (no key here). A refusal or a network error is retried once: the first
// call after the Apps Script sits idle can fail.
export const makePost = api => async obj => {
  let last;
  for (let i = 0; i < 2; i++) {
    try { return await api('review', obj); } catch (e) { last = e; if (e.status === 401 || e.status === 403) break; }
  }
  throw new Error(last?.code === 'network' || last?.code === 'upstream' ? `Couldn't reach the review backend (${last.message}).` : (last?.message || "Couldn't reach the review backend."));
};
export async function listData(ghFetch) {
  // plans/ is optional (most clients have none): any failure there just means "no plans/ page"
  const [r, plans] = await Promise.all([ghFetch('GET', LIST_PATH), ghFetch('GET', PLANS_PATH).then(x => (x.ok ? x.json() : [])).catch(() => [])]);
  if (!r.ok) throw new Error(r.status === 403 ? 'GitHub refused the client list (the team site\'s GitHub token may be missing a permission). Tell PJ.' : `Couldn't list review clients from GitHub (HTTP ${r.status}).`);
  const names = (await r.json()).map(f => f.name);
  const codes = names.filter(n => /^[a-z0-9-]+\.json$/.test(n)).map(n => n.slice(0, -5));
  const plansPage = new Set((Array.isArray(plans) ? plans : []).map(f => f.name).filter(n => /^[a-z0-9-]+\.html$/.test(n)).map(n => n.slice(0, -5)));
  return { codes, plansPage, plan: new Set(names.filter(n => n.endsWith('.plan.json')).map(n => n.slice(0, -10))), messages: new Set(names.filter(n => n.endsWith('.messages.json')).map(n => n.slice(0, -14))) };
}
// The Builder records (lfmp-session.js loadBuilderRecords): all of them, and the ones with a review code by code.
export async function loadSent(loadBuilderRecords) {
  const recs = await loadBuilderRecords({ fresh: true });
  const out = {};
  for (const rec of recs) if (rec.reviewCode) out[rec.reviewCode] = { id: rec.id, name: rec.name, linkSent: rec.linkSent || null };
  return { recs, sent: out };
}
// The page's whole load. io: { post, ghFetch, loadBuilderRecords, saveUrl, base, fetch }. messages: also read Link B's
// messages files (the Edit tab; the count doesn't need them). current(): false = a newer load started (stop quietly).
export async function readData(io, { messages = false, current = () => true } = {}) {
  const get = io.fetch || globalThis.fetch.bind(globalThis);
  const sentP = loadSent(io.loadBuilderRecords);   // Builder records (Link A/B sent), alongside; never fails
  const D = await listData(io.ghFetch);
  if (!D.codes.length) throw new Error('No review clients found in the repo.');
  const ping = await io.post({ action: 'admin_ping', client: D.codes[0] });
  if (!current()) return null;
  if (!ping?.ok) throw new Error(ping?.error ? `The review backend refused the team site's admin key (${ping.error}). Tell PJ: REVIEW_ADMIN_KEY in Cloudflare must match ADMIN_KEY in the Apps Script.` : "The review backend didn't answer.");
  const msgCodes = messages ? D.codes.filter(c => D.messages.has(c)) : [];
  const [all, files, content, msgs] = await Promise.all([
    io.post({ action: 'admin_all', client: D.codes[0] }),
    Promise.all(D.codes.map(c => get(`${io.base}data/${encodeURIComponent(c)}.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null))),
    // renames live in the Content tab: the same public read the client page makes (GET ?client=)
    Promise.all(D.codes.map(c => get(`${io.saveUrl}?client=${encodeURIComponent(c)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null))),
    // Link B's messages (the Edit tab edits exactly these)
    Promise.all(msgCodes.map(c => get(`${io.base}data/${encodeURIComponent(c)}.messages.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null))),
  ]);
  if (!current()) return null;
  if (!all?.ok) throw new Error(all?.error || "The backend didn't return the submissions.");
  D.files = Object.fromEntries(D.codes.map((c, i) => [c, files[i]]));
  D.names = { ...(ping.names || {}), ...(all.clients || {}) };
  D.renames = {};
  D.content = Object.fromEntries(D.codes.map((c, i) => [c, Array.isArray(content[i]?.content) ? content[i].content : []]));
  D.msgs = Object.fromEntries(msgCodes.map((c, i) => [c, msgs[i]]));
  D.codes.forEach((c, i) => { const ren = (content[i]?.content || []).filter(x => String(x.field) === 'client:name' && String(x.value || '').trim()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).pop(); if (ren) D.renames[c] = String(ren.value).trim(); });
  D.rows = (all.rows || []).map(r => (L.isReq(r) ? { ...r, status: L.normStatus(r.status) || L.ST.REQ } : r));
  D.log = all.log || [];
  Object.assign(D, await sentP);
  return D;
}

// ---------- the list's rules (D = the loaded data, as admin.js keeps it) ----------
// One display name per client in all three tools: the Builder record's name (by review code); else a rename (Content
// tab, newest wins) > the data file's name > the Sheet tab name. Display only.
export const nameOf = (D, c) => displayName(D.sent[c]?.name || D.renames[c] || D.files[c]?.client?.name || D.names[c] || L.prettyClient(c));
export const isTest = (D, c) => L.isTestClient(c, nameOf(D, c));
export const clientsAll = D => [...new Set([...D.codes, ...D.rows.map(r => r.client)])].filter(Boolean);
export const visibleClients = (D, showTests) => clientsAll(D).filter(c => showTests || !isTest(D, c));
// Link A = plans/<code>.html or plan.html?c=; Link B = messages.html?c= (admin.js builds the addresses).
export const hasLinkA = (D, c) => D.plansPage.has(c) || D.plan.has(c);
export const hasLinkB = (D, c) => D.messages.has(c);
export const lbOf = (D, c) => L.linkB(D.content[c] || [], D.files[c]);
export const sumOf = (D, c) => { const s = L.summarize(c, D.files[c], D.rows, lbOf(D, c).versions); return { ...s, state: L.homeState(s.state, hasLinkA(D, c) || hasLinkB(D, c)) }; };
// The home filter counts ("All · Needs you · n · Waiting · Not sent · Done"): f = need | wait | unsent | done.
export function homeCounts(D, showTests) {
  const st = visibleClients(D, showTests).map(c => sumOf(D, c).state), n = f => st.filter(x => L.inHome(f, x)).length;
  return { clients: st.length, need: n('need'), wait: n('wait'), unsent: n('unsent') };
}

// The Review backend address (config.js, already public): this page's window.REVIEW_CONFIG, else read from the file.
async function saveUrlOf() {
  const own = String(globalThis.REVIEW_CONFIG?.saveUrl || '').trim();
  if (own) return own;
  const t = await (await fetch(new URL('../config.js', import.meta.url), { cache: 'no-store' })).text();
  return /saveUrl\s*:\s*["']([^"']+)["']/.exec(t)?.[1] || '';
}
export async function readCount({ api, ghFetch, loadBuilderRecords, store = globalThis.localStorage } = {}) {
  const saveUrl = await saveUrlOf();
  if (!saveUrl) return {};
  const D = await readData({ post: makePost(api), ghFetch, loadBuilderRecords, saveUrl, base: baseFor() });
  let showTests = false; try { showTests = store?.getItem(TESTS_KEY) === '1'; } catch {}
  return { reviews: homeCounts(D, showTests).need };
}
