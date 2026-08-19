import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLocalTypeScriptNotFoundMessage, resolveTypeScriptTool } from './wp_typescript_resolver.js';

export function createTypecheckHelpText() {
  return [
    'Usage:',
    '  node tools/wp_typecheck.js --all',
    '  node tools/wp_typecheck.js --mode project',
    '  node tools/wp_typecheck.js --mode core-hardening',
    '  node tools/wp_typecheck.js --mode ui-lean',
  ].join('\n');
}

export function printTypecheckHeader(title, log = console.log) {
  log('\n============================================================');
  log(title);
  log('============================================================\n');
}

function createTypecheckToolLabel(root, tool) {
  if (tool.kind === 'node-script') {
    return `node ${path.relative(root, tool.script)}`;
  }
  return tool.command;
}

export function resolveTsc(
  root,
  {
    env = process.env,
    node = process.execPath,
    spawnImpl = spawnSync,
    existsImpl,
    platform = process.platform,
  } = {}
) {
  const tool = resolveTypeScriptTool(root, { env, node, spawnImpl, existsImpl, platform });
  if (!tool) return null;

  if (tool.kind === 'blocked') {
    return {
      kind: 'blocked',
      command: null,
      cmd: null,
      argsPrefix: [],
      label: null,
      source: tool.source,
      warning: null,
      errorMessage: tool.errorMessage,
    };
  }

  return {
    kind: tool.kind,
    command: tool.command,
    cmd: tool.command,
    argsPrefix: [...tool.argsPrefix],
    label: createTypecheckToolLabel(root, tool),
    source: tool.source,
    warning: tool.warning,
  };
}

export function createTypecheckLabel(root, tscRef, configPath, extraArgs = []) {
  const configRel = path.relative(root, configPath);
  const suffix = extraArgs.length ? ` ${extraArgs.join(' ')}` : '';
  return `${tscRef.label} -p ${configRel}${suffix}`;
}

export function runTypecheckCommand({
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
  return spawnImpl(tscRef.command, [...tscRef.argsPrefix, '-p', configPath, ...extraArgs], {
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
