import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import type { IndividualColorsMap } from '../types/maps.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();

function resolveTsPath(specifier: string, fromFile: string): string | null {
  if (specifier.startsWith('.')) {
    const resolved = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [resolved, resolved.replace(/\.js$/i, '.ts'), resolved.replace(/\.js$/i, '.js')];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function loadTsModule(file: string): Record<string, unknown> {
  const normalized = path.resolve(file);
  const cached = moduleCache.get(normalized);
  if (cached) return cached.exports;

  const source = fs.readFileSync(normalized, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: normalized,
  }).outputText;

  const mod = { exports: {} as Record<string, unknown> };
  moduleCache.set(normalized, mod);
  const localRequire = (specifier: string) => {
    const maybeTs = resolveTsPath(specifier, normalized);
    if (maybeTs) return loadTsModule(maybeTs);
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(normalized),
    __filename: normalized,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: normalized });
  return mod.exports;
}

const { makeMaterialResolver } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/material_resolver.ts')
) as {
  makeMaterialResolver: typeof import('../esm/native/builder/material_resolver.ts').makeMaterialResolver;
};
const { applyGroupedOrCornerPaintTarget } = loadTsModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_flow_apply_targets.ts')
) as {
  applyGroupedOrCornerPaintTarget: typeof import('../esm/native/services/canvas_picking_paint_flow_apply_targets.ts').applyGroupedOrCornerPaintTarget;
};
const { resolvePaintTargetKeys } = loadTsModule(
  path.join(process.cwd(), 'esm/native/services/canvas_picking_paint_targets.ts')
) as {
  resolvePaintTargetKeys: typeof import('../esm/native/services/canvas_picking_paint_targets.ts').resolvePaintTargetKeys;
};
const { applyCorniceSegment } = loadTsModule(
  path.join(process.cwd(), 'esm/native/builder/render_carcass_ops_cornice_apply.ts')
) as {
  applyCorniceSegment: typeof import('../esm/native/builder/render_carcass_ops_cornice_apply.ts').applyCorniceSegment;
};

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
) {
  return {
    originalFoundPartId: foundPartId,
    stack: activeStack,
    selection: paintSelection,
    targetScope: { stackSplitUnifiedFrame: false },
  };
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
    command: makePaintCommand('cornice_wave_side_left', '#222222') as never,
  });

  assert.equal(handledWaveSide, false);
  assert.deepEqual(state.colors, { cornice_color: '#111111' });

  const handledClassicCornice = applyGroupedOrCornerPaintTarget({
    state: state as never,
    command: makePaintCommand('cornice_color', '#333333') as never,
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
