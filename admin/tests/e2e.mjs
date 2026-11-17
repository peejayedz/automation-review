// Review admin v1.7.0 (redesign v2 shell: top bar, Me, bottom tabs, shared list) in Chromium, against the REAL team-site server (ghl-subaccount-builder/admin-site/lib/api.mjs) with a
// stand-in for Cloudflare Access (test-access.mjs) and the real Code.gs in a mock (tests/mock/apps-script.mjs):
// Google-only sign-in (name + Sign out, no password or key anywhere, nothing secret in browser storage, signed out →
// /signin/?next=…, non-LFMP account refused), home, Details (client links, Copy, links not opened yet), Submissions, every admin
// action through /api/review (the server adds the key and the first name), the new Edit wording page (every edit type),
// the public index.html without any admin code path, light/dark at 1440 and 390, AA contrast, no sideways scroll.
// Needs the sibling repo ../ghl-subaccount-builder (playwright-core, the Code.gs mock, the server). Writes nothing in any repo.
// Run: CHROMIUM_PATH=… node admin/tests/e2e.mjs [screenshot folder]
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AR = fileURLToPath(new URL('../../', import.meta.url));
const B = join(AR, '../ghl-subaccount-builder');
const OUT = process.argv[2] || join(B, 'test-results/review-admin');
await mkdir(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(join(B, 'node_modules/playwright-core/index.mjs')).href);
const { loadCodeGs } = await import(pathToFileURL(join(B, 'tests/mock/apps-script.mjs')).href);
const { createTestAccess, TEST_REVIEW_KEY, TEST_TOKEN } = await import(pathToFileURL(join(B, 'admin-site/lib/test-access.mjs')).href);

const KEY = TEST_REVIEW_KEY;   // the Apps Script ADMIN_KEY = the server's REVIEW_ADMIN_KEY; the browser never sees it
const ME_EMAIL = 'pj@lawfirmmarketingpros.com';
const ACCESS = createTestAccess({ names: { [ME_EMAIL]: 'PJ Drozo' } });
const SIGNED = { email: ME_EMAIL };     // who Access says is signed in (null = signed out)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const LIST = await readdir(join(AR, 'data'));
const PLANS = await readdir(join(AR, 'plans')).catch(() => []);   // hand-made plans/<code>.html (Mahdavi)
const CODES = LIST.filter(n => /^[a-z0-9-]+\.json$/.test(n)).map(n => n.slice(0, -5));
const DATA = Object.fromEntries(await Promise.all(CODES.map(async c => [c, JSON.parse(await readFile(join(AR, 'data', `${c}.json`), 'utf8'))])));

// ---- backend: real Code.gs, seeded like real use
function seed() {
  const gs = loadCodeGs({ props: { ADMIN_KEY: KEY, CLIENTS: CODES.join(',') } });
  const say = (client, o) => gs.post({ client, name: 'Test Client', email: 'client@example.test', ...o }).row;
  const dumas = DATA['dumas-sanclemente-mo5cay'].automations, mah = DATA['mahdavi-law-mc1mar'].automations, boca = DATA['boca-dental-e770de'].automations, zz = DATA['zz-test-2-qpqhx7'].automations;
  const ids = {};
  for (let i = 0; i < 6; i++) ids[`d${i}`] = say('dumas-sanclemente-mo5cay', { automation: dumas[i % dumas.length].id, version: dumas[i % dumas.length].version, step: `s${i + 1}`, step_title: `Email ${i + 1}: Dumas step ${i + 1}`, action: i === 1 ? 'copy' : 'change', type: 'Change timing', details: `Please change step ${i + 1}`, new_copy: i === 1 ? 'Hi [First name],\nYour appointment is starting now.' : '' }).id;
  gs.post({ action: 'admin_status', key: KEY, client: 'dumas-sanclemente-mo5cay', id: ids.d5, status: 'In Progress', lfmp_reply: 'Working on it', name: 'PJ' });
  ids.m0 = say('mahdavi-law-mc1mar', { automation: mah[0].id, version: mah[0].version, step: 's1', step_title: 'Text 1: Missed you', action: 'change', type: 'Change timing', details: 'Send later' }).id;
  gs.post({ action: 'admin_status', key: KEY, client: 'mahdavi-law-mc1mar', id: ids.m0, status: 'Updated — Ready for Review', lfmp_reply: 'Moved to 10 minutes', name: 'PJ' });
  say('mahdavi-law-mc1mar', { automation: mah[0].id, version: mah[0].version, step: 'q1', step_title: 'Who gets the alert?', action: 'answer', details: 'Cyrus' });
  say('mahdavi-law-mc1mar', { automation: mah[1].id, version: mah[1].version, step: 's2', step_title: 'Email 2', action: 'approve' });
  ids.b0 = say('boca-dental-e770de', { automation: boca[0].id, version: boca[0].version, step: 's1', step_title: 'Text 1: Welcome', action: 'change', type: 'Something else', details: 'Fine now' }).id;
  say('boca-dental-e770de', { automation: boca[0].id, version: boca[0].version, step: 's1', step_title: 'Text 1: Welcome', action: 'approve' });    // replaces b0
  say('boca-dental-e770de', { automation: boca[0].id, version: boca[0].version, action: 'approve_all' });
  ids.p0 = say('palm-beach-plastic-n9umxi', { automation: DATA['palm-beach-plastic-n9umxi'].automations[0].id, version: DATA['palm-beach-plastic-n9umxi'].automations[0].version, step: 's1', step_title: 'Email 1: Thanks for claiming our offer', action: 'change', type: 'Change timing', details: 'One day later' }).id;
  ids.z0 = say('zz-test-2-qpqhx7', { automation: zz[0].id, version: zz[0].version, step: 's1', step_title: 'ZZ step', action: 'change', type: 'Change timing', details: 'Test' }).id;
  ids.z1 = say('zz-test-2-qpqhx7', { automation: zz[1].id, version: zz[1].version, step: 's2', step_title: 'ZZ step 2', action: 'answer', details: 'x' }).id;
  return { gs, ids };
}
let { gs, ids } = seed();
const posts = [];       // every POST that reached the Apps Script (admin actions arrive through the server)
const ghCalls = [];     // every GitHub call the server made
// v1.7.0: the Builder's client records (private repo) carry review.linkSent ("Link A sent · Nov 16"). Mahdavi has a record
// (Link A sent 16 Nov, 15:00 UTC = 16 Nov in every US/Asia time zone); ZZ TEST 2 and the classic clients have none; one
// record has no review package. BREC.fail = 'read' | 'put' makes GitHub answer 500.
const BREC = { fail: null, puts: [], files: {
  'mahdavi-law-firm-ab12cd': { sha: 'a'.repeat(40), rec: { id: 'mahdavi-law-firm-ab12cd', businessName: 'The Mahdavi Law Firm', status: 'ready', review: { status: 'linked', code: 'mahdavi-law-mc1mar', linkSent: { link: 'A', at: '2026-11-16T15:00:00Z', by: 'PJ Drozo' } } } },
  'no-review-ef34gh': { sha: 'b'.repeat(40), rec: { id: 'no-review-ef34gh', businessName: 'No Review Firm', status: 'ready' } },
} };
const B_RECS = '/repos/peejayedz/ghl-subaccount-builder/contents/records';
function builderGh(method, path, body, headers) {
  if (BREC.fail === 'read' && method === 'GET') return { status: 500, body: { message: 'Server Error' } };
  if (method === 'GET' && path === `${B_RECS}?ref=main`) return { body: Object.keys(BREC.files).map(id => ({ name: `${id}.json`, type: 'file' })) };
  const m = path.match(/^\/repos\/peejayedz\/ghl-subaccount-builder\/contents\/records\/([a-z0-9-]+)\.json(\?ref=main)?$/);
  const f = m && BREC.files[m[1]];
  if (!f) return { status: 404, body: { message: 'Not Found' } };
  if (method === 'GET') return /raw/.test(headers.Accept || '') ? { body: JSON.stringify(f.rec), type: 'text/plain' } : { body: { sha: f.sha, content: Buffer.from(JSON.stringify(f.rec)).toString('base64') } };
  if (method === 'PUT') {
    if (BREC.fail === 'put') return { status: 500, body: { message: 'Server Error' } };
    if (body.sha !== f.sha) return { status: 409, body: { message: 'sha mismatch' } };
    f.rec = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')); f.sha = (Number.parseInt(f.sha.slice(0, 8), 16) + 1).toString(16).padStart(8, '0') + f.sha.slice(8);
    BREC.puts.push({ id: m[1], message: body.message, linkSent: f.rec.review?.linkSent });
    return { status: 200, body: { content: { sha: f.sha } } };
  }
  return { status: 404, body: { message: 'Not Found' } };
}
const ENV = ACCESS.env();
const DEPS = ACCESS.deps({
  github: (method, path, body, headers = {}) => {
    ghCalls.push(`${method} ${path}`);
    if (path.startsWith('/repos/peejayedz/ghl-subaccount-builder/')) return builderGh(method, path, body, headers);
    if (method === 'GET' && path === '/repos/peejayedz/automation-review/contents/data?ref=main') return { body: LIST.map(name => ({ name, type: 'file' })) };
    if (method === 'GET' && path === '/repos/peejayedz/automation-review/contents/plans?ref=main') return { body: PLANS.map(name => ({ name, type: 'file' })) };
    return { status: 404, body: { message: 'Not Found' } };
  },
  review: body => { posts.push(body); try { return { body: gs.post(body) }; } catch (e) { return { body: { ok: false, error: e.message } }; } },
});
const refused = () => DEPS.logs.filter(l => l.api === 'refused');
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
let ORIGIN = '';
let logouts = 0;   // this site's Access logout calls (Sign out)
// The team-domain Access logout (lfmp.cloudflareaccess.com): Sign out must never call it (live it answers "Failed to
// log out." right after the site's own logout). Recorded here so the tests can check that.
const teamLogouts = [];
const routeTeamLogout = page => page.route('https://lfmp.cloudflareaccess.com/cdn-cgi/access/logout*', r => { teamLogouts.push(r.request().url()); const back = new URL(r.request().url()).searchParams.get('returnTo'); return r.fulfill({ status: 200, contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(back)})</script>` }); });
const LAST = /^Last signed in (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec), \d{1,2}:\d{2} (AM|PM)$/;
const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  if (p.startsWith('/api/')) return ACCESS.serve(req, res, { env: ENV, deps: DEPS, email: SIGNED.email });
  let body = ''; for await (const c of req) body += c;
  if (p === '/signin/') return send(res, 200, '<!doctype html><title>Sign in</title><h1>Sign in with Google</h1>', 'text/html');
  if (p === '/cdn-cgi/access/logout') { logouts++; return send(res, 200, '<!doctype html><title>Logged out</title><h1>Logged out</h1>', 'text/html'); }
  if (p === '/automation-review/config.js') return send(res, 200, `window.REVIEW_CONFIG = { saveUrl: "${ORIGIN}/exec" };`, 'text/javascript');
  if (p === '/exec') { try { const d = req.method === 'POST' ? JSON.parse(body || '{}') : null; if (d) posts.push(d); return send(res, 200, d ? gs.post(d) : gs.get(Object.fromEntries(u.searchParams))); } catch (e) { return send(res, 200, { ok: false, error: e.message }); } }
  if (p.startsWith('/automation-review/')) {
    let rel = normalize(p.slice('/automation-review/'.length) || 'index.html').replace(/^(\.\.[/\\])+/, ''); if (rel.endsWith('/') || rel === '.') rel = join(rel, 'index.html');
    try { return send(res, 200, await readFile(join(AR, rel)), TYPES[extname(rel)] || 'application/octet-stream'); } catch { return send(res, 404, 'not found', 'text/plain'); }
  }
  send(res, 404, 'not found', 'text/plain');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
ORIGIN = `http://127.0.0.1:${server.address().port}`;
const ADMIN = `${ORIGIN}/automation-review/admin/`;

const results = [];
let cur = null;
async function check(label, fn) { try { await fn(); results.push(1); console.log(`✔ ${label}`); } catch (e) { results.push(0); console.log(`✖ ${label}\n    ${e.message.split('\n')[0]}`); if (cur) await cur.screenshot({ path: join(OUT, `FAIL_${results.length}.png`) }).catch(() => {}); } }
const assert = (c, m) => { if (!c) throw new Error(m); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function ctxFor({ width = 1440, height = 900, scheme = 'light' } = {}) {
  // Motion (Nov 2026): reduced motion, so the details panel opens/closes at once here; the slide is tested in ghl-subaccount-builder tests/e2e/motion.mjs.
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height }, colorScheme: scheme });
  // v1.9.0: the shared What's new card shows on the first visit of a version and would cover the list: seen, once per tab
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('e2e-news')) { sessionStorage.setItem('e2e-news', '1'); localStorage.setItem('ar-news-seen', '9.9.9'); } } catch {} });
  // The browser never talks to GitHub any more (the server does): any direct call fails the run.
  await ctx.route('https://api.github.com/**', r => { directGh.push(r.request().url()); return r.fulfill({ status: 599, body: '' }); });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN });
  await ctx.route('https://drive.google.com/**', r => r.fulfill({ status: 404, body: '' }));
  return ctx;
}
const directGh = [];
// Signed in with Google (Access) = just open the page: no password, no key.
async function signIn(page) {
  await page.goto(ADMIN);
  await page.waitForSelector('.lv-row[data-client]', { timeout: 20000 });
}
// v1.7.0 (redesign v2): the shared shell. Me = the avatar (desktop popover / phone screen); test clients live there.
const ROW = c => `.lv-row[data-client="${c}"]`;
const meBtn = async p => ((await p.isVisible('[data-lv-top] [data-lv="me"]')) ? '[data-lv-top] [data-lv="me"]' : '[data-lv-ptop] [data-lv="me"]');
async function openMe(p) { await p.click(await meBtn(p)); await p.waitForSelector('.lv-pop:not([hidden]) .lv-mi, [data-lv-me]:not([hidden]) .lv-mi'); }
async function setTests(p, on) {
  await openMe(p);
  const tg = p.locator('[data-lv="tests"]:visible');
  if ((await tg.getAttribute('aria-checked')) !== String(on)) await tg.click();
  await p.keyboard.press('Escape');
}
const EDIT = `${ADMIN}edit.html`;
const shot = (page, name, full = false) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const lastPost = action => [...posts].reverse().find(p => p.action === action);

