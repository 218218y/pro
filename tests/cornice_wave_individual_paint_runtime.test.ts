import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import type { IndividualColorsMap } from '../types/maps.ts';

const loaderModulePath = ['./', '_ts', '_runtime_module_loader.mjs'].join('');
const { loadTsRuntimeModule } = (await import(loaderModulePath)) as {
  loadTsRuntimeModule: (file: string, options?: Record<string, unknown>) => Record<string, unknown>;
};

const { makeMaterialResolver } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/native/builder/material_resolver.ts')
) as {
  makeMaterialResolver: typeof import('../esm/native/builder/material_resolver.ts').makeMaterialResolver;
};
const { applyGroupedOrCornerPaintTarget } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_flow_apply_targets.ts')
) as {
  applyGroupedOrCornerPaintTarget: typeof import('../esm/native/services/canvas_picking_paint_flow_apply_targets.ts').applyGroupedOrCornerPaintTarget;
};
const { resolvePaintTargetKeys } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_targets.ts')
) as {
  resolvePaintTargetKeys: typeof import('../esm/native/services/canvas_picking_paint_targets.ts').resolvePaintTargetKeys;
};
const { applyCorniceSegment } = loadTsRuntimeModule(
  path.join(process.cwd(), 'esm/native/builder/render_carcass_ops_cornice_apply.ts')
) as {
  applyCorniceSegment: typeof import('../esm/native/builder/render_carcass_ops_cornice_apply.ts').applyCorniceSegment;
};

type PaintCommand = Parameters<typeof applyGroupedOrCornerPaintTarget>[0]['command'];

type MutablePaintState = {
  colors: IndividualColorsMap;
  ensureColors: () => IndividualColorsMap;
};

function makePaintState(colors: IndividualColorsMap = {}): MutablePaintState {
  return {
    colors,
    ensureColors() {
      return this.colors;
    },
  };
}

function makePaintCommand(
  foundPartId: string,
  paintSelection: string,
  activeStack: 'top' | 'bottom' = 'top'
): PaintCommand {
  const command: PaintCommand = {
    selection: paintSelection,
    sourceTag: 'paint.apply:group',
    targetKind: 'module',
    originalFoundPartId: foundPartId,
    canonicalPartKey: foundPartId,
    effectiveDoorId: null,
    doorStyleTargetKey: null,
    drawerId: null,
    stack: activeStack,
    targetScope: { stackSplitUnifiedFrame: false },
    hitIdentity: null,
    hitReferences: {
      primaryObject: null,
      doorObject: null,
      primaryPoint: null,
      doorPoint: null,
    },
    mutationKind: 'group',
    invalidationKind: 'materialRefreshOnly',
  };
  return command;
}

function resolvePaintTargetKeysForAssert(partId: string, activeStack: 'top' | 'bottom'): string[] {
  return Array.from(resolvePaintTargetKeys(partId, activeStack));
}

test('main wave cornice paint targets resolve front and each side as independent fascia parts', () => {
  assert.deepEqual(resolvePaintTargetKeysForAssert('cornice_wave_front', 'top'), ['cornice_wave_front']);
  assert.deepEqual(resolvePaintTargetKeysForAssert('cornice_wave_side_left', 'top'), [
    'cornice_wave_side_left',
  ]);
  assert.deepEqual(resolvePaintTargetKeysForAssert('cornice_wave_side_right', 'top'), [
    'cornice_wave_side_right',
  ]);
  assert.deepEqual(resolvePaintTargetKeysForAssert('cornice_color', 'top'), ['cornice_color']);
});

test('hex-cell wave diagonal fillers inherit the main front paint part', () => {
  const resolver = makeMaterialResolver({
    App: {} as never,
    THREE: {} as never,
    cfg: {
      isMultiColorMode: true,
      individualColors: {
        cornice_color: '#111111',
        cornice_wave_front: '#444444',
      },
    },
    getMaterial(color, kind) {
      return `${kind}:${color}`;
    },
    globalFrontMat: 'front:global',
  });

  assert.equal(resolver.getPartColorValue('cornice_wave_front'), '#444444');
  assert.equal(resolver.getPartMaterial('cornice_wave_front'), 'front:#444444');
});

