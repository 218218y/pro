import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = rel => readFileSync(resolve(here, '..', rel), 'utf8');

test('residual root-surface hotspots route through canonical access helpers', () => {
  const storeBoot = read('esm/native/runtime/store_boot_access.ts');
  assert.match(storeBoot, /from '\.\/actions_access_core\.js';/);
  assert.match(storeBoot, /getActions\((?:a|app|App)\)/);
  assert.doesNotMatch(storeBoot, /readActionsNamespace\(a\.actions\)/);

  const debugConsole = read('esm/native/runtime/debug_console_surface.ts');
  assert.match(debugConsole, /from '\.\/store_surface_access\.js';/);
  assert.match(debugConsole, /getStoreSurfaceMaybe\(App\)/);
  assert.doesNotMatch(debugConsole, /App \? App\.store : null/);

  const snapshotStore = [
    read('esm/native/kernel/kernel_snapshot_store_system.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits_shared.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits_ops.ts'),
  ].join('\n');
  assert.match(snapshotStore, /from '\.\.\/runtime\/store_surface_access\.js';/);
  assert.match(snapshotStore, /const store = getStoreSurfaceMaybe\(args\.App\);/);
  assert.doesNotMatch(snapshotStore, /args\.App\.store/);

  const domainApi = read('esm/native/kernel/domain_api.ts');
  assert.match(domainApi, /from '\.\.\/runtime\/actions_access_core\.js';/);
  assert.match(domainApi, /asDomainObject\(getActionsRoot\(App\)\)/);

  const notesService = [
    read('esm/native/ui/notes_service.ts'),
    read('esm/native/ui/notes_service_shared.ts'),
    read('esm/native/ui/notes_service_runtime.ts'),
  ].join('\n');
  assert.match(notesService, /getMetaActions as getMetaActionsDomain|getMetaActionsDomain\(App\)/);
  assert.match(notesService, /getMetaActionsDomain\(App\)/);
  assert.doesNotMatch(notesService, /App\.actions/);

  const browserDom = read('esm/native/adapters/browser/dom.ts');
  assert.match(browserDom, /from '\.\.\/\.\.\/runtime\/app_roots_access\.js';/);
  assert.match(
    browserDom,
    /(?:return ensurePlatformRoot\(App\);|return ensurePlatformRoot\(App\) as BrowserPlatformSurface;)/
  );
  assert.doesNotMatch(browserDom, /App\.platform = next/);

  const browserEnv = read('esm/native/adapters/browser/env.ts');
  const browserEnvShared = read('esm/native/adapters/browser/env_shared.ts');
  assert.match(browserEnv, /from '\.\/env_shared\.js';/);
  assert.match(browserEnv, /from '\.\/env_surface\.js';/);
  assert.match(browserEnv, /from '\.\/env_clipboard\.js';/);
  assert.doesNotMatch(browserEnv, /App\.deps/);
  assert.match(browserEnvShared, /from '\.\.\/\.\.\/runtime\/deps_access\.js';/);
  assert.match(browserEnvShared, /getDepsNamespaceMaybe<Partial<BrowserDeps>>\(App, 'browser'\)/);
  assert.doesNotMatch(browserEnvShared, /App\.deps/);
  const depsAccess = read('esm/native/runtime/deps_access.ts');
  assert.match(depsAccess, /from '\.\/app_roots_access\.js';/);
  assert.match(depsAccess, /getDepsRootSlotMaybe\(App\)/);
  assert.match(depsAccess, /ensureDepsRootSlot\(App\)/);
  assert.doesNotMatch(depsAccess, /app\.deps\s*=|app\.deps\)/);

  const browserSurface = read('esm/native/runtime/browser_surface_access.ts');
  assert.match(browserSurface, /from '\.\/app_roots_access\.js';/);
  assert.match(browserSurface, /getBrowserRootMaybe\(App\)/);
  assert.match(browserSurface, /ensureBrowserRoot\(App\)/);
  assert.doesNotMatch(browserSurface, /App\.browser\s*=|Reflect\.get\(App as object, 'browser'\)/);

  const actionsRoot = read('esm/native/kernel/actions_root.ts');
  assert.match(actionsRoot, /from '\.\.\/runtime\/app_roots_access\.js';/);
  assert.match(actionsRoot, /ensureActionsRootSlot\(app\)/);
  assert.doesNotMatch(actionsRoot, /app\.actions\s*=/);

  const splitDoors = read('esm/native/kernel/splitdoors_normalizer.ts');
  assert.match(splitDoors, /from '\.\.\/runtime\/platform_access\.js';/);
  assert.match(splitDoors, /const util = ensurePlatformUtil\(App\);/);
  assert.doesNotMatch(splitDoors, /app\.platform/);

  const cachePruning = [
    read('esm/native/platform/cache_pruning.ts'),
    read('esm/native/platform/cache_pruning_shared.ts'),
    read('esm/native/platform/cache_pruning_runtime.ts'),
  ].join('\n');
  assert.match(cachePruning, /ensureCachePruningSlots\(root\)/);
  assert.match(cachePruning, /applyCacheLimitsFromApp\(merged, root\)/);
  assert.doesNotMatch(cachePruning, /app\.render =/);

  const renderOpsExtras = [
    read('esm/native/builder/render_ops_extras.ts'),
    read('esm/native/builder/render_ops_extras_shared.ts'),
  ].join('\n');
  assert.match(renderOpsExtras, /ensurePlatformRootSurface,?/);
  assert.match(
    renderOpsExtras,
    /const platform = ensurePlatformRootSurface\(App\)|const ensuredPlatform = __ensurePlatformSurface\(App/
  );
  assert.doesNotMatch(renderOpsExtras, /App\.platform =/);
});
