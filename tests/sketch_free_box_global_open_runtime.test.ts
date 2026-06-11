import test from 'node:test';
import assert from 'node:assert/strict';

import { handleCanvasDoorToggleClick } from '../esm/native/services/canvas_picking_toggle_flow.js';
import {
  resolveSketchFreeBoxToggleScope,
  toggleSketchFreeBoxOpen,
} from '../esm/native/services/canvas_picking_toggle_flow_sketch_free_box.js';
import { syncVisualsNow } from '../esm/native/services/doors_runtime_visuals_doors.js';
import { snapDrawersToTargets } from '../esm/native/services/doors_runtime_visuals_drawers.js';
import { updateRenderLoopDoorMotions } from '../esm/native/platform/render_loop_motion_doors.js';
import { recordSketchFreeBoxMotionToggle } from '../esm/native/runtime/sketch_free_box_motion_state.js';

function makeStore(state: Record<string, unknown>) {
  return {
    getState: () => state,
    patch(patch: Record<string, unknown>) {
      Object.assign(state, patch);
      if (patch.runtime && typeof patch.runtime === 'object') {
        state.runtime = {
          ...((state.runtime as Record<string, unknown>) || {}),
          ...(patch.runtime as Record<string, unknown>),
        };
      }
    },
  };
}

function makeVec(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    copy(target: { x: number; y: number; z: number }) {
      this.x = target.x;
      this.y = target.y;
      this.z = target.z;
    },
  };
}

function makeHit(userData: Record<string, unknown>, parent: unknown = null) {
  return { userData, parent };
}

test('free box click resolves its own global-open scope from a non-door shell hit', () => {
  const scope = resolveSketchFreeBoxToggleScope(
    makeHit({
      partId: 'sketch_box_free_0_freeAlpha',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
    }) as never,
    null
  );

  assert.deepEqual(scope, {
    boxId: 'freeAlpha',
    moduleKey: '0',
    prefix: 'sketch_box_free_0_freeAlpha',
  });
});

test('free box global-open toggle opens and closes only matching free-box doors and drawers', () => {
  const freeDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_door_main',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoorId: 'main',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
  };
  const nestedBoxDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_0_nestedAlpha_door_main',
      __wpSketchBoxId: 'nestedAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoorId: 'main',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: false,
    },
  };
  const freeExternalDrawerGroup = {
    position: makeVec(),
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_ext_drawers_ext1_0',
      __wpType: 'extDrawer',
      __wpSketchExtDrawer: true,
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchFreePlacement: true,
    },
  };
  const freeInternalDrawerGroup = {
    position: makeVec(),
    userData: { partId: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower' },
  };
  const mainExternalDrawerGroup = {
    position: makeVec(),
    userData: { partId: 'drawer_ext_main', __wpType: 'extDrawer' },
  };
  const app: Record<string, unknown> = {
    store: makeStore({
      runtime: { globalClickMode: true, doorsOpen: false },
      mode: { primary: 'none', opts: {} },
      ui: {},
      config: {},
      meta: {},
    }),
    services: { platform: { activity: {} }, config: {}, tools: { getDrawersOpenId: () => null } },
    render: {
      doorsArray: [
        { group: freeDoorGroup, type: 'hinged', hingeSide: 'left', isOpen: false, noGlobalOpen: true },
        { group: nestedBoxDoorGroup, type: 'hinged', hingeSide: 'left', isOpen: false, noGlobalOpen: true },
      ],
      drawersArray: [
        {
          id: 'sketch_box_free_0_freeAlpha_ext_drawers_ext1_0',
          group: freeExternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(5, 0, 0),
          isInternal: false,
          isOpen: false,
        },
        {
          id: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower',
          group: freeInternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(0, 0, 5),
          isInternal: true,
          isOpen: false,
        },
        {
          id: 'drawer_ext_main',
          group: mainExternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(10, 0, 0),
          isInternal: false,
          isOpen: false,
        },
      ],
    },
  };

  const handledOpen = toggleSketchFreeBoxOpen(app as never, {
    boxId: 'freeAlpha',
    moduleKey: '0',
    prefix: 'sketch_box_free_0_freeAlpha',
  });

  assert.equal(handledOpen, true);
  assert.equal((app.render as any).doorsArray[0].isOpen, true);
  assert.equal((app.render as any).doorsArray[1].isOpen, false);
  assert.equal((app.render as any).drawersArray[0].isOpen, true);
  assert.equal((app.render as any).drawersArray[1].isOpen, true);
  assert.equal((app.render as any).drawersArray[2].isOpen, false);

  toggleSketchFreeBoxOpen(app as never, {
    boxId: 'freeAlpha',
    moduleKey: '0',
    prefix: 'sketch_box_free_0_freeAlpha',
  });

  assert.equal((app.render as any).doorsArray[0].isOpen, false);
  assert.equal((app.render as any).drawersArray[0].isOpen, false);
  assert.equal((app.render as any).drawersArray[1].isOpen, false);
});

