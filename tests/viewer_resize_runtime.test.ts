import test from 'node:test';
import assert from 'node:assert/strict';

import { installViewerResize } from '../esm/native/ui/interactions/viewer_resize.ts';

type AnyRecord = Record<string, any>;

test('viewer resize retries the same size after a failed apply instead of pinning a false-success size', () => {
  const reports: Array<{ error: unknown; context: AnyRecord }> = [];
  let resizeListener: (() => void) | null = null;
  let setSizeAttempts = 0;
  let renderCalls = 0;

  const app: AnyRecord = {
    deps: {
      browser: {
        requestAnimationFrame: (cb: FrameRequestCallback) => {
          cb(1);
          return 1;
        },
        cancelAnimationFrame: () => undefined,
      },
    },
    services: {
      platform: {
        reportError: (error: unknown, context: AnyRecord) => reports.push({ error, context }),
      },
    },
    render: {
      camera: {
        aspect: 0,
        updateProjectionMatrix: () => undefined,
      },
      renderer: {
        setSize: () => {
          setSizeAttempts += 1;
          if (setSizeAttempts === 1) throw new Error('resize rejected');
        },
      },
      controls: null,
      cornerControls: null,
    },
  };

  const container = { clientWidth: 800, clientHeight: 600 } as unknown as HTMLElement;
  const win = {
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'resize') resizeListener = listener;
    },
    removeEventListener: () => undefined,
  } as unknown as Window;

  const dispose = installViewerResize(app, {
    container,
    win,
    triggerRender: () => {
      renderCalls += 1;
    },
  });

  assert.equal(setSizeAttempts, 1);
  assert.equal(renderCalls, 0);
  assert.equal(
    reports.some(entry => entry.context?.op === 'apply'),
    true
  );
  assert.equal(typeof resizeListener, 'function');

  resizeListener?.();

  assert.equal(setSizeAttempts, 2);
  assert.equal(renderCalls, 1);
  assert.equal(app.render.camera.aspect, 800 / 600);

  dispose();
});
