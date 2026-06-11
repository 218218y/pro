import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Shared release helpers / optional deps for the canonical release packager.

export function pickCjsDefault(mod) {
  // When importing a CJS package via ESM, Node may expose it under `default`.
  return mod && mod.default ? mod.default : mod;
}

export let terser = null;
try {
  // Optional dependency. If missing, release still works (just without minification).
  const mod = await import('terser');
  terser = pickCjsDefault(mod);
} catch (_) {}

export let htmlMinifier = null;
try {
  const mod = await import('html-minifier-terser');
  htmlMinifier = pickCjsDefault(mod);
} catch (_) {}

export let CleanCSS = null;
try {
  const mod = await import('clean-css');
  CleanCSS = pickCjsDefault(mod);
} catch (_) {}

export let JavaScriptObfuscator = null;
try {
  const mod = await import('javascript-obfuscator');
  JavaScriptObfuscator = pickCjsDefault(mod);
} catch (_) {}

export async function loadJavaScriptObfuscator() {
  // Supports both CommonJS and ESM builds of javascript-obfuscator.
  if (JavaScriptObfuscator && typeof JavaScriptObfuscator.obfuscate === 'function')
    return JavaScriptObfuscator;

  try {
    const mod = await import('javascript-obfuscator');
    const pick = pickCjsDefault(mod);
    if (pick && typeof pick.obfuscate === 'function') return pick;
  } catch (_) {}

  return null;
}

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function mtimeMsSafe(p) {
  try {
    return fs.statSync(p).mtimeMs || 0;
  } catch {
    return 0;
  }
}

export function newestMtimeUnder(rootDir, opts = {}) {
  const { excludeDirs = [] } = opts;
  if (!rootDir || !exists(rootDir)) return 0;

  let newest = 0;
  const stack = [rootDir];

  while (stack.length) {
    const dir = stack.pop();
    let entries = null;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const pAbs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (excludeDirs.includes(ent.name)) continue;
        stack.push(pAbs);
        continue;
      }
      if (!ent.isFile()) continue;
      const t = mtimeMsSafe(pAbs);
      if (t > newest) newest = t;
    }
  }

  return newest;
}

export function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function rmrf(p) {
  if (!exists(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

export function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = num;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function fileSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

export function logSize(label, p) {
  const s = fileSize(p);
  if (s) console.log(`[WP Release] ${label}: ${formatBytes(s)} (${p})`);
}

export function copyFile(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

export function copyDir(srcDir, dstDir, opts = {}) {
  const { exclude = [] } = opts;
  mkdirp(dstDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const dst = path.join(dstDir, ent.name);
    if (exclude.includes(ent.name)) continue;
    if (ent.isDirectory()) copyDir(src, dst, opts);
    else if (ent.isFile()) copyFile(src, dst);
  }
}

export function copyDirContents(srcDir, dstDir, opts = {}) {
  // Copies the *contents* of srcDir into dstDir (without nesting srcDir itself).
  const { exclude = [] } = opts;
  mkdirp(dstDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (exclude.includes(ent.name)) continue;
    const src = path.join(srcDir, ent.name);
    const dst = path.join(dstDir, ent.name);
    if (ent.isDirectory()) copyDir(src, dst, opts);
    else if (ent.isFile()) copyFile(src, dst);
  }
}

export function sha256File(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

export function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function insertHashBeforeExt(fileName, hashHex) {
  const ext = path.extname(fileName);
  const base = ext ? fileName.slice(0, -ext.length) : fileName;
  return `${base}.${hashHex}${ext || ''}`;
}

export function shortHashOfFile(pAbs, len = 8) {
  return sha256File(pAbs).slice(0, Math.max(6, Math.min(32, Number(len) || 8)));
}

export function isWardrobeChunkFileName(fileName) {
  return /^wardrobepro\d*\.chunk-.*\.js$/i.test(String(fileName || ''));
}

export function listReleaseChunkRelFiles(releaseDirAbs) {
  if (!exists(releaseDirAbs)) return [];
  return fs
    .readdirSync(releaseDirAbs)
    .filter(f => isWardrobeChunkFileName(f))
    .sort();
}

export function listReleaseCssRelFiles(releaseDirAbs) {
  if (!exists(releaseDirAbs)) return [];
  return fs
    .readdirSync(releaseDirAbs)
    .filter(f => f.toLowerCase().endsWith('.css'))
    .sort();
}

export function rewriteSourcemapCommentInPlace(jsAbs, mapFileName) {
  const reSm = /\n?\/\/# sourceMappingURL=.*?\s*$/m;
  let code = fs.readFileSync(jsAbs, 'utf8');
  if (!mapFileName) {
    code = code.replace(reSm, '\n');
    fs.writeFileSync(jsAbs, code, 'utf8');
    return;
  }
  if (reSm.test(code)) code = code.replace(reSm, `\n//# sourceMappingURL=${mapFileName}\n`);
  else
    code = code.endsWith('\n')
      ? `${code}//# sourceMappingURL=${mapFileName}\n`
      : `${code}\n//# sourceMappingURL=${mapFileName}\n`;
  fs.writeFileSync(jsAbs, code, 'utf8');
}
