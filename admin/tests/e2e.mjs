// Review admin v1.4.0 in Chromium, against the REAL team-site server (ghl-subaccount-builder/admin-site/lib/api.mjs) with a
// stand-in for Cloudflare Access (test-access.mjs) and the real Code.gs in a mock (tests/mock/apps-script.mjs):
// Google-only sign-in (name + Sign out, no password or key anywhere, nothing secret in browser storage, signed out →
// /signin/?next=…, non-LFMP account refused), home, Details (client links, Copy, Not started), Submissions, every admin
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
const ENV = ACCESS.env();
const DEPS = ACCESS.deps({
  github: (method, path) => {
    ghCalls.push(`${method} ${path}`);
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
// The team-wide Access logout (lfmp.cloudflareaccess.com) answers by going to returnTo, as the real one does.
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
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme });
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
  await page.waitForSelector('.crow[data-client]', { timeout: 20000 });
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
  await check('home: top line = N clients / N need you → (test clients hidden by default)', async () => {
    const strip = await page.innerText('.strip');
    const real = CODES.filter(c => !/^zz-/.test(c)).length;
    assert(strip.includes(`${real} CLIENTS`) && /2 NEED YOU/.test(strip), strip);
    assert(!(await page.locator('.crow[data-client="zz-test-2-qpqhx7"]').count()), 'ZZ shown');
    assert(!(await page.locator('.bell, #loadedAt').count()), 'bell / loaded line on the home');
  });
  await check('home: statuses follow the rule (Needs you / Waiting / Not started / OK), Details gold only when needed', async () => {
    const rows = await page.$$eval('.crow', rs => rs.map(r => [r.dataset.client, r.querySelector('.cstat').innerText.replace(/\s+/g, ' ').trim(), r.querySelector('.cacts .btn.p') ? 'gold' : '']));
    const get = c => rows.find(r => r[0] === c);
    assert(rows[0][0] === 'dumas-sanclemente-mo5cay' && /Needs you 6 requests to answer/.test(rows[0][1]) && rows[0][2] === 'gold', JSON.stringify(rows[0]));
    assert(/Needs you 1 request to answer/.test(get('palm-beach-plastic-n9umxi')[1]), 'palm');
    assert(/Waiting Waiting for the client/.test(get('mahdavi-law-mc1mar')[1]) && !get('mahdavi-law-mc1mar')[2], 'mahdavi');
    assert(/OK Nothing waiting/.test(get('boca-dental-e770de')[1]), `boca (replaced request + approval): ${get('boca-dental-e770de')[1]}`);
    // no responses at all (Emery, Hedayati, Sralla in the seed) → grey "○ Not started · Links not opened yet", never "OK"
    for (const c of ['emery-law-9lp7do', 'hedayati-law-m90omb', 'sralla-family-law-rbi2yj']) assert(/○\s*Not started\s*Links not opened yet$/.test(get(c)[1]) && !get(c)[2], `${c}: ${get(c)[1]}`);
    assert(await page.$eval('.crow[data-client="emery-law-9lp7do"] .st', e => e.classList.contains('new')), 'not started is grey (.st.new)');
  });
  await check('home order: Needs you, then Waiting, then Not started, then OK', async () => {
    const order = await page.$$eval('.crow .st', s => s.map(x => x.className.replace('st ', '')));
    const rank = { need: 0, wait: 1, new: 2, ok: 3 };
    assert(order.every((k, i) => !i || rank[order[i - 1]] <= rank[k]), order.join(','));
    assert(order.join(',') === 'need,need,wait,new,new,new,ok', order.join(','));
  });
  await check('home: Needs you filter (also from the top line), Show test clients, search', async () => {
    await page.click('.strip .stripbtn'); assert(await page.locator('.crow').count() === 2, 'needs-you filter from strip');
    await page.click('[data-home-filter="all"]');
    await page.check('#showTests'); await page.waitForSelector('.crow[data-client="zz-test-2-qpqhx7"] .testtag');
    await page.uncheck('#showTests');
    await page.fill('#homeQ', 'palm'); assert(await page.locator('.crow').count() === 1, 'search'); await page.fill('#homeQ', '');
  });
  await check('home: Review page ↗ = Link A when the client has one (plans/ page for Mahdavi), else the classic ?c= link; new tab; row click = Details', async () => {
    const href = await page.getAttribute('.crow[data-client="boca-dental-e770de"] .cacts a:first-child', 'href');
    assert(href === '../?c=boca-dental-e770de' && await page.getAttribute('.crow[data-client="boca-dental-e770de"] .cacts a:first-child', 'target') === '_blank', href);
    assert(await page.getAttribute('.crow[data-client="mahdavi-law-mc1mar"] .cacts a:first-child', 'href') === '../plans/mahdavi-law-mc1mar.html', 'mahdavi home link');
    assert(await page.getAttribute('.crow[data-client="dumas-sanclemente-mo5cay"] .cacts a:first-child', 'href') === '../?c=dumas-sanclemente-mo5cay', 'dumas home link');
    await page.click('.crow[data-client="mahdavi-law-mc1mar"] .cname'); await page.waitForSelector('#dPanel:not([hidden])');
    assert(page.url().endsWith('#/client/mahdavi-law-mc1mar'), page.url());
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
  await check('Details Mahdavi: CLIENT LINKS (send to the client) = Link A · Plan + review (plans/ page), Link B · Review only; For the team: Classic dashboard', async () => {
    assert(/CLIENT LINKS\s*\(SEND TO THE CLIENT\)/i.test(await page.innerText('#clTitle')), 'heading');
    const ls = await clientLinks();
    const abs = rel => new URL(rel, ADMIN).href;
    assert(JSON.stringify(ls.map(l => l.slice(0, 3))) === JSON.stringify([['a', 'Link A · Plan + review', 'Send this one first'], ['b', 'Link B · Review only', 'For re-reviews']]), JSON.stringify(ls));
    assert(ls[0][4] === '../plans/mahdavi-law-mc1mar.html' && ls[0][5] === abs('../plans/mahdavi-law-mc1mar.html') && ls[0][3] === abs('../plans/mahdavi-law-mc1mar.html').replace(/^https?:\/\//, ''), JSON.stringify(ls[0]));
    assert(ls[1][4] === '../messages.html?c=mahdavi-law-mc1mar' && ls[1][5] === abs('../messages.html?c=mahdavi-law-mc1mar'), JSON.stringify(ls[1]));
    assert(await page.$$eval('#dPanel .clinks .cla a', as => as.every(a => a.target === '_blank' && /Open/.test(a.textContent))), 'Open ↗ in a new tab');
    assert(!(await page.locator('#dPanel .links, #dPanel .clinks li:has-text("Sent")').count()), 'old Links block / a "Sent" mark (the Builder record has no sent field)');
    const team = await page.$eval('#dPanel .lbl.team + a', a => [a.previousElementSibling.textContent, a.textContent.trim(), a.getAttribute('href'), a.target]);
    assert(team[0] === 'For the team' && team[1] === 'Classic dashboard ↗' && team[2] === '../?c=mahdavi-law-mc1mar&classic' && team[3] === '_blank', JSON.stringify(team));
    const fs = await page.$$eval('#dPanel .clt b, #dPanel .lbl.team + a', e => e.map(x => parseFloat(getComputedStyle(x).fontSize)));
    assert(fs[fs.length - 1] < fs[0], `team link smaller than the client links ${fs}`);
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
  await check('Details ZZ TEST 2 (Builder package): Link A = plan.html?c=, Link B = messages.html?c=', async () => {
    await page.goto(`${ADMIN}#/client/zz-test-2-qpqhx7`); await page.waitForSelector('#dPanel:not([hidden]) .clinks');
    const ls = await clientLinks();
    assert(ls.map(l => `${l[0]}=${l[4]}`).join(' ') === 'a=../plan.html?c=zz-test-2-qpqhx7 b=../messages.html?c=zz-test-2-qpqhx7', JSON.stringify(ls));
  });
  await check('Details Dumas (classic only): one "Review page" link (the ?c= link they were sent) with Open + Copy, no A/B', async () => {
    await page.goto(`${ADMIN}#/client/dumas-sanclemente-mo5cay`); await page.waitForSelector('#dPanel:not([hidden]) .clinks');
    const ls = await clientLinks();
    assert(ls.length === 1 && ls[0][0] === 'c' && ls[0][1] === 'Review page' && ls[0][4] === '../?c=dumas-sanclemente-mo5cay' && ls[0][5] === new URL('../?c=dumas-sanclemente-mo5cay', ADMIN).href, JSON.stringify(ls));
    assert(/Needs you\s*·?\s*6 requests to answer/.test(await page.innerText('#dPanel .dstat')), 'status line');
    await page.click('#dPanel .clinks [data-copy]'); assert(await page.evaluate(() => navigator.clipboard.readText()) === ls[0][5], 'copy');
  });
  await check('Details Emery (no responses): grey "○ Not started · Links not opened yet"; Palm Beach is classic too', async () => {
    await page.goto(`${ADMIN}#/client/emery-law-9lp7do`); await page.waitForSelector('#dPanel:not([hidden]) .dstat');
    assert(/^○\s*Not started\s*·?\s*Links not opened yet$/.test((await page.innerText("#dPanel .dstat")).trim()), await page.innerText('#dPanel .dstat'));
    assert(/No responses yet/.test(await page.innerText('#dPanel')), 'last activity');
    await page.goto(`${ADMIN}#/client/palm-beach-plastic-n9umxi`); await page.waitForSelector('#dPanel:not([hidden]) .clinks');
    const ls = await clientLinks(); assert(ls.length === 1 && ls[0][4] === '../?c=palm-beach-plastic-n9umxi', JSON.stringify(ls));
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
    assert((await page.innerText('.crow[data-client="dumas-sanclemente-mo5cay"] .cname')).includes('DUMAS & SANCLEMENTE, P.A.'), 'home row name');
  });
  await check('Details ⋯: Edit wording opens the team-only Edit wording page (same tab), never the public page', async () => {
    await page.click('[data-menu="dpMenu"]');
    const a = page.locator('#dpMenu a'); assert((await a.getAttribute('href')) === 'edit.html?c=dumas-sanclemente-mo5cay' && !(await a.getAttribute('target')), 'edit link');
    await page.keyboard.press('Escape');
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
    assert(counts.join('|') === 'TO ANSWER 7|WAITING FOR CLIENT 1|DONE 2|EVERYTHING 13', counts.join('|'));
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
  await check('Open row ⋯: History shows the status change; Open on the client\'s dashboard link', async () => {
    const id = ids.d0;
    if (!(await page.locator(`#so-${id}`).count())) await page.click(`[data-sub="${id}"]`);
    await page.click(`#so-${id} [data-menu]`); await page.click(`#so-${id} [data-hist]`);
    const h = await page.innerText(`#so-${id} .hist`); assert(/Sent by the client/.test(h) && /In progress · “On it today”/.test(h), h);
    await page.click(`#so-${id} [data-menu]`);
    const href = await page.getAttribute(`#so-${id} .menu a`, 'href'); assert(/^edit\.html\?c=dumas-sanclemente-mo5cay&a=[\w-]+$/.test(href), href);
    assert(/Open in Edit wording/.test(await page.innerText(`#so-${id} .menu a`)), 'label');
    await page.keyboard.press('Escape');
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
    assert((await page.getAttribute('.gh .gopen', 'href')) === '../?c=boca-dental-e770de' && (await page.getAttribute('.gh .gopen', 'target')) === '_blank', 'open their review = the plain client link');
    await page.keyboard.press('Escape'); assert(!(await page.locator(`#so-${ids.b0}`).count()), 'Esc closes the row');
  });
  await check('Details ⋯ Clear all responses: type-to-confirm, then admin_delete with all of that client\'s ids', async () => {
    await page.goto(`${ADMIN}#/client/zz-test-2-qpqhx7`); await page.waitForSelector('#dPanel:not([hidden])');
    await page.click('[data-menu="dpMenu"]'); await page.click('#dpMenu [data-dp="clear"]');
    assert(await page.isDisabled('#clrGo'), 'enabled before typing');
    await page.fill('#clrIn', 'zz test'); assert(await page.isDisabled('#clrGo'), 'wrong name enabled it');
    await page.fill('#clrIn', 'ZZ TEST 2'); await page.click('#clrGo'); await page.waitForFunction(() => /Cleared 2 responses/.test(document.getElementById('toast').textContent));
    const p = lastPost('admin_delete'); assert(p.client === 'zz-test-2-qpqhx7' && p.ids.length === 2 && p.ids.includes(ids.z0) && p.ids.includes(ids.z1), JSON.stringify(p));
  });
  await check('⋯ top menu: Refresh, Team sign-ins, Sign out (no key, no Lock)', async () => {
    await page.keyboard.press('Escape');
    await page.click('[data-menu="topMenu"]'); const items = await page.$$eval('#topMenu button', b => b.map(x => x.textContent)); assert(items.join('|') === 'Refresh|Team sign-ins|Sign out', items.join('|'));
    await page.click('#topMenu [data-act="reload"]'); await page.waitForFunction(() => /Refreshed/.test(document.getElementById('toast').textContent));
  });

  // ===== 4) Edit wording (team only): every edit type the old classic "&admin" mode had
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
    assert(/Edit wording/.test(bar) && /Signed in as PJ Drozo/.test(bar) && /Sign out/.test(bar) && /Review admin/.test(bar), bar);
    assert(await editPage.getAttribute('#adminbar a.btn', 'href') === '/automation-review/admin/#/client/boca-dental-e770de', 'back link');
    assert(await editPage.locator('[data-admin="details"]').count() === 1, 'details edit button');
    assert(!(await editPage.locator('input[type="password"]').count()), 'password field');
    assert(/Edit wording · /.test(await editPage.title()), await editPage.title());
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
  await check('Edit wording: Sign out → this site\'s + the team-wide Access logout → /signin/?out=1', async () => {
    await routeTeamLogout(editPage); const before = logouts, n = teamLogouts.length;
    await editPage.click('#adminbar [data-admin-exit]'); await editPage.waitForURL(/\/signin\/\?out=1$/);
    assert(logouts > before && teamLogouts.length === n + 1 && new URL(teamLogouts.at(-1)).searchParams.get('returnTo') === `${ORIGIN}/signin/?out=1`, teamLogouts.at(-1));
  });
  await editPage.close(); cur = page;

  // ===== 5) Google-only sign-in
  await check('sign-in: name in the top bar; no password or key field on any page; the browser called only /api/ (never GitHub or a key)', async () => {
    assert((await page.innerText('#meName')) === 'PJ Drozo' && (await page.getAttribute('#meWho', 'title')) === ME_EMAIL, await page.innerText('#meName'));
    assert(await page.isVisible('#meWho [data-act="signout"]'), 'a visible Sign out button next to the name');
    assert(!(await page.locator('input[type="password"], #keyView, #keyIn, #lfmpLogin').count()), 'password / key UI');
    assert(!directGh.length, `direct GitHub calls: ${directGh.join(' ')}`);
    assert(ghCalls.every(c => /^GET \/repos\/peejayedz\/automation-review\/contents\/(data|plans)\?ref=main$/.test(c)), ghCalls.join(' '));
    assert(posts.filter(p => /^admin_/.test(p.action)).every(p => p.key === KEY), 'every admin action reached the backend with the server key');
  });
  await check('sign-in: nothing secret in browser storage; old password-login leftovers are wiped on load', async () => {
    await page.evaluate(() => { localStorage.setItem('lfmp-vault', 'x'); localStorage.setItem('ar_admin_key', 'x'); localStorage.setItem('lfmp-lock-at', '1'); sessionStorage.setItem('lfmp-session', 'x'); });
    await page.reload(); await page.waitForSelector('.crow[data-client]', { timeout: 20000 });
    const dump = await page.evaluate(() => JSON.stringify({ l: Object.fromEntries(Object.entries(localStorage)), s: Object.fromEntries(Object.entries(sessionStorage)) }));
    for (const bad of [KEY, TEST_TOKEN, 'lfmp-vault', 'ar_admin_key', 'lfmp-lock-at', 'lfmp-session']) assert(!dump.includes(bad), `${bad} in storage: ${dump}`);
  });
  await check('last sign-in under the name; ⋯ → Team sign-ins; top-bar Sign out → /signin/?out=1', async () => {
    const p = await ctx.newPage(); cur = p;
    await p.goto(ADMIN); await p.waitForSelector('#meWho [data-me-last]:not(:empty)');
    ACCESS.signIn(ME_EMAIL); await p.reload(); await p.waitForFunction(() => /^Last signed in/.test(document.querySelector('#meWho [data-me-last]')?.textContent || ''), null, { timeout: 20000 });
    assert(LAST.test(await p.innerText('#meWho [data-me-last]')), await p.innerText('#meWho [data-me-last]'));
    await p.click('[data-menu="topMenu"]'); assert(LAST.test(await p.innerText('#topMenu [data-me-last]')), 'menu: last sign-in');
    await p.click('#topMenu [data-act="signins"]'); await p.waitForSelector('#lfmpSignins[open] .lfmp-signins');
    const row = await p.innerText('#lfmpSignins tbody tr');
    assert(row.includes('PJ Drozo') && row.includes(ME_EMAIL) && Number(row.trim().split(/\s+/).pop()) >= 2 && await p.isHidden('#topMenu'), row);
    await p.keyboard.press('Escape'); assert(!(await p.locator('#lfmpSignins[open]').count()), 'Esc closes it');
    await routeTeamLogout(p); const before = logouts;
    await p.click('#meWho [data-act="signout"]'); await p.waitForURL(/\/signin\/\?out=1$/);
    assert(logouts > before && new URL(teamLogouts.at(-1)).searchParams.get('returnTo') === `${ORIGIN}/signin/?out=1`, teamLogouts.at(-1));
    await p.close(); cur = page;
  });
  await check('sign-in: a non-LFMP Google account is refused (no data); signed out → /signin/?next=<this page>', async () => {
    const p3 = await ctx.newPage();
    try {
      SIGNED.email = 'someone@gmail.com';
      await p3.goto(ADMIN); await p3.waitForSelector('#setupView:not([hidden])');
      assert(/Only @lawfirmmarketingpros\.com/.test(await p3.innerText('#setupMsg')) && !(await p3.locator('.crow').count()), await p3.innerText('#setupMsg'));
      SIGNED.email = null;
      await p3.goto('about:blank'); await p3.goto(`${ADMIN}#/subs`); await p3.waitForURL(/\/signin\/\?next=/);
      assert(decodeURIComponent(p3.url().split('next=')[1]) === '/automation-review/admin/#/subs', p3.url());
      await p3.goto(`${EDIT}?c=boca-dental-e770de`); await p3.waitForURL(/\/signin\/\?next=/);
      assert(decodeURIComponent(p3.url().split('next=')[1]) === '/automation-review/admin/edit.html?c=boca-dental-e770de', p3.url());
    } finally { SIGNED.email = ME_EMAIL; await p3.close(); }
  });
  await check('server: no refused calls while the tools ran normally', async () => assert(!refused().filter(r => r.code !== 'not_lfmp').length, JSON.stringify(refused())));
  await check('public index.html: no admin code path (no admin_ action, ar_admin_key, Team sign-in, password field, &admin, Submissions view)', async () => {
    const src = await readFile(join(AR, 'index.html'), 'utf8');
    for (const re of [/admin_/, /ar_admin_key/, /Team sign-in/, /type="password"/, /Admin login/, /params\.has\("admin"\)/, /view=submissions|"submissions"/, /data-admin/, /data-signin/]) assert(!re.test(src), `found ${re}`);
    const p4 = await ctx.newPage(); const n = posts.length;
    await p4.goto(`${ORIGIN}/automation-review/?c=boca-dental-e770de&admin&view=submissions`); await p4.waitForSelector('.hero h1');
    assert(!(await p4.locator('#adminbar, [data-admin], [data-signin], input[type="password"], .subs').count()), 'admin UI on the public page');
    assert(posts.length === n, 'the public page made an admin call'); await p4.close();
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
          const bg = getComputedStyle(document.body).backgroundColor, panel = cs('.clist, .grp, .dpanel:not([hidden])')?.backgroundColor || bg;
          return { sw: document.documentElement.scrollWidth, iw: innerWidth, bg, panel, ink: getComputedStyle(document.body).color, acc: cs('.hero .disp .g')?.color, need: cs('.st.need, .tg-red')?.color, wait: cs('.st.wait, .tg-tool')?.color, ok: cs('.st.ok, .tg-green')?.color, mut: cs('.stsub, .st2 small, .gcnt')?.color, seg: cs('.seg button[aria-pressed="true"]')?.color, segbg: cs('.seg button[aria-pressed="true"]')?.backgroundColor }; });
        assert(m.sw <= m.iw + 1, `${where}: ${m.sw}px wide in ${m.iw}`);
        for (const [k, v, on] of [['ink', m.ink, m.bg], ['accent', m.acc, m.bg], ['needs you', m.need, m.panel], ['waiting', m.wait, m.panel], ['ok', m.ok, m.panel], ['muted', m.mut, m.panel], ['active filter', m.seg, m.segbg]]) if (v && on) assert(ratio(v, on) >= 4.5, `${where} ${k} ${ratio(v, on).toFixed(2)}`);
      };
      await measure('home'); await shot(p, `home_${w}_${scheme}`, w === 390);
      // Not started is grey and readable (AA on the row)
      const nm = await p.$eval('.st.new', e => [getComputedStyle(e).color, getComputedStyle(document.querySelector('.clist')).backgroundColor]);
      assert(ratio(nm[0], nm[1]) >= 4.5, `not started ${ratio(nm[0], nm[1]).toFixed(2)}`);
      await p.check('#showTests'); await p.waitForSelector('.crow[data-client="zz-test-2-qpqhx7"]'); await shot(p, `home-tests_${w}_${scheme}`, w === 390);
      // Details: Mahdavi (A plans/ + B), ZZ TEST 2 (A + B, test client shown), Dumas (classic only); Copy → "Copied"
      for (const [code, name] of [['mahdavi-law-mc1mar', 'mahdavi'], ['zz-test-2-qpqhx7', 'zz-test-2'], ['dumas-sanclemente-mo5cay', 'dumas']]) {
        await p.click(`.crow[data-client="${code}"] .cname`); await p.waitForSelector('#dPanel:not([hidden]) .clinks'); await p.waitForTimeout(100);
        await p.$eval('#dPanel .clinks', el => el.scrollIntoView({ block: 'start' }));
        await p.click('#dPanel .clinks li:first-child [data-copy]'); await p.waitForFunction(() => document.querySelector('#dPanel .clinks li:first-child .copied').textContent === 'Copied');
        await measure(`details ${name}`);
        const ov = await p.$$eval('#dPanel .clinks li, #dPanel .dhead', els => els.filter(e => e.scrollWidth > e.clientWidth + 1).length);
        assert(!ov, `details ${name}: ${ov} clipped link rows`);
        await shot(p, `details-${name}_${w}_${scheme}`); await p.keyboard.press('Escape'); await p.waitForSelector('#dPanel', { state: 'hidden' });
      }
      await p.uncheck('#showTests');
      await p.goto(`${ADMIN}#/subs`); await p.waitForSelector('.sline'); await p.click('.sline >> nth=1'); await p.waitForSelector('.sopen');
      await measure('submissions'); await shot(p, `submissions_${w}_${scheme}`, w === 390);
      // the signed-in person: top bar (desktop) / ⋯ menu (phone), and ⋯ → Team sign-ins
      if (w === 390) assert(await p.isHidden('#meWho'), 'phone: the name + Sign out live in the ⋯ menu');
      else { assert(await p.isVisible('#meWho [data-act="signout"]') && /^(Last signed in|First sign-in)/.test(await p.innerText('#meWho [data-me-last]')), 'top bar: name, last sign-in, Sign out'); await p.locator('header.top').first().screenshot({ path: join(OUT, `topbar_${w}_${scheme}.png`) }); }
      await p.click('[data-menu="topMenu"]'); await shot(p, `menu_${w}_${scheme}`);
      await p.click('#topMenu [data-act="signins"]'); await p.waitForSelector('#lfmpSignins[open] .lfmp-signins');
      await measure('team sign-ins'); await shot(p, `team-signins_${w}_${scheme}`); await p.keyboard.press('Escape');
      if (w === 390) { const sc = await p.evaluate(() => { const s = document.querySelector('.segscroll'); return [s.scrollWidth, s.clientWidth, getComputedStyle(s).overflowX]; }); assert(sc[2] === 'auto', `filters don't scroll sideways: ${sc}`); }
      // Edit wording (team page): the edit bar, an open step with its edit buttons; no sideways scroll
      await p.goto(`${EDIT}?c=dumas-sanclemente-mo5cay`); await p.waitForSelector('#adminbar .adminbadge', { timeout: 20000 });
      if (w === 390) await p.click('.node[data-step="s2"]');
      await p.waitForTimeout(150);
      const ew = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(ew[0] <= ew[1] + 1, `edit page ${ew[0]}px wide in ${ew[1]}`);
      await shot(p, `edit-wording_${w}_${scheme}`, w === 390);
      // the public classic page, client view (no admin entry anywhere)
      await p.goto(`${ORIGIN}/automation-review/?c=dumas-sanclemente-mo5cay`); await p.waitForFunction(() => /^Updated /.test(document.getElementById('updated')?.textContent || ''), null, { timeout: 20000 });
      assert(!(await p.locator('[data-signin], #adminbar, [data-admin]').count()), 'admin entry on the public page');
      await shot(p, `public-client-view_${w}_${scheme}`, w === 390);
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
