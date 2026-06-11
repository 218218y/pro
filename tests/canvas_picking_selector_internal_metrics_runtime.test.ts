import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySelectorVerticalBoundsFallback,
  readSelectorEnvelopeFromObject,
  resolveSelectorInternalMetrics,
} from '../esm/native/services/canvas_picking_selector_internal_metrics.ts';

test('selector-envelope reader lifts geometry and position fields into a canonical metrics envelope', () => {
  const envelope = readSelectorEnvelopeFromObject({
    geometry: { parameters: { width: 1.2, height: 2.4, depth: 0.6 } },
    position: { x: 0.3, y: 1.1, z: -0.7 },
  });

  assert.deepEqual(envelope, {
    width: 1.2,
    height: 2.4,
    depth: 0.6,
    centerX: 0.3,
    positionX: 0.3,
    centerY: 1.1,
    positionY: 1.1,
    centerZ: -0.7,
    positionZ: -0.7,
  });
  assert.equal(readSelectorEnvelopeFromObject({ geometry: {}, position: {} }), null);
});

test('selector vertical-bounds fallback reconstructs bounds from envelope center/height only when existing bounds are invalid', () => {
  const envelope = { centerY: 1.4, height: 0.8 };

  const repaired = applySelectorVerticalBoundsFallback({
    bottomY: Number.NaN,
    topY: Number.NaN,
    selectorEnvelope: envelope,
  });
  assert.ok(Math.abs(repaired.bottomY - 1.0) < 1e-9);
  assert.ok(Math.abs(repaired.topY - 1.8) < 1e-9);

  assert.deepEqual(
    applySelectorVerticalBoundsFallback({
      bottomY: 0.2,
      topY: 0.9,
      selectorEnvelope: envelope,
    }),
    { bottomY: 0.2, topY: 0.9 }
  );
});

test('selector internal metrics prefer explicit info values and otherwise derive canonical inner sizes from the selector envelope', () => {
  const derived = resolveSelectorInternalMetrics({
    info: {},
    selectorEnvelope: {
      centerX: 0.5,
      centerZ: -0.25,
      width: 1.2,
      depth: 0.7,
    },
  });

  assert.equal(derived.woodThick, 0.018);
  assert.equal(derived.internalCenterX, 0.5);
  assert.ok(Math.abs(derived.innerW - 1.164) < 1e-9);
  assert.ok(Math.abs(derived.internalDepth - 0.65) < 1e-9);
  assert.ok(Math.abs(derived.internalZ - -0.265) < 1e-9);

  const explicit = resolveSelectorInternalMetrics({
    info: {
      woodThick: 0.03,
      innerW: 0.77,
      internalCenterX: -0.1,
      internalDepth: 0.44,
      internalZ: 0.08,
    },
    selectorEnvelope: {
      centerX: 0.5,
      centerZ: -0.25,
      width: 1.2,
      depth: 0.7,
    },
  });

  assert.deepEqual(explicit, {
    woodThick: 0.03,
    innerW: 0.77,
    internalCenterX: -0.1,
    internalDepth: 0.44,
    internalZ: 0.08,
  });
});
