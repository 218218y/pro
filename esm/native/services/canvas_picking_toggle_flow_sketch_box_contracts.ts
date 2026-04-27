export type SketchBoxDoorTarget = {
  moduleKey: string | null;
  boxId: string;
  doorId: string | null;
};

export type SketchBoxPatchTarget = {
  stack: 'top' | 'bottom';
  moduleKey: string;
};
