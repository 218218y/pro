# מפת עבודה להשלמת רפקטור מקצועי - WardrobePro

תאריך: 26 באפריל 2026  
מקור בדיקה: `03--latest.zip`  
מטרה: להכין תוכנית עבודה מסודרת, עמוקה ומעשית להמשך רפקטור מקצועי: קוד אחיד, יציב, מהיר, ברור, ללא היברידיות, ללא fallbacks ישנים מיותרים, ועם בסיס חזק להוספת פיצ'רים.

---

> עדכון מצב — 30 באפריל 2026:
> התוכנית ההיסטורית במסמך הזה עדיין נכונה ככיוון ארכיטקטוני, אבל חלק מהשלבים שבה כבר הושלמו בפועל עד Stage 41. לכן אין לבצע אותה בצורה עיוורת מהתחלה. baseline נוכחי: כפילויות scripts כבר סגורות, guardrails קיימים, והפער המיידי שנמצא בהרצה הוא drift במלאי `legacy`/`fallback` בעקבות תוספות קנוניות ב־`ui.raw` וב־render surface runtime. שלב העבודה שנוסף הוא **Stage 42 — Legacy fallback inventory closeout**: ליישר allowlist ודוחות מול הקוד הנוכחי, לעגן זאת בבדיקת runtime ייעודית, ולהשאיר את `verify:refactor-modernization` כנתיב האימות הראשי.

> עדכון Stage 43 — 30 באפריל 2026:
> ה־hotspot `esm/native/runtime/perf_runtime_surface.ts` פורק לבעלויות ממוקדות: core למדידות ו־action classification, fingerprint ל־state summary, debug surfaces ל־store/build/render diagnostics, ו־facade קטן שמחזיק את ה־API הציבורי ואת התקנת `__WP_PERF__`. השלב מעוגן בבדיקת guard כדי שהקובץ לא יחזור לגדול כ־god surface.


> עדכון Stage 44 — 30 באפריל 2026:
> ה־hotspot `esm/native/builder/scheduler_debug_stats.ts` פורק ל־facade ציבורי קטן ולבעלויות פנימיות ממוקדות: reason-store, signature/suppression policy, counter recorders, ו־budget summary. ה־API הציבורי נשמר דרך facade כדי למנוע שבירת imports קיימים, והבעלות החדשה מעוגנת ב־guard ייעודי.


> עדכון Stage 45 — 1 במאי 2026:
> ה־hotspot `esm/native/builder/corner_connector_interior_special.ts` פורק ל־facade ציבורי קטן ולבעלויות פנימיות ממוקדות: types, metric policy, polygon/shape geometry, folded-content planning, ו־scene application. ה־API הציבורי נשמר דרך ה־facade, והבעלות החדשה מעוגנת ב־guard ייעודי כדי שה־special interior לא יחזור להיות קובץ כלבו.


> עדכון Stage 46 — 1 במאי 2026:
> ה־hotspot `esm/native/kernel/domain_api_surface_sections_shared.ts` פורק מ־shared implementation רחב ל־facade קטן ולבעלויות ממוקדות: contracts/section registry, prefixed-map semantics, canonical map write/skip policy, ו־removed-door key policy. ה־API הציבורי נשמר דרך facade כדי לא לשבור imports קיימים, והבעלות החדשה מעוגנת ב־guard ייעודי.

## 1. תקציר מנהלים

המצב הכללי של הפרויקט טוב מאוד ביחס לפרויקט שעבר מיגרציה גדולה: הארכיטקטורה כבר מכוונת ל־Pure ESM, Store-driven SSOT, שכבות, surface contracts, verify lanes, בדיקות רבות, וסגירה הדרגתית של חובות refactor. אין סימנים מיידיים לחזרה ל־`window.App`, `globalThis.App`, `window.THREE`, או `globalThis.THREE` בתוך `esm/`, ואין `export default` אמיתי ב־`esm/`.

עם זאת, כדי להגיע לרמה "מקצועית לגמרי" ולא רק "כל הבדיקות ירוקות", צריך להשלים עוד כמה מהלכים מסודרים:

1. **לנקות את שכבת הכלים והגייטים** - יש כרגע כפילויות scripts ב־`package.json` שגורמות ל־`check:script-duplicates` להיכשל אם מריצים אותו עם `--expect-groups 0`.
2. **להפוך את כל ה־fallbacks הישנים למלאי מנוהל** - לא להסיר בעיניים עצומות. צריך לסווג כל fallback: ברירת מחדל לגיטימית, התאמת import ישן, fallback דפדפן/סביבה, או חוב legacy שצריך להיעלם.
3. **לסגור את פערי ה־SSOT סביב `ui.raw`, `config`, ו־`runtime`** - יש עדיין קוד שמנרמל/קורא legacy shapes. חלק ממנו כנראה נכון ל־project import, אבל אסור שיישאר במסלול runtime רגיל.
4. **להמשיך לדקק hotspots** - בעיקר Builder, Runtime, Services/Cloud Sync, React UI, Order PDF, ו־CSS.
5. **להוסיף audits שמונעים חזרה אחורה** - לא מספיק לתקן ידנית. צריך שכללים כמו "אין fallback legacy חדש" או "אין raw DOM sink לא מסונן" יהיו בדיקות.
6. **להרחיב בדיקות מסע משתמש וביצועים** - בפרט למסלולי authoring אמיתיים, canvas/picking, save/load payload, והבדלים בין hover לבין commit.

הדבר החשוב: הבדיקות הירוקות הן בסיס טוב, לא סוף הדרך. המפה למטה בנויה כך שאפשר לעבוד שלב־שלב בלי לשבור תיקונים שכבר נעשו.

---

## 2. ממצאים מהסריקה הנוכחית

### 2.1 נקודות חזקות שכבר קיימות

- `esm/` הוא כמעט כולו TypeScript:
  - כ־2,301 קבצי source תחת `esm/`.
  - כ־237K שורות source תחת `esm/`.
  - רוב מוחלט של הקבצים הם `.ts`/`.tsx`; אין כמעט ערבוב JS ישן במסלול source.
- לא נמצאו מופעים של:
  - `window.App`
  - `globalThis.App`
  - `window.THREE`
  - `globalThis.THREE`
- `wp_refactor_closeout_audit` עבר:
  - 904 קבצי test ברמה העליונה.
  - 10 family contract files.
  - 0 thin contract files.
  - 0 real `export default` hits תחת `esm/`.
  - 0 package script test refs חסרים.
