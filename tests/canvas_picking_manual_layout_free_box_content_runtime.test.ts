import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveManualLayoutFreeBoxShelfGridPlan,
  resolvePresetLayoutFreeBoxPlan,
  tryCommitBraceShelvesFreeBoxFromHover,
  tryCommitManualLayoutFreeBoxFromHover,
  tryCommitPresetLayoutFreeBoxFromHover,
  tryHandleBraceShelvesFreeBoxHover,
  tryHandleManualLayoutFreeBoxHover,
  tryHandlePresetLayoutFreeBoxHover,
} from '../esm/native/services/canvas_picking_manual_layout_free_box_content.ts';
import {
  __wp_readSketchHover,
  __wp_writeSketchHover,
} from '../esm/native/services/canvas_picking_local_helpers.ts';
import { resolveSketchBoxVerticalContentPreview } from '../esm/native/services/canvas_picking_sketch_box_vertical_content_preview.ts';
import {
  pickSketchBoxSegment,
  pickSketchBoxVerticalSegment,
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
} from '../esm/native/services/canvas_picking_sketch_box_dividers.ts';

type RecordMap = Record<string, unknown>;

function makeNoMainApp(args: {
  patchCfg: RecordMap;
  hover?: RecordMap;
  toasts?: Array<[string, string | undefined]>;
  patchCalls?: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }>;
}) {
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [],
    },
    ui: { raw: { doors: 0 } },
    mode: {},
    runtime: {},
    meta: {},
  };
  const patchCalls = args.patchCalls ?? [];
  const toasts = args.toasts ?? [];
  const App = {
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: { cache: {} },
    services: {
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
    actions: {
      modules: {
        patchForStack: (
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: Record<string, unknown>
        ) => {
          patchCalls.push({ side, moduleKey, options });
          patcher(args.patchCfg);
        },
      },
    },
  };
  if (args.hover) __wp_writeSketchHover(App as never, args.hover);
  return { App: App as never, patchCalls, toasts };
}

test('manual-layout free-box shelf grid scopes five shelves to the active split cell', () => {
  const targetBox = {
    id: 'free-split',
    freePlacement: true,
    dividers: [{ id: 'v1', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5 }],
  };

  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox,
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0.25,
    pointerY: 1.25,
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, null);
  assert.equal(plan.shelfYs.length, 5);
  assert.equal(plan.shelfYNorms.length, 5);
  assert.ok(plan.shelfYs.every(y => y > 1 && y < 1.5));
  assert.ok(plan.shelfYNorms.every(yNorm => yNorm > 0.5 && yNorm < 1));
  assert.ok(plan.cellXNormMin >= 0.5);
  assert.equal(plan.cellXNormMax, 1);
  assert.ok(plan.contentXNorm > 0.5);
  assert.ok(plan.previewX > 0);
  assert.ok(plan.previewW <= 0.5);
});

test('manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short', () => {
  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox: { id: 'free-short', freePlacement: true },
    targetGeo: { centerX: 0, innerW: 0.8, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 0.12,
    pointerX: 0,
    pointerY: 1,
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, 'no-room');
  assert.equal(plan.shelfYs.length, 5);
});

