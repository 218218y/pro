/* global process */

// Guardrail: importing entrypoints must not perform installation/mutation.
//
// What this test enforces (in Node import context):
// - No legacy globals are read/written/defined (App / THREE).
// - No new globals are added during import.
// - No work is scheduled during import (timers / nextTick / microtasks / listeners).
//
// NOTE: tools/wp_check.js --strict fails on the *text* "globalThis" + ".App" / "globalThis" + ".THREE".
// So this file intentionally uses bracket notation: globalThis['App'].

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function snapshotGlobalNames() {
  const names = Object.getOwnPropertyNames(globalThis);
  names.sort();
  return names;
}

function diffAdded(before, after) {
  const b = new Set(before);
  return after.filter(n => !b.has(n));
}

// --- Track scheduling side effects during import ----------------------------

const counters = {
  setTimeout: 0,
  setInterval: 0,
  setImmediate: 0,
  queueMicrotask: 0,
  requestAnimationFrame: 0,
  processNextTick: 0,
  processOn: 0,
  processOnce: 0,
  processAddListener: 0,
  definePropertyGlobal: 0,
};

const restore = [];

// Keep originals (we may wrap some of these during the import window).
const origDefineProperty = Object.defineProperty;
const origReflectDefineProperty = Reflect.defineProperty;

function wrapGlobalFn(obj, key, counterKey) {
  const orig = obj && obj[key];
  if (typeof orig !== 'function') return;
  obj[key] = (...args) => {
    counters[counterKey]++;
    return orig.apply(obj, args);
  };
  restore.push(() => {
    obj[key] = orig;
  });
}

wrapGlobalFn(globalThis, 'setTimeout', 'setTimeout');
wrapGlobalFn(globalThis, 'setInterval', 'setInterval');
wrapGlobalFn(globalThis, 'setImmediate', 'setImmediate');
wrapGlobalFn(globalThis, 'queueMicrotask', 'queueMicrotask');
wrapGlobalFn(globalThis, 'requestAnimationFrame', 'requestAnimationFrame');

const proc = typeof process !== 'undefined' ? process : null;
if (proc) {
  wrapGlobalFn(proc, 'nextTick', 'processNextTick');
  wrapGlobalFn(proc, 'on', 'processOn');
  wrapGlobalFn(proc, 'once', 'processOnce');
  wrapGlobalFn(proc, 'addListener', 'processAddListener');
}

// --- Legacy global traps (reads + writes) ----------------------------------

function installHardTrap(prop) {
  // If the property already exists, that's a hard policy violation in pure ESM.
  // We don't try to "work around" it.
  if (Object.prototype.hasOwnProperty.call(globalThis, prop)) {
    throw new Error(`Policy violation: legacy global already exists before import: globalThis['${prop}']`);
  }

  // Install a getter+setter trap so even reads are caught.
  // (If code tries `typeof globalThis['App'] !== 'undefined'`, it'll fail, as intended.)
  origDefineProperty(globalThis, prop, {
    configurable: true,
    enumerable: false,
    get() {
      throw new Error(`Side effect detected: attempted to read globalThis['${prop}'] during import`);
    },
    set() {
      throw new Error(`Side effect detected: attempted to assign globalThis['${prop}'] during import`);
    },
  });

  restore.push(() => {
    try {
      // Delete the trap property we created.
      delete globalThis[prop];
    } catch (_) {}
  });
}

installHardTrap('App');
installHardTrap('THREE');

// Prevent defineProperty from being used to create legacy globals without triggering setters.
// We only gate App/THREE to avoid false positives.
Object.defineProperty = (target, prop, desc) => {
  if (target === globalThis && (prop === 'App' || prop === 'THREE')) {
    counters.definePropertyGlobal++;
    throw new Error(`Side effect detected: attempted to define globalThis['${String(prop)}'] during import`);
  }
  return origDefineProperty(target, prop, desc);
};
restore.push(() => {
  Object.defineProperty = origDefineProperty;
});

Reflect.defineProperty = (target, prop, desc) => {
  if (target === globalThis && (prop === 'App' || prop === 'THREE')) {
    counters.definePropertyGlobal++;
    throw new Error(`Side effect detected: attempted to define globalThis['${String(prop)}'] during import`);
  }
  return origReflectDefineProperty(target, prop, desc);
};
restore.push(() => {
  Reflect.defineProperty = origReflectDefineProperty;
});

// Baseline snapshot AFTER installing our traps (so we don't flag our own traps as "added globals").
const beforeNames = snapshotGlobalNames();

try {
  // Ensure the container module does not export an App singleton.
  const container = await import('./app_container.js');
  assert(typeof container.createAppContainer === 'function', 'createAppContainer missing');
  assert(!('App' in container), 'App singleton export detected');
  assert(!('default' in container), 'Default export detected');

  // Imports should not schedule work or touch legacy globals at module-evaluation time.
  await import('./main.js');
  await import('./boot/boot_sequence.js');

  // New globals added during import are considered side effects.
  const afterNamesNow = snapshotGlobalNames();
  const addedNow = diffAdded(beforeNames, afterNamesNow)
    // Ignore the trap keys themselves (present in baseline, but just in case).
    .filter(n => n !== 'App' && n !== 'THREE');

  assert(addedNow.length === 0, `Unexpected global additions during import: ${addedNow.join(', ')}`);

  // Timers/listeners during import are considered side effects.
  const scheduled = Object.entries(counters).filter(([, v]) => v > 0);
  assert(
    scheduled.length === 0,
    `Side effects detected during import (scheduling/listeners/defineProperty): ${scheduled
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );
} finally {
  // Restore patches and remove traps.
  // Restore in reverse order for sanity.
  for (let i = restore.length - 1; i >= 0; i--) {
    try {
      restore[i]();
    } catch (_) {}
  }
}

// Final sanity: ensure legacy globals are not present after import.
assert(!Object.prototype.hasOwnProperty.call(globalThis, 'App'), "Global 'App' alias detected");
assert(!Object.prototype.hasOwnProperty.call(globalThis, 'THREE'), "Global 'THREE' alias detected");

console.log('[ESM] no-side-effects-on-import: OK');
