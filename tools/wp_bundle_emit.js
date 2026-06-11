import fs from 'node:fs';
import path from 'node:path';
import {
  BUNDLE_CODE_SPLITTING_GROUPS,
  copyDir,
  copyFile,
  createBundleTempDir,
  exists,
  mkdirp,
  normalizeSourcemapComment,
  rmrf,
} from './wp_bundle_shared.js';
import {
  createObservabilityAliasMap,
  createObservabilityBuildDefines,
  normalizeObservabilityBuildMode,
} from './wp_observability_build.js';

export function cleanOldBundleArtifacts(outDirAbs) {
  try {
    if (!exists(outDirAbs)) return;
    for (const ent of fs.readdirSync(outDirAbs, { withFileTypes: true })) {
      if (!ent.isFile()) continue;
      const n = ent.name;
      if (/^wardrobepro\d*\.chunk-.*\.(js|map)$/i.test(n)) {
        rmrf(path.join(outDirAbs, n));
      }
    }
  } catch {
    // ignore
  }
}

export function createBundleBuildConfig({ root, entryAbs, tmpDirAbs, args }) {
  const buildMode = normalizeObservabilityBuildMode(args.buildMode, 'client');
  return {
    root,
    logLevel: 'error',
    configFile: false,
    resolve: {
      alias: createObservabilityAliasMap({ root, buildMode, useDist: true }),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      ...createObservabilityBuildDefines(buildMode),
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
        name: 'WardrobePro',
        fileName: 'wardrobepro.bundle',
      },
      rolldownOptions: {
        preserveEntrySignatures: 'strict',
        output: {
          entryFileNames: 'wardrobepro.bundle.js',
          chunkFileNames: 'wardrobepro.chunk-[name].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          codeSplitting: {
            groups: BUNDLE_CODE_SPLITTING_GROUPS,
          },
          strictExecutionOrder: true,
        },
        treeshake: {
          moduleSideEffects: false,
        },
      },
    },
  };
}

export function writeBundleOutputs({ tmpDirAbs, outFileAbs, outDirAbs, sourcemap, buildMode }) {
  const jsCandidates = fs
    .readdirSync(tmpDirAbs)
    .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'))
    .sort();
  if (!jsCandidates.length) {
    throw new Error('[WP Bundle] Vite build completed but produced no .js output.');
  }

  const preferredEntryAbs = path.join(tmpDirAbs, 'wardrobepro.bundle.js');
  const builtJsAbs = exists(preferredEntryAbs) ? preferredEntryAbs : path.join(tmpDirAbs, jsCandidates[0]);
  const builtMapAbs = `${builtJsAbs}.map`;

  let code = fs.readFileSync(builtJsAbs, 'utf8');
  if (sourcemap && exists(builtMapAbs)) {
    const mapFileName = `${path.basename(outFileAbs)}.map`;
    code = normalizeSourcemapComment(code, mapFileName);
  } else {
    code = normalizeSourcemapComment(code, null);
  }

  fs.writeFileSync(outFileAbs, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
  fs.writeFileSync(
    `${outFileAbs}.buildmode.txt`,
    `${normalizeObservabilityBuildMode(buildMode, 'client')}\n`,
    'utf8'
  );

  if (sourcemap && exists(builtMapAbs)) {
    fs.copyFileSync(builtMapAbs, `${outFileAbs}.map`);
  } else {
    const outMapAbs = `${outFileAbs}.map`;
    if (exists(outMapAbs)) fs.unlinkSync(outMapAbs);
  }

  try {
    const builtJsName = path.basename(builtJsAbs);
    const builtMapName = `${builtJsName}.map`;

    for (const ent of fs.readdirSync(tmpDirAbs, { withFileTypes: true })) {
      if (ent.isFile() && (ent.name === builtJsName || ent.name === builtMapName)) continue;
      const src = path.join(tmpDirAbs, ent.name);
      const dst = path.join(outDirAbs, ent.name);
      if (exists(dst)) rmrf(dst);
      if (ent.isDirectory()) copyDir(src, dst);
      else if (ent.isFile()) copyFile(src, dst);
    }
  } catch (e) {
    console.warn('[WP Bundle] Could not copy extra Vite artifacts:', String(e && e.message ? e.message : e));
  }
}

export async function buildBundleArtifacts({
  root,
  entryAbs,
  outFileAbs,
  outDirAbs,
  legacyTmpDirAbs,
  args,
  viteBuild,
}) {
  mkdirp(outDirAbs);
  cleanOldBundleArtifacts(outDirAbs);
  rmrf(legacyTmpDirAbs);
  const tmpDirAbs = createBundleTempDir();

  try {
    console.log(
      `[WP Bundle] Building ESM bundle (${normalizeObservabilityBuildMode(args.buildMode, 'client')})...`
    );
    await viteBuild(createBundleBuildConfig({ root, entryAbs, tmpDirAbs, args }));
    writeBundleOutputs({
      tmpDirAbs,
      outFileAbs,
      outDirAbs,
      sourcemap: args.sourcemap,
      buildMode: args.buildMode,
    });
  } finally {
    rmrf(tmpDirAbs);
    rmrf(legacyTmpDirAbs);
  }
}
