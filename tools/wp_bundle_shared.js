import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const BUNDLE_CODE_SPLITTING_GROUPS = [
  {
    name: 'pdf',
    test: /[\\/]node_modules[\\/](?:pdfjs-dist|pdf-lib|@pdf-lib|fontkit)[\\/]/,
    priority: 70,
  },
  {
    name: 'vendor',
    test: /[\\/]node_modules[\\/]/,
    priority: 60,
  },
  {
    name: 'pdf_overlay_shared',
    test: /[\/]dist[\/]esm[\/]native[\/](?:services[\/]api\.js|ui[\/]dom_helpers\.js|ui[\/]react[\/](?:actions[\/].*|hooks\.js|export_actions\.js))/,
    priority: 55,
  },
];

export const DIST_BUILD_INFO_REL = path.join('dist', '.tsconfig.dist.tsbuildinfo');
export const DIST_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.d.ts']);

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function rmrf(p) {
  for (let i = 0; i < 6; i++) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      return;
    } catch {
      if (i === 5) return;
      sleepMs(25 * (i + 1));
    }
  }
}

export function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function copyFile(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

export function copyDir(srcDir, dstDir) {
  mkdirp(dstDir);
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, ent.name);
    const dst = path.join(dstDir, ent.name);
    if (ent.isDirectory()) copyDir(src, dst);
    else if (ent.isFile()) copyFile(src, dst);
  }
}

export function normalizeSourcemapComment(code, mapFileName) {
  const reSm = /\n?\/\/# sourceMappingURL=.*?\s*$/m;
  if (!mapFileName) return code.replace(reSm, '\n');
  if (reSm.test(code)) return code.replace(reSm, `\n//# sourceMappingURL=${mapFileName}\n`);
  return code.endsWith('\n')
    ? `${code}//# sourceMappingURL=${mapFileName}\n`
    : `${code}\n//# sourceMappingURL=${mapFileName}\n`;
}

export async function loadViteBuild() {
  try {
    const mod = await import('vite');
    if (mod && typeof mod.build === 'function') return mod.build;
  } catch (e) {
    console.error('[WP Bundle] Missing dependency: vite');
    console.error('            Run: npm i -D vite');
    console.error('            Details:', String(e && e.message ? e.message : e));
  }
  return null;
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

export function walkFiles(rootDir, visit) {
  if (!exists(rootDir)) return;
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const abs = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(abs, visit);
      continue;
    }
    if (ent.isFile()) visit(abs);
  }
}

export function getLatestMtimeMs(pathsOrDirs, predicate) {
  let latest = 0;
  for (const item of pathsOrDirs) {
    if (!exists(item)) continue;
    const stat = fs.statSync(item);
    if (stat.isDirectory()) {
      walkFiles(item, abs => {
        if (predicate && !predicate(abs)) return;
        const mtimeMs = fs.statSync(abs).mtimeMs;
        if (mtimeMs > latest) latest = mtimeMs;
      });
      continue;
    }
    if (!predicate || predicate(item)) {
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    }
  }
  return latest;
}

export function getOldestMtimeMs(pathsOrDirs, predicate) {
  let oldest = Number.POSITIVE_INFINITY;
  for (const item of pathsOrDirs) {
    if (!exists(item)) continue;
    const stat = fs.statSync(item);
    if (stat.isDirectory()) {
      walkFiles(item, abs => {
        if (predicate && !predicate(abs)) return;
        const mtimeMs = fs.statSync(abs).mtimeMs;
        if (mtimeMs < oldest) oldest = mtimeMs;
      });
      continue;
    }
    if (!predicate || predicate(item)) {
      if (stat.mtimeMs < oldest) oldest = stat.mtimeMs;
    }
  }
  return oldest;
}

export function isDistSourceFile(abs) {
  const base = path.basename(abs);
  if (base.endsWith('.d.ts')) return true;
  return DIST_SOURCE_EXTENSIONS.has(path.extname(abs));
}

export function resolveBuiltEntry(root) {
  const preferred = path.join(root, 'dist', 'esm', 'release_main.js');
  const fallback = path.join(root, 'dist', 'esm', 'main.js');
  const entryAbs = exists(preferred) ? preferred : fallback;
  return { preferred, fallback, entryAbs };
}

export function createBundleTempDir() {
  const tmpDirAbs = path.join(
    os.tmpdir(),
    `wp_tmp_vite_bundle_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
  mkdirp(tmpDirAbs);
  return tmpDirAbs;
}