test('manual-layout free-box shelf grid commit writes shelves into the no-main free box', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-split',
          freePlacement: true,
          absX: 1.2,
          absY: 1,
          widthM: 1,
          heightM: 1,
          depthM: 0.5,
          shelves: [
            { id: 'old-active', yNorm: 0.7, xNorm: 0.75, variant: 'regular' },
            { id: 'old-other-cell', yNorm: 0.25, xNorm: 0.25, variant: 'regular' },
            { id: 'old-string-cell', yNorm: 0.7, xNorm: '0.75', variant: 'regular' },
          ],
        },
      ],
    },
  };
  const { App, patchCalls } = makeNoMainApp({
    patchCfg: cfg,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      moduleKey: 0,
      isBottom: false,
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      op: 'add',
      freePlacement: true,
      boxId: 'free-split',
      shelfYNorms: [0.58, 0.66, 0.74, 0.82, 0.9],
      cellXNormMin: 0.5,
      cellXNormMax: 1,
      cellYNormMin: 0.5,
      cellYNormMax: 1,
      contentXNorm: 0.75,
      variant: 'regular',
      depthM: 0.37,
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'manualLayout.freeBoxShelfGrid', immediate: true },
  });

  const box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  const shelves = box.shelves as RecordMap[];
  assert.equal(shelves.length, 7);
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-active'),
    false
  );
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-other-cell'),
    true
  );
  assert.equal(
    shelves.some(shelf => shelf.id === 'old-string-cell'),
    true
  );
  assert.equal(shelves.filter(shelf => String(shelf.id || '').startsWith('sbc_')).length, 5);
  assert.ok(
    shelves
      .filter(shelf => String(shelf.id || '').startsWith('sbc_'))
      .every(shelf => shelf.xNorm === 0.75 && shelf.variant === 'regular' && shelf.depthM === 0.37)
  );
  assert.equal(__wp_readSketchHover(App), null);
});

test('manual-layout free-box shelf grid blocked commit consumes click without mutating', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [{ id: 'free-short', freePlacement: true, shelves: [] }],
    },
  };
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: Record<string, unknown> }> = [];
  const toasts: Array<[string, string | undefined]> = [];
  const { App } = makeNoMainApp({
    patchCfg: cfg,
    patchCalls,
    toasts,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      moduleKey: 0,
      isBottom: false,
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      op: 'add',
      freePlacement: true,
      boxId: 'free-short',
      shelfYNorms: [0.2, 0.4, 0.6, 0.8, 0.9],
      __wpBlockedReason: 'no-room',
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  assert.equal(patchCalls.length, 0);
  assert.equal(((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0]?.shelves?.length, 0);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0]?.[1], 'error');
  assert.equal(__wp_readSketchHover(App), null);
});

test('manual-layout free-box shelf grid blocks shelves that would collide with an existing rod', () => {
  const plan = resolveManualLayoutFreeBoxShelfGridPlan({
    targetBox: { id: 'free-cross', freePlacement: true, rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }] },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    currentGridDivisions: 4,
    shelfVariant: 'regular',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, 'collision');
  assert.equal(plan.shelfYNorms.includes(0.5), true);
});

test('manual-layout free-box rod hover can target an existing shelf for removal', () => {
  const preview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'rod', moduleKey: 0, isBottom: false },
    contentKind: 'rod',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: {
      id: 'free-cross',
      freePlacement: true,
      shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: 0.02,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(preview);
  assert.equal(preview.hoverRecord.kind, 'box_content');
  assert.equal(preview.hoverRecord.contentKind, 'shelf');
  assert.equal(preview.hoverRecord.op, 'remove');
  assert.equal(preview.hoverRecord.removeId, 'shelf-1');
  assert.equal(preview.preview.kind, 'shelf');
  assert.equal(preview.preview.op, 'remove');
});

