import type { FloorStyle, RenderTabFloorType, WallColor } from './render_tab_shared_contracts.js';

export const FALLBACK_FLOOR_STYLES: Record<RenderTabFloorType, FloorStyle[]> = {
  parquet: [
    { id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0', name: 'אלון בהיר' },
    { id: 'oak_honey', color1: '#d4a373', color2: '#cd9763', name: 'אלון דבש' },
    { id: 'walnut', color1: '#8d6e63', color2: '#795548', name: 'אגוז כהה' },
    { id: 'grey_wood', color1: '#cfd8dc', color2: '#b0bec5', name: 'עץ אפור' },
    { id: 'mahogany', color1: '#5d4037', color2: '#4e342e', name: 'מהגוני אדמדם' },
  ],
  tiles: [
    { id: 'marble_white', color: '#f5f5f5', name: 'שיש לבן' },
    { id: 'beige', color: '#efebe9', name: "אבן בז'" },
    { id: 'concrete', color: '#bdbdbd', name: 'בטון' },
    { id: 'dark_slate', color: '#546e7a', name: 'צפחה כהה' },
    { id: 'terrazzo', color: '#e0f7fa', name: 'טרצו בהיר' },
  ],
  none: [
    { id: 'solid_white', color: '#ffffff', name: 'לבן נקי' },
    { id: 'solid_grey', color: '#e0e0e0', name: 'אפור בהיר' },
    { id: 'oak_light', color: '#eaddcf', name: 'אלון' },
    { id: 'terrazzo', color: '#b2ebf2', name: 'טרצו בהיר' },
    { id: 'solid_black', color: '#424242', name: 'שחור' },
  ],
};

export const FALLBACK_WALL_COLORS: WallColor[] = [
  { id: 'white', val: '#ffffff', name: 'לבן קלאסי' },
  { id: 'cream', val: '#fdfbf7', name: 'שמנת רכה' },
  { id: 'grey', val: '#eceff1', name: 'אפור בהיר' },
  { id: 'blue', val: '#e3f2fd', name: 'תכלת עדין' },
  { id: 'dark', val: '#37474f', name: 'אפור גרפיט' },
];
