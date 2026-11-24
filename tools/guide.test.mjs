import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildHtml, ROOT, STORE } from './build-html.mjs';
import { loadDocument } from './latex-parse.mjs';

// The guide is two examples shown as apps: index.html offers them, c1.html and c2.html show one step at a time.
buildHtml();
const pages = Object.fromEntries(['index.html', 'c1.html', 'c2.html'].map((name) => [name, fs.readFileSync(path.join(ROOT, 'site/ar', name), 'utf8')]));
const doc = loadDocument(ROOT, { lang: 'ar' });
const quicks = doc.blocks.filter((b) => b.type === 'quick');
const byChapter = [];
for (const b of doc.blocks) {
  if (b.type === 'chapter') byChapter.push([]);
  if (b.type === 'quick') byChapter.at(-1).push(b);
}
const cardsOf = (html) => html.split(/<article class="quick-card"/).slice(1).map((c) => c.slice(0, c.indexOf('</article>')));
const text = (html) => html.replaceAll('&quot;', '"');

test('the site is the examples home and one flow page per example', () => {
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'site/ar')).sort(), ['c1.html', 'c2.html', 'index.html']);
  for (const html of Object.values(pages)) {
    assert.match(html, /<html lang="ar" dir="rtl"/);
    assert.ok(html.includes(STORE));
    assert.doesNotMatch(html, /correspondence-walkthrough-progress|inspection-walkthrough-progress|\.\.\/en\/|class="step reveal-step"/);
  }
  assert.equal((pages['index.html'].match(/data-flow-example=/g) || []).length, 2);
  assert.equal(cardsOf(pages['c1.html']).length, byChapter[0].length);
  assert.equal(cardsOf(pages['c2.html']).length, byChapter[1].length);
});

test('every step says who, where, what to do, the result and why — and why fits in two lines', () => {
  assert.ok(byChapter[0].length >= 25 && byChapter[1].length >= 15);
  for (const q of quicks) {
    assert.ok(q.who && q.where && q.result && q.why, `${q.title}: incomplete`);
    assert.ok(q.steps.length >= 2 && q.steps.length <= 6, `${q.title}: ${q.steps.length} actions`);
    assert.ok(q.why.length <= 230, `${q.title}: «why» is ${q.why.length} characters`);
    assert.ok((q.why.replace(/\\en\{[^}]*\}/g, '').match(/[.؟!]/g) || []).length <= 3, `${q.title}: «why» has too many sentences`);
  }
});

test('each step has its «البيانات» and «ما فائدتها؟» dialogs', () => {
  for (const page of ['c1.html', 'c2.html']) for (const card of cardsOf(pages[page])) {
    const id = /id="([^"]+)"/.exec(card)[1];
    assert.match(card, new RegExp(`<dialog class="flow-dialog" id="${id}-why"`), `${id}: why dialog`);
    if (card.includes(`data-flow-dialog="${id}-data"`)) assert.match(card, /class="flow-table"|class="flow-doc"|class="flow-shot"/, `${id}: data dialog is empty`);
  }
  assert.ok(quicks.filter((q) => q.data.length || q.docs.length || q.shots.length).length >= quicks.length - 6);
});

test('every test2 screenshot is kept, and its key explains every marker', () => {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/capture-report.json'), 'utf8'));
  const shots = quicks.flatMap((q) => q.shots);
  const files = fs.readdirSync(path.join(ROOT, 'assets/screens')).filter((f) => f.endsWith('.png'));
  assert.deepEqual([...new Set(shots.map((s) => path.basename(s.image)))].sort(), files.sort(), 'every screenshot is placed in a step');
  for (const shot of shots) {
    const capture = Object.values(report.shots).find((c) => c.file === shot.image);
    assert.ok(capture, `${shot.image}: not in the capture report`);
    assert.deepEqual(capture.missing, [], `${shot.image}: a marker was not placed`);
    assert.equal(shot.noteKeys?.length, capture.marks.length, `${shot.image}: key and markers differ`);
    assert.ok(fs.existsSync(path.join(ROOT, 'site/assets/screens', path.basename(shot.image))), `${shot.image}: not copied`);
  }
});

