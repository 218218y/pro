import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHingedDoorPivotMap,
  computeSlidingDoorOps,
  computeSlidingDoorSpecs,
} from '../esm/native/builder/core_doors_compute.ts';
import {
  HINGED_DOOR_MOUNT_POLICY,
  SLIDING_DOOR_CONSTRUCTION_POLICY,
} from '../esm/shared/dimensions/door_system_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';

const EPSILON = 1e-12;

function assertApprox(actual: number, expected: number, message?: string) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    message ?? `expected ${actual} to be within ${EPSILON} of ${expected}`
  );
}

function physicalLeafGap(map: ReturnType<typeof computeHingedDoorPivotMap>) {
  const left = map[1];
  const right = map[2];
  assert.ok(left);
  assert.ok(right);
  return right.doorLeftEdge - (left.doorLeftEdge + left.doorWidth);
}

test('hinged defaults reject numeric-string wood thickness and preserve outer overlays and hinge defaults', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const input = {
    totalW: 0.8,
    singleUnitWidth: 0.8,
    modulesStructure: [{ doors: 1 }],
  };
  const map = computeHingedDoorPivotMap(input);
  const stringWoodMap = computeHingedDoorPivotMap({ ...input, woodThick: '0.4' });
  const door = map[1];
  assert.ok(door);

  const moduleStartX = -input.totalW / 2 + woodThick;
  const expectedLeft = moduleStartX - woodThick / 2;
  const expectedWidth = input.singleUnitWidth + woodThick / 2 + woodThick / 2;
  assertApprox(door.doorLeftEdge, expectedLeft);
  assertApprox(door.doorWidth, expectedWidth);
  assert.equal(door.isLeftHinge, false);
  assertApprox(door.pivotX, expectedLeft + expectedWidth);
  assertApprox(door.meshOffsetX, -expectedWidth / 2);
  assert.deepEqual(stringWoodMap, map);
});

test('hinged same-module gaps preserve the wood-divisor, maximum, span-ratio, and inset branches', () => {
  const baseInput = {
    totalW: 1,
    singleUnitWidth: 4,
    moduleInternalWidths: [0.8],
    modulesStructure: [{ doors: 2 }],
  };
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const divisorGap = Math.min(
    HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapMaxM,
    woodThick / HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapWoodDivisor
  );
  assertApprox(physicalLeafGap(computeHingedDoorPivotMap(baseInput)), divisorGap);

  const thickWood = 0.06;
  assertApprox(
    physicalLeafGap(computeHingedDoorPivotMap({ ...baseInput, woodThick: thickWood })),
    HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapMaxM
  );

  const narrowSpan = 0.01;
  assertApprox(
    physicalLeafGap(
      computeHingedDoorPivotMap({
        ...baseInput,
        moduleInternalWidths: [narrowSpan],
      })
    ),
    narrowSpan * HINGED_DOOR_MOUNT_POLICY.sameModuleLeafGapSpanRatioMax
  );

  const insetWidth = 0.5;
  const insetMap = computeHingedDoorPivotMap({
    totalW: 0.8,
    singleUnitWidth: 5,
    moduleInternalWidths: [insetWidth],
    modulesStructure: [{ doors: 1 }],
    doorMountMode: 'inset',
  });
  const insetDoor = insetMap[1];
  assert.ok(insetDoor);
  const moduleStartX = -0.8 / 2 + woodThick;
  const reveal = Math.min(HINGED_DOOR_MOUNT_POLICY.insetRevealM, insetWidth / 8);
  assertApprox(insetDoor.doorLeftEdge, moduleStartX + reveal);
  assertApprox(insetDoor.doorWidth, insetWidth - reveal * 2);
});

