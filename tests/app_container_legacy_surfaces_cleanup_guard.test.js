import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, assertLacksAll, assertMatchesAll } from './_source_bundle.js';

const appTypes = readSource('../types/app.ts', import.meta.url);
const uiTypes = readSource('../types/ui.ts', import.meta.url);
const runtimeAssertApi = readSource('../esm/native/runtime/api_assert_surface.ts', import.meta.url);
const runtimeApi = readSource('../esm/native/runtime/api.ts', import.meta.url);

test('[app-container-legacy-surfaces] AppContainer stops advertising dead legacy app.dom/app.events/app.three slots', () => {
  assertLacksAll(
    assert,
    appTypes,
    [/\bevents\?: Namespace/, /\bthree\?: Namespace/, /\bdom\?: DomHelpersLike/],
    'appTypes'
  );
});

test('[app-container-legacy-surfaces] type barrel drops DomHelpersLike/EventBusLike residues', () => {
  assertLacksAll(
    assert,
    uiTypes,
    [/interface DomHelpersLike/, /interface EventBusLike/, /EventBusHandler/],
    'uiTypes'
  );
  assertMatchesAll(assert, uiTypes, [/export interface RegistryLike/], 'uiTypes');
});

test('[app-container-legacy-surfaces] runtime public api stops exporting assertDom', () => {
  assertLacksAll(assert, runtimeAssertApi, [/\bassertDom\b/], 'runtimeAssertApi');
  assertLacksAll(assert, runtimeApi, [/\bassertDom\b/], 'runtimeApi');
});
