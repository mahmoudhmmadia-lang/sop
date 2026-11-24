# Internal SOPs walkthrough

Standalone Arabic guide built like `../correspondence/`: same reader, theme and team.

- Since 2026-11-24 the guide is an app, not reading pages (`renderFlowSite`). The home page offers
  the two examples, and each example shows one step per screen. Each step is one `\section` with one
  `rcquick` block: who, where, 2–6 short actions, `\qlog` for generated ids, the result, `\qwhy`
  (at most two lines), `\qdata` rows, `\qdoc` for expressions/code to paste, and `\qshot` for the
  numbered test2 screen. Do not add detailed prose. The old chapters are in `review/archive/`
  for reference only. The goal is mastery: keep the concept steps («افهم الأداة», tests and runs),
  «طبّق وحدك» and «اختبر فهمك» complete when the product changes.

- The user found the first version hard to apply (2026-11-23) and asked for simpler and more
  detailed. Chapter 1 is now four small stages; each ends with publish and a real test. One click
  or value per line, exact UI labels, and what the reader should see next. Introduce a term only
  where it is first needed.
- The guide covers «الإجراءات الداخلية» (Internal SOPs, `/internal-sop`) only. Do not add a
  chapter on «إجراءات التشغيل القياسية» (SOPs, `/sop`, embedded Activepieces); the user declined it.
- Every Chapter 1 instruction was executed on test2 (see README). Recapture with
  `review/capture/capture.mjs`; keep keys matching `review/capture-report.json` marks.
- Keep the «مرفقات المكتبة» `[]` workaround until the 422 product bug (README) is fixed.
- Chapter 2 (settlement deadline) is not yet executed live; say so in README, not in the steps.
- `site/` is generated: edit sources, then `npm run build`, `npm test`, `npm run verify`.