test('hinged module boundaries preserve symmetric standard overlays, wall compensation, overrides, and Hex width', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const moduleWidth = 0.5;
  const input = {
    totalW: 1.2,
    singleUnitWidth: 9,
    moduleInternalWidths: [moduleWidth, moduleWidth],
    modulesStructure: [{ doors: 1 }, { doors: 1 }],
  };
  const regular = computeHingedDoorPivotMap(input);
  const firstModuleStart = -input.totalW / 2 + woodThick;
  const secondModuleStart = firstModuleStart + moduleWidth + woodThick;
  assertApprox(regular[1]?.doorWidth ?? Number.NaN, moduleWidth + woodThick / 2 + woodThick / 2);
  assertApprox(regular[2]?.doorLeftEdge ?? Number.NaN, secondModuleStart - woodThick / 2);
  assert.equal(regular[1]?.isLeftHinge, true);
  assert.equal(regular[2]?.isLeftHinge, false);

  const special = computeHingedDoorPivotMap({
    ...input,
    moduleIsCustom: [true, true],
  });
  assertApprox(special[1]?.doorWidth ?? Number.NaN, moduleWidth + woodThick / 2 + woodThick / 2);
  assertApprox(special[2]?.doorLeftEdge ?? Number.NaN, secondModuleStart + woodThick - woodThick / 2);

  const overridden = computeHingedDoorPivotMap({
    ...input,
    hingeMap: {
      door_hinge_1: 'right',
      door_hinge_2: 'left',
    },
  });
  assert.equal(overridden[1]?.isLeftHinge, false);
  assert.equal(overridden[2]?.isLeftHinge, true);

  const hexModuleWidth = 0.8;
  const hexDoorWidth = 0.3;
  const hexMap = computeHingedDoorPivotMap({
    totalW: 1,
    singleUnitWidth: 0.1,
    moduleInternalWidths: [hexModuleWidth],
    modulesStructure: [{ doors: 1 }],
    moduleConfigs: [{ hexCell: { enabled: true, doorWidthCm: hexDoorWidth * 100 } }],
  });
  const hexDoor = hexMap[1];
  assert.ok(hexDoor);
  const hexModuleStart = -1 / 2 + woodThick;
  assertApprox(hexDoor.doorLeftEdge, hexModuleStart + (hexModuleWidth - hexDoorWidth) / 2);
  assertApprox(hexDoor.doorWidth, hexDoorWidth);
});

test('standard four-door overlay wardrobe keeps all four leaves exactly equal and mirrored', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const totalW = 1.6;
  const segmentWidth = totalW / 2;
  const moduleInternalWidth = segmentWidth - woodThick - woodThick / 2;
  const map = computeHingedDoorPivotMap({
    totalW,
    woodThick,
    moduleInternalWidths: [moduleInternalWidth, moduleInternalWidth],
    modulesStructure: [{ doors: 2 }, { doors: 2 }],
  });

  const doors = [map[1], map[2], map[3], map[4]];
  for (const door of doors) assert.ok(door);

  const width = doors[0]!.doorWidth;
  for (const door of doors.slice(1)) assertApprox(door!.doorWidth, width);

  const leftOuter = doors[0]!;
  const leftInner = doors[1]!;
  const rightInner = doors[2]!;
  const rightOuter = doors[3]!;

  assertApprox(leftOuter.doorLeftEdge, -(rightOuter.doorLeftEdge + rightOuter.doorWidth));
  assertApprox(leftInner.doorLeftEdge, -(rightInner.doorLeftEdge + rightInner.doorWidth));
  assertApprox(leftInner.pivotX, 0);
  assertApprox(rightInner.pivotX, 0);
  assert.equal(leftOuter.isLeftHinge, true);
  assert.equal(leftInner.isLeftHinge, false);
  assert.equal(rightInner.isLeftHinge, true);
  assert.equal(rightOuter.isLeftHinge, false);
});

test('sliding specs preserve focused defaults, lane patterns, positions, and track divisor', () => {
  const woodThick = MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const totalW = 1.8;
  const defaults = computeSlidingDoorSpecs({ totalW });
  const defaultCount = SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount;
  const defaultInternalWidth = totalW - 2 * woodThick;
  const defaultDoorWidth =
    (defaultInternalWidth + (defaultCount - 1) * SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM) / defaultCount;
  const defaultLaneOffset =
    SLIDING_DOOR_CONSTRUCTION_POLICY.railDepthM / SLIDING_DOOR_CONSTRUCTION_POLICY.railTrackLaneDivisor;
  assert.equal(defaults.specs.length, defaultCount);
  assertApprox(defaults.internalWidthForDoors, defaultInternalWidth);
  assertApprox(defaults.doorWidth, defaultDoorWidth);
  for (const spec of defaults.specs) {
    const expectedOuter = defaultCount % 2 === 0 ? spec.index % 2 === 0 : spec.index % 2 !== 0;
    assert.equal(spec.isOuter, expectedOuter);
    assertApprox(spec.z, expectedOuter ? defaultLaneOffset : -defaultLaneOffset);
  }

  for (const count of [3, 4]) {
    const railZ = 0.21;
    const specs = computeSlidingDoorSpecs({
      totalW,
      numDoors: count,
      railZ,
    });
    const internalWidth = totalW - 2 * woodThick;
    const doorWidth = (internalWidth + (count - 1) * SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM) / count;
    for (const spec of specs.specs) {
      const expectedOuter = count % 2 === 0 ? spec.index % 2 === 0 : spec.index % 2 !== 0;
      const expectedX =
        -internalWidth / 2 +
        spec.index * (doorWidth - SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM) +
        doorWidth / 2;
      assert.equal(spec.isOuter, expectedOuter);
      assertApprox(spec.x, expectedX);
      assertApprox(spec.z, railZ + (expectedOuter ? defaultLaneOffset : -defaultLaneOffset));
      assertApprox(spec.minX, -internalWidth / 2 + doorWidth / 2);
      assertApprox(spec.maxX, internalWidth / 2 - doorWidth / 2);
    }
  }
});

