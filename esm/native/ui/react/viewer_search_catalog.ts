import type { TabId } from '../../../../types';
import { INTERIOR_LAYOUT_TYPES, INTERIOR_MANUAL_TOOLS } from './tabs/interior_tab_local_state_shared.js';
import { SHELF_VARIANT_OPTIONS } from './tabs/interior_layout_shelf_variant_options.js';
import {
  SKETCH_BOX_CONTROLS,
  sketchBoxControlTestId,
  type SketchBoxControlDefinition,
} from './tabs/sketch_box_control_catalog.js';

/**
 * Search destinations are explicit UI contracts, not snapshots of whichever tab happens
 * to be mounted. The ID represents one logical option; aliases never create duplicate rows.
 */
export type SearchRevealStep = {
  selector: string;
  action: 'check' | 'press' | 'activate' | 'expand';
  onlyIfTargetMissing?: boolean;
};

export type ViewerSearchContextKey =
  | 'main'
  | 'cabinet'
  | 'hinged'
  | 'sliding'
  | 'single-door'
  | 'hinge-direction'
  | 'removed-side'
  | 'chest-entry'
  | 'corner-entry'
  | 'dimensions'
  | 'wardrobe-dimensions'
  | 'structure-pattern'
  | 'drawer-runners'
  | 'not-chest';

type SearchMeaning = {
  /** Exact names for the option's own subject, rather than its surrounding context. */
  aliases?: readonly string[];
  importance?: 'primary' | 'secondary';
  requires?: readonly ViewerSearchContextKey[];
};

