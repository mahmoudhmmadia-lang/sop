// Numbered screenshots for the SOP walkthrough, captured on test2 (the authorized test environment)
// from the training SOP «إشعار بمنشأة جديدة — تدريب» and the record type «المنشآت التجارية — تدريب
// الإجراءات» built for this guide. Markers are a DOM overlay drawn before capture, never PNG edits.
// Most shots only open panels; none publishes or responds. Usage, from this folder:
//   node capture.mjs [name ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, ready } from '../../../main/tools/capture/lib.mjs';
import { mark, mask } from './marks.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../../assets/screens');
const REPORT = path.join(HERE, '../capture-report.json');
const state = JSON.parse(fs.readFileSync(path.join(HERE, 'state.json'), 'utf8'));
const BASE = 'https://test2.kayanos.app';
const SOP = `${BASE}/internal-sop/${state.stage1}`;
const INSPECTOR = 'aside';

const notNow = (page) => page.getByText('ليس الآن').click({ timeout: 1500 }).catch(() => {});
async function go(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready(page, 90000, 20); await page.waitForTimeout(3000); await notNow(page);
}
// Opens a step from the numbered «الخطوات» outline, so a repeated title (two notifications) is never ambiguous.
async function openStep(page, number) {
  await go(page, SOP);
  await page.getByRole('button', { name: new RegExp('^' + number + ' ') }).first().click(); await page.waitForTimeout(2500);
}
const scrollTo = (page, locator) => locator.evaluate((e) => e.scrollIntoView({ block: 'center' })).then(() => page.waitForTimeout(800));
// Tags the smallest visible element whose own text matches, so a marker can target it exactly.
const tag = (page, re, name, minLeft = -1) => page.evaluate(({ src, name, minLeft }) => {
  const re = new RegExp(src);
  const c = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left > minLeft && r.top >= 0 && r.bottom <= innerHeight && re.test((e.innerText || '').trim()); });
  c.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
  if (c[0]) c[0].setAttribute('data-guide', name);
  return !!c[0];
}, { src: re.source, name, minLeft });

