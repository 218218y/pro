import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCarcassAndGetCabinetMetrics } from '../esm/native/builder/carcass_pipeline.ts';
import { forceShelfIndexesToBrace } from '../esm/native/builder/removed_frame_side_brace_shelves.ts';
import {
  resolveRemovedFrameSideConstructionPlan,
  resolveRemovedFrameSideModuleConstructionPlan,
} from '../esm/native/builder/removed_frame_side_construction_plan.ts';

import type {
  RemovedFrameSideDoorDisposition,
  RemovedFrameSideShelfExposure,
  RemovedFrameSideShelfRounding,
} from '../esm/native/builder/removed_frame_side_construction_plan.ts';

type AnyRecord = Record<string, unknown>;
type FrameSidePrefix = '' | 'lower_';
type CorniceType = 'classic' | 'wave';

type MatrixExpected = {
  removedLeft: boolean;
  removedRight: boolean;
  exposedSide: RemovedFrameSideShelfExposure | null;
  roundedSide: RemovedFrameSideShelfRounding | null;
  forceBraceShelves: boolean;
  backPanelPartId: string | null;
  doorDisposition: RemovedFrameSideDoorDisposition;
  frontClosurePartId: string | null;
};

type MatrixScenario = {
  name: string;
  cfg: AnyRecord;
  frameSidePartIdPrefix?: FrameSidePrefix;
  moduleIndex: number;
  modulesLength: number;
  startDoorId: number;
  moduleDoors: number;
  corniceType?: CorniceType;
  expected: MatrixExpected;
};

const TOTAL_W = 2;
const DEPTH = 0.6;
const HEIGHT = 2.4;
const WOOD_THICK = 0.018;
const DEFAULT_CORNICE_TYPE: CorniceType = 'classic';

function asRecord(value: unknown): AnyRecord {
  return (value && typeof value === 'object' ? value : {}) as AnyRecord;
}

function moduleInternalWidths(moduleCount: number): number[] {
  const internalTotal = TOTAL_W - (moduleCount + 1) * WOOD_THICK;
  const width = internalTotal / moduleCount;
  return Array.from({ length: moduleCount }, () => width);
}

function readCorniceFrontBounds(corniceValue: unknown): { left: number; right: number } {
  const cornice = asRecord(corniceValue);
  const segments = Array.isArray(cornice.segments) ? cornice.segments.map(asRecord) : [];
  const frontSegments = segments.filter(segment => {
    if (segment.kind === 'cornice_wave_front') return true;
    return segment.kind === 'cornice_profile_seg' && Math.abs(Number(segment.rotationY) + Math.PI / 2) < 1e-9;
  });
  assert.ok(frontSegments.length > 0, 'expected at least one front cornice segment');

  const edges = frontSegments.map(segment => {
    const span = Number(segment.length ?? segment.width);
    const x = Number(segment.x);
    assert.ok(Number.isFinite(span) && span > 0, 'cornice front segment span must be positive');
    assert.ok(Number.isFinite(x), 'cornice front segment X must be finite');
    return { left: x - span / 2, right: x + span / 2 };
  });

  return {
    left: Math.min(...edges.map(edge => edge.left)),
    right: Math.max(...edges.map(edge => edge.right)),
  };
}

function buildCarcassSnapshot(args: {
  cfg: AnyRecord;
  frameSidePartIdPrefix: FrameSidePrefix;
  modulesLength: number;
  corniceType: CorniceType;
}) {
  const result = applyCarcassAndGetCabinetMetrics({
    App: {},
    cfg: args.cfg,
    totalW: TOTAL_W,
    D: DEPTH,
    H: HEIGHT,
    woodThick: WOOD_THICK,
    doorsCount: args.modulesLength,
    baseType: '',
    hasCornice: true,
    corniceType: args.corniceType,
    moduleInternalWidths: moduleInternalWidths(args.modulesLength),
    frameSidePartIdPrefix: args.frameSidePartIdPrefix,
    partIdPrefix: args.frameSidePartIdPrefix,
    renderCarcass: false,
  });
  return asRecord(result.carcassOps);
}

function readBackPanelPartId(carcassOps: AnyRecord, moduleIndex: number): string | null {
  const backPanels = Array.isArray(carcassOps.backPanels) ? carcassOps.backPanels.map(asRecord) : [];
  const panel = backPanels[moduleIndex];
  return typeof panel?.partId === 'string' ? panel.partId : null;
}

