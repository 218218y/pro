export type SketchFreeBoxAttachPlacement = {
  centerX: number;
  centerY: number;
  score: number;
  fixedAxis: 'x' | 'y';
  slideAxis: 'x' | 'y';
  direction: -1 | 1;
  snappedToCenter: boolean;
};
