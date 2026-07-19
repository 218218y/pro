import test from 'node:test';
import assert from 'node:assert/strict';

import { createFrontRevealCleanupRuntime } from '../esm/native/builder/post_build_front_reveal_frames_cleanup.ts';

test('front reveal cleanup removes stale local frames and disposes their geometry trees', () => {
  const disposed: string[] = [];
  const removed: string[] = [];
  const frame = {
    name: 'front-reveal-local',
    parent: {
      remove() {
        removed.push('front-reveal-local');
      },
    },
    traverse(visit: (value: unknown) => void) {
      visit({ geometry: { dispose: () => disposed.push('geometry') } });
    },
  };
  const runtime = createFrontRevealCleanupRuntime({
    wardrobeGroup: {
      traverse(visit: (value: unknown) => void) {
        visit(frame);
        visit({ name: 'unrelated' });
      },
    } as any,
    localName: 'front-reveal-local',
    reportSoft() {},
  });

  runtime.cleanupStaleLocalFrames();

  assert.deepEqual(removed, ['front-reveal-local']);
  assert.deepEqual(disposed, ['geometry']);
});

test('front reveal local cleanup drains every matching child', () => {
  const removed: number[] = [];
  const disposed: number[] = [];
  const frames = [1, 2].map(id => ({
    parent: {
      remove() {
        removed.push(id);
        frames.shift();
      },
    },
    traverse(visit: (value: unknown) => void) {
      visit({ geometry: { dispose: () => disposed.push(id) } });
    },
  }));
  const runtime = createFrontRevealCleanupRuntime({
    wardrobeGroup: { traverse() {} } as any,
    localName: 'front-reveal-local',
    reportSoft() {},
  });

  runtime.removeLocalFrames({
    getObjectByName() {
      return frames[0] ?? null;
    },
  } as any);

  assert.deepEqual(removed, [1, 2]);
  assert.deepEqual(disposed, [1, 2]);
});
