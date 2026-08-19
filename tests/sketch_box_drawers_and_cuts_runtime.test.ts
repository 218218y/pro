import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

import {
  HINGED_DOOR_RENDER_POLICY,
  HINGED_DOOR_SPLIT_GEOMETRY_POLICY,
} from '../esm/shared/dimensions/door_system_policy.ts';
import { EXTERNAL_DRAWER_FRONT_RENDER_POLICY } from '../esm/shared/dimensions/external_drawer_policy.ts';
import { DRAWER_SKETCH_DOOR_CUT_POLICY } from '../esm/shared/dimensions/drawer_sketch_policy.ts';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

import {
  SHELF_GROUP_PART_ID,
  createSketchExternalDrawerBraceShelfPartId,
  makeDrawerBoxPartId,
} from '../esm/native/features/part_identity/api.ts';
import { applySketchBoxExternalDrawerDoorCuts } from '../esm/native/builder/post_build_sketch_door_cuts_box.ts';
import { applySketchDrawerDoorCuts } from '../esm/native/builder/post_build_sketch_door_cuts_shared.ts';

import {
  FakeBoxGeometry,
  FakeGroup,
  FakeMaterial,
  FakeMesh,
  FakeNode,
  THREE,
  createSketchInteriorHarness,
  getWorldY,
  readSketchBoxFrontsBundle,
  readSourceFiles,
} from './sketch_box_runtime_helpers.ts';

function normalizeSource(source: string): string {
  return source
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ', ')
    .replace(/\{\s+/g, '{ ')
    .replace(/\s+\}/g, ' }')
    .trim();
}

function collectSketchNodes(root: FakeNode): FakeNode[] {
  const nodes: FakeNode[] = [];
  root.traverse(node => nodes.push(node as FakeNode));
  return nodes;
}

function assertSketchExternalDrawerBoxHasIndependentPaintId(drawerGroup: FakeNode): void {
  const frontPartId = String(drawerGroup.userData.partId || '');
  assert.ok(frontPartId, 'drawer group should keep the front part id');
  const drawerBoxPartId = makeDrawerBoxPartId(frontPartId);
  const descendants = collectSketchNodes(drawerGroup).filter(node => node !== drawerGroup);
  const boxNodes = descendants.filter(node => node.userData?.__wpDrawerBox === true);
  assert.ok(boxNodes.length > 0, 'drawer box descendants should be present');
  assert.ok(
    boxNodes.every(node => node.userData.partId === drawerBoxPartId),
    'drawer box descendants must keep the drawer_box__ paint id'
  );
  assert.ok(
    descendants.some(node => node.userData?.partId === frontPartId && node.userData?.__wpDrawerBox !== true),
    'front descendants should keep the front paint id'
  );
}

function createSketchBoxDoorForCuts(partId: string, boxId: string): FakeGroup {
  const doorGroup = new FakeGroup();
  doorGroup.position.set(0, 1, 0);
  doorGroup.userData = {
    partId,
    __wpSketchBoxId: boxId,
    __wpSketchModuleKey: '0',
    __wpSketchBoxDoor: true,
    __doorWidth: 0.6,
    __doorHeight: 1,
    __doorMeshOffsetX: 0,
    __hingeLeft: true,
    __wpFrontThickness: 0.018,
  };
  const leaf = new FakeMesh(new FakeBoxGeometry(0.6, 1, 0.018), new FakeMaterial());
  leaf.userData.partId = partId;
  doorGroup.add(leaf);
  return doorGroup;
}

function createFocusedDoorCutHarness(args: {
  doors?: Array<{ partId: string; height?: number; width?: number; centerX?: number }>;
  selectDoorCuts: (partId: string) => {
    stacks: Array<{ xMin: number; xMax: number; yMin: number; yMax: number }>;
    splitPosList: number[];
  };
  handleType?: string;
  edgeHandleVariant?: 'short' | 'long';
}) {
  const doorSpecs = args.doors ?? [{ partId: 'focused_door_full' }];
  const doorGroups = doorSpecs.map(spec => {
    const height = spec.height ?? 1;
    const width = spec.width ?? 0.6;
    const group = createSketchBoxDoorForCuts(spec.partId, spec.partId);
    group.position.set(spec.centerX ?? 0, height / 2, 0);
    group.userData.__doorHeight = height;
    group.userData.__doorWidth = width;
    return group;
  });
  const App = {
    render: {
      doorsArray: doorGroups.map(group => ({ group, type: 'hinged' })),
    },
    services: { uiFeedback: { toast() {} } },
  } as never;
  const runtime = {
    App,
    THREE: THREE as never,
    bodyMat: new FakeMaterial(),
    globalFrontMat: new FakeMaterial(),
    createDoorVisual: () => new FakeGroup(),
    createHandleMesh: args.handleType ? () => new FakeGroup() : null,
    getPartMaterial: () => new FakeMaterial(),
    getMirrorMaterial: null,
    resolveHandleType: () => args.handleType ?? 'none',
    resolveEdgeHandleVariant: () => args.edgeHandleVariant ?? 'short',
    resolveHandleColor: () => 'black',
    resolveManualHandlePosition: () => null,
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: {},
    doorTrimMap: {},
    resolveMirrorLayout: () => null,
    resolveGrooveLayout: () => null,
    isDoorRemoved: () => false,
  } as never;
  const suppressedHandlePartIds: string[][] = [];

  applySketchDrawerDoorCuts({
    App,
    runtime,
    selectDoorCuts: (_entry, _group, userData) => {
      const partId = String(userData.partId || '');
      const selection = args.selectDoorCuts(partId);
      return {
        basePartId: partId,
        stacks: selection.stacks,
        splitPosList: selection.splitPosList,
      };
    },
    collectSuppressedHandlePartIds: partIds => suppressedHandlePartIds.push([...partIds]),
  });

  return { doorGroups, suppressedHandlePartIds };
}

function countFocusedDoorSegments(group: FakeGroup): number {
  return group.children.filter(child => child.userData?.__wpSketchDoorSegment === true).length;
}

function createSketchBoxExternalDrawerForCuts(args: {
  boxId: string;
  drawerId: string;
  yMin: number;
  yMax: number;
  width?: number;
}) {
  const { boxId, drawerId, yMin, yMax, width = 0.6 } = args;
  const drawerGroup = new FakeGroup();
  drawerGroup.position.set(0, (yMin + yMax) / 2, 0);
  drawerGroup.userData = {
    partId: `sketch_box_free_0_${boxId}_ext_drawer_${drawerId}`,
    __wpSketchExtDrawer: true,
    __wpSketchBoxId: boxId,
    __wpSketchExtDrawerId: drawerId,
    __wpSketchModuleKey: '0',
    __doorWidth: width,
    __doorHeight: yMax - yMin,
    __wpFaceMinY: yMin,
    __wpFaceMaxY: yMax,
  };
  return { group: drawerGroup };
}

function applyBoxDoorCutsForTest(args: {
  doorGroup: FakeGroup;
  splitDoorsMap: Record<string, unknown>;
  drawersArray?: unknown[];
  ctxCreate?: Record<string, unknown>;
  cfgExtra?: Record<string, unknown>;
}) {
  const App = {
    render: {
      doorsArray: [{ group: args.doorGroup, type: 'hinged' }],
      drawersArray: args.drawersArray || [],
    },
    store: {
      getState() {
        return { ui: {}, config: {}, runtime: {}, mode: {}, meta: {} };
      },
    },
    services: { uiFeedback: { toast() {} } },
  } as never;
  applySketchBoxExternalDrawerDoorCuts({
    App,
    THREE: THREE as never,
    ctx: {
      create: args.ctxCreate || {},
      resolvers: {
        getPartMaterial: () => new FakeMaterial(),
        getHandleType: () => 'none',
      },
      strings: {},
    } as never,
    cfg: { splitDoorsMap: args.splitDoorsMap, ...(args.cfgExtra || {}) },
    bodyMat: new FakeMaterial(),
    globalFrontMat: new FakeMaterial(),
  });
}

