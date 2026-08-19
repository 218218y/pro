import {
  DOOR_SPECIAL_BLACK_GLASS,
  DOOR_SPECIAL_FROSTED_GLASS,
  encodeGlassFrameStylePaintToken,
  type AdhesiveGlassKind,
  type DoorStyleOverrideValue,
} from '../../../features/door_authoring/api.js';
import type { CurtainPreset, DefaultSwatch, SavedColor } from './design_tab_multicolor_shared.js';

export const MULTI_ICON_BRUSH = '🖌️';
export const MULTI_ICON_MIRROR = '🪞';
export const MULTI_ICON_WINDOW = '🪟';
export const MULTI_ICON_BLACK_GLASS = '◩';
export const MULTI_ICON_FROSTED_GLASS = '◫';
export const MULTI_ICON_THREAD = '🧵';

export const MULTI_MSG_HINT_GLASS = 'כעת לחץ על דלתות כדי להחיל זכוכית ואת הוילון הנבחר.';
export const MULTI_MSG_HINT_ADHESIVE_GLASS = 'כעת לחץ על דלתות כדי להחיל זכוכית מודבקת במידה שנבחרה.';
export const MULTI_MSG_HINT_PAINT = 'כעת לחץ על חלקים בארון כדי לצבוע אותם.';
export const MULTI_MSG_HINT_DOOR_STYLE = 'כעת לחץ על דלתות או מגירות כדי להחיל את סגנון החזית שנבחר.';

export const MULTI_TITLE_BRUSH = MULTI_ICON_BRUSH + ' מברשת צבע';
export const MULTI_SUBTITLE_CHOOSE = '(לחץ לבחירה)';
export const MULTI_BTN_FINISH_EDIT = 'סיום עריכה';
export const MULTI_SPECIAL_HEADER = 'מראה או זכוכית לדלתות';
export const MULTI_DOOR_STYLE_HEADER = 'סגנון חזית לדלתות ומגירות';
export const MULTI_LABEL_MIRROR = 'מראה';
export const MULTI_LABEL_GLASS = 'דלת זכוכית / וילון';
export const MULTI_LABEL_BLACK_GLASS = 'זכוכית שחורה';
export const MULTI_LABEL_FROSTED_GLASS = 'זכוכית חלבית';
export const MULTI_GLASS_STYLE_HEADER = 'אפשרויות זכוכית';
export const MULTI_LABEL_GLASS_FULL = 'זכוכית מלאה';
export const MULTI_LABEL_GLASS_DOUBLE_PROFILE = 'זכוכית פרופיל כפול';
export const MULTI_CURTAIN_TITLE = 'בחר צבע וילון לדלת הזכוכית:';
export const MULTI_MIRROR_HEIGHT = 'גובה מראה';
export const MULTI_MIRROR_WIDTH = 'רוחב מראה';
export const MULTI_GLASS_HEIGHT = 'גובה זכוכית';
export const MULTI_GLASS_WIDTH = 'רוחב זכוכית';
export const MULTI_MIRROR_AUTO = 'אוטומטי';
export const MULTI_MIRROR_RESET_HEIGHT = 'חזרה לגובה מלא';
export const MULTI_MIRROR_RESET_WIDTH = 'חזרה לרוחב מלא';
export const MULTI_GLASS_RESET_HEIGHT = 'חזרה לגובה זכוכית מלא';
export const MULTI_GLASS_RESET_WIDTH = 'חזרה לרוחב זכוכית מלא';
export const MULTI_SECTION_TITLE = 'צביעה מתקדמת ותוספות';

export const MULTI_GLASS_STYLE_OPTIONS: ReadonlyArray<{
  id: DoorStyleOverrideValue;
  paintId: string;
  label: string;
  curtainPreset?: CurtainPreset | undefined;
}> = [
  { id: 'profile', paintId: 'glass', label: 'זכוכית', curtainPreset: 'none' },
  { id: 'flat', paintId: encodeGlassFrameStylePaintToken('flat'), label: MULTI_LABEL_GLASS_FULL },
  {
    id: 'double_profile',
    paintId: encodeGlassFrameStylePaintToken('double_profile'),
    label: MULTI_LABEL_GLASS_DOUBLE_PROFILE,
  },
];

