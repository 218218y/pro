import test from 'node:test';
import assert from 'node:assert/strict';

import { snapDrawersToTargets } from '../esm/native/services/doors_runtime_visuals.js';

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
        primary: 'int_drawer',
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
