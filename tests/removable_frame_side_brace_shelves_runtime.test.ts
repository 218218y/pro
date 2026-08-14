import test from 'node:test';
import assert from 'node:assert/strict';

import {
  forceShelfIndexesToBrace,
  getExposedShelfSideForRemovedFrameSide,
  getRoundedShelfSideForRemovedFrameSide,
  shouldForceBraceShelvesForRemovedFrameSide,
} from '../esm/native/builder/removed_frame_side_brace_shelves.ts';
import {
  advanceDoorCounterPastFrontClosure,
  renderRemovedFrameSideFrontClosure,
  resolveRemovedFrameSideFrontClosurePlan,
} from '../esm/native/builder/removed_frame_side_front_closure.ts';
import { handleCanvasRemovablePartRemoveClick } from '../esm/native/services/canvas_picking_removable_part_remove_click.ts';

function closeTo(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
}

test('removed frame side brace policy only applies to the module adjacent to the removed outer side', () => {
  const cfg = { removedDoorsMap: { removed_body_left: true, removed_body_right: true } };

  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 3 }), true);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 1, modulesLength: 3 }), false);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 2, modulesLength: 3 }), true);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 0 }), false);

  assert.equal(getExposedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 3 }), 'left');
  assert.equal(getExposedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 1, modulesLength: 3 }), null);
  assert.equal(getExposedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 2, modulesLength: 3 }), 'right');
  assert.equal(getExposedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 1 }), 'both');
});

test('removed frame side shelf rounding only applies when the adjacent removed side is enabled for rounding', () => {
  const cfg = {
    removedDoorsMap: { removed_body_left: true, removed_body_right: true },
    roundedFrameSideShelvesMap: { body_left: true } as Record<string, unknown>,
  };

  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 3 }), 'left');
  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 1, modulesLength: 3 }), null);
  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 2, modulesLength: 3 }), null);

  cfg.roundedFrameSideShelvesMap.body_right = true;
  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 2, modulesLength: 3 }), 'right');
  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 1 }), 'both');
});

test('removed frame side brace and rounding policy respects lower stack side ids', () => {
  const cfg = {
    removedDoorsMap: {
      removed_body_left: true,
      removed_lower_body_right: true,
    },
    roundedFrameSideShelvesMap: {
      body_left: true,
      lower_body_right: true,
    } as Record<string, unknown>,
  };

  assert.equal(
    shouldForceBraceShelvesForRemovedFrameSide({
      cfg,
      moduleIndex: 0,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
    }),
    false
  );
  assert.equal(
    shouldForceBraceShelvesForRemovedFrameSide({
      cfg,
      moduleIndex: 1,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
    }),
    true
  );
  assert.equal(
    getRoundedShelfSideForRemovedFrameSide({
      cfg,
      moduleIndex: 1,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
    }),
    'right'
  );
  assert.equal(
    getRoundedShelfSideForRemovedFrameSide({
      cfg,
      moduleIndex: 0,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
    }),
    null
  );
});

test('forceShelfIndexesToBrace only converts existing shelves to brace geometry without erasing explicit variants', () => {
  const braceSet: Record<number, true> = Object.create(null);
  const variants: Record<number, string> = { 2: 'double' };

  forceShelfIndexesToBrace({
    braceSet,
    shelfSet: { 2: true, 4: true },
    shelfVariantByIndex: variants,
    gridDivisions: 6,
  });

  assert.deepEqual(Object.keys(braceSet), ['2', '4']);
  assert.equal(variants[2], 'double');
  assert.equal(variants[4], undefined);
});

