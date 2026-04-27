import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';

const coreApi = readFirstExisting(['../esm/native/core/api.ts'], import.meta.url);
const coreInstall = readFirstExisting(['../esm/native/core/install.ts'], import.meta.url);
const engineApi = readFirstExisting(['../esm/native/engine/api.ts'], import.meta.url);
const engineInstall = readFirstExisting(['../esm/native/engine/install.ts'], import.meta.url);

test('core and engine entrypoints expose the merged layer surfaces', () => {
  assert.match(coreApi, /resetAllEditModes/);
  assert.match(coreApi, /readRootStateFromStore/);
  assert.doesNotMatch(coreApi, /createViewportSurface/);

  assert.match(coreInstall, /installAppStartService/);
  assert.match(coreInstall, /installHistoryService/);
  assert.match(coreInstall, /installCoreLayerSurface/);

  assert.match(engineApi, /createViewportSurface/);
  assert.match(engineApi, /getRenderContext/);
  assert.match(engineApi, /getViewportRoomGroup/);
  assert.match(engineApi, /handleCanvasClickNDC/);
  assert.doesNotMatch(engineApi, /readRootStateFromStore/);

  assert.match(engineInstall, /installSceneViewService/);
  assert.match(engineInstall, /installCanvasPickingService/);
  assert.match(engineInstall, /installEngineLayerSurface/);
});