test('the first example teaches every Internal SOP concept a builder needs', () => {
  const html = text(pages['c1.html']);
  for (const n of [1, 2, 3, 4]) assert.ok(html.includes(`المرحلة ${n}:`), `stage ${n}`);
  for (const label of [
    'إنشاء سجل جديد', 'تحديث سجل', 'جدولة', 'يدوي', 'عند استدعاء النموذج', 'إرجاع استجابة النموذج', // triggers
    'إرسال إشعار', 'طلب موافقة', 'تفرّع شرطي', 'إنشاء مهمة', 'تحديث سجل كيان', 'جلب سجل', 'البحث عن سجلات كيان', 'تأخير', 'لكل عنصر', 'تشغيل JavaScript', // steps
    'إدراج بيانات', 'الاسم المرجعي', 'المتغيرات', // data
    'مراجعة ونشر', 'سجل الإصدارات', 'محاكاة (آمنة)', 'تشغيل فعلي', 'اختبار هذه الخطوة', 'بيانات الاختبار', // build and test
    'عمليات التشغيل', 'بانتظار استجابة', 'إذا فشلت هذه الخطوة', 'اتباع مسار الفشل', 'إعادة المحاولة قبل الاستسلام', 'إيقاف الإجراء مؤقتًا', 'تحتاج إلى متابعة', // runs and care
  ]) assert.ok(html.includes(label), label);
  assert.match(html, /\$steps\.approval\.output\.terminalOutcomeKey == "approved"/);
  assert.match(html, /\$event\.data\.id/);
  // The approval step fails with 422 unless the attachments are an explicit empty list.
  assert.match(html, /مرفقات المكتبة/);
  assert.match(html, /status 422/);
  assert.ok(html.includes('المستجدات'));
  const quiz = byChapter[0].find((q) => q.title === 'اختبر فهمك');
  assert.ok(quiz && quiz.data.length >= 10, 'a final understanding check');
});

test('the real example keeps the legal facts and leaves the decision to a person', () => {
  const html = text(pages['c2.html']);
  assert.match(html, /المرسوم التشريعي رقم 8 لعام 2021/);
  assert.match(html, /سبعة أيام/);
  assert.match(html, /أُحيل الضبط إلى القضاء/);
  assert.match(html, /لا تجعل الإجراء يحيل وحده/);
  assert.match(html, /status 422/);
  assert.match(html, /\$event\.oldData\.inspection_status/);
  assert.match(html, /\$steps\.referral\.output\.terminalOutcomeKey == "referred"/);
  for (const step of ['تأخير', 'جلب سجل', 'تفرّع شرطي', 'طلب موافقة', 'تحديث سجل كيان', 'إنشاء مهمة']) assert.ok(html.includes(step), step);
});

test('organization identities match the shared reference, and demo people are marked', () => {
  const org = JSON.parse(fs.readFileSync(path.join(ROOT, 'review/organization-reference.json'), 'utf8'));
  for (const member of org.members) assert.ok(pages['c1.html'].includes(member.name.ar), member.name.ar);
  for (const node of org.nodes) assert.ok(pages['c1.html'].includes(node.name.ar), node.name.ar);
  for (const html of Object.values(pages)) assert.doesNotMatch(html, /شركة الأفق|عمر حداد|سارة الخطيب/);
  for (const name of ['مازن قاسم', 'سلمى عبود', 'فادي الخوري']) assert.ok(pages['c2.html'].includes(`${name} — تجريبي`), name);
});

test('arrows follow the reading direction', () => {
  for (const page of ['c1.html', 'c2.html']) {
    for (const m of pages[page].matchAll(/<button class="btn (?:btn-primary )?quick-(?:next|prev)"[\s\S]*?<\/button>/g)) assert.match(m[0], /class="ic flip"/);
  }
  for (const q of quicks) assert.doesNotMatch([q.where, ...q.steps].join(' '), /→|->/, q.title);
});

test('all local links and ids are valid', () => {
  for (const [name, html] of Object.entries(pages)) {
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = raw.replaceAll('&amp;', '&');
      if (/^(https?:|data:|mailto:)/.test(href)) continue;
      const [url, fragment] = href.split('#');
      const dest = path.resolve(ROOT, 'site/ar', url ? url.split('?')[0] : name);
      assert.ok(fs.existsSync(dest), `${name}: ${href}`);
      if (fragment && dest.endsWith('.html')) assert.ok(fs.readFileSync(dest, 'utf8').includes(`id="${fragment}"`), href);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${name}: duplicate ids`);
    assert.doesNotMatch(html, />\?\?</);
  }
});