export const MULTI_DOOR_STYLE_OPTIONS: ReadonlyArray<{ id: DoorStyleOverrideValue; label: string }> = [
  { id: 'flat', label: 'פוסט' },
  { id: 'profile', label: 'פרופיל' },
  { id: 'double_profile', label: 'פרופיל כפול' },
];

export type MultiColorSpecialSwatchDef = {
  id: string;
  paintId: string;
  title: string;
  val: string;
  icon: string;
  badge?: string | undefined;
  curtainPreset?: CurtainPreset | undefined;
  adhesiveGlassKind?: AdhesiveGlassKind | undefined;
  swatchClassName?: string | undefined;
};

export const MULTI_SPECIAL_SWATCHES: ReadonlyArray<MultiColorSpecialSwatchDef> = [
  { id: 'mirror', paintId: 'mirror', title: MULTI_LABEL_MIRROR, val: '#a4c2f4', icon: MULTI_ICON_MIRROR },
  {
    id: DOOR_SPECIAL_BLACK_GLASS,
    paintId: DOOR_SPECIAL_BLACK_GLASS,
    title: MULTI_LABEL_BLACK_GLASS,
    val: '#2f3742',
    icon: MULTI_ICON_BLACK_GLASS,
    swatchClassName: 'special-swatch--black-glass',
    adhesiveGlassKind: DOOR_SPECIAL_BLACK_GLASS,
  },
  {
    id: DOOR_SPECIAL_FROSTED_GLASS,
    paintId: DOOR_SPECIAL_FROSTED_GLASS,
    title: MULTI_LABEL_FROSTED_GLASS,
    val: '#e9f2f2',
    icon: MULTI_ICON_FROSTED_GLASS,
    adhesiveGlassKind: DOOR_SPECIAL_FROSTED_GLASS,
  },
  {
    id: 'glass_curtain',
    paintId: 'glass',
    title: MULTI_LABEL_GLASS,
    val: '#a8dadc',
    icon: MULTI_ICON_WINDOW,
    badge: MULTI_ICON_THREAD,
    curtainPreset: 'none',
  },
];

export type MultiColorSwatchDot = {
  key: string;
  paintId: string;
  title: string;
  selected: boolean;
  val?: string | undefined;
  isTexture?: boolean | undefined;
  textureData?: string | null | undefined;
  isSpecial?: boolean | undefined;
  icon?: string | undefined;
  badge?: string | undefined;
  curtainPreset?: CurtainPreset | undefined;
  id?: string | undefined;
  adhesiveGlassKind?: AdhesiveGlassKind | undefined;
  swatchClassName?: string | undefined;
};

export type MultiColorPanelViewState = {
  enabled: boolean;
  paintActive: boolean;
  paintColor: string | null;
  curtainChoice: CurtainPreset;
  mirrorDraftHeight: string;
  mirrorDraftWidth: string;
  activeDoorStyleOverride: DoorStyleOverrideValue | null;
  activeGlassFrameStyle: DoorStyleOverrideValue | null;
  activeAdhesiveGlassKind: AdhesiveGlassKind | null;
  defaultSwatches: ReadonlyArray<MultiColorSwatchDot>;
  savedSwatches: ReadonlyArray<MultiColorSwatchDot>;
  specialSwatches: ReadonlyArray<MultiColorSwatchDot>;
  hintText: string | null;
};

export type CreateDesignTabMulticolorViewStateArgs = {
  enabled: boolean;
  primaryMode: string;
  curtainChoiceRaw: string;
  mirrorDraftHeight: string;
  mirrorDraftWidth: string;
  paintColor: string | null;
  activeDoorStyleOverride: DoorStyleOverrideValue | null;
  defaultSwatches: ReadonlyArray<DefaultSwatch>;
  savedSwatches: ReadonlyArray<SavedColor>;
};
