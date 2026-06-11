import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Shared command/process helpers for verify orchestration.

export function resolveProjectRoot(importMetaUrl = import.meta.url) {
  const filename = fileURLToPath(importMetaUrl);
  return path.resolve(path.dirname(filename), '..');
}

export function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function header(title) {
  console.log('\n============================================================');
  console.log(title);
  console.log('============================================================\n');
}

function createCommandError(message, exitCode, cause) {
  const err = new Error(message);
  err.exitCode = typeof exitCode === 'number' ? exitCode : 1;
  err.verifyHandled = true;
  if (cause) err.cause = cause;
  return err;
}

export function runCmd({ projectRoot, childEnv, cmd, args, label }) {
  header(label || `${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    env: childEnv,
    shell: false,
  });

  if (res.error) {
    throw createCommandError(`\n❌ Failed to start: ${cmd}`, 1, res.error);
  }

  const code = typeof res.status === 'number' ? res.status : 1;
  if (code !== 0) {
    throw createCommandError(`\n❌ Command failed: ${cmd} ${args.join(' ')}`, code);
  }
  return { ok: true, code };
}

export function runCmdCapture({ projectRoot, childEnv, cmd, args, label }) {
  header(label || `${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    cwd: projectRoot,
    env: childEnv,
    shell: false,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  if (typeof res.stdout === 'string' && res.stdout.length) process.stdout.write(res.stdout);
  if (typeof res.stderr === 'string' && res.stderr.length) process.stderr.write(res.stderr);

  const code = typeof res.status === 'number' ? res.status : 1;
  return {
    ok: !res.error && code === 0,
    code,
    error: res.error,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

export function npmRun({ projectRoot, childEnv, scriptName, label }) {
  const stepLabel = label || `npm run ${scriptName}`;
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'cmd.exe';
    return runCmd({
      projectRoot,
      childEnv,
      cmd: comspec,
      args: ['/d', '/s', '/c', 'npm', 'run', scriptName],
      label: stepLabel,
    });
  }
  return runCmd({ projectRoot, childEnv, cmd: 'npm', args: ['run', scriptName], label: stepLabel });
}

export function npmRunCapture({ projectRoot, childEnv, scriptName, label }) {
  const stepLabel = label || `npm run ${scriptName}`;
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'cmd.exe';
    return runCmdCapture({
      projectRoot,
      childEnv,
      cmd: comspec,
      args: ['/d', '/s', '/c', 'npm', 'run', scriptName],
      label: stepLabel,
    });
  }
  return runCmdCapture({
    projectRoot,
    childEnv,
    cmd: 'npm',
    args: ['run', scriptName],
    label: stepLabel,
  });
}
