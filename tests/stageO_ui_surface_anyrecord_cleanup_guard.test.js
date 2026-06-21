import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

const bundle = [
  'esm/native/adapters/browser/dialogs.ts',
  'esm/native/adapters/browser/door_status_css.ts',
  'esm/native/ui/react/export_actions.ts',
  'esm/native/ui/react/panels/CloudSyncPanel.tsx',
  'esm/native/ui/react/panels/cloud_sync_panel_actions.ts',
  'esm/native/ui/react/panels/ProjectPanel.tsx',
  'esm/native/ui/react/actions/builder_actions.ts',
]
  .map(read)
  .join('\n');

test('[stageO] react/browser seams use explicit surfaces instead of AnyRecord bags', () => {
  assert.match(bundle, /type BrowserDialogsSurface = BrowserNamespaceLike &/);
  assert.match(bundle, /type DoorStatusCssSurface = BrowserNamespaceLike &/);
  assert.match(
    bundle,
    /const api: CloudSyncServiceLike \| undefined = getCloudSyncServiceMaybe\(app\) \|\| undefined;/
  );
  assert.match(bundle, /const meta: MetaActionsNamespaceLike = useMeta\(\);/);
  assert.match(
    bundle,
    /import \{[\s\S]*?captureBuilderOutlineBinding,[\s\S]*?readConfigStateFromApp,[\s\S]*?readModeStateFromApp,[\s\S]*?readUiStateFromApp,[\s\S]*?refreshBuilderHandles,[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/services\/api\.js';/
  );
  assert.match(
    bundle,
    /refreshBuilderHandles\(app, \{[\s\S]*cfgSnapshot: readConfigStateFromApp\(app\),[\s\S]*addOutlines: captureBuilderOutlineBinding\(app\),[\s\S]*removeDoorsEnabled: resolveRemoveDoorsEnabledFromSnapshots\([\s\S]*readUiStateFromApp\(app\),[\s\S]*readModeStateFromApp\(app\)[\s\S]*\),[\s\S]*purgeRemovedDoors: true,[\s\S]*\}\);/
  );
  assert.match(bundle, /function readExportAction<K extends keyof ExportCanvasModuleLike>\(/);
  assert.doesNotMatch(bundle, /\bAnyRecord\b/);
});
