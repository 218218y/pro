import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll } from './_source_bundle.js';

const kernelTypes = readSource('../types/kernel.ts', import.meta.url);
const modesSource = readSource('../esm/native/ui/modes.ts', import.meta.url);
const stateApiSurfaceNamespaces = [
  readSource('../esm/native/kernel/state_api_surface_namespaces.ts', import.meta.url),
  readSource('../esm/native/kernel/state_api_surface_runtime_mode.ts', import.meta.url),
].join('\n');

test('[stageBE-mode-transition-types] mode transition surfaces use shared typed option bags instead of unknown opts', () => {
  assertMatchesAll(
    assert,
    kernelTypes,
    [
      /export interface ModeActionOptsLike extends UnknownRecord \{/,
      /handleType\?: string \| null;/,
      /manualTool\?: string \| null;/,
      /extDrawerCount\?: number \| null;/,
      /export interface ModeTransitionOptsLike extends ModeActionOptsLike \{/,
      /modeOpts\?: ModeActionOptsLike;/,
      /set\?: \(primary: unknown, opts\?: ModeActionOptsLike, meta\?: ActionMetaLike\) => unknown;/,
    ],
    'kernel mode option types'
  );

  assertMatchesAll(
    assert,
    modesSource,
    [
      /(?:enterPrimaryMode: \(mode\?: string, opts\?: ModeTransitionOptsLike\) => void;|api\.enterPrimaryMode = \(mode\?: string, opts\?: ModeTransitionOptsLike\) => enterPrimaryMode\(App, mode, opts\);)/,
      /(?:exitPrimaryMode: \(expectedMode\?: string, opts\?: ModeTransitionOptsLike\) => void;|api\.exitPrimaryMode = \(expectedMode\?: string, opts\?: ModeTransitionOptsLike\) => exitPrimaryMode\(App, expectedMode, opts\);)/,
      /(?:togglePrimaryMode: \(mode: string, opts\?: ModeActionOptsLike\) => void;|api\.togglePrimaryMode = \(mode: string, opts\?: ModeActionOptsLike\) => togglePrimaryMode\(App, mode, opts\);)/,
      /function getOptsRecord\(value: unknown\): ModeActionOptsLike \{/,
      /function getEnterExitOpts\(value: unknown\): ModeTransitionOptsLike \{/,
    ],
    'ui modes typed options'
  );

  assertMatchesAll(
    assert,
    stateApiSurfaceNamespaces,
    [
      /modeNs\.set = function set\(primary: unknown, opts\?: ModeActionOptsLike, meta\?: ActionMetaLike\) \{/,
      /const cleanOpts = asObj<ModeActionOptsLike>\(opts\) \|\| \{\};/,
    ],
    'state_api surface namespace mode action options'
  );
});
