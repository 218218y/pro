// Export canvas engine (pure)
//
// This module contains math-only helpers used by export_canvas.
// It is intentionally free of App/DOM dependencies.

export interface RefPoint {
  x: number;
  y: number;
}

export interface ExportRefPoints {
  p0: RefPoint;
  p1: RefPoint;
  p2: RefPoint;
}

export interface RefTransform {
  sx: number;
  sy: number;
  dx: number;
  dy: number;
}

// Notes export transform (consumed by ui/notes_export.ts).
// Kept as a flexible bag: supports axis-aligned scale/translate,
// affine, and optional plane-based projective remap.
export type NotesExportTransformLike = Record<string, unknown>;

export function computeTransformFromRefs(
  preRef: ExportRefPoints | null,
  postRef: ExportRefPoints | null
): RefTransform | null {
  if (!preRef || !postRef) return null;
  const denomX = preRef.p1.x - preRef.p0.x;
  const denomY = preRef.p2.y - preRef.p0.y;

  const sx = Math.abs(denomX) > 1e-6 ? (postRef.p1.x - postRef.p0.x) / denomX : 1;
  const sy = Math.abs(denomY) > 1e-6 ? (postRef.p2.y - postRef.p0.y) / denomY : 1;

  const dx = postRef.p0.x - preRef.p0.x * sx;
  const dy = postRef.p0.y - preRef.p0.y * sy;

  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(dx) || !Number.isFinite(dy)) {
    return null;
  }
  return { sx, sy, dx, dy };
}

export function computeAffineFromRefs(
  preRef: ExportRefPoints | null,
  postRef: ExportRefPoints | null
): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
  if (!preRef || !postRef) return null;

  // Basis in pre space.
  const ux = preRef.p1.x - preRef.p0.x;
  const uy = preRef.p1.y - preRef.p0.y;
  const vx = preRef.p2.x - preRef.p0.x;
  const vy = preRef.p2.y - preRef.p0.y;
  const det = ux * vy - uy * vx;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;

  // Inverse of [u v] (2x2).
  const inv00 = vy / det;
  const inv01 = -vx / det;
  const inv10 = -uy / det;
  const inv11 = ux / det;

  // Basis in post space.
  const u2x = postRef.p1.x - postRef.p0.x;
  const u2y = postRef.p1.y - postRef.p0.y;
  const v2x = postRef.p2.x - postRef.p0.x;
  const v2y = postRef.p2.y - postRef.p0.y;

  // A = [u2 v2] * inv([u v])
  const a = u2x * inv00 + v2x * inv10;
  const c = u2x * inv01 + v2x * inv11;
  const b = u2y * inv00 + v2y * inv10;
  const d = u2y * inv01 + v2y * inv11;

  const e = postRef.p0.x - (a * preRef.p0.x + c * preRef.p0.y);
  const f = postRef.p0.y - (b * preRef.p0.x + d * preRef.p0.y);

  if (![a, b, c, d, e, f].every(v => Number.isFinite(v))) return null;
  return { a, b, c, d, e, f };
}

export function buildNotesExportTransform(args: {
  preRef: ExportRefPoints | null;
  postRef: ExportRefPoints | null;
  prePvInv: number[] | null;
  postPv: number[] | null;
  preCamPos: { x: number; y: number; z: number } | null;
  planePoint?: { x: number; y: number; z: number } | null;
  planeNormal?: { x: number; y: number; z: number } | null;
}): NotesExportTransformLike | null {
  const { preRef, postRef } = args;

  const scaleTranslate = computeTransformFromRefs(preRef, postRef);
  const affine = computeAffineFromRefs(preRef, postRef);

  const planeOk =
    Array.isArray(args.prePvInv) &&
    Array.isArray(args.postPv) &&
    !!args.preCamPos &&
    !!args.planePoint &&
    !!args.planeNormal &&
    args.prePvInv.length === 16 &&
    args.postPv.length === 16;

  // If we have *no* usable mapping, bail.
  if (!scaleTranslate && !affine && !planeOk) return null;

  // Prefer the plane-based mapping when available.
  const out: NotesExportTransformLike = {
    kind: planeOk ? 'plane' : 'affine',
  };

  if (planeOk && args.prePvInv && args.postPv && args.preCamPos && args.planePoint && args.planeNormal) {
    out.prePVInv = args.prePvInv.slice(0, 16);
    out.postPV = args.postPv.slice(0, 16);
    out.preCamPos = { x: args.preCamPos.x, y: args.preCamPos.y, z: args.preCamPos.z };
    out.planePoint = { x: args.planePoint.x, y: args.planePoint.y, z: args.planePoint.z };
    out.planeNormal = { x: args.planeNormal.x, y: args.planeNormal.y, z: args.planeNormal.z };
  }

  if (scaleTranslate) {
    out.sx = scaleTranslate.sx;
    out.sy = scaleTranslate.sy;
    out.dx = scaleTranslate.dx;
    out.dy = scaleTranslate.dy;
  }
  if (affine) {
    out.a = affine.a;
    out.b = affine.b;
    out.c = affine.c;
    out.d = affine.d;
    out.e = affine.e;
    out.f = affine.f;
  }

  return out;
}
