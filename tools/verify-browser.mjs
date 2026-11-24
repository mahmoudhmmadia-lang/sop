// Browser check of the SOP guide as an app: the examples home, one step per screen, the «البيانات» and «ما فائدتها؟»
// dialogs, navigation in the reading direction (RTL), search, progress and phones. Edge + playwright-core.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildHtml, ROOT } from './build-html.mjs';
import { createServer } from './serve-html.mjs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright-core')); }
catch {
  try { ({ chromium } = createRequire(new URL('../../inspection/tools/package.json', import.meta.url))('playwright-core')); }
  catch { ({ chromium } = createRequire(new URL('../../main/tools/package.json', import.meta.url))('playwright-core')); }
}
buildHtml();
const server = createServer();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/ar`;
const out = path.join(ROOT, 'review/screenshots');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const checks = [];
const ok = (cond, msg) => { assert.ok(cond, msg); if (!checks.includes(msg)) checks.push(msg); };
let browser;
const errors = [];
const shown = (page) => page.$$eval('[data-quick-card]', (cs) => cs.filter((c) => !c.hidden).map((c) => c.id));
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 390]) for (const theme of ['dark', 'light']) {
    const mobile = width === 390;
    const ctx = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, colorScheme: theme, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('kos-guide-theme', t); } catch {} }, theme);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
    const fits = async (label) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no horizontal overflow (${label})`);
    const tag = `${width}-${theme}`;

    // Home: two examples, each opens its flow.
    await page.goto(`${base}/index.html`);
    ok(await page.locator('[data-flow-example]').count() === 2, 'home offers the two examples');
    await fits('home');
    await page.screenshot({ path: path.join(out, `home-${tag}.png`), fullPage: true });
    await page.locator('[data-flow-example="c1"]').click();
    await page.waitForURL(/c1\.html/);
    const total = await page.locator('[data-quick-card]').count();
    ok((await shown(page)).length === 1, 'one step on screen');
    ok(await page.evaluate(() => scrollY) === 0, 'the example opens at its header');

    // Next/previous, keys in RTL, rail.
    await page.locator('.quick-next').click();
    ok((await page.textContent('[data-quick-count]')) === `2/${total}`, 'next moves to step 2');
    if (!mobile) {
      await page.keyboard.press('ArrowLeft');
      ok((await page.textContent('[data-quick-count]')) === `3/${total}`, 'ArrowLeft moves forward in RTL');
      await page.keyboard.press('ArrowRight');
      ok((await page.textContent('[data-quick-count]')) === `2/${total}`, 'ArrowRight moves back in RTL');
    }
    // Direction of the arrows: in RTL «التالي» points left and «السابق» points right.
    const dir = await page.evaluate(() => {
      const box = (sel) => { const svg = document.querySelector(sel + ' svg'); const p = svg.querySelector('path').getBoundingClientRect(); const s = svg.getBoundingClientRect(); return { t: getComputedStyle(svg).transform, x: p.left - s.left }; };
      return { next: box('.quick-next'), prev: box('.quick-prev'), rtl: document.documentElement.dir };
    });
    ok(dir.rtl === 'rtl' && dir.next.t.startsWith('matrix(-1') && dir.prev.t.startsWith('matrix(-1'), 'chevrons are mirrored for RTL (next points left, previous right)');
    const nextIsLeftOfPrev = await page.evaluate(() => document.querySelector('.quick-next').getBoundingClientRect().left < document.querySelector('.quick-prev').getBoundingClientRect().left);
    ok(nextIsLeftOfPrev, '«التالي» sits on the left, «السابق» on the right');

    // A step with data: open «البيانات» and «ما فائدتها؟».
    await page.goto(`${base}/c1.html#c1-s5`);
    await page.waitForTimeout(300);
    ok((await shown(page))[0] === 'c1-s5', 'a deep link opens its step');
    await page.locator('#c1-s5 [data-flow-dialog="c1-s5-data"]').click();
    ok(await page.locator('#c1-s5-data').isVisible(), '«البيانات» opens the data dialog');
    ok(await page.locator('#c1-s5-data .flow-table tbody tr').count() >= 3, 'the data dialog lists the values to enter');
    const shotLoaded = await page.locator('#c1-s5-data .flow-shot img').first().evaluate((img) => img.decode().then(() => img.naturalWidth > 0, () => false));
    ok(shotLoaded, 'the data dialog shows the test2 screenshot');
    ok(await page.locator('#c1-s5-data .flow-shot').first().locator('.flow-shot-keys li').count() === 3, 'the screenshot key lists every marker');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `data-${tag}.png`) });
    await page.keyboard.press('ArrowLeft');
    ok((await shown(page))[0] === 'c1-s5', 'arrow keys do not move the step while a dialog is open');
    await page.keyboard.press('Escape');
    ok(!(await page.locator('#c1-s5-data').isVisible()), 'Escape closes the dialog');
    await page.locator('#c1-s5 [data-flow-dialog="c1-s5-why"]').click();
    const why = await page.locator('#c1-s5-why .flow-why').evaluate((p) => ({ lines: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)), text: p.textContent }));
    ok(why.lines <= (mobile ? 4 : 2), `«ما فائدتها؟» is short (${mobile ? 'up to 4 lines on a phone' : 'two lines on desktop'})`);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `why-${tag}.png`) });
    await page.locator('#c1-s5-why form button').click();
    await fits('flow step');
    await page.screenshot({ path: path.join(out, `step-${tag}.png`) });

    // A step with real screens: the images load inside «البيانات», with their numbered keys.
    await page.goto(`${base}/c1.html#c1-s8`);
    await page.locator('#c1-s8 [data-flow-dialog="c1-s8-data"]').click();
    const imgs = page.locator('#c1-s8-data .flow-shot img');
    ok(await imgs.count() === 2, 'the run step shows its two screens (run and notification)');
    for (const img of await imgs.all()) { await img.scrollIntoViewIfNeeded(); ok(await img.evaluate((e) => e.decode().then(() => e.naturalWidth > 0)), 'screens load inside the dialog'); }
    ok(await page.locator('#c1-s8-data .flow-shot-keys li').count() >= 2, 'each screen has its numbered key');
    await page.locator('#c1-s8-data .flow-shot').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `screen-${tag}.png`) });
    await page.keyboard.press('Escape');

    // A step with a document template: the copy button is there.
    await page.goto(`${base}/c2.html#c2-s5`);
    await page.locator('#c2-s5 [data-flow-dialog="c2-s5-data"]').click();
    ok(await page.locator('#c2-s5-data .flow-doc [data-flow-copy]').count() === 1, 'code templates can be copied');
    ok(await page.locator('#c2-s5-data .flow-doc-text span[dir="ltr"]').first().evaluate((e) => getComputedStyle(e).direction === 'ltr'), 'expressions read left to right inside Arabic');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `doc-${tag}.png`) });
    await page.keyboard.press('Escape');

    // Phones: the list and swipe (RTL: the finger moves right to go forward).
    if (mobile) {
      ok(!(await page.locator('.quick-rail').isVisible()), 'phone: the step list is closed');
      await page.locator('[data-quick-list]').click();
      ok(await page.locator('.quick-rail').isVisible(), 'phone: «كل الخطوات» opens the list');
      await page.screenshot({ path: path.join(out, `list-${tag}.png`) });
      await page.locator('[data-quick-tab="2"]').click();
      ok(!(await page.locator('.quick-rail').isVisible()), 'phone: choosing a step closes the list');
      const before = await page.$$eval('[data-quick-card]', (cs) => cs.findIndex((c) => !c.hidden));
      await page.evaluate(() => {
        const el = document.querySelector('.quick-stage');
        const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(80)], changedTouches: [t(80)] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [t(260)] }));
      });
      ok(await page.$$eval('[data-quick-card]', (cs) => cs.findIndex((c) => !c.hidden)) === before + 1, 'phone: swiping right moves forward in RTL');
    }

    // Last step of example 1 leads to example 2; the home shows progress.
    await page.goto(`${base}/c1.html#c1-s${total}`);
    ok(await page.locator('.quick-finish').isVisible() && !(await page.locator('.quick-next').isVisible()), 'the last step offers the next example');
    await page.locator('.quick-finish').click();
    await page.waitForURL(/c2\.html/);
    ok(true, 'the next example opens from the last step');
    await page.goto(`${base}/index.html`);
    ok((await page.textContent('[data-flow-cta="c1"]')).includes('تابع'), 'home: a started example says «تابع»');

    // Search opens a step.
    await page.locator('[data-open-search]').first().click();
    await page.locator('.palette input').fill('ضع الحارس');
    await page.locator('.palette-list a').first().click();
    await page.waitForURL(/c2\.html#c2-s/);
    await page.waitForTimeout(300);
    ok((await page.locator('[data-quick-card]:not([hidden]) .quick-title').textContent()).includes('ضع الحارس'), 'search opens the step');
    await ctx.close();
  }
  // Without JavaScript every step still reads in order.
  const nj = await browser.newContext({ javaScriptEnabled: false });
  const np = await nj.newPage();
  await np.goto(`${base}/c2.html`);
  ok(await np.$$eval('[data-quick-card]', (cs) => cs.every((c) => !c.hidden)), 'without JavaScript all steps are readable');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(ROOT, 'review/browser-verification.json'), JSON.stringify({ checkedOn: new Date().toISOString(), scope: 'Local guide only; not a live correspondence workflow', sizes: ['1440×900', '390×844'], themes: ['dark', 'light'], checks, errors }, null, 2));
  console.log(`PASS ${checks.length} checks`);
} finally { await browser?.close(); server.close(); }
