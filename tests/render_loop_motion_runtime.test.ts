import test from 'node:test';
import assert from 'node:assert/strict';

import { createRenderLoopMotionController } from '../esm/native/platform/render_loop_motion.js';

function makeStore(state: Record<string, unknown>) {
  return {
    getState: () => state,
    patch: () => undefined,
  };
}

function withRuntimeNow<T>(runtimeNow: number, run: () => T): T {
  const originalDateNow = Date.now;
  Date.now = () => runtimeNow;
  try {
    return run();
  } finally {
    Date.now = originalDateNow;
  }
}

test('render loop motion skips invalid door vectors and still updates valid doors', () => {
  withRuntimeNow(100, () => {
    const invalidDoorGroup = {
      position: { x: Number.NaN, y: 0, z: 0 },
      rotation: { y: 0 },
    };
    const validDoorGroup = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: 0 },
    };
    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: { getOpen: () => true },
        platform: {
          perf: { hasInternalDrawers: false, perfFlagsDirty: false },
          activity: { lastActionTime: 100 },
        },
      },
      render: {
        doorsArray: [
          {
            type: 'sliding',
            group: invalidDoorGroup,
            total: 2,
            index: 0,
            width: 1,
            originalX: 0,
            originalZ: 0,
          },
          {
            type: 'sliding',
            group: validDoorGroup,
            total: 2,
            index: 1,
            width: 1,
            originalX: 0,
            originalZ: 0,
          },
        ],
        drawersArray: [],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 100,
      debugLog: () => undefined,
    });

    const step = controller.stepFrame(100);

    assert.equal(step.isActiveState, true);
    assert.equal(step.isAnimating, true);
    assert.ok(Number.isNaN(invalidDoorGroup.position.x));
    assert.notEqual(validDoorGroup.position.x, 0);
  });
});

test('render loop motion opens free-box sketch doors during sketch internal drawers editing even when they are local-open only', () => {
  withRuntimeNow(100, () => {
    const doorGroup = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: 0 },
      userData: {
        partId: 'sketch_box_free_sbf_1_door_left',
        __wpSketchBoxDoor: true,
        __wpSketchFreePlacement: true,
        noGlobalOpen: true,
      },
    };
    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'manual_layout', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: { getOpen: () => true },
        tools: { getInteriorManualTool: () => 'sketch_int_drawers' },
        platform: {
          perf: { hasInternalDrawers: false, perfFlagsDirty: false },
          activity: { lastActionTime: 100 },
        },
      },
      render: {
        doorsArray: [
          { type: 'hinged', group: doorGroup, hingeSide: 'left', noGlobalOpen: true, isOpen: false },
        ],
        drawersArray: [],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 100,
      debugLog: () => undefined,
    });

    controller.stepFrame(100);

    assert.notEqual(doorGroup.rotation.y, 0);
  });
});

test('render loop motion uses runtime clock for delayed internal drawers instead of frame-performance clock', () => {
  const originalDateNow = Date.now;
  Date.now = () => 1_000_000;

  try {
    const internalDrawerGroup = {
      position: { x: 0, y: 0, z: 0 },
      userData: {},
    };

    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: {
          getOpen: () => true,
          getLastToggleTime: () => 999_000,
        },
        tools: { getDrawersOpenId: () => null },
        platform: {
          perf: { hasInternalDrawers: true, perfFlagsDirty: false },
          activity: { lastActionTime: 999_000 },
        },
        config: {},
      },
      render: {
        doorsArray: [],
        drawersArray: [
          {
            id: 'drawer-int-epoch',
            group: internalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 5, y: 0, z: 0 },
            isInternal: true,
            isOpen: false,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 500,
      debugLog: () => undefined,
    });

    controller.stepFrame(500);

    assert.equal(internalDrawerGroup.position.x, 5);
  } finally {
    Date.now = originalDateNow;
  }
});

test('render loop motion opens internal drawers in normal mode even when drawer position lacks lerp', () => {
  withRuntimeNow(1000, () => {
    const internalDrawerGroup = {
      position: { x: 0, y: 0, z: 0 },
      userData: {},
    };

    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: {
          getOpen: () => true,
          getLastToggleTime: () => 0,
        },
        tools: { getDrawersOpenId: () => null },
        platform: {
          perf: { hasInternalDrawers: true, perfFlagsDirty: false },
          activity: { lastActionTime: 1000 },
        },
        config: {},
      },
      render: {
        doorsArray: [],
        drawersArray: [
          {
            id: 'drawer-int-1',
            group: internalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 4, y: 0, z: 0 },
            isInternal: true,
            isOpen: false,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 1000,
      debugLog: () => undefined,
    });

    controller.stepFrame(1000);

    assert.equal(internalDrawerGroup.position.x, 4);
  });
});

test('render loop motion keeps all drawers closed during internal drawer editing even when doors are open', () => {
  withRuntimeNow(1000, () => {
    const internalDrawerGroup = {
      position: {
        x: 1,
        y: 0,
        z: 0,
        lerp(target: { x: number; y: number; z: number }) {
          this.x = target.x;
          this.y = target.y;
          this.z = target.z;
        },
      },
      userData: {},
    };
    const externalDrawerGroup = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        lerp(target: { x: number; y: number; z: number }) {
          this.x = target.x;
          this.y = target.y;
          this.z = target.z;
        },
      },
      userData: { __wpType: 'extDrawer' },
    };
    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'int_drawer', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: { getOpen: () => true },
        tools: { getDrawersOpenId: () => null },
        platform: {
          perf: { hasInternalDrawers: true, perfFlagsDirty: false },
          activity: { lastActionTime: 1000 },
        },
        config: {},
      },
      render: {
        doorsArray: [],
        drawersArray: [
          {
            id: 'drawer-int-1',
            group: internalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 4, y: 0, z: 0 },
            isInternal: true,
            isOpen: true,
          },
          {
            id: 'drawer-ext-1',
            group: externalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 6, y: 0, z: 0 },
            isInternal: false,
            isOpen: false,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 1000,
      debugLog: () => undefined,
    });

    controller.stepFrame(1000);

    assert.equal(internalDrawerGroup.position.x, 0);
    assert.equal(externalDrawerGroup.position.x, 0);
  });
});