test('sketch drawer door cuts ignore string-encoded split positions from runtime selections', () => {
  const partId = 'sketch_box_free_0_boxStringSplit_door_main';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'boxStringSplit');
  const originalLeaf = doorGroup.children[0];
  const App = {
    render: {
      doorsArray: [{ group: doorGroup, type: 'hinged' }],
    },
    services: { uiFeedback: { toast() {} } },
  } as never;

  applySketchDrawerDoorCuts({
    App,
    runtime: {} as never,
    selectDoorCuts: () => ({
      basePartId: partId,
      stacks: [],
      splitPosList: ['0.5' as unknown as number],
    }),
  });

  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, undefined);
  assert.deepEqual(doorGroup.children, [originalLeaf]);
});

test('Sketch drawer split thresholds preserve the focused minimum-height, clamp, and segment gates', () => {
  const splitPolicy = HINGED_DOOR_SPLIT_GEOMETRY_POLICY;
  const exactMinimum = createFocusedDoorCutHarness({
    doors: [{ partId: 'split_exact_min_full', height: splitPolicy.minHeightForSplitM }],
    selectDoorCuts: () => ({ stacks: [], splitPosList: [0.5] }),
  });
  assert.equal(countFocusedDoorSegments(exactMinimum.doorGroups[0]!), 0);

  const firstViableHeight = 2 * (splitPolicy.minSegmentHeightM + splitPolicy.splitGapM / 2) + 1e-9;
  assert.ok(firstViableHeight > splitPolicy.minHeightForSplitM);
  const aboveMinimum = createFocusedDoorCutHarness({
    doors: [{ partId: 'split_above_min_full', height: firstViableHeight }],
    selectDoorCuts: () => ({ stacks: [], splitPosList: [0.5] }),
  });
  assert.equal(countFocusedDoorSegments(aboveMinimum.doorGroups[0]!), 2);

  for (const [label, splitPosition] of [
    ['bottom', 0],
    ['top', 1],
  ] as const) {
    const clamped = createFocusedDoorCutHarness({
      doors: [{ partId: `split_${label}_clamp_full`, height: 1 }],
      selectDoorCuts: () => ({ stacks: [], splitPosList: [splitPosition] }),
    });
    assert.equal(
      countFocusedDoorSegments(clamped.doorGroups[0]!),
      0,
      `${label} clamp must not emit a segment below the focused minimum height`
    );
  }

  const viableEdgeDistance = splitPolicy.minSegmentHeightM + splitPolicy.splitGapM / 2 + 1e-9;
  for (const [label, splitPosition] of [
    ['bottom', viableEdgeDistance],
    ['top', 1 - viableEdgeDistance],
  ] as const) {
    const viable = createFocusedDoorCutHarness({
      doors: [{ partId: `split_${label}_viable_full`, height: 1 }],
      selectDoorCuts: () => ({ stacks: [], splitPosList: [splitPosition] }),
    });
    assert.equal(countFocusedDoorSegments(viable.doorGroups[0]!), 2, label);
  }
});

test('Sketch drawer duplicate split filtering keeps the focused inclusive tolerance and segment spacing', () => {
  const splitPolicy = HINGED_DOOR_SPLIT_GEOMETRY_POLICY;
  const doorHeight = 1;
  const duplicateTolerance = Math.max(
    splitPolicy.duplicateCutToleranceMinM,
    Math.min(splitPolicy.duplicateCutToleranceMaxM, doorHeight * splitPolicy.duplicateCutToleranceHeightRatio)
  );
  const firstCutY = 0.3;

  const exactDuplicate = createFocusedDoorCutHarness({
    doors: [{ partId: 'split_duplicate_exact_full', height: doorHeight }],
    selectDoorCuts: () => ({
      stacks: [],
      splitPosList: [firstCutY / doorHeight, (firstCutY + duplicateTolerance) / doorHeight],
    }),
  });
  assert.equal(countFocusedDoorSegments(exactDuplicate.doorGroups[0]!), 2);

  const firstSpacingThatCanProduceAnotherVisibleSegment =
    splitPolicy.minSegmentHeightM + splitPolicy.splitGapM + 1e-9;
  assert.ok(firstSpacingThatCanProduceAnotherVisibleSegment > duplicateTolerance);
  const aboveDuplicateAndSegmentGates = createFocusedDoorCutHarness({
    doors: [{ partId: 'split_duplicate_above_full', height: doorHeight }],
    selectDoorCuts: () => ({
      stacks: [],
      splitPosList: [
        firstCutY / doorHeight,
        (firstCutY + firstSpacingThatCanProduceAnotherVisibleSegment) / doorHeight,
      ],
    }),
  });
  assert.equal(countFocusedDoorSegments(aboveDuplicateAndSegmentGates.doorGroups[0]!), 3);
});

test('Sketch drawer horizontal-overlap and no-op boundaries preserve strict and inclusive comparisons', () => {
  const cutPolicy = DRAWER_SKETCH_DOOR_CUT_POLICY;
  const exactOverlap = createFocusedDoorCutHarness({
    doors: [{ partId: 'drawer_overlap_exact_full', centerX: -0.3 }],
    selectDoorCuts: () => ({
      stacks: [
        {
          xMin: -cutPolicy.doorCutHorizontalOverlapMinM,
          xMax: 0.2,
          yMin: 0.3,
          yMax: 0.5,
        },
      ],
      splitPosList: [],
    }),
  });
  assert.equal(countFocusedDoorSegments(exactOverlap.doorGroups[0]!), 0);

  const aboveOverlap = createFocusedDoorCutHarness({
    doors: [{ partId: 'drawer_overlap_above_full', centerX: -0.3 }],
    selectDoorCuts: () => ({
      stacks: [
        {
          xMin: -(cutPolicy.doorCutHorizontalOverlapMinM + 1e-9),
          xMax: 0.2,
          yMin: 0.3,
          yMax: 0.5,
        },
      ],
      splitPosList: [],
    }),
  });
  assert.equal(countFocusedDoorSegments(aboveOverlap.doorGroups[0]!), 2);

  const exactNoOp = createFocusedDoorCutHarness({
    selectDoorCuts: () => ({
      stacks: [
        {
          xMin: -1,
          xMax: 1,
          yMin: -0.02,
          yMax: cutPolicy.doorCutNoOpToleranceM,
        },
      ],
      splitPosList: [],
    }),
  });
  assert.equal(countFocusedDoorSegments(exactNoOp.doorGroups[0]!), 0);

  const aboveNoOp = createFocusedDoorCutHarness({
    selectDoorCuts: () => ({
      stacks: [
        {
          xMin: -1,
          xMax: 1,
          yMin: -0.02,
          yMax: cutPolicy.doorCutNoOpToleranceM + 1e-9,
        },
      ],
      splitPosList: [],
    }),
  });
  assert.equal(countFocusedDoorSegments(aboveNoOp.doorGroups[0]!), 1);
});

test('Sketch drawer door cuts collect suppressed handle ids once in door and segment order', () => {
  const harness = createFocusedDoorCutHarness({
    doors: [
      { partId: 'suppressed_first_full', height: 0.6 },
      { partId: 'suppressed_second_full', height: 0.6 },
    ],
    handleType: 'edge',
    edgeHandleVariant: 'long',
    selectDoorCuts: () => ({
      stacks: [{ xMin: -1, xMax: 1, yMin: 0.25, yMax: 0.35 }],
      splitPosList: [],
    }),
  });

  assert.deepEqual(harness.suppressedHandlePartIds, [
    ['suppressed_first_bot', 'suppressed_first_top', 'suppressed_second_bot', 'suppressed_second_top'],
  ]);
});

