import type { ReactNode } from 'react';

import type { FloorStyle, LightPresetName } from './render_tab_shared_contracts.js';

export const LIGHT_PRESET_OPTIONS: ReadonlyArray<[LightPresetName, string, string]> = [
  ['default', 'רגיל', 'fas fa-undo'],
  ['natural', 'יום', 'fas fa-sun'],
  ['evening', 'ערב', 'fas fa-moon'],
  ['front', "פרוז'קטור", 'fas fa-search'],
];

export const FLOOR_TYPE_OPTIONS: ReadonlyArray<{
  id: 'parquet' | 'tiles' | 'none';
  icon: string;
  label: string;
}> = [
  { id: 'parquet', icon: 'fas fa-layer-group', label: 'פרקט' },
  { id: 'tiles', icon: 'fas fa-th', label: 'אריחים' },
  { id: 'none', icon: 'fas fa-ban', label: 'ללא' },
];

export type FloorStyleSwatchProps = {
  key?: string | number;
  styleDef: FloorStyle;
  selected: boolean;
  onSelect: (style: FloorStyle) => void;
};

export type ActionTileProps = {
  key?: string | number;
  selected: boolean;
  icon: string;
  onActivate: () => void;
  children: ReactNode;
  className?: string;
};

export type LightSliderName = 'lightAmb' | 'lightDir' | 'lightX' | 'lightY' | 'lightZ';

export type LightSliderProps = {
  label: string;
  name: LightSliderName;
  value: number;
  onChange: (value: number) => void;
};
