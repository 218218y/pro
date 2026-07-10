import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocalTypeScriptBin, resolveTypeScriptTool } from './wp_typescript_resolver.js';

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

export function resolveTscBin(root, { platform = process.platform } = {}) {
  return resolveLocalTypeScriptBin(root, { existsImpl: exists, platform });
}

export function resolveTscInvocation(
  root,
  { env = process.env, spawnImpl, platform = process.platform } = {}
) {
  const tool = resolveTypeScriptTool(root, { env, spawnImpl, existsImpl: exists, platform });
  if (!tool) return null;
  if (tool.kind === 'blocked') {
    return {
      blocked: true,
      source: tool.source,
      errorMessage: tool.errorMessage,
      warning: null,
    };
  }
  return {
    kind: tool.kind,
    cmd: tool.command,
    args: [...tool.argsPrefix],
    source: tool.source,
    warning: tool.warning,
  };
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
