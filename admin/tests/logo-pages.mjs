// Review pages v1.12.x client logo (queue item 4; client-facing: Andy approves first, NOT pushed).
//   1. No logo → every existing package's Link A (plan.html) and Link B (messages.html) render exactly as before: the
//      same body HTML and the same pixels as the committed pages (git HEAD), light and dark, 1440 and 390.
//      Packages: the published ones in data/ (*.messages.json) + the Builder's review packages (records/*/review-package).
//   2. A logo (brand.logo) → it replaces the client-name text in the same header spot (alt = the client's name), 34 px
//      high, on a small white rounded chip in dark mode. Screenshots → test-results/logo-pages/ (+ side-by-side folder).
// Run (from automation-review/): node admin/tests/logo-pages.mjs [side-by-side-folder]   (CHROMIUM_PATH as usual)
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url)), REPO = join(HERE, '../..'), BUILDER = join(REPO, '../ghl-subaccount-builder');
const OUT = join(BUILDER, 'test-results/logo-pages'), SIDE = process.argv[2] || '';
const { chromium } = createRequire(join(BUILDER, 'node_modules/playwright-core/package.json'))('./index.js');
const results = []; const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(label, fn) { try { await fn(); results.push({ ok: true, label }); } catch (e) { results.push({ ok: false, label, err: e.message.split('\n')[0] }); } }
const ORIGIN = 'https://review.test';
const oldPage = f => execFileSync('git', ['show', `HEAD:${f}`], { cwd: REPO, encoding: 'utf8' });

// every package: code → { data, messages, plan }
async function packages() {
  const out = {};
  for (const f of (await readdir(join(REPO, 'data'))).filter(f => f.endsWith('.messages.json'))) {
    const code = f.replace(/\.messages\.json$/, '');
    if (!existsSync(join(REPO, 'data', `${code}.plan.json`)) || !existsSync(join(REPO, 'data', `${code}.json`))) continue;
    out[code] = { data: JSON.parse(await readFile(join(REPO, 'data', `${code}.json`), 'utf8')), messages: JSON.parse(await readFile(join(REPO, 'data', f), 'utf8')), plan: JSON.parse(await readFile(join(REPO, 'data', `${code}.plan.json`), 'utf8')), from: 'data/' };
  }
  for (const d of await readdir(join(BUILDER, 'records'), { withFileTypes: true }).catch(() => [])) {
    const p = join(BUILDER, 'records', d.name, 'review-package/package.json');
    if (!d.isDirectory() || !existsSync(p)) continue;
    const pkg = JSON.parse(await readFile(p, 'utf8'));
    out[`pkg-${pkg.code}`] = { ...pkg.files, from: `Builder records/${d.name}` };
  }
  return out;
}

