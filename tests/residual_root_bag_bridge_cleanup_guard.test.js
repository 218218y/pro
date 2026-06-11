import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertLacksAll, assertMatchesAll } from './_source_bundle.js';

const feedbackShared = readSource('../esm/native/ui/feedback_shared.ts', import.meta.url);
const structureShared = readSource('../esm/native/ui/react/tabs/structure_tab_shared.ts', import.meta.url);
const structureCore = [
  readSource('../esm/native/ui/react/tabs/structure_tab_core.ts', import.meta.url),
  readSource('../esm/native/ui/react/tabs/structure_tab_core_models.ts', import.meta.url),
  readSource('../esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts', import.meta.url),
].join('\n');
const stateApiHistoryMeta = [
  readSource('../esm/native/kernel/state_api_history_meta_reactivity.ts', import.meta.url),
  readSource('../esm/native/kernel/state_api_history_store_reactivity.ts', import.meta.url),
  readSource('../esm/native/kernel/state_api_history_store_reactivity_runtime.ts', import.meta.url),
].join('\n');

test('residual UI/kernel bridge helpers stop probing the generic services root bag', () => {
  assertMatchesAll(
    assert,
    feedbackShared,
    [/ensureUiFeedbackService/, /getUiFeedbackServiceMaybe/, /export function ensureFeedbackService\(/],
    'feedbackShared'
  );

  assertMatchesAll(
    assert,
    structureShared,
    [/structure_tab_core\.js/, /structure_tab_structure_mutations\.js/],
    'structureShared'
  );

  assertMatchesAll(
    assert,
    structureCore,
    [/getModelsServiceMaybe/, /function readModelsServiceSource\(/],
    'structureCore'
  );

  assertMatchesAll(assert, stateApiHistoryMeta, [/scheduleAutosaveViaService\(A\)/], 'stateApiHistoryMeta');

  assertLacksAll(
    assert,
    `${feedbackShared}
${structureShared}
${structureCore}
${stateApiHistoryMeta}`,
    [
      /ensureServicesRoot\(/,
      /A\['services'\]/,
      /readRecord\(appRecord\.services\)/,
      /readRecord\(services\?\.models\) \|\| readRecord\(appRecord\.models\)/,
    ],
    'residualRootBagBridgeCleanup'
  );
});
