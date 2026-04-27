import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const designShared = readSource('../esm/native/ui/react/tabs/design_tab_shared.ts', import.meta.url);
const designController = bundleSources(
  [
    '../esm/native/ui/react/tabs/use_design_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_design_tab_controller_state.ts',
  ],
  import.meta.url
);
const interiorTab = bundleSources(
  [
    '../esm/native/ui/react/tabs/InteriorTab.view.tsx',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_contracts.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_state.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_view_state_sync.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_local_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_core_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_bindings_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_sketch.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_trim.ts',
    '../esm/native/ui/react/tabs/interior_tab_view_state_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_interior_tab_workflows.tsx',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_runtime.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_contracts.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_drawers.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_handles.ts',
    '../esm/native/ui/react/tabs/interior_tab_workflows_controller_trim.ts',
  ],
  import.meta.url
);
const storeActions = bundleSources(
  [
    '../esm/native/ui/react/actions/store_actions.ts',
    '../esm/native/ui/react/actions/store_actions_state.ts',
  ],
  import.meta.url
);

test('[stageAV] design/interior/store seams normalize tab-specific surfaces without bag casts', () => {
  assertMatchesAll(
    assert,
    designShared,
    [
      /export function readDesignTabDoorStyle\(/,
      /export function readDesignTabCorniceType\(/,
      /export function readDesignTabModeState\(/,
    ],
    'design shared readers'
  );

  assertMatchesAll(
    assert,
    designController,
    [
      /useCfgSelectorShallow\(cfg => readDesignTabCfgState\(cfg\)\)/,
      /useUiSelectorShallow\(ui => readDesignTabUiState\(ui\)\)/,
      /deriveDesignTabDoorFeaturesState\(/,
      /(?:const \{ primaryMode, splitVariant \} = useModeSelectorShallow\(mode => readDesignTabModeState\(mode\)|const modeState = useModeSelectorShallow\(mode => readDesignTabModeState\(mode\))/,
    ],
    'design controller'
  );

  assertMatchesAll(
    assert,
    interiorTab,
    [
      /export const CLOSE_DOORS_OPTS: UnknownRecord = \{ closeDoors: true \};/,
      /deriveInteriorTabCoreState\(/,
      /readInteriorTabUiSnapshot\(/,
      /readInteriorTabModeConsts\(/,
      /export function deriveInteriorTabModeState\(/,
      /export function readGridShelfVariant\(/,
      /export function readHandleType\(/,
    ],
    'interior tab cleanup'
  );

  assertLacksAll(
    assert,
    interiorTab,
    [
      /mode\.opts && typeof mode\.opts === 'object' \? \(mode\.opts as UnknownRecord\) : null/,
      /const modeRec = mode && typeof mode === 'object' \? \(mode as UnknownRecord\) : null;/,
      /currentGridShelfVariant, 'regular'\)\s*\.trim\(\)\s*\.toLowerCase\(\)/,
      /exitPrimaryMode\(app, MODE_MANUAL_LAYOUT, \{ closeDoors: true \} as UnknownRecord\)/,
    ],
    'interior tab legacy casts'
  );

  assertLacksAll(
    assert,
    storeActions,
    [
      /readStore\(value: unknown\): RootStoreLike \| null/,
      /\(value as RootStoreLike\)\.getState/,
      /readActionsNamespace\(value: unknown\): \(ActionsNamespaceLike & UnknownRecord\) \| null/,
    ],
    'store actions readers'
  );
});