export type ViewerSearchDestination = SearchMeaning & {
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
const expand = (selector: string): SearchRevealStep => ({ selector, action: 'expand' });
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
const interiorPresets = [activate(tid('interior-layout-method-presets'))];
const interiorGrid = [activate(tid('interior-layout-method-grid'))];
const interiorSketch = [activate(tid('interior-layout-method-sketch'))];

function item(
  tab: TabId,
  id: string,
  label: string,
  selector: string,
  keywords = '',
  reveal: readonly SearchRevealStep[] = [],
  meaning: SearchMeaning = {}
): ViewerSearchDestination {
  return { tab, id, label, selector, keywords, reveal, ...meaning };
}

export const VIEWER_SEARCH_DESTINATIONS: readonly ViewerSearchDestination[] = [
  // מבנה: סוגי ארונות, מידות, חומרים, בסיסים ועריכה לפי תא
  item('structure', 'type-hinged', 'ארון פתיחה', tid('structure-type-hinged-button'), 'דלתות ציר', [], {
    aliases: ['ארון', 'פתיחה', 'ארון פתיחה'],
    importance: 'primary',
    requires: ['cabinet'],
  }),
  item('structure', 'type-sliding', 'ארון הזזה', tid('structure-type-sliding-button'), 'דלתות הזזה', [], {
    aliases: ['הזזה'],
    importance: 'primary',
    requires: ['cabinet'],
  }),
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
  item(
    'structure',
    'door-overlay',
    'דלת חיצונית',
    tid('structure-door-mount-overlay-button'),
    'התקנת דלת',
    [],
    { requires: ['hinged'] }
  ),
  item('structure', 'door-inset', 'דלת שקועה', tid('structure-door-mount-inset-button'), 'התקנת דלת', [], {
    requires: ['hinged'],
  }),
  item('structure', 'frame-thickness', 'עובי מסגרת', tid('structure-frame-thickness-input'), '', []),
  item('structure', 'shelf-thickness', 'עובי מדפים', tid('structure-shelf-thickness-input'), '', [], {
    requires: ['not-chest'],
  }),
  item('structure', 'doors', 'מספר דלתות', dim('doors'), 'מידות ארון', [], {
    requires: ['wardrobe-dimensions'],
  }),
  item('structure', 'width', 'רוחב ארון', dim('width'), 'מידות', [], { requires: ['dimensions'] }),
  item('structure', 'height', 'גובה ארון', dim('height'), 'מידות', [], { requires: ['dimensions'] }),
  item('structure', 'depth', 'עומק ארון', dim('depth'), 'מידות', [], { requires: ['dimensions'] }),
  item('structure', 'base', 'סוג בסיס הארון', tid('structure-base-type-controls'), 'צוקל רגליים', [], {
    aliases: ['רגליים', 'רגל', 'בסיס', 'צוקל'],
    importance: 'primary',
    requires: ['main'],
  }),
  item('structure', 'plinth-height', 'גובה צוקל', '#wp-r-base-plinth-height', 'בסיס', basePlinth, {
    requires: ['main'],
  }),
  item(
    'structure',
    'leg-platform',
    'במה לבסיס הארון',
    '.wp-r-base-leg-platform-selector',
    'במה בסיס רגליים',
    baseLegs,
    { aliases: ['במה'], importance: 'secondary', requires: ['main'] }
  ),
  item(
    'structure',
    'leg-platform-side',
    'בליטת במה צדדית',
    '.wp-r-base-leg-platform-side-selector',
    'רגליים במה',
    baseStage,
    { importance: 'secondary', requires: ['main'] }
  ),
  item(
    'structure',
    'leg-style',
    'סוג רגליים',
    '.wp-r-base-leg-style-selector',
    'עגולות שפיץ מרובעות',
    baseLegs,
    { aliases: ['סוג רגל', 'סוג רגליים'], importance: 'primary', requires: ['main'] }
  ),
  item('structure', 'leg-color', 'צבע רגליים', '.wp-r-base-leg-color-selector', 'ניקל שחור זהב', baseLegs, {
    requires: ['main'],
  }),
  item('structure', 'leg-height', 'גובה רגליים', '#wp-r-base-leg-height', 'מידות בסיס', baseLegs, {
    requires: ['main'],
  }),
  item('structure', 'leg-width', 'רוחב רגליים', '#wp-r-base-leg-width', 'מידות בסיס', baseLegs, {
    requires: ['main'],
  }),
  item('structure', 'sliding-tracks', 'מסילות הזזה', '.wp-r-sliding-tracks-selector', 'שחור ניקל', [], {
    requires: ['main', 'sliding'],
  }),
  item('structure', 'structure-pattern', 'מבנה וחלוקת הדלתות', '.wp-r-structure-selector', 'חלוקה מבנה', [], {
    requires: ['structure-pattern'],
  }),
  item('structure', 'single-door', 'מיקום דלת בודדת', '.wp-r-single-door-selector', 'ימין שמאל אמצע', [], {
    requires: ['single-door'],
  }),
  item(
    'structure',
    'hinge-direction',
    'כיוון פתיחת דלת',
    '[data-testid="structure-hinge-direction-toggle"]',
    'ציר',
    [],
    { requires: ['hinge-direction'] }
  ),
  item(
    'structure',
    'cell-dims',
    'מידות מיוחדות לפי תא',
    tid('structure-cell-dims-mode-button'),
    'שינוי מידות',
    [],
    { aliases: ['מידות מיוחדות'], importance: 'primary', requires: ['wardrobe-dimensions', 'hinged'] }
  ),
  item(
    'structure',
    'cell-door-count',
    'מספר דלתות בתא',
    tid('structure-cell-dims-door-count-controls'),
    'דלת אחת שתי דלתות',
    cell,
    { requires: ['wardrobe-dimensions', 'hinged'] }
  ),
  item('structure', 'cell-width', 'רוחב תא', dim('cellDimsWidth'), 'מידות מיוחדות', cell, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item('structure', 'cell-height', 'גובה תא', dim('cellDimsHeight'), 'מידות מיוחדות', cell, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item('structure', 'cell-depth', 'עומק תא', dim('cellDimsDepth'), 'מידות מיוחדות', cell, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item('structure', 'hex-cell', 'תא משושה', tid('structure-cell-dims-hex-mode-button'), 'תא פינה', cell, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item('structure', 'hex-protrusion', 'בליטת תא משושה', dim('cellDimsHexProtrusion'), 'מידות', hex, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item('structure', 'hex-door-width', 'רוחב דלת תא משושה', dim('cellDimsHexDoorWidth'), 'מידות', hex, {
    requires: ['wardrobe-dimensions', 'hinged'],
  }),
  item(
    'structure',
    'stack',
    'ארון על ארון – חלוקה עליון ותחתון',
    tid('structure-stack-split-mode-button'),
    'שתי קומות',
    [],
    { aliases: ['ארון על ארון', 'קומות'], importance: 'primary', requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-separator',
    'הפרדה מעוצבת בין חלקי הארון',
    tid('structure-stack-split-decorative-separator-button'),
    'במה בליטה',
    stack,
    { requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-separator-side',
    'בליטה צדדית של הפרדה',
    tid('structure-stack-split-section') + ' .wp-r-platform-overhang-fields',
    'במה',
    separator,
    { requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-lower-height',
    'גובה ארון תחתון',
    dim('stackSplitLowerHeight'),
    'ארון על ארון',
    stack,
    { requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-lower-depth',
    'עומק ארון תחתון',
    dim('stackSplitLowerDepth'),
    'ארון על ארון',
    stack,
    { requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-lower-width',
    'רוחב ארון תחתון',
    dim('stackSplitLowerWidth'),
    'ארון על ארון',
    stack,
    { requires: ['wardrobe-dimensions'] }
  ),
  item(
    'structure',
    'stack-lower-doors',
    'דלתות ארון תחתון',
    dim('stackSplitLowerDoors'),
    'ארון על ארון',
    stack,
    { requires: ['wardrobe-dimensions'] }
  ),
  item('structure', 'corner', 'ארון פינתי', tid('structure-corner-mode-toggle'), 'פינה', [], {
    aliases: ['פינה', 'פינתי', 'ארון פינה'],
    importance: 'primary',
    requires: ['corner-entry'],
  }),
  item('structure', 'corner-side', 'כיוון פינה', tid('structure-corner-side-button'), 'ימין שמאל', corner, {
    requires: ['corner-entry'],
  }),
  item('structure', 'corner-doors', 'דלתות פינה', dim('cornerDoors'), 'ארון פינתי', corner, {
    requires: ['corner-entry'],
  }),
  item('structure', 'corner-width', 'רוחב פינה', dim('cornerWidth'), 'ארון פינתי', corner, {
    requires: ['corner-entry'],
  }),
  item('structure', 'corner-height', 'גובה פינה', dim('cornerHeight'), 'ארון פינתי', corner, {
    requires: ['corner-entry'],
  }),
  item('structure', 'corner-depth', 'עומק פינה', dim('cornerDepth'), 'ארון פינתי', corner, {
    requires: ['corner-entry'],
  }),
  item('structure', 'chest', 'מצב שידה', tid('structure-chest-mode-toggle'), 'מגירות שידה', [], {
    aliases: ['שידה'],
    importance: 'primary',
    requires: ['chest-entry'],
  }),
  item('structure', 'chest-drawers', 'מספר מגירות שידה', dim('chestDrawersCount'), 'שידה', chest, {
    requires: ['chest-entry'],
  }),
  item(
    'structure',
    'commode',
    'שידת מגירות ומראה',
    tid('structure-chest-commode-button'),
    'קומודה מראה',
    chest,
    { aliases: ['קומודה'], importance: 'primary', requires: ['chest-entry'] }
  ),
  item(
    'structure',
    'commode-mirror-height',
    'גובה מראת שידה',
    dim('chestCommodeMirrorHeightCm'),
    'מראה קומודה',
    commode,
    { importance: 'secondary', requires: ['chest-entry'] }
  ),
  item(
    'structure',
    'commode-mirror-width',
    'רוחב מראת שידה',
    dim('chestCommodeMirrorWidthCm'),
    'מראה קומודה',
    commode,
    { importance: 'secondary', requires: ['chest-entry'] }
  ),
  item('structure', 'library', 'מצב ספריות', tid('structure-library-mode-button'), 'ספריה', [], {
    aliases: ['ספריה', 'ספרייה', 'ספריות'],
    importance: 'primary',
    requires: ['cabinet', 'hinged'],
  }),
  item(
    'structure',
    'library-upper-doors',
    'דלתות עליונות בספריה',
    tid('structure-library-upper-doors-button'),
    'הסר החזר',
    library,
    { requires: ['cabinet', 'hinged'] }
  ),
  item(
    'structure',
    'library-glass',
    'זכוכית לדלתות ספריה',
    tid('structure-library-glass-buttons'),
    'ספריות זכוכית וילון',
    library,
    { importance: 'secondary', requires: ['cabinet', 'hinged'] }
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
  item('design', 'front-color', 'צבע חזית ראשי', tid('design-color-swatch-row'), 'צבע דלתות', [], {
    aliases: ['צבע', 'צבעים', 'צבע דלתות'],
    importance: 'primary',
  }),
  item(
    'design',
    'shelf-inherit',
    'צביעת מדפים וקנט קושרת',
    tid('design-front-color-shelf-mode-toggle'),
    'צבע חזית',
    [],
    { importance: 'secondary' }
  ),
  item('design', 'custom-color', 'צבע מותאם אישית', tid('design-custom-color-toggle'), 'הוסף צבע'),
  item('design', 'texture', 'העלאת טקסטורה', tid('design-custom-texture-upload-button'), 'טקסטורה תמונה', [
    expand(tid('design-custom-color-toggle')),
  ]),
  item(
    'design',
    'multicolor',
    'צביעה מתקדמת ותוספות',
    tid('design-multicolor-enabled-toggle'),
    'כל חלק בנפרד',
    [],
    { aliases: ['צביעה', 'צביעה מתקדמת'], importance: 'primary' }
  ),
  item(
    'design',
    'special-materials',
    'מראה או זכוכית לדלתות',
    '.multi-special-section .multi-special-header',
    'מראה וזכוכית וילון',
    multi,
    { importance: 'secondary' }
  ),
  item('design', 'mirror', 'הוספת מראה לדלת', '[data-wp-search-special="mirror"]', 'מראה תוסף', multi, {
    aliases: ['מראה'],
    importance: 'primary',
  }),
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
    multi,
    { aliases: ['זכוכית'], importance: 'primary' }
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
  item('design', 'curtain', 'בחירת צבע וילון', '.wp-r-design-curtain-options', 'זכוכית וילון', glass, {
    aliases: ['וילון', 'וילונות'],
    importance: 'primary',
  }),
  item('design', 'curtain-white', 'וילון לבן', '[data-curtain="white"]', 'צבע זכוכית וילון לבן', glass),
  item('design', 'curtain-pink', 'וילון ורוד', '[data-curtain="pink"]', 'צבע זכוכית וילון ורוד', glass),
  item('design', 'curtain-purple', 'וילון סגול', '[data-curtain="purple"]', 'צבע זכוכית וילון סגול', glass),
  item(
    'design',
    'black-glass',
    'זכוכית שחורה מודבקת',
    '[data-wp-search-special="black_glass"]',
    'זכוכית מודבקת',
    multi
  ),
  item(
    'design',
    'frosted-glass',
    'זכוכית חלבית מודבקת',
    '[data-wp-search-special="frosted_glass"]',
    'זכוכית מודבקת',
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
  item('design', 'grooves', 'חריטה CNC', tid('design-grooves-toggle'), 'חריטות', [], {
    aliases: ['חריטה', 'חריטות', 'cnc'],
    importance: 'primary',
  }),
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
  item('design', 'groove-count', 'מספר חריטות', tid('design-groove-lines-input'), 'קווים', [
    ...groove,
    press(tid('design-groove-mode-button')),
  ]),
  item('design', 'split', 'דלתות חתוכות', tid('design-split-doors-toggle'), 'חיתוך דלתות split', [], {
    aliases: ['חיתוך', 'חיתוך דלת'],
    importance: 'primary',
    requires: ['not-chest'],
  }),
  item('design', 'split-edit', 'חיתוך דלתות', tid('design-split-mode-button'), 'הוסף הסר', split, {
    requires: ['not-chest'],
  }),
  item('design', 'split-custom', 'חיתוך דלתות ידני', tid('design-split-custom-mode-button'), 'חיתוך', split, {
    requires: ['not-chest'],
  }),
  item('design', 'remove-doors', 'הסרת דלתות או דפנות', tid('design-remove-doors-toggle'), 'הסר דלת', [], {
    aliases: ['הסרת דלת', 'הסרת דופן', 'הסרת דפנות'],
    importance: 'primary',
    requires: ['not-chest'],
  }),
  item(
    'design',
    'remove-door-mode',
    'עריכת הסרת דלת',
    tid('design-remove-door-mode-button'),
    'הסר החזר',
    remove,
    { requires: ['not-chest'] }
  ),
  item(
    'design',
    'design-cell-door-count',
    'שינוי מספר דלתות בתא',
    tid('design-cell-door-count-controls'),
    'דלתות',
    remove,
    { requires: ['not-chest', 'hinged'] }
  ),
  item(
    'design',
    'rounded-shelves',
    'מדפים צדדיים למסגרת מעוגלת',
    tid('design-rounded-frame-side-shelves-button'),
    'מסגרת',
    remove,
    { requires: ['not-chest', 'hinged', 'removed-side'] }
  ),
  item('design', 'cornice', 'קרניז עליון – כתר', '[data-testid="design-cornice-toggle"]', 'תוספות גובה', [], {
    aliases: ['קרניז', 'כתר'],
    importance: 'primary',
    requires: ['cabinet'],
  }),
  item(
    'design',
    'cornice-type',
    'סוג קרניז לארון',
    tid('design-cornice-type'),
    'רגיל גל ישר כתר',
    [check(tid('design-cornice-toggle'))],
    { requires: ['cabinet'] }
  ),
  item(
    'design',
    'cornice-dimensions',
    'מידות קרניז לארון',
    tid('design-cornice-dimensions'),
    'גובה בליטה צד חזית כתר',
    [check(tid('design-cornice-toggle'))],
    { requires: ['cabinet'] }
  ),
  item('design', 'groove-height', 'גובה חריטה ידנית', '#wp-r-groove-draft-height', '', [
    ...groove,
    expand(tid('design-groove-manual-button')),
  ]),
  item('design', 'groove-width', 'רוחב חריטה ידנית', '#wp-r-groove-draft-width', '', [
    ...groove,
    expand(tid('design-groove-manual-button')),
  ]),

  item(
    'structure',
    'leg-platform-overhang',
    'מידות בליטת במה לארון',
    tid('structure-base-platform-overhang'),
    'בליטה חזית צדדים בסיס רגליים',
    baseStage,
    { importance: 'secondary', requires: ['main'] }
  ),
  item(
    'structure',
    'library-door-style',
    'סגנון דלתות לספריה',
    tid('structure-library-door-style-buttons'),
    'ספריות פוסט פרופיל כפול',
    library,
    { requires: ['cabinet', 'hinged'] }
  ),
  item(
    'design',
    'split-transparency',
    'דלתות שקופות בזמן חיתוך ידני',
    tid('design-split-transparent-doors-button'),
    'שקיפות',
    [...split, press(tid('design-split-custom-mode-button'))],
    { requires: ['not-chest'] }
  ),

  // פנים: חלוקה, מדפים, כלי סקיצה, מגירות וידיות
  item('interior', 'layout', 'חלוקת פנים', tid('interior-layout'), 'מדפים חלוקה', [], {
    aliases: ['חלוקה', 'חלוקת פנים'],
    importance: 'primary',
    requires: ['not-chest'],
  }),
  item('interior', 'layout-presets', 'תבניות חלוקה', tid('interior-layout-method-presets'), 'תא', [], {
    requires: ['not-chest'],
  }),
  item('interior', 'layout-grid', 'חלוקה לפי תאים', tid('interior-layout-method-grid'), 'רשת', [], {
    requires: ['not-chest'],
  }),
  item('interior', 'layout-sketch', 'חלוקה לפי סקיצה', tid('interior-layout-method-sketch'), 'ציור', [], {
    requires: ['not-chest'],
  }),
  // The same preset definitions drive the rendered buttons and the searchable destinations.
  ...INTERIOR_LAYOUT_TYPES.filter(option => option.group === 'presets').map(option =>
    item(
      'interior',
      `preset-${option.id}`,
      `תבנית ${option.label}`,
      tid(`interior-layout-${option.id}`),
      'תבניות',
      interiorPresets,
      { importance: 'primary', requires: ['not-chest'] }
    )
  ),
  item(
    'interior',
    'manual-shelves',
    'הוספת מדפים לפי תא',
    tid('interior-manual-tool-shelf-button'),
    'מדף',
    interiorGrid,
    { aliases: ['מדף', 'מדפים'], importance: 'primary', requires: ['not-chest'] }
  ),
  item(
    'interior',
    'manual-storage',
    'אוגר מצעים',
    tid('interior-manual-tool-storage-button'),
    'אחסון',
    interiorGrid,
    { aliases: ['אוגר', 'מצעים', 'אחסון'], importance: 'primary', requires: ['not-chest'] }
  ),
  item(
    'interior',
    'manual-rod',
    'מוט תלייה לפי תא',
    tid('interior-manual-tool-rod-button'),
    'מוט בגדים',
    interiorGrid,
    { aliases: ['תלייה', 'מוט תלייה'], importance: 'primary', requires: ['not-chest'] }
  ),
  item(
    'interior',
    'shelf-variants',
    'סוגי מדפים',
    '.wp-interior-layout-options[aria-label="סוג מדף"]',
    'מדף מחוזק',
    [...interiorGrid, activate(tid('interior-manual-tool-shelf-button'))],
    { requires: ['not-chest'] }
  ),
  item(
    'interior',
    'shelf-boring',
    'חירור מלא',
    tid('interior-layout-full_boring'),
    'חורי מדף לפי סקיצה',
    interiorSketch,
    { requires: ['not-chest'] }
  ),
  item(
    'interior',
    'built-in-desk',
    'שולחן מובנה',
    tid('interior-built-in-desk'),
    'שולחן עם מגירות',
    interiorSketch,
    {
      requires: ['not-chest'],
    }
  ),
  item(
    'interior',
    'shelf-conversion',
    'מדף קושרת והמרת מדפים',
    tid('interior-manual-shelf-variant-brace-button'),
    'המרת מדף רגיל לקושרת לפי סקיצה',
    [...interiorSketch, activate(tid('interior-manual-tool-shelf-button'))],
    { requires: ['not-chest'] }
  ),
  item(
    'interior',
    'external-drawers',
    'מגירות חיצוניות',
    tid('interior-external-drawers-card'),
    'מיקום מגירות',
    [],
    {
      aliases: ['מגירות', 'מגירה', 'מגירה חיצונית'],
      importance: 'primary',
      requires: ['not-chest', 'hinged'],
    }
  ),
  item(
    'interior',
    'external-sketch',
    'מגירות חיצוניות בסקיצה',
    tid('interior-external-drawers-sketch-button'),
    'שרטוט',
    [],
    { requires: ['not-chest', 'hinged'] }
  ),
  item('interior', 'drawer-runners', 'מסילות למגירות', '.wp-r-external-drawer-runner', 'טריקה שקטה', [], {
    requires: ['drawer-runners'],
  }),
  item(
    'interior',
    'internal-drawers',
    'מגירות פנימיות',
    tid('interior-internal-drawers-toggle'),
    'מיקום',
    [],
    { aliases: ['מגירה פנימית'], importance: 'primary', requires: ['not-chest'] }
  ),
  item(
    'interior',
    'internal-drawer-mode',
    'מיקום מגירות פנימיות',
    tid('interior-internal-drawers-mode-button'),
    'מגירות',
    [check(tid('interior-internal-drawers-toggle'))],
    { requires: ['not-chest'] }
  ),
  item('interior', 'drawer-divider', 'מחיצה למגירה', '.wp-tool-card--divider', 'מחיצה', []),
  item('interior', 'handles', 'ידיות לכל הארון', '.wp-tool-card--handles', 'ידית', [], {
    aliases: ['ידית', 'ידיות'],
    importance: 'primary',
  }),
  item(
    'interior',
    'advanced-handles',
    'ניהול ידיות מתקדם',
    '[data-testid="interior-advanced-handles-toggle"]',
    'ידית לפי דלת'
  ),
  item(
    'interior',
    'handle-manual-position',
    'מיקום ידיות ידני',
    tid('interior-handle-manual-position'),
    'גובה ידית מיקום ידית',
    [check(tid('interior-advanced-handles-toggle'))]
  ),
  item('interior', 'handle-reset', 'החזרת ידית לברירת המחדל', tid('interior-handle-reset'), 'איפוס ידיות', [
    check(tid('interior-advanced-handles-toggle')),
  ]),
  item(
    'interior',
    'handle-catalog',
    'כל סוגי הידיות',
    '[data-testid="handle-picker-global"] summary',
    'קטלוג ידית כפתור קשת מוט קלאסית רוכבת'
  ),

  // סקיצה חופשית וקופסאות
  ...Object.entries(SKETCH_BOX_CONTROLS).map(([id, definition]) => {
    const control: SketchBoxControlDefinition = definition;
    return item(
      'sketch',
      id,
      control.label,
      tid(sketchBoxControlTestId(id)),
      `קופסא קופסה קופסאות ${control.keywords ?? ''}`,
      (control.reveal ?? []).map(step => ({
        selector: tid(sketchBoxControlTestId(step.control)),
        action: step.action,
      })),
      {
        aliases: control.aliases ?? [],
        importance: control.importance ?? 'secondary',
        requires: ['not-chest'],
      }
    );
  }),
  item('sketch', 'sketch-main', 'כלי חלוקה לפי סקיצה', '.wp-sketch-row', 'חלוקה', [], {
    aliases: ['סקיצה'],
    importance: 'primary',
  }),
  // These are the actual controls in the Sketch tab, not the grid tools in Interior.
  ...INTERIOR_MANUAL_TOOLS.map(option =>
    item(
      'sketch',
      `sketch-${option.id}`,
      `${option.label} לפי סקיצה`,
      tid(`sketch-shelf-tool-${option.id === 'shelf' ? 'main' : option.id}`),
      option.id === 'shelf' ? 'מדפים' : '',
      [],
      { aliases: [option.label], importance: 'primary', requires: ['not-chest'] }
    )
  ),
  // The shelf variants are mounted only after opening the Sketch shelf tool.
  ...SHELF_VARIANT_OPTIONS.map(option =>
    item(
      'sketch',
      `sketch-shelf-${option.variant}`,
      `מדף ${option.label} לפי סקיצה`,
      tid(`sketch-shelf-tool-${option.variant}`),
      '',
      [activate(tid('sketch-shelf-tool-main'))],
      { aliases: [`מדף ${option.label}`], requires: ['not-chest'] }
    )
  ),
  item('sketch', 'sketch-boring', 'חירור מלא לפי סקיצה', tid('sketch-layout-full_boring'), 'מדפים', [], {
    requires: ['not-chest'],
  }),
  item('sketch', 'built-in-desk', 'שולחן מובנה', tid('sketch-built-in-desk'), 'שולחן עם מגירות', [], {
    requires: ['not-chest'],
  }),
  item(
    'sketch',
    'sketch-shelf-depth',
    'עומק מדף לפי סקיצה',
    tid('interior-sketch-shelf-depth-input'),
    '',
    [activate(tid('sketch-shelf-tool-main'))],
    { requires: ['not-chest'] }
  ),
  item(
    'sketch',
    'sketch-storage-height',
    'גובה אוגר מצעים לפי סקיצה',
    tid('interior-sketch-storage-height-input'),
    '',
    [activate(tid('sketch-shelf-tool-storage'))],
    { requires: ['not-chest'] }
  ),
  item(
    'sketch',
    'no-main',
    'ביטול או החזרת ארון ראשי',
    tid('sketch-no-main-wardrobe-toggle-button'),
    'סקיצה חופשית'
  ),
  item(
    'sketch',
    'box-dimensions',
    'מידות מיוחדות לקופסא',
    tid('sketch-box-cell-dims-mode-button'),
    'קופסא',
    [],
    { requires: ['not-chest'] }
  ),
  item(
    'sketch',
    'box-hex',
    'קופסא משושה',
    tid('sketch-box-cell-dims-hex-mode-button'),
    'קופסא פינה',
    [press(tid('sketch-box-cell-dims-mode-button'))],
    { requires: ['not-chest'] }
  ),
  item('sketch', 'sketch-winter-brace', 'קושרת חורף', tid('winter-brace-combined-button'), 'קושרת מדף', [], {
    aliases: ['קושרת', 'קושרת חורף'],
    importance: 'primary',
    requires: ['not-chest'],
  }),
  item('sketch', 'sketch-winter-shelf', 'מדף קושרת חורף', tid('winter-brace-shelf-button'), 'מדפים', [], {
    importance: 'secondary',
    requires: ['not-chest'],
  }),
  item(
    'sketch',
    'door-trim',
    'פסי עיטור לדלת',
    tid('sketch-door-trim-toggle'),
    'פס עיטור פסים קישוט דלתות',
    [],
    { aliases: ['פסי עיטור', 'פס עיטור'], importance: 'primary' }
  ),
  item(
    'sketch',
    'door-trim-color',
    'צבע פסי עיטור',
    tid('sketch-door-trim-colors'),
    'גימור פס שחור ניקל זהב',
    [expand(tid('sketch-door-trim-toggle'))]
  ),
  ...(['horizontal', 'vertical'] as const).flatMap(axis => {
    const direction = axis === 'horizontal' ? 'שוכב' : 'עומד';
    const reveal = [expand(tid('sketch-door-trim-toggle'))];
    return [
      item(
        'sketch',
        `door-trim-${axis}`,
        `פס עיטור ${direction}`,
        tid(`sketch-door-trim-${axis}`),
        'פסי עיטור לדלת לפי מידות',
        reveal
      ),
      item(
        'sketch',
        `door-trim-${axis}-length`,
        `אורך פס עיטור ${direction}`,
        `#wp-r-door-trim-${axis}-custom-size`,
        'מידות גובה רוחב',
        reveal
      ),
      item(
        'sketch',
        `door-trim-${axis}-width`,
        `עובי פס עיטור ${direction}`,
        `#wp-r-door-trim-${axis}-cross-size`,
        'מידות גובה רוחב',
        reveal
      ),
    ];
  }),
  item(
    'sketch',
    'sketch-external-drawers',
    'מגירות חיצוניות לפי סקיצה',
    tid('sketch-external-drawers-toggle'),
    'הוספת מגירה חיצונית',
    [],
    { requires: ['not-chest', 'hinged'] }
  ),
  ...(['shoe', 'regular'] as const).map(kind =>
    item(
      'sketch',
      `sketch-drawers-${kind}`,
      kind === 'shoe' ? 'מגירות נעליים לפי סקיצה' : 'מגירות רגילות לפי סקיצה',
      tid(`interior-sketch-external-drawers-${kind}-button`),
      'מגירה חיצונית',
      [expand(tid('sketch-external-drawers-toggle'))],
      { requires: ['not-chest', 'hinged'] }
    )
  ),
  item(
    'sketch',
    'sketch-external-drawer-count',
    'מספר מגירות חיצוניות לפי סקיצה',
    tid('sketch-external-drawer-count'),
    'כמות מגירות',
    [
      expand(tid('sketch-external-drawers-toggle')),
      activate(tid('interior-sketch-external-drawers-regular-button')),
    ],
    { requires: ['not-chest', 'hinged'] }
  ),
  item(
    'sketch',
    'sketch-external-drawer-height',
    'גובה מגירה חיצונית לפי סקיצה',
    tid('sketch-external-drawer-height'),
    'מידות מגירות',
    [expand(tid('sketch-external-drawers-toggle'))],
    { requires: ['not-chest', 'hinged'] }
  ),
  item(
    'sketch',
    'sketch-internal-drawers',
    'מגירות פנימיות לפי סקיצה',
    tid('sketch-internal-drawers-toggle'),
    'הוספת מגירה פנימית',
    [],
    { requires: ['not-chest'] }
  ),
  item(
    'sketch',
    'sketch-internal-drawer-height',
    'גובה מגירה פנימית לפי סקיצה',
    tid('sketch-internal-drawer-height'),
    'מידות מגירות',
    [],
    { requires: ['not-chest'] }
  ),
  item(
    'sketch',
    'sketch-drawer-runners',
    'מסילות למגירות לפי סקיצה',
    tid('sketch-drawer-runner-card'),
    'טריקה שקטה blum פנימיות חיצוניות',
    [],
    { requires: ['not-chest'] }
  ),

  // הגדרות, ייצוא וסביבה
  item('settings', 'snapshot', 'צילום הדמיה', tid('export-snapshot-button'), 'תמונה ייצוא', [], {
    aliases: ['צילום', 'תמונה'],
    importance: 'primary',
  }),
  item('settings', 'copy', 'העתקת תמונה ללוח', tid('export-copy-button'), 'תמונה'),
  item('settings', 'render-sketch', 'ייצוא סקיצה והדמיה', tid('export-render-sketch-button'), 'תמונה'),
  item('settings', 'open-closed', 'ייצוא פתוח / סגור', tid('export-dual-image-button'), 'תמונה'),
  item('settings', 'pdf-open-close', 'PDF פתוח / סגור A4', tid('export-dual-image-a4-pdf-button'), 'ייצוא'),
  item('settings', 'pdf-sketch', 'PDF סקיצה / הדמיה A4', tid('export-render-sketch-a4-pdf-button'), 'ייצוא'),
  item('settings', 'pdf-editor', 'עורך PDF להזמנה', tid('export-open-pdf-button'), 'הזמנה', [], {
    aliases: ['pdf', 'הזמנה'],
    importance: 'primary',
  }),
  item('settings', 'dark-mode', 'מצב כהה', tid('toggle-dark-mode'), 'תצוגה'),
  item('settings', 'dimensions-display', 'הצגת מידות', tid('toggle-show-dimensions'), 'תצוגה'),
  item('settings', 'real-mirror', 'מראה ממשית בהדמיה', tid('toggle-mirror-reflector'), 'מראה תצוגה', [], {
    importance: 'secondary',
  }),
  item('settings', 'global-click', 'פתיחת כל הארון בלחיצה', tid('toggle-global-click'), 'תצוגה'),
  item('settings', 'light-control', 'מצבי תאורה מתקדמים', tid('toggle-advanced-lighting'), 'שמש תאורה', [], {
    aliases: ['תאורה', 'אור', 'שמש'],
    importance: 'primary',
  }),
  item('settings', 'light-ambient', 'עוצמת אור סביבתי', '[name="lightAmb"]', 'תאורה', lighting),
  item('settings', 'light-sun', 'עוצמת שמש', '[name="lightDir"]', 'תאורה', lighting),
  item('settings', 'light-x', 'כיוון אור X', '[name="lightX"]', 'תאורה', lighting),
  item('settings', 'light-y', 'כיוון אור Y', '[name="lightY"]', 'תאורה', lighting),
  item('settings', 'light-z', 'כיוון אור Z', '[name="lightZ"]', 'תאורה', lighting),
  item('sketch', 'room-architecture', 'הוספת קירות ואדריכלות', tid('settings-room-architecture'), 'חדר', [], {
    aliases: ['קירות', 'קיר', 'אדריכלות', 'חדר'],
    importance: 'primary',
  }),
  item(
    'sketch',
    'room-left-wall',
    'קיר צד שמאל',
    tid('settings-room-left-wall-toggle'),
    'הוספת קירות',
    roomWall
  ),
  item(
    'sketch',
    'room-right-wall',
    'קיר צד ימין',
    tid('settings-room-right-wall-toggle'),
    'הוספת קירות',
    roomWall
  ),
  item('sketch', 'room-wall-width', 'רוחב הקיר', '#wp-room-wall-width', 'מידות חדר קירות', roomWall),
  item('sketch', 'room-wall-height', 'גובה הקיר', '#wp-room-wall-height', 'מידות חדר קירות', roomWall),
  item(
    'sketch',
    'room-alignment',
    'מיקום הארון על הקיר',
    '.wp-r-room-align-actions',
    'יישור הארון מרכז צמוד',
    roomWall
  ),
  item(
    'sketch',
    'room-column',
    'הוספת עמוד בולט',
    tid('settings-room-column-add'),
    'עמוד עמודים בליטה מהקיר',
    roomWall,
    { aliases: ['עמוד', 'עמודים'], importance: 'primary' }
  ),
  item(
    'sketch',
    'room-visibility',
    'הסתרת קירות ועמודים',
    tid('settings-room-architecture-visibility'),
    'הצגת קירות חדר',
    roomWall
  ),
  item('settings', 'floor-type', 'סוג ריצוף', tid('settings-room-floor-type'), 'רצפה פרקט אריחים', [], {
    aliases: ['ריצוף', 'פרקט', 'אריחים'],
    importance: 'primary',
  }),
  item('settings', 'floor-color', 'צבע רצפה', tid('settings-room-floor-colors'), 'גוון ריצוף'),
  item('settings', 'wall-color', 'צבע קירות', tid('settings-room-wall-colors'), 'צבע קיר גוון'),
  item(
    'settings',
    'room-envelope-color',
    'צבע מעטפת החדר',
    tid('settings-room-envelope-colors'),
    'סביבה חדר 360'
  ),
  item('sketch', 'room-openings', 'חלונות ודלתות בחדר', tid('settings-room-openings'), 'פתחים', roomWall),
  item('sketch', 'room-window', 'הוספת חלון', tid('settings-room-opening-window'), 'קיר', roomWall, {
    aliases: ['חלון', 'חלונות'],
    importance: 'primary',
  }),
  item('sketch', 'room-door', 'הוספת דלת לחדר', tid('settings-room-opening-door'), 'קיר', roomWall, {
    aliases: ['דלת חדר'],
    importance: 'primary',
  }),
  item(
    'settings',
    'light-presets',
    'תבניות תאורה',
    '.wp-r-light-presets',
    'מצבי יום ערב חזק טבעי רגיל',
    lighting
  ),
  item(
    'sketch',
    'room-left-offset',
    'מרחק הארון משמאל לקיר',
    '#wp-room-wardrobe-left-offset',
    'מיקום ארון',
    roomWall
  ),
  item(
    'sketch',
    'room-right-offset',
    'מרחק הארון מימין לקיר',
    '#wp-room-wardrobe-right-offset',
    'מיקום ארון',
    roomWall
  ),
  item(
    'sketch',
    'room-opening-size',
    'מידות חלונות ודלתות בחדר',
    '.wp-r-room-opening-size-grid',
    'גובה רוחב פתחים',
    roomWall
  ),
  ...(['left', 'right'] as const).flatMap(side => {
    const direction = side === 'left' ? 'שמאל' : 'ימין';
    const reveal = [...roomWall, check(tid(`settings-room-${side}-wall-toggle`))];
    return [
      item(
        'sketch',
        `room-${side}-wall-depth`,
        `אורך קיר צד ${direction}`,
        `#wp-room-${side}-wall-depth`,
        'מידות קירות עומק חדר',
        reveal
      ),
      item(
        'sketch',
        `room-${side}-wall-height`,
        `גובה קיר צד ${direction}`,
        `#wp-room-${side}-wall-height`,
        'מידות קירות חדר',
        reveal
      ),
    ];
  }),
  item('settings', 'cloud', 'סנכרון לענן', tid('cloud-sync-panel'), 'ענן פרויקטים', [], {
    aliases: ['ענן', 'סנכרון'],
    importance: 'primary',
  }),
  item('settings', 'backup', 'גיבוי ושחזור', tid('settings-backup-panel'), 'יבוא ייצוא', [], {
    aliases: ['גיבוי', 'שחזור'],
    importance: 'primary',
  }),
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

export function searchViewerDestinations(
  query: string,
  enabledTabs?: ReadonlySet<TabId>,
  limit = Number.POSITIVE_INFINITY,
  context?: ReadonlySet<ViewerSearchContextKey>
) {
  const normalized = normalizeViewerSearchText(query);
  const tokens = normalized.split(' ').filter(Boolean);
  const matches = VIEWER_SEARCH_DESTINATIONS.filter(
    entry =>
      (!enabledTabs || enabledTabs.has(entry.tab)) &&
      (!context || !entry.requires || entry.requires.every(key => context.has(key)))
  )
    .map(entry => {
      const name = normalizeViewerSearchText(entry.label);
      const aliases = (entry.aliases ?? []).map(normalizeViewerSearchText);
      const words = normalizeViewerSearchText(`${entry.label} ${entry.keywords} ${aliases.join(' ')}`).split(
        ' '
      );
      // Prefixes support typing a word in progress without matching arbitrary word interiors.
      if (tokens.length && !tokens.every(token => words.some(word => word.startsWith(token)))) return null;
      const score = !tokens.length
        ? 0
        : name === normalized
          ? 5
          : aliases.includes(normalized)
            ? 4
            : tokens.every(token => name.split(' ').some(word => word.startsWith(token)))
              ? 3
              : 1;
      const importance = entry.importance === 'primary' ? 2 : entry.importance === 'secondary' ? 0 : 1;
      return { entry, score, importance };
    })
    .filter(
      (entry): entry is { entry: ViewerSearchDestination; score: number; importance: number } =>
        entry !== null
    )
    .sort(
      (a, b) =>
        b.score - a.score || b.importance - a.importance || a.entry.reveal.length - b.entry.reveal.length
    );
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
