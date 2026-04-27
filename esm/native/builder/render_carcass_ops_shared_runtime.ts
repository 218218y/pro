import type { GroupLike, ThreeCtorLike } from './render_carcass_ops_shared_contracts.js';
import { __isRecord } from './render_carcass_ops_shared_readers.js';

function __isThreeCtorLike(value: unknown): value is ThreeCtorLike {
  const rec = __isRecord(value) ? value : null;
  return !!(
    rec &&
    typeof rec.Mesh === 'function' &&
    typeof rec.Group === 'function' &&
    typeof rec.BoxGeometry === 'function' &&
    typeof rec.CylinderGeometry === 'function' &&
    typeof rec.MeshBasicMaterial === 'function'
  );
}

function __isGroupLike(value: unknown): value is GroupLike {
  const rec = __isRecord(value) ? value : null;
  return !!(rec && typeof rec.add === 'function');
}

export function __readThreeCtorLike(value: unknown): ThreeCtorLike | null {
  return __isThreeCtorLike(value) ? value : null;
}

export function __readGroupLike(value: unknown): GroupLike | null {
  return __isGroupLike(value) ? value : null;
}