- יש מסמכי בעלות ושכבות טובים:
  - `docs/dev_guide.md`
  - `docs/ARCHITECTURE_OWNERSHIP_MAP.md`
  - `docs/layering_completion_audit.md`
  - `docs/PERF_AND_STABILITY_BASELINE.md`
- קיימים gates חשובים:
  - `contract:layers`
  - `contract:api`
  - `ui:contract`
  - `ui:dom-guard`
  - `ui:bindkey-guard`
  - `wiring:guard`
  - `typecheck:all`
  - `perf:smoke`

### 2.2 ממצא כלי מיידי

הרצה ישירה של duplicate script audit העלתה:

```txt
Expected 0 exact duplicate script command group(s), found 2.
```

הכפילויות:

| קבוצה      | scripts                          | פקודה                                          |
| ---------- | -------------------------------- | ---------------------------------------------- |
| release    | `release`, `release:client`      | `node tools/wp_release.js --build-mode client` |
| three sync | `postinstall`, `three:sync-libs` | `node tools/wp_sync_three_libs.mjs`            |

קבצים רלוונטיים:

- `package.json`
- `tools/wp_script_duplicate_audit.mjs`
- `docs/SCRIPT_DUPLICATE_AUDIT.md`
- `docs/script_duplicate_audit.json`
- `tests/wp_toolchain_family_contracts.test.js`

המלצה: לא להתעלם. או מסירים alias כפול שאינו נחוץ, או מוסיפים allowlist מפורש לכפילות מכוונת כמו `postinstall` מול script ידני. המצב הנוכחי בעייתי כי יש script בשם `check:script-duplicates` שמצפה ל־0, אבל המציאות היא 2.

### 2.3 מוקדי קוד גדולים

קבצים גדולים במיוחד שכדאי להמשיך לדקק בזהירות:

| קובץ                                                          | שורות בקירוב | הערה                                                         |
| ------------------------------------------------------------- | -----------: | ------------------------------------------------------------ |
| `esm/native/runtime/perf_runtime_surface.ts`                  |          812 | surface רחב מאוד; לבדוק אם אפשר לפצל reader/writer/reporting |
| `esm/native/builder/scheduler_debug_stats.ts`                 |          530 | לוגיקת debug/stats יכולה להפוך לבעלים פנימיים קטנים          |
| `esm/native/builder/corner_connector_interior_special.ts`     |          525 | סכנת ערבוב geometry, material, policy, emit                  |
| `esm/native/kernel/domain_api_surface_sections_shared.ts`     |          473 | surface/shared כבד - לבדוק ownership                         |
| `esm/native/data/preset_models.ts`                            |          457 | data גדול; לשקול data partition או generator                 |
| `esm/native/runtime/slice_write_access_dispatch.ts`           |          439 | write dispatch hotpath - לא לגעת בלי tests ממוקדים           |
| `esm/native/ui/react/pdf/order_pdf_overlay_export_actions.ts` |          415 | UI + export orchestration hotspot                            |
| `esm/native/services/models.ts`                               |          402 | service surface רחב                                          |
| `esm/native/builder/scheduler_shared.ts`                      |          398 | core scheduling policy                                       |
| `esm/native/ui/react/tabs/interior_tab_helpers.tsx`           |          388 | UI helpers עם סיכון להפוך ל־god-helper                       |
| `esm/native/builder/room.ts`                                  |          387 | visual update/healing sensitive                              |
| `esm/native/builder/render_preview_sketch_measurements.ts`    |          373 | sketch/render measurement hotspot                            |

### 2.4 CSS/UI style debt

`css/react_styles.css` מכיל כ־5,663 שורות. נמצאו סימני סיכון תחזוקתיים:

- כ־141 מופעי `!important`.
- כ־124 מופעי `box-shadow`.
- כ־54 מופעי `z-index`.
- כ־39 מופעי `transition`.
- קובץ אחד גדול שמערבב tokens, layout, component rules, overrides ותיקוני responsive.

זה לא אומר שה־CSS שבור. זה כן אומר שכל תיקון UI קטן, כמו גובה כפתורים או שורות כפתורים, עלול להיכנס כטלאי אם לא מפרקים את ה־CSS למערכת variants ברורה.

### 2.5 Fallback / legacy inventory

בסריקה מילולית תחת `esm/` נמצאו הרבה מופעים של מונחים כמו `fallback` ו־`legacy`. חלק גדול מהם לגיטימי לגמרי: parsing, default values, project import, browser-safe wrappers. אבל כדי להגיע לקוד נקי באמת צריך להפוך את זה למלאי מנוהל.

קבצים עם צפיפות גבוהה של fallback/legacy שכדאי לבדוק ראשונים:

- `esm/native/runtime/runtime_selectors.ts`
- `esm/native/runtime/ui_raw_selectors.ts`
- `esm/native/runtime/config_selectors_readers.ts`
- `esm/native/runtime/config_selectors_shared.ts`
- `esm/native/runtime/config_selectors_scalars.ts`
- `esm/native/platform/storage.ts`
- `esm/native/runtime/storage_access.ts`
- `esm/native/runtime/cache_access.ts`
- `esm/native/builder/build_state_resolver.ts`
- `esm/native/builder/build_wardrobe_flow_context_setup.ts`
- `esm/native/builder/core_pure.ts`
- `esm/native/builder/external_drawers_pipeline.ts`
- `esm/native/features/door_style_overrides.ts`
- `esm/native/features/door_trim_shared.ts`
- `esm/native/features/modules_configuration/*`
- `esm/native/ui/react/tabs/interior_tab_view_state_shared.ts`
- `esm/native/ui/react/notes/notes_overlay_text_style_runtime.ts`
- `esm/native/ui/pdf/order_pdf_document_fields_runtime.ts`
- `esm/native/services/cloud_sync_*`

נקודת מפתח: לא כל fallback הוא רע. fallback רע הוא כזה שמאפשר runtime היברידי, shape guessing במסלול חי, או הסתרת בעיית state. fallback טוב הוא כזה שנמצא רק ב־migration/import boundary או adapter boundary ומסומן כך.

---

## 3. עקרונות עבודה מחייבים לשלב הבא

### 3.1 לא לשבור תיקונים קיימים

בכל שלב:

