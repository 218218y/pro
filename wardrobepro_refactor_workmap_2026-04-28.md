# מפת עבודה מעודכנת להמשך רפקטור מקצועי - WardrobePro

תאריך עדכון: 28 באפריל 2026  
מקור בדיקה בפועל: `wp_stage17_full.zip` + Stage 18 Canvas hit identity parity שנוסף כעת.  
מטרה: להפוך את התוכנית הישנה מ־26 באפריל למסמך עבודה נכון לפי מצב הקוד עכשיו, בלי למחוק התקדמות שכבר נעשתה ובלי להשאיר משימות שכבר הושלמו כאילו הן עדיין P0.

---

## 1. תקציר מנהלים מעודכן

הכיוון המקורי של התוכנית היה נכון: Pure ESM, Store-driven SSOT, שכבות ברורות, guardrails, וצמצום fallback/legacy. אבל התוכנית המקורית כבר לא משקפת את מצב הפרויקט: חלק גדול מהתשתית שהיא ביקשה ליצור כבר קיים בפועל.

בבדיקה הנוכחית נמצאו הדברים הבאים:

- `package.json` כולל כעת **250 scripts**.
- `esm/` כולל כעת **2310** קבצי מקור ב־ZIP שנבדק.
- `tests/` כולל כעת **949** קבצי בדיקה ב־ZIP שנבדק.
- `tools/` כולל כעת **122** קבצי tooling ב־ZIP שנבדק.
- duplicate script audit נמצא תקין: **0 duplicate groups**.
- legacy/fallback audit קיים ומסווג את המלאי. אחרי סנכרון הדוח/allowlist הנוכחיים: **910 occurrences**, **285 files**, ומתוכם **145 legacy-runtime-risk**.
- `as any` תחת `esm/` ו־`types/` לא נמצא בבדיקה הסטטית שעשיתי.
- הבעיה הקודמת של `_obj is not defined` ב־`builder_deps_resolver.ts` כבר מתוקנת בקוד הנוכחי: הקובץ משתמש ב־`readBuilderDepsSection(...)` וב־binding typed מפורש.

השורה התחתונה: **לא להתחיל שוב מ־Stage 0**. הבסיס הנוכחי נמצא אחרי Stage 18: כלי הבקרה וה־builder resolver מוגנים, ועכשיו גם Slice ראשון של Canvas hover/click identity parity מוגן בקוד ובבדיקות.

---

## 2. ממצא חשוב שתוקן בתוכנית: דוח legacy/fallback היה לא מסונכרן

ב־ZIP הנוכחי הקוד התקדם אחרי Stage 16, אבל קבצי ה־legacy fallback report/allowlist היו עדיין צמודים למצב קודם:

| פריט                   | בדוח שהיה ב־ZIP | אחרי בדיקה מחודשת |
| ---------------------- | --------------: | ----------------: |
| total occurrences      |             911 |               910 |
| files with occurrences |             286 |               285 |
| legacy-runtime-risk    |             146 |               145 |

השינוי איננו בעיית מוצר. הוא נובע מזה ש־Stage 16 העביר את fallback של build string owner אל `build_string_normalizer.ts`, והסיר ניסוח legacy מ־`core_pure.ts`. לכן נכון **לעדכן את הדוח וה־allowlist**, לא להחזיר קוד אחורה.

קבצים שעודכנו/צורפו בשביל זה:

- `docs/LEGACY_FALLBACK_AUDIT.md`
- `docs/legacy_fallback_audit.json`
- `tools/wp_legacy_fallback_allowlist.json`

---

## 3. סטטוס לפי שלבי התוכנית המקורית

