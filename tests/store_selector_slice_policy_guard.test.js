import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function normalize(input) {
  return String(input || '').replace(/\s+/g, ' ');
}

function listFiles(dir, suffixes) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, suffixes));
      continue;
    }
    if (suffixes.some(suffix => entry.name.endsWith(suffix))) out.push(full);
  }
  return out;
}

function relPath(abs) {
  return path.relative(repoRoot, abs).replace(/\\/g, '/');
}

test('[store-selector-slices] direct React root selectors declare precise slices or intentional all', () => {
  const hooks = normalize(read('esm/native/ui/react/hooks.tsx'));
  assert.match(
    hooks,
    /function readSelectorSliceOpts\(selectorSlice: SelectorSliceHint\): \{ slice\?: StoreSelectorSliceKey; slices\?: readonly StoreSelectorSliceKey\[]; \}/
  );
  assert.match(
    hooks,
    /export function useStoreSelectorShallow<T extends object \| unknown\[]>\(\s*selector: \(state: RootStateLike\) => T, selectorSlice: SelectorSliceHint = 'all'\s*\): T/
  );

  const sketchTab = normalize(read('esm/native/ui/react/tabs/SketchTab.view.tsx'));
  assert.match(sketchTab, /const SKETCH_NO_MAIN_SELECTOR_SLICES = \['ui', 'config'\] as const;/);
  const noMainSelectorStart = sketchTab.indexOf('const noMainState = useStoreSelectorShallow(');
  const noMainSelectorEnd = sketchTab.indexOf('const sketchCardActive =', noMainSelectorStart);
  const noMainSelectorCall = sketchTab.slice(noMainSelectorStart, noMainSelectorEnd);
  assert.notEqual(noMainSelectorStart, -1, 'Sketch tab must keep the no-main state selector explicit');
  assert.notEqual(
    noMainSelectorEnd,
    -1,
    'Sketch tab no-main selector must remain a standalone selector call'
  );
  assert.match(noMainSelectorCall, /rootState => \{/);
  assert.match(noMainSelectorCall, /SKETCH_NO_MAIN_SELECTOR_SLICES/);

  const structureState = normalize(read('esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts'));
  assert.match(structureState, /reads the optional root build snapshot when present/);
  assert.match(
    structureState,
    /useStoreSelector\(st => readModulesCountFromRootSnapshot\(st, doors\), undefined, 'all'\)/
  );

  const reactFiles = listFiles(path.join(repoRoot, 'esm/native/ui/react'), ['.ts', '.tsx']);
  const directRootSelectorFiles = reactFiles
    .filter(file => relPath(file) !== 'esm/native/ui/react/hooks.tsx')
    .filter(file => /\buseStoreSelector(?:Shallow)?\(/.test(read(relPath(file))))
    .map(relPath)
    .sort();

  assert.deepEqual(directRootSelectorFiles, [
    'esm/native/ui/react/tabs/SketchTab.view.tsx',
    'esm/native/ui/react/tabs/use_structure_tab_view_state_state.ts',
  ]);
});

test('[store-selector-slices] direct service subscribeSelector usage declares slices', () => {
  const cloudShowContents = normalize(read('esm/native/services/cloud_sync_show_contents_ops.ts'));
  assert.match(cloudShowContents, /subscribeSelector\( .* \{ fireImmediately: false, slice: 'ui' \} \)/);

  const sceneView = normalize(read('esm/native/services/scene_view_store_sync_runtime.ts'));
  assert.match(
    sceneView,
    /subscribeSelector\( selectSceneViewModeValue, .* \{ equalityFn: areSceneViewModeValuesEqual, slice: 'runtime' \} \)/
  );
  assert.match(
    sceneView,
    /subscribeSelector\( selectSceneViewLightsValue, .* \{ equalityFn: areSceneViewLightValuesEqual, slices: \['runtime', 'ui'\] \} \)/
  );

  const serviceFiles = listFiles(path.join(repoRoot, 'esm/native/services'), ['.ts', '.tsx']);
  const directSubscribeFiles = serviceFiles
    .filter(file => /\bsubscribeSelector\(/.test(read(relPath(file))))
    .map(relPath)
    .sort();

  assert.deepEqual(directSubscribeFiles, [
    'esm/native/services/cloud_sync_show_contents_ops.ts',
    'esm/native/services/scene_view_store_sync_runtime.ts',
  ]);
});
