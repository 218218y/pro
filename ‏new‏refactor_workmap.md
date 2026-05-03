בדקתי את ה־ZIP בפועל. המצב הכללי טוב: יש ארכיטקטורה מודרנית יחסית, הרבה guardrails, הרבה בדיקות, ואין סימן מיידי לנסיגה חמורה ל־`window.App` / `globalThis.App` / `window.THREE`. אבל כדי להגיע ל“רפקטור מקצועי לגמרי” — לא רק “הבדיקות ירוקות” — יש עוד כמה שלבים חשובים.

להלן מפת העבודה שאני מציע לפעול לפיה בשלבים הבאים.

---

# מפת עבודה להשלמת רפקטור מקצועי, נקי ויציב

## מצב נוכחי בקצרה

מהסריקה הנוכחית:

* `check:script-duplicates` נקי: **0 כפילויות scripts**.
* `wp_refactor_closeout_audit` עבר.
* `wp_refactor_integration_audit` עבר.
* `features-public-api` נקי: **22 public entries**, כ־**259 import sites**.
* `type-hardening` נקי: **0 `as any` casts** ב־`esm/types`.
* יש עדיין **925 מופעי legacy/fallback מסווגים**, מתוכם **151 מוגדרים כ־legacy-runtime-risk**.
* נמצאו **2 מחזורי imports משמעותיים**:

  * מחזור גדול של **29 קבצים** סביב Order PDF / export / React PDF overlay.
  * מחזור של **18 קבצי types** תחת `types/`.
* מבחינת ביצועים, בדוח browser perf רואים שהבעיה המרכזית היא לא רק “קוד איטי”, אלא בעיקר:

  * selector fanout.
  * ריבוי commits.
  * build requests רבים במסלולי authoring.
  * מסלולי project restore / invalid import / persistence recovery ארוכים מדי.

כלומר: הפרויקט כבר עבר דרך ארוכה, אבל עכשיו צריך לסגור את הדברים שמבדילים בין “קוד עובד” לבין “קוד נקי, אחיד, קל לתחזוקה, ועמיד לשנה קדימה”.

---

# שלב 1 — ייצוב קו בסיס לפני שינוי גדול

לפני שמתחילים לגעת בקוד כבד, צריך לקבע קו בסיס מקצועי.

## פעולות

1. להריץ ולתעד כקו בסיס:

   * `npm run verify:refactor-modernization`
   * `npm run check:refactor-guardrails`
   * `npm run test:refactor-stage-guards`
   * smoke / perf לפי מה שזמין בסביבה.

2. להוסיף או לעדכן audit קטן עבור:

   * import cycles.
   * fan-in/fan-out חריגים.
   * legacy-runtime-risk budget.
   * CSS debt budget.
   * perf budget.

3. להחליט ש־“ירוק” לבד לא מספיק. כל שלב צריך להוכיח:

   * בעלות ברורה.
   * בדיקות התנהגותיות.
   * בלי fallback חדש.
   * בלי facade שמתחיל לצבור לוגיקה.
   * בלי תיקון מקומי שמסתיר בעיית שורש.

## תוצאה רצויה

בסוף שלב זה יש לנו baseline ברור, וכל שינוי עתידי נמדד מולו. בלי זה קל מאוד “לתקן” ולהכניס בלגן חדש באריזה מבריקה.

---

# שלב 2 — שבירת import cycles

זה אחד הדברים הכי חשובים עכשיו.

## 2.1 מחזור Order PDF / export / React overlay

כרגע יש מחזור גדול סביב:

* `esm/native/ui/export/export_order_pdf_*`
* `esm/native/ui/export_canvas.ts`
* `esm/native/ui/react/pdf/order_pdf_overlay_*`

הבעיה הארכיטקטונית: שכבת export טהורה יחסית תלויה בחלקים מתוך React overlay, ובמקביל React overlay קורא חזרה אל export. זה יוצר היברידיות: UI, state draft, text regions, annotations ו־export engine מעורבבים.

