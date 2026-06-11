import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveProjectRoot(importMetaUrl = import.meta.url) {
  const filename = fileURLToPath(importMetaUrl);
  return path.resolve(path.dirname(filename), '..');
}

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

export function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function resolveTscBin(root) {
  const p1 = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  if (exists(p1)) return p1;
  const p2 = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  if (exists(p2)) return p2;
  return null;
}

export function resolveTscInvocation(root) {
  const localBin = resolveTscBin(root);
  if (localBin) {
    return {
      cmd: process.execPath,
      args: [localBin],
      source: 'local-node-modules',
    };
  }

  try {
    const probe = spawnSync('tsc', ['--version'], { stdio: 'ignore' });
    if (probe && probe.status === 0) {
      return {
        cmd: 'tsc',
        args: [],
        source: 'system-path',
      };
    }
  } catch {
    // ignore and fall through to null
  }

  return null;
}

export function copyFile(srcAbs, dstAbs) {
  mkdirp(path.dirname(dstAbs));
  fs.copyFileSync(srcAbs, dstAbs);
}

export function copyDir(srcAbs, dstAbs) {
  if (!exists(srcAbs)) return;
  mkdirp(dstAbs);

  if (typeof fs.cpSync === 'function') {
    fs.cpSync(srcAbs, dstAbs, { recursive: true });
    return;
  }

  const entries = fs.readdirSync(srcAbs, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcAbs, e.name);
    const d = path.join(dstAbs, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) copyFile(s, d);
  }
}

export function copyDirContents(srcAbs, dstAbs) {
  if (!exists(srcAbs)) return;
  mkdirp(dstAbs);

  const entries = fs.readdirSync(srcAbs, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcAbs, e.name);
    const d = path.join(dstAbs, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) copyFile(s, d);
  }
}
