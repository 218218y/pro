import type { TabId } from '../../../../types';

/**
 * Search destinations are explicit UI contracts, not snapshots of whichever tab happens
 * to be mounted. The ID represents one logical option; aliases never create duplicate rows.
 */
export type SearchRevealStep = {
  selector: string;
  action: 'check' | 'press' | 'activate' | 'open';
  onlyIfTargetMissing?: boolean;
};

export type ViewerSearchDestination = {
  id: string;
  tab: TabId;
  label: string;
  selector: string;
  keywords: string;
  reveal: readonly SearchRevealStep[];
};

const check = (selector: string): SearchRevealStep => ({ selector, action: 'check' });
const press = (selector: string): SearchRevealStep => ({ selector, action: 'press' });
const activate = (selector: string): SearchRevealStep => ({ selector, action: 'activate' });
const activateFallback = (selector: string): SearchRevealStep => ({
  selector,
  action: 'activate',
  onlyIfTargetMissing: true,
});
const tid = (id: string): string => `[data-testid="${id}"]`;
const dim = (id: string): string => `[data-wp-active-id="${id}"]`;

const multi = [check(tid('design-multicolor-enabled-toggle'))];
const glass = [...multi, activate('[data-wp-search-special="glass_curtain"]')];
const mirror = [...multi, activate('[data-wp-search-special="mirror"]')];
const adhesiveBlack = [...multi, activateFallback('[data-wp-search-special="black_glass"]')];
const cell = [press(tid('structure-cell-dims-mode-button'))];
const hex = [...cell, press(tid('structure-cell-dims-hex-mode-button'))];
const stack = [press(tid('structure-stack-split-mode-button'))];
const separator = [...stack, press(tid('structure-stack-split-decorative-separator-button'))];
const corner = [check(tid('structure-corner-mode-toggle'))];
const chest = [check(tid('structure-chest-mode-toggle'))];
const commode = [...chest, press(tid('structure-chest-commode-button'))];
const library = [press(tid('structure-library-mode-button'))];
const groove = [check(tid('design-grooves-toggle'))];
const split = [check(tid('design-split-doors-toggle'))];
const remove = [check(tid('design-remove-doors-toggle'))];
const lighting = [check(tid('toggle-advanced-lighting'))];
const roomWall = [check(tid('settings-room-back-wall-toggle'))];
const baseLegs = [activate(tid('structure-base-type-legs'))];
const basePlinth = [activate(tid('structure-base-type-plinth'))];
const baseStage = [...baseLegs, activate(tid('structure-base-platform-stage'))];
const interiorGrid = [activate(tid('interior-layout-method-grid'))];
const interiorSketch = [activate(tid('interior-layout-method-sketch'))];

function item(
  tab: TabId,
  id: string,
  label: string,
  selector: string,
  keywords = '',
  reveal: readonly SearchRevealStep[] = []
): ViewerSearchDestination {
  return { tab, id, label, selector, keywords, reveal };
}

