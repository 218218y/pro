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
    cornice: { kind: 'cornice', segments: [] },
  });
  assert.equal(ops?.base?.kind, 'plinth');
  assert.equal(ops?.backPanel?.kind, 'back_panel');
  assert.equal(ops?.cornice?.kind, 'cornice');
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