## כיוון תיקון

ליצור בעלות ניטרלית, לדוגמה:

```text
order_pdf/domain
order_pdf/draft
order_pdf/text_regions
order_pdf/annotations
order_pdf/export_engine
order_pdf/react_overlay
```

העיקרון:

* React overlay יכול להשתמש ב־domain/draft/text/annotations.
* Export engine יכול להשתמש ב־domain/draft/text/annotations.
* אבל export engine לא אמור לייבא React runtime.
* React runtime לא אמור להיות חלק מהלוגיקה הקנונית של PDF draft/export.

## תוצאה רצויה

* אפס import cycle סביב Order PDF.
* Export PDF הופך למסלול headless/testable.
* React overlay נשאר UI/controller בלבד.
* קל יותר להוסיף בעתיד export נוסף, Gmail draft, preview, או template חדש בלי לגעת בחצי פרויקט.

---

## 2.2 מחזור types

יש מחזור בין קבצי `types`, למשל סביב:

* `types/app.ts`
* `types/build.ts`
* `types/kernel.ts`
* `types/state.ts`
* `types/runtime.ts`
* `types/project.ts`

זה לא תמיד שובר runtime, אבל זה סימן שהטיפוסים הפכו ל־“סלט מרכזי”.

## כיוון תיקון

1. ליצור שכבת types בסיסית:

   * `types/core.ts`
   * `types/primitives.ts`
   * `types/domain.ts`
   * `types/store_contracts.ts`
   * `types/build_contracts.ts`

2. להפריד:

   * טיפוסי domain.
   * טיפוסי runtime.
   * טיפוסי app/container.
   * טיפוסי persistence/project.
   * טיפוסי builder.

3. להשתמש ב־`import type` בלבד איפה שזה באמת טיפוס.

## תוצאה רצויה

* אין cycles ב־types.
* קובץ טיפוסים לא מושך חצי מערכת.
* קל יותר להבין מי תלוי במי.
* פחות סיכון לשבור build בגלל שינוי טיפוס קטן.

---

# שלב 3 — ניקוי fallback / legacy בצורה מבוקרת

זה שלב קריטי. לא להסיר בעיניים עצומות, כי חלק מה־fallbacks הם ברירות מחדל לגיטימיות. אבל כן צריך לצמצם את `legacy-runtime-risk`.

כרגע יש:

* **925** מופעים מסווגים.
* **151** מופעים בקטגוריית `legacy-runtime-risk`.

## מוקדים ראשונים לבדיקה

לפי הסריקה, הקבצים שכדאי להתחיל מהם:

1. `esm/native/ui/export/export_canvas_engine.ts`
2. `esm/native/ui/react/notes/notes_overlay_text_style_runtime.ts`
3. `esm/native/runtime/cache_access.ts`
4. `esm/native/ui/notes_export_render_runtime.ts`
5. `esm/native/ui/notes_export_render_transform.ts`
6. `esm/native/platform/platform.ts`
7. `esm/native/features/door_style_overrides.ts`
8. `esm/native/features/modules_configuration/calc_module_structure.ts`
9. `esm/native/services/config_compounds.ts`
10. `esm/native/services/scene_view.ts`

## עיקרון העבודה

כל fallback צריך לקבל אחת מארבע החלטות:

| סוג                   | החלטה                                            |
| --------------------- | ------------------------------------------------ |
| ברירת מחדל אמיתית     | להשאיר, אבל לקרוא לה default ולא legacy fallback |
| תאימות project import | להעביר ל־project migration / ingress בלבד        |
| תאימות browser/env    | להשאיר רק ב־adapter boundary                     |
| legacy runtime חי     | להסיר או להחליף ב־canonical path                 |

## חשוב במיוחד

מסלולי runtime/build חיים לא צריכים לקרוא צורות ישנות. הצורות הישנות צריכות לעבור מיגרציה פעם אחת בכניסה:

```text
old persisted project
-> migration/normalization
-> canonical state
-> runtime/build reads canonical only
```

לא:

```text
runtime path
-> maybe canonical
-> maybe old field
-> maybe fallback
-> maybe App bag
```

זה בדיוק הסוג של היברידיות שגורם לבאגים קשים.

---

# שלב 4 — חיזוק SSOT: state/config/ui.raw/runtime

יש כבר כיוון נכון בקוד, במיוחד סביב canonical readers, אבל עדיין צריך לסגור את זה יותר חזק.

## נקודות עבודה

1. להפריד לחלוטין בין:

   * canonical runtime readers.
   * migration readers.
   * default value helpers.

2. קבצים כמו:

   * `config_selectors_readers.ts`
   * `runtime_selectors_normalizers.ts`
   * `ui_raw_selectors_*`

   צריכים להיות ברורים מאוד: האם הם runtime canonical או migration tolerant.

3. כל reader עם הערה כמו “supports legacy string values” צריך להיבדק:

   * אם זה live runtime — כנראה להעביר למיגרציה.
   * אם זה import compatibility — להשאיר שם בלבד.
   * אם זה UI input coercion — לקרוא לזה coercion ולא legacy.

## תוצאה רצויה

* runtime/build קוראים state קנוני בלבד.
* fallback ישן לא זולג למסלול חי.
* פרויקט ישן נטען? כן, אבל מתנרמל בכניסה.
* אחרי load, אין “אולי השדה פה ואולי שם”.

---

# שלב 5 — ניקוי facades ו־public API

יש הרבה facades וזה לא בהכרח רע. בפרויקט גדול זה אפילו טוב. אבל צריך לוודא שהם לא הופכים ל־god files חדשים.

## קבצים עם fan-in גבוה שכדאי לבדוק בזהירות

* `esm/native/runtime/record.ts`
* `esm/native/services/api.ts`
* `esm/native/runtime/api.ts`
* `esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts`
* `esm/native/runtime/render_access.ts`
* `esm/native/runtime/builder_service_access.ts`
* `esm/native/runtime/platform_access.ts`
* `esm/native/services/canvas_picking_engine.ts`
* `esm/native/services/cloud_sync_support.ts`

## כלל עבודה

Facade טוב:

* מייצא API ציבורי.
* דק.
* בלי state פנימי כבד.
* בלי side effects.
* בלי fallback chains.
* בלי business logic.

Facade רע:

* “רק עוד helper קטן”.
* מתחיל לייבא מכל מקום.
* הופך למקום שבו כל הבעיות נפתרות זמנית.
* מסתיר ownership לא ברור.

## תוצאה רצויה

כל public seam נשאר קטן וברור. אם יש לוגיקה — היא עוברת לבעלים פנימי ממוקד.

---

# שלב 6 — שיפור ביצועים בלי לפגוע באיכות

הכיוון המרכזי לשיפור ביצועים הוא לא “לזרוק memoization בכל מקום”, אלא לטפל במקורות הרעש.

## ממצאים עיקריים מה־browser perf

מסלולים כבדים:

* `project.restore-last-session.missing-autosave` סביב 17 שניות.
* `project.persistence-recovery.burst` סביב 15 שניות.
* `cabinet-core.mixed-edit-burst` סביב 11 שניות.
* `cabinet-door-drawer-authoring.mode-burst` סביב 10 שניות.
* `cabinet-build-variants.structure-material-door-burst` סביב 9 שניות.

האבחון המרכזי בדוח: **selector fanout**.

## נקודות שיפור ביצועים

### 6.1 Store commits

לבדוק:

* האם פעולות UI יוצרות כמה commits כשאפשר commit אחד.
* האם patch שלא משנה ערך עדיין גורם notify.
* האם `ui+config` נכתב יחד במקומות שיכולים להתפצל או להתאחד בצורה נכונה יותר.
* האם selector notifications רחבות מדי.

