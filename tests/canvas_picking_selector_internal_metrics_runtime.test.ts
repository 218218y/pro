import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySelectorVerticalBoundsFromEnvelope,
  readSelectorEnvelopeFromObject,
  resolveSelectorInternalMetrics,
} from '../esm/native/services/canvas_picking_selector_internal_metrics.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { SKETCH_BOX_SELECTOR_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';

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

test('selector vertical-bounds envelope repair reconstructs bounds from envelope center/height only when existing bounds are invalid', () => {
  const envelope = { centerY: 1.4, height: 0.8 };

  const repaired = applySelectorVerticalBoundsFromEnvelope({
    bottomY: Number.NaN,
    topY: Number.NaN,
    selectorEnvelope: envelope,
  });
  assert.ok(Math.abs(repaired.bottomY - 1.0) < 1e-9);
  assert.ok(Math.abs(repaired.topY - 1.8) < 1e-9);

  assert.deepEqual(
    applySelectorVerticalBoundsFromEnvelope({
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

test('selector internal metrics keep focused-owner defaults and best-effort malformed-value behavior', () => {
  const metrics = resolveSelectorInternalMetrics({
    info: {
      woodThick: '0.03',
      innerW: 0,
      internalCenterX: '0.2',
      internalDepth: Number.POSITIVE_INFINITY,
      internalZ: Number.NaN,
    },
    selectorEnvelope: {
      positionX: -0.4,
      positionZ: 0.2,
      width: 0.04,
      depth: 0.03,
    },
  });

  assert.equal(metrics.woodThick, MATERIAL_THICKNESS_POLICY.wood.thicknessM);
  assert.equal(metrics.innerW, SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorInnerMinM);
  assert.equal(metrics.internalCenterX, -0.4);
  assert.equal(metrics.internalDepth, SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorInnerMinM);
  assert.equal(metrics.internalZ, 0.2 - SKETCH_BOX_SELECTOR_GEOMETRY_POLICY.selectorCenterZInsetM);
  assert.equal(typeof metrics.woodThick, 'number');
  assert.equal(typeof metrics.innerW, 'number');
  assert.equal(typeof metrics.internalCenterX, 'number');
  assert.equal(typeof metrics.internalDepth, 'number');
  assert.equal(typeof metrics.internalZ, 'number');
});
