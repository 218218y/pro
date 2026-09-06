import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxContentDividers } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_dividers.ts';
import { applyInteriorSketchOwnedDividers } from '../esm/native/builder/render_interior_sketch_ops_extras.ts';
import {
  addSketchBoxDividerState,
  addSketchBoxHorizontalDividerState,
} from '../esm/native/services/canvas_picking_sketch_box_divider_state_mutation.ts';
import {
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
} from '../esm/native/builder/render_interior_sketch_layout_dividers.ts';

function createRenderArgs(overrides: Record<string, unknown> = {}) {
  const boards: Array<{ sx: number; sy: number; sz: number; px: number; py: number; pz: number }> = [];
  const args = {
    shell: {
      isFreePlacement: true,
      boxPid: 'free_box',
      centerY: 1,
      sideH: 0.9,
      boxMat: 'mat',
      geometry: {
        centerX: 0,
        innerW: 1,
        innerD: 0.4,
        innerBackZ: -0.2,
      },
      ...overrides,
    },
    boxDividers: [{ id: 'd1', xNorm: 0.37, centered: false, frontZ: 0.2 }],
    args: {
      woodThick: 0.018,
      createBoard: (sx: number, sy: number, sz: number, px: number, py: number, pz: number) => {
        boards.push({ sx, sy, sz, px, py, pz });
      },
      getPartMaterial: null,
      isFn: () => false,
    },
  } as never;
  return { args, boards };
}

test('sketch-box divider render keeps committed free-placement divider front aligned to hover depth', () => {
  const { args, boards } = createRenderArgs();

  renderSketchBoxContentDividers(args);

  assert.equal(boards.length, 1);
  assert.ok(Math.abs(boards[0].pz - 0) < 1e-9);
});

test('sketch-box divider render ignores depth pins for non-free boxes', () => {
  const { args, boards } = createRenderArgs({ isFreePlacement: false });

  renderSketchBoxContentDividers(args);

  assert.equal(boards.length, 1);
  assert.ok(Math.abs(boards[0].pz - 0) < 1e-9);
});

test('horizontal divider render splits vertical divider height by its owning row', () => {
  const { args, boards } = createRenderArgs();
  (args as any).boxHorizontalDividers = [{ id: 'h1', yNorm: 0.5, centered: true, frontZ: 0.2 }];
  (args as any).boxDividers = [{ id: 'topOnly', xNorm: 0.5, centered: true, yNorm: 0.75, frontZ: 0.2 }];

  renderSketchBoxContentDividers(args);

  assert.equal(boards.length, 2);
  assert.ok(Math.abs(boards[0].sy - 0.018) < 1e-9, 'horizontal divider should render as a thin lying board');
  assert.ok(boards[1].sy < 0.45, `vertical divider should be limited to one row, got height ${boards[1].sy}`);
  assert.ok(
    boards[1].py > 1,
    `top-row vertical divider should render above the horizontal divider, got y ${boards[1].py}`
  );
});

test('horizontal divider render is limited to the owning vertical segment width', () => {
  const { args, boards } = createRenderArgs();
  (args as any).boxDividers = [{ id: 'mid', xNorm: 0.5, centered: true, frontZ: 0.2 }];
  (args as any).boxHorizontalDividers = [
    { id: 'right-row', yNorm: 0.5, xNorm: 0.75, centered: true, frontZ: 0.2 },
  ];

  renderSketchBoxContentDividers(args);

  assert.equal(boards.length, 2);
  assert.ok(boards[0].sx < 0.6, `horizontal divider should be scoped to one side, got width ${boards[0].sx}`);
  assert.ok(
    boards[0].px > 0,
    `right-column horizontal divider should render right of center, got x ${boards[0].px}`
  );
});

test('later nested divider cannot retroactively shrink an earlier divider scope', () => {
  const { args, boards } = createRenderArgs();
  const firstCreatedAt = 1_700_000_000_100;
  const secondCreatedAt = 1_700_000_000_200;
  const thirdCreatedAt = 1_700_000_000_300;
  const legacyBox = {
    horizontalDividers: [
      { id: `sbh_aaaaaaa${firstCreatedAt.toString(36)}`, yNorm: 0.5, centered: true, frontZ: 0.2 },
      {
        id: `sbh_ccccccc${thirdCreatedAt.toString(36)}`,
        yNorm: 0.25,
        xNorm: 0.2455,
        centered: false,
        frontZ: 0.2,
      },
    ],
    dividers: [
      {
        id: `sbd_bbbbbbb${secondCreatedAt.toString(36)}`,
        xNorm: 0.5,
        yNorm: 0.2455,
        centered: true,
        frontZ: 0.2,
      },
    ],
  };
  (args as any).boxHorizontalDividers = readSketchBoxHorizontalDividers(legacyBox);
  (args as any).boxDividers = readSketchBoxDividers(legacyBox);

  renderSketchBoxContentDividers(args);

  assert.equal(boards.length, 3);
  assert.ok(
    boards[2].sy > 0.4,
    `vertical divider created for the full bottom row must not shrink after a later nested horizontal divider, got height ${boards[2].sy}`
  );
  assert.ok(
    boards[2].py < 1,
    `bottom-row vertical divider should remain below the first horizontal divider, got y ${boards[2].py}`
  );
});

test('regular-module divider renderer preserves first-divider precedence after later nested dividers', () => {
  const state: Record<string, unknown> = {};
  addSketchBoxHorizontalDividerState(state, 0.5, 'module-h1');
  addSketchBoxDividerState(state, 0.5, 'module-v1', { yNorm: 0.25 });

  const render = () => {
    const boards: Array<{ sx: number; sy: number; px: number; py: number; partId: string }> = [];
    applyInteriorSketchOwnedDividers(
      {
        dividers: readSketchBoxDividers(state),
        horizontalDividers: readSketchBoxHorizontalDividers(state),
        effectiveBottomY: 0,
        effectiveTopY: 2,
        spanH: 2,
        innerW: 1,
        woodThick: 0.02,
        internalDepth: 0.4,
        internalCenterX: 0,
        internalZ: -0.2,
        moduleKeyStr: '0',
        moduleIndex: 0,
        bodyMat: 'mat',
        createBoard: (
          sx: number,
          sy: number,
          _sz: number,
          px: number,
          py: number,
          _pz: number,
          _mat: unknown,
          partId: string
        ) => {
          boards.push({ sx, sy, px, py, partId });
        },
      } as any,
      { isFn: (value: unknown) => typeof value === 'function' } as any
    );
    return boards;
  };

  const before = render();
  const verticalBefore = before.find(board => board.partId.endsWith('_divider_module-v1'));
  assert.ok(verticalBefore);
  assert.ok(verticalBefore.sy < 1 && verticalBefore.py < 1);

  addSketchBoxHorizontalDividerState(state, 0.25, 'module-h2', { xNorm: 0.25 });
  const after = render();
  const verticalAfter = after.find(board => board.partId.endsWith('_divider_module-v1'));
  assert.ok(verticalAfter);
  assert.ok(Math.abs(verticalAfter.sy - verticalBefore.sy) < 1e-9);
  assert.ok(Math.abs(verticalAfter.py - verticalBefore.py) < 1e-9);
});