1. לקרוא קודם את owner doc / tests / implementation.
2. לזהות האם הבדיקה הישנה שומרת legacy או התנהגות קנונית.
3. אם הקוד החדש נכון והבדיקה ישנה - לעדכן בדיקה, לא להחזיר קוד אחורה.
4. לא להוסיף compatibility shim כדי "להרגיע" בדיקה ישנה.

### 3.2 כל שינוי צריך להיות חד־מסלולי

אסור להשאיר שני מסלולים:

- canonical + legacy
- store + DOM snapshot
- ctx + args object
- service API + root shim
- sanitized HTML + raw innerHTML
- render scheduler + manual ad-hoc render call

אם חייבים זמנית שני מסלולים - להגדיר TODO סגור עם test שמוודא שהמסלול הישן נעלם בשלב הבא. בפועל עדיף בלי TODO פתוח; repo הזה שומר יפה על 0 TODO.

### 3.3 הפרדה בין migration boundary לבין runtime

מותר לנרמל shape ישן רק ב:

- project import/load
- persisted payload migration
- browser adapter boundary
- optional dev/debug tooling

אסור ש־runtime רגיל ימשיך לקרוא shape ישן "ליתר ביטחון".

### 3.4 ביצועים בלי פגיעה באיכות

לא חוסכים render/build אם זה מסתיר state שגוי. קודם נכונות, אחר כך dedupe/coalescing.  
שיפור ביצועים נכון הוא:

- פחות rebuild כפול
- פחות render follow-through כפול
- פחות DOM measurement repeated
- cache עם invalidation ברור
- no-op אמיתי בלבד, לא no-op שמסתיר מצב שצריך heal

---

## 4. סדר עבודה מומלץ

## שלב 0 - Baseline, gates וכלי בקרה

**מטרה:** לפני שנוגעים בקוד מוצר, לוודא שכלי הבקרה עצמם מדויקים ולא נותנים תחושת ביטחון מזויפת.

### משימות

1. לתקן את כפילויות scripts:
   - `release` מול `release:client`:
     - אפשרות א: להשאיר `release` כפקודה הראשית ולהסיר `release:client`.
     - אפשרות ב: להפוך `release` ל־`npm run release:client`, ואז לעדכן duplicate audit כך ש־alias מכוון נספר בנפרד.
   - `postinstall` מול `three:sync-libs`:
     - זו כנראה כפילות מכוונת.
     - להוסיף allowlist מפורש ב־`tools/wp_script_duplicate_audit.mjs` עבור hook + manual script.
     - לעדכן את הדוח.
2. לעדכן:
   - `docs/SCRIPT_DUPLICATE_AUDIT.md`
   - `docs/script_duplicate_audit.json`
3. להוסיף/לוודא בדיקה:
   - `tests/wp_toolchain_family_contracts.test.js`
   - בדיקה שמוודאת `check:script-duplicates` לא נתקע במצב "מצפה 0 אבל בפועל 2".
4. להריץ:
   - `npm run check:script-duplicates`
   - `npm run perf:smoke`
   - `npm run verify:toolchain-surfaces` אם קיים/רלוונטי
   - `npm run gate -- --no-bundle` או המקבילה הקיימת

### קבצים

- `package.json`
- `tools/wp_script_duplicate_audit.mjs`
- `docs/SCRIPT_DUPLICATE_AUDIT.md`
- `docs/script_duplicate_audit.json`
- `tests/wp_toolchain_family_contracts.test.js`

### Definition of Done

- `node tools/wp_script_duplicate_audit.mjs --check --expect-groups 0` עובר, או שה־expect מעודכן ומתועד עם allowlist ברור.
- אין duplicate לא מוסבר.
- הדוחות ב־docs מסונכרנים עם המציאות.

---

## שלב 1 - Legacy/Fallback audit ממוכן

**מטרה:** להפוך "יש הרבה fallback/legacy" למפת עבודה מדויקת שאפשר לסגור בלי לנחש.

### משימות

1. ליצור כלי חדש:
   - `tools/wp_legacy_fallback_audit.mjs`
2. הכלי יסרוק `esm/` ויחלק מופעים לקטגוריות:
   - `runtime-default`: ברירת מחדל לגיטימית, למשל default size.
   - `browser-adapter`: fallback סביב דפדפן/DOM/RAF/timers.
   - `project-migration`: תמיכה בטעינת פרויקטים ישנים.
   - `test-fixture`: מופע בדיקות בלבד.
   - `legacy-runtime-risk`: חוב שצריך להסיר.
   - `unknown`: דורש בדיקה ידנית.
3. להוסיף allowlist קנוני:
   - `tools/wp_legacy_fallback_allowlist.json`
4. להוסיף דוח:
   - `docs/LEGACY_FALLBACK_AUDIT.md`
   - `docs/legacy_fallback_audit.json`
5. להוסיף check:
   - `npm run check:legacy-fallbacks`
6. להכניס ל־gate רק אחרי שהמלאי מיוצב.

### קבצים לבדיקה ראשונה

- `esm/native/runtime/runtime_selectors.ts`
- `esm/native/runtime/ui_raw_selectors.ts`
- `esm/native/runtime/config_selectors_readers.ts`
- `esm/native/runtime/config_selectors_shared.ts`
- `esm/native/runtime/config_selectors_scalars.ts`
- `esm/native/runtime/storage_access.ts`
- `esm/native/runtime/cache_access.ts`
- `esm/native/builder/build_state_resolver.ts`
- `esm/native/builder/build_wardrobe_flow_context_setup.ts`
- `esm/native/adapters/browser/ui_ops.ts`
- `esm/native/adapters/browser/env_surface.ts`
- `esm/native/services/cloud_sync_*`
- `esm/native/ui/dom_helpers.ts`
- `esm/native/ui/html_sanitize_runtime.ts`
- `esm/native/ui/error_overlay.ts`

### Definition of Done

- כל fallback מסווג.
- כל fallback runtime-risk מקבל issue/שלב הסרה.
- אין fallback חדש בלי קטגוריה.
- בדיקות ישנות שמצפות ל־legacy fallback מסומנות לעדכון.

---

## שלב 2 - הפרדת migration/import מ־runtime live path

**מטרה:** להשאיר תמיכה בפרויקטים ישנים רק בגבול טעינה/מיגרציה, ולא במסלול העבודה החי.

### בעיה מרכזית

