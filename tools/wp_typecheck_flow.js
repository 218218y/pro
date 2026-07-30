import {
  createTypecheckFailureMessage,
  createTypecheckLabel,
  createTypecheckNotFoundMessage,
  createTypecheckSpawnErrorMessage,
  createTypecheckSuccessMessage,
  resolveTsc,
  runTypecheckCommand,
} from './wp_typecheck_shared.js';
import {
  MODE_TO_CONFIG,
  configExists,
  createMissingConfigMessage,
  createSkippedMissingConfigMessage,
  createUnknownModeMessage,
  createUnknownOptionsMessage,
  ensureTypecheckBuildInfoDirectory,
  isKnownTypecheckMode,
  resolveTypecheckConfigPath,
  resolveTypecheckExtraArgs,
  resolveTypecheckIncrementalArgs,
  resolveTypecheckModes,
} from './wp_typecheck_state.js';

export function runTypecheckFlow({
  root = process.cwd(),
  node = process.execPath,
  runAll,
  mode,
  unknownOptions = [],
  env = process.env,
  log = console.log,
  warn = console.warn,
  spawnImpl,
  existsImpl,
  platform = process.platform,
} = {}) {
  if (Array.isArray(unknownOptions) && unknownOptions.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      reason: 'unknown-options',
      errorMessage: createUnknownOptionsMessage(unknownOptions),
    };
  }

  const tscRef = resolveTsc(root, { env, node, spawnImpl, existsImpl, platform });
  if (!tscRef) {
    return {
      ok: false,
      exitCode: 1,
      reason: 'missing-tsc',
      errorMessage: createTypecheckNotFoundMessage(),
    };
  }
  if (tscRef.kind === 'blocked') {
    return {
      ok: false,
      exitCode: 1,
      reason:
        tscRef.source === 'local-version-mismatch' ? 'local-tsc-version-mismatch' : 'system-tsc-refused',
      errorMessage: `[WP Typecheck] ${tscRef.errorMessage}`,
    };
  }
  if (tscRef.warning) warn(`[WP Typecheck] ${tscRef.warning}`);

  const modes = resolveTypecheckModes({ runAll, mode });
  ensureTypecheckBuildInfoDirectory(root);
  for (const currentMode of modes) {
    if (!isKnownTypecheckMode(currentMode)) {
      return {
        ok: false,
        exitCode: 2,
        reason: 'unknown-mode',
        errorMessage: createUnknownModeMessage(currentMode),
      };
    }
    const configPath = resolveTypecheckConfigPath(root, currentMode);
    const extraArgs = [
      ...resolveTypecheckIncrementalArgs(root, currentMode, env),
      ...resolveTypecheckExtraArgs(currentMode),
    ];
    if (!configExists(configPath, existsImpl)) {
      if (runAll) {
        warn(createSkippedMissingConfigMessage(MODE_TO_CONFIG[currentMode]));
        continue;
      }
      return {
        ok: false,
        exitCode: 2,
        reason: 'missing-config',
        errorMessage: createMissingConfigMessage(MODE_TO_CONFIG[currentMode]),
      };
    }

    const result = runTypecheckCommand({
      tscRef,
      configPath,
      extraArgs,
      label: createTypecheckLabel(root, tscRef, configPath, extraArgs),
      cwd: root,
      env,
      spawnImpl,
      log,
    });

    if (result?.error) {
      return {
        ok: false,
        exitCode: 1,
        reason: 'spawn-error',
        errorMessage: createTypecheckSpawnErrorMessage(),
        cause: result.error,
      };
    }

    const code = typeof result?.status === 'number' ? result.status : 1;
    if (code !== 0) {
      return {
        ok: false,
        exitCode: code,
        reason: 'typecheck-failed',
        errorMessage: createTypecheckFailureMessage(code),
      };
    }
  }

  log(createTypecheckSuccessMessage());
  return { ok: true, exitCode: 0 };
}
