import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readBuildTypesBundle } from './_build_types_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const buildTypes = readBuildTypesBundle(import.meta.url);
const kernelOwner = readSource('../esm/native/kernel/kernel.ts', import.meta.url);
const kernelConfigOwner = read('esm/native/kernel/kernel_state_kernel_config.ts');
const historyAccess = read('esm/native/kernel/history_access.ts');
const stateKernelService = read('esm/native/kernel/state_kernel_service.ts');
const kernelBundle = bundleSources(
  [
    '../esm/native/kernel/kernel.ts',
    '../esm/native/kernel/kernel_state_kernel_config.ts',
    '../esm/native/kernel/kernel_state_kernel_config_shared.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_shared.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_capture.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_apply.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch_shared.ts',
    '../esm/native/kernel/kernel_state_kernel_config_maps_patch_ops.ts',
    '../esm/native/kernel/kernel_state_kernel_config_modules_corner.ts',
    '../esm/native/kernel/kernel_state_kernel_config_modules_corner_ensure.ts',
    '../esm/native/kernel/kernel_state_kernel_config_modules_corner_patch.ts',
  ],
  import.meta.url
);

const stateOwner = readSource('../esm/native/kernel/state_api.ts', import.meta.url);
const stateBundle = bundleSources(
  [
    '../esm/native/kernel/state_api.ts',
    '../esm/native/kernel/state_api_install_support.ts',
    '../esm/native/kernel/state_api_history_meta_reactivity.ts',
    '../esm/native/kernel/state_api_history_store_reactivity.ts',
    '../esm/native/kernel/state_api_history_store_reactivity_runtime.ts',
    '../esm/native/kernel/state_api_history_namespace.ts',
    '../esm/native/kernel/state_api_meta_namespace.ts',
  ],
  import.meta.url
);
const domainOwner = readSource('../esm/native/kernel/domain_api.ts', import.meta.url);
const domainBundle = bundleSources(
  [
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_shared.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_no_main.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_template.ts',
    '../esm/native/kernel/domain_api_modules_corner_shared.ts',
    '../esm/native/kernel/domain_api_modules_corner_selectors.ts',
    '../esm/native/kernel/domain_api_modules_corner_module_patch.ts',
    '../esm/native/kernel/domain_api_modules_corner_corner_patch.ts',
  ],
  import.meta.url
);
const domainRoom = read('esm/native/kernel/domain_api_room_section.ts');
const domainRoomBundle = bundleSources(
  [
    '../esm/native/kernel/domain_api_room_section.ts',
    '../esm/native/kernel/domain_api_room_section_shared.ts',
    '../esm/native/kernel/domain_api_room_section_wardrobe.ts',
    '../esm/native/kernel/domain_api_room_section_manual_width.ts',
  ],
  import.meta.url
);
const domainColors = read('esm/native/kernel/domain_api_colors_section.ts');