test('manual split positions segment free-placement sketch box doors without enabling default box cuts', () => {
  const partId = 'sketch_box_free_0_boxManual_door_main';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'boxManual');

  applyBoxDoorCutsForTest({
    doorGroup,
    splitDoorsMap: {
      [`split_${partId}`]: true,
      [`splitpos_${partId}`]: [0.5],
    },
  });

  const directSegmentIds = doorGroup.children.map(child => String(child.userData?.partId || '')).sort();
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.deepEqual(directSegmentIds, [`${partId}_bot`, `${partId}_top`]);
});

test('manual split positions normalize sketch-box accent and groove surface ids to the base door', () => {
  for (const suffix of ['mid2_accent_top', 'mid2_groove_left']) {
    const boxId = `boxSurface${suffix.replace(/[^a-z0-9]+/gi, '')}`;
    const basePartId = `sketch_box_free_0_${boxId}_door_main`;
    const surfacePartId = `${basePartId}_${suffix}`;
    const doorGroup = createSketchBoxDoorForCuts(surfacePartId, boxId);

    applyBoxDoorCutsForTest({
      doorGroup,
      splitDoorsMap: {
        [`split_${basePartId}`]: true,
        [`splitpos_${basePartId}`]: [0.5],
      },
    });

    const directSegmentIds = doorGroup.children.map(child => String(child.userData?.partId || '')).sort();
    assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
    assert.deepEqual(directSegmentIds, [`${basePartId}_bot`, `${basePartId}_top`]);
  }
});

test('manual split positions on sketch box doors are applied against the visible door above external drawers', () => {
  const boxId = 'boxManualDrawers';
  const partId = `sketch_box_free_0_${boxId}_door_main`;
  const doorGroup = createSketchBoxDoorForCuts(partId, boxId);
  doorGroup.position.set(0, 1.5, 0);
  doorGroup.userData.__doorHeight = 3;

  applyBoxDoorCutsForTest({
    doorGroup,
    drawersArray: [createSketchBoxExternalDrawerForCuts({ boxId, drawerId: 'ed1', yMin: 0, yMax: 1 })],
    splitDoorsMap: {
      [`split_${partId}`]: true,
      [`splitb_${partId}`]: true,
      [`splitpos_${partId}`]: [0.25],
    },
  });

  const directSegments = doorGroup.children.filter(child => child.userData?.__wpSketchDoorSegment === true);
  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, true);
  assert.deepEqual(directSegments.map(child => String(child.userData?.partId || '')).sort(), [
    `${partId}_bot`,
    `${partId}_top`,
  ]);

  const segmentBounds = directSegments
    .map(child => {
      const h = Number(child.userData?.__doorHeight || 0);
      const y = getWorldY(child as FakeNode);
      return { id: String(child.userData?.partId || ''), minY: y - h / 2, maxY: y + h / 2 };
    })
    .sort((a, b) => a.minY - b.minY);

  assert.ok(segmentBounds[0].minY > 1, 'bottom rebuilt segment should start above the external drawers');
  assert.ok(
    segmentBounds[0].maxY > 1.45 && segmentBounds[0].maxY < 1.55,
    `bottom fixed split should be near the visible-door quarter line, got ${segmentBounds[0].maxY}`
  );
});

test('sketch box doors stay uncut when no manual split position was explicitly stored', () => {
  const partId = 'sketch_box_0_boxPlain_door_main';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'boxPlain');
  const originalLeaf = doorGroup.children[0];

  applyBoxDoorCutsForTest({ doorGroup, splitDoorsMap: {} });

  assert.equal(doorGroup.userData.__wpSketchSegmentedDoor, undefined);
  assert.equal(doorGroup.children.length, 1);
  assert.equal(doorGroup.children[0], originalLeaf);
});

test('segmented sketch box doors keep groove state per clicked segment only', () => {
  const partId = 'sketch_box_free_0_sbf_alpha_door_sbdr_1';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'sbf_alpha');
  doorGroup.userData.__wpSketchBoxDoorGroove = true;
  const visualCalls: Array<{ partId: string; hasGrooves: boolean }> = [];

  applyBoxDoorCutsForTest({
    doorGroup,
    splitDoorsMap: {
      [`split_${partId}`]: true,
      [`splitpos_${partId}`]: [0.5],
    },
    cfgExtra: {
      groovesMap: {
        [`groove_${partId}_top`]: true,
      },
    },
    ctxCreate: {
      createDoorVisual(
        w: number,
        h: number,
        thickness: number,
        mat: unknown,
        _style: unknown,
        hasGrooves: boolean,
        _isMirror: unknown,
        _curtainType: unknown,
        _baseMaterial: unknown,
        _frontFaceSign: unknown,
        _forceCurtainFix: unknown,
        _mirrorLayout: unknown,
        groovePartId: string
      ) {
        visualCalls.push({ partId: groovePartId, hasGrooves });
        return new FakeMesh(new FakeBoxGeometry(w, h, thickness), mat as FakeMaterial);
      },
    },
  });

  assert.deepEqual(
    visualCalls.map(call => [call.partId, call.hasGrooves]),
    [
      [`${partId}_bot`, false],
      [`${partId}_top`, true],
    ]
  );
});

test('free-placement split sketch box doors inherit full-door visual maps', () => {
  const partId = 'sketch_box_free_0_boxVisual_door_main';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'boxVisual');
  const visualCalls: Array<{
    partId: string;
    style: unknown;
    isMirror: unknown;
    hasGrooves: boolean;
    mirrorLayout: unknown;
  }> = [];
  const mirrorLayout = [{ faceSign: 1, widthCm: 20, heightCm: 30 }];

  applyBoxDoorCutsForTest({
    doorGroup,
    splitDoorsMap: {
      [`split_${partId}`]: true,
      [`splitpos_${partId}`]: [0.5],
    },
    cfgExtra: {
      doorSpecialMap: { [partId]: 'mirror' },
      doorStyleMap: { [partId]: 'double_profile' },
      mirrorLayoutMap: { [partId]: mirrorLayout },
      groovesMap: { [`groove_${partId}`]: true },
    },
    ctxCreate: {
      createDoorVisual(
        w: number,
        h: number,
        thickness: number,
        mat: unknown,
        style: unknown,
        hasGrooves: boolean,
        isMirror: unknown,
        _curtainType: unknown,
        _baseMaterial: unknown,
        _frontFaceSign: unknown,
        _forceCurtainFix: unknown,
        inheritedMirrorLayout: unknown,
        groovePartId: string
      ) {
        visualCalls.push({
          partId: groovePartId,
          style,
          isMirror,
          hasGrooves,
          mirrorLayout: inheritedMirrorLayout,
        });
        return new FakeMesh(new FakeBoxGeometry(w, h, thickness), mat as FakeMaterial);
      },
    },
  });

  assert.deepEqual(
    visualCalls.map(call => [call.partId, call.style, call.isMirror, call.hasGrooves, call.mirrorLayout]),
    [
      [`${partId}_bot`, 'double_profile', true, false, mirrorLayout],
      [`${partId}_top`, 'double_profile', true, false, mirrorLayout],
    ]
  );
});

test('free-placement split sketch box door grooves inherit full-door state until a segment override exists', () => {
  const partId = 'sketch_box_free_0_boxGroove_door_main';
  const doorGroup = createSketchBoxDoorForCuts(partId, 'boxGroove');
  const visualCalls: Array<{ partId: string; hasGrooves: boolean }> = [];

  applyBoxDoorCutsForTest({
    doorGroup,
    splitDoorsMap: {
      [`split_${partId}`]: true,
      [`splitpos_${partId}`]: [0.5],
    },
    cfgExtra: {
      groovesMap: {
        [`groove_${partId}`]: true,
        [`groove_${partId}_top`]: true,
      },
    },
    ctxCreate: {
      createDoorVisual(
        w: number,
        h: number,
        thickness: number,
        mat: unknown,
        _style: unknown,
        hasGrooves: boolean,
        _isMirror: unknown,
        _curtainType: unknown,
        _baseMaterial: unknown,
        _frontFaceSign: unknown,
        _forceCurtainFix: unknown,
        _mirrorLayout: unknown,
        groovePartId: string
      ) {
        visualCalls.push({ partId: groovePartId, hasGrooves });
        return new FakeMesh(new FakeBoxGeometry(w, h, thickness), mat as FakeMaterial);
      },
    },
  });

  assert.deepEqual(
    visualCalls.map(call => [call.partId, call.hasGrooves]),
    [
      [`${partId}_bot`, false],
      [`${partId}_top`, true],
    ]
  );
});

