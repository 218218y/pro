import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const stateApiStackRouter = bundleSources(
  [
    '../esm/native/kernel/state_api_stack_router.ts',
    '../esm/native/kernel/state_api_stack_router_patch.ts',
    '../esm/native/kernel/state_api_stack_router_shared.ts',
  ],
  import.meta.url
);
const modulesApi = readSource(
  '../esm/native/features/modules_configuration/modules_config_api.ts',
  import.meta.url
);
const modulesPatch = readSource(
  '../esm/native/features/modules_configuration/modules_config_patch.ts',
  import.meta.url
);
const modulesBundle = bundleSources(
  [
    '../esm/native/features/modules_configuration/modules_config_api.ts',
    '../esm/native/features/modules_configuration/modules_config_contracts.ts',
    '../esm/native/features/modules_configuration/modules_config_structure.ts',
    '../esm/native/features/modules_configuration/modules_config_patch.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const cornerApi = readSource(
  '../esm/native/features/modules_configuration/corner_cells_api.ts',
  import.meta.url
);
const cornerBundle = bundleSources(
  [
    '../esm/native/features/modules_configuration/corner_cells_api.ts',
    '../esm/native/features/modules_configuration/corner_cells_contracts.ts',
    '../esm/native/features/modules_configuration/corner_cells_patch.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_shared.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_normalize.ts',
    '../esm/native/features/modules_configuration/corner_cells_snapshot_stack.ts',
    '../esm/native/features/modules_configuration/corner_cells_ui_defaults.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const viewportRuntimeRaw = readSource('../esm/native/services/viewport_runtime.ts', import.meta.url);
const viewportBundle = bundleSources(
  [
    '../esm/native/services/viewport_runtime.ts',
    '../esm/native/services/viewport_runtime_support.ts',
    '../esm/native/services/render_surface_runtime.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const buildTypes = readBuildTypesBundle(import.meta.url);

test('[stageB] kernel module/corner patching delegates to typed pure helpers', () => {
  assertMatchesAll(
    assert,
    stateApiStackRouter,
    [
      /patchModulesConfigurationListAtForPatch\(/,
      /patchCornerConfigurationCellForStack\(/,
      /patchCornerConfigurationForStack\(/,
      /cloneCornerConfigurationForLowerSnapshot\(/,
    ],
    'state api stack router'
  );
  assertLacksAll(
    assert,
    stateApiStackRouter,
    [/const __deepClone =/, /const applyObjPatch =/],
    'state api stack router'
  );

  assertMatchesAll(
    assert,
    modulesApi,
    [
      /from '\.\/modules_config_contracts\.js';/,
      /from '\.\/modules_config_structure\.js';/,
      /from '\.\/modules_config_patch\.js';/,
    ],
    'modules config api'
  );

  assertMatchesAll(
    assert,
    modulesBundle,
    [
      /export function patchModulesConfigurationListAtForPatch\(/,
      /export function resolveTopModulesStructureFromUiConfig\(/,
      /export function ensureModulesConfigurationItemFromConfigSnapshot\(/,
    ],
    'modules config bundle'
  );
  assertMatchesAll(
    assert,
    modulesPatch,
    [/if \(k === 'customData' && isRecord\(v\) && isRecord\(base\.customData\)\)/],
    'modules config patch owner'
  );

  assertMatchesAll(
    assert,
    cornerApi,
    [
      /from '\.\/corner_cells_patch\.js';/,
      /from '\.\/corner_cells_snapshot\.js';/,
      /export type \{ CornerStackKey \} from '\.\/corner_cells_snapshot\.js';/,
    ],
    'corner api owner'
  );

  assertMatchesAll(
    assert,
    cornerBundle,
    [
      /CornerStackKey/,
      /export function patchCornerConfigurationCellForStack\(/,
      /export function patchCornerConfigurationForStack\(/,
      /cell\.customData = Object\.assign\(\{\}, cell\.customData, v\);/,
    ],
    'corner bundle'
  );
});

test('[stageB] viewport runtime exposes explicit typed service surfaces', () => {
  assertMatchesAll(
    assert,
    viewportBundle,
    [
      /ViewportRuntimeApplySketchModeOptions/,
      /ViewportRuntimeServiceLike/,
      /type ViewportRuntimeAppLike = Partial<Pick<AppContainer,/,
      /ensureServiceSlot<InstallableViewportRuntimeService>\(App,/,
      /export function installViewportRuntimeService\(App: AppContainer\): ViewportRuntimeServiceLike/,
      /export function getViewportRenderCore\(/,
      /export function getViewportCameraControls\(/,
    ],
    'viewport runtime bundle'
  );
  assertLacksAll(
    assert,
    viewportRuntimeRaw,
    [/type AppLike = AppContainer \| \(AnyRecord/],
    'viewport runtime owner'
  );

  assertMatchesAll(
    assert,
    buildTypes,
    [
      /export interface ViewportRuntimeApplySketchModeOptions extends UnknownRecord/,
      /export interface ViewportRuntimeServiceLike extends UnknownRecord/,
      /viewport\?: ViewportRuntimeServiceLike;/,
    ],
    'build types'
  );
});