function assertApprox(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

const SCENARIOS: readonly MatrixScenario[] = [
  {
    name: 'intact hinged main stack stays on the normal construction path',
    cfg: { wardrobeType: 'hinged' },
    moduleIndex: 0,
    modulesLength: 2,
    startDoorId: 1,
    moduleDoors: 1,
    expected: {
      removedLeft: false,
      removedRight: false,
      exposedSide: null,
      roundedSide: null,
      forceBraceShelves: false,
      backPanelPartId: null,
      doorDisposition: 'unchanged',
      frontClosurePartId: null,
    },
  },
  {
    name: 'removed rounded left side coordinates brace, wood back, fixed closure, and classic cornice',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: { removed_body_left: true },
      roundedFrameSideShelvesMap: { body_left: true },
    },
    moduleIndex: 0,
    modulesLength: 3,
    startDoorId: 1,
    moduleDoors: 2,
    expected: {
      removedLeft: true,
      removedRight: false,
      exposedSide: 'left',
      roundedSide: 'left',
      forceBraceShelves: true,
      backPanelPartId: 'body_back_left_open',
      doorDisposition: 'fixed-front-closure',
      frontClosurePartId: 'body_front_closure_left',
    },
  },
  {
    name: 'removed square right side coordinates brace, wood back, fixed closure, and wave cornice',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: { removed_body_right: true },
    },
    moduleIndex: 2,
    modulesLength: 3,
    startDoorId: 4,
    moduleDoors: 1,
    corniceType: 'wave',
    expected: {
      removedLeft: false,
      removedRight: true,
      exposedSide: 'right',
      roundedSide: null,
      forceBraceShelves: true,
      backPanelPartId: 'body_back_right_open',
      doorDisposition: 'fixed-front-closure',
      frontClosurePartId: 'body_front_closure_right',
    },
  },
  {
    name: 'explicit hinged-door removal wins over front closure without disabling the structural open-side plan',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: {
        removed_body_left: true,
        removed_d1_full: true,
      },
    },
    moduleIndex: 0,
    modulesLength: 2,
    startDoorId: 1,
    moduleDoors: 1,
    expected: {
      removedLeft: true,
      removedRight: false,
      exposedSide: 'left',
      roundedSide: null,
      forceBraceShelves: true,
      backPanelPartId: 'body_back_left_open',
      doorDisposition: 'respect-explicit-door-removal',
      frontClosurePartId: null,
    },
  },
  {
    name: 'sliding wardrobe keeps door disposition unchanged while preserving removed-side carcass behavior',
    cfg: {
      wardrobeType: 'sliding',
      removedDoorsMap: { removed_body_left: true },
      roundedFrameSideShelvesMap: { body_left: true },
    },
    moduleIndex: 0,
    modulesLength: 2,
    startDoorId: 1,
    moduleDoors: 1,
    expected: {
      removedLeft: true,
      removedRight: false,
      exposedSide: 'left',
      roundedSide: 'left',
      forceBraceShelves: true,
      backPanelPartId: 'body_back_left_open',
      doorDisposition: 'unchanged',
      frontClosurePartId: null,
    },
  },
  {
    name: 'lower-stack right side uses lower identity consistently across construction outputs',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: { removed_lower_body_right: true },
      roundedFrameSideShelvesMap: { lower_body_right: true },
    },
    frameSidePartIdPrefix: 'lower_',
    moduleIndex: 1,
    modulesLength: 2,
    startDoorId: 1001,
    moduleDoors: 2,
    corniceType: 'wave',
    expected: {
      removedLeft: false,
      removedRight: true,
      exposedSide: 'right',
      roundedSide: 'right',
      forceBraceShelves: true,
      backPanelPartId: 'lower_body_back_right_open',
      doorDisposition: 'fixed-front-closure',
      frontClosurePartId: 'lower_body_front_closure_right',
    },
  },
  {
    name: 'upper removed-side state cannot leak into a lower-stack construction plan',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: { removed_body_left: true },
      roundedFrameSideShelvesMap: { body_left: true },
    },
    frameSidePartIdPrefix: 'lower_',
    moduleIndex: 0,
    modulesLength: 2,
    startDoorId: 1001,
    moduleDoors: 1,
    expected: {
      removedLeft: false,
      removedRight: false,
      exposedSide: null,
      roundedSide: null,
      forceBraceShelves: false,
      backPanelPartId: null,
      doorDisposition: 'unchanged',
      frontClosurePartId: null,
    },
  },
  {
    name: 'both removed sides on one module produce one coherent both-side construction decision',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: {
        removed_body_left: true,
        removed_body_right: true,
      },
      roundedFrameSideShelvesMap: {
        body_left: true,
        body_right: true,
      },
    },
    moduleIndex: 0,
    modulesLength: 1,
    startDoorId: 1,
    moduleDoors: 2,
    expected: {
      removedLeft: true,
      removedRight: true,
      exposedSide: 'both',
      roundedSide: 'both',
      forceBraceShelves: true,
      backPanelPartId: 'body_back_open',
      doorDisposition: 'fixed-front-closure',
      frontClosurePartId: 'body_front_closure_both',
    },
  },
  {
    name: 'middle module remains structurally untouched when both exterior frame sides are removed',
    cfg: {
      wardrobeType: 'hinged',
      removedDoorsMap: {
        removed_body_left: true,
        removed_body_right: true,
      },
      roundedFrameSideShelvesMap: {
        body_left: true,
        body_right: true,
      },
    },
    moduleIndex: 1,
    modulesLength: 3,
    startDoorId: 3,
    moduleDoors: 1,
    expected: {
      removedLeft: true,
      removedRight: true,
      exposedSide: null,
      roundedSide: null,
      forceBraceShelves: false,
      backPanelPartId: null,
      doorDisposition: 'unchanged',
      frontClosurePartId: null,
    },
  },
];