async function main() {
  await rm(OUT, { recursive: true, force: true }); await mkdir(OUT, { recursive: true }); if (SIDE) await mkdir(SIDE, { recursive: true });
  const PKGS = await packages();
  const pages = { new: { plan: await readFile(join(REPO, 'plan.html'), 'utf8'), messages: await readFile(join(REPO, 'messages.html'), 'utf8') }, old: { plan: oldPage('plan.html'), messages: oldPage('messages.html') } };
  const config = await readFile(join(REPO, 'config.js'), 'utf8');
  const LOGO = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 12 214 60"><path d="M16 20c5-7 12-5 17 0 5-5 12-7 17 0 5 7 0 22-2.4 31-2 7-7 7-7.4 0l-2.2-12c-.4-4.6-5.4-4.6-5.8 0l-2.2 12c-.4 7-5.4 7-7.4 0C18.4 42 11 27 16 20z" fill="#2fa4a8"/><text x="68" y="44" font-family="Georgia,serif" font-size="30" font-weight="700" fill="#1d3b5c">ZZ Dental</text><text x="70" y="66" font-family="Arial,sans-serif" font-size="11" letter-spacing="3" fill="#2fa4a8">SMILE STUDIO</text></svg>').toString('base64')}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const open = async (which, page, code, files, { width = 1440, height = 900, scheme = 'light' } = {}) => {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await ctx.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.origin !== ORIGIN) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"rows":[],"log":[]}' });   // the answers backend: none
        const p = u.pathname.slice(1);
        if (p === 'plan.html' || p === 'messages.html') return r.fulfill({ status: 200, contentType: 'text/html', body: pages[which][p.replace('.html', '')] });
        if (p === 'config.js') return r.fulfill({ status: 200, contentType: 'text/javascript', body: config });
        const m = p.match(/^data\/(.+?)(\.messages|\.plan)?\.json$/);
        if (m && m[1] === code) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(m[2] === '.messages' ? files.messages : m[2] === '.plan' ? files.plan : files.data) });
        const f = join(REPO, p); if (existsSync(f) && !p.includes('..')) return readFile(f).then(b => r.fulfill({ status: 200, body: b }));
        return r.fulfill({ status: 404, body: '' });
      });
      const pg = await ctx.newPage();
      await pg.goto(`${ORIGIN}/${page}.html?c=${encodeURIComponent(code)}`);
      await pg.waitForFunction(() => (document.getElementById('page-h1')?.textContent || '').trim().length > 0, null, { timeout: 15000 });
      await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
      return { ctx, pg };
    };
    // 1) no logo: identical to today
    for (const [code, files] of Object.entries(PKGS)) for (const page of ['plan', 'messages']) for (const [width, height] of [[1440, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
      await check(`no logo, unchanged: ${code} (${files.from}) · ${page} · ${width} ${scheme}`, async () => {
        assert(!files.messages?.brand?.logo, 'this package already has a logo');
        const a = await open('old', page, code, files, { width, height, scheme }), b = await open('new', page, code, files, { width, height, scheme });
        // the rendered page (the page's own <script> source aside: that is the code that changed)
        const dom = () => { const c = document.body.cloneNode(true); c.querySelectorAll("script").forEach(s => s.remove()); return c.outerHTML; };
        const [ha, hb] = await Promise.all([a.pg.evaluate(dom), b.pg.evaluate(dom)]);
        const [sa, sb] = await Promise.all([a.pg.screenshot({ fullPage: true }), b.pg.screenshot({ fullPage: true })]);
        await a.ctx.close(); await b.ctx.close();
        assert(ha === hb, `body HTML differs (${ha.length} vs ${hb.length})`);
        assert(Buffer.compare(sa, sb) === 0, 'pixels differ');
      });
    }
    // 2) with a logo: in the name's spot
    const base = PKGS['zz-test-2-qpqhx7'] || Object.values(PKGS)[0];
    const withLogo = { ...base, messages: { ...base.messages, brand: { ...(base.messages.brand || {}), logo: { src: LOGO, w: 214, h: 60 } } } };
    for (const page of ['plan', 'messages']) for (const [width, height] of [[1440, 900], [390, 844]]) for (const scheme of ['light', 'dark']) {
      await check(`logo: ${page} · ${width} ${scheme}: replaces the name text in the same spot, alt = the client's name, 34 px high; dark = white chip`, async () => {
        const n = await open('new', page, 'zz-logo-test', withLogo, { width, height, scheme });
        const r = await n.pg.evaluate(() => { const slot = document.getElementById('client-brand'), img = slot?.querySelector('img.client-img'), cs = img && getComputedStyle(img), rb = img?.getBoundingClientRect();
          return { hidden: slot?.hidden, word: !!slot?.querySelector('.firm-word'), alt: img?.alt, h: rb && Math.round(rb.height), w: rb && Math.round(rb.width), pad: cs?.paddingTop, bg: cs?.backgroundColor, src: img?.src.slice(0, 25), order: [...document.querySelectorAll('#brands > .brand')].indexOf(slot) }; });
        const name = withLogo.messages.brand.name;
        assert(!r.hidden && !r.word && r.alt === name && r.src === 'data:image/svg+xml;base64' && r.order === 2, JSON.stringify(r));
        // FIX 4.1: the logo is 34 px high; dark = a white chip that hugs it (6 × 10 px padding), never wider than logo + 20 px
        assert((scheme === 'dark' ? r.bg === 'rgb(255, 255, 255)' && r.h === 46 : r.h === 34 && r.bg === 'rgba(0, 0, 0, 0)') && Math.abs(r.w - (34 * 214 / 60 + (scheme === 'dark' ? 20 : 0))) <= 2, `size / chip ${JSON.stringify(r)}`);
        const head = n.pg.locator('#brands');
        await head.screenshot({ path: join(OUT, `${page}-${width}-${scheme}-logo-header.png`) });
        await n.pg.screenshot({ path: join(OUT, `${page}-${width}-${scheme}-logo-page.png`) });
        await n.ctx.close();
        // and the same package without the logo shows the name (to compare)
        const w = await open('new', page, 'zz-logo-test', base, { width, height, scheme });
        await w.pg.locator('#brands').screenshot({ path: join(OUT, `${page}-${width}-${scheme}-name-header.png`) }); await w.ctx.close();
      });
    }
    // side-by-side with the preview's header ("REVIEW PAGE HEADER · LOGO IN THE SAME SPOT AS THE NAME")
    if (SIDE) {
      const prev = await browser.newPage({ viewport: { width: 1000, height: 900 } });
      await prev.goto(pathToFileURL(join(BUILDER, 'Claude outputs/LFMP_Copy_Instructions_Minimal.html')).href);
      const pshot = await prev.locator('.rv').first().screenshot(); await prev.close();
      for (const page of ['plan', 'messages']) for (const width of [1440, 390]) for (const scheme of ['light', 'dark']) {
        const mine = join(OUT, `${page}-${width}-${scheme}-logo-header.png`), name = join(OUT, `${page}-${width}-${scheme}-name-header.png`);
        if (!existsSync(mine)) continue;
        const comp = await browser.newPage({ viewport: { width: 1700, height: 700 } });
        const img = async f => (await readFile(f)).toString('base64');
        await comp.setContent(`<!doctype html><body style="margin:0;background:#1d1d22;font:600 15px Inter,system-ui,sans-serif;color:#f2f1ee"><div style="display:flex;gap:16px;padding:16px;align-items:flex-start;flex-wrap:wrap">
          <figure style="margin:0;flex:0 0 760px"><figcaption style="margin:0 0 8px">Preview · review page header, logo in the name's spot</figcaption><img style="width:100%;border:1px solid #444" src="data:image/png;base64,${pshot.toString('base64')}"></figure>
          <figure style="margin:0;flex:1 1 0;min-width:0"><figcaption style="margin:0 0 8px">Built · ${page}.html · ${width} ${scheme} · with a logo</figcaption><img style="max-width:100%;border:1px solid #444" src="data:image/png;base64,${await img(mine)}">
            <figcaption style="margin:14px 0 8px">Built · the same page with no logo (today)</figcaption><img style="max-width:100%;border:1px solid #444" src="data:image/png;base64,${await img(name)}"></figure></div></body>`);
        await comp.waitForTimeout(150); await comp.screenshot({ path: join(SIDE, `${page}-${width}-${scheme}.png`), fullPage: true }); await comp.close();
      }
    }
  } finally {
    await browser.close();
    const bad = results.filter(r => !r.ok);
    for (const r of results) console.log(`${r.ok ? '✔' : '✖'} ${r.label}${r.ok ? '' : `\n    ${r.err}`}`);
    console.log(`\n${results.length - bad.length}/${results.length} checks passed. Packages: ${Object.keys(await packages()).join(', ')}. Shots: ${OUT}`);
    process.exitCode = bad.length ? 1 : 0;
  }
}
main();
