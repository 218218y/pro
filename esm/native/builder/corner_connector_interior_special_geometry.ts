// Corner connector special interior geometry helpers.
//
// This owner contains polygon inset/shape conversion only. Scene mutation stays
// in the apply owner.

import type { CornerConnectorInteriorFlowParams, P2 } from './corner_connector_interior_shared.js';

export function createInsetPolygon(
  polygon: readonly P2[],
  interiorPoint: { x: number; z: number },
  edgeInsets: readonly number[]
): P2[] | null {
  const n = polygon.length;
  if (n < 3) return null;

  const lines: Array<{ nx: number; nz: number; c: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= 1e-6) return null;

    const nux = -dz / len;
    const nuz = dx / len;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const vix = interiorPoint.x - midX;
    const viz = interiorPoint.z - midZ;
    const dot = nux * vix + nuz * viz;
    const sign = dot >= 0 ? 1 : -1;
    const nx = nux * sign;
    const nz = nuz * sign;
    const d = Math.max(0, Number(edgeInsets[i] ?? 0));
    const c = nx * a.x + nz * a.z + d;
    lines.push({ nx, nz, c });
  }

  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    const det = prev.nx * cur.nz - prev.nz * cur.nx;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) return null;
    const x = (prev.c * cur.nz - prev.nz * cur.c) / det;
    const z = (prev.nx * cur.c - prev.c * cur.nx) / det;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    out.push({ x, z });
  }
  return out;
}

export function createShapeFromPolygon(
  THREE: CornerConnectorInteriorFlowParams['ctx']['THREE'],
  polygon: readonly P2[] | null | undefined
): unknown | null {
  if (!Array.isArray(polygon) || polygon.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(polygon[0].x, polygon[0].z);
  for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, polygon[i].z);
  shape.lineTo(polygon[0].x, polygon[0].z);
  return shape;
}
