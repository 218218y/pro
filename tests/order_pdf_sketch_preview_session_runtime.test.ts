import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureOrderPdfSketchPreviewSessionSnapshot,
  restoreOrderPdfSketchPreviewSessionSnapshot,
  runOrderPdfSketchPreviewBuildSession,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_session.ts';

type CameraPose = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
};

function makeCameraPose(x: number): CameraPose {
  return {
    position: { x, y: x + 1, z: x + 2 },
    target: { x: x + 3, y: x + 4, z: x + 5 },
  };
}

test('[order-pdf] sketch preview session restores the original sketch mode after success', async () => {
  let sketchMode = false;

  const result = await runOrderPdfSketchPreviewBuildSession({
    readSketchMode: () => sketchMode,
    restoreSketchMode: next => {
      sketchMode = next;
    },
    build: async () => {
      sketchMode = true;
      return 'ok';
    },
  });

  assert.equal(result, 'ok');
  assert.equal(sketchMode, false);
});

test('[order-pdf] sketch preview session restores the original sketch mode after failure', async () => {
  let sketchMode = false;
  const failure = new Error('boom');

  await assert.rejects(
    () =>
      runOrderPdfSketchPreviewBuildSession({
        readSketchMode: () => sketchMode,
        restoreSketchMode: next => {
          sketchMode = next;
        },
        build: async () => {
          sketchMode = true;
          throw failure;
        },
      }),
    failure
  );

  assert.equal(sketchMode, false);
});

test('[order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states', () => {
  let sketchMode = false;
  let doorsOpen = false;

  const snapshot = captureOrderPdfSketchPreviewSessionSnapshot({
    readSketchMode: () => sketchMode,
    readDoorsOpen: () => doorsOpen,
  });

  sketchMode = true;
  doorsOpen = true;

  restoreOrderPdfSketchPreviewSessionSnapshot({
    snapshot,
    readSketchMode: () => sketchMode,
    restoreSketchMode: next => {
      sketchMode = next;
    },
    readDoorsOpen: () => doorsOpen,
    restoreDoorsOpen: next => {
      doorsOpen = next;
    },
  });

  assert.equal(sketchMode, false);
  assert.equal(doorsOpen, false);
});

test('[order-pdf] sketch preview session restores the original doors-open state after success', async () => {
  let sketchMode = false;
  let doorsOpen = false;

  const result = await runOrderPdfSketchPreviewBuildSession({
    readSketchMode: () => sketchMode,
    restoreSketchMode: next => {
      sketchMode = next;
    },
    readDoorsOpen: () => doorsOpen,
    restoreDoorsOpen: next => {
      doorsOpen = next;
    },
    build: async () => {
      sketchMode = true;
      doorsOpen = true;
      return 'ok';
    },
  });

  assert.equal(result, 'ok');
  assert.equal(sketchMode, false);
  assert.equal(doorsOpen, false);
});

test('[order-pdf] sketch preview session snapshot captures and restores the original camera pose', () => {
  let sketchMode = false;
  let cameraPose: CameraPose | null = makeCameraPose(1);

  const snapshot = captureOrderPdfSketchPreviewSessionSnapshot<CameraPose>({
    readSketchMode: () => sketchMode,
    readCameraPose: () => cameraPose,
  });

  cameraPose = makeCameraPose(10);

  restoreOrderPdfSketchPreviewSessionSnapshot<CameraPose>({
    snapshot,
    readSketchMode: () => sketchMode,
    restoreSketchMode: next => {
      sketchMode = next;
    },
    restoreCameraPose: pose => {
      cameraPose = pose;
    },
  });

  assert.deepEqual(cameraPose, makeCameraPose(1));
});

test('[order-pdf] sketch preview session restores the original camera pose after success', async () => {
  let sketchMode = false;
  let cameraPose: CameraPose | null = makeCameraPose(2);

  const result = await runOrderPdfSketchPreviewBuildSession<string, CameraPose>({
    readSketchMode: () => sketchMode,
    restoreSketchMode: next => {
      sketchMode = next;
    },
    readCameraPose: () => cameraPose,
    restoreCameraPose: pose => {
      cameraPose = pose;
    },
    build: async () => {
      cameraPose = makeCameraPose(20);
      return 'ok';
    },
  });

  assert.equal(result, 'ok');
  assert.deepEqual(cameraPose, makeCameraPose(2));
});
