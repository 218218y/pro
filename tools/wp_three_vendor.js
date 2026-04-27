#!/usr/bin/env node
/**
 * WardrobePro - Three.js Vendor Bundle Builder
 *
 * Produces a SINGLE-file ESM bundle that contains:
 *   - A tree-shaken subset of Three.js (imported from node_modules/three/src/**)
 *   - Patched OrbitControls + RoundedBoxGeometry (so they DON'T import the full build)
 *
 * Output default:
 *   dist/libs/three.vendor.js (+ map when enabled)
 *
 * Usage:
 *   node tools/wp_three_vendor.js
 *   node tools/wp_three_vendor.js --out dist/release/libs/three.vendor.js
 *   node tools/wp_three_vendor.js --no-minify
 *   node tools/wp_three_vendor.js --sourcemap
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function normalizeSourcemapComment(code, mapFileName) {
  const reSm = /\n?\/\/\# sourceMappingURL=.*?\s*$/m;
  if (!mapFileName) return code.replace(reSm, '\n');
  if (reSm.test(code)) return code.replace(reSm, `\n//# sourceMappingURL=${mapFileName}\n`);
  return code.endsWith('\n')
    ? `${code}//# sourceMappingURL=${mapFileName}\n`
    : `${code}\n//# sourceMappingURL=${mapFileName}\n`;
}

async function loadViteBuild() {
  try {
    const mod = await import('vite');
    if (mod && typeof mod.build === 'function') return mod.build;
  } catch (e) {
    console.error('[WP Three Vendor] Missing dependency: vite');
    console.error('                 Run: npm i -D vite');
    console.error('                 Details:', String(e && e.message ? e.message : e));
  }
  return null;
}

function parseArgs(argv) {
  const out = {
    outFile: path.join('dist', 'libs', 'three.vendor.js'),
    sourcemap: false,
    minify: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--out' && argv[i + 1]) {
      out.outFile = argv[++i];
      continue;
    }

    if (a === '--sourcemap') out.sourcemap = true;
    if (a === '--no-sourcemap') out.sourcemap = false;

    if (a === '--minify') out.minify = true;
    if (a === '--no-minify') out.minify = false;

    if (a === '--debug') {
      out.sourcemap = true;
      out.minify = false;
    }

    if (a === '-h' || a === '--help') {
      console.log(
        `
WardrobePro - Three.js Vendor Bundle Builder

Options:
  --out <path>        Output file (default: dist/libs/three.vendor.js)
  --minify            Minify output (default)
  --no-minify         Disable minification
  --sourcemap         Write sourcemap
  --no-sourcemap      Disable sourcemap (default)
  --debug             Alias for: --no-minify --sourcemap
`.trim()
      );
      process.exit(0);
    }
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const root = path.resolve(__dirname, '..');
  const entryAbs = path.join(root, 'tools', 'three_vendor_entry.js');
  if (!exists(entryAbs)) {
    throw new Error(`[WP Three Vendor] Missing entry: ${path.relative(root, entryAbs)}`);
  }

  const outFileAbs = path.isAbsolute(args.outFile) ? args.outFile : path.join(root, args.outFile);
  const outDirAbs = path.dirname(outFileAbs);
  mkdirp(outDirAbs);

  // IMPORTANT:
  // Don't build into the output folder itself.
  // When output is dist/release/libs, a temporary folder inside it will leak into the release.
  // Instead, use OS temp.
  const tmpDirAbs = path.join(
    os.tmpdir(),
    `wp_three_vendor_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
  rmrf(tmpDirAbs);
  mkdirp(tmpDirAbs);

  const viteBuild = await loadViteBuild();
  if (!viteBuild) process.exit(1);

  console.log('[WP Three Vendor] Building vendor bundle...');
  await viteBuild({
    root,
    logLevel: 'error',
    configFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      emptyOutDir: true,
      outDir: tmpDirAbs,
      sourcemap: args.sourcemap,
      minify: args.minify ? 'oxc' : false,
      cssMinify: args.minify ? 'lightningcss' : false,
      copyPublicDir: false,
      reportCompressedSize: false,
      target: 'esnext',
      lib: {
        entry: entryAbs,
        formats: ['es'],
        name: 'ThreeVendor',
        fileName: 'three.vendor',
      },
      rolldownOptions: {
        treeshake: {
          // Be more aggressive. Three.js source modules are mostly side-effect free.
          // This helps a lot when we import from `three/src/**`.
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
        output: {
          codeSplitting: false,
        },
      },
    },
  });

  const jsCandidates = fs
    .readdirSync(tmpDirAbs)
    .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'))
    .sort();

  if (!jsCandidates.length) {
    rmrf(tmpDirAbs);
    throw new Error('[WP Three Vendor] Vite build completed but produced no .js output.');
  }

  const builtJsAbs = path.join(tmpDirAbs, jsCandidates[0]);
  const builtMapAbs = `${builtJsAbs}.map`;

  let code = fs.readFileSync(builtJsAbs, 'utf8');

  if (args.sourcemap && exists(builtMapAbs)) {
    const mapFileName = `${path.basename(outFileAbs)}.map`;
    code = normalizeSourcemapComment(code, mapFileName);
  } else {
    code = normalizeSourcemapComment(code, null);
  }

  fs.writeFileSync(outFileAbs, code.endsWith('\n') ? code : `${code}\n`, 'utf8');

  if (args.sourcemap && exists(builtMapAbs)) {
    fs.copyFileSync(builtMapAbs, `${outFileAbs}.map`);
  } else {
    const outMapAbs = `${outFileAbs}.map`;
    if (exists(outMapAbs)) fs.unlinkSync(outMapAbs);
  }

  rmrf(tmpDirAbs);

  console.log('[WP Three Vendor] Done:', path.relative(root, outFileAbs));
  if (args.sourcemap && exists(`${outFileAbs}.map`)) {
    console.log('[WP Three Vendor] Sourcemap:', path.relative(root, `${outFileAbs}.map`));
  }
}

main().catch(err => {
  console.error('[WP Three Vendor] Failed:', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
