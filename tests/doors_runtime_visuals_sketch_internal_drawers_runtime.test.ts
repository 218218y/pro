import test from 'node:test';
import assert from 'node:assert/strict';

import { snapDrawersToTargets, syncVisualsNow } from '../esm/native/services/doors_runtime_visuals.js';

function makeStore(state: Record<string, unknown>) {
  return {
    getState: () => state,
    patch: () => undefined,
  };
}

test('snapDrawersToTargets keeps all drawers closed during internal drawer editing even when doors are open', () => {
  const internalDrawerGroup = {
    position: { x: 3, y: 0, z: 0 },
    userData: {},
  };
  const externalDrawerGroup = {
    position: { x: 0, y: 0, z: 0 },
    userData: { __wpType: 'extDrawer' },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: {
        primary: 'manual_layout',
        opts: { manualTool: 'sketch_int_drawers' },
      },
      runtime: {
        globalClickMode: true,
      },
      ui: {},
      config: {},
      meta: {},
    }),
    services: {
      doors: {
        getOpen: () => true,
        lastToggleTime: 0,
      },
      platform: {
        perf: { hasInternalDrawers: true },
      },
      config: {},
      tools: {
        getDrawersOpenId: () => 'drawer-ext-1',
      },
    },
    render: {
      drawersArray: [
        {
          id: 'drawer-int-1',
          group: internalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 10, y: 0, z: 0 },
          isInternal: true,
          isOpen: true,
        },
        {
          id: 'drawer-ext-1',
          group: externalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 5, y: 0, z: 0 },
          isInternal: false,
          isOpen: false,
        },
      ],
    },
  };

  snapDrawersToTargets(app as never);

  assert.equal(internalDrawerGroup.position.x, 0);
  assert.equal(externalDrawerGroup.position.x, 0);
});

test('snapDrawersToTargets keeps sliding internal drawers closed during regular division editing', () => {
  const internalDrawerGroup = {
    position: { x: 7, y: 0, z: 0 },
    userData: { __wpType: 'extDrawer' },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: { primary: 'layout', opts: { layoutType: 'shelves' } },
      runtime: { globalClickMode: true, doorsOpen: true },
      ui: {},
      config: { wardrobeType: 'sliding', DOOR_DELAY_MS: 0 },
      meta: {},
    }),
    services: {
      doors: {
        getOpen: () => true,
        getLastToggleTime: () => 0,
      },
      platform: {
        perf: { hasInternalDrawers: true },
      },
      config: {},
      tools: {
        getDrawersOpenId: () => 'drawer-int-1',
      },
    },
    render: {
      drawersArray: [
        {
          id: 'drawer-int-1',
          group: internalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 10, y: 0, z: 0 },
          isInternal: true,
          isOpen: true,
        },
      ],
    },
  };

  snapDrawersToTargets(app as never);

  assert.equal(internalDrawerGroup.position.x, 0);
  assert.equal((app.render as any).drawersArray[0].isOpen, false);
});

test('snapDrawersToTargets keeps regular external drawers closed during sketch external drawer editing', () => {
  const externalDrawerGroup = {
    position: { x: 0, y: 0, z: 0 },
    userData: { __wpType: 'extDrawer' },
  };
  const sketchExternalDrawerGroup = {
    position: { x: 0, y: 0, z: 0 },
    userData: { __wpType: 'extDrawer', __wpSketchExtDrawer: true },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: {
        primary: 'manual_layout',
        opts: { manualTool: 'sketch_ext_drawers:3' },
      },
      runtime: {
        globalClickMode: true,
      },
      ui: {},
      config: {},
      meta: {},
    }),
    services: {
      doors: {
        getOpen: () => true,
        lastToggleTime: 0,
      },
      platform: {
        perf: { hasInternalDrawers: false },
      },
      config: {},
      tools: {
        getDrawersOpenId: () => 'drawer-ext-1',
      },
    },
    render: {
      drawersArray: [
        {
          id: 'drawer-ext-1',
          group: externalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 5, y: 0, z: 0 },
          isInternal: false,
          isOpen: true,
        },
        {
          id: 'sketch_ext_drawers_module_1_stack_1',
          group: sketchExternalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 6, y: 0, z: 0 },
          isInternal: false,
          isOpen: true,
        },
      ],
    },
  };

  snapDrawersToTargets(app as never);

  assert.equal(externalDrawerGroup.position.x, 0);
  assert.equal(sketchExternalDrawerGroup.position.x, 0);
});

test('snapDrawersToTargets keeps divider-selected external drawer open by divider alias', () => {
  const externalDrawerGroup = {
    position: {
      x: 0,
      y: 0,
      z: 0,
      copy(next: { x: number; y: number; z: number }) {
        this.x = next.x;
        this.y = next.y;
        this.z = next.z;
      },
    },
    userData: { partId: 'd1_draw_1', __wpType: 'extDrawer' },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: { primary: 'divider', opts: {} },
      runtime: {
        globalClickMode: true,
      },
      ui: {},
      config: {
        wardrobeType: 'hinged',
      },
      meta: {},
    }),
    services: {
      doors: {
        getOpen: () => false,
        lastToggleTime: 0,
      },
      platform: {
        perf: { hasInternalDrawers: false },
      },
      config: {},
      tools: {
        getDrawersOpenId: () => 'div_ext_1_1',
      },
    },
    render: {
      drawersArray: [
        {
          id: 'd1_draw_1',
          dividerKey: 'div_ext_1_1',
          group: externalDrawerGroup,
          closed: { x: 0, y: 0, z: 0 },
          open: { x: 0, y: 0, z: 5 },
          isInternal: false,
          isOpen: false,
        },
      ],
    },
  };

  snapDrawersToTargets(app as never);

  assert.equal(externalDrawerGroup.position.z, 5);
});

test('syncVisualsNow opens free-box sketch doors during interior layout edit modes', () => {
  const doorGroup = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_sbf_4_door_left',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
      noGlobalOpen: true,
    },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: { primary: 'layout', opts: { layoutType: 'hanging' } },
      runtime: { globalClickMode: true, doorsOpen: true },
      ui: {},
      config: {},
      meta: {},
    }),
    services: {
      platform: {
        perf: { hasInternalDrawers: false },
        dimsM: { w: 2 },
      },
      config: {},
      tools: {},
    },
    render: {
      doorsArray: [
        { type: 'hinged', group: doorGroup, hingeSide: 'left', noGlobalOpen: true, isOpen: false },
      ],
      drawersArray: [],
    },
  };

  syncVisualsNow(app as never);

  assert.notEqual(doorGroup.rotation.y, 0);
});

test('syncVisualsNow keeps free-box sketch doors closed while authoring a box door', () => {
  const doorGroup = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    userData: {
      partId: 'sketch_box_free_sbf_5_door_left',
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
      noGlobalOpen: true,
    },
  };

  const app: Record<string, unknown> = {
    store: makeStore({
      mode: { primary: 'manual_layout', opts: { manualTool: 'sketch_box_door' } },
      runtime: { globalClickMode: true, doorsOpen: true },
      ui: {},
      config: {},
      meta: {},
    }),
    services: {
      platform: {
        perf: { hasInternalDrawers: false },
        dimsM: { w: 2 },
      },
      config: {},
      tools: {},
    },
    render: {
      doorsArray: [
        { type: 'hinged', group: doorGroup, hingeSide: 'left', noGlobalOpen: true, isOpen: false },
      ],
      drawersArray: [],
    },
  };

  syncVisualsNow(app as never);

  assert.equal(doorGroup.rotation.y, 0);
});
