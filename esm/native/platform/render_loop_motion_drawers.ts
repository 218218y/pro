import type { AppContainer } from '../../../types';

import { readConfigScalarOrDefaultFromApp } from '../runtime/config_selectors.js';
import {
  getDrawersArray,
  getRenderSlot,
  readRenderCacheValue,
  setRenderSlot,
} from '../runtime/render_access.js';
import { readFiniteNumber, readFiniteNumberOrNull } from '../runtime/render_runtime_primitives.js';
import { getDrawerModuleKey } from '../runtime/doors_runtime_support.js';
import { drawerVisualMatchesId, isExplicitExternalDrawerVisual } from '../runtime/drawer_visual_identity.js';
import {
  getSketchFreeBoxMotionScopeFromEntry,
  isSketchFreeBoxInternalDrawerEntry,
} from '../runtime/sketch_free_box_motion_identity.js';
import { readSketchFreeBoxMotionTimeSinceToggle } from '../runtime/sketch_free_box_motion_state.js';

import type { DebugLogFn, MotionFrameState } from './render_loop_motion_shared.js';
import { asDrawerMotion, moveDrawerGroupPosition } from './render_loop_motion_shared.js';

type PreviewMeshMotionLike = {
  visible?: boolean;
  position?: { x?: number; y?: number; z?: number; set?: (x: number, y: number, z: number) => unknown };
};

type DrawerDividerMotionPreviewState = {
  drawerId: string | number;
  closedX: number;
  closedY: number;
  closedZ: number;
  boxBaseX: number;
  boxBaseY: number;
  boxBaseZ: number;
  shelfBaseX: number;
  shelfBaseY: number;
  shelfBaseZ: number;
};

function readMotionPreviewNumber(rec: Record<string, unknown> | null, key: string): number | null {
  const n = Number(rec?.[key]);
  return Number.isFinite(n) ? n : null;
}

function readDrawerDividerMotionPreviewState(value: unknown): DrawerDividerMotionPreviewState | null {
  const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!rec) return null;
  const drawerId = rec.drawerId;
  if (typeof drawerId !== 'string' && typeof drawerId !== 'number') return null;
  const closedX = readMotionPreviewNumber(rec, 'closedX');
  const closedY = readMotionPreviewNumber(rec, 'closedY');
  const closedZ = readMotionPreviewNumber(rec, 'closedZ');
  const boxBaseX = readMotionPreviewNumber(rec, 'boxBaseX');
  const boxBaseY = readMotionPreviewNumber(rec, 'boxBaseY');
  const boxBaseZ = readMotionPreviewNumber(rec, 'boxBaseZ');
  const shelfBaseX = readMotionPreviewNumber(rec, 'shelfBaseX');
  const shelfBaseY = readMotionPreviewNumber(rec, 'shelfBaseY');
  const shelfBaseZ = readMotionPreviewNumber(rec, 'shelfBaseZ');
  if (
    closedX == null ||
    closedY == null ||
    closedZ == null ||
    boxBaseX == null ||
    boxBaseY == null ||
    boxBaseZ == null ||
    shelfBaseX == null ||
    shelfBaseY == null ||
    shelfBaseZ == null
  ) {
    return null;
  }
  return {
    drawerId,
    closedX,
    closedY,
    closedZ,
    boxBaseX,
    boxBaseY,
    boxBaseZ,
    shelfBaseX,
    shelfBaseY,
    shelfBaseZ,
  };
}

function setPreviewMeshPosition(mesh: PreviewMeshMotionLike | null, x: number, y: number, z: number): void {
  if (!mesh || !mesh.position) return;
  if (typeof mesh.position.set === 'function') {
    mesh.position.set(x, y, z);
    return;
  }
  mesh.position.x = x;
  mesh.position.y = y;
  mesh.position.z = z;
}

function syncDrawerDividerMotionPreview(App: AppContainer, drawer: ReturnType<typeof asDrawerMotion>): void {
  if (!drawer || !drawer.group?.position) return;
  try {
    const preview = readRenderCacheValue<Record<string, unknown>>(App, 'sketchPlacementPreview');
    const userData =
      preview && typeof preview.userData === 'object' ? (preview.userData as Record<string, unknown>) : null;
    const state = readDrawerDividerMotionPreviewState(userData?.__drawerDividerMotionPreview);
    if (!state || !drawerVisualMatchesId(drawer, state.drawerId)) return;

    const pos = drawer.group.position;
    const offsetX = readFiniteNumber(pos.x, state.closedX) - state.closedX;
    const offsetY = readFiniteNumber(pos.y, state.closedY) - state.closedY;
    const offsetZ = readFiniteNumber(pos.z, state.closedZ) - state.closedZ;

    const boxTop = userData?.__boxTop as PreviewMeshMotionLike | null;
    const shelfA = userData?.__shelfA as PreviewMeshMotionLike | null;
    setPreviewMeshPosition(
      boxTop,
      state.boxBaseX + offsetX,
      state.boxBaseY + offsetY,
      state.boxBaseZ + offsetZ
    );
    setPreviewMeshPosition(
      shelfA,
      state.shelfBaseX + offsetX,
      state.shelfBaseY + offsetY,
      state.shelfBaseZ + offsetZ
    );
  } catch {
    // Preview syncing is visual-only; drawer motion must never fail because of it.
  }
}

