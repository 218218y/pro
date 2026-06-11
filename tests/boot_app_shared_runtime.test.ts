import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppContainer } from '../esm/app_container.js';
import { installAppDeps, requireThreeDeps } from '../esm/boot/boot_app_shared.js';

test('boot app shared installs deps/config/flags and normalizes THREE side constants', () => {
  const app = createAppContainer() as any;
  const warnings: Array<[string, unknown]> = [];
  const deps: any = {
    THREE: {
      Group() {},
      Mesh() {},
      Vector3() {},
      BoxGeometry() {},
      PlaneGeometry() {},
      CylinderGeometry() {},
      EdgesGeometry() {},
    },
    config: { cacheBudgetMb: 256, customKey: 'ok' },
    flags: { uiFramework: 'react', featureX: true },
    extraDep: 'value',
  };

  installAppDeps(app, deps, (op, err) => warnings.push([op, err]));

  assert.equal(app.deps.THREE, deps.THREE);
  assert.equal(app.deps.extraDep, 'value');
  assert.equal(app.config.cacheBudgetMb, 256);
  assert.equal(app.config.customKey, 'ok');
  assert.equal(app.flags.uiFramework, 'react');
  assert.equal(app.flags.featureX, true);
  assert.equal(deps.THREE.FrontSide, 0);
  assert.equal(deps.THREE.BackSide, 1);
  assert.equal(deps.THREE.DoubleSide, 2);
  assert.deepEqual(warnings, []);
});

test('boot app shared requireThreeDeps guards boot-critical deps', () => {
  assert.throws(() => requireThreeDeps({}), /missing required dep: deps\.THREE/);

  assert.doesNotThrow(() =>
    requireThreeDeps({
      THREE: {
        Group() {},
        Mesh() {},
        Vector3() {},
        BoxGeometry() {},
        PlaneGeometry() {},
        CylinderGeometry() {},
        EdgesGeometry() {},
      },
    })
  );
});