| שלב מקורי                                     | סטטוס נכון עכשיו               | החלטה מקצועית                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 0 - Baseline/gates/toolchain            | הושלם                          | לא לפתוח מחדש. לשמור את `check:script-duplicates` כ־gate ירוק.                                                                                                                                                         |
| Stage 1 - Legacy/Fallback audit               | הושלם תשתיתית, דורש סנכרון דוח | הכלי קיים. הדוח/allowlist עודכנו לפי מצב Stage 16. מכאן לעבוד על הסרת risk entries בהדרגה.                                                                                                                             |
| Stage 2 - Project migration boundary          | כמעט הושלם                     | `io/project_migrations` כבר בעלים של `ui.raw` ו־config canonicalization. להוסיף fixtures ישנים אמיתיים כשיש payloads מהשטח.                                                                                            |
| Stage 3 - Runtime/config selectors hardening  | בתהליך                         | לא להסיר fallback רחב בלי test ממוקד. להמשיך slice קטן בכל פעם.                                                                                                                                                        |
| Stage 4 - BuildContext-only / builder cleanup | בתהליך מתקדם                   | Stage 16 חיזק string normalization ו־deps resolver, ו־Stage 17 הוסיף guard runtime אמיתי שמפעיל `resolveBuilderDepsOrThrow` עם mock deps כדי לתפוס helper חסר כמו `_obj`.                                              |
| Stage 5 - Features public API                 | בתהליך                         | manifest ו־contract קיימים. להרחיב בהדרגה רק למשפחות modules/corner/door trim/style שעדיין פתוחות.                                                                                                                     |
| Stage 6 - UI React/CSS design system          | בתהליך                         | primitives קיימים. להמשיך רק על selection controls אמיתיים, לא להפוך כל action button ל־OptionButton בכוח.                                                                                                             |
| Stage 7 - Canvas picking/hit identity         | בתהליך מתקדם אחרי Stage 18     | canonical hit identity קיים, hover/click משתמשים כעת במיזוג metadata משותף, ויש בדיקת runtime שמוכיחה parity עבור child surface + parent part. נשאר להרחיב ל־browser/e2e mirror inside/outside + split/removed/sketch. |
| Stage 8 - Order PDF/Notes/HTML                | בתהליך                         | policy ו־guard קיימים. לא לפצל PDF hotspots לפני כיסוי התנהגותי.                                                                                                                                                       |
| Stage 9 - Cloud Sync                          | בתהליך, גבוה בעדיפות           | כבר טופלו `as any`, timers וחלק מ־race queues. נשארו race tests ל־reconnect/pending push, hidden-tab attention, realtime timeout→polling.                                                                              |
| Stage 10 - Render/build performance           | בתהליך                         | guard קיים. לא לעדכן budgets בלי מדידת browser perf אמיתית.                                                                                                                                                            |
| Stage 11 - Type hardening/wide surfaces       | בתהליך                         | `as any` ירוק כרגע. לצמצם surfaces גדולים בהדרגה עם type tests.                                                                                                                                                        |
| Stage 12 - Test portfolio modernization       | הושלם control-plane            | audit מסווג 925 בדיקות. חסרים עדיין user journeys/e2e למוצר.                                                                                                                                                           |
| Stage 13 - Documentation closeout             | בתהליך                         | המסמכים קיימים, אבל צריך להמשיך לעדכן אותם אחרי כל stage כדי לא ליצור “מפה של אתמול”.                                                                                                                                  |

---

## 4. בדיקות סטטיות שבוצעו על העותק המחולץ

בוצע על עותק מחולץ של `15-1.zip`:

```bash
node tools/wp_script_duplicate_audit.mjs --check --expect-groups 0
# עבר

node tools/wp_legacy_fallback_audit.mjs --check --no-print
# נכשל לפני סנכרון דוח/allowlist, עבר אחרי עדכון allowlist/report

node tools/wp_builder_pipeline_contract.mjs
# עבר

node tools/wp_refactor_integration_audit.mjs
# עבר

node tools/wp_test_portfolio_audit.mjs --check --no-print
# עבר

node --test tests/refactor_stage16_builder_pipeline_runtime.test.js
# עבר
```

