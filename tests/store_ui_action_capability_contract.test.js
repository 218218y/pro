import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource } from './_source_bundle.js';

const privateLogicFiles = [
  '../esm/native/ui/react/actions/store_actions_ui_writes.ts',
  '../esm/native/ui/react/actions/store_actions_ui_project.ts',
  '../esm/native/ui/react/actions/store_actions_ui_structure.ts',
  '../esm/native/ui/react/actions/store_actions_ui_render.ts',
];

const privateLogic = privateLogicFiles.map(file => readSource(file, import.meta.url)).join('\n');
const facade = readSource('../esm/native/ui/react/actions/store_actions_ui.ts', import.meta.url);
const runtime = readSource('../esm/native/ui/react/actions/store_actions_ui_runtime.ts', import.meta.url);
const contracts = readSource('../esm/native/ui/react/actions/store_actions_ui_contracts.ts', import.meta.url);

test('[store-ui-capability] private UI action logic stays AppContainer-free behind one runtime adapter', () => {
  assert.doesNotMatch(privateLogic, /\bAppContainer\b/);
  assert.doesNotMatch(privateLogic, /services\/api\.js/);
  assert.doesNotMatch(privateLogic, /getUiNamespace\(/);
  assert.match(privateLogic, /StoreUiActionRuntime/);

  assert.match(runtime, /AppContainer/);
  assert.match(runtime, /services\/api\.js/);
  assert.match(runtime, /createStoreUiActionRuntime/);
  assert.match(runtime, /getStoreUiActionRuntime/);
  assert.match(runtime, /WeakMap<AppContainer, StoreUiActionRuntime>/);
});

test('[store-ui-capability] public store UI surface is a real AppContainer facade, not an identity re-export', () => {
  assert.match(facade, /function bindStoreUiAction/);
  assert.match(facade, /getStoreUiActionRuntime\(app\)/);
  assert.match(facade, /bindStoreUiAction\(uiStructure\.setUiBaseType\)/);
  assert.match(facade, /bindStoreUiAction\(uiRender\.setUiShowContents\)/);
  assert.doesNotMatch(facade, /export \{[\s\S]*\} from '\.\/store_actions_ui_structure\.js'/);
  assert.doesNotMatch(facade, /services\/api\.js/);
});

test('[store-ui-capability] capability contract is explicit and does not smuggle the application root back in', () => {
  assert.match(contracts, /export type StoreUiActionRuntime = \{/);
  assert.match(contracts, /readUiActions: \(\) => StoreUiNamedActions/);
  assert.match(contracts, /setRawScalar: StoreUiRawScalarWriter/);
  assert.doesNotMatch(contracts, /\bAppContainer\b/);
  assert.doesNotMatch(contracts, /\[k: string\]: unknown/);
});
