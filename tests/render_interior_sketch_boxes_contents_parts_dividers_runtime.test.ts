import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSketchBoxContentDividers } from '../esm/native/builder/render_interior_sketch_boxes_contents_parts_dividers.ts';

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
