import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const LOCAL_TYPESCRIPT_NOT_FOUND_MESSAGE =
  'Local TypeScript was not found. Run npm ci before running build/verify. Refusing to use system tsc in release/CI mode.';

export const SYSTEM_TSC_MANUAL_WARNING =
  'WP_ALLOW_SYSTEM_TSC=1 is set; using system TypeScript. This is a manual mode and is not valid for release/CI verification.';

export function isSystemTscAllowed(env = process.env) {
  return env && env.WP_ALLOW_SYSTEM_TSC === '1';
}

export function resolveLocalTypeScriptBin(root, { existsImpl = fs.existsSync } = {}) {
  const candidates = [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'),
  ];
  for (const candidate of candidates) {
    if (existsImpl(candidate)) return candidate;
  }
  return null;
}

export function probeSystemTsc({ env = process.env, spawnImpl = spawnSync, cwd = process.cwd() } = {}) {
  try {
    const probe = spawnImpl('tsc', ['--version'], {
      stdio: 'ignore',
      shell: false,
      cwd,
      env,
    });
    return !probe?.error && probe?.status === 0;
  } catch {
    return false;
  }
}

export function resolveTypeScriptTool(
  root,
  { env = process.env, spawnImpl = spawnSync, existsImpl = fs.existsSync } = {}
) {
  const localBin = resolveLocalTypeScriptBin(root, { existsImpl });
  if (localBin) {
    return {
      kind: 'local',
      bin: localBin,
      source: 'local-node-modules',
      warning: null,
    };
  }

  if (!isSystemTscAllowed(env)) return null;

  if (env?.WP_TSC_BIN) {
    return {
      kind: 'manual-bin',
      bin: env.WP_TSC_BIN,
      source: 'manual-env-bin',
      warning: SYSTEM_TSC_MANUAL_WARNING,
    };
  }

  if (probeSystemTsc({ env, spawnImpl, cwd: root })) {
    return {
      kind: 'system',
      bin: 'tsc',
      source: 'system-path',
      warning: SYSTEM_TSC_MANUAL_WARNING,
    };
  }

  return null;
}

export function createLocalTypeScriptNotFoundMessage(prefix = '') {
  return `${prefix || ''}${LOCAL_TYPESCRIPT_NOT_FOUND_MESSAGE}`;
}