test('free-placement sketch box internal drawers render through internal drawer ops', () => {
  const capturedOps: Array<Record<string, unknown>> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    applyInternalDrawersOps: (args: unknown) => {
      const rec = args as Record<string, unknown>;
      const ops = Array.isArray(rec.ops) ? (rec.ops as Array<Record<string, unknown>>) : [];
      capturedOps.push(...ops);
    },
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'freeDrawerBox',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.72,
            widthM: 0.78,
            depthM: 0.5,
            drawers: [{ id: 'fd1', yNormC: 0.55 }],
          },
        ],
      },
      createInternalDrawerBox: () => null,
    })
  );

  assert.equal(ok, true);
  assert.equal(capturedOps.length, 2);
  assert.deepEqual(
    capturedOps.map(op => String(op.partId || '')),
    [
      'sketch_box_free_0_freeDrawerBox_int_drawers_fd1_lower',
      'sketch_box_free_0_freeDrawerBox_int_drawers_fd1_upper',
    ]
  );
  assert.ok(capturedOps.every(op => Math.abs(Number(op.height) - 0.165) < 1e-9));
  assert.ok(capturedOps.every(op => op.sketchBoxId === 'freeDrawerBox'));
  assert.ok(capturedOps.every(op => op.sketchFreePlacement === true));
  assert.ok(capturedOps.every(op => op.sketchModuleKey === '0'));
  assert.ok(capturedOps.every(op => op.sketchStack === 'top'));
});

test('free-placement sketch box internal drawers follow the internal-drawers toggle without deleting saved data', () => {
  const capturedOps: Array<Record<string, unknown>> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    applyInternalDrawersOps: (args: unknown) => {
      const rec = args as Record<string, unknown>;
      const ops = Array.isArray(rec.ops) ? (rec.ops as Array<Record<string, unknown>>) : [];
      capturedOps.push(...ops);
    },
  });
  const sketchExtras = {
    boxes: [
      {
        id: 'freeDrawerBox',
        freePlacement: true,
        absX: 0,
        absY: 1.0,
        heightM: 0.72,
        widthM: 0.78,
        depthM: 0.5,
        drawers: [{ id: 'fd1', yNormC: 0.55 }],
      },
    ],
  };

  assert.equal(
    applyInteriorSketchExtras(
      makeArgs({
        sketchExtras,
        isInternalDrawersEnabled: false,
        createInternalDrawerBox: () => null,
      })
    ),
    true
  );
  assert.equal(capturedOps.length, 0, 'turning the button off should hide saved free-box internal drawers');

  assert.equal(
    applyInteriorSketchExtras(
      makeArgs({
        sketchExtras,
        isInternalDrawersEnabled: true,
        createInternalDrawerBox: () => null,
      })
    ),
    true
  );
  assert.equal(capturedOps.length, 2, 'turning the button back on should render the saved drawers again');
});

test('free-placement sketch box internal drawers keep custom height and skip stacks that do not fit', () => {
  const capturedOps: Array<Record<string, unknown>> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    applyInternalDrawersOps: (args: unknown) => {
      const rec = args as Record<string, unknown>;
      const ops = Array.isArray(rec.ops) ? (rec.ops as Array<Record<string, unknown>>) : [];
      capturedOps.push(...ops);
    },
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'freeDrawerBoxTooSmall',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.55,
            widthM: 0.78,
            depthM: 0.5,
            drawers: [{ id: 'fdTooTall', yNormC: 0.5, drawerHeightM: 0.3 }],
          },
        ],
      },
      createInternalDrawerBox: () => null,
    })
  );

  assert.equal(ok, true);
  assert.equal(capturedOps.length, 0);
});

test('sketch external drawers render at free Y positions with per-stack metadata', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        extDrawers: [{ id: 'ed1', yNormC: 0.5, count: 3 }],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 3);
  const ids = new Set(drawerGroups.map(node => String(node.userData.partId || '')));
  assert.equal(ids.size, 3);
  for (const node of drawerGroups) {
    assert.equal(node.userData.__wpSketchModuleKey, '0');
    assert.equal(node.userData.__wpSketchExtDrawerId, 'ed1');
  }
  const ys = drawerGroups.map(node => Number(getWorldY(node))).sort((a, b) => a - b);
  assert.ok(Math.abs(ys[1] - ys[0] - 0.22) < 1e-6);
  assert.ok(Math.abs(ys[2] - ys[1] - 0.22) < 1e-6);
  assert.ok(Math.abs((ys[0] + ys[2]) / 2 - ys[1]) < 1e-6);
});

test('sketch external drawers emit folded contents when show contents is enabled', () => {
  const foldedCalls: any[] = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      showContentsEnabled: true,
      addFoldedClothes: (...call: any[]) => foldedCalls.push(call),
      sketchExtras: {
        extDrawers: [{ id: 'edContents', yNormC: 0.5, count: 2 }],
      },
    })
  );

  assert.equal(ok, true);
  assert.equal(foldedCalls.length, 2);
  assert.ok(foldedCalls.every(call => call[4]?.userData?.__wpSketchExtDrawer === true));
  assert.ok(foldedCalls.every(call => Number(call[5]) > 0));
  assert.ok(foldedCalls.every(call => call[7]?.showContentsEnabled === true));
  assert.ok(foldedCalls.every(call => call[7]?.sketchMode === true));
  assert.ok(foldedCalls.every(call => typeof call[7]?.addOutlines === 'function'));
});

test('sketch external drawer fronts and boxes keep separate paint identities after group metadata is applied', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        extDrawers: [{ id: 'edPaintSplit', yNormC: 0.5, count: 1 }],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = collectSketchNodes(wardrobeGroup).filter(
    node => node.userData?.__wpType === 'extDrawer' && node.userData?.__wpSketchExtDrawer === true
  );
  assert.equal(drawerGroups.length, 1);
  assertSketchExternalDrawerBoxHasIndependentPaintId(drawerGroups[0]!);
});

test('sketch box external drawers render with custom per-drawer height', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxCustomExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edCustom', yNormC: 0.5, count: 2, drawerHeightM: 0.3 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 2);
  const ys = drawerGroups.map(node => Number(getWorldY(node))).sort((a, b) => a - b);
  assert.ok(Math.abs(ys[1] - ys[0] - 0.3) < 1e-6);
});

