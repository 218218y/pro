#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(scriptPath), '..');
const children = new Set();
let shuttingDown = false;
let finalExitCode = 0;

function isJavaScriptCli(file) {
  return ['.js', '.cjs', '.mjs'].includes(extname(file).toLowerCase());
}

export function resolveNpmRunInvocation(
  script,
  { platform = process.platform, env = process.env, execPath = process.execPath } = {}
) {
  const npmCliPath = String(env.npm_execpath || '').trim();
  if (npmCliPath && isJavaScriptCli(npmCliPath)) {
    return {
      command: execPath,
      args: [npmCliPath, 'run', script],
    };
  }

  if (platform === 'win32') {
    return {
      command: String(env.ComSpec || env.COMSPEC || 'cmd.exe'),
      args: ['/d', '/s', '/c', `npm run ${script}`],
    };
  }

  return {
    command: 'npm',
    args: ['run', script],
  };
}

function stopProcessTree(child) {
  if (!child.pid || child.killed) return;

  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  finalExitCode = exitCode;

  for (const child of children) stopProcessTree(child);
  setTimeout(() => process.exit(finalExitCode), 750);
}

function start(script, label) {
  const invocation = resolveNpmRunInvocation(script);
  const child = spawn(invocation.command, invocation.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });

  children.add(child);
  child.once('error', error => {
    children.delete(child);
    console.error(`[WP Dev Pair] Failed to start ${label}: ${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 0}`;
    console.error(`[WP Dev Pair] ${label} stopped (${reason}); stopping the other server.`);
    shutdown(code && code !== 0 ? code : 1);
  });
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  const entryPath = resolve(process.argv[1]);
  return process.platform === 'win32'
    ? entryPath.toLowerCase() === scriptPath.toLowerCase()
    : entryPath === scriptPath;
}

export function main() {
  process.once('SIGINT', () => shutdown(0));
  process.once('SIGTERM', () => shutdown(0));

  console.log('[WP Dev Pair] Main:  http://localhost:5173/index_pro.html');
  console.log('[WP Dev Pair] Site2: http://localhost:5174/index_site2.html');
  start('start:local', 'main server');
  start('start:site2', 'site2 server');
}

if (isDirectRun()) main();