export const VIEWER_SEARCH_DESTINATIONS: readonly ViewerSearchDestination[] = [
  // מבנה: סוגי ארונות, מידות, חומרים, בסיסים ועריכה לפי תא
  item('structure', 'type-hinged', 'ארון פתיחה', tid('structure-type-hinged-button'), 'דלתות ציר'),
  item('structure', 'type-sliding', 'ארון הזזה', tid('structure-type-sliding-button'), 'דלתות הזזה'),
  item(
    'structure',
    'board-sandwich',
    'גוף סנדביץ׳',
    tid('structure-board-material-sandwich-button'),
    'חומר גוף'
  ),
  item(
    'structure',
    'board-melamine',
    'גוף מלמין',
    tid('structure-board-material-melamine-button'),
    'חומר גוף'
  ),
  item('structure', 'door-overlay', 'דלת חיצונית', tid('structure-door-mount-overlay-button'), 'התקנת דלת'),
  item('structure', 'door-inset', 'דלת שקועה', tid('structure-door-mount-inset-button'), 'התקנת דלת'),
  item('structure', 'frame-thickness', 'עובי מסגרת', tid('structure-frame-thickness-input')),
  item('structure', 'shelf-thickness', 'עובי מדפים', tid('structure-shelf-thickness-input')),
  item('structure', 'doors', 'מספר דלתות', dim('doors'), 'מידות ארון'),
  item('structure', 'width', 'רוחב ארון', dim('width'), 'מידות'),
  item('structure', 'height', 'גובה ארון', dim('height'), 'מידות'),
  item('structure', 'depth', 'עומק ארון', dim('depth'), 'מידות'),
  item('structure', 'base', 'סוג בסיס הארון', tid('structure-base-type-controls'), 'צוקל רגליים'),
  item('structure', 'plinth-height', 'גובה צוקל', '#wp-r-base-plinth-height', 'בסיס', basePlinth),
  item('structure', 'leg-platform', 'במת רגליים', '.wp-r-base-leg-platform-selector', 'בסיס במה', baseLegs),
  item(
    'structure',
    'leg-platform-side',
    'בליטת במה צדדית',
    '.wp-r-base-leg-platform-side-selector',
    'רגליים במה',
    baseStage
  ),
  item(
    'structure',
    'leg-style',
    'סוג רגליים',
    '.wp-r-base-leg-style-selector',
    'עגולות שפיץ מרובעות',
    baseLegs
  ),
  item('structure', 'leg-color', 'צבע רגליים', '.wp-r-base-leg-color-selector', 'ניקל שחור זהב', baseLegs),
  item('structure', 'leg-height', 'גובה רגליים', '#wp-r-base-leg-height', 'מידות בסיס', baseLegs),
  item('structure', 'leg-width', 'רוחב רגליים', '#wp-r-base-leg-width', 'מידות בסיס', baseLegs),
  item('structure', 'sliding-tracks', 'מסילות הזזה', '.wp-r-sliding-tracks-selector', 'שחור ניקל'),
  item('structure', 'structure-pattern', 'מבנה וחלוקת הדלתות', '.wp-r-structure-selector', 'חלוקה מבנה'),
  item('structure', 'single-door', 'מיקום דלת בודדת', '.wp-r-single-door-selector', 'ימין שמאל אמצע'),
  item(
    'structure',
    'hinge-direction',
    'כיוון פתיחת דלת',
    '[data-testid="structure-hinge-direction-toggle"]',
    'ציר'
  ),
  item(
    'structure',
    'cell-dims',
    'מידות מיוחדות לפי תא',
    tid('structure-cell-dims-mode-button'),
    'שינוי מידות'
  ),
  item(
    'structure',
    'cell-door-count',
    'מספר דלתות בתא',
    tid('structure-cell-dims-door-count-controls'),
    'דלת אחת שתי דלתות',
    cell
  ),
  item('structure', 'cell-width', 'רוחב תא', dim('cellDimsWidth'), 'מידות מיוחדות', cell),
  item('structure', 'cell-height', 'גובה תא', dim('cellDimsHeight'), 'מידות מיוחדות', cell),
  item('structure', 'cell-depth', 'עומק תא', dim('cellDimsDepth'), 'מידות מיוחדות', cell),
  item('structure', 'hex-cell', 'תא משושה', tid('structure-cell-dims-hex-mode-button'), 'תא פינה', cell),
  item('structure', 'hex-protrusion', 'בליטת תא משושה', dim('cellDimsHexProtrusion'), 'מידות', hex),
  item('structure', 'hex-door-width', 'רוחב דלת תא משושה', dim('cellDimsHexDoorWidth'), 'מידות', hex),
  item(
    'structure',
    'stack',
    'ארון על ארון – חלוקה עליון ותחתון',
    tid('structure-stack-split-mode-button'),
    'שתי קומות'
  ),
  item(
    'structure',
    'stack-separator',
    'הפרדה מעוצבת בין חלקי הארון',
    tid('structure-stack-split-decorative-separator-button'),
    'במה בליטה',
    stack
  ),
  item(
    'structure',
    'stack-separator-side',
    'בליטה צדדית של הפרדה',
    tid('structure-stack-split-section') + ' .wp-r-platform-overhang-fields',
    'במה',
    separator
  ),
  item(
    'structure',
    'stack-lower-height',
    'גובה ארון תחתון',
    dim('stackSplitLowerHeight'),
    'ארון על ארון',
    stack
  ),
  item(
    'structure',
    'stack-lower-depth',
    'עומק ארון תחתון',
    dim('stackSplitLowerDepth'),
    'ארון על ארון',
    stack
  ),
  item(
    'structure',
    'stack-lower-width',
    'רוחב ארון תחתון',
    dim('stackSplitLowerWidth'),
    'ארון על ארון',
    stack
  ),
  item(
    'structure',
    'stack-lower-doors',
    'דלתות ארון תחתון',
    dim('stackSplitLowerDoors'),
    'ארון על ארון',
    stack
  ),
  item('structure', 'corner', 'ארון פינתי', tid('structure-corner-mode-toggle'), 'פינה'),
  item('structure', 'corner-side', 'כיוון פינה', tid('structure-corner-side-button'), 'ימין שמאל', corner),
  item('structure', 'corner-doors', 'דלתות פינה', dim('cornerDoors'), 'ארון פינתי', corner),
  item('structure', 'corner-width', 'רוחב פינה', dim('cornerWidth'), 'ארון פינתי', corner),
  item('structure', 'corner-height', 'גובה פינה', dim('cornerHeight'), 'ארון פינתי', corner),
  item('structure', 'corner-depth', 'עומק פינה', dim('cornerDepth'), 'ארון פינתי', corner),
  item('structure', 'chest', 'מצב שידה', tid('structure-chest-mode-toggle'), 'מגירות שידה'),
  item('structure', 'chest-drawers', 'מספר מגירות שידה', dim('chestDrawersCount'), 'שידה', chest),
  item(
    'structure',
    'commode',
    'שידת מגירות ומראה',
    tid('structure-chest-commode-button'),
    'קומודה מראה',
    chest
  ),
  item(
    'structure',
    'commode-mirror-height',
    'גובה מראת שידה',
    dim('chestCommodeMirrorHeightCm'),
    'מראה קומודה',
    commode
  ),
  item(
    'structure',
    'commode-mirror-width',
    'רוחב מראת שידה',
    dim('chestCommodeMirrorWidthCm'),
    'מראה קומודה',
    commode
  ),
  item('structure', 'library', 'מצב ספריות', tid('structure-library-mode-button'), 'ספריה'),
  item(
    'structure',
    'library-upper-doors',
    'דלתות עליונות בספריה',
    tid('structure-library-upper-doors-button'),
    'הסר החזר',
    library
  ),
  item(
    'structure',
    'library-glass',
    'זכוכית לדלתות ספריה',
    tid('structure-library-glass-buttons'),
    'ספריות זכוכית וילון',
    library
  ),

  // עיצוב: צבע חזית, חריטות, חיתוך, מראה, זכוכית ווילון
  item('design', 'door-flat', 'דלת פוסט', tid('design-door-style-flat-button'), 'סגנון דלת'),
  item('design', 'door-profile', 'דלת פרופיל', tid('design-door-style-profile-button'), 'סגנון דלת'),
  item(
    'design',
    'door-double',
    'דלת פרופיל כפול',
    tid('design-door-style-double-profile-button'),
    'סגנון דלת'
  ),
  item('design', 'front-color', 'צבע חזית ראשי', tid('design-color-swatch-row'), 'צבע דלתות'),
  item(
    'design',
    'shelf-inherit',
    'צביעת מדפים וקנט קושרת',
    tid('design-front-color-shelf-mode-toggle'),
    'צבע חזית'
  ),
  item('design', 'custom-color', 'צבע מותאם אישית', tid('design-custom-color-toggle'), 'הוסף צבע'),
  item('design', 'texture', 'העלאת טקסטורה', tid('design-custom-texture-upload-button'), 'טקסטורה תמונה'),
  item(
    'design',
    'multicolor',
    'צביעה מתקדמת ותוספות',
    tid('design-multicolor-enabled-toggle'),
    'כל חלק בנפרד'
  ),
  item(
    'design',
    'special-materials',
    'מראה או זכוכית לדלתות',
    '.multi-special-section .multi-special-header',
    'מראה וזכוכית וילון',
    multi
  ),
  item('design', 'mirror', 'הוספת מראה לדלת', '[data-wp-search-special="mirror"]', 'מראה תוסף', multi),
  item(
    'design',
    'mirror-height',
    'גובה מראה',
    '[data-wp-search-card="mirror"] #wp-r-mirror-draft-height',
    'מידות מראה',
    mirror
  ),
  item(
    'design',
    'mirror-width',
    'רוחב מראה',
    '[data-wp-search-card="mirror"] #wp-r-mirror-draft-width',
    'מידות מראה',
    mirror
  ),
  item(
    'design',
    'glass-curtain',
    'דלת זכוכית עם וילון',
    '[data-wp-search-special="glass_curtain"]',
    'זכוכית וילון זכוכית וילונות',
    multi
  ),
  item(
    'design',
    'glass-style',
    'אפשרויות זכוכית: מלאה / פרופיל כפול',
    '.wp-r-design-glass-style-options',
    'זכוכית מלאה פרופיל',
    glass
  ),
  item('design', 'glass-flat', 'זכוכית מלאה', '[data-glass-style="flat"]', 'זכוכית פרופיל', glass),
  item(
    'design',
    'glass-double',
    'זכוכית פרופיל כפול',
    '[data-glass-style="double_profile"]',
    'זכוכית',
    glass
  ),
  item('design', 'curtain', 'בחירת צבע וילון', '.wp-r-design-curtain-options', 'זכוכית וילון', glass),
  item('design', 'curtain-white', 'וילון לבן', '[data-curtain="white"]', 'זכוכית וילון לבן', glass),
  item('design', 'curtain-pink', 'וילון ורוד', '[data-curtain="pink"]', 'זכוכית וילון ורוד', glass),
  item('design', 'curtain-purple', 'וילון סגול', '[data-curtain="purple"]', 'זכוכית וילון סגול', glass),
  item(
    'design',
    'black-glass',
    'זכוכית שחורה מודבקת',
    '[data-wp-search-special="black_glass"]',
    'מראה זכוכית',
    multi
  ),
  item(
    'design',
    'frosted-glass',
    'זכוכית חלבית מודבקת',
    '[data-wp-search-special="frosted_glass"]',
    'מראה זכוכית',
    multi
  ),
  item(
    'design',
    'glass-height',
    'גובה זכוכית מודבקת',
    '[data-wp-search-card="glass"] #wp-r-mirror-draft-height',
    'מידות זכוכית',
    adhesiveBlack
  ),
  item(
    'design',
    'glass-width',
    'רוחב זכוכית מודבקת',
    '[data-wp-search-card="glass"] #wp-r-mirror-draft-width',
    'מידות זכוכית',
    adhesiveBlack
  ),
  item(
    'design',
    'per-door-style',
    'סגנון חזית לדלתות ומגירות',
    '.wp-r-design-door-style-options',
    'פרופיל פוסט',
    multi
  ),
  item('design', 'grooves', 'חריטה CNC', tid('design-grooves-toggle'), 'חריטות'),
  item('design', 'groove-edit', 'עריכת חריטה', tid('design-groove-mode-button'), 'חריטת דלת', groove),
  item(
    'design',
    'groove-manual',
    'מידות חריטה ידנית',
    tid('design-groove-manual-button'),
    'גובה רוחב',
    groove
  ),
  item(
    'design',
    'groove-orientation',
    'כיוון חריטה',
    tid('design-groove-orientation-controls'),
    'עומדת שוכבת',
    groove
  ),
  item('design', 'groove-count', 'מספר חריטות', tid('design-groove-lines-input'), 'קווים', groove),
  item('design', 'split', 'דלתות חתוכות', tid('design-split-doors-toggle'), 'חיתוך דלתות split'),
  item('design', 'split-edit', 'חיתוך דלתות', tid('design-split-mode-button'), 'הוסף הסר', split),
  item('design', 'split-custom', 'חיתוך דלתות ידני', tid('design-split-custom-mode-button'), 'חיתוך', split),
  item('design', 'remove-doors', 'הסרת דלתות או דפנות', tid('design-remove-doors-toggle'), 'הסר דלת'),
  item(
    'design',
    'remove-door-mode',
    'עריכת הסרת דלת',
    tid('design-remove-door-mode-button'),
    'הסר החזר',
    remove
  ),
  item(
    'design',
    'design-cell-door-count',
    'שינוי מספר דלתות בתא',
    tid('design-cell-door-count-controls'),
    'דלתות',
    remove
  ),
  item(
    'design',
    'rounded-shelves',
    'מדפים צדדיים למסגרת מעוגלת',
    tid('design-rounded-frame-side-shelves-button'),
    'מסגרת'
  ),
  item('design', 'cornice', 'קרניז עליון – כתר', '[data-testid="design-cornice-toggle"]', 'תוספות גובה'),

  // פנים: חלוקה, מדפים, כלי סקיצה, מגירות וידיות
  item('interior', 'layout', 'חלוקת פנים', tid('interior-layout'), 'מדפים חלוקה'),
  item('interior', 'layout-presets', 'תבניות חלוקה', tid('interior-layout-method-presets'), 'תא'),
  item('interior', 'layout-grid', 'חלוקה לפי תאים', tid('interior-layout-method-grid'), 'רשת'),
  item('interior', 'layout-sketch', 'חלוקה לפי סקיצה', tid('interior-layout-method-sketch'), 'ציור'),
  item(
    'interior',
    'manual-shelves',
    'הוספת מדפים לפי תא',
    tid('interior-manual-tool-shelf-button'),
    'מדף',
    interiorGrid
  ),
  item(
    'interior',
    'manual-storage',
    'אוגר מצעים',
    tid('interior-manual-tool-storage-button'),
    'אחסון',
    interiorGrid
  ),
  item(
    'interior',
    'manual-rod',
    'מוט תלייה לפי תא',
    tid('interior-manual-tool-rod-button'),
    'מוט בגדים',
    interiorGrid
  ),
  item(
    'interior',
    'shelf-variants',
    'סוגי מדפים',
    '.wp-interior-layout-options[aria-label="סוג מדף"]',
    'מדף מחוזק',
    [...interiorGrid, activate(tid('interior-manual-tool-shelf-button'))]
  ),
  item(
    'interior',
    'shelf-boring',
    'חירור מלא',
    tid('interior-layout-full_boring'),
    'חורי מדף לפי סקיצה',
    interiorSketch
  ),
  item(
    'interior',
    'shelf-conversion',
    'מדף קושרת והמרת מדפים',
    tid('interior-manual-shelf-variant-brace-button'),
    'המרת מדף רגיל לקושרת לפי סקיצה',
    [...interiorSketch, activate(tid('interior-manual-tool-shelf-button'))]
  ),
  item(
    'interior',
    'external-drawers',
    'מגירות חיצוניות',
    tid('interior-external-drawers-card'),
    'מיקום מגירות'
  ),
  item(
    'interior',
    'external-sketch',
    'מגירות חיצוניות בסקיצה',
    tid('interior-external-drawers-sketch-button'),
    'שרטוט'
  ),
  item('interior', 'drawer-runners', 'מסילות למגירות', '.wp-r-external-drawer-runner', 'טריקה שקטה'),
  item('interior', 'internal-drawers', 'מגירות פנימיות', tid('interior-internal-drawers-card'), 'מיקום'),
  item(
    'interior',
    'internal-drawer-mode',
    'מיקום מגירות פנימיות',
    tid('interior-internal-drawers-mode-button'),
    'מגירות'
  ),
  item('interior', 'drawer-divider', 'מחיצה למגירה', '.wp-tool-card--divider', 'מחיצה'),
  item('interior', 'handles', 'ידיות לכל הארון', '.wp-tool-card--handles', 'ידית'),
  item(
    'interior',
    'advanced-handles',
    'ניהול ידיות מתקדם',
    '[data-testid="interior-advanced-handles-toggle"]',
    'ידית לפי דלת'
  ),

  // סקיצה חופשית וקופסאות
  item('sketch', 'sketch-main', 'כלי חלוקה לפי סקיצה', '.wp-sketch-row', 'חלוקה'),
  item(
    'sketch',
    'no-main',
    'ביטול או החזרת ארון ראשי',
    tid('sketch-no-main-wardrobe-toggle-button'),
    'סקיצה חופשית'
  ),
  item('sketch', 'box-dimensions', 'מידות מיוחדות לקופסא', tid('sketch-box-cell-dims-mode-button'), 'קופסא'),
  item('sketch', 'box-hex', 'קופסא משושה', tid('sketch-box-cell-dims-hex-mode-button'), 'קופסא פינה', [
    press(tid('sketch-box-cell-dims-mode-button')),
  ]),
  item('sketch', 'sketch-winter-brace', 'קושרת חורף', tid('winter-brace-combined-button'), 'קושרת מדף'),
  item('sketch', 'sketch-winter-shelf', 'מדף קושרת חורף', tid('winter-brace-shelf-button'), 'מדפים'),

  // הגדרות, ייצוא וסביבה
  item('settings', 'snapshot', 'צילום הדמיה', tid('export-snapshot-button'), 'תמונה ייצוא'),
  item('settings', 'copy', 'העתקת תמונה ללוח', tid('export-copy-button'), 'תמונה'),
  item('settings', 'render-sketch', 'ייצוא סקיצה והדמיה', tid('export-render-sketch-button'), 'תמונה'),
  item('settings', 'open-closed', 'ייצוא פתוח / סגור', tid('export-dual-image-button'), 'תמונה'),
  item('settings', 'pdf-open-close', 'PDF פתוח / סגור A4', tid('export-dual-image-a4-pdf-button'), 'ייצוא'),
  item('settings', 'pdf-sketch', 'PDF סקיצה / הדמיה A4', tid('export-render-sketch-a4-pdf-button'), 'ייצוא'),
  item('settings', 'pdf-editor', 'עורך PDF להזמנה', tid('export-open-pdf-button'), 'הזמנה'),
  item('settings', 'dark-mode', 'מצב כהה', tid('toggle-dark-mode'), 'תצוגה'),
  item('settings', 'dimensions-display', 'הצגת מידות', tid('toggle-show-dimensions'), 'תצוגה'),
  item('settings', 'real-mirror', 'מראה ממשית בהדמיה', tid('toggle-mirror-reflector'), 'מראה תצוגה'),
  item('settings', 'global-click', 'פתיחת כל הארון בלחיצה', tid('toggle-global-click'), 'תצוגה'),
  item('settings', 'light-control', 'מצבי תאורה מתקדמים', tid('toggle-advanced-lighting'), 'שמש תאורה'),
  item('settings', 'light-ambient', 'עוצמת אור סביבתי', '[name="lightAmb"]', 'תאורה', lighting),
  item('settings', 'light-sun', 'עוצמת שמש', '[name="lightDir"]', 'תאורה', lighting),
  item('settings', 'light-x', 'כיוון אור X', '[name="lightX"]', 'תאורה', lighting),
  item('settings', 'light-y', 'כיוון אור Y', '[name="lightY"]', 'תאורה', lighting),
  item('settings', 'light-z', 'כיוון אור Z', '[name="lightZ"]', 'תאורה', lighting),
  item('settings', 'room-architecture', 'הוספת קירות ואדריכלות', tid('settings-room-architecture'), 'חדר'),
  item('settings', 'room-openings', 'חלונות ודלתות בחדר', tid('settings-room-openings'), 'פתחים', roomWall),
  item('settings', 'room-window', 'הוספת חלון', tid('settings-room-opening-window'), 'קיר', roomWall),
  item('settings', 'room-door', 'הוספת דלת לחדר', tid('settings-room-opening-door'), 'קיר', roomWall),
  item('settings', 'cloud', 'סנכרון לענן', tid('cloud-sync-panel'), 'ענן פרויקטים'),
  item('settings', 'backup', 'גיבוי ושחזור', tid('settings-backup-panel'), 'יבוא ייצוא'),
  item('settings', 'backup-export', 'ייצוא גיבוי', tid('settings-backup-export-button'), 'הורדה'),
  item('settings', 'backup-import', 'ייבוא גיבוי', tid('settings-backup-import-button'), 'שחזור'),
];