test('global wardrobe click no longer opens free-box drawers; free-box drawer motion follows local state with internal delay', () => {
  const now = Date.now();
  const freeExternalDrawerGroup = {
    position: makeVec(0, 0, 0),
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_ext_drawers_ext1_0',
      __wpType: 'extDrawer',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchFreePlacement: true,
    },
  };
  const freeInternalDrawerGroup = {
    position: makeVec(0, 0, 0),
    userData: { partId: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower' },
  };
  const mainExternalDrawerGroup = {
    position: makeVec(0, 0, 0),
    userData: { partId: 'drawer_ext_main', __wpType: 'extDrawer' },
  };
  const state = {
    runtime: { globalClickMode: true, doorsOpen: true, doorsLastToggleTime: now },
    mode: { primary: 'none', opts: {} },
    ui: {},
    config: { DOOR_DELAY_MS: 600 },
    meta: {},
  };
  const app: Record<string, unknown> = {
    store: makeStore(state),
    services: {
      config: {},
      tools: { getDrawersOpenId: () => null },
      platform: { perf: { hasInternalDrawers: false } },
    },
    render: {
      drawersArray: [
        {
          id: 'sketch_box_free_0_freeAlpha_ext_drawers_ext1_0',
          group: freeExternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(5, 0, 0),
          isInternal: false,
          isOpen: false,
        },
        {
          id: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower',
          group: freeInternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(0, 0, 5),
          isInternal: true,
          isOpen: true,
        },
        {
          id: 'drawer_ext_main',
          group: mainExternalDrawerGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(10, 0, 0),
          isInternal: false,
          isOpen: false,
        },
      ],
    },
  };

  snapDrawersToTargets(app as never);

  assert.equal(freeExternalDrawerGroup.position.x, 0);
  assert.equal(freeInternalDrawerGroup.position.z, 0);
  assert.equal(mainExternalDrawerGroup.position.x, 10);

  (app.store as any).getState().runtime.doorsLastToggleTime = now - 1000;
  (app.render as any).drawersArray[0].isOpen = true;
  snapDrawersToTargets(app as never);

  assert.equal(freeExternalDrawerGroup.position.x, 5);
  assert.equal(freeInternalDrawerGroup.position.z, 5);
});