קבצים כמו `ui_raw_selectors.ts` ו־`config_selectors_*` עדיין יודעים לקרוא shape ישן או ערכים ישנים. זה יכול להיות נכון בזמן import, אבל מסוכן אם builder/runtime רגיל נשען על זה.

### משימות

1. ליצור boundary ברור:
   - `esm/native/io/project_migrations/*`
   - או להרחיב owner קיים תחת `esm/native/io/project_io_*`.
2. להעביר לשם:
   - השלמת `ui.raw` מ־`ui.*`.
   - נרמול config ישן.
   - מיפוי ערכי enum ישנים.
   - תיקון payloads ישנים.
3. להקשיח runtime:
   - `readUiRawScalarFromSnapshot` לא אמור ליפול ל־`ui[key]` במסלול builder רגיל.
   - `ensureUiRawDimsFromSnapshot` לא אמור להשלים dims בזמן build רגיל.
   - build state צריך להיכשל ברור אם חסרים dims חיוניים.
4. להוסיף API מפורש:
   - `migrateProjectUiSnapshotToCanonicalRaw(...)`
   - `migrateProjectConfigSnapshotToCanonical(...)`
   - `assertCanonicalUiRawDims(...)`
5. לעדכן tests:
   - tests שמוודאים import ישן עובד.
   - tests שמוודאים runtime canonical fail-fast כשה־store חסר canonical raw.

### קבצים

- `esm/native/runtime/ui_raw_selectors.ts`
- `esm/native/runtime/config_selectors_readers.ts`
- `esm/native/runtime/config_selectors_shared.ts`
- `esm/native/runtime/config_selectors_scalars.ts`
- `esm/native/builder/build_state_resolver.ts`
- `esm/native/io/project_io_orchestrator_project_load.ts`
- `esm/native/io/project_payload_shared.ts`
- `esm/native/features/project_config/*`
- `tests/project_io_*`
- `tests/kernel_state_kernel_config_runtime.test.ts`
- `tests/zustand_state_api_commit_ui_snapshot_runtime.test.ts`

### סיכון

זה שלב רגיש. אם מסירים fallback מהר מדי, טעינת פרויקטים קיימים עלולה להישבר. לכן קודם להעביר fallback ל־migration owner, ורק אחר כך להקשיח runtime.

### Definition of Done

- פרויקט ישן נטען ומומר canonical.
- אחרי טעינה, ה־store מכיל canonical shape.
- builder לא מסתמך על legacy shape.
- בדיקות runtime לא עוברות בזכות fallback שקט.

---

## שלב 3 - Runtime/config selectors hardening

**מטרה:** להפוך selectors מ־fail-soft כללי ל־typed readers עם policy ברור.

### משימות

1. ב־`runtime_selectors.ts`:
   - להשאיר tolerant parsing רק במקום שבו באמת מדובר persisted/import.
   - במסלול live state, להחזיר typed value בלבד או לזרוק error לפי policy.
2. ב־`config_selectors_*`:
   - `readConfigEnumFromSnapshot(..., fallback)` צריך להיבחן היטב.
   - enum לא מוכר בזמן live runtime צריך להיות error, לא fallback.
   - fallback יכול להישאר רק במיגרציה.
3. ב־`storage_access.ts` / `platform/storage.ts`:
   - לוודא שכל גישה ל־localStorage עוברת owner אחד.
   - לבדוק מופעים ישירים כמו `render_loop_impl_support.ts`.
4. ב־`cache_access.ts`:
   - לוודא שה־legacy root cache bag נמחק באמת ולא נשאר מצב היברידי.
5. לייצר policy docs:
   - `docs/RUNTIME_SELECTOR_POLICY.md`

### קבצים

- `esm/native/runtime/runtime_selectors.ts`
- `esm/native/runtime/config_selectors_readers.ts`
- `esm/native/runtime/config_selectors_shared.ts`
- `esm/native/runtime/config_selectors_scalars.ts`
- `esm/native/runtime/storage_access.ts`
- `esm/native/platform/storage.ts`
- `esm/native/platform/render_loop_impl_support.ts`
- `esm/native/runtime/cache_access.ts`

### בדיקות

- `tests/runtime_platform_core_family_contracts.test.js`
- `tests/platform_runtime_access_contracts.test.js`
- `tests/kernel_state_kernel_config_runtime.test.ts`
- `tests/project_io_config_snapshot_canonicalization_runtime.test.ts`
- בדיקה חדשה: `tests/runtime_selectors_fail_fast_policy_runtime.test.ts`

---

## שלב 4 - BuildContext-only ו־builder pipeline cleanup

**מטרה:** להשלים את היעד שכבר כתוב ב־dev guide: pipeline מקבל `ctx` בלבד, בלי args פתוחים, בלי shape guessing, בלי קריאות DOM או root shims.

### מוקדים

- `esm/native/builder/build_context.ts`
- `esm/native/builder/build_flow_context_factory.ts`
- `esm/native/builder/build_flow_plan*.ts`
- `esm/native/builder/build_wardrobe_flow*.ts`
- `esm/native/builder/module_loop_pipeline*.ts`
- `esm/native/builder/hinged_doors_module_ops*.ts`
- `esm/native/builder/sliding_doors_pipeline.ts`
- `esm/native/builder/external_drawers_pipeline.ts`
- `esm/native/builder/internal_drawers_pipeline.ts`
- `esm/native/builder/corner_*`
- `esm/native/builder/render_*`

### משימות

1. Audit חתימות:
   - כל פונקציית pipeline ראשית צריכה לקבל `ctx`.
   - פונקציות pure יכולות לקבל input typed נקי.
   - לא להשאיר `unknown` args במסלול pipeline אם אפשר להחליף type.
2. לנקות `build_wardrobe_flow_context_setup.ts`:
   - `fallbackToBuildString` צריך להיבדק: האם זה fallback לגיטימי או חוב?
   - אם platform stringifier חובה - fail-fast.
   - אם לא חובה - לתעד category.
3. `builder_deps_resolver.ts`:
   - לוודא שכל dep חסר נכשל במקום אחד עם error ברור.
   - לא להחזיר null שמאפשר pipeline להמשיך חצי־עובד.
4. `core_pure.ts`:
   - הערה `Fill missing keys only (do not stomp legacy impls...)` צריכה בדיקה.
   - האם עדיין יש legacy impls? אם לא - להסיר תמיכה.
5. `corner_*`:
   - להמשיך דיקוק לפי domains:
     - geometry
     - material
     - state
     - emit
     - picking metadata
