import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __asContext,
  __asOps,
  __backPanelMaterial,
  __stripMiterCaps,
} from '../esm/native/builder/render_carcass_ops_shared.js';

class MeshBasicMaterial {
  opts: Record<string, unknown>;
  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

test('render_carcass shared normalizes context and ops through focused readers', () => {
  const outlined: unknown[] = [];
  const ctx = __asContext({
    App: { ok: true },
    THREE: { any: true },
    addOutlines: (obj: unknown) => outlined.push(obj),
    getPartMaterial: (partId: string) => `mat:${partId}`,
    __sketchMode: true,
    bodyMat: 'body',
  });
  assert.equal(ctx.__sketchMode, true);
  assert.equal(typeof ctx.addOutlines, 'function');
  assert.equal(ctx.getPartMaterial?.('door'), 'mat:door');
  ctx.addOutlines?.('mesh');
  assert.deepEqual(outlined, ['mesh']);

  const ops = __asOps({
    base: { kind: 'plinth', width: 1 },
    boards: [{ kind: 'board', width: 1, height: 2, depth: 3, x: 0, y: 0, z: 0 }],
    backPanels: [{ kind: 'back_panel', width: 1, height: 2, depth: 0.1, x: 0, y: 0, z: 0 }],
    backPanel: { kind: 'back_panel', width: 1, height: 2, depth: 0.1, x: 0, y: 0, z: 0 },
    cornice: { kind: 'cornice', mode: 'wave_frame', partId: 'cornice_color', segments: [] },
  });
  assert.equal(ops?.base?.kind, 'plinth');
  assert.equal(ops?.backPanel?.kind, 'back_panel');
  assert.equal(ops?.cornice?.kind, 'cornice');

  const malformedCornice = __asOps({
    cornice: {
      kind: 'cornice',
      mode: 'wave_frame',
      partId: 'cornice_color',
      segments: [
        { kind: 'cornice_profile_seg', x: 0, y: 0, z: 0, length: 1, profile: [], rotationY: 0, flipX: false },
      ],
    },
  });
  assert.equal(malformedCornice?.cornice, null, 'renderer boundary should reject invalid typed cornice IR');

  const topOnlyPlatformOps = __asOps({
    base: {
      kind: 'leg_platforms',
      platforms: [{ partId: 'base_leg_platform_top', width: 1, height: 0.04, depth: 0.6 }],
    },
    boards: [],
    backPanel: { kind: 'back_panel', width: 1, height: 2, depth: 0.1, x: 0, y: 0, z: 0 },
  });
  assert.equal(topOnlyPlatformOps?.base?.kind, 'leg_platforms');
});

test('render_carcass shared keeps sketch back-panel material and strips selected miter caps', () => {
  const sketchMaterial = __backPanelMaterial(
    { masoniteMat: 'm', whiteMat: 'w' },
    { MeshBasicMaterial } as never,
    true
  ) as MeshBasicMaterial;
  assert.deepEqual(sketchMaterial.opts, { color: 0xffffff });

  const normalsCalls: string[] = [];
  const state = {
    indices: [0, 1, 0, 2, 3, 2],
    attr: {
      count: 4,
      needsUpdate: false,
      getX(index: number) {
        return index;
      },
      getZ(index: number) {
        return index < 2 ? -1 : 1;
      },
      setZ(_index: number, _value: number) {},
    },
  };
  __stripMiterCaps(
    {
      translate() {},
      getIndex: () => ({ array: state.indices }),
      getAttribute: () => state.attr,
      setIndex: (indices: number[]) => {
        state.indices = indices;
      },
      computeVertexNormals() {
        normalsCalls.push('called');
      },
    },
    true,
    false,
    err => {
      throw err;
    }
  );
  assert.deepEqual(state.indices, [2, 3, 2]);
  assert.deepEqual(normalsCalls, []);
});

test('render_carcass miter cap stripping ignores string-encoded geometry index data', () => {
  const state = {
    indices: ['0', '1', '0', '2', '3', '2'] as unknown[],
    attr: { count: 4 },
  };
  let setIndexCalled = false;

  __stripMiterCaps(
    {
      getIndex: () => ({ array: state.indices }),
      getAttribute: () => state.attr,
      setIndex: () => {
        setIndexCalled = true;
      },
    },
    true,
    false,
    err => {
      throw err;
    }
  );

  assert.equal(setIndexCalled, false);
  assert.deepEqual(state.indices, ['0', '1', '0', '2', '3', '2']);
});

test('typed cornice segment renderers preserve per-segment paint material overrides', async () => {
  const { createFakeThreeRuntime } = await import('./_fake_three_runtime.ts');
  const { createWaveFrontSegment, createWaveSideSegment, createProfileSegment } =
    await import('../esm/native/builder/render_carcass_ops_cornice_segments.ts');

  const THREE = createFakeThreeRuntime();
  const getPartMaterial = (partId: string) => `paint:${partId}`;
  const baseArgs = {
    THREE: THREE as never,
    segMat: 'cornice-base',
    getPartMaterial,
  };

  const waveFront = createWaveFrontSegment({
    ...baseArgs,
    segPid: 'cornice_wave_front',
    seg: {
      kind: 'cornice_wave_front',
      partId: 'cornice_wave_front',
      width: 1,
      depth: 0.02,
      heightMax: 0.1,
      waveAmp: 0.02,
      waveCycles: 2,
      x: 0,
      y: 0,
      z: 0,
    },
  });
  const waveSide = createWaveSideSegment({
    ...baseArgs,
    segPid: 'cornice_wave_side_left',
    seg: {
      kind: 'cornice_wave_side',
      partId: 'cornice_wave_side_left',
      width: 0.02,
      height: 0.1,
      depth: 0.5,
      x: 0,
      y: 0,
      z: 0,
    },
  });
  const profile = createProfileSegment(
    {
      ...baseArgs,
      segPid: 'cornice_color',
      seg: {
        kind: 'cornice_profile_seg',
        partId: 'cornice_color',
        length: 1,
        profile: [
          { x: 0, y: 0 },
          { x: 0.02, y: 0.08 },
        ],
        rotationY: 0,
        flipX: false,
        x: 0,
        y: 0,
        z: 0,
      },
      profile: [
        { x: 0, y: 0 },
        { x: 0.02, y: 0.08 },
      ],
      segLen: 1,
    },
    {
      THREE: THREE as never,
      renderOpsHandleCatch: () => undefined,
    } as never
  );

  assert.equal((waveFront as { material?: unknown } | null)?.material, 'paint:cornice_wave_front');
  assert.equal((waveSide as { material?: unknown } | null)?.material, 'paint:cornice_wave_side_left');
  assert.equal((profile as { material?: unknown } | null)?.material, 'paint:cornice_color');
});