test('manual-layout free-box shelf edit can target an existing rod or storage barrier for removal', () => {
  const rodPreview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'shelf', moduleKey: 0, isBottom: false },
    contentKind: 'shelf',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: { id: 'free-cross', freePlacement: true, rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }] },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: 0.02,
    shelfVariant: 'regular',
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
  const storagePreview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'shelf', moduleKey: 0, isBottom: false },
    contentKind: 'shelf',
    boxId: 'free-cross',
    freePlacement: true,
    targetBox: {
      id: 'free-cross',
      freePlacement: true,
      storageBarriers: [{ id: 'storage-1', yNorm: 0.5, xNorm: 0.5, heightM: 0.12 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1,
    woodThick: 0.02,
    shelfVariant: 'regular',
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.equal(rodPreview?.hoverRecord.contentKind, 'rod');
  assert.equal(rodPreview?.hoverRecord.op, 'remove');
  assert.equal(rodPreview?.hoverRecord.removeId, 'rod-1');
  assert.equal(storagePreview?.hoverRecord.contentKind, 'storage');
  assert.equal(storagePreview?.hoverRecord.op, 'remove');
  assert.equal(storagePreview?.hoverRecord.removeId, 'storage-1');
});

test('manual-layout free-box commits cross-kind removal hovers from shelf and rod tools', () => {
  const cfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-cross',
          freePlacement: true,
          shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5, variant: 'regular' }],
          rods: [{ id: 'rod-1', yNorm: 0.5, xNorm: 0.5 }],
          storageBarriers: [{ id: 'storage-1', yNorm: 0.5, xNorm: 0.5, heightM: 0.12 }],
        },
      ],
    },
  };

  const { App } = makeNoMainApp({
    patchCfg: cfg,
    hover: {
      ts: Date.now(),
      tool: 'shelf',
      moduleKey: 0,
      isBottom: false,
      hostModuleKey: 0,
      hostIsBottom: false,
      kind: 'box_content',
      contentKind: 'rod',
      op: 'remove',
      freePlacement: true,
      boxId: 'free-cross',
      removeId: 'rod-1',
      boxYNorm: 0.5,
      contentXNorm: 0.5,
    },
  });

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'shelf', 0), true);
  let box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.rods as RecordMap[]) ?? []).length, 0);

  __wp_writeSketchHover(App, {
    ts: Date.now(),
    tool: 'rod',
    moduleKey: 0,
    isBottom: false,
    hostModuleKey: 0,
    hostIsBottom: false,
    kind: 'box_content',
    contentKind: 'shelf',
    op: 'remove',
    freePlacement: true,
    boxId: 'free-cross',
    removeId: 'shelf-1',
    boxYNorm: 0.5,
    contentXNorm: 0.5,
  });
  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'rod', 0), true);
  box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.shelves as RecordMap[]) ?? []).length, 0);

  __wp_writeSketchHover(App, {
    ts: Date.now(),
    tool: 'rod',
    moduleKey: 0,
    isBottom: false,
    hostModuleKey: 0,
    hostIsBottom: false,
    kind: 'box_content',
    contentKind: 'storage',
    op: 'remove',
    freePlacement: true,
    boxId: 'free-cross',
    removeId: 'storage-1',
    boxYNorm: 0.5,
    contentXNorm: 0.5,
  });
  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App, 'rod', 0), true);
  box = (((cfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.storageBarriers as RecordMap[]) ?? []).length, 0);
});

test('manual-layout free-box storage removal hover covers the whole existing barrier height', () => {
  const preview = resolveSketchBoxVerticalContentPreview({
    host: { tool: 'sketch_storage:12', moduleKey: 0, isBottom: false },
    contentKind: 'storage',
    boxId: 'free-storage-wide',
    freePlacement: true,
    targetBox: {
      id: 'free-storage-wide',
      freePlacement: true,
      storageBarriers: [{ id: 'storage-wide', yNorm: 0.5, xNorm: 0.5, heightM: 0.2 }],
    },
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1,
    pointerX: 0,
    pointerY: 1.08,
    woodThick: 0.02,
    storageHeight: 0.12,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });

  assert.ok(preview);
  assert.equal(preview.hoverRecord.kind, 'box_content');
  assert.equal(preview.hoverRecord.contentKind, 'storage');
  assert.equal(preview.hoverRecord.op, 'remove');
  assert.equal(preview.hoverRecord.removeId, 'storage-wide');
  assert.equal(preview.preview.kind, 'storage');
  assert.equal(preview.preview.op, 'remove');
});

class LocalVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone(): LocalVector3 {
    return new LocalVector3(this.x, this.y, this.z);
  }

  add(other: { x: number; y: number; z: number }): LocalVector3 {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
    return this;
  }

  sub(other: { x: number; y: number; z: number }): LocalVector3 {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
    return this;
  }

  multiplyScalar(value: number): LocalVector3 {
    this.x *= value;
    this.y *= value;
    this.z *= value;
    return this;
  }
}

class LocalBox3 {}

