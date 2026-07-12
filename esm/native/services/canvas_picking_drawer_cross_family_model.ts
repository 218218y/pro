export type CrossDrawerFamily = 'standard_external' | 'sketch_external' | 'sketch_internal' | 'other';

export type CrossDrawerHit = {
  object: Record<string, unknown>;
  partId: string;
  family: CrossDrawerFamily;
  moduleIndex: string;
  sketchExtDrawerId: string;
  sketchBoxId: string;
};
