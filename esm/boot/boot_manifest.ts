// WardrobePro Pure ESM boot manifest.
//
// Canonical owner entrypoint only.
// Step registry lives in `boot_manifest_steps.ts` and shared helper/policy
// lives in `boot_manifest_shared.ts` so this file stays focused on the public
// boot surface and manifest execution.

import { assertDeps, assertDepKeys, assertTHREE } from '../native/runtime/api.js';

import type { AppContainer } from '../../types';

export type { BootInstaller, BootStep } from './boot_manifest_shared.js';
export { BOOT_PHASES, BOOT_STEPS } from './boot_manifest_steps.js';

import { BOOT_STEPS } from './boot_manifest_steps.js';
import { runInstaller } from './boot_manifest_shared.js';

export async function runBootManifest(app: AppContainer): Promise<AppContainer> {
  assertDeps(app, 'bootSequence');
  assertTHREE(app, 'bootSequence');
  assertDepKeys(app, ['browser'], 'bootSequence');

  for (let i = 0; i < BOOT_STEPS.length; i++) {
    const s = BOOT_STEPS[i];
    if (!s || typeof s.run !== 'function') continue;
    await runInstaller(s.run, app);
  }

  return app;
}
