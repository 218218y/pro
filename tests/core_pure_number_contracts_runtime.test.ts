import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCorePureInteger,
  readCorePureNumber,
  readCorePureNumberArray,
  readCorePurePositiveInteger,
  readCorePurePositiveNumber,
} from '../esm/native/builder/core_pure_number_contracts.ts';
import { __asInt, __asNum, __normalizeModulesStructure } from '../esm/native/builder/core_pure_shared.ts';
import { computeModuleLayout } from '../esm/native/builder/core_layout_compute.ts';
import { computeSlidingDoorOps } from '../esm/native/builder/core_doors_compute.ts';

test('core-pure number contract accepts only finite numbers', () => {
  assert.equal(readCorePureNumber(0, 7), 0);
  assert.equal(readCorePureNumber(1.25, 7), 1.25);
  assert.equal(readCorePureNumber('1.25', 7), 7);
  assert.equal(readCorePureNumber('', 7), 7);
  assert.equal(readCorePureNumber(false, 7), 7);
  assert.equal(readCorePureNumber(null, 7), 7);
  assert.equal(readCorePureNumber(Number.NaN, 7), 7);

  assert.equal(readCorePureInteger(3.9, 1), 3);
  assert.equal(readCorePureInteger('3', 1), 1);
  assert.equal(readCorePurePositiveInteger(4.9, 6), 4);
  assert.equal(readCorePurePositiveInteger('4', 6), 6);
  assert.equal(readCorePurePositiveInteger(0, 6), 6);
  assert.equal(readCorePurePositiveNumber(0.5), 0.5);
  assert.equal(readCorePurePositiveNumber('0.5'), null);
});

test('core-pure arrays reject string-encoded numeric members', () => {
  assert.deepEqual(readCorePureNumberArray([0.2, 0, 4]), [0.2, 0, 4]);
  assert.equal(readCorePureNumberArray([0.2, '0.4']), null);
  assert.equal(readCorePureNumberArray(['0.2']), null);
});

test('shared core-pure adapters no longer coerce numeric strings', () => {
  assert.equal(__asNum('2.5', 9), 9);
  assert.equal(__asNum(2.5, 9), 2.5);
  assert.equal(__asInt('4', 2), 2);
  assert.equal(__asInt(4.8, 2), 4);
  assert.deepEqual(__normalizeModulesStructure([{ doors: '3' }, { doors: 2 }]), [{ doors: 1 }, { doors: 2 }]);
});

test('core layout and sliding ops treat string numbers as absent core-pure input', () => {
  const layout = computeModuleLayout({
    totalW: 2,
    woodThick: 0.02,
    modulesStructure: [{ doors: '3' }, { doors: 1 }],
    modulesConfiguration: [],
  }) as any;
  assert.deepEqual(
    layout.modules.map((moduleShape: any) => moduleShape.doors),
    [1, 1]
  );

  const stringWidthLayout = computeModuleLayout({
    totalW: '2',
    woodThick: 0.02,
    modulesStructure: [{ doors: 2 }],
    modulesConfiguration: [],
  }) as any;
  assert.equal(stringWidthLayout.netInternalWidth, -0.04);

  const sliding = computeSlidingDoorOps({
    totalW: 1.2,
    woodThick: 0.02,
    D: 0.55,
    cabinetBodyHeight: '2.2',
    startY: 0,
    numDoors: '3',
  }) as any;
  assert.equal(sliding.doors.length, 2);
  assert.equal(sliding.door.heightNet, 0.05);
});