6. להוסיף guard:
   - `tests/builder_context_only_contracts.test.js`
   - scan שמוודא pipeline files לא מקבלים `args` רחב בפונקציות export מרכזיות.

### Definition of Done

- אין pipeline live שמקבל גם ctx וגם args legacy.
- deps חסרים גורמים error ברור ולא no-op שקט.
- כל read של state מגיע דרך buildState/context ולא root probing.

---

## שלב 5 - Public API / features layer contract

**מטרה:** למנוע מצב שבו `features/` הופכת ל־"תיקיית utilities כללית" שכל שכבה מייבאת ממנה מה שבא לה.

### רקע

הסריקה הראתה ש־`features` מיובאת על ידי builder/services/kernel/ui/io. זה יכול להיות נכון, אבל צריך בעלות. יש כבר קבצי API בחלק מהמקומות:

- `esm/native/features/modules_configuration/modules_config_api.ts`
- `esm/native/features/modules_configuration/corner_cells_api.ts`
- `esm/native/features/interior_layout_presets/api.ts`
- `esm/native/features/special_dims/index.ts`
- `esm/native/features/stack_split/index.ts`

אבל אין surface אחיד לכל feature family.

### משימות

1. להגדיר policy:
   - האם `features` היא shared domain layer שמותר לכל השכבות לייבא?
   - או שכדאי לחייב imports דרך `features/<feature>/api.ts`?
2. להוסיף contract:
   - `tools/wp_features_public_api_contract.mjs`
3. לסווג features:
   - pure domain helpers
   - migration helpers
   - UI helpers שאסור ל־builder לייבא
   - builder-only helpers
4. להתחיל מ־modules/corner/door trim/door style:
   - `esm/native/features/modules_configuration/*`
   - `esm/native/features/door_trim_shared.ts`
   - `esm/native/features/door_style_overrides.ts`
   - `esm/native/features/mirror_layout_contracts.ts`

### Definition of Done

- אין import עמוק ל־feature internals ממספר שכבות בלי surface ברור.
- שינוי feature אחד לא שובר שכבה אחרת דרך dependency נסתר.
- guard רץ ב־verify או לפחות ב־perf/toolchain lane.

---

## שלב 6 - UI React ו־CSS design-system cleanup

**מטרה:** למנוע תיקוני UI נקודתיים כטלאים, ולהפוך את הכפתורים/טאבים/פאנלים למערכת אחידה.

### בעיות נוכחיות

- `css/react_styles.css` גדול מאוד.
- יש הרבה `!important`.
- קיימים components/helpers רבים סביב tabs:
  - `esm/native/ui/react/tabs/StructureTab.view.tsx`
  - `esm/native/ui/react/tabs/InteriorTab.view.tsx`
  - `esm/native/ui/react/tabs/design_tab_*`
  - `esm/native/ui/react/tabs/interior_layout_*`
  - `esm/native/ui/react/tabs/structure_tab_*`
- תיקונים כמו "שלושה כפתורים בשורה" או "כפתורי משנה נמוכים יותר" צריכים להיות variant system, לא override ספציפי.

### משימות

1. ליצור UI tokens:
   - `esm/native/ui/react/styles/tokens.ts`
   - או CSS variables מסודר בתוך `css/react_styles.css` בתחילת הקובץ.
2. ליצור ButtonGroup/ButtonOption primitives:
   - `OptionButton`
   - `OptionButtonGroup`
   - variants:
     - `primary`
     - `sub`
     - `compact`
     - `micro`
     - `threeAcross`
     - `colorSwatch`
3. להחליף בהדרגה כפתורים ידניים:
   - Structure tab legs controls
   - Interior box base controls
   - Interior leg type/color controls
   - Design color/saved swatches controls
4. לפרק CSS:
   - `css/react_styles.tokens.css`
   - `css/react_styles.layout.css`
   - `css/react_styles.controls.css`
   - `css/react_styles.pdf.css`
   - `css/react_styles.notes.css`
   - או להשאיר bundle אחד אבל source sections ברורים מאוד עם guard על selector count.
5. להפחית `!important`:
   - כל `!important` מקבל סיבה או מוסר.
   - להוסיף style audit שמדווח count ומונע גידול.
6. להוסיף visual/runtime tests:
   - `tests/structure_tab_button_variants_runtime.test.ts`
   - `tests/interior_tab_button_grid_runtime.test.ts`
   - `tests/ui_css_specificity_contracts.test.js`

### קבצים

- `css/react_styles.css`
- `esm/native/ui/react/tabs/StructureTab.view.tsx`
- `esm/native/ui/react/tabs/InteriorTab.view.tsx`
- `esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx`
- `esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts`
- `esm/native/ui/react/tabs/design_tab_color_section.tsx`
- `esm/native/ui/react/tabs/design_tab_multicolor_panel_view.tsx`
- `esm/native/ui/react/tabs/structure_tab_*`

### Definition of Done

- כפתורים חוזרים משתמשים באותו primitive.
- אין צורך ב־CSS override נקודתי עבור כל מסך.
- אפשר להוסיף feature UI חדש בלי להעתיק classes.
- כל button-grid קריטי מכוסה בבדיקת layout/contract.

---

## שלב 7 - Canvas picking / sketch / door-face interaction hardening

**מטרה:** לסגור סופית פערים בין hover לבין commit, ובין side/face/inside/outside metadata.

### למה זה חשוב

באגים מהסוג "hover נכון אבל click מוסיף בצד הלא נכון" נוצרים בדרך כלל כש־hover path ו־commit path לא משתמשים באותה canonical hit identity. זה אזור רגיש במיוחד בפרויקט Three/canvas.

### משימות

1. להגדיר canonical hit record:
   - `targetKind`
   - `partId`
   - `moduleIndex`
   - `surfaceId`
   - `faceSign`
   - `inside/outside`
   - `doorId`
   - `splitPart`
   - `source`
2. לוודא שכל hover preview וכל click commit מקבלים אותו record, לא מחשבים מחדש.
3. לבדוק owners:
   - `esm/native/services/canvas_picking_*`
   - `esm/native/ui/interactions/canvas_interactions_shared.ts`
   - `esm/native/builder/visuals_and_contents_door_visual.ts`
   - `esm/native/features/mirror_layout_contracts.ts`
   - `esm/shared/mirror_layout_contracts_shared.ts`