test('free-box external drawer fixed runners mount on the inner side faces, not the box exterior', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();
  const boxWidth = 0.78;
  const woodThick = 0.018;

  const ok = applyInteriorSketchExtras(
    makeArgs({
      woodThick,
      sketchExtras: {
        boxes: [
          {
            id: 'boxRunnerInside',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: boxWidth,
            depthM: 0.5,
            extDrawers: [{ id: 'edRunnerInside', yNormC: 0.5, count: 1 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const fixedRight = collectSketchNodes(wardrobeGroup).find(
    node => node.userData?.__wpDrawerRunnerRole === 'roller-fixed-web-right'
  ) as FakeMesh | undefined;
  assert.ok(fixedRight, 'right fixed runner web should render');

  const innerRightX = boxWidth / 2 - woodThick;
  const runnerOuterX = fixedRight.position.x + fixedRight.geometry.parameters.width / 2;
  assert.ok(
    Math.abs(runnerOuterX - innerRightX) < 1e-9,
    `fixed runner should terminate at the inner side face (${innerRightX}), got ${runnerOuterX}`
  );
});

test('sketch box shoe drawer keeps its sketch-controlled custom height', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxCustomShoe',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [
              {
                id: 'shoeCustom',
                yNormC: 0,
                yNorm: 0,
                yAnchor: 'bottom',
                count: 0,
                hasShoeDrawer: true,
                drawerHeightM: 0.275,
              },
            ],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 1);
  assert.ok(Number(drawerGroups[0]?.userData.__doorHeight) > 0.25);
  const runnerRoles = collectSketchNodes(wardrobeGroup)
    .filter(node => node.userData?.__wpDrawerRunnerHardware === true)
    .map(node => String(node.userData.__wpDrawerRunnerRole));
  assert.ok(runnerRoles.some(role => role.startsWith('roller-fixed-')));
  assert.ok(runnerRoles.some(role => role.startsWith('roller-moving-')));
});

test('sketch box external drawers emit an individually paintable brace shelf above each stack', () => {
  const { boards, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxShelfExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edShelf', yNormC: 0.5, count: 2 }],
          },
        ],
      },
    })
  );

  const shelfPartId = createSketchExternalDrawerBraceShelfPartId('0', 'edShelf', 'boxShelfExt');
  const shelf = boards.find(board => board.userData.partId === shelfPartId);
  assert.equal(ok, true);
  assert.ok(shelf);
  assert.equal(shelf.userData.__wpShelfGroupPartId, SHELF_GROUP_PART_ID);
  assert.equal(shelf.userData.__wpShelfVariant, 'brace');
  assert.equal(shelf.userData.__wpShelfIsBrace, true);
});