לא הורץ כאן `npm run gate`, לא הורץ browser/e2e, ולא הורץ perf browser. אלו עדיין צריכים לרוץ אצלך מקומית אחרי החלת הקבצים, כי הם תלויים בסביבת הפרויקט המלאה ובדפדפן.

---

## 5. מה היה חסר בתוכנית המקורית והוספתי עכשיו

### 5.1 Guard נגד “helper חסר” ב־builder deps resolver

הבאג של `_obj is not defined` לא היה אמור להגיע לדפדפן. התוכנית המקורית דיברה על deps fail-fast, אבל לא דרשה בדיקה שמייבאת ומפעילה בפועל את resolver עם mock deps.

להוסיף בשלב הבא:

- test חדש: `tests/builder_deps_resolver_runtime.test.ts` או להרחיב `tests/refactor_stage16_builder_pipeline_runtime.test.js`.
- הבדיקה צריכה:
  - לבנות `App` mock עם `deps.THREE`.
  - לבנות `builderDeps` mock עם `util/materials/modules/render`.
  - לקרוא ל־`resolveBuilderDepsOrThrow(...)`.
  - לוודא שהפונקציות מוחזרות bound ל־owner הנכון.
  - לוודא שחסר `render.ensureWardrobeGroup` נכשל עם error ברור.
- contract קטן ב־`tools/wp_builder_pipeline_contract.mjs`:
  - לא מספיק לבדוק regex על `ResolveBuilderDepsRequest`; צריך גם לוודא שאין helper לא מוגדר בקובץ המרכזי. אפשר לעשות זאת דרך runtime test, לא regex עיוור.

### 5.2 הפרדה בין control-plane done לבין product-behavior done

כמה שלבים הושלמו מבחינת guard/doc/tool, אבל לא מבחינת התנהגות מוצר מלאה. למשל Canvas ו־Cloud Sync. לכן התוכנית המעודכנת מסמנת “done for control plane” בנפרד מ־“done behaviorally”.

### 5.3 לא להרחיב design system בכוח

הוספתי כלל מפורש: `OptionButton` מיועד לבחירות/variants, לא לכל כפתור פעולה. אחרת נקבל מערכת נקייה על הנייר וכבדה בפועל. ארון בלי ידיות זה עוד מילא; קוד עם ידיות בכל מקום זה כבר נגרות ניסיונית.

### 5.4 לא לסמן fallback audit כ"סגור" במובן של מחיקה

ה־audit סגור כתשתית. החוב עצמו לא סגור. יש עדיין **145** מופעי `legacy-runtime-risk`; הם צריכים להיכנס ל־PRים קטנים ומוגנים, לא למחיקה סיטונאית.

---

## 6. סדר עדיפויות חדש מומלץ

### P0 - לפני המשך רפקטור עמוק

1. להחיל את קבצי הדוח/allowlist המעודכנים:
   - `docs/LEGACY_FALLBACK_AUDIT.md`
   - `docs/legacy_fallback_audit.json`
   - `tools/wp_legacy_fallback_allowlist.json`
2. להריץ:
   - `npm run check:legacy-fallbacks`
   - `npm run check:refactor-guardrails`
3. להוסיף guard/test נגד regression של `builder_deps_resolver.ts`, כדי שבאג מסוג `_obj is not defined` לא יחזור.

### P1 - PR הבא הכי חשוב

**Stage 17 - Builder deps resolver runtime regression + fallback report sync**

מטרה:

- להגן על התיקון האחרון.
- לסגור את הפער בין קוד Stage 16 לבין הדוח/allowlist.

קבצים צפויים:

- `tests/refactor_stage17_builder_deps_resolver_runtime.test.js` או הרחבת stage16.
- `tools/wp_builder_pipeline_contract.mjs`
- `docs/REFACTOR_WORKMAP_PROGRESS.md`
- `docs/LEGACY_FALLBACK_AUDIT.md`
- `docs/legacy_fallback_audit.json`
- `tools/wp_legacy_fallback_allowlist.json`

