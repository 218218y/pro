import type { FloorStyle, SettingsVisualFloorType, WallColor } from './settings_visual_shared_contracts.js';

export const DEFAULT_FLOOR_STYLES: Record<SettingsVisualFloorType, FloorStyle[]> = {
  parquet: [
    { id: 'oak_light', color1: '#dfd0bc', color2: '#cdbda7', name: 'אלון בהיר' },
    { id: 'oak_honey', color1: '#d4a373', color2: '#cd9763', name: 'אלון דבש' },
    { id: 'walnut', color1: '#8d6e63', color2: '#795548', name: 'אגוז כהה' },
    { id: 'grey_wood', color1: '#cfd8dc', color2: '#b0bec5', name: 'עץ אפור' },
    { id: 'mahogany', color1: '#5d4037', color2: '#4e342e', name: 'מהגוני אדמדם' },
  ],
  tiles: [
    {
      id: 'oak_light',
      color: '#dfd0bc',
      color1: '#dfd0bc',
      color2: '#cdbda7',
      lines: '#b9a993',
      size: 4,
      name: 'אריח אלון בהיר',
    },
    {
      id: 'oak_honey',
      color: '#d4a373',
      color1: '#d4a373',
      color2: '#cd9763',
      lines: '#a8754a',
      size: 4,
      name: 'אריח אלון דבש',
    },
    {
      id: 'walnut',
      color: '#8d6e63',
      color1: '#8d6e63',
      color2: '#795548',
      lines: '#5d4037',
      size: 4,
      name: 'אריח אגוז כהה',
    },
    {
      id: 'grey_wood',
      color: '#cfd8dc',
      color1: '#cfd8dc',
      color2: '#b0bec5',
      lines: '#90a4ae',
      size: 4,
      name: 'אריח אפור מעודן',
    },
    {
      id: 'mahogany',
      color: '#5d4037',
      color1: '#5d4037',
      color2: '#4e342e',
      lines: '#3e2723',
      size: 4,
      name: 'אריח מהגוני אדמדם',
    },
  ],
  none: [
    { id: 'solid_white', color: '#ffffff', name: 'לבן נקי' },
    { id: 'solid_grey', color: '#c3ccd1', name: 'אפור בטון' },
    { id: 'oak_light', color: '#dfd0bc', name: 'אלון' },
    { id: 'terrazzo', color: '#b2ebf2', name: 'טרצו בהיר' },
    { id: 'solid_black', color: '#424242', name: 'שחור' },
  ],
};

export const DEFAULT_WALL_COLORS: WallColor[] = [
  { id: 'white', val: '#ffffff', name: 'לבן קלאסי' },
  { id: 'cream', val: '#d8c7aa', name: 'חול חמים' },
  { id: 'grey', val: '#c3ccd1', name: 'אפור בטון' },
  { id: 'blue', val: '#e3f2fd', name: 'תכלת עדין' },
  { id: 'dark', val: '#37474f', name: 'אפור גרפיט' },
];
