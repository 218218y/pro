import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFirstExisting } from './_read_src.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function assertIncludesInOrder(src, parts) {
  let cursor = 0;
  for (const part of parts) {
    const idx = src.indexOf(part, cursor);
    assert.ok(idx >= 0, `expected to find ${part}`);
    cursor = idx + part.length;
  }
}

const renderLoop = read('esm/native/platform/render_loop_impl.ts');
const renderLoopRuntime = read('esm/native/platform/render_loop_impl_runtime.ts');
const renderLoopMirror = read('esm/native/platform/render_loop_mirror_driver.ts');
const renderLoopFrontOverlay = read('esm/native/platform/render_loop_impl_front_overlay.ts');
const kernel = read('esm/native/kernel/kernel.ts');
const kernelSnapshotStore = [
  read('esm/native/kernel/kernel_snapshot_store_system.ts'),
  read('esm/native/kernel/kernel_snapshot_store_contracts.ts'),
  read('esm/native/kernel/kernel_snapshot_store_shared.ts'),
  read('esm/native/kernel/kernel_snapshot_store_build_state.ts'),
  read('esm/native/kernel/kernel_snapshot_store_commits.ts'),
  read('esm/native/kernel/kernel_snapshot_store_commits_shared.ts'),
  read('esm/native/kernel/kernel_snapshot_store_commits_ops.ts'),
].join('\n');
const kernelProjectCapture = [
  read('esm/native/kernel/kernel_project_capture.ts'),
  read('esm/native/kernel/kernel_project_capture_shared.ts'),
  read('esm/native/kernel/kernel_project_capture_config_lists.ts'),
  read('esm/native/kernel/kernel_project_capture_payload.ts'),
].join('\n');
const kernelConfigOwner = read('esm/native/kernel/kernel_state_kernel_config.ts');
const kernelInstallSupport = read('esm/native/kernel/kernel_install_support.ts');
const kernelConfig = [
  read('esm/native/kernel/kernel_state_kernel_config.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_shared.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_shared.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_capture.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_apply.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_patch.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_patch_shared.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_maps_patch_ops.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_modules_corner.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_modules_corner_ensure.ts'),
  read('esm/native/kernel/kernel_state_kernel_config_modules_corner_patch.ts'),
].join('\n');
const canvasPicking = [
  read('esm/native/services/canvas_picking_core.ts'),
  readFirstExisting(['../esm/native/services/canvas_picking_local_helpers.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_projection_runtime.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_projection_runtime_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_projection_runtime_box.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_projection_runtime_plane.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_click_flow.ts'], import.meta.url),
  readFirstExisting(['../esm/native/services/canvas_picking_hover_flow.ts'], import.meta.url),
].join('\n');
const renderOps = [
  read('esm/native/builder/render_ops.ts'),
  read('esm/native/builder/render_ops_shared.ts'),
  read('esm/native/builder/render_ops_shared_contracts.ts'),
  read('esm/native/builder/render_ops_shared_state.ts'),
].join('\n');

