// Same marker style as guides/main/tools/capture/capture2.mjs: a green outline and a numbered disc.
// A mark is { sel, nth } or { t } (regex on the visible label); `in` scopes it; `raw` keeps the matched node.
export async function mark(page, marks) {
  return page.evaluate((marks) => {
    document.querySelectorAll('.guide-mark').forEach((n) => n.remove());
    const rtl = document.documentElement.dir === 'rtl';
    const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.top < innerHeight && r.bottom > 0; };
    const textOf = (e) => (e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.innerText || e.value || '').trim().replace(/\s+/g, ' ');
    const out = []; const missing = [];
    marks.forEach((m, i) => {
      const scope = m.in ? document.querySelector(m.in) : document;
      let el = null;
      if (scope && m.sel) el = [...scope.querySelectorAll(m.sel)].filter(visible)[m.nth ?? 0] || null;
      if (scope && !el && m.t) {
        const re = new RegExp(m.t);
        const cands = [...scope.querySelectorAll('button,a,[role=button],[role=tab],[role=option],[role=group],input,textarea,h1,h2,h3,h4,label,th,li,p,span,strong,b,dt,div')]
          .filter(visible).filter((e) => re.test(textOf(e)) && textOf(e).length <= (m.max ?? 80));
        cands.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
        el = cands[0] ? (m.raw ? cands[0] : (cands[0].closest('button,a,[role=button],[role=tab],[role=option]') || cands[0])) : null;
      }
      for (let k = 0; el && k < (m.up ?? 0); k++) el = el.parentElement;
      if (!el) { missing.push(m.t || m.sel); return; }
      const r = el.getBoundingClientRect();
      const box = document.createElement('div');
      box.className = 'guide-mark';
      Object.assign(box.style, { position: 'fixed', left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`, border: '3px solid #12a368', borderRadius: '10px', zIndex: 2147483646, pointerEvents: 'none', boxSizing: 'border-box' });
      const n = document.createElement('div');
      n.className = 'guide-mark';
      n.textContent = String(i + 1);
      const x = rtl ? r.right - 14 : r.left - 14;
      Object.assign(n.style, { position: 'fixed', left: `${Math.max(2, Math.min(innerWidth - 32, x))}px`, top: `${Math.max(2, r.top - 16)}px`, width: '30px', height: '30px', borderRadius: '50%', background: '#12a368', color: '#fff', font: '700 17px/30px Arial, sans-serif', textAlign: 'center', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,.35)', zIndex: 2147483647, pointerEvents: 'none' });
      document.body.append(box, n);
      out.push({ n: i + 1, label: textOf(el).slice(0, 60) });
    });
    return { marks: out, missing };
  }, marks);
}

// Blurs the test account's sign-in identifiers wherever they appear (never the demonstrated signature).
export async function mask(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length) continue;
      if (/mmasri|@rightcode|mahmoudHmmadia/i.test(el.textContent || '')) el.style.filter = 'blur(6px)';
    }
  });
}

/** The union of the boxes of the given selectors and the markers, padded and kept inside the viewport. */
// `widthOf` stretches the crop to that element's full width (a dialog cropped to its marked rows only).
export async function regionOf(page, sels, pad = 20, widthOf = null) {
  return page.evaluate(({ sels, pad, widthOf }) => {
    const rs = sels.flatMap((s) => [...document.querySelectorAll(s)]).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight);
    rs.push(...[...document.querySelectorAll('.guide-mark')].map((e) => e.getBoundingClientRect()));
    if (!rs.length) return null;
    const w = widthOf ? document.querySelector(widthOf)?.getBoundingClientRect() : null;
    const x0 = Math.max(0, w ? w.left : Math.min(...rs.map((r) => r.left)) - pad);
    const y0 = Math.max(0, Math.min(...rs.map((r) => r.top)) - pad);
    const x1 = Math.min(innerWidth, w ? w.right : Math.max(...rs.map((r) => r.right)) + pad);
    const y1 = Math.min(innerHeight, Math.max(...rs.map((r) => r.bottom)) + pad);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }, { sels, pad, widthOf });
}