test('removed frame side brace helpers require runtime numeric indexes and canonical shelf keys', () => {
  const cfg = { removedDoorsMap: { removed_body_left: true } };

  assert.equal(
    shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: '0', modulesLength: 2 }),
    false
  );
  assert.equal(getExposedShelfSideForRemovedFrameSide({ cfg, moduleIndex: '0', modulesLength: 2 }), null);
  assert.equal(getRoundedShelfSideForRemovedFrameSide({ cfg, moduleIndex: '0', modulesLength: 2 }), null);

  const braceFromStringGrid: Record<number, true> = Object.create(null);
  forceShelfIndexesToBrace({ braceSet: braceFromStringGrid, gridDivisions: '6' });
  assert.deepEqual(Object.keys(braceFromStringGrid), []);

  const braceFromShelfSet: Record<number, true> = Object.create(null);
  forceShelfIndexesToBrace({
    braceSet: braceFromShelfSet,
    shelfSet: { 2: true, '03': true, '4x': true } as Record<number, true>,
  });
  assert.deepEqual(Object.keys(braceFromShelfSet), ['2']);
});

test('removing a frame side requires acknowledgement that adjacent shelves became brace shelves', () => {
  const acknowledgements: Array<{ title: string; message: string }> = [];
  const removedDoorsMap: Record<string, unknown> = {};
  const App = {
    maps: {
      getMap(name: string) {
        return name === 'removedDoorsMap' ? removedDoorsMap : {};
      },
    },
    services: {
      uiFeedback: {
        acknowledge(title: string, message: string) {
          acknowledgements.push({ title, message });
        },
      },
    },
    actions: {
      doors: {
        setRemoved(partId: string, on: boolean) {
          removedDoorsMap[`removed_${partId}`] = on ? true : null;
        },
      },
    },
  } as any;

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'body_left' }), true);

  assert.equal(removedDoorsMap.removed_body_left, true);
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]?.title, 'שינוי מבני בארון');
  assert.match(acknowledgements[0]?.message || '', /המדפים בתא השמאלי הפכו למדפי קושרת/);
});

test('removing a lower frame side writes the lower scoped removal key', () => {
  const removedDoorsMap: Record<string, unknown> = {};
  const App = {
    maps: {
      getMap(name: string) {
        return name === 'removedDoorsMap' ? removedDoorsMap : {};
      },
    },
    services: {
      uiFeedback: {
        acknowledge() {
          return undefined;
        },
      },
    },
    actions: {
      doors: {
        setRemoved(partId: string, on: boolean) {
          removedDoorsMap[`removed_${partId}`] = on ? true : null;
        },
      },
    },
  } as any;

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'lower_body_left' }), true);

  assert.deepEqual({ ...removedDoorsMap }, { removed_lower_body_left: true });
});

test('removing a sketch-box side stores a removable side key and explains brace shelf conversion', () => {
  const acknowledgements: Array<{ title: string; message: string }> = [];
  const removedDoorsMap: Record<string, unknown> = {};
  const App = {
    maps: {
      getMap(name: string) {
        return name === 'removedDoorsMap' ? removedDoorsMap : {};
      },
    },
    services: {
      uiFeedback: {
        acknowledge(title: string, message: string) {
          acknowledgements.push({ title, message });
        },
      },
    },
    actions: {
      doors: {
        setRemoved(partId: string, on: boolean) {
          removedDoorsMap[`removed_${partId}`] = on ? true : null;
        },
      },
    },
  } as any;

  assert.equal(
    handleCanvasRemovablePartRemoveClick({ App, partId: 'sketch_box_free_0_sbf_1_side_right' }),
    true
  );

  assert.equal(removedDoorsMap.removed_sketch_box_free_0_sbf_1_side_right, true);
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]?.title, 'שינוי מבני בארון');
  assert.match(acknowledgements[0]?.message || '', /דופן הקופסא הוסרה/);
  assert.match(acknowledgements[0]?.message || '', /הפכו למדפי קושרת/);
});

function createRemovableSideGuardApp(
  config: Record<string, unknown>,
  removedDoorsMap: Record<string, unknown> = {}
) {
  const toasts: Array<{ message: string; type: string | undefined }> = [];
  const App = {
    store: {
      getState() {
        return { config, ui: {}, runtime: {}, mode: {}, meta: {} };
      },
      patch() {
        return undefined;
      },
    },
    maps: {
      getMap(name: string) {
        return name === 'removedDoorsMap' ? removedDoorsMap : {};
      },
    },
    services: {
      uiFeedback: {
        toast(message: string, type?: string) {
          toasts.push({ message, type });
        },
      },
    },
    actions: {
      doors: {
        setRemoved(partId: string, on: boolean) {
          removedDoorsMap[`removed_${partId}`] = on ? true : null;
        },
      },
    },
  } as any;

  return { App, removedDoorsMap, toasts };
}