const TAB_LABELS: Record<TabId, string> = {
  structure: 'מבנה',
  design: 'עיצוב',
  interior: 'פנים',
  sketch: 'סקיצה',
  settings: 'הגדרות',
};

export function viewerSearchTabLabel(tab: TabId): string {
  return TAB_LABELS[tab];
}

export function normalizeViewerSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, '')
    .replace(/[׳״'"`\-–—/(),:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findViewerSearchDestination(id: string): ViewerSearchDestination | undefined {
  return VIEWER_SEARCH_DESTINATIONS.find(item => item.id === id);
}

export function searchViewerDestinations(query: string, enabledTabs?: ReadonlySet<TabId>, limit = 12) {
  const normalized = normalizeViewerSearchText(query);
  const tokens = normalized.split(' ').filter(Boolean);
  const matches = VIEWER_SEARCH_DESTINATIONS.filter(entry => !enabledTabs || enabledTabs.has(entry.tab))
    .map(entry => {
      const name = normalizeViewerSearchText(entry.label);
      const text = normalizeViewerSearchText(`${entry.label} ${entry.keywords} ${TAB_LABELS[entry.tab]}`);
      if (tokens.length && !tokens.every(token => text.includes(token))) return null;
      const score = !tokens.length
        ? 0
        : name === normalized
          ? 4
          : name.startsWith(normalized)
            ? 3
            : name.includes(normalized)
              ? 2
              : 1;
      return { entry, score };
    })
    .filter((entry): entry is { entry: ViewerSearchDestination; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score);
  // A single logical ID can appear once, even if it matches several aliases.
  const seen = new Set<string>();
  return matches
    .filter(({ entry }) => (seen.has(entry.id) ? false : (seen.add(entry.id), true)))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function validateViewerSearchCatalog(): void {
  const ids = new Set<string>();
  for (const route of VIEWER_SEARCH_DESTINATIONS) {
    if (ids.has(route.id)) throw new Error(`Duplicate viewer search destination: ${route.id}`);
    if (!route.selector || !route.label) throw new Error(`Invalid viewer search destination: ${route.id}`);
    ids.add(route.id);
  }
}