Definition of Done:

- `npm run check:builder-pipeline-contract`
- `npm run check:legacy-fallbacks`
- `npm run test:refactor-stage-guards`
- `npm run check:refactor-integration`

### P2 - התנהגות מוצר קריטית

1. Canvas behavior parity:
   - mirror inside/outside hover+commit.
   - split door top/bottom/mid.
   - removed door blocks click.
   - sketch box hover/commit parity.
2. Cloud Sync remaining races:
   - reconnect with pending push.
   - hidden-tab attention pull.
   - realtime timeout→polling resume.
3. Runtime selectors:
   - להסיר fallback live-path רק אחרי בדיקה שמוכיחה migration boundary.

### P3 - תחזוקה ארוכת טווח

1. UI/CSS:
   - להמשיך split של CSS sections.
   - להוריד `transition: all`.
   - להפחית `!important` רק כשיש כיסוי מספק.
2. Type/surface slimming:
   - `runtime/perf_runtime_surface.ts`
   - `services/models.ts`
   - `kernel/domain_api_surface_sections_shared.ts`
3. Perf:
   - browser perf אמיתי לפני שינוי budget.
   - לא להגדיל budget כדי "להעלים" רגרסיה.

---

## 7. רשימת “לא לעשות” מעודכנת

- לא להחזיר קוד אחורה כדי להתאים לדוח stale.
- לא למחוק כל `_obj` בפרויקט בצורה עיוורת; הבעיה הייתה helper חסר ב־`builder_deps_resolver.ts`, לא כל משתנה בשם דומה.
- לא להוסיף fallback כדי להעביר בדיקה ישנה.
- לא להקשיח runtime selectors לפני שיש migration fixtures.
- לא לפצל PDF/Cloud/Canvas hotspots בלי behavior tests.
- לא להפוך action buttons רגילים ל־OptionButton רק בשביל אחידות מדומה.
- לא לעדכן perf budget בלי מדידה.
- לא להוסיף `as any`.
- לא להוסיף public feature entry בלי סיבה ברורה במניפסט.

---

## 8. סדר PRים מומלץ מכאן

### PR 17 - Guard the Stage 16 fix

- עדכון fallback report/allowlist.
- בדיקת runtime ל־`resolveBuilderDepsOrThrow`.
- חיזוק builder pipeline contract.
- עדכון progress docs.

### PR 18 - Canvas behavior parity

- בדיקות mirror inside/outside מלאות.
- split/removed/sketch parity.
- לא לשנות picking architecture לפני שהבדיקות מוכיחות את הפער.

### PR 19 - Cloud Sync remaining races

- reconnect + pending push.
- hidden tab attention.
- realtime timeout to polling.
- לוודא שאין stale queued work אחרי suppression/dispose.

### PR 20 - Runtime selector hardening slice

- לבחור selector family אחד.
- להעביר compatibility ל־migration boundary.
- להוסיף fail-fast canonical test.
- להסיר fallback live-path רק באותו slice.

### PR 21 - UI/CSS design system continuation

- רק selection controls.
- CSS section split/ratchet.
- לא להכניס `!important` חדש.

### PR 22 - Performance/browser verification

- להריץ browser perf.
- לעדכן baseline רק אחרי מדידה.
- לתעד תוצאה ב־`docs/PERF_AND_STABILITY_BASELINE.md`.

---

---

## 8א. עדכון Stage 18 - Canvas hover/click identity parity

Stage 18 בוצע כשלב התנהגותי ממוקד, לא כעוד שכבת נייר:

- נוסף owner משותף למיזוג metadata:
  - `mergeCanvasPickingHitIdentityUserData(...)` בתוך `esm/native/services/canvas_picking_hit_identity.ts`
