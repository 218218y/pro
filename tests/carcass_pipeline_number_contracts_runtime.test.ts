import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCarcassPipelineIntegerOr,
  readCarcassPipelineNumberOr,
  readOptionalCarcassPipelineNumber,
  readRequiredCarcassPipelineNumber,
} from '../esm/native/builder/carcass_pipeline_number_contracts.ts';
import { applyCarcassAndGetCabinetMetrics } from '../esm/native/builder/carcass_pipeline.ts';
import { prepareCarcassInput } from '../esm/native/builder/core_carcass_shared.ts';

test('carcass pipeline number contract accepts only finite numbers', () => {
  assert.equal(readRequiredCarcassPipelineNumber(1.25, 'x'), 1.25);
  assert.throws(() => readRequiredCarcassPipelineNumber('1.25', 'x'), /x must be a finite number/);
  assert.equal(readOptionalCarcassPipelineNumber('1.25'), null);
  assert.equal(readOptionalCarcassPipelineNumber(0), 0);
  assert.equal(readCarcassPipelineNumberOr('2', 7), 7);
  assert.equal(readCarcassPipelineNumberOr(2, 7), 2);
  assert.equal(readCarcassPipelineIntegerOr('4', 9), 9);
  assert.equal(readCarcassPipelineIntegerOr(4.8, 9), 4);
});

test('carcass pipeline rejects string-encoded required dimensions before core ops', () => {
  assert.throws(
    () =>
      applyCarcassAndGetCabinetMetrics({
        App: {},
        totalW: '2' as unknown as number,
        D: 0.6,
        H: 2.4,
        woodThick: 0.018,
        doorsCount: 2,
        baseType: '',
        renderCarcass: false,
      }),
    /totalW must be a finite number/
  );
});

test('carcass core preparation rejects string-encoded stepped module metrics', () => {
  const invalid = prepareCarcassInput({
    totalW: 2,
    D: 0.6,
    H: 2.4,
    woodThick: 0.018,
    moduleInternalWidths: ['0.8'],
    moduleHeightsTotal: [2.6],
    moduleDepthsTotal: [0.5],
  });

  assert.equal(invalid.moduleWidths, null);
  assert.equal(invalid.hasStepData, false);
  assert.equal(invalid.hasDepthData, false);

  const valid = prepareCarcassInput({
    totalW: 2,
    D: 0.6,
    H: 2.4,
    woodThick: 0.018,
    moduleInternalWidths: [0.8],
    moduleHeightsTotal: [2.6],
    moduleDepthsTotal: [0.5],
  });

  assert.deepEqual(valid.moduleWidths, [0.8]);
  assert.deepEqual(valid.moduleDepths, [0.5]);
  assert.equal(valid.hasStepData, true);
  assert.equal(valid.hasDepthData, true);
});
