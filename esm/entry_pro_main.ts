// Pro entry main (Pure ESM)
//
// Responsibilities:
// - Load THREE + optional extras (OrbitControls, RoundedBoxGeometry) via ESM.
// - Build deps object (browser surface, flags, config overrides).
// - Call esm/main boot() with deps.

import { boot as bootEsm } from './main.js';

import {
  applyValidatedRuntimeFlags,
  bootReportBestEffort,
  classifyFailure,
  loadRuntimeConfigModule,
  loadThreeEsm,
  reportOverlayFailurePreservingOriginal,
  resolveRuntimeConfig,
  showFatalOverlayMaybe,
} from './entry_pro_main_boot_support.js';
import { runBrowserBootSetup } from './entry_pro_main_browser_boot.js';
import { bootProEntryRuntime } from './entry_pro_main_runtime.js';

import type { AppContainer } from '../types';

import type { BootEnv } from './entry_pro_main_shared.js';

export async function bootProEntry(env: BootEnv = {}): Promise<AppContainer> {
  return bootProEntryRuntime(env, {
    bootEsm,
    loadThreeEsm,
    loadRuntimeConfigModule,
    applyValidatedRuntimeFlags,
    resolveRuntimeConfig,
    runBrowserBootSetup,
    classifyFailure,
    showFatalOverlayMaybe,
    reportOverlayFailurePreservingOriginal,
    bootReportBestEffort,
  });
}
