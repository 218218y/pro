import test from 'node:test';
import assert from 'node:assert/strict';

import { computeSlidingDoorOps } from '../esm/native/builder/core_doors_compute.ts';

type SlidingScenario = {
  label: string;
  startY: number;
  woodThick: number;
  cabinetBodyHeight: number;
};

function assertRailsStayInsideCarcassOpening(scenario: SlidingScenario) {
  const ops = computeSlidingDoorOps({
    totalW: 2.4,
    woodThick: scenario.woodThick,
    depth: 0.6,
    cabinetBodyHeight: scenario.cabinetBodyHeight,
    startY: scenario.startY,
    numDoors: 3,
    overlap: 0.03,
    railHeight: 0.04,
    railDepth: 0.075,
  });

  const floorTopY = scenario.startY + scenario.woodThick;
  const ceilBottomY = scenario.startY + scenario.cabinetBodyHeight - scenario.woodThick;
  const bottomRailBottomY = ops.rail.bottomY - ops.rail.height / 2;
  const topRailTopY = ops.rail.topY + ops.rail.height / 2;

  assert.ok(
    bottomRailBottomY > floorTopY,
    `${scenario.label}: bottom rail must stay above the carcass floor / base board`
  );
  assert.ok(
    topRailTopY < ceilBottomY,
    `${scenario.label}: top rail must stay below the carcass ceiling board`
  );
  assert.ok(
    ops.door.bottomY >= ops.rail.bottomY + ops.rail.height / 2,
    `${scenario.label}: door leaf bottom must not fall below the top face of the bottom rail`
  );
}

test('computeSlidingDoorOps keeps sliding rails clear of the carcass floor and ceiling when plinth exists', () => {
  assertRailsStayInsideCarcassOpening({
    label: 'plinth base',
    startY: 0.08,
    woodThick: 0.018,
    cabinetBodyHeight: 2.12,
  });
});

test('computeSlidingDoorOps keeps sliding rails clear of the carcass floor and ceiling without plinth', () => {
  assertRailsStayInsideCarcassOpening({
    label: 'floor-mounted body',
    startY: 0,
    woodThick: 0.018,
    cabinetBodyHeight: 2.2,
  });
});