test('canvas free-box shell click is consumed before the main wardrobe global toggle', () => {
  const freeDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_door_main',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoorId: 'main',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
  };
  const freeShellHit = makeHit({
    partId: 'sketch_box_free_0_freeAlpha',
    __wpSketchBoxId: 'freeAlpha',
    __wpSketchModuleKey: '0',
  });
  const state = {
    runtime: { globalClickMode: true, doorsOpen: false },
    mode: { primary: 'none', opts: {} },
    ui: {},
    config: {},
    meta: {},
  };
  const app: Record<string, unknown> = {
    store: makeStore(state),
    constants: { modes: { NONE: 'none', SCREEN_NOTE: 'screen_note' } },
    services: {
      doors: { runtime: {} },
      platform: { activity: {} },
      config: {},
      tools: { getDrawersOpenId: () => null },
    },
    render: {
      doorsArray: [
        { group: freeDoorGroup, type: 'hinged', hingeSide: 'left', isOpen: false, noGlobalOpen: true },
      ],
      drawersArray: [],
    },
  };

  handleCanvasDoorToggleClick({
    App: app as never,
    primaryMode: 'none',
    primaryHitObject: freeShellHit as never,
    effectiveDoorId: null,
    foundPartId: 'sketch_box_free_0_freeAlpha',
    foundModuleIndex: '0',
    foundModuleStack: 'top',
  });

  assert.equal((app.render as any).doorsArray[0].isOpen, true);
  assert.equal((app.store as any).getState().runtime.doorsOpen, false);
});

test('free box internal drawer delay is scoped per free box toggle', () => {
  const now = Date.now();
  const freeAlphaInternalGroup = {
    position: makeVec(0, 0, 0),
    userData: { partId: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower' },
  };
  const freeBetaInternalGroup = {
    position: makeVec(0, 0, 0),
    userData: { partId: 'sketch_box_free_0_freeBeta_int_drawers_int1_lower' },
  };
  const app: Record<string, unknown> = {
    store: makeStore({
      runtime: { globalClickMode: true, doorsOpen: false, doorsLastToggleTime: now },
      mode: { primary: 'none', opts: {} },
      ui: {},
      config: { DOOR_DELAY_MS: 600 },
      meta: {},
    }),
    services: {
      doors: { runtime: {} },
      config: {},
      tools: { getDrawersOpenId: () => null },
      platform: { perf: { hasInternalDrawers: false } },
    },
    render: {
      drawersArray: [
        {
          id: 'sketch_box_free_0_freeAlpha_int_drawers_int1_lower',
          group: freeAlphaInternalGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(0, 0, 5),
          isInternal: true,
          isOpen: true,
        },
        {
          id: 'sketch_box_free_0_freeBeta_int_drawers_int1_lower',
          group: freeBetaInternalGroup,
          closed: makeVec(0, 0, 0),
          open: makeVec(0, 0, 7),
          isInternal: true,
          isOpen: true,
        },
      ],
    },
  };

  recordSketchFreeBoxMotionToggle(
    app as never,
    { boxId: 'freeAlpha', moduleKey: '0', prefix: 'sketch_box_free_0_freeAlpha' },
    true,
    { hasInternalDrawers: true, delayMs: 600, now: now - 1000 }
  );
  recordSketchFreeBoxMotionToggle(
    app as never,
    { boxId: 'freeBeta', moduleKey: '0', prefix: 'sketch_box_free_0_freeBeta' },
    true,
    { hasInternalDrawers: true, delayMs: 600, now }
  );

  snapDrawersToTargets(app as never);

  assert.equal(freeAlphaInternalGroup.position.z, 5);
  assert.equal(freeBetaInternalGroup.position.z, 0);
});

test('free box close holds doors until internal drawers have had the delay window to close', () => {
  const now = Date.now();
  const freeDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_door_main',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
  };
  const app: Record<string, unknown> = {
    services: { doors: { runtime: {} } },
    render: {
      doorsArray: [
        {
          group: freeDoorGroup,
          type: 'hinged',
          hingeSide: 'left',
          isOpen: false,
          noGlobalOpen: true,
        },
      ],
    },
  };

  const scope = { boxId: 'freeAlpha', moduleKey: '0', prefix: 'sketch_box_free_0_freeAlpha' };
  recordSketchFreeBoxMotionToggle(app as never, scope, false, {
    hasInternalDrawers: true,
    delayMs: 600,
    now,
  });

  updateRenderLoopDoorMotions(app as never, {
    hasInternalDrawers: true,
    doorsShouldBeOpen: false,
    internalDrawersShouldBeOpen: false,
    externalDrawersShouldBeOpen: false,
    isAnimating: true,
    isActiveState: true,
    globalClickMode: true,
    platformDimsFrame: null,
    doorsOpenFlag: false,
    sketchEditActive: false,
    sketchIntDrawersEditActive: false,
    sketchExtDrawersEditActive: false,
    forcedOpenDrawerId: null,
    manualTool: null,
    delayTime: 600,
    timeSinceToggle: 0,
    localDoorModules: new Set<string>(),
    hasAnyLocalOpenDoor: false,
    visibleOpenInternalDrawerModules: new Set<string>(),
  });

  assert.notEqual(freeDoorGroup.rotation.y, 0);

  freeDoorGroup.rotation.y = 0;
  recordSketchFreeBoxMotionToggle(app as never, scope, false, {
    hasInternalDrawers: true,
    delayMs: 600,
    now: now - 1000,
  });

  updateRenderLoopDoorMotions(app as never, {
    hasInternalDrawers: true,
    doorsShouldBeOpen: false,
    internalDrawersShouldBeOpen: false,
    externalDrawersShouldBeOpen: false,
    isAnimating: false,
    isActiveState: false,
    globalClickMode: true,
    platformDimsFrame: null,
    doorsOpenFlag: false,
    sketchEditActive: false,
    sketchIntDrawersEditActive: false,
    sketchExtDrawersEditActive: false,
    forcedOpenDrawerId: null,
    manualTool: null,
    delayTime: 600,
    timeSinceToggle: 1000,
    localDoorModules: new Set<string>(),
    hasAnyLocalOpenDoor: false,
    visibleOpenInternalDrawerModules: new Set<string>(),
  });

  assert.equal(freeDoorGroup.rotation.y, 0);
});