4. להוסיף בדיקות:
   - mirror inside/outside hover + commit.
   - split door top/bottom/mid face.
   - removed door + click blocked.
   - sketch box surface preview + commit parity.
5. להוסיף performance guard:
   - hover לא יוצר allocations גדולים.
   - pointermove לא עושה full scene scan אם hit cache תקף.

### קבצים

- `esm/native/services/canvas_picking_hover_flow*.ts`
- `esm/native/services/canvas_picking_door_action_hover*.ts`
- `esm/native/services/canvas_picking_click_hit_flow*.ts`
- `esm/native/services/canvas_picking_projection_runtime*.ts`
- `esm/native/ui/interactions/canvas_interactions_shared.ts`
- `esm/native/builder/visuals_and_contents_door_visual.ts`
- `esm/native/builder/door_visual_lookup_state.ts`
- `esm/native/features/mirror_layout_contracts.ts`
- `tests/canvas_picking_*`
- `tests/door_mirror_styled_visual_runtime.test.js`

### Definition of Done

- hover record === commit record מבחינת identity.
- אין fallback של commit שמנסה לנחש face אם hover כבר ידע.
- בדיקות מכסות פנים/חוץ, split, removed, sketch.

---

## שלב 8 - Order PDF / Notes / rich HTML hardening

**מטרה:** לשמר יכולות עשירות בלי raw DOM/HTML drift ובלי leaks של listeners/timers.

### ממצאים

יש כבר שיפור גדול סביב `html_sanitize_runtime.ts`, אבל עדיין קיימים sinks שצריך לוודא שהם מדיניותיים:

- `esm/native/ui/html_sanitize_runtime.ts`
- `esm/native/ui/dom_helpers.ts`
- `esm/native/ui/error_overlay.ts`
- `esm/entry_pro_shared.ts`
- `esm/native/runtime/dom_ops.ts`
- `esm/native/ui/react/pdf/*`
- `esm/native/ui/react/notes/*`

### משימות

1. להגדיר רשימת HTML policies:
   - `overlay-help`
   - `notes-rich`
   - `order-pdf-rich`
   - `plain-text-only`
2. כל כתיבה ל־`innerHTML` חייבת לעבור policy owner או להיאסר.
3. להוסיף guard:
   - `tools/wp_html_sink_audit.mjs`
   - fail על raw `innerHTML =` מחוץ ל־allowlist.
4. לבדוק listeners/timers:
   - pointer sessions
   - text layer hooks
   - focus trap
   - Gmail draft script loader
5. לפצל hotspots:
   - `order_pdf_overlay_export_actions.ts`
   - `order_pdf_overlay_sketch_toolbar.tsx`
   - `order_pdf_overlay_editor_surface.tsx`
   - `notes_overlay_controller_runtime.tsx`

### בדיקות

- `tests/order_pdf_*`
- `tests/notes_overlay_*`
- בדיקה חדשה: `tests/ui_html_sink_policy_runtime.test.js`
- בדיקה חדשה: `tests/order_pdf_listener_cleanup_runtime.test.ts`

### Definition of Done

- כל rich HTML עובר sanitize owner.
- כל listener/timer נרשם דרך cleanup owner.
- אין raw HTML helper כללי שיכול לשמש future bypass.

---

## שלב 9 - Cloud Sync: state machine, timers, status publication

**מטרה:** להפוך Cloud Sync ליחידה צפויה לגמרי: pull/push/realtime/polling/status בלי race, בלי "כמעט פורסם", בלי any.

### ממצאים

Cloud Sync הוא אזור עצום ומכוסה בהרבה בדיקות:

- `cloud_sync`: כ־110 test files לפי closeout audit.
- הרבה קבצים תחת `esm/native/services/cloud_sync_*`.
- יש שימוש אחד ב־`as any`:
  - `esm/native/services/cloud_sync_lifecycle_bindings.ts`

### משימות

1. להסיר `as any`:
   - להגדיר type מלא ל־`runtimeStatus`.
   - לעדכן `hasCloudSyncLifecycleRecentPull`.
2. לאחד timer access:
   - לבדוק שכל `setInterval/clearInterval` עוברים דרך browser/env/timer owner או lifecycle timer owner.
3. לחזק state machine:
   - realtime connecting/subscribed/failure/dispose.
   - polling fallback.
   - attention/visibility pull.
   - offline/hidden blocking.
4. לחזק status publication:
   - publish פעם אחת אחרי mutation מקובצת.
   - לא לפרסם pull/push timestamps לפני הצלחה אמיתית.
5. להוסיף tests ל־race conditions:
   - dispose באמצע pull.
   - reconnect בזמן pending push.
   - hidden tab + attention.
   - realtime timeout ואז polling resume.

### קבצים

- `esm/native/services/cloud_sync_lifecycle.ts`
- `esm/native/services/cloud_sync_lifecycle_support.ts`
- `esm/native/services/cloud_sync_lifecycle_bindings.ts`
- `esm/native/services/cloud_sync_lifecycle_realtime*.ts`
- `esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts`
- `esm/native/services/cloud_sync_coalescer.ts`
- `esm/native/services/cloud_sync_pull_scopes.ts`
- `esm/native/services/cloud_sync_remote_read_support.ts`
- `esm/native/services/cloud_sync_remote_write_support.ts`
- `esm/native/services/cloud_sync_status_install.ts`
- `tests/cloud_sync_*`

### Definition of Done

- 0 `as any`.
- timers cleanup deterministic.
- status publication deterministic.
- Cloud Sync tests עדיין ירוקים, עם תוספת race coverage.

---

## שלב 10 - Render/build performance בלי ירידה באיכות

**מטרה:** לשפר ביצועים דרך מניעת עבודה כפולה, לא דרך דילוג על עבודה נחוצה.

### מוקדים

- scheduler/build request dedupe
- render follow-through
- geometry/material cache
- CSS/layout recalculation
- pointermove/hover
- Order PDF export
- Cloud Sync coalescing

### משימות

1. Scheduler:
   - לבדוק `builder/scheduler_shared.ts`, `scheduler_runtime.ts`, `scheduler_debug_stats.ts`.
   - לוודא ש־debug stats לא משפיע על hotpath.
   - לוודא ש־forceBuild/immediate/debounced לא יוצרים rebuild כפול.
2. Render follow-through:
   - לוודא שכל caller עובר דרך:
     - `runtime/platform_access_ops.ts`
     - `runtime/builder_service_access_build.ts`
   - לא להשאיר direct trigger + ensure render כפול.
