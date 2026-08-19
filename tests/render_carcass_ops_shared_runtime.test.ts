import test from 'node:test';
import assert from 'node:assert/strict';

import { createRoomArchitecturePlanFromApp } from '../esm/native/builder/room_architecture_plan_adapter.ts';

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

test('room column trims only the colliding rear span of wave side cornice', async () => {
  const { resolveCorniceSegmentsAgainstRoomColumnCut } =
    await import('../esm/native/builder/render_carcass_ops_cornice_apply.ts');
  const state = {
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 200, heightCm: 300, wardrobeOffsetLeftCm: 0 },
        leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
        rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
        column: {
          enabled: true,
          offsetLeftCm: 0,
          widthCm: 10,
          depthCm: 20,
          heightCm: 300,
          bottomOffsetCm: 0,
        },
        wallColor: '#f2efe6',
        surfacesHidden: false,
      },
    },
    ui: {},
    runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
    mode: {},
    meta: {},
  };
  const App = { store: { getState: () => state, patch() {} } } as any;
  const leftSide = {
    kind: 'cornice_wave_side',
    partId: 'cornice_wave_side_left',
    width: 0.04,
    height: 0.1,
    depth: 0.6,
    x: -0.5,
    y: 2.45,
    z: 0,
  } as const;
  const rightSide = { ...leftSide, partId: 'cornice_wave_side_right', x: 0.5 } as const;

  const leftAdjusted = resolveCorniceSegmentsAgainstRoomColumnCut(leftSide, {
    roomArchitecturePlan: createRoomArchitecturePlanFromApp(App),
  });
  const rightAdjusted = resolveCorniceSegmentsAgainstRoomColumnCut(rightSide, {
    roomArchitecturePlan: createRoomArchitecturePlanFromApp(App),
  });

  assert.equal(leftAdjusted.length, 1);
  assert.equal(leftAdjusted[0]?.kind, 'cornice_wave_side');
  if (leftAdjusted[0]?.kind === 'cornice_wave_side') {
    assert.ok(leftAdjusted[0].depth < leftSide.depth);
    assert.ok(leftAdjusted[0].z > leftSide.z);
    assert.ok(leftAdjusted[0].z - leftAdjusted[0].depth / 2 > -0.11);
  }
  assert.deepEqual(rightAdjusted, [rightSide]);
});

test('room column trims profile side cornice without cutting the front fascia', async () => {
  const { resolveCorniceSegmentsAgainstRoomColumnCut } =
    await import('../esm/native/builder/render_carcass_ops_cornice_apply.ts');
  const state = {
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 200, heightCm: 300, wardrobeOffsetLeftCm: 0 },
        leftWall: { enabled: false, depthCm: 300, heightCm: 280 },
        rightWall: { enabled: false, depthCm: 300, heightCm: 280 },
        column: {
          enabled: true,
          offsetLeftCm: 0,
          widthCm: 10,
          depthCm: 20,
          heightCm: 300,
          bottomOffsetCm: 0,
        },
        wallColor: '#f2efe6',
        surfacesHidden: false,
      },
    },
    ui: {},
    runtime: { wardrobeWidthM: 1, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
    mode: {},
    meta: {},
  };
  const App = { store: { getState: () => state, patch() {} } } as any;
  const profileSide = {
    kind: 'cornice_profile_seg',
    partId: 'cornice_color',
    length: 0.6,
    profile: [
      { x: -0.015, y: 0 },
      { x: 0.06, y: 0.1 },
    ],
    rotationY: 0,
    flipX: true,
    miterEndTrim: 0.02,
    x: -0.5,
    y: 2.4006,
    z: 0,
  } as const;
  const front = {
    ...profileSide,
    length: 1,
    rotationY: -Math.PI / 2,
    flipX: false,
    x: 0,
    z: 0.3,
  } as const;

  const adjustedSide = resolveCorniceSegmentsAgainstRoomColumnCut(profileSide, {
    roomArchitecturePlan: createRoomArchitecturePlanFromApp(App),
  });
  const adjustedFront = resolveCorniceSegmentsAgainstRoomColumnCut(front, {
    roomArchitecturePlan: createRoomArchitecturePlanFromApp(App),
  });

  assert.equal(adjustedSide.length, 1);
  assert.equal(adjustedSide[0]?.kind, 'cornice_profile_seg');
  if (adjustedSide[0]?.kind === 'cornice_profile_seg') {
    assert.ok(adjustedSide[0].length < profileSide.length);
    assert.ok(adjustedSide[0].z > profileSide.z);
    assert.equal(adjustedSide[0].miterEndTrim, profileSide.miterEndTrim);
  }
  assert.deepEqual(adjustedFront, [front]);
});