test('sliding ops preserve all shell-clearance branches and focused rail and door geometry', () => {
  const totalW = 2;
  const depth = 0.6;
  const cabinetBodyHeight = 2.2;
  const startY = 0.08;
  const railHeight = SLIDING_DOOR_CONSTRUCTION_POLICY.railHeightM;
  const railDepth = SLIDING_DOOR_CONSTRUCTION_POLICY.railDepthM;

  for (const [label, woodThick, expectedClearance] of [
    ['minimum', 0.001, SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceMinM],
    ['wood ratio', 0.006, 0.006 / SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceWoodDivisor],
    [
      'maximum',
      MATERIAL_THICKNESS_POLICY.wood.thicknessM,
      SLIDING_DOOR_CONSTRUCTION_POLICY.shellClearanceMaxM,
    ],
  ] as const) {
    const ops = computeSlidingDoorOps({
      totalW,
      woodThick,
      depth,
      cabinetBodyHeight,
      startY,
      numDoors: 3,
    });
    const openingBottomY = startY + woodThick;
    const openingTopY = startY + cabinetBodyHeight - woodThick;
    const bottomY = openingBottomY + expectedClearance + railHeight / 2;
    const topY = openingTopY - expectedClearance - railHeight / 2;
    assertApprox(ops.rail.bottomY, bottomY, `${label}: bottom rail`);
    assertApprox(ops.rail.topY, topY, `${label}: top rail`);

    const railZ = depth / 2 - railDepth / 2 - SLIDING_DOOR_CONSTRUCTION_POLICY.railBackInsetM;
    const doorTopOverlap = Math.min(
      SLIDING_DOOR_CONSTRUCTION_POLICY.doorTopOverlapMaxM,
      Math.max(0, railHeight - SLIDING_DOOR_CONSTRUCTION_POLICY.doorTopOverlapRailInsetM)
    );
    const doorBottomY = bottomY + railHeight / 2;
    const doorTopY = topY - railHeight / 2 + doorTopOverlap;
    const doorHeight = Math.max(SLIDING_DOOR_CONSTRUCTION_POLICY.doorHeightMinM, doorTopY - doorBottomY);
    assertApprox(ops.rail.z, railZ);
    assertApprox(
      ops.rail.lineOffsetY,
      -railHeight / 2 - SLIDING_DOOR_CONSTRUCTION_POLICY.railLineOffsetYExtraM
    );
    assertApprox(ops.rail.lineOffsetZ, railDepth / SLIDING_DOOR_CONSTRUCTION_POLICY.railTrackLaneDivisor);
    assertApprox(ops.door.bottomY, doorBottomY);
    assertApprox(ops.door.heightNet, doorHeight);
    assertApprox(ops.door.centerY, doorBottomY + doorHeight / 2);
    assert.deepEqual(
      ops.doors.map(door => [door.partId, door.index, door.total, door.isOuter]),
      [
        ['sliding_door_1', 0, 3, false],
        ['sliding_door_2', 1, 3, true],
        ['sliding_door_3', 2, 3, false],
      ]
    );
  }
});

test('sliding ops preserve the minimum door height and reject string-encoded overrides', () => {
  const minimumHeightOps = computeSlidingDoorOps({
    totalW: 1.2,
    depth: 0.5,
    cabinetBodyHeight: 0.1,
    startY: 0,
  });
  assertApprox(minimumHeightOps.door.heightNet, SLIDING_DOOR_CONSTRUCTION_POLICY.doorHeightMinM);

  const baseInput = {
    totalW: 1.8,
    D: 0.55,
    cabinetBodyHeight: 2.2,
    startY: 0,
  };
  const defaults = computeSlidingDoorOps(baseInput);
  const strings = computeSlidingDoorOps({
    ...baseInput,
    woodThick: '0.09',
    numDoors: '7',
    overlap: '0.12',
    railHeight: '0.08',
    railDepth: '0.2',
  });
  assert.deepEqual(strings, defaults);
  assert.equal(strings.doors.length, SLIDING_DOOR_CONSTRUCTION_POLICY.defaultDoorsCount);
  assertApprox(strings.overlap, SLIDING_DOOR_CONSTRUCTION_POLICY.overlapM);
  assertApprox(strings.rail.height, SLIDING_DOOR_CONSTRUCTION_POLICY.railHeightM);
  assertApprox(strings.rail.depth, SLIDING_DOOR_CONSTRUCTION_POLICY.railDepthM);
});