### 6.2 Selector fanout

להקטין rerenders על ידי:

* selectors צרים יותר.
* stable references.
* batch updates למסלולי burst.
* הפרדה בין state שצריך build לבין state UI-only.
* מניעת notify כשאין שינוי סמנטי אמיתי.

### 6.3 Builder scheduling

כרגע בדוחות רואים הרבה:

```text
requests ~= executes
```

זה אומר שהרבה בקשות build באמת מתבצעות, ולא תמיד מתאחדות.

צריך לבדוק:

* אילו actions יכולות להתאחד בתוך burst.
* איפה debounce מותר ואיפה אסור.
* איפה action הוא UI-only ולא צריך build.
* האם project load מפעיל build יותר מפעם אחת.
* האם שינוי צבע/טקסטורה/דלת גורם יותר עבודה ממה שצריך.

### 6.4 Render/material caching

מקומות פוטנציאליים:

* geometry/material creation.
* Three.js object traversal.
* text/measurement labels.
* PDF/image capture.
* notes export render.
* scene lighting renderer.

אבל לא לעשות caching עיוור. כל cache צריך:

* key ברור.
* invalidation ברור.
* בדיקה שמוכיחה שאין stale visual state.

---

# שלב 7 — Project IO / autosave / cloud sync

המסלולים האלה רגישים מאוד. הם צריכים להיות יציבים יותר ממה שהם מהירים.

## נקודות עבודה

1. לוודא שכל save/load/restore מחזיר outcome ברור:

   * dispatched
   * pending
   * ok
   * failed
   * recovered

2. בדוח perf יש `project.save.dispatched` עם pending שלא נראה סגור מספיק טוב. ייתכן שזה רק instrumentation, אבל צריך לוודא שאין מצב שבו save “נשלח” אבל אין signal נקי שהוא הסתיים.

3. invalid import צריך להיכשל מהר:

   * בלי build מיותר.
   * בלי restore מיותר.
   * בלי state mutation חלקי.

4. restore missing autosave לא אמור להיות מסלול של 17 שניות אם אין מה לשחזר. צריך לבדוק אם יש timeout/cleanup/attempt sequence יקר מדי.

5. cloud sync:

   * singleflight.
   * cleanup timers.
   * no stale queued work.
   * no push/pull race.
   * no UI ownership inside service lifecycle.

## תוצאה רצויה

מסלולי project/sync לא רק עוברים בדיקות, אלא ניתנים לאבחון ברור כשמשהו נכשל.

---

# שלב 8 — React UI ו־CSS debt

ה־CSS audit עבר, אבל המספרים מראים שיש חוב עיצובי:

* `!important`: כ־141
* `transition: all`: כ־22
* `z-index`: כ־52
* `box-shadow`: כ־116

זה לא בהכרח באג, אבל זה סימן שצריך סטנדרט אחיד יותר.

## נקודות עבודה

1. להפוך CSS tokens למקור אמת:

   * spacing
   * shadow
   * z-index layers
   * transitions
   * colors

2. לצמצם `!important` רק למקומות עם הצדקה אמיתית.

3. להחליף `transition: all` ל־properties מדויקים.

4. לוודא שכל controls שחוזרים על עצמם משתמשים בפרימיטיבים קיימים:

   * `OptionButton`
   * `OptionButtonGroup`
   * `ColorSwatch`
   * `ColorSwatchItem`

5. לבדוק במיוחד:

   * tabs.
   * overlay feedback.
   * notes overlay.
   * Order PDF overlay.
   * cloud sync panel.

## תוצאה רצויה

UI אחיד, פחות CSS מלחמות, ופחות באגים של “למה הכפתור הזה מתנהג אחרת”.

---

# שלב 9 — Order PDF כתחום עצמאי

מעבר לשבירת המחזור, Order PDF צריך להפוך למודול עם שכבות ברורות.

## מבנה רצוי

