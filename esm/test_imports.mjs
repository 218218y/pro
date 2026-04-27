// Smoke test: ensure critical ESM entrypoints import cleanly in Node.
// This is intentionally minimal: many modules are browser-only at runtime,
// but importing the graph should not throw.

import * as main from './main.js';
import * as bootSeq from './boot/boot_sequence.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(typeof main.createApp === 'function', 'main.createApp missing');
assert(typeof main.boot === 'function', 'main.boot missing');
assert(typeof bootSeq.bootSequence === 'function', 'bootSequence.bootSequence missing');

// Pure ESM: legacy boot exports removed; import graph must still be clean.

console.log('[ESM] import smoke: OK');