- מסלול hover raycast כבר לא מאבד metadata של child surface כאשר ה־`partId` נמצא על parent door group.
- מסלול click scan משתמש באותו מיזוג metadata, ובוחר `doorId` קנוני מתוך metadata ממוזג כאשר הוא קיים.
- canonical hit identity יודע לקרוא `moduleIndex`/`moduleStack` מתוך userData כשאין input מפורש.
- נוספה בדיקת runtime אמיתית שמוכיחה ש־hover ו־click מייצרים זהות שקולה עבור הצורה המסוכנת:
  - mesh פנימי עם `surfaceId`/`faceSide`/`faceSign`
  - parent עם `partId`/`doorId`

קבצים מרכזיים:

- `esm/native/services/canvas_picking_hit_identity.ts`
- `esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts`
- `esm/native/services/canvas_picking_click_hit_flow_scan_objects.ts`
- `tests/canvas_picking_hover_click_hit_identity_parity_runtime.test.ts`
- `tests/refactor_stage18_canvas_hit_parity_runtime.test.js`
- `tools/wp_canvas_hit_identity_contract.mjs`
- `tools/wp_canvas_hit_parity_contract.mjs`

השלב הבא אחרי Stage 18 צריך להיות אחד מאלה:

1. הרחבת Canvas parity ל־browser/e2e עבור mirror inside/outside, split removed doors, ו־sketch.
2. Cloud Sync race coverage שנותר.
3. Runtime selector hardening ממוקד עם fixtures של migration.

## 9. קבצים לפתוח בתחילת PR 17

1. `esm/native/builder/builder_deps_resolver.ts`
2. `tools/wp_builder_pipeline_contract.mjs`
3. `tests/refactor_stage16_builder_pipeline_runtime.test.js`
4. `package.json`
5. `tools/wp_legacy_fallback_audit.mjs`
6. `tools/wp_legacy_fallback_allowlist.json`
7. `docs/legacy_fallback_audit.json`
8. `docs/LEGACY_FALLBACK_AUDIT.md`
9. `docs/REFACTOR_WORKMAP_PROGRESS.md`
10. `docs/BUILDER_PIPELINE_CONTEXT_POLICY.md`

---

## 10. סיכום החלטה

התוכנית המקורית הייתה טובה לתחילת הדרך, אבל עכשיו היא צריכה להפוך מתוכנית “מה צריך לבנות” לתוכנית “מה נשאר להוכיח ולחזק”.

העבודה הבאה לא צריכה להיות רפקטור גדול ורחב. היא צריכה להיות PR קטן וחכם:

1. לסנכרן fallback audit/allowlist.
2. להוסיף runtime regression test ל־builder deps resolver.
3. לוודא שה־guardrails תופסים את סוג הבאג שנמצא.
4. ורק אחר כך להמשיך ל־Canvas ו־Cloud Sync שהם כרגע אזורי הסיכון הגבוהים ביותר במוצר.

---

## 11. Live repository alignment - 2026-04-28 Codex pass

This repository is no longer at the PR 17 starting point described above. The current working tree already contains the Stage 17 builder dependency resolver guard and the Stage 18 canvas hover/click identity parity slice.

Current verified baseline:

- `npm run check:builder-pipeline-contract` passes.
- `npm run check:canvas-hit-identity` passes.
- `npm run check:canvas-hit-parity` passes.
- `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_pull_coalescer_runtime.test.ts` passes.

Plan corrections for this repository:

