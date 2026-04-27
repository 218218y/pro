import type { UnknownCallable } from '../../../../types/common.js';
import type { ExportRefPointsLike, Vec3Like } from '../../../../types/build.js';

export type UnknownRecord = Record<string, unknown>;
export type CallableLike = UnknownCallable;
export type ClonedVec3Like = { x: number; y: number; z: number };
export type RenderCameraLike = { position: { clone: () => ClonedVec3Like } };
export type CameraControlsLike = { target: { clone: () => ClonedVec3Like } };
export type CameraControlsPairLike = { camera: RenderCameraLike; controls: CameraControlsLike };
export type PdfWidthFontLike = { widthOfTextAtSize: (text: string, size: number) => number };
export type BidiRun = { dir: 'rtl' | 'ltr'; text: string };
export type RefTargetLike = Partial<Vec3Like>;
export type NotesExportTransformArgsLike = {
  preRef: ExportRefPointsLike | null;
  postRef: ExportRefPointsLike | null;
  prePvInv: number[] | null;
  postPv: number[] | null;
  preCamPos: Vec3Like | null;
  planePoint?: Vec3Like | null;
  planeNormal?: Vec3Like | null;
};
