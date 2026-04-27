import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveManualLayoutSketchHoverModuleContext } from '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts';

function createApp(config: Record<string, unknown>, gridInfo: Record<string, unknown>, isBottom = false) {
  const runtimeCache = isBottom
    ? { internalGridMapSplitBottom: { 'corner:1': gridInfo } }
    : { internalGridMap: { 'corner:1': gridInfo } };
  return {
    services: { runtimeCache },
    store: {
      getState() {
        return {
          config,
          ui: {},
          mode: {},
          runtime: {},
          meta: {},
        };
      },
      patch() {
        return undefined;
      },
      subscribe() {
        return () => undefined;
      },
    },
  } as any;
}

test('manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides', () => {
  const App = createApp(
    {
      cornerConfiguration: { layout: 'shelves' },
    },
    {
      effectiveBottomY: 0,
      effectiveTopY: 1,
      woodThick: 0.02,
      innerW: 0.8,
      internalCenterX: 0,
      internalDepth: 0.55,
      internalZ: -0.1,
    }
  );

  const ctx = resolveManualLayoutSketchHoverModuleContext({
    App,
    tool: 'sketch_box:80:45:35',
    freeBoxSpec: { heightCm: 80, widthCm: 45, depthCm: 35 },
    hitModuleKey: 'corner:1',
    hitSelectorObj: {
      userData: { isModuleSelector: true },
      geometry: { boundingBox: { min: { x: -0.5, y: 0, z: -0.2 }, max: { x: 0.5, y: 1, z: 0.2 } } },
      updateWorldMatrix() {},
      updateMatrixWorld() {},
      localToWorld(v: any) {
        return v;
      },
    },
    hitStack: 'top',
    hitY: 0.95,
    hitLocalX: 0.1,
    intersects: [],
    setPreview: null,
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isCornerKey: value => typeof value === 'string' && value.startsWith('corner'),
    __wp_isDefaultCornerCellCfgLike: () => false,
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: () => undefined,
  });

  assert.ok(ctx);
  assert.equal(ctx?.isBox, true);
  assert.equal(ctx?.boxWidthOverrideM, 0.45);
  assert.equal(ctx?.boxDepthOverrideM, 0.35);
  assert.equal(ctx?.boxH, 0.8);
  assert.equal(ctx?.yClamped, 0.596);
});

test('manual-layout hover module context falls back to the corner root config when no cell config exists', () => {
  const App = createApp(
    {
      cornerConfiguration: {
        layout: 'custom_root',
        sketchExtras: {
          shelves: [{ id: 'root-shelf', yNorm: 0.4 }],
        },
      },
    },
    {
      effectiveBottomY: 0,
      effectiveTopY: 2,
      woodThick: 0.02,
      innerW: 1,
      internalCenterX: 0,
      internalDepth: 0.6,
      internalZ: -0.1,
    }
  );

  const ctx = resolveManualLayoutSketchHoverModuleContext({
    App,
    tool: 'sketch_shelf:glass',
    freeBoxSpec: null,
    hitModuleKey: 'corner:1',
    hitSelectorObj: null,
    hitStack: 'top',
    hitY: 1,
    hitLocalX: 0,
    intersects: [],
    setPreview: null,
    hidePreview: null,
    __hideSketchPreviewAndClearHover: () => undefined,
    __wp_isCornerKey: value => typeof value === 'string' && value.startsWith('corner'),
    __wp_isDefaultCornerCellCfgLike: cfg => !cfg || (cfg as any).layout === 'default_root',
    __wp_resolveSketchBoxGeometry: () => ({}) as any,
    __wp_findSketchModuleBoxAtPoint: () => null,
    __wp_readSketchBoxDividers: () => [],
    __wp_resolveSketchBoxSegments: () => [],
    __wp_pickSketchBoxSegment: () => null,
    __wp_findNearestSketchBoxDivider: () => null,
    __wp_resolveSketchBoxDividerPlacement: () => ({}) as any,
    __wp_readSketchBoxDividerXNorm: () => null,
    __wp_writeSketchHover: () => undefined,
  });

  assert.ok(ctx);
  assert.equal(ctx?.cfgRef?.layout, 'custom_root');
  assert.deepEqual(
    ctx?.shelves.map(entry => entry.id),
    ['root-shelf']
  );
  assert.equal(ctx?.variant, 'glass');
});