1. Treat `docs/QUALITY_GUARDRAILS.md` as the living replacement for the removed one-off policy documents. Do not re-create deleted docs such as `docs/BUILDER_PIPELINE_CONTEXT_POLICY.md`, `docs/CANVAS_HIT_PARITY_POLICY.md`, or generated audit dumps unless a tool explicitly owns them again.
2. Treat `docs/REFACTOR_WORKMAP_PROGRESS.md` as a compact audit anchor, not as a long narrative stage log.
3. Keep `refactor_workmap.md` and `wardrobepro_refactor_workmap_2026-04-26.md` as historical inputs; do not restart from Stage 0.
4. The next professional code slice should be Cloud Sync race hardening, beginning with coalescer failure recovery and queued-work cleanup. This is smaller and safer than opening a broad runtime selector or UI/CSS refactor.
5. After that, continue with product-behavior coverage for Canvas mirror/split/sketch parity or Cloud Sync reconnect/attention/realtime timeout behavior. Each slice must add focused runtime or browser coverage before changing production flow.

Immediate next slice:

- Strengthen `tests/cloud_sync_pull_coalescer_runtime.test.ts` so the coalescer proves recovery when `run()` throws synchronously.
- Harden main-row push so debounce suppression and push failure recovery both notify/settle cleanly.
- Harden attention-pull listeners so online pull failures are reported as non-fatal and later events still work.
- Keep the production owners in `esm/native/services/cloud_sync_coalescer_queue_runtime.ts`, `esm/native/services/cloud_sync_main_row_push_runtime.ts`, and `esm/native/services/cloud_sync_lifecycle_attention_pulls_handlers.ts`; no compatibility wrapper, no fallback branch outside the owning runtimes.
- Verify with the focused Cloud Sync runtime tests, then the refactor guardrail lane.

## 12. Live repository alignment - Canvas parity continuation

The Cloud Sync hardening slice described above has now been completed in the working tree, and the next Canvas parity slice has been advanced beyond the initial child-surface case.

Current Canvas parity coverage now includes:

- mirror inside/outside identity parity when mirror surfaces expose `faceSign` without `faceSide`.
- full-door mirror commit fallback from canonical `hitIdentity.faceSign` when no sized mirror draft geometry is available, including removal of matching full-face layouts instead of duplicating them.
- lower split-door identity parity for `lower_d...` part ids, including stack and split-part normalization.
- split click commit parity for lower/corner top/bot/mid part ids, where action selection and custom split positions now use the same full-family bounds as hover.
- removed-door transparent restore/blocking parity, where click and hover share one material policy so invisible restore hitboxes are only pickable in remove-door mode and only when tagged as removed-door owners.
- sketch hover/commit host identity precedence, where manual sketch commit matching now prefers canonical `hostModuleKey`/`hostIsBottom` over stale legacy module fields.
- sketch-box door identity parity using `__wpSketchModuleKey` and `__wpSketchBoxDoorId`.
- sketch-box door special-paint target preservation so canonical sketch door ids do not replace the persisted `doorSpecialMap`/`mirrorLayoutMap` part key.
- click identity no longer invents a `top` stack when no object/module stack hint exists.

Primary code owners:

- `esm/native/services/canvas_picking_hit_identity.ts`
- `esm/native/services/canvas_picking_paint_flow_contracts.ts`
- `esm/native/services/canvas_picking_paint_flow_mirror.ts`
- `esm/native/services/canvas_picking_paint_flow_apply_special.ts`
- `esm/native/services/canvas_picking_click_route_actions.ts`
- `esm/native/services/canvas_picking_click_hit_flow_state.ts`
- `esm/native/services/canvas_picking_click_hit_flow_scan_objects.ts`
- `esm/native/services/canvas_picking_door_split_click_shared.ts`
- `esm/native/services/canvas_picking_transparent_hit_policy.ts`
- `esm/native/services/canvas_picking_manual_layout_sketch_hover_intent_snapshot.ts`
- `esm/native/services/canvas_picking_sketch_hover_matching.ts`

Primary guardrails:

- `tests/canvas_picking_hover_click_hit_identity_parity_runtime.test.ts`
- `tests/canvas_picking_click_hit_flow_runtime.test.ts`
- `tests/canvas_picking_door_split_click_runtime.test.ts`
- `tests/canvas_picking_manual_layout_sketch_hover_intent_runtime.test.ts`
- `tests/canvas_picking_sketch_hover_matching_runtime.test.ts`
- `tests/canvas_picking_paint_flow_apply_runtime.test.ts`
- `tests/refactor_stage18_canvas_hit_parity_runtime.test.js`
- `tools/wp_canvas_hit_identity_contract.mjs`
- `tools/wp_canvas_hit_parity_contract.mjs`