test('regular external drawer edit keeps locally-open free-box doors open across post-build sync', () => {
  const freeDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_door_main',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
  };
  const app: Record<string, unknown> = {
    store: makeStore({
      runtime: { globalClickMode: true, doorsOpen: false },
      mode: { primary: 'ext_drawer', opts: { extDrawerType: 'regular', extDrawerCount: 3 } },
      ui: {},
      config: {},
      meta: {},
    }),
    constants: { modes: { EXT_DRAWER: 'ext_drawer' } },
    services: {
      config: {},
      tools: { getDrawersOpenId: () => null },
      platform: { activity: {} },
    },
    render: {
      doorsArray: [
        {
          group: freeDoorGroup,
          type: 'hinged',
          hingeSide: 'left',
          isOpen: true,
          noGlobalOpen: true,
        },
      ],
      drawersArray: [],
    },
  };

  syncVisualsNow(app as never, { open: false });

  assert.equal((app.render as any).doorsArray[0].isOpen, true);
  assert.notEqual(freeDoorGroup.rotation.y, 0);
});

test('regular external drawer edit lets free-box doors follow the current global-open state', () => {
  const freeDoorGroup = {
    position: makeVec(),
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_0_freeAlpha_door_main',
      __wpSketchBoxId: 'freeAlpha',
      __wpSketchModuleKey: '0',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
  };
  const app: Record<string, unknown> = {
    store: makeStore({
      runtime: { globalClickMode: true, doorsOpen: true },
      mode: { primary: 'ext_drawer', opts: { extDrawerType: 'regular', extDrawerCount: 3 } },
      ui: {},
      config: {},
      meta: {},
    }),
    constants: { modes: { EXT_DRAWER: 'ext_drawer' } },
    services: {
      config: {},
      tools: { getDrawersOpenId: () => null },
      platform: { activity: {} },
    },
    render: {
      doorsArray: [
        {
          group: freeDoorGroup,
          type: 'hinged',
          hingeSide: 'left',
          isOpen: false,
          noGlobalOpen: true,
        },
      ],
      drawersArray: [],
    },
  };

  syncVisualsNow(app as never, { open: true });

  assert.notEqual(freeDoorGroup.rotation.y, 0);
});
