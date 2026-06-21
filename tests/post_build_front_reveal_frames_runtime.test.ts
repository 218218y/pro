import test from 'node:test';
import assert from 'node:assert/strict';

import { createFrontRevealFramesRuntime } from '../esm/native/builder/post_build_front_reveal_frames_runtime.ts';

class LineBasicMaterial {
  transparent = false;
  opacity = 0;
  depthWrite = true;
  depthTest = false;

  constructor(options: Record<string, unknown>) {
    this.transparent = options.transparent === true;
    this.opacity = Number(options.opacity);
  }
}

function createContext(sketchMode: boolean, staleRuntimeSketchMode: boolean) {
  const wardrobeGroup = {
    children: [],
    position: {},
    rotation: {},
    add() {},
    remove() {},
    traverse() {},
  };
  return {
    App: {
      render: { wardrobeGroup, materials: {} },
      store: {
        getState: () => ({ runtime: { sketchMode: staleRuntimeSketchMode } }),
      },
    },
    THREE: { LineBasicMaterial },
    flags: { sketchMode },
  } as any;
}

test('front reveal runtime takes sketch mode from the build context, not live App runtime', () => {
  const sketchRuntime = createFrontRevealFramesRuntime(createContext(true, false));
  const normalRuntime = createFrontRevealFramesRuntime(createContext(false, true));

  assert.ok(sketchRuntime);
  assert.ok(normalRuntime);
  assert.equal((sketchRuntime.pickRevealLineMaterial(null) as any).opacity, 0.5625);
  assert.equal((normalRuntime.pickRevealLineMaterial(null) as any).opacity, 0.75);
});
