import type { Object3DLike } from '../../../types/three_like';

type MovingFrontNodeLike = Object3DLike & {
  castShadow?: boolean;
  receiveShadow?: boolean;
  isMesh?: boolean;
  material?: { transparent?: boolean; opacity?: number } | null | undefined;
  traverse?: (fn: (obj: MovingFrontNodeLike) => void) => void;
};

function isInMovingFrontSubtree(obj: MovingFrontNodeLike | null | undefined): boolean {
  let p: MovingFrontNodeLike | null | undefined = obj;
  for (let i = 0; i < 8 && p; i++) {
    const ud = p.userData || {};
    const pid = ud.partId != null ? String(ud.partId) : '';
    if (ud.__wpCornerPentDoor || ud.__wpCornerPentDoorPair || ud.__wpDoorOpenDirSign) return true;
    if (
      (typeof ud.__doorWidth === 'number' && Number.isFinite(ud.__doorWidth)) ||
      (typeof ud.__doorHeight === 'number' && Number.isFinite(ud.__doorHeight)) ||
      (typeof ud.__wpFrontThickness === 'number' && Number.isFinite(ud.__wpFrontThickness))
    ) {
      return true;
    }
    if (pid) {
      const s = pid.toLowerCase();
      if (s.includes('door') || s.includes('drawer') || s.includes('_draw_') || s.includes('_draw')) {
        return true;
      }
    }
    p = p.parent;
  }
  return false;
}

export function createCornerWingStableShadowApplier(sketchMode: boolean) {
  return (root: MovingFrontNodeLike | null | undefined) => {
    if (sketchMode) return;
    if (!root || typeof root.traverse !== 'function') return;
    root.traverse((o: MovingFrontNodeLike) => {
      if (!o || !o.isMesh) return;
      const ud = o.userData || {};
      if (ud.isModuleSelector) {
        o.castShadow = false;
        o.receiveShadow = false;
        return;
      }
      if (ud.kind === 'drawerShadowPlane' || ud.kind === 'backPanel' || ud.__kind === 'brace_seam') return;
      if (isInMovingFrontSubtree(o)) {
        o.castShadow = false;
        o.receiveShadow = false;
        return;
      }

      const mat = o.material;
      if (
        mat &&
        !Array.isArray(mat) &&
        mat.transparent &&
        typeof mat.opacity === 'number' &&
        mat.opacity <= 0
      ) {
        o.castShadow = false;
        o.receiveShadow = false;
        return;
      }
      o.castShadow = true;
      o.receiveShadow = true;
    });
  };
}