```text
order_pdf/
  domain/
  draft/
  text/
  annotations/
  template/
  export/
  react/
  gmail/
```

## עקרונות

* draft normalization לא תלוי ב־React.
* text regions לא תלויות ב־overlay runtime.
* annotations הן domain/model, לא React state בלבד.
* export engine לא מייבא UI.
* Gmail draft הוא adapter/operation, לא חלק מליבת PDF.

## בדיקות נדרשות

* draft normalization.
* text region merge.
* annotation persistence.
* export output contract.
* open/close/reopen lifecycle.
* invalid template / missing asset.
* Gmail draft failure non-fatal.

---

# שלב 10 — Canvas picking / hit identity / authoring

יש כבר הרבה guards טובים סביב canvas picking, וזה מצוין. השלב הבא הוא לוודא שאין כפילות סמויה בין hover/click/commit.

## נקודות עבודה

1. לוודא שכל hover target ו־click target עוברים דרך אותו canonical identity.
2. למחוק שדות legacy כמו `moduleKey` / `isBottom` ממסלולי commit אם כבר יש `hostModuleKey` / `hostIsBottom`.
3. לוודא ש־manual layout / sketch / split / mirror / paint לא ממציאים זהות מחדש.
4. להוסיף בדיקות מסע מלאות:

   * hover
   * preview
   * click
   * commit
   * save
   * reload
   * re-hover

## תוצאה רצויה

אין מצב שבו hover מראה דבר אחד ו־click משנה דבר אחר. זה אחד מסוגי הבאגים הכי מעצבנים למשתמשים.

---

# שלב 11 — Data/model cleanup

`preset_models_data.ts` הוא קובץ גדול יחסית. זה לא בהכרח רע, כי data יכול להיות גדול, אבל צריך לוודא שאין שם לוגיקה מעורבת.

## נקודות עבודה

1. להפריד data גולמי מלוגיקת normalization.
2. לשקול generator או JSON-like source אם הנתונים ממש גדלים.
3. לוודא שאין כפילות keys / aliases.
4. לוודא שכל preset עובר validation אחיד.
5. להוסיף בדיקת contract:

   * כל preset נטען.
   * כל preset מנורמל.
   * אין keys כפולים.
   * אין שדות deprecated במסלול canonical.

---

# שלב 12 — בדיקות: לא רק כמות, אלא איכות

יש הרבה בדיקות — וזה טוב. אבל אחרי רפקטור גדול צריך לוודא שהבדיקות לא מקבעות מבנים ישנים.

## מצב נוכחי

בהרצה הנוכחית של audit:

* כ־981 test files.
* כ־471 references מ־package scripts.
* הרבה contract/integration coverage.
* legacy tests מסווגים.

## נקודות עבודה

1. בדיקות שמצפות legacy fallback במסלול runtime — לעדכן אחרי תיקון הקוד.
2. להעדיף behavior tests על פני “הקובץ הזה חייב לייצא בדיוק כך”.
3. לשמור contract tests רק לגבולות ציבוריים אמיתיים.
4. להוסיף בדיקות שמונעות חזרה:

   * no import cycles.
   * no runtime legacy fallback growth.
   * no React import inside export engine.
   * no migration reader inside live builder path.
   * no broad selector notify on no-op patch.

---

# סדר עדיפויות מומלץ

## עדיפות 1 — הכי חשוב

1. לשבור import cycles:

   * Order PDF/export/React.
   * `types/`.

2. לצמצם `legacy-runtime-risk`:

   * להתחיל מ־10 הקבצים עם הכי הרבה risk.
   * להעביר compatibility ל־project ingress/migrations.

3. לחזק canonical runtime path:

   * `ui.raw`
   * `config`
   * `runtime`
   * `project load`

אלה הדברים שהכי משפיעים על יציבות ותחזוקה.

---

## עדיפות 2 — ביצועים ו־store pressure