export function updateRenderLoopDrawerMotions(
  App: AppContainer,
  frame: MotionFrameState,
  deps: { now: () => number; debugLog: DebugLogFn }
): boolean {
  let hasActiveDrawerMotion = false;
  const wardrobeType = readConfigScalarOrDefaultFromApp(App, 'wardrobeType');

  try {
    const prev = !!getRenderSlot<boolean>(App, '__wpSketchDbgPrevSketch');
    if (prev !== !!frame.sketchEditActive) {
      setRenderSlot(App, '__wpSketchDbgPrevSketch', !!frame.sketchEditActive);
      deps.debugLog(
        App,
        'sketchEdit=',
        !!frame.sketchEditActive,
        'manualTool=',
        frame.manualTool,
        'doorsOpen=',
        !!frame.doorsOpenFlag,
        'drawersCount=',
        getDrawersArray(App).length
      );
    }
  } catch {
    // ignore
  }

  const drawers = getDrawersArray(App);
  for (let i = 0; i < drawers.length; i++) {
    const d = asDrawerMotion(drawers[i]);
    if (!d) continue;
    const sketchFreeBoxScope = getSketchFreeBoxMotionScopeFromEntry(d);
    const isSketchFreeBoxLocalDrawer = !!sketchFreeBoxScope;
    const isSketchFreeBoxInternalDrawer = isSketchFreeBoxInternalDrawerEntry(d);
    const group = d.group;
    let isInternal = typeof wardrobeType !== 'undefined' && wardrobeType === 'sliding';
    if (isSketchFreeBoxLocalDrawer) {
      isInternal = isSketchFreeBoxInternalDrawer;
      d.isInternal = isInternal;
    } else if (!isInternal) {
      if (isExplicitExternalDrawerVisual(d)) {
        d.isInternal = false;
        isInternal = false;
      } else {
        if (typeof d.isInternal === 'undefined') d.isInternal = !!(d.id && String(d.id).includes('int'));
        isInternal = !!d.isInternal;
      }
    }
    const scopedTimeSinceToggle = isSketchFreeBoxLocalDrawer
      ? readSketchFreeBoxMotionTimeSinceToggle(App, sketchFreeBoxScope, frame.timeSinceToggle)
      : frame.timeSinceToggle;

    let shouldOpen = frame.globalClickMode
      ? isSketchFreeBoxLocalDrawer
        ? isInternal
          ? !!d.isOpen && scopedTimeSinceToggle > frame.delayTime
          : !!d.isOpen
        : isInternal
          ? frame.internalDrawersShouldBeOpen
          : frame.externalDrawersShouldBeOpen
      : !!d.isOpen;

    if (!frame.globalClickMode && isInternal) {
      const moduleKey = getDrawerModuleKey(d);
      const matchesOpenModule = moduleKey ? frame.localDoorModules.has(moduleKey) : frame.hasAnyLocalOpenDoor;
      shouldOpen = !!(matchesOpenModule && scopedTimeSinceToggle > frame.delayTime);
    }

    const forceClosedBySketchExternalDrawerEdit = frame.sketchExtDrawersEditActive && !isInternal;
    if (forceClosedBySketchExternalDrawerEdit) {
      shouldOpen = false;
      try {
        d.isOpen = false;
      } catch {
        // ignore
      }
    }

    if (frame.sketchIntDrawersEditActive) {
      shouldOpen = false;
      try {
        d.isOpen = false;
      } catch {
        // ignore
      }
    } else if (frame.sketchEditActive && isInternal) {
      shouldOpen = false;
      try {
        d.isOpen = false;
      } catch {
        // ignore
      }
    } else if (
      !forceClosedBySketchExternalDrawerEdit &&
      frame.forcedOpenDrawerId != null &&
      drawerVisualMatchesId(d, frame.forcedOpenDrawerId)
    ) {
      shouldOpen = true;
    }

    if (!group) continue;
    const target = shouldOpen ? d.open : d.closed;
    if (moveDrawerGroupPosition(group, target)) {
      hasActiveDrawerMotion = true;
    }
    syncDrawerDividerMotionPreview(App, d);

    if (frame.sketchEditActive && isInternal && target === d.closed) {
      try {
        const last = getRenderSlot<number>(App, '__wpSketchDbgMisalignTs') || 0;
        const now = deps.now();
        if (now - last > 800) {
          const p = group.position;
          const c = d.closed;
          const dx =
            readFiniteNumberOrNull(p?.x) !== null && readFiniteNumberOrNull(c?.x) !== null
              ? Math.abs(readFiniteNumber(p?.x, 0) - readFiniteNumber(c?.x, 0))
              : 0;
          const dz =
            readFiniteNumberOrNull(p?.z) !== null && readFiniteNumberOrNull(c?.z) !== null
              ? Math.abs(readFiniteNumber(p?.z, 0) - readFiniteNumber(c?.z, 0))
              : 0;
          if (dx > 0.01 || dz > 0.01) {
            setRenderSlot(App, '__wpSketchDbgMisalignTs', now);
            deps.debugLog(App, 'drawerNotClosed', {
              id: d.id,
              dx,
              dz,
              pos: { x: p?.x, y: p?.y, z: p?.z },
              closed: { x: c?.x, y: c?.y, z: c?.z },
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return hasActiveDrawerMotion;
}