for (const scenario of SCENARIOS) {
  test(`removed-frame-side construction matrix: ${scenario.name}`, () => {
    const frameSidePartIdPrefix = scenario.frameSidePartIdPrefix ?? '';
    const corniceType = scenario.corniceType ?? DEFAULT_CORNICE_TYPE;
    const constructionPlan = resolveRemovedFrameSideConstructionPlan({
      cfg: scenario.cfg,
      frameSidePartIdPrefix,
    });
    const modulePlan = resolveRemovedFrameSideModuleConstructionPlan({
      cfg: scenario.cfg,
      constructionPlan,
      moduleIndex: scenario.moduleIndex,
      modulesLength: scenario.modulesLength,
      startDoorId: scenario.startDoorId,
      moduleDoors: scenario.moduleDoors,
    });

    assert.equal(constructionPlan.left.removed, scenario.expected.removedLeft);
    assert.equal(constructionPlan.right.removed, scenario.expected.removedRight);
    assert.equal(
      constructionPlan.hasRemovedSide,
      scenario.expected.removedLeft || scenario.expected.removedRight
    );
    assert.equal(modulePlan.exposedShelfSide, scenario.expected.exposedSide);
    assert.equal(modulePlan.roundedShelfSide, scenario.expected.roundedSide);
    assert.equal(modulePlan.forceBraceShelves, scenario.expected.forceBraceShelves);
    assert.equal(
      modulePlan.backPanel.partId,
      scenario.expected.backPanelPartId?.replace(/^lower_/, '') ?? null
    );
    assert.equal(modulePlan.doorDisposition, scenario.expected.doorDisposition);
    assert.equal(modulePlan.frontClosure?.partId ?? null, scenario.expected.frontClosurePartId);

    const braceSet: Record<number, true> = Object.create(null);
    if (modulePlan.forceBraceShelves) {
      forceShelfIndexesToBrace({ braceSet, shelfSet: { 2: true, 4: true } });
    }
    assert.deepEqual(Object.keys(braceSet), scenario.expected.forceBraceShelves ? ['2', '4'] : []);

    const carcassOps = buildCarcassSnapshot({
      cfg: scenario.cfg,
      frameSidePartIdPrefix,
      modulesLength: scenario.modulesLength,
      corniceType,
    });
    assert.equal(
      readBackPanelPartId(carcassOps, scenario.moduleIndex),
      scenario.expected.backPanelPartId,
      'observable back-panel identity must agree with the module construction plan'
    );

    const intactCarcassOps = buildCarcassSnapshot({
      cfg: { wardrobeType: scenario.cfg.wardrobeType },
      frameSidePartIdPrefix,
      modulesLength: scenario.modulesLength,
      corniceType,
    });
    const actualCorniceBounds = readCorniceFrontBounds(carcassOps.cornice);
    const intactCorniceBounds = readCorniceFrontBounds(intactCarcassOps.cornice);

    const expectedLeftShift = scenario.expected.removedLeft ? WOOD_THICK : 0;
    const expectedRightShift = scenario.expected.removedRight ? -WOOD_THICK : 0;
    assertApprox(
      actualCorniceBounds.left - intactCorniceBounds.left,
      expectedLeftShift,
      'cornice left terminal must follow the same removed-side decision'
    );
    assertApprox(
      actualCorniceBounds.right - intactCorniceBounds.right,
      expectedRightShift,
      'cornice right terminal must follow the same removed-side decision'
    );
  });
}
