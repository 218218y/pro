import type { AppContainer, UnknownRecord } from '../../../types';

import { readConfigScalarOrDefaultFromApp } from '../runtime/config_selectors.js';
import { getDrawersArray, getRenderSlot, setRenderSlot } from '../runtime/render_access.js';
import { asRecord, readFiniteNumber, readFiniteNumberOrNull } from '../runtime/render_runtime_primitives.js';
import { getDrawerModuleKey } from '../runtime/doors_runtime_support.js';

import type { DebugLogFn, MotionFrameState } from './render_loop_motion_shared.js';
import { asDrawerMotion, asRecordOrNull, moveDrawerGroupPosition } from './render_loop_motion_shared.js';

export function updateRenderLoopDrawerMotions(
  App: AppContainer,
  frame: MotionFrameState,
  deps: { now: () => number; debugLog: DebugLogFn }
): void {
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
    const group = d.group;
    const userData = asRecord<UnknownRecord>(asRecordOrNull(group)?.userData, {});
    const isSketchExtDrawer = !!(userData && userData['__wpSketchExtDrawer'] === true);
    let isInternal = typeof wardrobeType !== 'undefined' && wardrobeType === 'sliding';
    if (!isInternal) {
      if (typeof d.isInternal === 'undefined') d.isInternal = !!(d.id && String(d.id).includes('int'));
      isInternal = !!d.isInternal;
    }

    let shouldOpen = frame.globalClickMode
      ? isInternal
        ? frame.internalDrawersShouldBeOpen
        : frame.externalDrawersShouldBeOpen
      : !!d.isOpen;

    if (!frame.globalClickMode && isInternal) {
      const moduleKey = getDrawerModuleKey(d);
      const matchesOpenModule = moduleKey ? frame.localDoorModules.has(moduleKey) : frame.hasAnyLocalOpenDoor;
      shouldOpen = !!(matchesOpenModule && frame.timeSinceToggle > frame.delayTime);
    }

    if (frame.sketchExtDrawersEditActive && isSketchExtDrawer) {
      shouldOpen = false;
      try {
        d.isOpen = false;
      } catch {
        // ignore
      }
    }

    if (frame.sketchIntDrawersEditActive || frame.intDrawerEditActive) {
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
    } else if (frame.forcedOpenDrawerId != null && d.id === frame.forcedOpenDrawerId) {
      shouldOpen = true;
    }

    if (!group) continue;
    const target = shouldOpen ? d.open : d.closed;
    moveDrawerGroupPosition(group, target);

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
}
