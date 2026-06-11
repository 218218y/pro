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
  isKnownTypecheckMode,
  resolveTypecheckConfigPath,
  resolveTypecheckModes,
} from './wp_typecheck_state.js';

export function runTypecheckFlow({
  root = process.cwd(),
  node = process.execPath,
  runAll,
  mode,
  env = process.env,
  log = console.log,
  warn = console.warn,
  spawnImpl,
  existsImpl,
} = {}) {
  const tscRef = resolveTsc(root, { env, spawnImpl, existsImpl });
  if (!tscRef) {
    return {
      ok: false,
      exitCode: 1,
      reason: 'missing-tsc',
      errorMessage: createTypecheckNotFoundMessage(),
    };
  }

  const modes = resolveTypecheckModes({ runAll, mode });
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
      node,
      tscRef,
      configPath,
      label: createTypecheckLabel(root, tscRef, configPath),
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