test('removing a frame side is blocked when the adjacent cell has drawers', () => {
  const { App, removedDoorsMap, toasts } = createRemovableSideGuardApp({
    modulesConfiguration: [{ layout: 'shelves', extDrawersCount: 2 }],
  });

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'body_left' }), true);

  assert.equal(removedDoorsMap.removed_body_left, undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /תלייה או מגירות/);
});

test('removing a frame side is blocked when the adjacent cell has hanging', () => {
  const { App, removedDoorsMap, toasts } = createRemovableSideGuardApp({
    modulesConfiguration: [{ layout: 'hanging_top2', extDrawersCount: 0 }],
  });

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'body_right' }), true);

  assert.equal(removedDoorsMap.removed_body_right, undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /תלייה או מגירות/);
});

test('removing both frame sides of a single cell is blocked', () => {
  const { App, removedDoorsMap, toasts } = createRemovableSideGuardApp(
    { modulesConfiguration: [{ layout: 'shelves', customData: { rods: [false, false] } }] },
    { removed_body_left: true }
  );

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'body_right' }), true);

  assert.equal(removedDoorsMap.removed_body_right, undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /שתי הדפנות/);
});

test('removing both sides of the same sketch box is blocked', () => {
  const { App, removedDoorsMap, toasts } = createRemovableSideGuardApp(
    {
      modulesConfiguration: [
        {
          layout: 'shelves',
          sketchExtras: { boxes: [{ id: 'box-1', freePlacement: true }] },
        },
      ],
    },
    { 'removed_sketch_box_free_0_box-1_side_left': true }
  );

  assert.equal(
    handleCanvasRemovablePartRemoveClick({ App, partId: 'sketch_box_free_0_box-1_side_right' }),
    true
  );

  assert.equal(removedDoorsMap['removed_sketch_box_free_0_box-1_side_right'], undefined);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'error');
  assert.match(toasts[0]?.message || '', /שתי הדפנות/);
});

test('front closure plan only replaces intact hinged doors in the end module adjacent to a removed frame side', () => {
  const cfg = {
    wardrobeType: 'hinged',
    removedDoorsMap: {
      removed_body_left: true,
      removed_body_right: true,
    },
  };

  assert.deepEqual(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg,
      moduleIndex: 0,
      modulesLength: 3,
      startDoorId: 1,
      moduleDoors: 2,
    }),
    {
      side: 'left',
      partId: 'body_front_closure_left',
      startDoorId: 1,
      moduleDoors: 2,
    }
  );
  assert.equal(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg,
      moduleIndex: 1,
      modulesLength: 3,
      startDoorId: 3,
      moduleDoors: 1,
    }),
    null
  );
  assert.deepEqual(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg,
      moduleIndex: 2,
      modulesLength: 3,
      startDoorId: 4,
      moduleDoors: 1,
    }),
    {
      side: 'right',
      partId: 'body_front_closure_right',
      startDoorId: 4,
      moduleDoors: 1,
    }
  );

  assert.equal(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg: { ...cfg, wardrobeType: 'sliding' },
      moduleIndex: 0,
      modulesLength: 3,
      startDoorId: 1,
      moduleDoors: 2,
    }),
    null
  );
});