test('manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-1',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1,
          depthM: 0.4,
          shelves: [],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'manual_layout', opts: { manualTool: 'shelf' } },
    runtime: {},
    meta: {},
  };
  const layoutPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const hideCalls = { layout: 0, sketch: 0 };
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.1, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-1_back' } },
        point: { x: 0.2, y: 1.1, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandleManualLayoutFreeBoxHover({
    App: App as never,
    tool: 'shelf',
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    currentGridDivisions: 6,
    shelfVariant: 'regular',
    setLayoutPreview: (preview: RecordMap) => {
      layoutPreviews.push(preview);
    },
    setSketchPreview: null,
    hideLayoutPreview: () => {
      hideCalls.layout += 1;
    },
    hideSketchPreview: () => {
      hideCalls.sketch += 1;
    },
  });

  assert.equal(handled, true);
  assert.equal(hideCalls.sketch, 1);
  assert.equal(layoutPreviews.length, 1);
  assert.equal(Array.isArray(layoutPreviews[0]?.shelfYs), true);
  assert.equal((layoutPreviews[0]?.shelfYs as unknown[]).length, 5);

  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_grid');
  assert.equal(hover.contentKind, 'shelf_grid');
  assert.equal(hover.freePlacement, true);
  assert.equal(hover.boxId, 'free-1');
  assert.equal(hover.hostModuleKey, 0);

  assert.equal(tryCommitManualLayoutFreeBoxFromHover(App as never, 'shelf', 0), true);
  assert.equal(patchCalls.length, 1);
  assert.equal(patchCalls[0]?.side, 'top');
  assert.equal(patchCalls[0]?.moduleKey, 0);
  const shelves = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0]?.shelves ??
    []) as RecordMap[];
  assert.equal(shelves.length, 5);
  assert.equal(__wp_readSketchHover(App as never), null);
});

test('preset layout free-box plan maps storage shortcut into active split cell contents', () => {
  const targetBox = {
    id: 'free-storage-split',
    freePlacement: true,
    dividers: [{ id: 'v1', xNorm: 0.5 }],
    horizontalDividers: [{ id: 'h1', yNorm: 0.5 }],
  };

  const plan = resolvePresetLayoutFreeBoxPlan({
    targetBox,
    targetGeo: { centerX: 0, innerW: 1, innerD: 0.5, innerBackZ: -0.25 },
    targetCenterY: 1,
    targetHeight: 1.6,
    pointerX: 0.25,
    pointerY: 1.25,
    layoutType: 'storage',
    woodThick: 0.02,
  });

  assert.equal(plan.blockedReason, null);
  assert.equal(plan.shelfYNorms.length, 2);
  assert.equal(plan.rodYNorms.length, 1);
  assert.ok(plan.storageYNorm != null);
  assert.ok(plan.cellXNormMin >= 0.5);
  assert.equal(plan.cellXNormMax, 1);
  assert.ok(plan.shelfYNorms.every(yNorm => yNorm > 0.5 && yNorm < 1));
});

test('preset layout shortcut hover and click target the free box instead of the wardrobe behind it', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-layout',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1.6,
          depthM: 0.4,
          dividers: [{ id: 'v1', xNorm: 0.5 }],
          shelves: [{ id: 'old-other-cell', yNorm: 0.25, xNorm: 0.25, variant: 'regular' }],
          rods: [],
          storageBarriers: [],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'layout', opts: { layoutType: 'storage' } },
    runtime: {},
    meta: {},
  };
  const layoutPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.25, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-layout_back' } },
        point: { x: 0.2, y: 1.25, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandlePresetLayoutFreeBoxHover({
    App: App as never,
    layoutType: 'storage',
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    setLayoutPreview: (preview: RecordMap) => {
      layoutPreviews.push(preview);
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  });

  assert.equal(handled, true);
  assert.equal(layoutPreviews.length, 1);
  assert.equal((layoutPreviews[0]?.shelfYs as unknown[]).length, 2);
  assert.equal((layoutPreviews[0]?.rodYs as unknown[]).length, 1);
  assert.ok(layoutPreviews[0]?.storageBarrier);

  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_preset');
  assert.equal(hover.contentKind, 'layout_preset');
  assert.equal(hover.freePlacement, true);
  assert.equal(hover.boxId, 'free-layout');

  assert.equal(tryCommitPresetLayoutFreeBoxFromHover(App as never), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'layoutPreset.freeBox', immediate: true },
  });
  const box = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  assert.equal(((box.shelves as RecordMap[]) ?? []).length, 2);
  assert.equal(((box.rods as RecordMap[]) ?? []).length, 1);
  assert.equal(((box.storageBarriers as RecordMap[]) ?? []).length, 1);
  assert.equal(__wp_readSketchHover(App as never), null);
});

