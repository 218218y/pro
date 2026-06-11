import fs from 'node:fs';

import { DEFAULT_BASELINE, ESM_ROOT, JS_ROOT } from './wp_check_shared.js';

export function hasFlag(argv, flag) {
  return argv.includes(flag);
}

export function getFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index >= 0 && index + 1 < argv.length) return argv[index + 1];
  const inline = argv.find(arg => arg.startsWith(flag + '='));
  return inline ? inline.slice(flag.length + 1) : null;
}

export function parseCheckArgs(argv, options = {}) {
  const defaultBaselinePath = options.defaultBaselinePath || DEFAULT_BASELINE;
  return {
    strict: hasFlag(argv, '--strict'),
    gate: hasFlag(argv, '--gate') || hasFlag(argv, '--regress'),
    jsonOut: hasFlag(argv, '--json'),
    writeBaseline: hasFlag(argv, '--write-baseline'),
    baselinePath: getFlagValue(argv, '--baseline') || defaultBaselinePath,
  };
}

export function detectMode(options = {}) {
  const jsRoot = options.jsRoot || JS_ROOT;
  const esmRoot = options.esmRoot || ESM_ROOT;
  if (fs.existsSync(jsRoot)) return { mode: 'js', srcRoot: jsRoot };
  if (fs.existsSync(esmRoot)) return { mode: 'esm', srcRoot: esmRoot };
  return { mode: null, srcRoot: null };
}

export function resolvePolicyNeedles(mode) {
  if (mode === 'esm') {
    return [
      'window' + '.App',
      'globalThis' + '.App',
      'legacy' + 'AppGlobal',
      'globalThis' + '.THREE',
      'window' + '.THREE',
    ];
  }
  return ['App.store.dispatch', 'App.cfg.patch', 'App.cfg.setScalar', 'App.cfg.get('];
}

export function createCheckJsonReport({
  mode,
  files,
  fileTypes,
  syntaxTsSkipped,
  totals,
  byDir,
  strict,
  gate,
}) {
  return {
    mode,
    files,
    fileTypes,
    syntaxTsSkipped,
    totals,
    byDir,
    strict,
    gate,
  };
}
