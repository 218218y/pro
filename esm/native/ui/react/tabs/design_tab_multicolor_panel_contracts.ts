import type { DoorStyleOverrideValue } from '../../../features/door_style_overrides.js';
import type { CurtainPreset, DefaultSwatch, SavedColor } from './design_tab_multicolor_shared.js';

export const MULTI_ICON_BRUSH = '🖌️';
export const MULTI_ICON_MIRROR = '🪞';
export const MULTI_ICON_WINDOW = '🪟';
export const MULTI_ICON_THREAD = '🧵';

export const MULTI_MSG_HINT_GLASS = 'כעת לחץ על דלתות כדי להחיל זכוכית ואת הוילון הנבחר.';
export const MULTI_MSG_HINT_PAINT = 'כעת לחץ על חלקים בארון כדי לצבוע אותם.';
export const MULTI_MSG_HINT_DOOR_STYLE = 'כעת לחץ על דלתות או מגירות כדי להחיל את סגנון החזית שנבחר.';

export const MULTI_TITLE_BRUSH = MULTI_ICON_BRUSH + ' מברשת צבע';
export const MULTI_SUBTITLE_CHOOSE = '(לחץ לבחירה)';
export const MULTI_BTN_FINISH_EDIT = 'סיום עריכה';
export const MULTI_SPECIAL_HEADER = 'מראה או זכוכית לדלתות';
export const MULTI_DOOR_STYLE_HEADER = 'סגנון חזית לדלתות ומגירות';
export const MULTI_LABEL_MIRROR = 'מראה';
export const MULTI_LABEL_GLASS = 'זכוכית';
export const MULTI_CURTAIN_TITLE = 'בחר צבע וילון לדלת הזכוכית:';
export const MULTI_MIRROR_HEIGHT = 'גובה מראה';
export const MULTI_MIRROR_WIDTH = 'רוחב מראה';
export const MULTI_MIRROR_AUTO = 'אוטומטי';
export const MULTI_SECTION_TITLE = 'צביעה מתקדמת ותוספות';

export const MULTI_DOOR_STYLE_OPTIONS: ReadonlyArray<{ id: DoorStyleOverrideValue; label: string }> = [
  { id: 'flat', label: 'פוסט' },
  { id: 'profile', label: 'פרופיל' },
  { id: 'tom', label: 'פרופיל תום' },
];

export type MultiColorSpecialSwatchDef = {
  id: string;
  paintId: string;
  title: string;
  val: string;
  icon: string;
  badge?: string;
  curtainPreset?: CurtainPreset;
};

export const MULTI_SPECIAL_SWATCHES: ReadonlyArray<MultiColorSpecialSwatchDef> = [
  { id: 'mirror', paintId: 'mirror', title: MULTI_LABEL_MIRROR, val: '#a4c2f4', icon: MULTI_ICON_MIRROR },
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
  val?: string;
  isTexture?: boolean;
  textureData?: string | null;
  isSpecial?: boolean;
  icon?: string;
  badge?: string;
  curtainPreset?: CurtainPreset;
  id?: string;
};

export type MultiColorPanelViewState = {
  enabled: boolean;
  paintActive: boolean;
  paintColor: string | null;
  curtainChoice: CurtainPreset;
  mirrorDraftHeight: string;
  mirrorDraftWidth: string;
  activeDoorStyleOverride: DoorStyleOverrideValue | null;
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
