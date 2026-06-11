import test from 'node:test';
import assert from 'node:assert/strict';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';
import { bundleServicesApiPublicSources, readServicesApiEntrypoint } from './_services_api_bundle.js';

const platformOwner = readSource('../esm/native/platform/platform.ts', import.meta.url);
const platformBundle = bundleSources(
  [
    '../esm/native/platform/platform.ts',
    '../esm/native/platform/platform_shared.ts',
    '../esm/native/platform/platform_util.ts',
    '../esm/native/platform/platform_services.ts',
    '../esm/native/platform/platform_boot.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const kernelOwner = readSource('../esm/native/kernel/kernel.ts', import.meta.url);
const kernelInstallSupport = readSource('../esm/native/kernel/kernel_install_support.ts', import.meta.url);
const kernelConfigMapsOwner = readSource(
  '../esm/native/kernel/kernel_state_kernel_config_maps.ts',
  import.meta.url
);
const kernelConfigMapsBundle = bundleSources(
  [
    '../esm/native/kernel/kernel_state_kernel_config_maps.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_shared.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_capture.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_apply.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch_shared.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch_ops.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const servicesApi = readServicesApiEntrypoint(import.meta.url);
const servicesApiBundle = bundleServicesApiPublicSources(import.meta.url);

const runtimeApi = readSource('../esm/native/runtime/api.ts', import.meta.url);
const runtimeApiBundle = bundleSources(
  [
    '../esm/native/runtime/api_assert_surface.ts',
    '../esm/native/runtime/api_browser_surface.ts',
    '../esm/native/runtime/api_dom_surface.ts',
    '../esm/native/runtime/api_boot_render_surface.ts',
    '../esm/native/runtime/api_services_state_surface.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const mapsOwner = readSource('../esm/native/runtime/maps_access.ts', import.meta.url);
const mapsBundle = bundleSources(
  [
    '../esm/native/runtime/maps_access.ts',
    '../esm/native/runtime/maps_access_readers.ts',
    '../esm/native/runtime/maps_access_writers.ts',
    '../esm/native/runtime/maps_access_saved_collections.ts',
    '../esm/native/runtime/maps_access_runtime.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const doorsOwner = readSource('../esm/native/runtime/doors_access.ts', import.meta.url);
const doorsBundle = bundleSources(
  [
    '../esm/native/runtime/doors_access.ts',
    '../esm/native/runtime/doors_access_services.ts',
    '../esm/native/runtime/doors_access_drawers.ts',
    '../esm/native/runtime/doors_access_doors.ts',
    '../esm/native/runtime/doors_access_shared.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('[runtime-platform-core-family] platform/kernel owners stay thin while install policy lives on focused seams', () => {
  assertMatchesAll(
    assert,
    platformOwner,
    [
      /platform_shared\.js/,
      /platform_util\.js/,
      /platform_services\.js/,
      /platform_boot\.js/,
      /installPlatformUtilSurface\(/,
      /installPlatformServiceSurface\(/,
      /applyPlatformBootFlagsToRuntime\(/,
      /readBootFailFastFlag\(/,
    ],
    'platformOwner'
  );
  assertLacksAll(
    assert,
    platformOwner,
    [
      /App\.platform\.util\.debounce\s*=/,
      /Platform\.getDimsM\s*=/,
      /Platform\.ensureRenderLoop\s*=/,
      /patchRuntime\(/,
    ],
    'platformOwner'
  );
  assertMatchesAll(
    assert,
    platformBundle,
    [
      /export function installPlatformUtilSurface\(/,
      /export function installPlatformServiceSurface\(/,
      /export function readBootFailFastFlag\(/,
      /export function applyPlatformBootFlagsToRuntime\(/,
      /export function shouldConsoleLogOnce\(/,
    ],
    'platformBundle'
  );

  assertMatchesAll(
    assert,
    kernelOwner,
    [
      /kernel_install_support\.js/,
      /createKernelInstallSupport\(App\)/,
      /ensureStateKernel\(App: AppContainer\): StateKernelLike/,
    ],
    'kernelOwner'
  );
  assertMatchesAll(
    assert,
    kernelInstallSupport,
    [
      /export function createKernelInstallSupport\(App: AppContainer\): KernelInstallSupport/,
      /const setStoreConfigPatch = \(patch: ConfigSlicePatch, meta: ActionMetaLike\): boolean =>/,
      /const reportNonFatal = \(/,
    ],
    'kernelInstallSupport'
  );

  assertMatchesAll(
    assert,
    kernelConfigMapsOwner,
    [
      /kernel_state_kernel_config_maps_shared\.js/,
      /kernel_state_kernel_config_maps_capture\.js/,
      /kernel_state_kernel_config_maps_apply\.js/,
      /kernel_state_kernel_config_maps_patch\.js/,
      /installKernelStateKernelConfigCaptureSurface\(helpers, tools\);/,
      /installKernelStateKernelConfigApplySurface\(helpers, tools\);/,
      /installKernelStateKernelConfigPatchSurface\(helpers, tools\);/,
    ],
    'kernelConfigMapsOwner'
  );
  assertMatchesAll(
    assert,
    kernelConfigMapsBundle,
    [
      /export function createKernelStateKernelConfigMapsTools\(/,
      /export function installKernelStateKernelConfigCaptureSurface\(/,
      /export function installKernelStateKernelConfigApplySurface\(/,
      /export function installKernelStateKernelConfigPatchSurface\(/,
      /patchConfigMaps = function \(nextMapsIn: unknown, metaIn: unknown\)/,
    ],
    'kernelConfigMapsBundle'
  );
});

test('[runtime-platform-core-family] runtime/services public api seams stay canonical', () => {
  assertMatchesAll(
    assert,
    servicesApi,
    [
      /export \* from '\.\/api_feature_surface\.js';/,
      /export \* from '\.\/api_state_surface\.js';/,
      /export \* from '\.\/api_services_surface\.js';/,
      /export \* from '\.\/api_runtime_base_surface\.js';/,
      /export \* from '\.\/api_actions_surface\.js';/,
    ],
    'servicesApi'
  );
  assertLacksAll(
    assert,
    servicesApi,
    [/\.\.\/runtime\//, /\.\/canvas_picking_core\.js/, /\.\/scene_runtime\.js/],
    'servicesApi'
  );
  assertMatchesAll(
    assert,
    servicesApiBundle,
    [
      /resetCameraPreset/,
      /setCfgBoardMaterial/,
      /getUiFeedback/,
      /triggerBlobDownloadViaBrowser/,
      /patchViaActions/,
    ],
    'servicesApiBundle'
  );

  assertMatchesAll(
    assert,
    runtimeApi,
    [
      /api_assert_surface\.js/,
      /api_browser_surface\.js/,
      /api_dom_surface\.js/,
      /api_boot_render_surface\.js/,
      /api_services_state_surface\.js/,
      /getHeaderLogoImageMaybe/,
      /ensureRenderNamespace/,
      /getUiBootRuntimeServiceMaybe/,
    ],
    'runtimeApi'
  );
  assertLacksAll(
    assert,
    runtimeApi,
    [
      /from '\.\/assert\.js';/,
      /from '\.\/dom_access\.js';/,
      /from '\.\/render_access\.js';/,
      /from '\.\/ui_boot_state_access\.js';/,
    ],
    'runtimeApi'
  );
  assertMatchesAll(
    assert,
    runtimeApiBundle,
    [
      /assertApp/,
      /getBrowserTimers/,
      /triggerBlobDownloadViaBrowser/,
      /ensureRenderNamespace/,
      /getUiBootRuntimeServiceMaybe/,
    ],
    'runtimeApiBundle'
  );
});

test('[runtime-platform-core-family] runtime maps/doors seams stay thin over focused readers-writers and door-drawer owners', () => {
  assertMatchesAll(
    assert,
    mapsOwner,
    [/maps_access_readers\.js/, /maps_access_writers\.js/, /maps_access_saved_collections\.js/],
    'mapsOwner'
  );
  assertLacksAll(assert, mapsOwner, [/function trySetKey/], 'mapsOwner');
  assertMatchesAll(
    assert,
    mapsBundle,
    [
      /export function trySetKey/,
      /export const readMap:/,
      /normalizeKnownMapSnapshot/,
      /export function writeMapKey<[^>]+>/,
      /export function writeSplitBottom/,
      /export function writeSavedColors/,
      /MapsNamespaceLike/,
      /ActionMetaLike/,
    ],
    'mapsBundle'
  );
  assertLacksAll(assert, mapsBundle, [/setSavedColors\?: \(arr: unknown, meta\?: unknown\)/], 'mapsBundle');

  assertMatchesAll(
    assert,
    doorsOwner,
    [/doors_access_services\.js/, /doors_access_drawers\.js/, /doors_access_doors\.js/],
    'doorsOwner'
  );
  assertLacksAll(
    assert,
    doorsOwner,
    [/export function setDoorsOpenViaService\(/, /export function getDrawerMetaMap\(/],
    'doorsOwner'
  );
  assertMatchesAll(
    assert,
    doorsBundle,
    [
      /export function ensureDoorsService\(/,
      /export function writeDoorsRuntimeNumber\(/,
      /export function setDrawerMetaEntry\(/,
      /export function consumeDrawerRebuildIntent\(/,
      /export function setDoorsOpenViaService\(/,
      /export function syncDoorsVisualsNow\(/,
      /export function asFiniteNumber\(/,
      /DoorsSyncVisualsOptionsLike/,
      /DoorsReleaseEditHoldOptionsLike/,
    ],
    'doorsBundle'
  );
  assertLacksAll(assert, doorsBundle, [/setOpen\?: \(open: boolean, meta\?: unknown\)/], 'doorsBundle');
});