try {
  const ctx = await ctxFor(); const page = await ctx.newPage(); const errs = []; cur = page;
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await signIn(page);

  // ===== 1) home
  await check('v2 shell: top bar LFMP · Clients / Scorecards / Reviews (Reviews current), no + and no bell on Reviews, name + Last signed in + Sign out', async () => {
    assert(await page.isVisible('.lv-top') && await page.isHidden('.lv-tabs') && await page.isHidden('.lv-ptop'), 'desktop: one top bar, no phone bar / tabs');
    assert(await page.$$eval('.lv-nav a', as => as.map(a => `${a.textContent}${a.getAttribute('aria-current') ? '*' : ''}`).join(' ')) === 'Clients Scorecards Reviews*', 'nav');
    assert(!(await page.locator('[data-lv="plus"], .lv-bell, .top, .toolchip, .hero, .strip, .foot, #themeSeg, #topMenu').count()), 'a + / bell / old header piece');
    assert(await page.innerText('.lv-who [data-me]') === 'PJ Drozo' && await page.isVisible('.lv-so'), 'name + Sign out');
    assert(await page.$eval('html', h => h.classList.contains('lfmp-v2')), 'lfmp-v2');
  });
  await check('home: title, "N clients · 2 need you · 1 waiting · 3 not sent", search "Search N clients", filter All · Needs you · 2 (red) · Waiting · Not sent · Done (test clients hidden by default)', async () => {
    const real = CODES.filter(c => !/^zz-/.test(c)).length;
    assert(await page.innerText('.lv-h1') === 'REVIEWS' || await page.$eval('.lv-h1', e => e.textContent) === 'Reviews', 'title');
    assert(await page.innerText('[data-lv-sum]') === `${real} clients · 2 need you · 1 waiting · 3 not sent · All submissions ›`, await page.innerText('[data-lv-sum]'));
    assert(await page.getAttribute('#homeQ', 'placeholder') === `Search ${real} clients`, await page.getAttribute('#homeQ', 'placeholder'));
    assert(await page.$$eval('.lv-seg button', bs => bs.map(b => b.querySelector('.lv-d').textContent).join('|')) === 'All|Needs you · 2|Waiting|Not sent|Done', 'filter labels');
    assert(await page.locator('[data-lv-seg="need"] .lv-red').count() === 1, 'Needs you red when n > 0');
    assert(!(await page.locator(ROW('zz-test-2-qpqhx7')).count()), 'ZZ shown');
  });
  await check('home: Needs you red / Waiting amber (only with a client link) / Not sent grey (no client link) / Approved or Done green, with the sub-line', async () => {
    const rows = await page.$$eval('.lv-row[data-client]', rs => rs.map(r => [r.dataset.client, r.querySelector('.lv-c:not(.lv-pr) .lv-st').className.replace('lv-st ', ''), r.querySelector('.lv-c:not(.lv-pr) .lv-st').textContent, r.querySelector('.lv-mt').textContent]));
    const get = c => rows.find(r => r[0] === c);
    assert(rows[0][0] === 'dumas-sanclemente-mo5cay' && rows[0].slice(1).join('|') === 'red|Needs you|6 requests to answer', JSON.stringify(rows[0]));
    assert(get('palm-beach-plastic-n9umxi').slice(1).join('|') === 'red|Needs you|1 request to answer', 'palm');
    assert(get('mahdavi-law-mc1mar').slice(1).join('|') === 'amber|Waiting|Link A sent · Nov 16', `mahdavi (Builder record: Link A sent 16 Nov): ${get('mahdavi-law-mc1mar')}`);
    // Boca: one automation approved, not all → green "Done" (all approved = "Approved", see ZZ below)
    const bocaAll = DATA['boca-dental-e770de'].automations.length === 1;
    assert(get('boca-dental-e770de').slice(1).join('|') === `green|${bocaAll ? 'Approved' : 'Done'}|Nothing waiting`, `boca (replaced request + approval): ${get('boca-dental-e770de')}`);
    // v1.9.0: no responses and no client link (Emery, Hedayati, Sralla in the seed) → grey "Not sent · No client link yet", never Waiting or Done
    for (const c of ['emery-law-9lp7do', 'hedayati-law-m90omb', 'sralla-family-law-rbi2yj']) assert(get(c).slice(1).join('|') === 'grey|Not sent|No client link yet', `${c}: ${get(c)}`);
    const words = new Set(rows.map(r => r[2])); assert([...words].every(w => ['Needs you', 'Waiting', 'Not sent', 'Approved', 'Done'].includes(w)), [...words].join(','));
    assert(!rows.some(r => /opened/i.test(r[3])), 'no claims about opens');
  });
  await check('Link sent (v1.7.0): read from the Builder records through the team site (list + raw record files); no record → today\'s text; records unreadable → today\'s text, no error', async () => {
    assert(ghCalls.includes(`GET ${B_RECS}?ref=main`) && ghCalls.includes(`GET ${B_RECS}/mahdavi-law-firm-ab12cd.json?ref=main`), ghCalls.join(' '));
    BREC.fail = 'read';
    try {
      await page.reload(); await page.waitForSelector('.lv-row[data-client]', { timeout: 20000 });
      assert(await page.innerText(`${ROW('mahdavi-law-mc1mar')} .lv-mt`) === 'Waiting for the client', await page.innerText(`${ROW('mahdavi-law-mc1mar')} .lv-mt`));
      assert(!(await page.locator('.errbox').count()), 'an error banner');
    } finally { BREC.fail = null; }
    await page.reload(); await page.waitForSelector('.lv-row[data-client]', { timeout: 20000 });
    assert(await page.innerText(`${ROW('mahdavi-law-mc1mar')} .lv-mt`) === 'Link A sent · Nov 16', 'back after a reload');
  });
  await check('home order: Needs you, then Waiting, then Not sent, then Done', async () => {
    const order = await page.$$eval('.lv-row[data-client] .lv-c:not(.lv-pr) .lv-st', s => s.map(x => x.className.replace('lv-st ', '')));
    assert(order.join(',') === 'red,red,amber,grey,grey,grey,green', order.join(','));
  });
  await check('home: filters Needs you / Waiting / Done, Show test clients (Me), search', async () => {
    await page.click('[data-lv-seg="need"]'); assert(await page.locator('.lv-row[data-client]').count() === 2, 'needs you');
    await page.click('[data-lv-seg="wait"]'); assert(await page.locator('.lv-row[data-client]').count() === 1, 'waiting = has a link, waiting on the client');
    await page.click('[data-lv-seg="unsent"]'); assert(await page.locator('.lv-row[data-client]').count() === 3, 'not sent = no client link yet');
    await page.click('[data-lv-seg="done"]'); assert(await page.locator('.lv-row[data-client]').count() === 1, 'done');
    assert(await page.getAttribute('[data-lv-seg="done"]', 'aria-pressed') === 'true', 'pressed');
    await page.click('[data-lv-seg="all"]');
    await setTests(page, true); await page.waitForSelector(`${ROW('zz-test-2-qpqhx7')} .lv-mt:text-matches("^Test · ")`);
    await setTests(page, false); await page.waitForSelector(ROW('zz-test-2-qpqhx7'), { state: 'detached' });
    await page.fill('#homeQ', 'palm'); assert(await page.locator('.lv-row[data-client]').count() === 1, 'search'); await page.fill('#homeQ', '');
  });
  await check('home: last column (v1.9.0: Waiting Mahdavi "Replied · <date>"; Not sent "Create package ›"; Needs you / Done without a link "No client link yet"), no ?c= classic link anywhere; row click = Details', async () => {
    const lk = c => page.innerText(`${ROW(c)} .lv-c:not(.lv-pr) .lv-mt`);
    assert(/^Replied · [A-Z][a-z]{2} \d{1,2}$/.test(await lk('mahdavi-law-mc1mar')), await lk('mahdavi-law-mc1mar'));
    for (const c of ['dumas-sanclemente-mo5cay', 'palm-beach-plastic-n9umxi', 'boca-dental-e770de']) assert(await lk(c) === 'No client link yet', c);
    for (const c of ['emery-law-9lp7do', 'hedayati-law-m90omb', 'sralla-family-law-rbi2yj']) assert(await lk(c) === 'Create package ›' && /^\/ghl-subaccount-builder-page\/\?(client=[a-z0-9-]+&tab=review|add=existing&q=)/.test(await page.getAttribute(`${ROW(c)} a[data-pkg]`, 'href')), c);
    assert(!(await page.$$eval('a[href]', as => as.filter(a => /[?&]c=/.test(a.getAttribute('href')) && !/(plan|messages)\.html\?c=/.test(a.getAttribute('href'))).length)), 'a classic ?c= link on the home');
    assert(await page.innerText(`${ROW('mahdavi-law-mc1mar')} .lv-op`) === 'Open ›', 'Open ›');
    await page.click(`${ROW('mahdavi-law-mc1mar')} .lv-nm`); await page.waitForSelector('#dPanel:not([hidden])');
    assert(page.url().endsWith('#/client/mahdavi-law-mc1mar'), page.url());
    assert(await page.$eval(ROW('mahdavi-law-mc1mar'), r => r.classList.contains('sel')), 'open row marked');
  });
  await shot(page, 'home_1440_light');

  // ===== 2) Details
  // reads one Details "Client links" list: [key, name, hint, shown url, Open href, Copy text]
  const clientLinks = () => page.$$eval('#dPanel .clinks li', ls => ls.map(l => [l.dataset.link, l.querySelector('b').textContent, l.querySelector('small').textContent, l.querySelector('.url').textContent, l.querySelector('.cla a').getAttribute('href'), l.querySelector('[data-copy]').dataset.copy]));
  await check('Details: status line, open items, automations approved, last activity', async () => {
    const t = await page.innerText('#dPanel');
    assert(/Waiting\s*·?\s*Waiting for the client/.test(await page.innerText('#dPanel .dstat')), 'status line');
    assert(/Nothing to answer\. 1 update is waiting for the client/.test(t), 'open items');
    assert(new RegExp(`0\\s*of ${DATA['mahdavi-law-mc1mar'].automations.length}`).test(t), 'approved count');
    assert(/Last activity\s+\w{3} \d+, \d+:\d\d [AP]M ET/i.test(t), 'last activity');
  });
  await check('Details Mahdavi: tabs Overview · Edit; CLIENT LINKS (send to the client) = Link A · Plan + review (plans/ page), Link B · Review only; no Classic dashboard link', async () => {
    assert(await page.$$eval('#dPanel .dtabs a', as => as.map(a => `${a.textContent}${a.getAttribute('aria-current') ? '*' : ''}=${a.getAttribute('href')}`).join(' ')) === 'Overview*=#/client/mahdavi-law-mc1mar Edit=#/client/mahdavi-law-mc1mar/edit', 'tabs');
    assert(/CLIENT LINKS\s*\(SEND TO THE CLIENT\)/i.test(await page.innerText('#clTitle')), 'heading');
    const ls = await clientLinks();
    const abs = rel => new URL(rel, ADMIN).href;
    assert(JSON.stringify(ls.map(l => l.slice(0, 3))) === JSON.stringify([['a', 'Link A · Plan + review', 'Send this one first'], ['b', 'Link B · Review only', 'For re-reviews']]), JSON.stringify(ls));
    assert(ls[0][4] === '../plans/mahdavi-law-mc1mar.html' && ls[0][5] === abs('../plans/mahdavi-law-mc1mar.html') && ls[0][3] === abs('../plans/mahdavi-law-mc1mar.html').replace(/^https?:\/\//, ''), JSON.stringify(ls[0]));
    assert(ls[1][4] === '../messages.html?c=mahdavi-law-mc1mar' && ls[1][5] === abs('../messages.html?c=mahdavi-law-mc1mar'), JSON.stringify(ls[1]));
    assert(await page.$$eval('#dPanel .clinks .cla a', as => as.every(a => a.target === '_blank' && /Open/.test(a.textContent))), 'Open ↗ in a new tab');
    assert(!(await page.locator('#dPanel .links, #dPanel .clinks li:has-text("Sent")').count()), 'old Links block / a "Sent" mark (the Builder record has no sent field)');
    assert(!(await page.locator('#dPanel .lbl.team, #dPanel a:has-text("Classic dashboard"), #dPanel a:has-text("Edit wording")').count()), 'old team links');
  });
  await check('Copy: copies the full link and shows "Copied" next to that button for 4 s', async () => {
    await page.click('#dPanel .clinks li[data-link="b"] [data-copy]');
    assert(await page.evaluate(() => navigator.clipboard.readText()) === new URL('../messages.html?c=mahdavi-law-mc1mar', ADMIN).href, 'clipboard');
    assert(await page.innerText('#dPanel .clinks li[data-link="b"] .copied') === 'Copied' && await page.innerText('#dPanel .clinks li[data-link="a"] .copied') === '', 'Copied next to B only');
    await page.waitForTimeout(3500); assert(await page.innerText('#dPanel .clinks li[data-link="b"] .copied') === 'Copied', 'gone before 4 s');
    await page.waitForFunction(() => document.querySelector('#dPanel .clinks li[data-link="b"] .copied').textContent === '', null, { timeout: 1500 });
    await page.click('#dPanel .clinks li[data-link="a"] [data-copy]');
    assert(await page.evaluate(() => navigator.clipboard.readText()) === new URL('../plans/mahdavi-law-mc1mar.html', ADMIN).href, 'clipboard A');
  });
  await check('Copy = sent (v1.7.0): Copy on Link B, then Link A saves review.linkSent on the client\'s Builder record (B, then A; sha-checked PUT, commit message as the Builder\'s) and the row repaints', async () => {
    await page.waitForFunction(() => true); await page.waitForTimeout(300);
    const mine = BREC.puts.filter(p => p.id === 'mahdavi-law-firm-ab12cd');
    assert(mine.length === 2 && mine[0].linkSent.link === 'B' && mine[1].linkSent.link === 'A', JSON.stringify(mine));
    assert(mine.every(p => /^The Mahdavi Law Firm: Link [AB] copied to send \(PJ Drozo\)/.test(p.message) && p.linkSent.by === 'PJ Drozo' && Date.now() - Date.parse(p.linkSent.at) < 60e3), JSON.stringify(mine));
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    await page.waitForFunction(t => document.querySelector('.lv-row[data-client="mahdavi-law-mc1mar"] .lv-mt')?.textContent === t, `Link A sent · ${today}`, { timeout: 5000 });
    assert(BREC.files['mahdavi-law-firm-ab12cd'].rec.review.code === 'mahdavi-law-mc1mar' && BREC.files['mahdavi-law-firm-ab12cd'].rec.review.status === 'linked', 'the rest of the record kept');
  });
  await check('Copy = sent: the save failing shows "Link B copied, but it couldn\'t be noted as sent: …" (the copy itself worked)', async () => {
    BREC.fail = 'put';
    try {
      await page.click('#dPanel .clinks li[data-link="b"] [data-copy]');
      await page.waitForFunction(() => /^Link B copied, but it couldn't be noted as sent: /.test(document.getElementById('toast').textContent), null, { timeout: 5000 });
      assert(await page.evaluate(() => navigator.clipboard.readText()) === new URL('../messages.html?c=mahdavi-law-mc1mar', ADMIN).href, 'copied anyway');
    } finally { BREC.fail = null; }
  });
  await check('Details ZZ TEST 2 (Builder package): Link A = plan.html?c=, Link B = messages.html?c=; no Builder record → Copy just copies (nothing saved, no error)', async () => {
    await page.goto(`${ADMIN}#/client/zz-test-2-qpqhx7`); await page.waitForSelector('#dPanel:not([hidden]) .clinks');
    const ls = await clientLinks();
    assert(ls.map(l => `${l[0]}=${l[4]}`).join(' ') === 'a=../plan.html?c=zz-test-2-qpqhx7 b=../messages.html?c=zz-test-2-qpqhx7', JSON.stringify(ls));
    const n = BREC.puts.length, ghN = ghCalls.length;
    await page.evaluate(() => { document.getElementById('toast').textContent = ''; });   // the previous check's toast
    await page.click('#dPanel .clinks li[data-link="b"] [data-copy]'); await page.waitForTimeout(400);
    assert(await page.innerText('#dPanel .clinks li[data-link="b"] .copied') === 'Copied' && BREC.puts.length === n, `saved for a client without a record: ${JSON.stringify(BREC.puts.slice(n))}`);
    assert(!ghCalls.slice(ghN).some(c => /ghl-subaccount-builder/.test(c)), ghCalls.slice(ghN).join(' '));
    assert(!/couldn't be noted/.test(await page.innerText('#toast')), 'an error toast');
  });
  await check('Details Dumas (classic only): "No client link yet — create an A/B package in the Builder." instead of a review link; past answers still open items', async () => {
    await page.goto(`${ADMIN}#/client/dumas-sanclemente-mo5cay`); await page.waitForSelector('#dPanel:not([hidden]) .nolinkbox');
    assert((await page.innerText('#dPanel .nolinkbox')).startsWith('No client link yet — create an A/B package in the Builder. Create package ›'), await page.innerText('#dPanel .nolinkbox'));
    assert(!(await page.locator('#dPanel .clinks, #dPanel [data-copy]').count()), 'a link / Copy for a classic-only client');
    assert(/Needs you\s*·?\s*6 requests to answer/.test(await page.innerText('#dPanel .dstat')) && await page.locator('#dPanel .oitem').count() === 6, 'status line + open items');
  });
  await check('Details Emery (no responses, no client link): grey "● Not sent · No client link yet" + Create package ›; Palm Beach is classic too', async () => {
    await page.goto(`${ADMIN}#/client/emery-law-9lp7do`); await page.waitForSelector('#dPanel:not([hidden]) .dstat');
    assert(/^●\s*Not sent\s*·?\s*No client link yet$/.test((await page.innerText("#dPanel .dstat")).trim()), await page.innerText('#dPanel .dstat'));
    assert(/No responses yet/.test(await page.innerText('#dPanel')), 'last activity');
    assert((await page.innerText('#dPanel .nolinkbox')).startsWith('No client link yet — create an A/B package in the Builder. Create package ›'), 'emery no link');
    await page.goto(`${ADMIN}#/client/palm-beach-plastic-n9umxi`); await page.waitForSelector('#dPanel:not([hidden]) .nolinkbox');
    assert(!(await page.locator('#dPanel .clinks').count()), 'palm beach link');
    await page.goto(`${ADMIN}#/client/mahdavi-law-mc1mar`); await page.waitForSelector('#dPanel:not([hidden]) .clinks');
  });
  await check('Details: Esc closes and returns to #/; a hash link opens Details straight away', async () => {
    await page.keyboard.press('Escape'); await page.waitForSelector('#dPanel', { state: 'hidden' }); assert(!/client/.test(page.url().split('#')[1] || ''), page.url());
    await page.goto(`${ADMIN}#/client/dumas-sanclemente-mo5cay`); await page.waitForSelector('#dPanel:not([hidden]) .oitem');
    assert(await page.locator('#dPanel .oitem').count() === 6, 'dumas open items');
  });
  await shot(page, 'details_1440_light');
  await check('Details ⋯: Rename client → admin_edit client:name (as the classic page) and the new name shows', async () => {
    await page.click('[data-menu="dpMenu"]'); await page.click('#dpMenu [data-dp="rename"]');
    await page.fill('#renIn', 'Dumas & Sanclemente, P.A.'); await page.click('form[data-form="rename"] [type="submit"]');
    await page.waitForFunction(() => document.querySelector('#dpTitle')?.textContent === 'Dumas & Sanclemente, P.A.');
    const p = lastPost('admin_edit'); assert(p && p.client === 'dumas-sanclemente-mo5cay' && p.automation === '' && p.field === 'client:name' && p.value === 'Dumas & Sanclemente, P.A.' && p.key === KEY && p.name === 'PJ', JSON.stringify(p));
    assert((await page.innerText(`${ROW('dumas-sanclemente-mo5cay')} .lv-nm`)) === 'Dumas & Sanclemente, P.A.', 'home row name');
  });
  await check('Details ⋯ = Rename client · Clear test responses… · Classic editor (old) (team-only edit.html, same tab): the only link to the classic editor', async () => {
    await page.click('[data-menu="dpMenu"]');
    assert(await page.$$eval('#dpMenu [role="menuitem"]', e => e.map(x => x.textContent.trim()).join(' | ')) === 'Rename client | Clear test responses… | Classic editor (old)', 'menu items');
    const a = page.locator('#dpMenu a'); assert((await a.getAttribute('href')) === 'edit.html?c=dumas-sanclemente-mo5cay' && !(await a.getAttribute('target')), 'classic editor link');
    await page.keyboard.press('Escape');
    // nowhere else: home, Overview, Edit tab, Submissions (checked again after Submissions)
    assert(!(await page.locator('a[href*="edit.html"]:not(#dpMenu a)').count()), 'another edit.html link');
  });
  // ===== 2b) Edit tab (v1.6.0): Link B's wording, edited in the Review admin, shows on Link B (messages.html, real file)
  const ZZ = 'zz-test-2-qpqhx7', ZZM = JSON.parse(await readFile(join(AR, 'data', `${ZZ}.messages.json`), 'utf8'));
  const zzMsgs = ZZM.sections.flatMap(g => g.msgs);
  const linkBText = async (code, want) => {   // open the real Link B page against the same mock Sheet; wait until `want` shows
    const lb = await ctx.newPage();
    try {
      await lb.goto(`${ORIGIN}/automation-review/messages.html?c=${code}`);
      await lb.waitForFunction(w => w.every(x => document.body.innerText.includes(x)), want, { timeout: 20000 });
      return await lb.evaluate(() => document.body.innerText);
    } finally { await lb.close(); }
  };
  const edToast = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent), re.source);
  const openEdit = async (code, auto) => { await page.goto(`${ADMIN}#/client/${code}/edit${auto ? `/${auto}` : ''}`); await page.waitForSelector('#dPanel:not([hidden]) .dbody'); await page.waitForTimeout(50); };
  await check('Edit tab: Link B wording only, "Preview as client" = Link A + Link B in a new tab, automation picker, wide panel, no client buttons', async () => {
    await openEdit('mahdavi-law-mc1mar');
    await page.waitForTimeout(300);   // width transition
    assert(await page.$eval('#dPanel', e => e.classList.contains('wide') && e.getBoundingClientRect().width > 700), 'wide panel');
    assert(await page.getAttribute('#dPanel .dtabs a[aria-current]', 'href') === '#/client/mahdavi-law-mc1mar/edit', 'Edit tab current');
    const intro = await page.innerText('#dPanel .edintro');
    assert(/Changes show on Link B · Review only as soon as you save/.test(intro) && /Link A, the plan page, doesn't change/.test(intro), intro);
    assert(await page.$$eval('#dPanel [data-preview]', as => as.map(a => `${a.dataset.preview}=${a.getAttribute('href')}|${a.target}`).join(' ')) === 'a=../plans/mahdavi-law-mc1mar.html|_blank b=../messages.html?c=mahdavi-law-mc1mar|_blank', 'preview links');
    const mm = JSON.parse(await readFile(join(AR, 'data', 'mahdavi-law-mc1mar.messages.json'), 'utf8')).sections.flatMap(g => g.msgs);
    const autos = [...new Set(mm.map(m => m.id.slice(0, m.id.lastIndexOf('.'))))];
    assert(JSON.stringify(await page.$$eval('#edAuto option', o => o.map(x => x.value))) === JSON.stringify(autos), 'automation picker = automations on Link B');
    assert(await page.locator('#dPanel .edmsg').count() === mm.filter(m => m.id.startsWith(`${autos[0]}.`)).length, 'messages of the first automation');
    await page.selectOption('#edAuto', autos[1]); await page.waitForTimeout(50);
    assert(await page.locator('#dPanel .edmsg').count() === mm.filter(m => m.id.startsWith(`${autos[1]}.`)).length && page.url().includes('/edit'), 'switch automation');
    const t = await page.innerText('#dPanel');
    for (const re of [/Looks good/i, /Approve/i, /Change it/i, /Request a change/i, /Everything else looks good/i]) assert(!re.test(t), `client button text ${re}`);
    assert(!(await page.locator('#dPanel input[type="password"], #dPanel [data-act="approve"], #dPanel a[href*="edit.html"]:not(#dpMenu a)').count()), 'client/classic controls');
  });
  await check('Edit tab: email subject + body → admin_edit step:<id>:email.subject / email.body (key + first name added by the server) → shows on Link B', async () => {
    const m = zzMsgs.find(x => x.id === 'new-lead.s3'), n = posts.length;
    await openEdit(ZZ, 'new-lead');
    await page.click(`#dPanel [data-ed-open="${m.id}"]`); await page.waitForSelector('#edSubj');
    assert(await page.inputValue('#edSubj') === m.subject && await page.inputValue('#edText') === m.text, 'form starts with the Link B wording');
    await page.fill('#edSubj', 'We got your message, [First name]'); await page.fill('#edText', 'Hi [First name],\n\nThanks for reaching out. New wording from the Edit tab.');
    await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/Saved\. Link B shows the new wording/);
    const p = posts.slice(n).filter(x => x.action === 'admin_edit');
    assert(JSON.stringify(p.map(x => [x.client, x.automation, x.field, x.value, x.key === KEY, x.name])) === JSON.stringify([[ZZ, 'new-lead', 'step:s3:email.subject', 'We got your message, [First name]', true, 'PJ'], [ZZ, 'new-lead', 'step:s3:email.body', 'Hi [First name],\n\nThanks for reaching out. New wording from the Edit tab.', true, 'PJ']]), JSON.stringify(p));
    assert(/^EDITED · \w{3} \d+ · PJ$/i.test(await page.innerText(`#dPanel .edmsg[data-msg="${m.id}"] .edtag`)), await page.innerText(`#dPanel .edmsg[data-msg="${m.id}"] .edtag`));
    assert((await page.innerText(`#dPanel .edmsg[data-msg="${m.id}"] .edsubj`)).includes('We got your message'), 'list shows the new subject');
    const t = await linkBText(ZZ, ['We got your message, [First name]', 'New wording from the Edit tab.']);
    assert(/\bUpdated\b/.test(t) && !/Was:/.test(t), 'Link B: an edited message the client never responded to shows the new wording + an "Updated" tag, no "Was:" block');
  });
  await check('Edit tab: text message → admin_edit step:<id>:sms → shows on Link B; team alert text too', async () => {
    const n = posts.length;
    await openEdit(ZZ, 'consultation');
    await page.click('#dPanel [data-ed-open="consultation.s6"]'); await page.waitForSelector('#edText');
    assert(!(await page.locator('#edSubj').count()) && /Text message/i.test(await page.innerText('form[data-form="edmsg"] label')), 'a text has no subject box');
    await page.fill('#edText', 'Hi [First name], see you tomorrow at [Time]. Reply C to confirm.');
    await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/Saved/);
    await openEdit(ZZ, 'reply-alert');
    await page.click('#dPanel [data-ed-open="reply-alert.s2"]'); await page.fill('#edText', 'Everyone on your team gets this text: a lead replied. Edited alert.');
    await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/Saved/);
    const p = posts.slice(n).filter(x => x.action === 'admin_edit').map(x => `${x.automation}|${x.field}`);
    assert(p.join(' ') === 'consultation|step:s6:sms reply-alert|step:s2:sms', p.join(' '));
    await linkBText(ZZ, ['see you tomorrow at [Time]. Reply C to confirm.', 'a lead replied. Edited alert.']);
  });
  await check('Edit tab: a message the classic editor changed through "description" (step:<id>:body, strongest on Link B) is saved back to body, so the edit still shows', async () => {
    gs.post({ action: 'admin_edit', key: KEY, client: ZZ, automation: 'new-lead', field: 'step:s4:body', value: 'Subject: Old classic subject\n\nOld classic body', name: 'PJ' });
    await page.goto(ADMIN); await page.reload(); await page.waitForSelector('.lv-row[data-client]', { timeout: 20000 }); const n = posts.length;
    await openEdit(ZZ, 'new-lead');
    await page.click('#dPanel [data-ed-open="new-lead.s4"]');
    assert(await page.inputValue('#edSubj') === 'Old classic subject' && await page.inputValue('#edText') === 'Old classic body', 'form = what Link B shows');
    await page.fill('#edText', 'Body edited after a classic edit');
    await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/Saved/);
    const p = posts.slice(n).filter(x => x.action === 'admin_edit');
    assert(p.length === 1 && p[0].field === 'step:s4:body' && p[0].value === 'Subject: Old classic subject\n\nBody edited after a classic edit', JSON.stringify(p));
    await linkBText(ZZ, ['Old classic subject', 'Body edited after a classic edit']);
  });
  await check('Edit tab: Cancel / Esc close without saving; one open form at a time (unsaved text is kept); Restore original; empty text refused', async () => {
    await openEdit(ZZ, 'new-lead'); const n = posts.length;
    await page.click('#dPanel [data-ed-open="new-lead.s5"]'); await page.fill('#edText', 'not saved');
    await page.click('#dPanel [data-ed-open="new-lead.s3"]'); await edToast(/Save or cancel the message you're editing first/);
    assert(await page.inputValue('#edText') === 'not saved' && await page.getAttribute('#dPanel .edmsg.on', 'data-msg') === 'new-lead.s5', 'kept the open form');
    await page.click('[data-ed-cancel]'); assert(!(await page.locator('#edText').count()), 'cancel');
    await page.click('#dPanel [data-ed-open="new-lead.s5"]'); await page.fill('#edText', 'x'); await page.keyboard.press('Escape');
    assert(!(await page.locator('#edText').count()) && await page.isVisible('#dPanel'), 'Esc closes the form, not the panel');
    await page.click('#dPanel [data-ed-open="new-lead.s5"]'); await page.fill('#edText', '   ');
    await page.click('form[data-form="edmsg"] [type="submit"]'); assert(/Add the email body/.test(await page.innerText('#edErr')), 'empty refused');
    await page.click('[data-ed-cancel]');
    const m = zzMsgs.find(x => x.id === 'new-lead.s3');
    await page.click('#dPanel [data-ed-open="new-lead.s3"]'); await page.click('[data-ed-restore]');
    assert(await page.inputValue('#edSubj') === m.subject && await page.inputValue('#edText') === m.text, 'restore fills the original');
    assert(posts.length === n, 'Restore saved something by itself');
    await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/Saved/);
    const p = posts.slice(n).filter(x => x.action === 'admin_edit').map(x => x.field);
    assert(p.join(' ') === 'step:s3:email.subject step:s3:email.body' && !(await page.locator('#dPanel .edmsg[data-msg="new-lead.s3"] .edtag').count()), `restore + save: ${p}`);
    await page.click('#dPanel [data-ed-open="new-lead.s5"]'); await page.click('form[data-form="edmsg"] [type="submit"]'); await edToast(/No changes/);
    assert(posts.length === n + 2, 'unchanged message saved');
  });
  await check('Edit tab: Start new version asks first, then admin_edit version = next version and re-saves the edited wording (Link B keeps it); Esc cancels', async () => {
    await openEdit(ZZ, 'consultation'); const n = posts.length;
    const v0 = String(DATA[ZZ].automations.find(a => a.id === 'consultation').version), v1 = v0.replace(/(\d+)$/, d => String(+d + 1));
    assert(await page.innerText('#edVer') === `v${v0}`, await page.innerText('#edVer'));
    await page.click('[data-ed-ver]'); assert(new RegExp(`Start version ${v1.replace('.', '\\.')}\\?`).test(await page.innerText('#dPanel .edconfirm')) && /\(1 edited message\)/.test(await page.innerText('#dPanel .edconfirm')), await page.innerText('#dPanel .edconfirm'));
    await page.keyboard.press('Escape'); assert(!(await page.locator('#dPanel .edconfirm').count()) && posts.length === n, 'Esc cancels');
    await page.click('[data-ed-ver]'); await page.click('[data-ed-ver-go]'); await edToast(new RegExp(`Version ${v1.replace('.', '\\.')} started`));
    const p = posts.slice(n).filter(x => x.action === 'admin_edit').map(x => `${x.automation}|${x.field}|${x.value.slice(0, 12)}`);
    assert(p.join(' ') === `consultation|version|${v1} consultation|step:s6:sms|Hi [First na`, p.join(' '));
    assert(await page.innerText('#edVer') === `v${v1}`, 'version shown');
    await linkBText(ZZ, ['see you tomorrow at [Time]. Reply C to confirm.']);
  });
  await check('Edit tab, classic-only client (Dumas): "No client link yet — create an A/B package in the Builder." and nothing to edit', async () => {
    await openEdit('dumas-sanclemente-mo5cay');
    assert((await page.innerText('#dPanel .nolinkbox')).startsWith('No client link yet — create an A/B package in the Builder. Create package ›'), 'notice');
    assert(!(await page.locator('#dPanel form, #dPanel [data-ed-open], #dPanel [data-preview]').count()), 'edit controls for a client without Link B');
    await page.goto(`${ADMIN}#/client/dumas-sanclemente-mo5cay`); await page.waitForSelector('#dPanel:not([hidden]) .oitem');   // as the next check expects
  });

  await check('Details → open item opens it in Submissions (row open, client filtered)', async () => {
    await page.click('#dPanel .oitem >> nth=0'); await page.waitForURL(/#\/subs\/dumas-sanclemente-mo5cay/);
    await page.waitForSelector('.sline.on'); assert(await page.locator('#dPanel').isHidden(), 'panel still open');
    assert(await page.inputValue('#subsClient') === 'dumas-sanclemente-mo5cay', 'client picker');
  });

  // ===== 3) Submissions
  await check('Submissions: filters To answer · Waiting for client · Done · Everything with counts; client picker; search', async () => {
    await page.selectOption('#subsClient', 'all'); await page.waitForURL(/#\/subs$/);
    const counts = await page.$$eval('[data-subs-filter]', bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    assert(counts.join('|') === 'To answer · 7|Waiting for client · 1|Done · 2|Everything · 13', counts.join('|'));
    assert(await page.innerText('.subshead .lv-sum') === '7 to answer' && await page.isVisible('.subshead [data-act="gohome"]'), 'Submissions head: N to answer + ‹ Reviews');
    assert(await page.locator('.grp').count() === 2 && (await page.locator('.grp >> nth=0').innerText()).includes('6 to answer'), 'groups');
    await page.fill('#subsQ', 'Thanks for claiming'); assert(await page.locator('.sline').count() === 1, 'search'); await page.fill('#subsQ', '');
    await page.click('[data-subs-filter="waiting"]'); assert((await page.innerText('.grp')).includes('Text 1: Missed you'), 'waiting');
    await page.click('[data-subs-filter="done"]'); assert(await page.locator('.sline').count() === 2, 'done');
  });
  await check('Submissions Everything: a small type filter shows answers and Looks good clicks', async () => {
    await page.click('[data-subs-filter="everything"]'); await page.selectOption('#subsType', 'answer');
    assert(await page.locator('.sline').count() === 1 && (await page.innerText('.sline')).includes('Who gets the alert?'), 'answers');
    await page.selectOption('#subsType', 'approve'); assert(await page.locator('.sline').count() === 2, 'looks good clicks');
    await page.selectOption('#subsType', 'all'); await page.click('[data-subs-filter="answer"]');
  });
  await check('Submissions: line = tag · title · automation (no "v1") · date; more than 4 → "+ N more"', async () => {
    const t = await page.innerText('.grp >> nth=0');
    assert(!/ v\d/.test(t) && /\+ 2 more/.test(t), t.slice(0, 200));
    await page.click('[data-more="dumas-sanclemente-mo5cay"]'); assert(await page.locator('.grp >> nth=0').locator('.sline').count() === 6, 'more');
  });
  await check('Open row → status + reply → Save calls admin_status exactly as index.html does', async () => {
    const id = ids.d0;
    await page.click(`[data-sub="${id}"]`); await page.waitForSelector(`#so-${id} form[data-form="status"]`);
    const opts = await page.$$eval(`#so-${id} select option`, o => o.map(x => x.value)); assert(!opts.includes('Approved') && opts.length === 3, JSON.stringify(opts));
    await page.selectOption(`#so-${id} select`, 'In Progress'); await page.fill(`#so-${id} input[name="reply"]`, 'On it today');
    await shot(page, 'submissions_open_1440_light');
    await page.click(`#so-${id} [type="submit"]`); await page.waitForFunction(() => /Saved/.test(document.getElementById('toast').textContent));
    const mine = lastPost('admin_status');
    // the Edit wording page's Save (the old classic admin mode, now team only), same server + backend, another request
    const p2 = await ctx.newPage(); await p2.goto(`${EDIT}?c=palm-beach-plastic-n9umxi&view=submissions`);
    await p2.waitForSelector(`form[data-form="status"][data-id="${ids.p0}"]`, { timeout: 20000 });
    await p2.selectOption(`form[data-id="${ids.p0}"] select`, 'In Progress'); await p2.fill(`form[data-id="${ids.p0}"] input[name="reply"]`, 'On it today');
    await p2.click(`form[data-id="${ids.p0}"] button[type="submit"]`); await p2.waitForFunction(() => /Status saved/.test(document.getElementById('toast').textContent));
    await p2.close();
    const theirs = lastPost('admin_status');
    assert(theirs !== mine && theirs.id === ids.p0, 'Edit wording page did not save');
    const shape = o => JSON.stringify(Object.keys(o).sort()) + JSON.stringify({ action: o.action, key: o.key, status: o.status, lfmp_reply: o.lfmp_reply, name: o.name });
    assert(shape(mine) === shape(theirs) && mine.client === 'dumas-sanclemente-mo5cay' && mine.id === id, `${JSON.stringify(mine)} vs ${JSON.stringify(theirs)}`);
    assert((await page.innerText(`[data-sub="${id}"] .tag`)).toUpperCase() === 'IN PROGRESS', 'tag after save');
  });
  await check('Open row ⋯: History shows the status change; no classic editor link (classic-only client: no Edit link either)', async () => {
    const id = ids.d0;
    if (!(await page.locator(`#so-${id}`).count())) await page.click(`[data-sub="${id}"]`);
    await page.click(`#so-${id} [data-menu]`); await page.click(`#so-${id} [data-hist]`);
    const h = await page.innerText(`#so-${id} .hist`); assert(/Sent by the client/.test(h) && /In progress · “On it today”/.test(h), h);
    await page.click(`#so-${id} [data-menu]`);
    assert(!(await page.locator(`#so-${id} .menu a`).count()), 'a link in a classic-only client\'s row menu');
    assert(await page.$$eval(`#so-${id} .menu [role="menuitem"]`, e => e.map(x => x.textContent.trim()).join(' | ')) === 'Hide history | Delete…', 'row menu');
    await page.keyboard.press('Escape');
  });
  await check('Submissions row ⋯ for a Link B client: "Edit wording (Link B)" opens the Edit tab on that automation (no classic editor link)', async () => {
    await page.goto(`${ADMIN}#/subs/mahdavi-law-mc1mar`); await page.click('[data-subs-filter="waiting"]');
    await page.click(`[data-sub="${ids.m0}"]`); await page.click(`#so-${ids.m0} [data-menu]`);
    const a = page.locator(`#so-${ids.m0} .menu a`), auto = DATA['mahdavi-law-mc1mar'].automations[0].id;
    assert(await a.innerText() === 'Edit wording (Link B)' && await a.getAttribute('href') === `#/client/mahdavi-law-mc1mar/edit/${auto}`, await a.getAttribute('href'));
    await a.click(); await page.waitForSelector('#dPanel:not([hidden]) #edAuto');
    assert(await page.inputValue('#edAuto') === auto, 'automation preselected');
    await page.keyboard.press('Escape'); await page.goto(`${ADMIN}#/subs/dumas-sanclemente-mo5cay`); await page.click('[data-subs-filter="answer"]'); await page.waitForSelector('.sline');
  });
  await check('Delete asks twice (confirm, then delete via admin_delete); Esc cancels the first', async () => {
    const id = ids.d4;
    await page.click(`[data-sub="${id}"]`); await page.click(`#so-${id} [data-menu]`); await page.click(`#so-${id} [data-subdel]:not([data-confirm])`);
    await page.waitForSelector(`#so-${id} .confirm`); assert(!lastPost('admin_delete'), 'deleted on the first click');
    await page.keyboard.press('Escape'); await page.waitForSelector(`#so-${id} .confirm`, { state: 'detached' });
    await page.click(`#so-${id} [data-menu]`); await page.click(`#so-${id} [data-subdel]:not([data-confirm])`);
    await page.click(`#so-${id} [data-confirm]`); await page.waitForFunction(() => /Deleted/.test(document.getElementById('toast').textContent));
    const p = lastPost('admin_delete'); assert(p && p.client === 'dumas-sanclemente-mo5cay' && JSON.stringify(p.ids) === JSON.stringify([id]) && p.key === KEY, JSON.stringify(p));
    assert(!(await page.locator(`[data-sub="${id}"]`).count()), 'row still shown');
  });
  await check('Approved request: no status menu (only the client approves); Open their review link', async () => {
    await page.click('[data-subs-filter="done"]'); await page.selectOption('#subsClient', 'boca-dental-e770de');
    await page.click(`[data-sub="${ids.b0}"]`); assert((await page.innerText(`#so-${ids.b0}`)).includes('Approved by the client') && !(await page.locator(`#so-${ids.b0} select`).count()), 'approved');
    assert(await page.innerText('.gh .gopen') === 'No client link yet' && !(await page.locator('.gh a.gopen').count()), 'classic-only client: no review link');
    await page.keyboard.press('Escape'); assert(!(await page.locator(`#so-${ids.b0}`).count()), 'Esc closes the row');
  });
  await check('Details ⋯ Clear test responses: type-to-confirm, then admin_delete with all of that client\'s ids', async () => {
    await page.goto(`${ADMIN}#/client/zz-test-2-qpqhx7`); await page.waitForSelector('#dPanel:not([hidden])');
    await page.click('[data-menu="dpMenu"]'); await page.click('#dpMenu [data-dp="clear"]');
    assert(/^Clear test responses$/i.test(await page.innerText('form[data-form="clear"] .lbl')), 'heading');
    assert(await page.isDisabled('#clrGo'), 'enabled before typing');
    await page.fill('#clrIn', 'zz test'); assert(await page.isDisabled('#clrGo'), 'wrong name enabled it');
    await page.fill('#clrIn', 'ZZ TEST 2'); await page.click('#clrGo'); await page.waitForFunction(() => /Cleared 2 responses/.test(document.getElementById('toast').textContent));
    const p = lastPost('admin_delete'); assert(p.client === 'zz-test-2-qpqhx7' && p.ids.length === 2 && p.ids.includes(ids.z0) && p.ids.includes(ids.z1), JSON.stringify(p));
  });
  await check('Me (avatar): Theme · Show test clients · Refresh now (updated …) · Team sign-ins · What\'s new v<VERSION> · Install the app · Submissions · Sign out (no key, no Lock); Refresh works', async () => {
    await page.keyboard.press('Escape');
    await openMe(page);
    const items = await page.$$eval('.lv-pop .lv-mi', b => b.map(x => x.querySelector('span')?.textContent || x.textContent).map(s => s.trim()));
    assert(items.join('|') === "Theme|Show test clients|Refresh now|Team sign-ins|What's new|Install the app|Sign out", items.join('|'));   // Me is the same in all three tools
    assert(/^updated \d{1,2}:\d\d [AP]M$/.test(await page.innerText('.lv-pop [data-lv="refresh"] .lv-v')), await page.innerText('.lv-pop [data-lv="refresh"] .lv-v'));
    { const v = (await readFile(new URL('../admin.js', import.meta.url), 'utf8')).match(/VERSION = '([\d.]+)'/)[1]; assert((await page.innerText('.lv-pop [data-lv="news"]')).includes(`v${v}`), `version v${v}`); }   // the current admin.js VERSION
    assert(await page.locator('.lv-pop .lv-gl').count() === 2, 'Settings + Team only (no tool extras)');
    assert(!(await page.locator('.lv-pop input[type="password"]').count()), 'password');
    await page.click('.lv-pop [data-lv="refresh"]'); await page.waitForFunction(() => /Refreshed/.test(document.getElementById('toast').textContent));
  });
  await check('Me → What\'s new opens (v1.7.0 card) and clears the dot; Me → Submissions opens Submissions; Theme Dark/Auto', async () => {
    await page.evaluate(() => localStorage.removeItem('ar-news-seen')); await page.reload(); await page.waitForSelector('.lv-row[data-client]');
    await page.waitForSelector('[data-lv-news]'); assert(/^What's new · v\d+\.\d+\.\d+$/.test((await page.innerText('[data-lv-news] .lv-note-meta')).trim()), 'v1.9.0: the shared What\'s new card on a new version');
    assert(!(await page.locator('.lv-av [data-lv-dot], .lv-av .lv-dot').count()), 'no dot on the avatar');
    await openMe(page); assert(await page.locator('.lv-pop [data-lv="news"] .lv-ndot').count() === 1, 'unseen dot on What\'s new');
    await page.click('.lv-pop [data-lv="news"]'); await page.waitForSelector('#arNews[open] .arnews section');
    assert(/v1\.7\.0/.test(await page.innerText('#arNews')) && /One look for all three tools/.test(await page.innerText('#arNews')), await page.innerText('#arNews'));
    await page.keyboard.press('Escape'); await openMe(page); assert(!(await page.locator('.lv-pop [data-lv="news"] .lv-ndot').count()), 'dot cleared'); await page.keyboard.press('Escape');
    // Submissions (desktop): the summary line ends "· All submissions ›"
    assert(/ · All submissions ›$/.test(await page.innerText('[data-lv-sum]')), await page.innerText('[data-lv-sum]'));
    await page.click('[data-lv-sum] .sumlink'); await page.waitForURL(/#\/subs$/); await page.waitForSelector('.grp');
    await page.click('.subshead [data-act="gohome"]'); await page.waitForSelector('.lv-row[data-client]');
    await openMe(page); await page.click('.lv-pop [data-lv="theme"][data-v="dark"]');
    assert(await page.getAttribute('html', 'data-theme') === 'dark' && await page.evaluate(() => localStorage.getItem('lfmp-theme')) === 'dark', 'dark');
    await page.click('.lv-pop [data-lv="theme"][data-v="auto"]'); assert(!(await page.getAttribute('html', 'data-theme')), 'auto');
    await page.keyboard.press('Escape');
  });

  // ===== 4) Classic editor (old) (team only, until ~15 Dec 2026): every edit type the old classic "&admin" mode had
  const editPage = await ctx.newPage(); cur = editPage;
  editPage.on('pageerror', e => errs.push(`edit: ${e.message}`)); editPage.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(`edit: ${m.text()}`); });
  const BOCA = DATA['boca-dental-e770de'], BA = BOCA.automations[0];
  const smsStep = BOCA.automations.flatMap(a => a.steps.map(s => [a, s])).find(([, s]) => s.sms), emailStep = BOCA.automations.flatMap(a => a.steps.map(s => [a, s])).find(([, s]) => s.email);
  const qAuto = BOCA.automations.find(a => a.questions?.length) || Object.values(DATA).flatMap(d => d.automations).find(a => a.questions?.length);
  const editsSince = n => posts.slice(n).filter(p => p.action === 'admin_edit');
  const saved = (re) => editPage.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent), re.source);
  await check('Edit wording: opens signed in (name, ← Review admin, Sign out), edit controls on, no password field, nothing from the public page', async () => {
    await editPage.goto(`${EDIT}?c=boca-dental-e770de&a=${BA.id}`);
    await editPage.waitForSelector('#adminbar:not([hidden]) .adminbadge', { timeout: 20000 });
    const bar = await editPage.innerText('#adminbar');
    assert(/Classic editor \(old\)/.test(bar) && /Signed in as PJ Drozo/.test(bar) && /Sign out/.test(bar) && /Review admin/.test(bar), bar);
    assert(await editPage.innerText('#oldBanner') === 'Old editor — use the Edit tab in Review admin. This page will be removed.', await editPage.innerText('#oldBanner'));
    const bb = await editPage.$eval('#oldBanner', e => { const r = e.getBoundingClientRect(); return [r.top, r.height, getComputedStyle(e).color, getComputedStyle(e).backgroundColor]; });
    assert(bb[0] === 0 && bb[1] > 20 && ratio(bb[2], bb[3]) >= 4.5, `banner at the top, readable: ${bb}`);
    assert(await editPage.getAttribute('#adminbar a.btn', 'href') === '/automation-review/admin/#/client/boca-dental-e770de', 'back link');
    assert(await editPage.locator('[data-admin="details"]').count() === 1, 'details edit button');
    assert(!(await editPage.locator('input[type="password"]').count()), 'password field');
    assert(/^Classic editor \(old\) · /.test(await editPage.title()), await editPage.title());
  });
  await check('Edit wording: no client buttons (Looks good / Request a change / Edit the wording / overview correction / answers / Approve): only clients respond', async () => {
    const n = posts.length;
    for (const [a] of [[BA], ...BOCA.automations.filter(x => x !== BA).map(x => [x])].slice(0, 3)) {
      await editPage.goto(`${EDIT}?c=boca-dental-e770de&a=${a.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
      await editPage.waitForFunction(() => !/Loading saved responses/.test(document.body.innerText), null, { timeout: 20000 });
      for (const s of a.steps) {
        await editPage.click(`.node[data-step="${s.id}"]`);
        const bad = await editPage.locator('[data-act], [data-form="change"], [data-form="copy"], [data-form="who"], [data-form="ovchange"], [data-form="approve_all"], [data-q], #ap-check, [data-who]').count();
        assert(bad === 0, `${a.id}/${s.id}: ${bad} client control(s)`);
      }
      const body = await editPage.innerText('#app');
      assert(!/Request a change|Approve automation|Request a correction|Mark as looks good/.test(body), `${a.id}: client wording on page`);
      assert(/Only the client approves|Approved by/.test(await editPage.innerText('#app')), `${a.id}: approval status`);
    }
    if (qAuto) {
      const code = Object.keys(DATA).find(c => DATA[c].automations.includes(qAuto));
      await editPage.goto(`${EDIT}?c=${code}&a=${qAuto.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
      assert(!(await editPage.locator('.qs [data-q]').count()) && /Client's answer:|Not answered yet/.test(await editPage.innerText('.qs')), 'questions show the answer only');
    }
    assert(!posts.slice(n).some(p => !String(p.action || '').startsWith('admin_')), 'a client response was sent');
  });
  await check('Edit wording: name, summary and summary boxes → admin_edit name / summary / glance:i:label|value (server adds key + first name)', async () => {
    const n = posts.length;
    await editPage.click('[data-admin="details"]');
    await editPage.fill('#ad-name', `${BA.name} (edited)`); await editPage.fill('#ad-summary', 'A new summary for the test.');
    await editPage.fill('#ag-l0', 'Box one'); await editPage.fill('#ag-v0', 'Box one text');
    await editPage.click('form[data-form="details"] [type="submit"]'); await saved(/^Saved$/);
    const e = editsSince(n);
    const want = { name: `${BA.name} (edited)`, summary: 'A new summary for the test.', 'glance:0:label': 'Box one', 'glance:0:value': 'Box one text' };
    for (const [f, v] of Object.entries(want)) { const p = e.find(x => x.field === f); assert(p && p.value === v && p.automation === BA.id && p.client === 'boca-dental-e770de' && p.key === KEY && p.name === 'PJ', `${f}: ${JSON.stringify(p)}`); }
    assert((await editPage.innerText('.hero h1')) === `${BA.name} (edited)` && /A new summary for the test/.test(await editPage.innerText('.hero .lead')), 're-rendered');
  });
  await check('Edit wording: Start new review round asks twice, then admin_edit version = next version', async () => {
    const n = posts.length;
    await editPage.click('[data-admin="details"]'); await editPage.click('[data-newround]');
    assert(!editsSince(n).length && /Click again/.test(await editPage.innerText('[data-newround]')), 'first click saved');
    await editPage.click('[data-newround]'); await saved(/New review round started/);
    const p = editsSince(n).find(x => x.field === 'version'); assert(p && p.value !== String(BA.version) && p.key === KEY, JSON.stringify(p));
    assert((await editPage.innerText('.hero .meta')).includes(`Version ${p.value}`), 'version shown');
  });
  await check('Edit wording: step title / timing / description / note → admin_edit step:<id>:title|when|gap|body|note', async () => {
    const n = posts.length;
    const [a, s] = BOCA.automations.flatMap(x => x.steps.filter(y => y.type !== 'start').map(y => [x, y]))[1];
    await editPage.goto(`${EDIT}?c=boca-dental-e770de&a=${a.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click(`.node[data-step="${s.id}"]`); await editPage.click(`[data-admin="step:${s.id}"]`);
    await editPage.fill('#as-title', 'Edited title'); await editPage.fill('#as-when', 'Edited when'); await editPage.fill('#as-gap', 'Edited gap');
    await editPage.fill('#as-body', 'Edited description'); await editPage.fill('#as-note', 'Edited note');
    await editPage.click('form[data-form="stepadmin"] [type="submit"]'); await saved(/Step saved/);
    const got = Object.fromEntries(editsSince(n).map(p => [p.field, p.value]));
    for (const k of ['title', 'when', 'gap', 'body', 'note']) assert(got[`step:${s.id}:${k}`] === `Edited ${k === 'body' ? 'description' : k}`, `${k}: ${JSON.stringify(got)}`);
    assert(/Edited title/.test(await editPage.innerText('#flow')), 're-rendered');
  });
  await check('Edit wording: text message copy → admin_edit step:<id>:sms; email copy → step:<id>:email.subject / email.body', async () => {
    let n = posts.length;
    const [sa, ss] = smsStep;
    await editPage.goto(`${EDIT}?c=boca-dental-e770de&a=${sa.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click(`.node[data-step="${ss.id}"]`); await editPage.click(`[data-admin="copy:${ss.id}"]`);
    await editPage.fill('#ac-sms', 'Hi [First name], edited text.'); await editPage.click('form[data-form="copyadmin"] [type="submit"]'); await saved(/Copy saved/);
    assert(editsSince(n).some(p => p.field === `step:${ss.id}:sms` && p.value === 'Hi [First name], edited text.'), JSON.stringify(editsSince(n)));
    assert(/edited text/.test(await editPage.innerText('.inspector')), 'sms re-rendered');
    n = posts.length;
    const [ea, es] = emailStep;
    await editPage.goto(`${EDIT}?c=boca-dental-e770de&a=${ea.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click(`.node[data-step="${es.id}"]`); await editPage.click(`[data-admin="copy:${es.id}"]`);
    await editPage.fill('#ac-subj', 'Edited subject'); await editPage.fill('#ac-body', 'Edited body'); await editPage.click('form[data-form="copyadmin"] [type="submit"]'); await saved(/Copy saved/);
    const e = editsSince(n); assert(e.some(p => p.field === `step:${es.id}:email.subject` && p.value === 'Edited subject') && e.some(p => p.field === `step:${es.id}:email.body` && p.value === 'Edited body'), JSON.stringify(e));
  });
  await check('Edit wording: question text / why / answer buttons → admin_edit q:<id>:text|why|options', async () => {
    const code = Object.keys(DATA).find(c => DATA[c].automations.includes(qAuto)), q = qAuto.questions[0], n = posts.length;
    await editPage.goto(`${EDIT}?c=${code}&a=${qAuto.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click(`[data-admin="q:${q.id}"]`);
    await editPage.fill('#aq-text', 'Edited question?'); await editPage.fill('#aq-why', 'Edited why'); await editPage.fill('#aq-opts', 'Yes\nNo\nMaybe');
    await editPage.click('form[data-form="qadmin"] [type="submit"]'); await saved(/Question saved/);
    const got = Object.fromEntries(editsSince(n).map(p => [p.field, p.value]));
    assert(got[`q:${q.id}:text`] === 'Edited question?' && got[`q:${q.id}:why`] === 'Edited why' && got[`q:${q.id}:options`] === 'Yes\nNo\nMaybe', JSON.stringify(got));
    assert(/Edited question\?/.test(await editPage.innerText('.qs')), 're-rendered');
  });
  await check('Edit wording: Rename client → admin_edit client:name; status + reply on a request → admin_status; Delete (two clicks) → admin_delete', async () => {
    let n = posts.length;
    await editPage.goto(`${EDIT}?c=palm-beach-plastic-n9umxi`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click('[data-admin="clientname"]'); await editPage.fill('#cnameIn', 'Palm Beach Plastic Surgery'); await editPage.click('form[data-form="clientname"] [type="submit"]'); await saved(/Client name saved/);
    assert(editsSince(n).some(p => p.field === 'client:name' && p.value === 'Palm Beach Plastic Surgery' && p.automation === ''), 'rename');
    n = posts.length;
    const DA = DATA['palm-beach-plastic-n9umxi'].automations[0];
    await editPage.goto(`${EDIT}?c=palm-beach-plastic-n9umxi&a=${DA.id}`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    await editPage.click('.node[data-step="s1"]'); await editPage.waitForSelector(`form[data-form="status"][data-id="${ids.p0}"]`);
    await editPage.selectOption(`form[data-id="${ids.p0}"] select`, 'Updated — Ready for Review'); await editPage.fill(`form[data-id="${ids.p0}"] input[name="reply"]`, 'Moved one day later');
    await editPage.click(`form[data-id="${ids.p0}"] [type="submit"]`); await saved(/Status saved/);
    const st = posts.slice(n).find(p => p.action === 'admin_status'); assert(st && st.id === ids.p0 && st.status === 'Updated — Ready for Review' && st.lfmp_reply === 'Moved one day later' && st.key === KEY && st.name === 'PJ', JSON.stringify(st));
    n = posts.length;
    await editPage.click(`[data-del="${ids.p0}"]`); assert(!posts.slice(n).some(p => p.action === 'admin_delete'), 'deleted on first click');
    await editPage.click(`[data-del="${ids.p0}"]`); await saved(/^Deleted$/);
    const d = posts.slice(n).find(p => p.action === 'admin_delete'); assert(d && JSON.stringify(d.ids) === JSON.stringify([ids.p0]), JSON.stringify(d));
  });
  await check('Edit wording: Submissions view + client picker (all clients), Clear all responses on an automation', async () => {
    await editPage.click('[data-subs-open]'); await editPage.waitForSelector('.subs .scard', { timeout: 20000 });
    assert(/Client submissions/.test(await editPage.innerText('.subs h1')), 'subs');
    await editPage.click('[data-subs-close]');
    await editPage.click('[data-cpick]'); await editPage.waitForSelector('#cpickList [data-cgo]');
    assert(await editPage.locator('#cpickList [data-cgo]').count() === CODES.length, 'picker lists every client');
    await editPage.fill('#cpickQ', 'mahdavi'); await editPage.keyboard.press('Enter'); await editPage.waitForURL(/edit\.html\?c=mahdavi-law-mc1mar/);
    await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
    assert(!/messages\.html/.test(editPage.url()), 'a custom-page client is NOT redirected on the edit page');
    const n = posts.length;
    await editPage.click('[data-clear]'); await editPage.click('[data-clear]'); await saved(/Cleared \d+ response|Nothing to clear/);
    const d = posts.slice(n).find(p => p.action === 'admin_delete'); assert(d && d.client === 'mahdavi-law-mc1mar' && d.ids.length >= 1, JSON.stringify(d));
  });
  await editPage.goto(`${EDIT}?c=dumas-sanclemente-mo5cay`); await editPage.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
  await shot(editPage, 'edit-wording_1440_light');
  await check('Edit wording: Sign out → Access logout → /signin/?out=1 (never the team-domain logout)', async () => {
    await routeTeamLogout(editPage); const before = logouts, n = teamLogouts.length;
    await editPage.click('#adminbar [data-admin-exit]'); await editPage.waitForURL(/\/signin\/\?out=1$/);
    assert(logouts > before && teamLogouts.length === n, teamLogouts.at(-1));
  });
  await editPage.close(); cur = page;

  // ===== 5) Google-only sign-in
  await check('sign-in: name in the top bar; no password or key field on any page; the browser called only /api/ (never GitHub or a key)', async () => {
    assert((await page.innerText('.lv-who [data-me]')) === 'PJ Drozo', await page.innerText('.lv-who [data-me]'));
    assert(await page.isVisible('.lv-so[data-lv="signout"]'), 'a visible Sign out button next to the name');
    assert(!(await page.locator('input[type="password"], #keyView, #keyIn, #lfmpLogin').count()), 'password / key UI');
    assert(!directGh.length, `direct GitHub calls: ${directGh.join(' ')}`);
    assert(ghCalls.every(c => /^GET \/repos\/peejayedz\/automation-review\/contents\/(data|plans)\?ref=main$/.test(c) || /^(GET|PUT) \/repos\/peejayedz\/ghl-subaccount-builder\/contents\/records(\/[a-z0-9-]+\.json)?(\?ref=main)?$/.test(c)), ghCalls.join(' '));
    assert(posts.filter(p => /^admin_/.test(p.action)).every(p => p.key === KEY), 'every admin action reached the backend with the server key');
  });
  await check('sign-in: nothing secret in browser storage; old password-login leftovers are wiped on load', async () => {
    await page.evaluate(() => { localStorage.setItem('lfmp-vault', 'x'); localStorage.setItem('ar_admin_key', 'x'); localStorage.setItem('lfmp-lock-at', '1'); sessionStorage.setItem('lfmp-session', 'x'); });
    await page.reload(); await page.waitForSelector('.lv-row[data-client]', { timeout: 20000 });
    const dump = await page.evaluate(() => JSON.stringify({ l: Object.fromEntries(Object.entries(localStorage)), s: Object.fromEntries(Object.entries(sessionStorage)) }));
    for (const bad of [KEY, TEST_TOKEN, 'lfmp-vault', 'ar_admin_key', 'lfmp-lock-at', 'lfmp-session']) assert(!dump.includes(bad), `${bad} in storage: ${dump}`);
  });
  await check('last sign-in under the name; Me → Team sign-ins; top-bar Sign out → /signin/?out=1', async () => {
    const p = await ctx.newPage(); cur = p;
    await p.goto(ADMIN); await p.waitForSelector('.lv-who [data-me-last]:not(:empty)');
    ACCESS.signIn(ME_EMAIL); await p.reload(); await p.waitForFunction(() => /^Last signed in/.test(document.querySelector('.lv-who [data-me-last]')?.textContent || ''), null, { timeout: 20000 });
    assert(LAST.test(await p.innerText('.lv-who [data-me-last]')), await p.innerText('.lv-who [data-me-last]'));
    await openMe(p); assert(LAST.test(await p.innerText('.lv-pop .lv-me-who .lv-l')), 'Me: last sign-in');
    await p.click('.lv-pop [data-lv="signins"]'); await p.waitForSelector('#lfmpSignins[open] .lfmp-signins');
    const row = await p.innerText('#lfmpSignins tbody tr');
    assert(row.includes('PJ Drozo') && row.includes(ME_EMAIL) && Number(row.trim().split(/\s+/).pop()) >= 2 && await p.isHidden('.lv-pop'), row);
    await p.keyboard.press('Escape'); assert(!(await p.locator('#lfmpSignins[open]').count()), 'Esc closes it');
    await routeTeamLogout(p); const before = logouts, n = teamLogouts.length;
    await p.click('.lv-so[data-lv="signout"]'); await p.waitForURL(/\/signin\/\?out=1$/);
    assert(logouts > before && teamLogouts.length === n, `team-domain logout called: ${teamLogouts.at(-1)}`);
    await p.close(); cur = page;
  });
  await check('sign-in: a non-LFMP Google account is refused (no data); signed out → /signin/?next=<this page>', async () => {
    const p3 = await ctx.newPage();
    try {
      SIGNED.email = 'someone@gmail.com';
      await p3.goto(ADMIN); await p3.waitForSelector('#setupView:not([hidden])');
      assert(/Only @lawfirmmarketingpros\.com/.test(await p3.innerText('#setupMsg')) && !(await p3.locator('.lv-row, .lv-top').count()), await p3.innerText('#setupMsg'));
      SIGNED.email = null;
      await p3.goto('about:blank'); await p3.goto(`${ADMIN}#/subs`); await p3.waitForURL(/\/signin\/\?next=/);
      assert(decodeURIComponent(p3.url().split('next=')[1]) === '/automation-review/admin/#/subs', p3.url());
      await p3.goto(`${EDIT}?c=boca-dental-e770de`); await p3.waitForURL(/\/signin\/\?next=/);
      assert(decodeURIComponent(p3.url().split('next=')[1]) === '/automation-review/admin/edit.html?c=boca-dental-e770de', p3.url());
    } finally { SIGNED.email = ME_EMAIL; await p3.close(); }
  });
  await check('server: no refused calls while the tools ran normally', async () => assert(!refused().filter(r => r.code !== 'not_lfmp').length, JSON.stringify(refused())));
  // ===== public classic link index.html?c=<code> (v1.6.0): Link A (hash kept) or "This review has moved"; never review content
  const publicVisit = async (qs, until) => {
    const p4 = await ctx.newPage(), reqs = [];
    p4.on('request', r => { if (new URL(r.url()).pathname.startsWith('/automation-review/')) reqs.push(`${r.method()} ${new URL(r.url()).pathname}`); });
    await p4.goto(`${ORIGIN}/automation-review/${qs}`); await until(p4);
    return { p4, reqs };
  };
  const movedShown = p4 => p4.waitForFunction(() => !document.documentElement.classList.contains('checking') && /This review has moved/.test(document.body.innerText), null, { timeout: 10000 });
  const MOVED = 'This review has moved\nYour LFMP team will send you the new link.\nLaw Firm Marketing Pros';
  await check('public index.html: no admin code path and no review content (no data/<code>.json, no Sheet, no admin_ action, &admin / view=submissions ignored)', async () => {
    const src = await readFile(join(AR, 'index.html'), 'utf8');
    for (const re of [/admin_/, /ar_admin_key/, /Team sign-in/, /type="password"/, /Admin login/, /params\.has\("admin"\)/, /view=submissions|"submissions"/, /data-admin/, /data-signin/, /saveUrl|config\.js|REVIEW_CONFIG/, /\.json"\s*\)\s*\.then\(\s*r\s*=>\s*r\.json/]) assert(!re.test(src), `found ${re}`);
    const n = posts.length, { p4, reqs } = await publicVisit('?c=boca-dental-e770de&admin&view=submissions', movedShown);
    assert(!(await p4.locator('#adminbar, [data-admin], [data-signin], input, .subs, button').count()), 'admin UI on the public page');
    assert(posts.length === n && !reqs.some(r => /config\.js|\/exec/.test(r)), 'the public page reached the backend');
    assert(reqs.filter(r => /\/data\//.test(r)).every(r => r.startsWith('HEAD ')) && !reqs.some(r => r.endsWith('/data/boca-dental-e770de.json')), reqs.join(', '));
    await p4.close();
  });
  await check('public classic link: Mahdavi + ZZ TEST 2 redirect to Link A with the #hash kept (Mahdavi through its plans/ page)', async () => {
    for (const [code, final] of [['mahdavi-law-mc1mar', '/automation-review/plan.html?c=mahdavi-law-mc1mar#new-lead'], ['zz-test-2-qpqhx7', '/automation-review/plan.html?c=zz-test-2-qpqhx7#new-lead']]) {
      const { p4, reqs } = await publicVisit(`?c=${code}&a=new-lead#new-lead`, p => p.waitForURL(/plan\.html/, { timeout: 10000 }));
      await p4.waitForLoadState('load'); const u = new URL(p4.url());
      assert(u.pathname + u.search + u.hash === final, `${code}: ${p4.url()}`);
      assert(!reqs.some(r => r === `GET /automation-review/data/${code}.json`), `${code}: the classic page fetched review content: ${reqs.join(', ')}`);
      await p4.close();
    }
    const { p4 } = await publicVisit('index.html?c=zz-test-2-qpqhx7', p => p.waitForURL(/plan\.html\?c=zz-test-2-qpqhx7$/, { timeout: 10000 })); await p4.close();
  });
  await check('public classic link: Dumas, Palm Beach (classic only), an unknown code and no code show only "This review has moved" (no data/<code>.json)', async () => {
    for (const qs of ['?c=dumas-sanclemente-mo5cay', '?c=palm-beach-plastic-n9umxi&a=x#s2', '?c=nobody-zz9', '']) {
      const { p4, reqs } = await publicVisit(qs, movedShown);
      assert((await p4.innerText('body')).replace(/\n+/g, '\n').trim() === MOVED, `${qs}: ${JSON.stringify(await p4.innerText('body'))}`);
      assert(new URL(p4.url()).pathname === '/automation-review/' && !reqs.some(r => /^GET \/automation-review\/data\//.test(r)), `${qs}: ${reqs.join(', ')}`);
      assert(await p4.title() === 'This review has moved · Law Firm Marketing Pros', await p4.title());
      await p4.close();
    }
  });
  await check('public preview/ (retired): shows only "This review has moved", loads nothing; the old Hedayati copy is gone (404)', async () => {
    for (const qs of ['preview/', 'preview/?c=hedayati-law-m90omb', 'preview/index.html']) {
      const { p4, reqs } = await publicVisit(qs, p => p.waitForFunction(() => /This review has moved/.test(document.body.innerText)));
      assert((await p4.innerText('body')).replace(/\n+/g, '\n').trim() === MOVED, `${qs}: ${await p4.innerText('body')}`);
      assert(reqs.length === 1 && reqs[0].startsWith('GET /automation-review/preview/'), `${qs} loaded more than the page: ${reqs.join(', ')}`);
      await p4.close();
    }
    for (const f of ['preview/data/hedayati-law-m90omb.json', 'preview/config.js', 'preview/assets/lfmp-logo.png']) { const r = await fetch(`${ORIGIN}/automation-review/${f}`); assert(r.status === 404, `${f}: ${r.status}`); }
    const src = await readFile(join(AR, 'preview/index.html'), 'utf8');
    assert(!/fetch\(|location\.|data\/|config\.js/.test(src), 'preview page code');
  });
  await check('no console or page errors', async () => assert(!errs.length, errs.slice(0, 3).join(' | ')));
  await ctx.close();

  // ===== looks at 1440 / 390, light / dark
  ({ gs, ids } = seed());
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
    const c = await ctxFor({ width: w, height: h, scheme }); const p = await c.newPage(); const e2 = []; cur = p;
    p.on('pageerror', e => e2.push(e.message));
    await check(`${w} ${scheme}: home, Details, Submissions: AA contrast, no sideways scroll, no errors`, async () => {
      await signIn(p); await p.evaluate(() => document.fonts.ready); await p.waitForSelector('#toast', { state: 'hidden', timeout: 5000 });
      const measure = async where => {
        const m = await p.evaluate(() => { const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
          const bg = getComputedStyle(document.body).backgroundColor, panel = cs('.dpanel:not([hidden]), .grp, .lv-list')?.backgroundColor || bg;
          return { sw: document.documentElement.scrollWidth, iw: innerWidth, bg, panel, ink: getComputedStyle(document.body).color, need: cs('.dpanel:not([hidden]) .st.need, .lv-st.red, .tg-red')?.color, wait: cs('.dpanel:not([hidden]) .st.wait, .tg-tool')?.color, ok: cs('.dpanel:not([hidden]) .st.ok, .tg-green')?.color, mut: cs('.dpanel:not([hidden]) .stsub, .lv-mt, .st2 small, .gcnt')?.color, seg: cs('.lv-seg button[aria-pressed="true"]')?.color, segbg: cs('.lv-seg button[aria-pressed="true"]')?.backgroundColor }; });
        assert(m.sw <= m.iw + 1, `${where}: ${m.sw}px wide in ${m.iw}`);
        for (const [k, v, on] of [['ink', m.ink, m.bg], ['needs you', m.need, m.panel], ['waiting', m.wait, m.panel], ['ok', m.ok, m.panel], ['muted', m.mut, m.panel], ['active filter', m.seg, m.segbg]]) if (v && on) assert(ratio(v, on) >= 4.5, `${where} ${k} ${ratio(v, on).toFixed(2)}`);
      };
      await measure('home'); await shot(p, `home_${w}_${scheme}`, w === 390);
      // Waiting (amber dot) word is readable (AA on the row)
      const nm = await p.$eval('.lv-row .lv-c:not(.lv-pr) .lv-st.amber', e => [getComputedStyle(e).color, getComputedStyle(document.querySelector('.lv-list')).backgroundColor]);
      assert(ratio(nm[0], nm[1]) >= 4.5, `not started ${ratio(nm[0], nm[1]).toFixed(2)}`);
      // shell: phone = band · icon · REVIEWS · avatar (no +, no bell), bottom tabs (Reviews current), rows ≥ 44 px; desktop = one top bar
      if (w === 390) {
        assert(await p.isVisible('.lv-ptop') && await p.isHidden('.lv-top') && await p.isVisible('.lv-tabs'), 'phone bars');
        assert(await p.$eval('[data-lv-title]', h => h.textContent) === 'Reviews' && !(await p.locator('.lv-ptop [data-lv="plus"], .lv-ptop .lv-bell').count()), 'phone title / no + / no bell');
        assert(await p.$$eval('.lv-tabs .lv-tab', t => t.map(x => `${x.textContent.trim()}${x.getAttribute('aria-current') ? '*' : ''}`).join(' ')) === 'Clients Scorecards Reviews* Me', 'tabs');
        const small = await p.$$eval('.lv-row, .lv-tab, .lv-seg button, .lv-search, .lv-ptop .lv-avbtn', els => els.filter(e => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after'); const ah = a.content !== 'none' ? parseFloat(a.height) : 0; return Math.max(r.height, ah) < 44; }).map(e => e.className));
        assert(!small.length, `tap targets under 44 px: ${small.join(', ')}`);
        assert(await p.$eval('.lv-row .lv-chev', e => getComputedStyle(e).display !== 'none'), 'chevron on phone rows');
        // phone: a muted "All submissions ›" row under the list opens Submissions (desktop: the summary link)
        const sr = await p.$eval('.subsrow .lv-row', e => { const l = document.querySelector('#clist').getBoundingClientRect(), r = e.getBoundingClientRect(); return { t: e.innerText.replace(/\s+/g, ' ').trim(), below: r.top >= l.bottom, h: r.height, c: getComputedStyle(e).color, m: getComputedStyle(document.querySelector('.lv-sub, .lv-mt')).color }; });
        assert(sr.t === 'All submissions ›' && sr.below && sr.h >= 44, `subs row ${JSON.stringify(sr)}`);
        await p.click('.subsrow .lv-row'); await p.waitForURL(/#\/subs$/); await p.waitForSelector('.subshead'); await p.goBack(); await p.waitForSelector('#clist');
      } else assert(await p.isVisible('.lv-top') && await p.isHidden('.lv-tabs') && await p.isHidden('.subsrow'), 'desktop bars, no phone submissions row');
      await setTests(p, true); await p.waitForSelector(ROW('zz-test-2-qpqhx7')); await shot(p, `home-tests_${w}_${scheme}`, w === 390);
      // Details: Mahdavi (A plans/ + B), ZZ TEST 2 (A + B, test client shown), Dumas (classic only); Copy → "Copied"
      for (const [code, name] of [['mahdavi-law-mc1mar', 'mahdavi'], ['zz-test-2-qpqhx7', 'zz-test-2'], ['dumas-sanclemente-mo5cay', 'dumas']]) {
        await p.click(`${ROW(code)} .lv-nm`); await p.waitForSelector('#dPanel:not([hidden]) #clTitle'); await p.waitForTimeout(100);
        if (w === 390) assert(await p.isVisible('#dPanel .dclose .bk') && (await p.innerText('#dPanel .dclose')).trim() === '‹ Reviews' && await p.$eval('#dPanel', e => e.getBoundingClientRect().width) === 390, 'phone details: full screen with ‹ Reviews');
        await p.$eval('#clTitle', el => el.scrollIntoView({ block: 'start' }));
        if (name !== 'dumas') { await p.click('#dPanel .clinks li:first-child [data-copy]'); await p.waitForFunction(() => document.querySelector('#dPanel .clinks li:first-child .copied').textContent === 'Copied'); }
        await measure(`details ${name}`);
        const ov = await p.$$eval('#dPanel .clinks li, #dPanel .dhead', els => els.filter(e => e.scrollWidth > e.clientWidth + 1).length);
        assert(!ov, `details ${name}: ${ov} clipped link rows`);
        await shot(p, `details-${name}_${w}_${scheme}`); await p.keyboard.press('Escape'); await p.waitForSelector('#dPanel', { state: 'hidden' });
      }
      // Edit tab: ZZ TEST 2 (an email open in its form, the new-version question), Dumas (no client link yet)
      await p.goto(`${ADMIN}#/client/zz-test-2-qpqhx7/edit/new-lead`); await p.waitForSelector('#dPanel:not([hidden]) .edmsg');
      await p.waitForTimeout(250); await measure('edit tab'); await shot(p, `edit-tab_${w}_${scheme}`);
      await p.click('#dPanel [data-ed-open="new-lead.s3"]'); await p.waitForSelector('#edText'); await p.$eval('#dPanel .edmsg.on', el => el.scrollIntoView({ block: 'start' }));
      await measure('edit tab form'); await shot(p, `edit-tab-form_${w}_${scheme}`);
      const eov = await p.$$eval('#dPanel .edmsg, #dPanel .edbar, #dPanel .dtabs, #dPanel .edintro', els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className));
      assert(!eov.length, `edit tab clipped: ${eov}`);
      await p.click('[data-ed-cancel]'); await p.click('[data-ed-ver]'); await p.waitForSelector('.edconfirm'); await shot(p, `edit-tab-version_${w}_${scheme}`); await p.click('[data-ed-ver-cancel]');
      await p.goto(`${ADMIN}#/client/dumas-sanclemente-mo5cay/edit`); await p.waitForSelector('#dPanel:not([hidden]) .nolinkbox'); await shot(p, `edit-tab-nolink_${w}_${scheme}`);
      await p.click('[data-menu="dpMenu"]'); await shot(p, `details-menu_${w}_${scheme}`); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
      await setTests(p, false);
      await p.goto(`${ADMIN}#/subs`); await p.waitForSelector('.sline'); await p.click('.sline >> nth=1'); await p.waitForSelector('.sopen');
      await measure('submissions'); await shot(p, `submissions_${w}_${scheme}`, w === 390);
      if (w === 390) assert(await p.$eval('[data-lv-title]', h => h.textContent) === 'Submissions', 'phone title on Submissions');
      // the signed-in person: top bar (desktop) / Me (phone), and Me → Team sign-ins
      if (w === 390) assert(await p.isHidden('.lv-top .lv-who'), 'phone: the name + Sign out live in Me');
      else { assert(await p.isVisible('.lv-so') && /^(Last signed in|First sign-in)/.test(await p.innerText('.lv-who [data-me-last]')), 'top bar: name, last sign-in, Sign out'); await p.locator('.lv-top').screenshot({ path: join(OUT, `topbar_${w}_${scheme}.png`) }); }
      await openMe(p); await shot(p, `menu_${w}_${scheme}`);
      if (w === 390) {
        assert(await p.$$eval('.lv-tabs .lv-tab', t => t.map(x => `${x.textContent.trim()}${x.getAttribute('aria-current') ? '*' : ''}`).join(' ')) === 'Clients Scorecards Reviews Me*', 'Me tab current');
        assert(await p.isVisible('[data-lv-me] .lv-mi.out'), 'phone Me: red Sign out row');
      }
      await p.click('[data-lv="signins"]:visible'); await p.waitForSelector('#lfmpSignins[open] .lfmp-signins');
      await measure('team sign-ins'); await shot(p, `team-signins_${w}_${scheme}`); await p.keyboard.press('Escape');
      if (w === 390) { const sc = await p.evaluate(() => { const s = document.querySelector('.segscroll'); return [s.scrollWidth, s.clientWidth, getComputedStyle(s).overflowX]; }); assert(sc[2] === 'auto', `filters don't scroll sideways: ${sc}`); }
      // Edit wording (team page): the edit bar, an open step with its edit buttons; no sideways scroll
      await p.goto(`${EDIT}?c=dumas-sanclemente-mo5cay`); await p.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
      if (w === 390) await p.click('.node[data-step="s2"]');
      await p.waitForTimeout(150);
      const ew = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(ew[0] <= ew[1] + 1, `edit page ${ew[0]}px wide in ${ew[1]}`);
      await shot(p, `classic-editor_${w}_${scheme}`);
      // the public classic link for a classic-only client: "This review has moved" (client-facing)
      await p.goto(`${ORIGIN}/automation-review/?c=dumas-sanclemente-mo5cay`); await movedShown(p); await p.evaluate(() => document.fonts.ready);
      const mv = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.card')), h = getComputedStyle(document.querySelector('h1')), t = getComputedStyle(document.querySelector('main p')); return [document.documentElement.scrollWidth, innerWidth, h.color, t.color, c.backgroundColor]; });
      assert(mv[0] <= mv[1] + 1 && ratio(mv[2], mv[4]) >= 4.5 && ratio(mv[3], mv[4]) >= 4.5, `moved page: ${mv}`);
      assert(!(await p.locator('[data-signin], #adminbar, [data-admin], input, button').count()), 'controls on the moved page');
      await shot(p, `moved-page_${w}_${scheme}`);
      assert(!e2.length, e2.join(' | '));
    });
    await c.close();
  }
} finally {
  await browser.close(); server.closeAllConnections?.(); server.close();
  const ok = results.filter(Boolean).length;
  console.log(`\n${ok}/${results.length} checks passed. Screenshots: ${OUT}`);
  process.exitCode = ok === results.length ? 0 : 1;
}
