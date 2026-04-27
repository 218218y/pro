// WardrobePro Pure ESM boot sequence.
//
// This file is intentionally small: the full boot order lives in boot_manifest.
// Keeping boot order centralized makes it safer to add features without creating
// cross-layer coupling or hidden side effects.

import { assertApp } from '../native/runtime/api.js';
import { runBootManifest } from './boot_manifest.js';

import type { AppContainer } from '../../types';

export async function bootSequence(app: AppContainer): Promise<AppContainer> {
  // Runtime guard (assertApp throws with a clearer error message).
  const A = assertApp(app, 'bootSequence');
  await runBootManifest(A);
  return A;
}
