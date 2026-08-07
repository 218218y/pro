import type { Vec3Like } from '../../../types';

import {
  readCameraWritable,
  readControlsWritable,
  readFiniteNumber,
  readObject3DWritable,
  readRendererWritable,
  readVec3Writable,
} from './render_surface_runtime_support_shared.js';
import { readObject3DLike } from './render_surface_runtime_support_readers.js';

export function writeVec3(target: unknown, x: number, y: number, z: number): boolean {
  try {
    const vec = readVec3Writable(target);
    if (!vec) return false;
    if (typeof vec.set === 'function') {
      vec.set(x, y, z);
      return true;
    }
    vec.x = x;
    vec.y = y;
    vec.z = z;
    return true;
  } catch {
    return false;
  }
}

export function cloneVec3Like(target: unknown): Vec3Like | null {
  const vec = readVec3Writable(target);
  if (!vec) return null;

  if (typeof vec.clone === 'function') {
    try {
      const clone = readVec3Writable(vec.clone());
      if (clone) {
        return {
          x: readFiniteNumber(clone.x, 0),
          y: readFiniteNumber(clone.y, 0),
          z: readFiniteNumber(clone.z, 0),
        };
      }
    } catch {
      // A host clone() implementation may throw. Reading the live vector values
      // is still a safe snapshot fallback and avoids fabricating a zero vector.
    }
  }

  try {
    return {
      x: readFiniteNumber(vec.x, 0),
      y: readFiniteNumber(vec.y, 0),
      z: readFiniteNumber(vec.z, 0),
    };
  } catch {
    return null;
  }
}

export function updateCameraAndControls(camera: unknown, controls: unknown): boolean {
  const cam = readCameraWritable(camera);
  const ctl = readControlsWritable(controls);
  if (!cam || !ctl) return false;

  try {
    if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix();
  } catch {
    return false;
  }

  try {
    if (typeof ctl.update === 'function') ctl.update();
  } catch {
    return false;
  }

  return true;
}

export function addNode(parent: unknown, child: unknown): boolean {
  try {
    const obj = readObject3DWritable(parent);
    const childNode = readObject3DLike(child);
    if (!obj || !childNode || typeof obj.add !== 'function') return false;
    obj.add(childNode);
    return true;
  } catch {
    return false;
  }
}

export function ensureRendererShadowMap(renderer: unknown, shadowType: unknown, enabled = true): void {
  const rr = readRendererWritable(renderer);
  if (!rr) return;
  rr.shadowMap = typeof rr.shadowMap === 'object' && rr.shadowMap !== null ? rr.shadowMap : {};
  rr.shadowMap.enabled = !!enabled;
  rr.shadowMap.type = shadowType;
  rr.shadowMap.autoUpdate = false;
}

export function setControlsEnableDamping(controls: unknown, enabled: boolean): boolean {
  const ctl = readControlsWritable(controls);
  if (!ctl) return false;
  ctl.enableDamping = enabled;
  return true;
}

export function scalePositionAroundTarget(position: unknown, target: unknown, factor: number): boolean {
  const pos = readVec3Writable(position);
  const tgt = readVec3Writable(target);
  if (!pos || !tgt) return false;

  if (typeof pos.sub === 'function' && typeof pos.add === 'function') {
    pos.sub(tgt);
    if (typeof pos.multiplyScalar === 'function') {
      pos.multiplyScalar(factor);
    } else {
      pos.x = readFiniteNumber(pos.x, 0) * factor;
      pos.y = readFiniteNumber(pos.y, 0) * factor;
      pos.z = readFiniteNumber(pos.z, 0) * factor;
    }
    pos.add(tgt);
    return true;
  }

  const px = readFiniteNumber(pos.x, 0) - readFiniteNumber(tgt.x, 0);
  const py = readFiniteNumber(pos.y, 0) - readFiniteNumber(tgt.y, 0);
  const pz = readFiniteNumber(pos.z, 0) - readFiniteNumber(tgt.z, 0);
  pos.x = readFiniteNumber(tgt.x, 0) + px * factor;
  pos.y = readFiniteNumber(tgt.y, 0) + py * factor;
  pos.z = readFiniteNumber(tgt.z, 0) + pz * factor;
  return true;
}
