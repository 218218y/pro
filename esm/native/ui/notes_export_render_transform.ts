import { type ExportNotesTransform, readMatrix16, readVec3 } from './notes_export_shared.js';
import {
  type Mat4Vec4,
  type NoteTransformRuntime,
  type Point2,
  type Vec3,
} from './notes_export_render_shared.js';

export function createTransformRuntime(transform: ExportNotesTransform | null): NoteTransformRuntime {
  const a = typeof transform?.a === 'number' && Number.isFinite(transform.a) ? transform.a : null;
  const b = typeof transform?.b === 'number' && Number.isFinite(transform.b) ? transform.b : null;
  const c = typeof transform?.c === 'number' && Number.isFinite(transform.c) ? transform.c : null;
  const d = typeof transform?.d === 'number' && Number.isFinite(transform.d) ? transform.d : null;
  const e = typeof transform?.e === 'number' && Number.isFinite(transform.e) ? transform.e : null;
  const f = typeof transform?.f === 'number' && Number.isFinite(transform.f) ? transform.f : null;

  const prePVInv = readMatrix16(transform?.prePVInv);
  const postPV = readMatrix16(transform?.postPV);
  const preCamPos = readVec3(transform?.preCamPos);
  const planePoint = readVec3(transform?.planePoint);
  const planeNormal = readVec3(transform?.planeNormal);

  return {
    hasAffine: a !== null && b !== null && c !== null && d !== null && e !== null && f !== null,
    affine: { a: a ?? 1, b: b ?? 0, c: c ?? 0, d: d ?? 1, e: e ?? 0, f: f ?? 0 },
    legacy: {
      sx: typeof transform?.sx === 'number' && Number.isFinite(transform.sx) ? transform.sx : 1,
      sy: typeof transform?.sy === 'number' && Number.isFinite(transform.sy) ? transform.sy : 1,
      dx: typeof transform?.dx === 'number' && Number.isFinite(transform.dx) ? transform.dx : 0,
      dy: typeof transform?.dy === 'number' && Number.isFinite(transform.dy) ? transform.dy : 0,
    },
    planeOk: !!(
      transform &&
      transform.kind === 'plane' &&
      prePVInv &&
      postPV &&
      preCamPos &&
      planePoint &&
      planeNormal
    ),
    prePVInv,
    postPV,
    preCamPos,
    planePoint,
    planeNormal,
  };
}

function mulMat4Vec4(m: number[], x: number, y: number, z: number, w: number): Mat4Vec4 {
  return {
    x: m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    y: m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    z: m[2] * x + m[6] * y + m[10] * z + m[14] * w,
    w: m[3] * x + m[7] * y + m[11] * z + m[15] * w,
  };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function norm3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (!Number.isFinite(len) || len < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function createMapPoint(
  runtime: NoteTransformRuntime,
  containerRect: DOMRect,
  originalWidth: number,
  originalHeight: number
): (xCss: number, yCss: number) => Point2 {
  const scaleX =
    Number.isFinite(originalWidth) && originalWidth > 0 ? originalWidth / containerRect.width : 1;
  const scaleY =
    Number.isFinite(originalHeight) && originalHeight > 0 ? originalHeight / containerRect.height : 1;

  const applyAffine = (xCss: number, yCss: number): Point2 => {
    if (runtime.hasAffine) {
      return {
        x: runtime.affine.a * xCss + runtime.affine.c * yCss + runtime.affine.e,
        y: runtime.affine.b * xCss + runtime.affine.d * yCss + runtime.affine.f,
      };
    }
    return {
      x: xCss * runtime.legacy.sx + runtime.legacy.dx,
      y: yCss * runtime.legacy.sy + runtime.legacy.dy,
    };
  };

  const mapPlane = (xCss: number, yCss: number): Point2 | null => {
    if (
      !runtime.planeOk ||
      !runtime.prePVInv ||
      !runtime.postPV ||
      !runtime.preCamPos ||
      !runtime.planePoint ||
      !runtime.planeNormal
    ) {
      return null;
    }

    const ndcX = (xCss / containerRect.width) * 2 - 1;
    const ndcY = -(yCss / containerRect.height) * 2 + 1;
    const near = mulMat4Vec4(runtime.prePVInv, ndcX, ndcY, -1, 1);
    const far = mulMat4Vec4(runtime.prePVInv, ndcX, ndcY, 1, 1);
    if (Math.abs(near.w) < 1e-9 || Math.abs(far.w) < 1e-9) return null;

    const near3 = { x: near.x / near.w, y: near.y / near.w, z: near.z / near.w };
    const far3 = { x: far.x / far.w, y: far.y / far.w, z: far.z / far.w };
    const dir = norm3(sub3(far3, near3));
    const denom = dot3(runtime.planeNormal, dir);
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-9) return null;

    const t = dot3(runtime.planeNormal, sub3(runtime.planePoint, runtime.preCamPos)) / denom;
    if (!Number.isFinite(t)) return null;

    const worldPoint = add3(runtime.preCamPos, scale3(dir, t));
    const clip = mulMat4Vec4(runtime.postPV, worldPoint.x, worldPoint.y, worldPoint.z, 1);
    if (Math.abs(clip.w) < 1e-9) return null;

    const xNdc = clip.x / clip.w;
    const yNdc = clip.y / clip.w;
    return {
      x: ((xNdc + 1) * 0.5 * originalWidth) / scaleX,
      y: ((1 - (yNdc + 1) * 0.5) * originalHeight) / scaleY,
    };
  };

  return (xCss: number, yCss: number): Point2 => mapPlane(xCss, yCss) ?? applyAffine(xCss, yCss);
}
