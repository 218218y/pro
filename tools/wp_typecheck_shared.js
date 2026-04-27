import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

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

export function resolveTsc(
  root,
  { env = process.env, spawnImpl = spawnSync, existsImpl = fs.existsSync } = {}
) {
  const envBin = env.WP_TSC_BIN;
  if (envBin) {
    return { kind: 'bin', cmd: envBin, label: envBin };
  }

  const candidates = [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js'),
  ];
  for (const candidate of candidates) {
    if (existsImpl(candidate)) {
      return { kind: 'node', cmd: candidate, label: path.relative(root, candidate) };
    }
  }

  const globalTsc = spawnImpl('tsc', ['-v'], {
    stdio: 'pipe',
    shell: false,
    cwd: root,
    env,
  });
  if (!globalTsc?.error && globalTsc?.status === 0) {
    return { kind: 'bin', cmd: 'tsc', label: 'tsc' };
  }

  return null;
}

export function createTypecheckLabel(root, tscRef, configPath) {
  const configRel = path.relative(root, configPath);
  return `${tscRef.kind === 'node' ? 'node ' + tscRef.label : tscRef.label} -p ${configRel}`;
}

export function runTypecheckCommand({
  node = process.execPath,
  tscRef,
  configPath,
  label,
  cwd = process.cwd(),
  env = process.env,
  spawnImpl = spawnSync,
  log = console.log,
}) {
  printTypecheckHeader(label, log);
  const args = tscRef.kind === 'node' ? [tscRef.cmd, '-p', configPath] : ['-p', configPath];
  const cmd = tscRef.kind === 'node' ? node : tscRef.cmd;
  return spawnImpl(cmd, args, {
    stdio: 'inherit',
    shell: false,
    cwd,
    env,
  });
}

export function createTypecheckNotFoundMessage() {
  return '❌ TypeScript not found. Install dependencies first: npm install, or expose a global tsc / WP_TSC_BIN.';
}

export function createTypecheckSpawnErrorMessage() {
  return '❌ Failed to start TypeScript.';
}

export function createTypecheckFailureMessage(code) {
  return `\n❌ Typecheck failed (exit ${code})\n`;
}

export function createTypecheckSuccessMessage() {
  return '\n✅ typecheck completed successfully.\n';
}