test('[kernel-di] stateKernel DI stays centralized under services.stateKernel and kernel config helpers stay thin', () => {
  assert.match(buildTypes, /stateKernel\?: StateKernelLike;/);

  assertMatchesAll(
    assert,
    stateKernelService,
    [
      /export function ensureStateKernelService\(app: AppContainer\): StateKernelLike/,
      /ensureServiceSlot<MutableStateKernelShape>\(app, 'stateKernel'\)/,
    ],
    'state kernel service'
  );
  assert.doesNotMatch(stateKernelService, /ensureServicesNamespace\(/);

  assertMatchesAll(
    assert,
    kernelOwner,
    [
      /import \{ ensureStateKernelService(?:, getStateKernelService)? \} from '\.\/state_kernel_service\.js';/,
      /function ensureStateKernel\(App: AppContainer\): StateKernelLike \{/,
      /return ensureStateKernelService\(App\);/,
      /kernel_state_kernel_config\.js/,
      /installKernelStateKernelConfigSurface\(\{/,
    ],
    'kernel owner'
  );
  assert.doesNotMatch(kernelOwner, /function ensureServicesBag\(/);

  assert.doesNotMatch(historyAccess, /state_kernel_service\.js/);
  assert.doesNotMatch(historyAccess, /syncStateKernelHistorySystem\(/);

  assertLacksAll(assert, stateKernelService, [/export default\s+/], 'state kernel service');
  assertLacksAll(assert, kernelConfigOwner, [/export default\s+/], 'kernel config owner');
  assertLacksAll(assert, historyAccess, [/export default\s+/], 'history access');
  assertLacksAll(assert, kernelOwner, [/export default\s+/], 'kernel owner');

  assertMatchesAll(
    assert,
    kernelBundle,
    [
      /export function installKernelStateKernelConfigSurface\(/,
      /installKernelStateKernelConfigMapsSurface\(helpers\);/,
      /installKernelStateKernelConfigModulesCornerSurface\(helpers\);/,
      /__sk\.captureConfig = function/,
      /__sk\.patchConfigMaps = function/,
      /__sk\.patchSplitLowerCornerCellConfig = function/,
    ],
    'kernel bundle'
  );
});

test('[kernel-owner] state, domain, room, and colors owners delegate to focused helper modules', () => {
  assertMatchesAll(
    assert,
    stateOwner,
    [
      /state_api_history_meta_reactivity\.js/,
      /installStateApiHistoryMetaReactivity\(\{/,
      /import \{ installStateApiConfigNamespace \} from '\.\/state_api_config_namespace\.js';/,
      /installStateApiConfigNamespace\(\{/,
    ],
    'state owner'
  );
  assertMatchesAll(
    assert,
    stateBundle,
    [
      /export function installStateApiHistoryMetaReactivity\(/,
      /storeNs\.installReactivity = function installReactivity/,
      /historyNs\.batch = function batch/,
      /metaNs\.uiOnly = function uiOnly/,
    ],
    'state bundle'
  );

  assertMatchesAll(
    assert,
    domainOwner,
    [
      /domain_api_modules_corner\.js/,
      /installDomainApiModulesCorner\(\{/,
      /import \{ installDomainApiRoomSection \} from '\.\/domain_api_room_section\.js';/,
      /import \{ installDomainApiColorsSection \} from '\.\/domain_api_colors_section\.js';/,
      /installDomainApiRoomSection\(\{/,
      /installDomainApiColorsSection\(\{/,
    ],
    'domain owner'
  );
  assertMatchesAll(
    assert,
    domainBundle,
    [
      /export function installDomainApiModulesCorner\(/,
      /modulesActions\.recomputeFromUi =/,
      /modulesActions\.patchAt =/,
      /cornerActions\.patchCellAt =/,
    ],
    'domain bundle'
  );

  assertMatchesAll(
    assert,
    domainRoom,
    [
      /export function installDomainApiRoomSection/,
      /domain_api_room_section_wardrobe\.js/,
      /domain_api_room_section_manual_width\.js/,
    ],
    'domain room owner'
  );
  assertLacksAll(assert, stateOwner, [/export default\s+/], 'state owner');
  assertLacksAll(assert, domainBundle, [/export default\s+/], 'domain bundle');
  assertLacksAll(assert, domainRoom, [/export default\s+/], 'domain room owner');
  assertMatchesAll(
    assert,
    domainRoomBundle,
    [
      /roomActions\.setWardrobeType =/,
      /roomActions\.setManualWidth =/,
      /const PROFILE_UI_RAW_KEYS = \[/,
      /export function installRoomWardrobeTypeSurface\(/,
      /export function installRoomManualWidthSurface\(/,
    ],
    'domain room bundle'
  );
  assertMatchesAll(
    assert,
    domainColors,
    [
      /export function installDomainApiColorsSection/,
      /colorsActions\.setSavedColors =/,
      /colorsActions\.setColorSwatchesOrder =/,
      /colorsActions\.applyPaint =/,
    ],
    'domain colors section'
  );
});