3. Cache:
   - לבדוק:
     - `platform/cache_pruning_shared.ts`
     - `runtime/cache_access.ts`
     - `platform/three_geometry_cache_patch_*`
   - להגדיר invalidation לפי feature.
4. Canvas hover:
   - לשמור hit record cache.
   - throttling דרך RAF, לא setTimeout אקראי.
5. CSS:
   - להחליף `transition: all` במאפיינים ספציפיים.
   - להפחית `box-shadow` באזורים עם הרבה nodes.
   - לבדוק `z-index` map.
6. Perf budgets:
   - לעדכן רק אחרי שיפור אמיתי.
   - לא להגדיל budget כדי להסתיר רגרסיה.

### קבצים

- `esm/native/builder/scheduler_shared.ts`
- `esm/native/builder/scheduler_runtime.ts`
- `esm/native/builder/scheduler_debug_stats.ts`
- `esm/native/runtime/platform_access_ops.ts`
- `esm/native/runtime/builder_service_access_build.ts`
- `esm/native/platform/cache_pruning_shared.ts`
- `esm/native/runtime/cache_access.ts`
- `esm/native/platform/three_geometry_cache_patch_*`
- `esm/native/services/canvas_picking_*`
- `css/react_styles.css`
- `tools/wp_perf_smoke.mjs`
- `tools/wp_browser_perf_smoke.mjs`
- `docs/PERF_AND_STABILITY_BASELINE.md`

### בדיקות

- `npm run perf:smoke`
- `npm run perf:browser`
- `npm run e2e:smoke`
- `tests/perf_runtime_surface_runtime.test.ts`
- `tests/wp_browser_perf_support_runtime.test.js`

---

## שלב 11 - Type hardening וסגירת surfaces רחבים

**מטרה:** להפוך את החוזים לקשיחים יותר בלי להוסיף casts או wrappers.

### מצב נוכחי

הקוד כבר טוב מאוד מבחינת `any`: נמצאו מעט מאוד מופעים אמיתיים. אבל יש הרבה `unknown` ו־surfaces רחבים. זה לא בהכרח רע, אבל צריך לוודא שזה קורה רק בגבולות אמיתיים.

### משימות

1. להסיר `as any` מ־Cloud Sync.
2. להחליף UnknownRecord רחב ב־types ממוקדים במסלולים:
   - builder context
   - project config
   - modules configuration
   - order pdf state
   - runtime status
3. לצמצם public surfaces:
   - `runtime/perf_runtime_surface.ts`
   - `services/models.ts`
   - `kernel/domain_api_surface_sections_shared.ts`
4. לשים type tests:
   - חוזה של surfaces.
   - אסור export פנימי בטעות.
5. לוודא strict lanes:
   - `typecheck:strict-runtime`
   - `typecheck:strict-services`
   - `typecheck:strict-kernel`
   - `typecheck:strict-platform`
   - `typecheck:strict-ui`
   - `typecheck:strict-adapters-browser`

### קבצים

- `types/*.ts`
- `esm/native/runtime/perf_runtime_surface.ts`
- `esm/native/services/models.ts`
- `esm/native/kernel/domain_api_surface_sections_shared.ts`
- `esm/native/services/cloud_sync_lifecycle_bindings.ts`
- `tools/wp_typecheck_*`

---

## שלב 12 - Test portfolio modernization

**מטרה:** לוודא שהבדיקות משרתות את הארכיטקטורה החדשה ולא מקבעות קוד ישן.

### משימות

1. לסווג בדיקות:
   - contract tests
   - runtime unit tests
   - integration tests
   - e2e smoke
   - perf smoke
   - legacy migration tests
2. לסמן בדיקות legacy במפורש:
   - שם הקובץ או describe צריך להגיד migration/import, לא runtime.
3. לעדכן בדיקות מיושנות כשמקשיחים קוד:
   - אם בדיקה מצפה fallback runtime ישן - לעדכן.
   - אם בדיקה מצפה public shim ישן - לעדכן.
4. להוסיף בדיקות למסלולי משתמש אמיתיים:
   - door split/remove authoring
   - groove authoring
   - drawer divider/placement
   - mirror inside/outside authoring
   - save/load payload parity
5. להוסיף בדיקות נגד "חזרה אחורה":
   - no new legacy fallback.
   - no raw innerHTML.
   - no direct localStorage outside owner.
   - no deep feature imports if contract הוגדר.
   - no direct platform render follow-through duplicates.

### קבצים

- `tests/*`
- `tests/e2e/user_paths.spec.ts`
- `tests/e2e/helpers/project_flows.ts`
- `tests/e2e/helpers/cabinet_door_drawer_layout_fixture.js`
- `tools/wp_run_tsx_tests.mjs`
- `tools/wp_verify_lane_catalog.js`
- `docs/TEST_PORTFOLIO_GUIDELINES.md`

### Definition of Done

- בדיקה ישנה לא מונעת שדרוג נכון.
- כל legacy compatibility test מבודד ל־migration/import.
- כל שינוי משמעותי מקבל test שמגן על הכיוון החדש.

---

## שלב 13 - Documentation closeout

**מטרה:** שהקוד, הבדיקות והמסמכים יגידו אותו דבר. בלי מסמכי סגירה ישנים שמטעים את המפתח הבא.

### משימות

1. לעדכן:
   - `docs/dev_guide.md`
   - `docs/ARCHITECTURE_OWNERSHIP_MAP.md`
   - `docs/layering_completion_audit.md`
   - `docs/REFACTOR_FINISH_LINE_PLAN.md`
2. להוסיף:
   - `docs/LEGACY_FALLBACK_AUDIT.md`
   - `docs/RUNTIME_SELECTOR_POLICY.md`
   - `docs/UI_DESIGN_SYSTEM_PLAN.md`
   - `docs/PERF_HOTPATH_POLICY.md`
3. למחוק/להעביר לארכיון מסמכים שלא משקפים מצב נוכחי.
4. לוודא שכל closeout stage חדש מכיל:
   - goal
   - files changed
   - tests run
   - new guardrails
   - known remaining debt

---

## 5. סדר עדיפויות מעשי

### P0 - לפני כל רפקטור עמוק

1. תיקון `check:script-duplicates`.
2. יצירת `wp_legacy_fallback_audit`.
3. יצירת דוח fallback ראשוני.
4. הגדרת policy: migration boundary מול runtime.
5. הוספת guard מינימלי שלא ייכנס fallback חדש ללא allowlist.

