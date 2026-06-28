import type {
  SketchBoxLegColor,
  SketchBoxLegPlatformMode,
  SketchBoxLegPlatformSideMode,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';

type SketchBoxBaseOption = Readonly<{ id: 'plinth' | 'legs' | 'none'; label: string }>;
type SketchBoxCorniceOption = Readonly<{ id: 'classic' | 'wave'; label: string }>;
type SketchBoxLegStyleOption = Readonly<{ id: SketchBoxLegStyle; label: string }>;
type SketchBoxLegColorOption = Readonly<{ id: SketchBoxLegColor; label: string }>;
type SketchBoxLegPlatformOption = Readonly<{ id: SketchBoxLegPlatformMode; label: string }>;
type SketchBoxLegPlatformSideOption = Readonly<{ id: SketchBoxLegPlatformSideMode; label: string }>;

export const SKETCH_BOX_BASE_OPTIONS: readonly [
  SketchBoxBaseOption,
  SketchBoxBaseOption,
  SketchBoxBaseOption,
] = [
  { id: 'plinth', label: 'צוקל' },
  { id: 'legs', label: 'רגליים' },
  { id: 'none', label: 'ללא' },
];

export const SKETCH_BOX_CORNICE_OPTIONS: readonly [SketchBoxCorniceOption, SketchBoxCorniceOption] = [
  { id: 'classic', label: 'קרניז רגיל' },
  { id: 'wave', label: 'קרניז גל' },
];

export const SKETCH_BOX_LEG_STYLE_OPTIONS: readonly [
  SketchBoxLegStyleOption,
  SketchBoxLegStyleOption,
  SketchBoxLegStyleOption,
] = [
  { id: 'tapered', label: 'שפיץ' },
  { id: 'round', label: 'עגולות' },
  { id: 'square', label: 'מרובעות' },
];

export const SKETCH_BOX_LEG_COLOR_OPTIONS: readonly [
  SketchBoxLegColorOption,
  SketchBoxLegColorOption,
  SketchBoxLegColorOption,
] = [
  { id: 'black', label: 'שחור' },
  { id: 'nickel', label: 'ניקל' },
  { id: 'gold', label: 'זהב' },
];

export const SKETCH_BOX_LEG_PLATFORM_OPTIONS: readonly [
  SketchBoxLegPlatformOption,
  SketchBoxLegPlatformOption,
] = [
  { id: 'stage', label: 'עם במה' },
  { id: 'plain', label: 'בלי במה' },
];

export const SKETCH_BOX_LEG_PLATFORM_SIDE_OPTIONS: readonly [
  SketchBoxLegPlatformSideOption,
  SketchBoxLegPlatformSideOption,
] = [
  { id: 'overhang', label: 'במה בולטת' },
  { id: 'flush', label: 'במה אפס' },
];
