import path from 'node:path';
import fs from 'node:fs';

// The whole-project strict config is the canonical correctness gate.
// core-hardening incrementally enables stricter indexed/optional semantics on
// state/runtime/platform, geometry-core, and corner-geometry owners plus their transitive dependencies.
// ui-lean is intentionally separate because it compiles UI .ts files against
// the dependency-light lean_types ambient surface rather than normal package types.
export const MODE_TO_CONFIG = Object.freeze({
  project: 'tsconfig.json',
  'core-hardening': 'tsconfig.hardening-core.json',
  'ui-lean': 'tsconfig.ui-lean.json',
});

export const DEFAULT_ALL_MODES = Object.freeze(['project', 'core-hardening', 'ui-lean']);

export function parseTypecheckArgs(argv) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--')));
  const modeIndex = argv.indexOf('--mode');
  const modeValue =
    modeIndex !== -1 && modeIndex + 1 < argv.length && !argv[modeIndex + 1].startsWith('--')
      ? argv[modeIndex + 1]
      : null;
  const knownFlags = new Set(['--help', '-h', '--all', '--mode']);
  const unknownOptions = argv.filter((arg, index) => {
    if (index === modeIndex + 1 && modeIndex !== -1) return false;
    return arg.startsWith('--') && !knownFlags.has(arg);
  });
  return {
    help: flags.has('--help') || flags.has('-h'),
    mode: modeValue,
    runAll: flags.has('--all') || !modeValue,
    unknownOptions,
  };
}

export function resolveTypecheckModes({ runAll, mode }) {
  return runAll ? [...DEFAULT_ALL_MODES] : [mode];
}

export function isKnownTypecheckMode(mode) {
  return !!mode && Object.hasOwn(MODE_TO_CONFIG, mode);
}

export function resolveTypecheckConfigPath(root, mode) {
  return path.join(root, MODE_TO_CONFIG[mode]);
}

export function resolveTypecheckBuildInfoPath(root, mode) {
  return path.join(root, '.artifacts', 'tsbuildinfo', `${mode}.tsbuildinfo`);
}

export function resolveTypecheckIncrementalArgs(root, mode, env = process.env) {
  if (env.WP_TYPECHECK_INCREMENTAL === '0') return [];
  return ['--incremental', '--tsBuildInfoFile', resolveTypecheckBuildInfoPath(root, mode)];
}

export function ensureTypecheckBuildInfoDirectory(root, mkdirImpl = fs.mkdirSync) {
  mkdirImpl(path.join(root, '.artifacts', 'tsbuildinfo'), { recursive: true });
}

export function configExists(configPath, existsImpl = fs.existsSync) {
  return existsImpl(configPath);
}

export function createUnknownModeMessage(mode) {
  return `[WP Typecheck] Unknown mode: ${mode || '(missing)'}`;
}

export function createUnknownOptionsMessage(options) {
  const values = Array.isArray(options) ? options.filter(Boolean) : [];
  return `[WP Typecheck] Unknown option(s): ${values.join(', ')}`;
}

export function createMissingConfigMessage(configName) {
  return `[WP Typecheck] Missing config: ${configName}`;
}

export function createSkippedMissingConfigMessage(configName) {
  return `[WP Typecheck] Skipping missing config: ${configName}`;
}