test('wave cornice click flow leaves fascia parts for direct per-part mutation instead of grouped cornice paint', () => {
  const state = makePaintState({ cornice_color: '#111111' });

  const handledWaveSide = applyGroupedOrCornerPaintTarget({
    state: state as never,
    command: makePaintCommand('cornice_wave_side_left', '#222222'),
  });

  assert.equal(handledWaveSide, false);
  assert.deepEqual(state.colors, { cornice_color: '#111111' });

  const handledClassicCornice = applyGroupedOrCornerPaintTarget({
    state: state as never,
    command: makePaintCommand('cornice_color', '#333333'),
  });

  assert.equal(handledClassicCornice, true);
  assert.deepEqual(state.colors, { cornice_color: '#333333' });
});

test('material resolver lets wave cornice fascia overrides win while unresolved fascia inherit cornice_color', () => {
  const resolver = makeMaterialResolver({
    App: {} as never,
    THREE: {} as never,
    cfg: {
      isMultiColorMode: true,
      individualColors: {
        cornice_color: '#111111',
        cornice_wave_side_left: '#222222',
      },
    },
    getMaterial(color, kind) {
      return `${kind}:${color}`;
    },
    globalFrontMat: 'front:global',
  });

  assert.equal(resolver.getPartColorValue('cornice_wave_front'), '#111111');
  assert.equal(resolver.getPartMaterial('cornice_wave_front'), 'front:#111111');
  assert.equal(resolver.getPartColorValue('cornice_wave_side_left'), '#222222');
  assert.equal(resolver.getPartMaterial('cornice_wave_side_left'), 'front:#222222');
  assert.equal(resolver.getPartColorValue('cornice_wave_side_right'), '#111111');
  assert.equal(resolver.getPartMaterial('cornice_wave_side_right'), 'front:#111111');
});

test('wave cornice renderer keeps the shared cornice material as fallback while applying fascia overrides', () => {
  const added: Array<{ material?: unknown; userData?: Record<string, unknown> }> = [];
  class ShapeStub {
    moveTo() {}
    lineTo() {}
  }
  class ExtrudeGeometryStub {
    translate() {}
  }
  class MeshStub {
    geometry: unknown;
    material: unknown;
    scale = { x: 1 };
    rotation = { y: 0 };
    position = { set() {} };
    userData: Record<string, unknown> = {};
    constructor(geometry: unknown, material: unknown) {
      this.geometry = geometry;
      this.material = material;
    }
  }
  const runtime = {
    App: {},
    THREE: {
      Shape: ShapeStub,
      ExtrudeGeometry: ExtrudeGeometryStub,
      Mesh: MeshStub,
    },
    wardrobeGroup: {
      add(mesh: { material?: unknown; userData?: Record<string, unknown> }) {
        added.push(mesh);
      },
    },
    ctx: { bodyMat: 'bodyMat' },
    addOutlines() {},
    getPartMaterial(partId: string) {
      return partId === 'cornice_wave_side_left' ? 'leftOverrideMat' : null;
    },
    sketchMode: false,
    reg() {},
    renderOpsHandleCatch() {},
  };

  applyCorniceSegment(
    {
      kind: 'cornice_wave_side',
      partId: 'cornice_wave_side_left',
      x: 0,
      y: 0,
      z: 0,
      width: 10,
      height: 2,
      depth: 1,
    },
    'cornice_color',
    'corniceMat',
    runtime as never
  );
  applyCorniceSegment(
    {
      kind: 'cornice_wave_side',
      partId: 'cornice_wave_side_right',
      x: 0,
      y: 0,
      z: 0,
      width: 10,
      height: 2,
      depth: 1,
    },
    'cornice_color',
    'corniceMat',
    runtime as never
  );

  assert.equal(added[0]?.material, 'leftOverrideMat');
  assert.equal(added[0]?.userData?.partId, 'cornice_wave_side_left');
  assert.equal(added[1]?.material, 'corniceMat');
  assert.equal(added[1]?.userData?.partId, 'cornice_wave_side_right');
});
