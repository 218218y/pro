import test from 'node:test';
import assert from 'node:assert/strict';

import {
  forceShelfIndexesToBrace,
  getRoundedShelfSideForRemovedFrameSide,
  shouldForceBraceShelvesForRemovedFrameSide,
} from '../esm/native/builder/removed_frame_side_brace_shelves.ts';
import { handleCanvasRemovablePartRemoveClick } from '../esm/native/services/canvas_picking_removable_part_remove_click.ts';

test('removed frame side brace policy only applies to the module adjacent to the removed outer side', () => {
  const cfg = { removedDoorsMap: { removed_body_left: true, removed_body_right: true } };

  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 3 }), true);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 1, modulesLength: 3 }), false);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 2, modulesLength: 3 }), true);
  assert.equal(shouldForceBraceShelvesForRemovedFrameSide({ cfg, moduleIndex: 0, modulesLength: 0 }), false);
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

test('removing a frame side shows the user that adjacent shelves became brace shelves', () => {
  const toasts: Array<{ message: string; type: string | undefined }> = [];
  const removedDoorsMap: Record<string, unknown> = {};
  const App = {
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

  assert.equal(handleCanvasRemovablePartRemoveClick({ App, partId: 'body_left' }), true);

  assert.equal(removedDoorsMap.removed_body_left, true);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'info');
  assert.match(toasts[0]?.message || '', /המדפים בתא השמאלי הפכו למדפי קושרת/);
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
        toast() {
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
  const toasts: Array<{ message: string; type: string | undefined }> = [];
  const removedDoorsMap: Record<string, unknown> = {};
  const App = {
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

  assert.equal(
    handleCanvasRemovablePartRemoveClick({ App, partId: 'sketch_box_free_0_sbf_1_side_right' }),
    true
  );

  assert.equal(removedDoorsMap.removed_sketch_box_free_0_sbf_1_side_right, true);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.type, 'info');
  assert.match(toasts[0]?.message || '', /דופן הקופסא הוסרה/);
  assert.match(toasts[0]?.message || '', /הפכו למדפי קושרת/);
});