1. לטפל ב־selector fanout.
2. לצמצם commits מיותרים.
3. לאחד build requests בבורסטים.
4. לשפר project restore / invalid import / save outcome.
5. להוסיף perf guard יותר חד למסלולי authoring.

---

## עדיפות 3 — UI/CSS ו־DX

1. לצמצם CSS debt.
2. לאחד controls.
3. לנקות facades רחבים.
4. לעדכן docs רק במקומות חיים, לא לייצר עוד “בית קברות של מסמכים”.

---

# מה לא לעשות

חשוב לא פחות.

* לא לפצל קבצים רק בגלל שהם גדולים.
* לא להסיר fallback בלי להבין אם הוא default, migration, browser adapter או legacy חי.
* לא לעדכן בדיקה ישנה כדי שתעבור לפני שמתקנים את הארכיטקטורה.
* לא להוסיף facade חדש כדי לברוח מ־cycle.
* לא להכניס caching בלי invalidation ברור.
* לא להוסיף debounce כללי שיסתיר race או יפגע בחוויית משתמש.
* לא לתקן symptoms בעשרה callers במקום לתקן owner אחד.

---

# Definition of Done לרפקטור הסופי

הרפקטור ייחשב מקצועי באמת כשיתקיימו הדברים האלה:

1. אין import cycles משמעותיים ב־`esm/types`.
2. Order PDF מופרד ל־domain/export/react בלי תלות הפוכה.
3. `legacy-runtime-risk` יורד משמעותית, והנותרים מתועדים עם owner וסיבה.
4. live runtime/build קוראים canonical state בלבד.
5. project migrations הן המקום היחיד לצורות ישנות.
6. store commits ו־selector notifications יורדים במסלולי authoring כבדים.
7. project save/load/restore נותנים outcome ברור וסגור.
8. CSS debt תחת budget ברור.
9. facades ציבוריים נשארים דקים.
10. הבדיקות מוכיחות behavior, לא משמרות קוד ישן בטעות.

---

# ההמלצה שלי לשלב הבא בפועל

הצעד הבא הכי נכון הוא **שלב גדול אבל ממוקד**:

## “Architecture Closeout Phase 1”

בתוכו לבצע:

1. הוספת dependency-cycle audit.
2. שבירת מחזור `types`.
3. התחלת פירוק מחזור Order PDF על ידי חילוץ domain/draft/text/annotation contracts לשכבה ניטרלית.
4. סיווג וניקוי ראשון של legacy-runtime-risk ב־3–5 קבצים הכי בעייתיים.
5. הוספת guard שמונע חזרה של cycles ו־fallbacks למסלול runtime.

זה צעד עמוק, אבל לא מפוזר. הוא ייגע בשורש, לא בקוסמטיקה.
# Repository alignment update - 2026-05-03

This draft was checked against the live repository before implementation.

Current verified baseline:

- `node tools/wp_cycles.js esm --json`: 0 cycle groups.
- `node tools/wp_cycles.js types --json`: 0 cycle groups.
- `npm run check:legacy-fallbacks`: pass.
- `npm run check:refactor-closeout`: pass.
- `npm run check:docs-control-plane`: pass.

Plan correction:

- The import-cycle section in this draft is now a guardrail item, not an immediate code-splitting target.
- Do not start a new numbered refactor stage by default; Stage 80 is the active closeout baseline.
- Future upgrades should be selected only from a real bug, measured performance regression, missing behavior coverage, or a newly proven ownership seam that passes `docs/REFACTOR_NEXT_STAGE_PLAN.md`.
- The first professional implementation slice is to wire the existing `tools/wp_cycles.js` audit into the active refactor verification lane as `check:import-cycles`, covering both `esm` and `types`.
- The next completed hardening slice is `check:private-owner-imports`, a cross-family audit that protects registered facade/private-owner splits from direct private-owner imports.
- The refactor stage catalog now carries explicit metadata for completed Stages 74-80 and post-closeout guardrails, so future work can be audited by owner, guard, and verification lane instead of stage numbers alone.

---
