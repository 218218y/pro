import type { UnknownRecord } from '../../../types';

import {
  type AppLike,
  type FrontOverlayState,
  type MaterialWithOpacityLike,
  type TraversableLike,
  asMaterialUserData,
  asMaterialWithOpacity,
  asRecordOrNull,
  asTraversable,
} from './render_loop_impl_support.js';

type ReportFn = (op: string, err: unknown, opts?: { throttleMs?: number }) => void;
type RenderSlotReader = <T = unknown>(app: AppLike, key: string) => T | null;
type RenderSlotWriter = (app: AppLike, key: string, value: unknown) => void;

type Helpers = {
  frontOverlayState: () => FrontOverlayState;
  applyOpacityScale: (obj: TraversableLike | null, alpha: number) => void;
  collectFrontOverlayNodes: (root: { traverse: (cb: (obj: unknown) => void) => void }) => TraversableLike[];
  isTaggedMirrorSurface: (obj: UnknownRecord | null) => boolean;
  tryHideMirrorSurface: (obj: UnknownRecord | null, tex: unknown, mirrorsToHide: UnknownRecord[]) => boolean;
};

export function createRenderLoopFrontOverlayHelpers(
  A: AppLike,
  deps: {
    report: ReportFn;
    getRenderSlot: RenderSlotReader;
    setRenderSlot: RenderSlotWriter;
  }
): Helpers {
  const { report, getRenderSlot, setRenderSlot } = deps;

  function ensureRenderObjectSlot<T extends UnknownRecord>(key: string, create: () => T): T {
    const cur = getRenderSlot<T>(A, key);
    if (cur && typeof cur === 'object') return cur;
    const next = create();
    setRenderSlot(A, key, next);
    return next;
  }

  function frontOverlayState(): FrontOverlayState {
    return ensureRenderObjectSlot<FrontOverlayState>('__frontOverlaySeamsState', () => ({
      prevGlobalDoorsOpen: false,
      transitionUntilMs: 0,
      frameCounter: 0,
      cache: null,
    }));
  }

  function materialList(node: TraversableLike | null): MaterialWithOpacityLike[] {
    if (!node) return [];
    const material = node.material;
    if (!material) return [];
    if (Array.isArray(material)) {
      return material.filter((item): item is MaterialWithOpacityLike => !!item && typeof item === 'object');
    }
    const single = asMaterialWithOpacity(material);
    return single ? [single] : [];
  }

  function applyOpacityScaleToNode(node: TraversableLike | null, alpha: number): void {
    if (!node) return;
    const mats = materialList(node);
    for (let mi = 0; mi < mats.length; mi++) {
      const material = mats[mi];
      if (!material || typeof material.opacity !== 'number') continue;
      try {
        const userData = asMaterialUserData(material.userData);
        material.userData = userData;
        if (typeof userData.__wpBaseOpacity !== 'number') userData.__wpBaseOpacity = material.opacity;
        if (typeof userData.__wpBaseTransparent !== 'boolean') {
          userData.__wpBaseTransparent = !!material.transparent;
        }
        if (alpha >= 0.999) {
          material.opacity = userData.__wpBaseOpacity;
          material.transparent = userData.__wpBaseTransparent;
        } else {
          material.opacity = userData.__wpBaseOpacity * alpha;
          material.transparent = true;
        }
      } catch (_e) {
        report('frontSeams.applyOpacityScaleToNode', _e, { throttleMs: 5000 });
      }
    }
  }

  function applyOpacityScale(obj: TraversableLike | null, alpha: number): void {
    if (!obj) return;
    try {
      if (typeof obj.traverse === 'function') {
        obj.traverse(candidate => {
          applyOpacityScaleToNode(asTraversable(candidate), alpha);
        });
        return;
      }
      applyOpacityScaleToNode(obj, alpha);
    } catch (_e) {
      try {
        applyOpacityScaleToNode(obj, alpha);
      } catch (_e2) {
        report('frontSeams.applyOpacityScaleFallback', _e2, { throttleMs: 5000 });
      }
    }
  }

  function collectFrontOverlayNodes(root: {
    traverse: (cb: (obj: unknown) => void) => void;
  }): TraversableLike[] {
    const list: TraversableLike[] = [];
    root.traverse(candidate => {
      const obj = asTraversable(candidate);
      const userData = obj && obj.userData && typeof obj.userData === 'object' ? obj.userData : null;
      if (!obj || !userData || userData.hideWhenOpen !== true) return;
      if (typeof userData.__wpBaseVisible !== 'boolean') userData.__wpBaseVisible = !!obj.visible;
      list.push(obj);
    });
    return list;
  }

  function isTaggedMirrorSurface(obj: UnknownRecord | null): boolean {
    if (!obj) return false;
    const userData = asRecordOrNull(obj.userData);
    return userData ? userData.__wpMirrorSurface === true : false;
  }

  function tryHideMirrorSurface(
    obj: UnknownRecord | null,
    tex: unknown,
    mirrorsToHide: UnknownRecord[]
  ): boolean {
    void tex;
    if (!obj || !obj.isMesh) return false;
    if (!isTaggedMirrorSurface(obj)) return false;
    if (obj.visible === false) return true;
    obj.visible = false;
    mirrorsToHide.push(obj);
    return true;
  }

  return {
    frontOverlayState,
    applyOpacityScale,
    collectFrontOverlayNodes,
    isTaggedMirrorSurface,
    tryHideMirrorSurface,
  };
}
