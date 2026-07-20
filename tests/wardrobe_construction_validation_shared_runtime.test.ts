import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampDoorHandleLocalCenterYToFit,
  getDoorHandleFootprintHeightM,
  getExternalDrawerStackHeightM,
  resolveDoorHandleVerticalFit,
  resolveExternalDrawerFitFromBody,
  resolveExternalDrawerFitFromBounds,
} from '../esm/shared/wardrobe_construction_validation_shared.ts';

test('external drawer fit rejects three regular drawers in a 60cm cabinet body', () => {
  const fit = resolveExternalDrawerFitFromBody({
    startY: 0,
    cabinetBodyHeight: 0.6,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 3,
  });

  assert.equal(fit.fitsRequested, false);
  assert.equal(fit.maxRegularDrawers, 2);
  assert.equal(fit.regCount, 2);
  assert.equal(fit.drawerHeightTotal, 0.44);
});

test('external drawer fit accepts two regular drawers in a 60cm cabinet body', () => {
  const fit = resolveExternalDrawerFitFromBody({
    startY: 0,
    cabinetBodyHeight: 0.6,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 2,
  });

  assert.equal(fit.fitsRequested, true);
  assert.equal(fit.maxRegularDrawers, 2);
  assert.equal(fit.regCount, 2);
});

test('door handle fit uses the actual handle footprint for standard, short edge, and long edge handles', () => {
  assert.equal(
    resolveDoorHandleVerticalFit({
      handleType: 'standard',
      doorHeightM: 0.12,
      localCenterYM: 0,
    }).fits,
    false
  );
  assert.equal(
    resolveDoorHandleVerticalFit({
      handleType: 'edge',
      edgeHandleVariant: 'long',
      doorHeightM: 0.3,
      localCenterYM: 0,
    }).fits,
    false
  );

  const clampedShort = clampDoorHandleLocalCenterYToFit({
    handleType: 'edge',
    edgeHandleVariant: 'short',
    doorHeightM: 0.3,
    localCenterYM: 0.2,
  });

  assert.ok(clampedShort != null);
  assert.ok(Math.abs(clampedShort - 0.05) < 1e-12);
});

test('external drawer stack height preserves count normalization and canonical sizes', () => {
  assert.equal(getExternalDrawerStackHeightM({ hasShoe: true, regCount: 2 }), 0.64);
  assert.equal(getExternalDrawerStackHeightM({ hasShoe: false, regCount: 2.9 }), 0.44);
  assert.equal(getExternalDrawerStackHeightM({ hasShoe: true, regCount: -1 }), 0.2);
  assert.equal(getExternalDrawerStackHeightM({ hasShoe: false, regCount: '2' }), 0.44);
  assert.equal(getExternalDrawerStackHeightM({ hasShoe: false, regCount: 'bad' }), 0);
});

test('external drawer exact-fit epsilon boundary remains stable', () => {
  const exact = resolveExternalDrawerFitFromBounds({
    startY: 0,
    effectiveTopY: 0.476,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 2,
  });
  const withinEpsilon = resolveExternalDrawerFitFromBounds({
    startY: 0,
    effectiveTopY: 0.476 - 5e-10,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 2,
  });
  const outsideEpsilon = resolveExternalDrawerFitFromBounds({
    startY: 0,
    effectiveTopY: 0.476 - 2e-9,
    woodThick: 0.018,
    hasShoe: false,
    regCount: 2,
  });

  assert.equal(exact.fitsRequested, true);
  assert.equal(withinEpsilon.fitsRequested, true);
  assert.equal(outsideEpsilon.fitsRequested, false);
  assert.equal(outsideEpsilon.maxRegularDrawers, 1);
});

test('door handle footprint and vertical clamp boundaries preserve canonical dimensions', () => {
  assert.equal(getDoorHandleFootprintHeightM('none'), 0);
  assert.equal(getDoorHandleFootprintHeightM('edge', 'short'), 0.2);
  assert.equal(getDoorHandleFootprintHeightM('edge', 'long'), 0.4);
  assert.equal(getDoorHandleFootprintHeightM('standard'), 0.16);

  assert.equal(
    clampDoorHandleLocalCenterYToFit({
      handleType: 'standard',
      doorHeightM: 0.16,
      localCenterYM: 0,
    }),
    0
  );
  assert.equal(
    clampDoorHandleLocalCenterYToFit({
      handleType: 'edge',
      edgeHandleVariant: 'long',
      doorHeightM: 0.39,
      localCenterYM: 0,
    }),
    null
  );
});
