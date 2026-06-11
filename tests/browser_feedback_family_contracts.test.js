import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const browserFamilyBundle = bundleSources(
  [
    '../esm/native/adapters/browser/active_element.ts',
    '../esm/native/adapters/browser/dialogs.ts',
    '../esm/native/adapters/browser/dom.ts',
    '../esm/native/adapters/browser/door_status_css.ts',
    '../esm/native/adapters/browser/env.ts',
    '../esm/native/adapters/browser/surface.ts',
    '../esm/native/adapters/browser/ui_ops.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const browserSurfaceOwner = readSource('../esm/native/adapters/browser/surface.ts', import.meta.url);
const browserUiOpsOwner = readSource('../esm/native/adapters/browser/ui_ops.ts', import.meta.url);

const browserNamedOnlyPaths = [
  '../esm/native/adapters/browser/active_element.ts',
  '../esm/native/adapters/browser/dialogs.ts',
  '../esm/native/adapters/browser/dom.ts',
  '../esm/native/adapters/browser/door_status_css.ts',
  '../esm/native/adapters/browser/env.ts',
  '../esm/native/adapters/browser/surface.ts',
  '../esm/native/adapters/browser/ui_ops.ts',
];

const uiFeedbackBundle = bundleSources(
  [
    '../esm/native/ui/action_feedback_shared.ts',
    '../esm/native/ui/action_family_singleflight.ts',
    '../esm/native/ui/feedback_action_runtime.ts',
    '../esm/native/ui/feedback_confirm_runtime.ts',
    '../esm/native/ui/feedback_modal_state.ts',
    '../esm/native/ui/feedback_prompt_runtime.ts',
    '../esm/native/ui/confirmed_action_family_runtime.ts',
    '../esm/native/ui/settings_backup_runtime.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_custom.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_saved.ts',
    '../esm/native/ui/react/tabs/structure_tab_saved_models_command_flows.ts',
  ],
  import.meta.url,
  { stripNoise: false }
);

const actionFamilyOwner = readSource('../esm/native/ui/action_family_singleflight.ts', import.meta.url);
const feedbackActionOwner = readSource('../esm/native/ui/feedback_action_runtime.ts', import.meta.url);

const uiFeedbackNamedOnlyPaths = [
  '../esm/native/ui/action_feedback_shared.ts',
  '../esm/native/ui/action_family_singleflight.ts',
  '../esm/native/ui/feedback_action_runtime.ts',
  '../esm/native/ui/feedback_confirm_runtime.ts',
  '../esm/native/ui/feedback_modal_state.ts',
  '../esm/native/ui/feedback_prompt_runtime.ts',
];

test('[browser-feedback-family] browser adapters stay named-only and keep canonical installer seams', () => {
  for (const rel of browserNamedOnlyPaths) {
    const source = readSource(rel, import.meta.url);
    assertLacksAll(assert, source, [/export default\s+/], rel);
  }

  assertMatchesAll(
    assert,
    browserFamilyBundle,
    [
      /export function installBrowserEnvAdapter\(/,
      /export function installBrowserDialogsAdapter\(/,
      /export function installBrowserDomAdapter\(/,
      /export function installDoorStatusCssAdapter\(/,
      /export function installBrowserUiOpsAdapter\(/,
      /export function installBrowserSurfaceAdapter\(/,
      /export function makeActiveElementIdReader\(/,
    ],
    'browser adapter family bundle'
  );
});

test('[browser-feedback-family] browser adapter owners remain composition-first', () => {
  assertMatchesAll(
    assert,
    browserSurfaceOwner,
    [
      /import \{ installBrowserDialogsAdapter \} from '\.\/dialogs\.js';/,
      /import \{ installBrowserEnvAdapter \} from '\.\/env\.js';/,
      /import \{ installBrowserDomAdapter \} from '\.\/dom\.js';/,
      /import \{ installDoorStatusCssAdapter \} from '\.\/door_status_css\.js';/,
      /import \{ installBrowserUiOpsAdapter \} from '\.\/ui_ops\.js';/,
      /installBrowserDialogsAdapter\(App\);/,
      /installBrowserEnvAdapter\(App\);/,
      /installBrowserDomAdapter\(App\);/,
      /installDoorStatusCssAdapter\(App\);/,
      /installBrowserUiOpsAdapter\(App\);/,
    ],
    'browser surface owner'
  );

  assertMatchesAll(
    assert,
    browserUiOpsOwner,
    [
      /export function installBrowserUiOpsAdapter\(/,
      /b\.getWindow = function \(\)/,
      /b\.getDevicePixelRatio = function \(\)/,
      /b\.getComputedStyle = function \(el: Element\)/,
      /b\.getSelection = function \(\)/,
      /b\.clearSelection = function \(\)/,
      /b\.setBodyCursor = function \(cursor: string\)/,
      /b\.blurActiveElement = function \(\)/,
      /b\.getScrollTop = function \(\)/,
      /b\.scrollTo = function \(x: number, y: number\)/,
      /b\.setTimeout = function \(fn: \(\) => unknown, ms: number\)/,
      /b\.clearTimeout = function \(id: unknown\)/,
    ],
    'browser ui ops owner'
  );
});

test('[browser-feedback-family] shared action/confirm/prompt helpers stay named-only and canonical', () => {
  for (const rel of uiFeedbackNamedOnlyPaths) {
    const source = readSource(rel, import.meta.url);
    assertLacksAll(assert, source, [/export default\s+/], rel);
  }

  assertMatchesAll(
    assert,
    uiFeedbackBundle,
    [
      /export function readActionReason\(/,
      /export function hasQuietActionReason\(/,
      /export function beginAppActionFamilyFlight<[^>]+>\(/,
      /export function runAppActionFamilySingleFlight<[^>]+>\(/,
      /export async function runConfirmedAction<[^>]+>\(/,
      /export async function runPromptedAction<[^>]+>\(/,
      /export function requestConfirmationFromFeedback\(/,
      /export function requestAppConfirmation\(/,
      /export function getFeedbackModalStateMaybe\(/,
      /export function ensureFeedbackModalState\(/,
      /export function requestPromptFromFeedback\(/,
    ],
    'ui feedback family bundle'
  );
});

test('[browser-feedback-family] ui feedback orchestration remains wiring-first around the canonical helpers', () => {
  assertMatchesAll(
    assert,
    actionFamilyOwner,
    [
      /beginOwnedAsyncFamilyFlight\(/,
      /runOwnedAsyncFamilySingleFlight\(/,
      /owner: readAppActionFlightOwner\(args\)/,
    ],
    'action family singleflight owner'
  );

  assertMatchesAll(
    assert,
    feedbackActionOwner,
    [
      /const confirmation = await args\.request\(\);/,
      /if \(!confirmation\.ok\) return await args\.onRequestError\(confirmation\.message\);/,
      /if \(!confirmation\.confirmed\) return await args\.onCancelled\(\);/,
      /const promptResult = await args\.request\(\);/,
      /if \(!promptResult\.ok\) return await args\.onRequestError\(promptResult\.message\);/,
      /if \(!promptResult\.submitted\) return await args\.onCancelled\(\);/,
      /const value = normalizePromptValue\(promptResult\.value, args\.normalizeValue\);/,
    ],
    'feedback action owner'
  );

  assertMatchesAll(
    assert,
    uiFeedbackBundle,
    [
      /requestAppConfirmation/,
      /runConfirmedAction/,
      /runAppActionFamilySingleFlight/,
      /requestPromptFromFeedback/,
      /runPromptedAction/,
      /requestConfirmationFromFeedback/,
    ],
    'ui feedback callers bundle'
  );
});