test('render loop motion does not keep doors open just because internal drawers exist when they are already closed', () => {
  withRuntimeNow(1000, () => {
    const doorGroup = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: -1 },
      userData: {},
    };
    const internalDrawerGroup = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        lerp(target: { x: number; y: number; z: number }) {
          this.x = target.x;
          this.y = target.y;
          this.z = target.z;
        },
      },
      userData: {},
    };

    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: {
          getOpen: () => false,
          getLastToggleTime: () => 100,
          runtime: { prevOpen: true, closeDelayUntil: 0, hardCloseUntil: 0 },
        },
        platform: {
          perf: { hasInternalDrawers: true, perfFlagsDirty: false },
          activity: { lastActionTime: 1000 },
        },
      },
      render: {
        doorsArray: [{ type: 'hinged', group: doorGroup, hingeSide: 'left', isOpen: false }],
        drawersArray: [
          {
            id: 'drawer-int-1',
            group: internalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 4, y: 0, z: 0 },
            isInternal: true,
            isOpen: false,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 1000,
      debugLog: () => undefined,
    });

    controller.stepFrame(1000);

    assert.ok(doorGroup.rotation.y > -1);
  });
});

test('render loop motion keeps sketch external drawers closed during sketch internal drawers editing even when doors are open', () => {
  withRuntimeNow(1000, () => {
    const externalDrawerGroup = {
      position: {
        x: 3,
        y: 0,
        z: 0,
        lerp(target: { x: number; y: number; z: number }) {
          this.x = target.x;
          this.y = target.y;
          this.z = target.z;
        },
      },
      userData: { __wpType: 'extDrawer', __wpSketchExtDrawer: true },
    };

    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'manual_layout', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: { getOpen: () => true },
        tools: { getInteriorManualTool: () => 'sketch_int_drawers', getDrawersOpenId: () => null },
        platform: {
          perf: { hasInternalDrawers: true, perfFlagsDirty: false },
          activity: { lastActionTime: 1000 },
        },
        config: {},
      },
      render: {
        doorsArray: [],
        drawersArray: [
          {
            id: 'drawer-ext-sketch-1',
            group: externalDrawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 6, y: 0, z: 0 },
            isInternal: false,
            isOpen: true,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 1000,
      debugLog: () => undefined,
    });

    controller.stepFrame(1000);

    assert.equal(externalDrawerGroup.position.x, 0);
  });
});

test('render loop motion keeps local no-global hinged door animation alive after a stale global toggle timestamp', () => {
  withRuntimeNow(5000, () => {
    const doorGroup = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { y: 0 },
      userData: { partId: 'corner_pent_door_1_0', __wpCornerPentDoor: true },
    };
    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: true },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: {
          getOpen: () => false,
          getLastToggleTime: () => 0,
        },
        platform: {
          perf: { hasInternalDrawers: false, perfFlagsDirty: false },
          activity: { lastActionTime: 5000 },
        },
      },
      render: {
        doorsArray: [
          {
            type: 'hinged',
            group: doorGroup,
            hingeSide: 'left',
            noGlobalOpen: true,
            isOpen: true,
          },
        ],
        drawersArray: [],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 5000,
      debugLog: () => undefined,
    });

    const step = controller.stepFrame(5000);

    assert.equal(step.isActiveState, true);
    assert.equal(step.isAnimating, true);
    assert.notEqual(doorGroup.rotation.y, 0);
  });
});

test('render loop motion keeps local drawer animation alive after a stale global toggle timestamp', () => {
  withRuntimeNow(5000, () => {
    const drawerGroup = {
      position: {
        x: 0,
        y: 0,
        z: 0,
        lerp(target: { x: number; y: number; z: number }, alpha: number) {
          this.x += (target.x - this.x) * alpha;
          this.y += (target.y - this.y) * alpha;
          this.z += (target.z - this.z) * alpha;
        },
      },
      userData: { __wpType: 'extDrawer' },
    };
    const app: Record<string, unknown> = {
      store: makeStore({
        mode: { primary: 'none', opts: {} },
        runtime: { globalClickMode: false },
        ui: {},
        config: {},
        meta: {},
      }),
      services: {
        doors: {
          getOpen: () => false,
          getLastToggleTime: () => 0,
        },
        tools: { getDrawersOpenId: () => null },
        platform: {
          perf: { hasInternalDrawers: false, perfFlagsDirty: false },
          activity: { lastActionTime: 5000 },
        },
        config: {},
      },
      render: {
        doorsArray: [],
        drawersArray: [
          {
            id: 'drawer-ext-local-1',
            group: drawerGroup,
            closed: { x: 0, y: 0, z: 0 },
            open: { x: 5, y: 0, z: 0 },
            isInternal: false,
            isOpen: true,
          },
        ],
      },
    };

    const controller = createRenderLoopMotionController(app as never, {
      report: () => undefined,
      now: () => 5000,
      debugLog: () => undefined,
    });

    const step = controller.stepFrame(5000);

    assert.equal(step.isActiveState, true);
    assert.equal(step.isAnimating, true);
    assert.ok(drawerGroup.position.x > 0);
    assert.ok(drawerGroup.position.x < 5);
  });
});