test('front closure plan preserves explicit door-removal intent and lower-stack identity', () => {
  const baseArgs = {
    moduleIndex: 0,
    modulesLength: 2,
    startDoorId: 1,
    moduleDoors: 2,
  };

  for (const removedDoorKey of ['removed_d1_full', 'removed_d1_mid2', 'removed_d2_bot']) {
    assert.equal(
      resolveRemovedFrameSideFrontClosurePlan({
        ...baseArgs,
        cfg: {
          wardrobeType: 'hinged',
          removedDoorsMap: {
            removed_body_left: true,
            [removedDoorKey]: true,
          },
        },
      }),
      null,
      `${removedDoorKey} should keep the existing explicit door-removal behavior`
    );
  }

  assert.deepEqual(
    resolveRemovedFrameSideFrontClosurePlan({
      ...baseArgs,
      cfg: {
        wardrobeType: 'hinged',
        removedDoorsMap: {
          removed_body_left: true,
          removed_d3_full: true,
          removed_d1_full: false,
        },
      },
    }),
    {
      side: 'left',
      partId: 'body_front_closure_left',
      startDoorId: 1,
      moduleDoors: 2,
    }
  );

  assert.deepEqual(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg: {
        wardrobeType: 'hinged',
        removedDoorsMap: { removed_lower_body_right: true },
      },
      moduleIndex: 1,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
      startDoorId: 1001,
      moduleDoors: 2,
    }),
    {
      side: 'right',
      partId: 'lower_body_front_closure_right',
      startDoorId: 1001,
      moduleDoors: 2,
    }
  );

  assert.equal(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg: {
        wardrobeType: 'hinged',
        removedDoorsMap: {
          removed_lower_body_right: true,
          removed_lower_d1001_full: true,
        },
      },
      moduleIndex: 1,
      modulesLength: 2,
      frameSidePartIdPrefix: 'lower_',
      startDoorId: 1001,
      moduleDoors: 2,
    }),
    null
  );

  assert.deepEqual(
    resolveRemovedFrameSideFrontClosurePlan({
      cfg: {
        wardrobeType: 'hinged',
        removedDoorsMap: {
          removed_body_left: true,
          removed_lower_d1_full: true,
        },
      },
      moduleIndex: 0,
      modulesLength: 2,
      startDoorId: 1,
      moduleDoors: 1,
    }),
    {
      side: 'left',
      partId: 'body_front_closure_left',
      startDoorId: 1,
      moduleDoors: 1,
    }
  );
});

test('front closure is a fixed body board whose back face meets the front edge of the internal shelf volume', () => {
  const calls: unknown[][] = [];
  const bodyMat = { id: 'body' };
  const plan = {
    side: 'left' as const,
    partId: 'body_front_closure_left',
    startDoorId: 7,
    moduleDoors: 2,
  };
  const frame = {
    modWidth: 0.82,
    moduleCabinetBodyHeight: 2.2,
    moduleCenterX: -0.41,
    moduleInternalDepth: 0.57,
    moduleInternalZ: -0.01,
  } as any;
  const runtime = {
    cfg: {},
    woodThick: 0.018,
    startY: 0.1,
    bodyMat,
    createBoard: (...args: unknown[]) => {
      calls.push(args);
      return { userData: { partId: args[7] } };
    },
  } as any;

  const mesh = renderRemovedFrameSideFrontClosure({ runtime, frame, plan });
  assert.ok(mesh);
  assert.equal(calls.length, 1);

  const [width, height, depth, x, y, z, material, partId] = calls[0];
  closeTo(Number(width), frame.modWidth, 'closure width should equal the internal module opening');
  closeTo(
    Number(height),
    frame.moduleCabinetBodyHeight - 2 * runtime.woodThick,
    'closure height should fit between cabinet floor and ceiling'
  );
  closeTo(Number(depth), runtime.woodThick, 'closure should use carcass board thickness');
  closeTo(Number(x), frame.moduleCenterX, 'closure should be centered on the module opening');
  closeTo(
    Number(y),
    runtime.startY + frame.moduleCabinetBodyHeight / 2,
    'closure should be vertically centered in the internal opening'
  );
  closeTo(
    Number(z) - runtime.woodThick / 2,
    frame.moduleInternalZ + frame.moduleInternalDepth / 2,
    'closure back face should meet brace-shelf front edge'
  );
  assert.equal(material, bodyMat);
  assert.equal(partId, plan.partId);
  assert.equal(advanceDoorCounterPastFrontClosure(plan), 9);
});