Remaining Canvas product-behavior follow-up should focus on browser/e2e commit flows, especially broader visual split journeys and full sketch hover/commit journeys. Do not add compatibility ladders for those; add behavior coverage first, then fix the owning service.

---

## 13. Live repository alignment - Stage 19 project migration selector hardening

Stage 19 is a focused runtime-selector hardening slice, not a broad rewrite.

What changed:

- Project ingress now canonicalizes existing typed `ui.raw` scalar values, not only missing legacy top-level `ui.*` values.
- Invalid typed `ui.raw` scalar values are removed before migration fallback materialization, so a bad raw value cannot block a valid legacy value from being migrated.
- Experimental/non-typed `ui.raw` keys remain preserved.
- Canonical runtime selectors remain raw-only: they do not read legacy top-level `ui.width`/`ui.height`/etc. directly.
- A focused runtime test proves the intended split: compatibility lives in `io/project_migrations`, while runtime selectors stay strict.

Primary code owner:

- `esm/native/io/project_migrations/ui_raw_snapshot_migration.ts`

Primary guardrails:

- `tests/project_migration_runtime_selector_hardening_runtime.test.ts`
- `tests/refactor_stage19_project_migration_selector_hardening_runtime.test.js`
- `tools/wp_refactor_integration_audit.mjs`
- `docs/REFACTOR_WORKMAP_PROGRESS.md`

Next recommended slices after Stage 19:

1. A real browser/e2e Canvas behavior slice for mirror/split/sketch actions.
2. A Cloud Sync reconnect/hidden-tab/realtime-timeout behavior slice.
3. A narrow runtime selector family cleanup only when covered by migration fixtures.

## 14. Live repository alignment - Stage 20 Cloud Sync polling recovery hardening

Stage 20 is a small Cloud Sync behavior-safety slice. It does not reopen the broader Cloud Sync architecture and it does not add compatibility wrappers.

What changed:

- Realtime-timeout polling fallback now treats recovery pull/restart hooks as non-fatal side work.
- If `pullAllNow({ reason: "realtime-timeout.recover" })` throws, polling still remains armed and the error is reported through the Cloud Sync non-fatal reporting surface.
- If `restartRealtime()` throws during the same recovery kick, polling still remains armed and the restart error is reported separately.
- The Cloud Sync race contract now guards the two recovery reporting operations so future edits cannot accidentally turn this back into a thrown lifecycle callback.
- A focused support-runtime test documents the intended behavior: fallback polling is the critical recovery path; recovery hooks are helpful, but they must not break the fallback.

Primary code owner:

- `esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts`

Primary guardrails:

- `tests/cloud_sync_lifecycle_support_runtime.test.ts`
- `tests/refactor_stage20_cloud_sync_polling_recovery_runtime.test.js`
- `tools/wp_cloud_sync_race_contract.mjs`
- `tools/wp_refactor_integration_audit.mjs`
- `docs/REFACTOR_WORKMAP_PROGRESS.md`

Remaining recommended slices after Stage 20:

1. Browser/e2e Canvas behavior flows for broader mirror/split/sketch journeys.
2. Cloud Sync end-to-end reconnect behavior with real browser lifecycle events.
3. A narrow runtime selector cleanup only when backed by migration fixtures from real payloads.
4. CSS/design-system continuation only for real selection controls, not action buttons in disguise.

---

## 15. Live repository alignment - Stage 21 Cloud Sync realtime start/restart recovery hardening

