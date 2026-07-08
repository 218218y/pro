import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLocalTypeScriptNotFoundMessage, resolveTypeScriptTool } from './wp_typescript_resolver.js';

export function createTypecheckHelpText() {
  return ['Usage:', '  node tools/wp_typecheck.js --all', '  node tools/wp_typecheck.js --mode runtime'].join(
    '\n'
  );
}

export function printTypecheckHeader(title, log = console.log) {
  log('\n============================================================');
  log(title);
  log('============================================================\n');
}

export function resolveTsc(root, { env = process.env, spawnImpl = spawnSync, existsImpl } = {}) {
  const tool = resolveTypeScriptTool(root, { env, spawnImpl, existsImpl });
  if (!tool) return null;

  if (tool.kind === 'blocked') {
    return {
      kind: 'blocked',
      errorMessage: tool.errorMessage,
      source: tool.source,
      warning: null,
    };
  }

  if (tool.kind === 'local') {
    return {
      kind: 'node',
      cmd: tool.bin,
      label: path.relative(root, tool.bin),
      source: tool.source,
      warning: tool.warning,
    };
  }

  return {
    kind: 'bin',
    cmd: tool.bin,
    label: tool.bin,
    source: tool.source,
    warning: tool.warning,
  };
}

export function createTypecheckLabel(root, tscRef, configPath, extraArgs = []) {
  const configRel = path.relative(root, configPath);
  const suffix = extraArgs.length ? ` ${extraArgs.join(' ')}` : '';
  return `${tscRef.kind === 'node' ? 'node ' + tscRef.label : tscRef.label} -p ${configRel}${suffix}`;
}

export function runTypecheckCommand({
  node = process.execPath,
  tscRef,
  configPath,
  extraArgs = [],
  label,
  cwd = process.cwd(),
  env = process.env,
  spawnImpl = spawnSync,
  log = console.log,
}) {
  printTypecheckHeader(label, log);
  const args =
    tscRef.kind === 'node' ? [tscRef.cmd, '-p', configPath, ...extraArgs] : ['-p', configPath, ...extraArgs];
  const cmd = tscRef.kind === 'node' ? node : tscRef.cmd;
  return spawnImpl(cmd, args, {
    stdio: 'inherit',
    shell: false,
    cwd,
    env,
  });
}

export function createTypecheckNotFoundMessage() {
  return createLocalTypeScriptNotFoundMessage('[WP Typecheck] ');
}

export function createTypecheckSpawnErrorMessage() {
  return '[WP Typecheck] Failed to start TypeScript.';
}

export function createTypecheckFailureMessage(code) {
  return `\n[WP Typecheck] Typecheck failed (exit ${code})\n`;
}

export function createTypecheckSuccessMessage() {
  return '\n[WP Typecheck] typecheck completed successfully.\n';
}