const SHOTS = {
  's1-trigger': {
    async prep(page) { await go(page, SOP); await page.getByText('عند: إنشاء سجل جديد').click(); await page.waitForTimeout(2500); },
    marks: [{ t: '^بناء$' }, { t: '^عند: إنشاء سجل جديد$', raw: true, up: 2 }, { in: INSPECTOR, sel: '[role=combobox]' }, { t: '^الخطوات$', raw: true }],
  },
  's1-add-step': {
    async prep(page) {
      await go(page, SOP);
      await page.getByRole('button', { name: 'أضف إجراء SOP' }).first().click(); await page.waitForTimeout(1500);
      await page.keyboard.type('إرسال إشعار'); await page.waitForTimeout(1800);
    },
    marks: [{ sel: 'input[type=search], [role=dialog] input', nth: 0 }, { t: '^Kayan$', raw: true, up: 1 }, { t: '^إرسال إشعار يرسل', max: 140 }],
  },
  's1-notify': {
    async prep(page) { await openStep(page, 2); },
    marks: [{ in: INSPECTOR, sel: 'textarea[aria-label="عنوان الرسالة"]' }, { in: INSPECTOR, sel: 'textarea[aria-label="محتوى الرسالة"]' }, { in: INSPECTOR, t: '^Mahmoud Masri', raw: true, up: 1 }],
  },
  's1-publish': {
    async prep(page) {
      await go(page, SOP);
      await page.getByRole('button', { name: 'مراجعة ونشر' }).click(); await page.waitForTimeout(3000);
    },
    marks: [{ t: '^مراجعة ونشر$' }, { t: 'كل الخطوات مهيّأة', raw: true, up: 1 }, { t: '^نشر v\\d+$|^لا يوجد ما يُنشر' }],
  },
  's1-add-record': {
    async prep(page) {
      await go(page, `${BASE}${state.records}/add`);
      await page.getByPlaceholder('أدخل النص').first().fill('فرن السنابل — تدريب');
      await page.getByRole('button', { name: 'بانتظار الاعتماد' }).click(); await page.waitForTimeout(800);
    },
    marks: [{ sel: 'main input[placeholder="أدخل النص"]' }, { t: '^بانتظار الاعتماد$' }, { t: '^إنشاء$' }],
  },
  's1-runs': {
    async prep(page) {
      await go(page, SOP);
      await page.getByRole('button', { name: 'عمليات التشغيل' }).click(); await page.waitForTimeout(3500);
      await page.getByText('مكتمل', { exact: true }).first().click(); await page.waitForTimeout(3500);
    },
    marks: [{ t: '^عمليات التشغيل$' }, { t: '^التشغيل المحدد$', raw: true, up: 1 }, { in: '.react-flow', t: '^نجح$', raw: true }],
  },
  's1-notification': {
    async prep(page) {
      await go(page, `${BASE}/`);
      await page.getByRole('button', { name: 'الإشعارات' }).click(); await page.waitForTimeout(2500);
      await page.getByText('المستجدات', { exact: true }).last().click(); await page.waitForTimeout(3000);
      await tag(page, /^أُضيفت منشأة جديدة: فرن القمح/, 'note');
    },
    marks: [{ sel: '[aria-label="الإشعارات"]' }, { t: '^المستجدات$' }, { sel: '[data-guide=note]', up: 1 }],
  },
  's2-insert-data': {
    async prep(page) {
      await openStep(page, 2);
      await page.getByRole('button', { name: 'إدراج بيانات' }).first().click(); await page.waitForTimeout(2000);
      await page.getByPlaceholder('ابحث في الحقول').fill('asm'); await page.waitForTimeout(1500);
    },
    marks: [{ in: INSPECTOR, t: '^إدراج بيانات$' }, { sel: 'input[placeholder="ابحث في الحقول"]' }, { t: '^data\\.asm_almnshat$', raw: true, up: 1 }],
  },
  's2-approval-fields': {
    async prep(page) { await openStep(page, 3); },
    marks: [{ in: INSPECTOR, sel: 'textarea[aria-label="عنوان الموافقة"]' }, { in: INSPECTOR, sel: 'textarea[aria-label="تفاصيل الموافقة"]' }],
  },
  's2-approval-stage': {
    async prep(page) {
      await openStep(page, 3);
      await scrollTo(page, page.getByRole('textbox', { name: 'مفتاح المرحلة 1' }));
    },
    marks: [{ in: INSPECTOR, sel: 'input[aria-label="مفتاح المرحلة 1"]' }, { in: INSPECTOR, t: '^Mahmoud Masri', raw: true, up: 1 }, { in: INSPECTOR, t: '^إضافة مرحلة$' }],
  },
  's2-approval-actions': {
    async prep(page) {
      await openStep(page, 3);
      await scrollTo(page, page.getByRole('textbox', { name: 'تسمية الإجراء 1' }));
    },
    marks: [{ in: INSPECTOR, sel: 'input[aria-label="تسمية الإجراء 1"]' }, { in: INSPECTOR, sel: 'input[aria-label="نتيجة الإجراء 1"]' }, { in: INSPECTOR, t: '^لا شيء$', raw: true }],
  },
  's2-attachments': {
    async prep(page) {
      await openStep(page, 3);
      await scrollTo(page, page.getByRole('button', { name: 'مرفقات المكتبة التعبير' }));
    },
    marks: [{ in: INSPECTOR, sel: '[aria-label="مرفقات المكتبة التعبير"]' }, { in: INSPECTOR, t: '^\\[\\]$', raw: true }],
  },
  's3-reference': {
    async prep(page) {
      await openStep(page, 3);
      if ((await page.getByRole('button', { name: 'إيقاف التشغيل', exact: true }).count()) === 0) await page.getByRole('button', { name: /^متقدم/ }).click();
      await page.waitForTimeout(1200);
      await scrollTo(page, page.getByRole('textbox', { name: 'الاسم المرجعي' }));
    },
    marks: [{ in: INSPECTOR, t: '^متقدم', max: 40 }, { in: INSPECTOR, sel: 'input[aria-label="الاسم المرجعي"]' }],
  },
  's3-branch': {
    async prep(page) { await openStep(page, 4); },
    marks: [{ in: INSPECTOR, t: '^أول مسار مطابق$' }, { in: INSPECTOR, sel: 'input[aria-label="التسمية"]', nth: 0 }, { in: INSPECTOR, t: 'terminalOutcomeKey == "approved"', raw: true }, { in: INSPECTOR, t: '^إضافة مسار$' }],
  },
  's3-canvas': {
    async prep(page) {
      await go(page, SOP);
      await page.getByRole('button', { name: 'ملاءمة سير العمل للعرض' }).click(); await page.waitForTimeout(2000);
      await page.getByRole('button', { name: 'تكبير' }).click(); await page.waitForTimeout(1500);
    },
    marks: [{ t: '^تفرّع شرطي$', raw: true, up: 2 }, { t: '^وافق$', raw: true }, { t: '^طلب تغييرات$', raw: true }],
  },
  's4-update': {
    async prep(page) { await openStep(page, 6); },
    marks: [{ in: INSPECTOR, sel: '[role=combobox]', nth: 0 }, { in: INSPECTOR, t: 'data\\.id', raw: true, up: 1 }, { in: INSPECTOR, t: '^معتمدة للكشف$', raw: true, up: 1 }],
  },
  's4-task': {
    async prep(page) { await openStep(page, 5); await page.waitForTimeout(500); },
    marks: [{ in: INSPECTOR, sel: 'textarea[aria-label="عنوان المهمة"]' }, { in: INSPECTOR, t: '^Mahmoud Masri', raw: true, up: 1 }],
    scrollMarks: 'textarea[aria-label="عنوان المهمة"]',
  },
  's4-records': {
    async prep(page) { await go(page, `${BASE}${state.records}`); },
    marks: [{ t: '^معتمدة للكشف$', raw: true }, { t: '^تحتاج استكمالاً$', raw: true }, { t: '^بانتظار الاعتماد$', raw: true }],
  },
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
const report = fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, 'utf8')) : { environment: 'test2', shots: {} };
const { browser, page } = await open({ lang: 'ar' });
try {
  for (const name of names) {
    const shot = SHOTS[name];
    try {
      await shot.prep(page);
      const result = await mark(page, shot.marks);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      report.shots[name] = { file: `assets/screens/${name}.png`, capturedOn: new Date().toISOString(), source: page.url().replace(/\?.*$/, ''), marks: result.marks, missing: result.missing };
      console.log(name, JSON.stringify(result));
      await page.keyboard.press('Escape').catch(() => {});
    } catch (e) {
      console.log(name, 'FAILED', e.message.split('\n')[0]);
    }
  }
} finally {
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  await browser.close();
}