### P1 - ניקוי ארכיטקטורי עיקרי

1. `ui.raw/config/runtime` selectors hardening.
2. העברת compatibility ל־project migration.
3. BuildContext-only enforcement.
4. ניקוי builder deps/fail-fast.
5. canvas hover/commit identity parity.

### P2 - תחזוקה וביצועים

1. CSS design system.
2. Order PDF/Notes HTML sink policy.
3. Cloud Sync race/timer hardening.
4. Render/build performance.
5. Type surfaces slimming.

### P3 - סגירת מוצר לטווח ארוך

1. E2E journey expansion.
2. perf budgets למסלולים אמיתיים.
3. docs closeout.
4. cleanup של מסמכי archive / upgrade notes.

---

## 6. רשימת "לא לעשות"

- לא להוסיף fallback חדש כדי להעביר בדיקה ישנה.
- לא להחזיר `window.App`/`globalThis`/`THREE global`.
- לא להחזיר DOM snapshot כ־source of truth.
- לא לעשות `try/catch {}` סביב בעיית deps שצריכה להיכשל.
- לא להכניס `as any` כדי להעלים שגיאת type.
- לא להכניס CSS `!important` חדש בלי סיבה ותוכנית הסרה.
- לא להגדיל perf budget במקום לתקן רגרסיה.
- לא להוסיף public API רחב כדי לחסוך import נכון.
- לא לערבב migration compatibility עם runtime normalizer.
- לא לשנות tests לפני שמבינים אם הם שומרים ארכיטקטורה חדשה או legacy ישן.

---

## 7. Verification matrix מומלץ לכל שלב

| שלב               | בדיקות מינימום                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Tooling/gates     | `npm run check:script-duplicates`, `npm run perf:smoke`, `npm run test:perf-toolchain-core`      |
| Runtime selectors | `typecheck:strict-runtime`, `test:runtime-access-surfaces`, `test:state-config-kernel-surfaces`  |
| Project migration | `test:project-surfaces`, `project_io_*`, save/load payload parity                                |
| Builder           | `typecheck:builder`, `test:builder-surfaces`, `test:door-build-surfaces`, `test:render-surfaces` |
| UI tabs/CSS       | `typecheck:strict-ui`, `test:tab-surfaces`, relevant runtime tests                               |
| Canvas            | `test:canvas-interaction-surfaces`, `test:canvas-surfaces`, `test:sketch-surfaces`               |
| Order PDF/Notes   | `test:order-pdf-surfaces`, `test:overlay-export-family-runtime`, notes tests                     |
| Cloud Sync        | `test:cloud-sync-family-contracts`, `test:cloud-sync-surfaces`                                   |
| Full confidence   | `npm run gate`, `npm run verify:gate:no-bundle`, `npm run e2e:smoke`, `npm run perf:browser`     |

---

## 8. סדר פתיחת PRים מומלץ

### PR 1 - Toolchain truthfulness

- תקן duplicate scripts.
- עדכן docs.
- הוסף/תקן test לכלי.
- אין שינוי מוצר.

### PR 2 - Legacy fallback audit

- הוסף audit + allowlist.
- דוח מלא.
- אין שינוי behavior עדיין.

### PR 3 - Project migration boundary

- העבר compatibility ראשון ל־`io/project_migrations`.
- השאר runtime behavior עם adapter זמני מתועד אם חייבים.
- tests של import ישן + runtime canonical.

### PR 4 - Runtime selectors hardening

- הקשחה הדרגתית של `ui_raw/config/runtime`.
- הסרת fallback runtime ראשון.
- עדכון tests ישנים.

### PR 5 - Builder context cleanup

- חתימות ctx-only.
- deps fail-fast.
- הסרת args רחבים.

### PR 6 - Canvas hover/commit identity

- unified hit record.
- בדיקות mirror/split/removed/sketch.

### PR 7 - UI button system + CSS debt

- primitives לכפתורים.
- refactor של tabs קריטיים.
- הפחתת `!important`.

### PR 8 - Order PDF/Notes sink policy

- raw innerHTML audit.
- listener cleanup tests.

### PR 9 - Cloud Sync hardening

- הסרת `as any`.
- race/timer tests.
- status publication proof.

### PR 10 - Perf closeout

- render/build/hover/export/cloud budgets.
- update baseline רק אחרי מדידה אמיתית.

---

## 9. קבצים שצריך לפתוח בתחילת השלב הבא

אם ממשיכים מהמסמך הזה לשלב ביצוע, לפתוח קודם את אלה:

1. `package.json`
2. `tools/wp_script_duplicate_audit.mjs`
3. `docs/SCRIPT_DUPLICATE_AUDIT.md`
4. `docs/dev_guide.md`
5. `docs/ARCHITECTURE_OWNERSHIP_MAP.md`
6. `esm/native/runtime/ui_raw_selectors.ts`
7. `esm/native/runtime/config_selectors_readers.ts`
8. `esm/native/runtime/runtime_selectors.ts`
9. `esm/native/builder/build_state_resolver.ts`
10. `esm/native/builder/build_wardrobe_flow_context_setup.ts`
11. `esm/native/services/canvas_picking_*`
12. `css/react_styles.css`
13. `esm/native/ui/react/tabs/StructureTab.view.tsx`
14. `esm/native/ui/react/tabs/InteriorTab.view.tsx`
15. `esm/native/services/cloud_sync_lifecycle_bindings.ts`
16. `tools/wp_verify_flow.js`
17. `tools/wp_typecheck_state.js`
18. `tests/wp_toolchain_family_contracts.test.js`

---

## 10. סיכום החלטה

הכיוון המקצועי הנכון הוא לא "עוד תיקוני באגים" אלא סגירת שכבות:

1. קודם להפוך את כלי הבקרה לאמינים.
2. אחר כך למפות fallbacks.
3. אחר כך להעביר compatibility לגבול migration.
4. אחר כך להקשיח runtime/builder/UI.
5. לבסוף לסגור ביצועים ו־E2E.

בצורה הזאת אפשר לעשות התקדמות גדולה מאוד בלי להרוס תיקונים שכבר נעשו ובלי להחזיר את הקוד לתקופת legacy. זה גם ישאיר בסיס נקי, מהיר ויציב להוספת פיצ'רים עתידיים.