test('brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe', () => {
  const modCfg: RecordMap = {
    sketchExtras: {
      boxes: [
        {
          id: 'free-brace',
          freePlacement: true,
          absX: 0.2,
          absY: 1.1,
          widthM: 0.8,
          heightM: 1,
          depthM: 0.4,
          shelves: [{ id: 'shelf-1', yNorm: 0.5, xNorm: 0.5, variant: 'regular', depthM: 0.37 }],
        },
      ],
    },
  };
  const state = {
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [modCfg],
    },
    ui: {
      doors: 0,
      raw: { doors: 0, width: 200, height: 220, depth: 60 },
    },
    mode: { primary: 'brace_shelves', opts: {} },
    runtime: {},
    meta: {},
  };
  const sketchPreviews: RecordMap[] = [];
  const patchCalls: Array<{ side: string; moduleKey: unknown; options: RecordMap }> = [];
  const wardrobeGroup = {
    children: [],
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
    },
  };
  const raycaster = {
    ray: { origin: { x: 0.2, y: 1.1, z: 0 }, direction: { x: 0, y: 0, z: -1 } },
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, target?: Array<RecordMap>) {
      const hit = {
        object: { userData: { partId: 'sketch_box_free_0_free-brace_back' } },
        point: { x: 0.2, y: 1.1, z: -0.2 },
      };
      if (Array.isArray(target)) {
        target.push(hit);
        return target;
      }
      return [hit];
    },
  };
  const App = {
    deps: { THREE: { Vector3: LocalVector3, Box3: LocalBox3 } },
    store: {
      getState: () => state,
      patch: () => null,
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup,
      cache: {},
    },
    services: {},
    actions: {
      modules: {
        patchForStack(
          side: string,
          moduleKey: unknown,
          patcher: (cfg: RecordMap) => void,
          options: RecordMap
        ) {
          patchCalls.push({ side, moduleKey, options });
          patcher(modCfg);
        },
      },
    },
  };

  const handled = tryHandleBraceShelvesFreeBoxHover({
    App: App as never,
    ndcX: 0,
    ndcY: 0,
    raycaster: raycaster as never,
    mouse: { x: 0, y: 0 },
    setSketchPreview: (preview: RecordMap) => {
      sketchPreviews.push(preview);
    },
    hideLayoutPreview: () => undefined,
    hideSketchPreview: () => undefined,
  });

  assert.equal(handled, true);
  assert.equal(sketchPreviews.length, 1);
  assert.equal(sketchPreviews[0]?.variant, 'brace');
  const hover = __wp_readSketchHover(App as never) as RecordMap;
  assert.equal(hover.kind, 'box_content_brace_shelf');
  assert.equal(hover.boxId, 'free-brace');
  assert.equal(hover.shelfId, 'shelf-1');

  assert.equal(tryCommitBraceShelvesFreeBoxFromHover(App as never), true);
  assert.equal(patchCalls.length, 1);
  assert.deepEqual(patchCalls[0], {
    side: 'top',
    moduleKey: 0,
    options: { source: 'braceShelves.freeBoxToggle', immediate: true },
  });
  const box = (((modCfg.sketchExtras as RecordMap).boxes as RecordMap[])[0] ?? {}) as RecordMap;
  const shelf = ((box.shelves as RecordMap[]) ?? [])[0] as RecordMap;
  assert.equal(shelf.variant, 'brace');
  assert.equal(shelf.depthM, 0.382);
  assert.equal(__wp_readSketchHover(App as never), null);
});