test('[wave4] render loop consolidates front-overlay and mirror hot-path state through typed helpers', () => {
  assert.match(renderLoop, /createInstalledRenderAnimate/);
  assert.match(renderLoopRuntime, /createRenderLoopFrontOverlayHelpers/);
  assert.match(renderLoopRuntime, /createRenderLoopMirrorDriver/);
  assert.match(renderLoopFrontOverlay, /export function createRenderLoopFrontOverlayHelpers\(/);
  assert.match(renderLoopFrontOverlay, /function frontOverlayState\(/);
  assert.match(renderLoopFrontOverlay, /function collectFrontOverlayNodes\(/);
  assert.match(renderLoopMirror, /ensureRenderMetaArray<(Any|Unknown)Record>\(A, 'mirrors'\)/);
  assert.match(renderLoopMirror, /getMirrorHideScratch\(A\)/);
  assert.match(renderLoopMirror, /getShadowMap\(A\)/);
  assert.doesNotMatch(renderLoop, /renderBag\.meta/);
  assert.doesNotMatch(renderLoop, /renderBag\['__mirrorHideScratch'\]/);
});

test('[wave4] kernel centralizes store/stateKernel plumbing behind helper seams', () => {
  assert.match(kernel, /ensureStateKernelService/);
  assert.match(kernel, /function ensureStateKernel\(/);
  assert.match(kernel, /createKernelInstallSupport\(App\)/);
  assert.match(
    kernelInstallSupport,
    /const setStoreConfigPatch = \(patch: ConfigSlicePatch, meta: ActionMetaLike\): boolean =>/
  );
  assert.match(
    kernelInstallSupport,
    /const setStoreUiSnapshot = \([\s\S]*?ui: UnknownRecord,[\s\S]*?meta: ActionMetaLike,[\s\S]*?config\?: UnknownRecord[\s\S]*?\): boolean =>/
  );
  assert.match(kernelInstallSupport, /const touchStore = \(meta: ActionMetaLike\): boolean =>/);
  assert.match(
    kernel,
    /import \{ createKernelSnapshotStoreSystem } from '\.\/kernel_snapshot_store_system\.js';/
  );
  assert.match(kernel, /const snapshotStore = createKernelSnapshotStoreSystem\(\{/);
  assert.match(kernel, /__sk\.getBuildState = snapshotStore\.getBuildState;/);
  assert.match(kernel, /reportKernelError,/);
  assert.match(kernelSnapshotStore, /export function createKernelSnapshotStoreSystem\(/);
  assert.match(kernelSnapshotStore, /readKernelSnapshotBuildState\(/);
  assert.match(kernelSnapshotStore, /createKernelSnapshotStoreCommitOps\(/);
  assert.match(kernelSnapshotStore, /stateKernel: StateKernelLike & UnknownRecord;/);
  assert.match(
    kernel,
    /import \{ installKernelStateKernelConfigSurface \} from '\.\/kernel_state_kernel_config\.js';/
  );
  assert.match(kernel, /installKernelStateKernelConfigSurface\(\{/);
  assert.match(kernel, /createKernelProjectCapture\(\{/);
  assert.match(kernelProjectCapture, /buildKernelProjectCaptureData\(/);
  assert.match(kernelProjectCapture, /buildKernelProjectCaptureCanonicalConfigLists\(/);
  assert.match(kernelConfigOwner, /kernel_state_kernel_config_maps\.js/);
  assert.match(kernelConfigOwner, /kernel_state_kernel_config_modules_corner\.js/);
  assert.match(kernelConfig, /const patchFixed = cfgPatchWithReplaceKeys\(patch, rep\);/);
  assert.match(kernelConfig, /const metaFixed = metaRestore\(App, base, 'kernel\.applyConfig'\);/);
  assert.match(kernelConfig, /setStoreConfigPatch\(App,\s*patchFixed,\s*metaFixed\);/);
  assertIncludesInOrder(kernelConfig, [
    'const patchFixed = cfgPatchWithReplaceKeys(patch, rep);',
    "const metaFixed = metaRestore(App, base, 'kernel.applyConfig');",
    'setStoreConfigPatch(App, patchFixed, metaFixed);',
  ]);
  assert.match(kernel, /setStoreUiSnapshot: \(ui, meta, config\) => setStoreUiSnapshot\(ui, meta, config\)/);
  assert.match(
    kernelSnapshotStore,
    /const nextCfg = cfg && typeof cfg === 'object' \? args\.asRecord\(cfg, \{\}\) : undefined;/
  );
  assert.match(
    kernelSnapshotStore,
    /args\.setStoreUiSnapshot\([\s\S]*?buildStoreMeta\(source, o\),[\s\S]*?nextCfg[\s\S]*?\);/
  );
});

test('[wave4] canvas picking reads viewport roots from the canonical viewport surface', () => {
  assert.match(canvasPicking, /getViewportSurface\(App\)/);
  assert.match(canvasPicking, /type ViewportRoots =/);
});

test('[wave4] render ops centralizes material cache ownership', () => {
  assert.match(renderOps, /type RenderOpsBag =/);
  assert.match(renderOps, /function __matCache\(App: AppContainer\): CommonMatsCache/);
  assert.doesNotMatch(renderOps, /ro\.__matCache = ro\.__matCache \|\| \{\}/);
});
