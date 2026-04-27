import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const buildReactionsFacade = readSource('../esm/native/services/build_reactions.ts', import.meta.url);
const buildReactionsInstallOwner = readSource(
  '../esm/native/services/build_reactions_install.ts',
  import.meta.url
);
const buildReactionsLightsOwner = readSource(
  '../esm/native/services/build_reactions_lights.ts',
  import.meta.url
);
const buildReactionsCameraOwner = readSource(
  '../esm/native/services/build_reactions_camera.ts',
  import.meta.url
);
const buildReactionsSharedOwner = readSource(
  '../esm/native/services/build_reactions_shared.ts',
  import.meta.url
);

test('[build-reactions] facade stays thin while install, lights, camera, and shared readers live in dedicated owners', () => {
  assertMatchesAll(
    assert,
    buildReactionsFacade,
    [/export \{ installBuildReactionsService \} from '\.\/build_reactions_install\.js';/],
    'buildReactionsFacade'
  );
  assertLacksAll(
    assert,
    buildReactionsFacade,
    [
      /function updateLightsAfterBuild\(/,
      /function updateCameraAfterBuild\(/,
      /function getCameraKey\(/,
      /function getUiSnapshot\(/,
      /const buildReactionsInstallContexts = new WeakMap/,
    ],
    'buildReactionsFacade'
  );
});

test('[build-reactions] dedicated owners hold the canonical install, lighting, camera, and shared UI-key logic', () => {
  assertMatchesAll(
    assert,
    buildReactionsInstallOwner,
    [
      /export function installBuildReactionsService\(/,
      /createCanonicalAfterBuild\(/,
      /updateLightsAfterBuild/,
      /updateCameraAfterBuild/,
      /installStableSurfaceMethod/,
    ],
    'buildReactionsInstallOwner'
  );
  assertMatchesAll(
    assert,
    buildReactionsLightsOwner,
    [
      /export function updateLightsAfterBuild\(/,
      /syncSceneRuntimeFromStore\(/,
      /refreshSceneRuntimeLights\(/,
    ],
    'buildReactionsLightsOwner'
  );
  assertMatchesAll(
    assert,
    buildReactionsCameraOwner,
    [
      /export function updateCameraAfterBuild\(/,
      /adjustCameraForChest\(/,
      /adjustCameraForCorner\(/,
      /resetCameraPreset\(/,
    ],
    'buildReactionsCameraOwner'
  );
  assertMatchesAll(
    assert,
    buildReactionsSharedOwner,
    [
      /export function getBuildReactionsUiSnapshot\(/,
      /export function getBuildReactionsCornerKey\(/,
      /export function getBuildReactionsCameraKey\(/,
      /export function reportBuildReactionsSoftError\(/,
    ],
    'buildReactionsSharedOwner'
  );
});
