export type Point2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };
export type Mat4Vec4 = { x: number; y: number; z: number; w: number };

export type NoteTransformRuntime = {
  hasAffine: boolean;
  affine: { a: number; b: number; c: number; d: number; e: number; f: number };
  scaleTranslate: { sx: number; sy: number; dx: number; dy: number };
  planeOk: boolean;
  prePVInv: number[] | null;
  postPV: number[] | null;
  preCamPos: Vec3 | null;
  planePoint: Vec3 | null;
  planeNormal: Vec3 | null;
};

export type NoteImageDrawArgs = {
  doc: Document;
  ctx: CanvasRenderingContext2D;
  editor: HTMLElement;
  dstLeftCss: number;
  dstTopCss: number;
  dstWCss: number;
  dstHCss: number;
  srcWCss: number;
  srcHCss: number;
  scaleX: number;
  scaleY: number;
  titleOffset: number;
};

export type NotePlainTextDrawArgs = {
  ctx: CanvasRenderingContext2D;
  boxEl: HTMLElement;
  dstLeftCss: number;
  dstTopCss: number;
  dstWCss: number;
  dstHCss: number;
  scaleX: number;
  scaleY: number;
  titleOffset: number;
};

export function clampScale(v: number): number {
  if (!Number.isFinite(v)) return 1;
  const av = Math.abs(v);
  return Math.max(0.05, Math.min(20, av));
}
