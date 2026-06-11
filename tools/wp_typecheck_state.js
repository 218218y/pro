import path from 'node:path';
import fs from 'node:fs';

export const MODE_TO_CONFIG = {
  app: 'tsconfig.checkjs.app.json',
  boot: 'tsconfig.checkjs.boot.json',
  'strict-boot': 'tsconfig.checkjs.strict-boot.json',
  data: 'tsconfig.checkjs.data.json',
  io: 'tsconfig.checkjs.io.json',
  services: 'tsconfig.checkjs.services.json',
  js: 'tsconfig.checkjs.json',
  kernel: 'tsconfig.checkjs.kernel.json',
  platform: 'tsconfig.checkjs.platform.json',
  builder: 'tsconfig.checkjs.builder.json',
  ui: 'tsconfig.checkjs.ui.json',
  runtime: 'tsconfig.checkjs.runtime.json',
  'adapters-browser': 'tsconfig.checkjs.adapters-browser.json',
  strictcore: 'tsconfig.checkjs.strictcore.json',
  'strict-runtime': 'tsconfig.checkjs.strict-runtime.json',
  'strict-adapters-browser': 'tsconfig.checkjs.strict-adapters-browser.json',
  'strict-kernel': 'tsconfig.checkjs.strict-kernel.json',
  'strict-services': 'tsconfig.checkjs.strict-services.json',
  'strict-platform': 'tsconfig.checkjs.strict-platform.json',
  'strict-ui': 'tsconfig.checkjs.strict-ui.json',
};

export const DEFAULT_ALL_MODES = [
  'boot',
  'strict-boot',
  'data',
  'io',
  'services',
  'js',
  'kernel',
  'platform',
  'builder',
  'ui',
  'runtime',
  'adapters-browser',
  'strictcore',
  'strict-runtime',
  'strict-adapters-browser',
  'strict-kernel',
  'strict-services',
  'strict-platform',
  'strict-ui',
];

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

export function configExists(configPath, existsImpl = fs.existsSync) {
  return existsImpl(configPath);
}

export function createUnknownModeMessage(mode) {
  return `❌ Unknown mode: ${mode || '(missing)'}`;
}

export function createMissingConfigMessage(configName) {
  return `❌ Missing config: ${configName}`;
}

export function createSkippedMissingConfigMessage(configName) {
  return `⚠️  Skipping missing config: ${configName}`;
}