test('sketch box external drawers emit folded contents inside their drawer boxes', () => {
  const foldedCalls: any[] = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      showContentsEnabled: true,
      addFoldedClothes: (...call: any[]) => foldedCalls.push(call),
      sketchExtras: {
        boxes: [
          {
            id: 'boxContentsExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edBoxContents', yNormC: 0.5, count: 2 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  assert.equal(foldedCalls.length, 2);
  assert.ok(foldedCalls.every(call => call[4]?.userData?.__wpSketchExtDrawer === true));
  assert.ok(foldedCalls.every(call => Number(call[3]) > 0));
  assert.ok(foldedCalls.every(call => call[7]?.showContentsEnabled === true));
});

test('sketch box external drawer fronts and boxes keep separate paint identities after group metadata is applied', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxPaintSplitExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 1.2,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edBoxPaintSplit', yNormC: 0.5, count: 1 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = collectSketchNodes(wardrobeGroup).filter(
    node =>
      node.userData?.__wpType === 'extDrawer' &&
      node.userData?.__wpSketchExtDrawer === true &&
      node.userData?.__wpSketchBoxId === 'boxPaintSplitExt'
  );
  assert.equal(drawerGroups.length, 1);
  assertSketchExternalDrawerBoxHasIndependentPaintId(drawerGroups[0]!);
});

test('sketch box external drawers keep custom height and skip stacks that do not fit', () => {
  const { wardrobeGroup, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness();

  const ok = applyInteriorSketchExtras(
    makeArgs({
      sketchExtras: {
        boxes: [
          {
            id: 'boxTooSmallExt',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.9,
            widthM: 0.78,
            depthM: 0.5,
            extDrawers: [{ id: 'edTooTall', yNormC: 0.5, count: 4, drawerHeightM: 0.3 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const drawerGroups = wardrobeGroup.children.filter(
    node => (node as FakeNode).userData?.__wpSketchExtDrawer === true
  ) as FakeNode[];
  assert.equal(drawerGroups.length, 0);
});

test('sketch external drawer cut envelope matches the regular external-drawer to door reveal contract', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_box.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
  ]);
  const tokens = await readSourceFiles(['../esm/shared/dimensions/drawer_sketch_policy.ts']);
  const mod = await import('../esm/native/builder/post_build_extras_pipeline.ts');

  const regularDrawerToDoorVisualGap =
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.doorTopGapM +
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM / 2 +
    HINGED_DOOR_RENDER_POLICY.visualHeightClearanceM / 2;
  const sketchDrawerToDoorVisualGap =
    DRAWER_SKETCH_DOOR_CUT_POLICY.externalDoorCutSurroundingGapM +
    SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorVisualClearanceM / 2;

  assert.equal(
    DRAWER_SKETCH_DOOR_CUT_POLICY.externalDoorCutFrontInsetM,
    EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM / 2
  );
  assert.equal(sketchDrawerToDoorVisualGap, regularDrawerToDoorVisualGap);
  assert.match(
    tokens,
    /externalDoorCutFrontInsetM:\s*EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualHeightClearanceM \/ 2,/
  );
  assert.match(
    tokens,
    /externalDoorCutSurroundingGapM:\s*EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.doorTopGapM \+\s*EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualHeightClearanceM \/ 2,/
  );
  assert.match(src, /const frontInset = DRAWER_SKETCH_DOOR_CUT_POLICY\.externalDoorCutFrontInsetM;/);
  assert.match(src, /const surroundingGap = DRAWER_SKETCH_DOOR_CUT_POLICY\.externalDoorCutSurroundingGapM;/);
  assert.match(src, /const faceMinY = baseY \+ frontInset - surroundingGap;/);
  assert.match(src, /const faceMaxY = baseY \+ stackH - frontInset \+ surroundingGap;/);
  assert.equal(typeof mod.applyPostBuildExtras, 'function');
});

test('custom segmented sketch door handles are refreshed by the generic handles pass', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/handles.ts',
    '../esm/native/builder/handles_apply.ts',
    '../esm/native/builder/handles_apply_shared.ts',
    '../esm/native/builder/handles_apply_doors.ts',
    '../esm/native/builder/handles_apply_drawers.ts',
  ]);
  assert.match(src, /__wpSketchCustomHandles === true/);
  assert.match(src, /const leaves = collectSketchSegmentHandleLeaves\(g\);/);
  assert.match(src, /collectUnusuallySmallSketchDoorPartIds\(leaves, unusuallySmallDoorPartIds\);/);
  assert.match(src, /refreshSketchSegmentedDoorHandles\(runtime, g, __sk, leaves, suppressedPartIds\)/);
});

test('generic drawer handles target only root drawer groups so sketch profile fronts do not get a second handle', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/handles_apply.ts',
    '../esm/native/builder/handles_apply_drawers.ts',
  ]);
  assert.match(src, /function isDrawerLikeGroup\(node: NodeLike \| null \| undefined\): boolean \{/);
  assert.match(src, /function hasDrawerAncestor\(node: NodeLike \| null \| undefined\): boolean \{/);
  assert.match(src, /if \(!isDrawerLikeGroup\(c\) \|\| hasDrawerAncestor\(c\)\) return;/);
});

test('sketch external drawers source keeps module faces aligned to real door span and free boxes enabled', async () => {
  const src = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_ops_input.ts',
      '../esm/native/builder/render_interior_sketch_module_geometry.ts',
      '../esm/native/builder/render_interior_sketch_drawers.ts',
      '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_apply.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_context.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_group.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_visual.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_box.ts',
      '../esm/native/builder/render_interior_sketch_drawers_external_motion.ts',
      '../esm/native/builder/render_interior_sketch_drawers_internal.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  const sketchPickMeta = await readSourceFiles(['../esm/native/builder/render_interior_sketch_pick_meta.ts']);
  const shared = await readSourceFiles([
    '../esm/native/builder/render_interior_sketch_shared.ts',
    '../esm/native/builder/render_interior_sketch_shared_external_drawers.ts',
  ]);
  assert.match(src, /const moduleDoorFaceSpan = resolveSketchModuleDoorFaceSpan\(\{/);
  assert.match(src, /const drawerFaceW = context\.moduleDoorFaceSpan\?\.spanW \?\? context\.outerW;/);
  assert.match(
    src,
    /const drawerFaceOffsetX =\s*\(context\.moduleDoorFaceSpan\?\.centerX \?\? context\.internalCenterX\) - context\.internalCenterX;/
  );
  assert.match(
    src,
    /applySketchExternalDrawerFaceOverrides\(drawerOps, drawerFaceW, drawerFaceOffsetX, context\.frontZ\);/
  );
  assert.match(shared, /drawer\.faceW = faceW;/);
  assert.match(sketchPickMeta, /export function applySketchModulePickMeta\(/);
  assert.match(
    src,
    /import \{ DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/drawer_sketch_policy\.js';/
  );
  assert.match(
    src,
    /const faceW = Math\.max\(\s*DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY\.externalPreviewVisualMinWidthM,\s*readRenderOpNumber\(op\.faceW\) \?\? visualW\s*\);/
  );
  assert.doesNotMatch(src, /const faceW = Math\.max\(0\.05, readRenderOpNumber\(op\.faceW\) \?\? visualW\);/);
  assert.match(src, /visualObj\.position\?\.set\?\.\(opPlan\.faceOffsetX, opPlan\.faceOffsetY, 0\);/);
  assert.match(src, /const doorStyle = resolveSketchDoorStyle\(input\);/);
  assert.doesNotMatch(src, /resolveSketchDoorStyle\(App, input\)/);
  const normalizedSrc = normalizeSource(src);
  assert.match(
    normalizedSrc,
    /resolveSketchFrontVisualState\(context\.input, opPlan\.partId\)[\s\S]*const effectiveFrameStyle = resolveEffectiveDoorStyle\(context\.doorStyle, context\.doorStyleMap, opPlan\.partId\);[\s\S]*context\.input\.createDoorVisual\([\s\S]*materialSet\.frontFaceMat,[\s\S]*frontVisualState\.isGlass \? 'glass' : effectiveFrameStyle,[\s\S]*frontVisualState\.mirrorLayout,[\s\S]*opPlan\.partId,[\s\S]*frontVisualState\.isGlass \? \{ glassFrameStyle: effectiveFrameStyle \} : null/
  );
  assert.match(src, /const boxExtDrawers = asRecordArray<InteriorValueRecord>\(box\.extDrawers\);/);
});

test('sketch box drawers and external drawers source use divider-aware spans', async () => {
  const src = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_ops_input.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_parts.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(src, /return \(item: InteriorValueRecord \| null\) => \{/);
  assert.match(
    src,
    /const boxDrawers = shouldRenderBoxInternalDrawers\(input\)[\s\S]*asRecordArray<SketchDrawerExtra>\(box\.drawers\)/
  );
  assert.match(src, /const spanSource = readRecord\(drawer\);/);
  assert.match(src, /const span = resolveBoxDrawerSpan\(spanSource\);/);
  assert.match(src, /const drawerFaceW = span\.faceW;/);
  assert.match(src, /const drawerFaceOffsetX = span\.faceCenterX - span\.outerCenterX;/);
});

test('sketch box external drawer cuts rebuild segmented box doors from drawer runtime bounds', async () => {
  const boxSrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_box.ts']);
  const applyOwnerSrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_apply.ts']);
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_box.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_shared.ts',
  ]);
  const applySrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_apply.ts']);
  const orchestratorSrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  const bundle = `${src}\n${applySrc}`;
  assert.match(
    src,
    /function collectSketchBoxExternalDrawerStackBounds\(App: AppContainer\): SketchBoxDrawerStackBounds\[]/
  );
  assert.match(applyOwnerSrc, /shared\/door_visual_key_contracts_shared\.js/);
  assert.match(applyOwnerSrc, /resolveDoorSplitAuthoringBaseKey/);
  assert.match(boxSrc, /readSketchDoorSplitSelection/);
  assert.match(applyOwnerSrc, /readSplitPosListFromMap/);
  assert.match(applyOwnerSrc, /readSplitStandardPosListFromMap/);
  assert.doesNotMatch(boxSrc, /readSketchBoxDoorBasePartId/);
  assert.match(src, /ud\.__wpSketchExtDrawer !== true/);
  assert.match(
    bundle,
    /const overlap = Math\.min\(doorXMax, stack\.xMax\) - Math\.max\(doorXMin, stack\.xMin\);/
  );
  assert.match(
    orchestratorSrc,
    /applySketchBoxExternalDrawerDoorCuts\([\s\S]*applyFrontRevealFrames\(ctx\);/
  );
});

test('sketch external drawers source matches regular width span, floor alignment, and segmented door frames', async () => {
  const sketchSrc = await readSourceFiles([
    '../esm/native/builder/render_interior_sketch_module_geometry.ts',
    '../esm/native/builder/render_interior_sketch_drawers.ts',
    '../esm/native/builder/render_interior_sketch_drawers_shared.ts',
    '../esm/native/builder/render_interior_sketch_drawers_external.ts',
    '../esm/native/builder/render_interior_sketch_drawers_external_plan.ts',
    '../esm/native/builder/render_interior_sketch_boxes.ts',
  ]);
  assert.match(
    sketchSrc,
    /const startDoorId = Math\.max\(1, Math\.floor\(toFiniteNumber\(input\.startDoorId\) \?\? 1\)\);/
  );
  assert.match(
    sketchSrc,
    /const moduleDoors = Math\.max\(1, Math\.floor\(toFiniteNumber\(input\.moduleDoors\) \?\? 1\)\);/
  );
  assert.match(sketchSrc, /const pivotMap = readObject<InteriorValueRecord>\(input\.hingedDoorPivotMap\);/);
  assert.match(sketchSrc, /startY: baseY - context\.woodThick,/);
});

test('sketch external drawer cuts and reveal frames use visible face envelope and segmented door frames', async () => {
  const sketchCutsSrc = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
  ]);
  const revealSrc = await readSourceFiles([
    '../esm/native/builder/post_build_front_reveal_frames.ts',
    '../esm/native/builder/post_build_front_reveal_frames_doors.ts',
  ]);
  const orchestratorSrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  assert.match(sketchCutsSrc, /const faceMinY = baseY \+ frontInset - surroundingGap;/);
  assert.match(sketchCutsSrc, /const faceMaxY = baseY \+ stackH - frontInset \+ surroundingGap;/);
  assert.match(revealSrc, /if \(g\.userData\.__wpSketchSegmentedDoor\) \{/);
  assert.match(revealSrc, /segUd\.__wpSketchDoorSegment/);
  assert.match(orchestratorSrc, /applySketchExternalDrawerDoorCuts\([\s\S]*applyFrontRevealFrames\(ctx\);/);
});

test('module sketch external drawer cuts use runtime drawer bounds so corner cells follow the real drawer front envelope', async () => {
  const src = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_shared.ts',
  ]);
  const applySrc = await readSourceFiles(['../esm/native/builder/post_build_sketch_door_cuts_apply.ts']);
  const bundle = `${src}\n${applySrc}`;
  assert.match(
    src,
    /function collectSketchModuleExternalDrawerStackBounds\(App: AppContainer\): SketchModuleDrawerStackCollection/
  );
  assert.match(
    src,
    /const runtimeStackCollection = collectSketchModuleExternalDrawerStackBounds\(App\);[\s\S]*const runtimeBounds = runtimeStackCollection\.bounds[\s\S]*item => item\.stackKey === stackKey[\s\S]*\);/
  );
  assert.match(
    src,
    /const moduleKeyRaw =[\s\S]*readStringOrNull\(ud\.__wpSketchModuleKey\) \|\| readStringOrNull\(ud\.moduleIndex\);/
  );
  assert.match(
    bundle,
    /const overlap = Math\.min\(doorXMax, stack\.xMax\) - Math\.max\(doorXMin, stack\.xMin\);/
  );
});

test('stack-split upper sketch external drawer face bounds are shifted with moved drawer groups', async () => {
  const src = await readSourceFiles(['../esm/native/builder/build_stack_shift_runtime.ts']);
  assert.match(src, /const userData = readRecord\(readRecord\(drawer\.group\)\?\.userData\);/);
  assert.match(src, /userData\.__wpFaceMinY \+= dy;/);
  assert.match(src, /userData\.__wpFaceMaxY \+= dy;/);
});

test('stack-split lower module sketch external drawer cuts run bottom pass and keep config-derived cuts stack-local', async () => {
  const overlaySrc = await readSourceFiles(['../esm/native/builder/post_build_visual_overlays.ts']);
  const cutsSrc = await readSourceFiles([
    '../esm/native/builder/post_build_sketch_door_cuts_modules.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_runtime.ts',
    '../esm/native/builder/post_build_sketch_door_cuts_contracts.ts',
  ]);

  assert.match(overlaySrc, /const moduleCutStackKeys: Array<'top' \| 'bottom'> =[\s\S]*\['top', 'bottom'\]/);
  assert.match(overlaySrc, /for \(const moduleCutStackKey of moduleCutStackKeys\)/);
  assert.match(overlaySrc, /stackKey: moduleCutStackKey/);
  assert.match(overlaySrc, /allowConfigDerivedCuts: moduleCutStackKey === stackKey/);
  assert.match(cutsSrc, /function normalizeSketchModuleCutKey\(/);
  assert.match(
    cutsSrc,
    /if \(stackKey === 'bottom'\) return key\.startsWith\('lower_'\) \? key : `lower_\$\{key\}`;/
  );
  assert.match(
    cutsSrc,
    /const moduleKey = normalizeSketchModuleCutKey\([\s\S]*readStringOrNull\(ud\.moduleIndex\),[\s\S]*stackKey[\s\S]*\);/
  );
  assert.match(cutsSrc, /getHandleType \? getHandleType\(partId, stackKey\) : null/);
  assert.match(cutsSrc, /stackKey\?: 'top' \| 'bottom';/);
  assert.match(cutsSrc, /allowConfigDerivedCuts\?: boolean;/);
  assert.match(cutsSrc, /const allowConfigDerivedCuts = args\.allowConfigDerivedCuts !== false;/);
  assert.match(
    cutsSrc,
    /const runtimeDrawerOwnerBlocksConfigFallback =[\s\S]*runtimeStackCollection\.hasRuntimeModuleDrawers\[stackKey\]/
  );
  assert.match(
    cutsSrc,
    /if \(!stacksByModule\.size && allowConfigDerivedCuts && !runtimeDrawerOwnerBlocksConfigFallback\) \{/
  );
  assert.match(
    cutsSrc,
    /const deferredSplitModuleKeys = collectSketchModuleDeferredSplitKeys\(ctx, stackKey\);/
  );
  assert.match(
    cutsSrc,
    /if \(!stacksByModule\.size && \(!splitMap \|\| !deferredSplitModuleKeys\.size\)\) return;[\s\S]*const runtime = createSketchDoorCutsRuntime\(\{/
  );
  assert.match(
    cutsSrc,
    /const isCanonicalSourceDoor = partId === basePartId \|\| partId === `\$\{basePartId\}_full`;/
  );
  assert.match(cutsSrc, /if \(!isCanonicalSourceDoor\) return null;/);
  assert.match(cutsSrc, /const ownsDeferredSplit = deferredSplitModuleKeys\.has\(moduleKey\);/);
});

test('free-placement sketch box inset doors reserve front depth for shelves', () => {
  const { boards, applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({ bodyDepth: 0.6 });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      cfgSnapshot: { doorMountMode: 'inset' },
      doorStyle: 'profile',
      woodThick: 0.036,
      sketchExtras: {
        boxes: [
          {
            id: 'freeInsetContentBox',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.8,
            widthM: 0.6,
            depthM: 0.5,
            doors: [{ id: 'doorA', enabled: true, hinge: 'left' }],
            shelves: [{ id: 'shelfA', yNorm: 0.5, depthM: 0.5 }],
          },
        ],
      },
    })
  );

  assert.equal(ok, true);
  const shelf = boards.find(
    board => board.userData.partId === 'sketch_box_free_0_freeInsetContentBox_shelf_shelfA'
  );
  assert.ok(shelf, 'shelf should render inside the free box');

  const shelfDepth = shelf.geometry.parameters.depth;
  const shelfFrontZ = shelf.position.z + shelfDepth / 2;
  const boxBackZ = -0.3;
  const boxFrontZ = boxBackZ + 0.5;
  const doorBackZ = boxFrontZ - 0.018 - 0.003;
  const expectedMaxShelfFrontZ = doorBackZ - 0.004;

  assert.ok(Math.abs(shelfDepth - (expectedMaxShelfFrontZ - (boxBackZ + 0.036))) < 1e-9);
  assert.ok(shelfFrontZ <= expectedMaxShelfFrontZ + 1e-9);
});

test('free-placement sketch box inset doors reserve front depth for internal drawers', () => {
  const capturedOps: Array<Record<string, unknown>> = [];
  const { applyInteriorSketchExtras, makeArgs } = createSketchInteriorHarness({
    bodyDepth: 0.6,
    applyInternalDrawersOps: (args: unknown) => {
      const rec = args as Record<string, unknown>;
      const ops = Array.isArray(rec.ops) ? (rec.ops as Array<Record<string, unknown>>) : [];
      capturedOps.push(...ops);
    },
  });

  const ok = applyInteriorSketchExtras(
    makeArgs({
      cfgSnapshot: { doorMountMode: 'inset' },
      woodThick: 0.036,
      sketchExtras: {
        boxes: [
          {
            id: 'freeInsetDrawerBox',
            freePlacement: true,
            absX: 0,
            absY: 1.0,
            heightM: 0.8,
            widthM: 0.6,
            depthM: 0.5,
            doors: [{ id: 'doorA', enabled: true, hinge: 'left' }],
            drawers: [{ id: 'drawersA', yNormC: 0.5 }],
          },
        ],
      },
      createInternalDrawerBox: () => null,
    })
  );

  assert.equal(ok, true);
  assert.equal(capturedOps.length, 2);
  const lower = capturedOps[0]!;
  const boxBackZ = -0.3;
  const innerBackZ = boxBackZ + 0.036;
  const boxFrontZ = boxBackZ + 0.5;
  const doorBackZ = boxFrontZ - 0.018 - 0.003;
  const usableDepth = doorBackZ - 0.004 - innerBackZ;

  assert.ok(Math.abs(Number(lower.depth) - (usableDepth - 0.02)) < 1e-9);
  assert.ok(Math.abs(Number(lower.z) - (innerBackZ + usableDepth / 2)) < 1e-9);
  assert.ok(Number(lower.z) + Number(lower.depth) / 2 <= doorBackZ - 0.004 + 1e-9);
});

type DrawerSpanResult = {
  segment: Record<string, number> | null;
  innerW: number;
  innerCenterX: number;
  outerW: number;
  outerCenterX: number;
  faceW: number;
  faceCenterX: number;
};

type DrawerSpanHarness = {
  order: string[];
  item: Record<string, unknown> | null;
  segment: Record<string, number> | null;
  shellResult: Record<string, unknown>;
  contentsResult: DrawerSpanResult | null;
  frontsResult: DrawerSpanResult | null;
  geometryPolicy: typeof SKETCH_BOX_SHELL_GEOMETRY_POLICY;
  previewPolicy: typeof SKETCH_BOX_DOOR_PREVIEW_POLICY;
};

function dataModule(source: string): string {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

async function loadInstrumentedSketchBoxRenderer(): Promise<{
  renderInteriorSketchBoxes(args: Record<string, unknown>): unknown;
}> {
  const sourcePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../esm/native/builder/render_interior_sketch_boxes.ts'
  );
  let source = fs.readFileSync(sourcePath, 'utf8');
  const modules = new Map<string, string>([
    [
      '../../shared/dimensions/sketch_box_geometry_policy.js',
      dataModule(
        `export const SKETCH_BOX_SHELL_GEOMETRY_POLICY = ${JSON.stringify(SKETCH_BOX_SHELL_GEOMETRY_POLICY)};`
      ),
    ],
    [
      '../../shared/dimensions/sketch_box_preview_policy.js',
      dataModule(
        `export const SKETCH_BOX_DOOR_PREVIEW_POLICY = ${JSON.stringify(SKETCH_BOX_DOOR_PREVIEW_POLICY)};`
      ),
    ],
    [
      './render_interior_sketch_boxes_shell.js',
      dataModule(
        "export function renderSketchBoxShell() { const h = globalThis.__wpDrawerSpanHarness; h.order.push('Shell'); return h.shellResult; }"
      ),
    ],
    [
      './render_interior_sketch_boxes_contents.js',
      dataModule(
        "export function renderSketchBoxContents(args) { const h = globalThis.__wpDrawerSpanHarness; h.order.push('Contents'); h.contentsResult = args.resolveBoxDrawerSpan(h.item); }"
      ),
    ],
    [
      './render_interior_sketch_boxes_fronts.js',
      dataModule(
        "export function renderSketchBoxFronts(args) { const h = globalThis.__wpDrawerSpanHarness; h.order.push('Fronts'); h.frontsResult = args.resolveBoxDrawerSpan(h.item); }"
      ),
    ],
    [
      './render_interior_sketch_layout.js',
      dataModule(
        'export function readSketchBoxDividers() { return []; } export function readSketchBoxHorizontalDividers() { return []; } export function resolveSketchBoxSegmentForContent() { return globalThis.__wpDrawerSpanHarness.segment; }'
      ),
    ],
  ]);
  for (const [specifier, replacement] of modules) {
    source = source.replaceAll(`'${specifier}'`, `'${replacement}'`);
  }
  const compiled = transformSync(source, {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
    sourcefile: sourcePath,
  }).code;
  return (await import(`${dataModule(compiled)}#drawer-span-runtime`)) as {
    renderInteriorSketchBoxes(args: Record<string, unknown>): unknown;
  };
}

function expectedDrawerSpan(args: {
  segment: Record<string, number> | null;
  woodThick: number;
  edgeEpsilon: number;
}): Omit<DrawerSpanResult, 'segment'> {
  const innerLeft = -0.5;
  const innerRight = 0.5;
  const segmentLeft = args.segment?.leftX ?? innerLeft;
  const segmentRight = args.segment?.rightX ?? innerRight;
  const leftExt = Math.abs(segmentLeft - innerLeft) <= args.edgeEpsilon ? args.woodThick : args.woodThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= args.edgeEpsilon ? args.woodThick : args.woodThick / 2;
  const outerLeft = segmentLeft - leftExt;
  const outerRight = segmentRight + rightExt;
  const outerWidth = Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM, outerRight - outerLeft);
  return {
    innerW: args.segment?.width ?? 1,
    innerCenterX: args.segment?.centerX ?? 0,
    outerW: outerWidth,
    outerCenterX: (outerLeft + outerRight) / 2,
    faceW: outerWidth,
    faceCenterX: (outerLeft + outerRight) / 2,
  };
}

test('renderInteriorSketchBoxes preserves drawer-span edge extensions, epsilon boundaries, minimum widths, and render order', async () => {
  const renderer = await loadInstrumentedSketchBoxRenderer();
  const woodThick = 0.018;
  const epsilon = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM;
  const shellState = {
    box: {},
    centerY: 0,
    sideH: 1,
    innerBottomY: -0.5,
    innerTopY: 0.5,
    geometry: { centerX: 0, innerW: 1 },
  };
  const harness: DrawerSpanHarness = {
    order: [],
    item: { xNorm: 0.5 },
    segment: null,
    shellResult: { state: shellState, absEntry: null },
    contentsResult: null,
    frontsResult: null,
    geometryPolicy: SKETCH_BOX_SHELL_GEOMETRY_POLICY,
    previewPolicy: SKETCH_BOX_DOOR_PREVIEW_POLICY,
  };
  const globalWithHarness = globalThis as typeof globalThis & { __wpDrawerSpanHarness?: DrawerSpanHarness };
  globalWithHarness.__wpDrawerSpanHarness = harness;

  const run = (
    segment: Record<string, number> | null,
    item: Record<string, unknown> | null = { xNorm: 0.5 }
  ) => {
    harness.order = [];
    harness.segment = segment;
    harness.item = item;
    harness.contentsResult = null;
    harness.frontsResult = null;
    renderer.renderInteriorSketchBoxes({
      boxes: [{}],
      woodThick,
      App: {},
      measureWardrobeLocalBox: () => null,
    });
    assert.deepEqual(harness.order, ['Shell', 'Contents', 'Fronts']);
    assert.deepEqual(harness.frontsResult, harness.contentsResult);
    assert.ok(harness.contentsResult);
    return harness.contentsResult;
  };

  try {
    const cases = [
      {
        name: 'both edges',
        segment: { leftX: -0.5, rightX: 0.5, width: 1, centerX: 0, index: 0, xNorm: 0.5 },
      },
      {
        name: 'left edge only',
        segment: { leftX: -0.5, rightX: 0.2, width: 0.7, centerX: -0.15, index: 0, xNorm: 0.35 },
      },
      {
        name: 'right edge only',
        segment: { leftX: -0.2, rightX: 0.5, width: 0.7, centerX: 0.15, index: 1, xNorm: 0.65 },
      },
      {
        name: 'internal',
        segment: { leftX: -0.2, rightX: 0.2, width: 0.4, centerX: 0, index: 1, xNorm: 0.5 },
      },
    ];
    for (const fixture of cases) {
      const actual = run(fixture.segment);
      const expected = expectedDrawerSpan({ segment: fixture.segment, woodThick, edgeEpsilon: epsilon });
      assert.deepEqual(actual, { segment: fixture.segment, ...expected }, fixture.name);
    }

    const fallback = run(null, null);
    assert.deepEqual(fallback, {
      segment: null,
      ...expectedDrawerSpan({ segment: null, woodThick, edgeEpsilon: epsilon }),
    });

    shellState.geometry.centerX = 0.5;
    for (const [label, distance, expectsFull] of [
      ['below', epsilon - 1e-9, true],
      ['exact', epsilon, true],
      ['above', epsilon + 1e-9, false],
    ] as const) {
      const segment = {
        leftX: distance,
        rightX: 0.7,
        width: 0.7 - distance,
        centerX: (distance + 0.7) / 2,
        index: 1,
        xNorm: 0.35,
      };
      const actual = run(segment);
      const expectedLeftExt = expectsFull ? woodThick : woodThick / 2;
      const expectedOuterLeft = segment.leftX - expectedLeftExt;
      const expectedOuterRight = segment.rightX + woodThick / 2;
      assert.ok(Math.abs(actual.outerW - (expectedOuterRight - expectedOuterLeft)) < 1e-12, label);
      assert.ok(Math.abs(actual.outerCenterX - (expectedOuterLeft + expectedOuterRight) / 2) < 1e-12, label);
    }
    shellState.geometry.centerX = 0;

    const tiny = {
      leftX: -0.001,
      rightX: 0.001,
      width: 0.002,
      centerX: 0,
      index: 0,
      xNorm: 0.5,
    };
    const minimum = run(tiny);
    assert.equal(minimum.outerW, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM);
    assert.equal(minimum.faceW, SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterWidthM);
    assert.equal(minimum.outerCenterX, 0);
    assert.equal(minimum.faceCenterX, 0);
  } finally {
    delete globalWithHarness.__wpDrawerSpanHarness;
  }
});
