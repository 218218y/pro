export type WardrobeDimensionDefaultType = 'hinged' | 'sliding';

export const WARDROBE_DEFAULTS = Object.freeze({
  widthCm: 160,
  heightCm: 240,
  chestDrawersCount: 4,
  byType: Object.freeze({
    hinged: Object.freeze({
      depthCm: 55,
      doorsCount: 4,
      perDoorWidthCm: 40,
    }),
    sliding: Object.freeze({
      depthCm: 60,
      doorsCount: 2,
      perDoorWidthCm: 80,
    }),
  }),
  corner: Object.freeze({
    widthCm: 120,
    doorsCount: 3,
  }),
});

export const DEFAULT_WIDTH: number = WARDROBE_DEFAULTS.widthCm;
export const DEFAULT_HEIGHT: number = WARDROBE_DEFAULTS.heightCm;
export const DEFAULT_CHEST_DRAWERS_COUNT: number = WARDROBE_DEFAULTS.chestDrawersCount;

export const HINGED_DEFAULT_DEPTH: number = WARDROBE_DEFAULTS.byType.hinged.depthCm;
export const SLIDING_DEFAULT_DEPTH: number = WARDROBE_DEFAULTS.byType.sliding.depthCm;

export const DEFAULT_HINGED_DOORS: number = WARDROBE_DEFAULTS.byType.hinged.doorsCount;
export const DEFAULT_SLIDING_DOORS: number = WARDROBE_DEFAULTS.byType.sliding.doorsCount;

export const HINGED_DEFAULT_PER_DOOR_WIDTH: number = WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
export const SLIDING_DEFAULT_PER_DOOR_WIDTH: number = WARDROBE_DEFAULTS.byType.sliding.perDoorWidthCm;

export const DEFAULT_CORNER_WIDTH: number = WARDROBE_DEFAULTS.corner.widthCm;
export const DEFAULT_CORNER_DOORS: number = WARDROBE_DEFAULTS.corner.doorsCount;
