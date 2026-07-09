import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const LOCAL_TYPESCRIPT_NOT_FOUND_MESSAGE =
  'Local TypeScript was not found. Run npm ci before running build/verify. Refusing to use system tsc in release/CI mode.';

export const SYSTEM_TSC_MANUAL_WARNING =
  'WP_ALLOW_SYSTEM_TSC=1 is set; using system TypeScript. This is a manual mode and is not valid for release/CI verification.';

export const SYSTEM_TSC_CI_REFUSAL_MESSAGE =
  'WP_ALLOW_SYSTEM_TSC=1 is manual-only and is refused in CI/release verification. Run npm ci so local TypeScript is available.';

function createNodeScriptTool(scriptPath, { node, source, warning = null }) {
  return {
    kind: 'node-script',
    command: node,
    argsPrefix: [scriptPath],
    script: scriptPath,
    bin: scriptPath,
    source,
    warning,
  };
}

function createBinTool(kind, binPath, { source, warning = null }) {
  return {
    kind,
    command: binPath,
    argsPrefix: [],
    bin: binPath,
    source,
    warning,
  };
}

function existingCandidate(candidates, existsImpl) {
  return candidates.find(candidate => existsImpl(candidate.path)) || null;
}

export function isSystemTscAllowed(env = process.env) {
  return env && env.WP_ALLOW_SYSTEM_TSC === '1';
}

export function isTruthyEnvValue(value) {
  return /^(?:1|true|yes|on)$/i.test(String(value || '').trim());
}

export function isCiLikeEnv(env = process.env) {
  if (!env) return false;
  if (isTruthyEnvValue(env.CI)) return true;
  const ciKeys = [
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'BUILDKITE',
    'CIRCLECI',
    'TF_BUILD',
    'APPVEYOR',
    'TRAVIS',
    'JENKINS_URL',
    'BUILD_BUILDID',
    'TEAMCITY_VERSION',
  ];
  return ciKeys.some(key => {
    const value = env[key];
    return (
      value !== undefined && value !== null && String(value).trim() !== '' && !/^false$/i.test(String(value))
    );
  });
}

export function isReleaseLifecycleEnv(env = process.env) {
  if (isTruthyEnvValue(env?.WP_RELEASE_VERIFY)) return true;
  const event = String(env?.npm_lifecycle_event || '').trim();
  if (/^(?:gate|verify|release|bundle)(?::|$)/.test(event)) return true;
  const script = String(env?.npm_lifecycle_script || '');
  return /\bwp_(?:verify|release)\.js\b/.test(script);
}

export function isReleaseOrCiEnv(env = process.env) {
  return isCiLikeEnv(env) || isReleaseLifecycleEnv(env);
}

export function resolveLocalTypeScriptTool(
  root,
  { node = process.execPath, existsImpl = fs.existsSync } = {}
) {
  const directBinNames = process.platform === 'win32' ? ['tsc.cmd', 'tsc'] : ['tsc'];
  const localCandidates = [
    {
      kind: 'node-script',
      path: path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'),
      source: 'local-node-modules',
    },
    {
      kind: 'node-script',
      path: path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      source: 'local-node-modules',
    },
    ...directBinNames.map(name => ({
      kind: 'direct-bin',
      path: path.join(root, 'node_modules', '.bin', name),
      source: 'local-node-modules-bin',
    })),
  ];
  const candidate = existingCandidate(localCandidates, existsImpl);

  if (!candidate) return null;
  if (candidate.kind === 'node-script') {
    return createNodeScriptTool(candidate.path, { node, source: candidate.source });
  }
  return createBinTool(candidate.kind, candidate.path, { source: candidate.source });
}

export function resolveLocalTypeScriptBin(root, { existsImpl = fs.existsSync } = {}) {
  const tool = resolveLocalTypeScriptTool(root, { existsImpl });
  return tool?.script || tool?.bin || tool?.command || null;
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
  { env = process.env, node = process.execPath, spawnImpl = spawnSync, existsImpl = fs.existsSync } = {}
) {
  const localTool = resolveLocalTypeScriptTool(root, { node, existsImpl });
  if (localTool) return localTool;

  if (!isSystemTscAllowed(env)) return null;

  if (isReleaseOrCiEnv(env)) {
    return {
      kind: 'blocked',
      command: null,
      argsPrefix: [],
      source: 'system-fallback-refused',
      warning: null,
      errorMessage: SYSTEM_TSC_CI_REFUSAL_MESSAGE,
    };
  }

  const manualBin = String(env?.WP_TSC_BIN || '').trim();
  if (manualBin) {
    return createBinTool('manual-bin', manualBin, {
      source: 'manual-env-bin',
      warning: SYSTEM_TSC_MANUAL_WARNING,
    });
  }

  if (probeSystemTsc({ env, spawnImpl, cwd: root })) {
    return createBinTool('system', 'tsc', {
      source: 'system-path',
      warning: SYSTEM_TSC_MANUAL_WARNING,
    });
  }

  return null;
}

export function createLocalTypeScriptNotFoundMessage(prefix = '') {
  return `${prefix || ''}${LOCAL_TYPESCRIPT_NOT_FOUND_MESSAGE}`;
}

export function createSystemTscCiRefusalMessage(prefix = '') {
  return `${prefix || ''}${SYSTEM_TSC_CI_REFUSAL_MESSAGE}`;
}