Stage 21 continues the Cloud Sync lifecycle hardening without opening a broad architecture rewrite. The target is the narrow but important realtime start/restart seam: failures during pre-start cleanup or fallback status transition must not leak as unhandled Promise failures, and cleanup of realtime hint state must not block timer/ref cleanup.

What changed:

- Realtime start flights now catch unexpected setup failures at the owning lifecycle seam, report them through the Cloud Sync non-fatal reporting surface, and transition to a realtime error plus polling fallback through the existing realtime failure path.
- If that fallback transition itself fails, the fallback failure is reported separately and the start flight still settles instead of leaking a rejected Promise.
- Realtime transport cleanup now treats hint-sender cleanup as non-fatal side work. Even if the hint setter throws, the dedupe map is cleared and timer/client/channel refs continue to be cleaned.
- The Cloud Sync race contract now guards the start-flight recovery markers and the hint cleanup recovery marker so future edits cannot reintroduce throwing lifecycle setup.

Primary code owners:

- `esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts`
- `esm/native/services/cloud_sync_lifecycle_realtime_transport_cleanup.ts`

Primary guardrails:

- `tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts`
- `tests/cloud_sync_lifecycle_realtime_transport_runtime.test.ts`
- `tests/refactor_stage21_cloud_sync_realtime_start_recovery_runtime.test.js`
- `tools/wp_cloud_sync_race_contract.mjs`
- `tools/wp_refactor_integration_audit.mjs`
- `docs/REFACTOR_WORKMAP_PROGRESS.md`

Remaining recommended slices after Stage 21:

1. Browser/e2e Canvas behavior flows for broader mirror/split/sketch journeys.
2. A real browser lifecycle Cloud Sync reconnect journey that drives focus/online/visibility/realtime timeout together.
3. A narrow runtime selector cleanup only when backed by migration fixtures from real payloads.
4. CSS/design-system continuation only for real selection controls, not action buttons in disguise.

---

## 16. Live repository alignment - Stage 22 Cloud Sync lifecycle-owner realtime recovery hardening

Stage 22 closes the owner-level seam above the Stage 21 realtime transport/start-flight hardening. Stage 21 made the realtime implementation resilient; Stage 22 makes the lifecycle owner resilient even if a future `startRealtime()` implementation throws synchronously or returns a rejected Promise before the inner realtime guard can recover.

What changed:

- Initial realtime lifecycle start is now routed through a small owner-level guard instead of a bare `void startRealtime()` call.
- Realtime restart requests from polling recovery use the same guard, so rejected restart attempts are reported as non-fatal instead of becoming detached Promise failures.
- The fallback path marks realtime as `error`, preserves the normalized error message on `runtimeStatus.lastError`, and starts polling with a deterministic owner-level recovery reason.
- Browser recovery listeners for diagnostics, focus, online, and visibility are still bound even when realtime start fails immediately.
- A focused runtime test covers both initial owner start failure and fallback-transition failure, while the Cloud Sync race contract and refactor stage guard make the owner-level recovery seam durable.

Primary code owners:

- `esm/native/services/cloud_sync_lifecycle_runtime_realtime_start.ts`
- `esm/native/services/cloud_sync_lifecycle_runtime_start.ts`
- `esm/native/services/cloud_sync_lifecycle_runtime_setup.ts`

Primary guardrails:

- `tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts`
- `tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js`
- `tools/wp_cloud_sync_race_contract.mjs`
- `tools/wp_refactor_integration_audit.mjs`
- `docs/REFACTOR_WORKMAP_PROGRESS.md`

Remaining recommended slices after Stage 22:

1. Browser/e2e Canvas behavior flows for broader mirror/split/sketch journeys.
2. A real browser lifecycle Cloud Sync reconnect journey that drives focus/online/visibility/realtime timeout together in Playwright when test infrastructure is available.
3. A narrow runtime selector cleanup only when backed by migration fixtures from real payloads.
4. CSS/design-system continuation only for real selection controls, not action buttons in disguise.
