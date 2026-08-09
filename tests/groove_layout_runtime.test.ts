import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGrooveLayoutFromHit,
  findGrooveLayoutMatchInRect,
  readCanonicalGrooveLayoutMap,
  resolveGroovePlacementInRect,
} from '../esm/shared/groove_layout_contracts_shared.ts';

const rect = { minX: -0.5, maxX: 0.5, minY: -1, maxY: 1 };

test('manual groove layout clamps requested dimensions and position inside the rendered surface', () => {
  const layout = buildGrooveLayoutFromHit({
    rect,
    hitX: 0.48,
    hitY: 0.9,
    draft: { widthCm: '40', heightCm: '60', orientation: 'horizontal' },
  });
  assert.deepEqual(layout, {
    widthCm: 40,
    heightCm: 60,
    centerXNorm: 0.8,
    centerYNorm: 0.85,
    orientation: 'horizontal',
  });

  const placement = resolveGroovePlacementInRect({ rect, layout });
  assert.equal(placement.widthM, 0.4);
  assert.equal(placement.heightM, 0.6);
  assert.equal(placement.centerX, 0.3);
  assert.equal(placement.centerY, 0.7);
  assert.equal(placement.orientation, 'horizontal');
});

test('manual groove center snapping reports independent width and height alignment', () => {
  assert.deepEqual(
    buildGrooveLayoutFromHit({
      rect,
      hitX: 0.01,
      hitY: 0.3,
      draft: { widthCm: 20, heightCm: 40 },
    }),
    {
      widthCm: 20,
      heightCm: 40,
      centerYNorm: 0.65,
    }
  );
  assert.deepEqual(
    buildGrooveLayoutFromHit({
      rect,
      hitX: 0.01,
      hitY: 0.02,
      draft: { widthCm: 20, heightCm: 40 },
    }),
    {
      widthCm: 20,
      heightCm: 40,
    }
  );
});

test('groove layout lookup removes only the placement under the pointer', () => {
  const layouts = [
    { widthCm: 20, heightCm: 40, centerXNorm: 0.25 },
    { widthCm: 20, heightCm: 40, centerXNorm: 0.75, orientation: 'horizontal' as const },
  ];
  const match = findGrooveLayoutMatchInRect({ rect, layouts, hitX: 0.25, hitY: 0 });
  assert.equal(match?.index, 1);
  assert.equal(match?.layout.orientation, 'horizontal');
});

test('persisted groove layout map rejects legacy aliases and normalizes vertical as the default', () => {
  const map = readCanonicalGrooveLayoutMap({
    d1: [{ widthCm: 10, orientation: 'horizontal' }],
    d1_full: [
      { widthCm: '30', heightCm: 50, orientation: 'vertical' },
      { widthCm: 0, orientation: 'diagonal' },
    ],
  });
  assert.deepEqual({ ...map }, { d1_full: [{ widthCm: 30, heightCm: 50 }] });
});
