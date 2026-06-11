import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  terser,
  htmlMinifier,
  CleanCSS,
  JavaScriptObfuscator,
  loadJavaScriptObfuscator,
  exists,
  mtimeMsSafe,
  newestMtimeUnder,
  rmrf,
  copyFile,
  copyDir,
  copyDirContents,
  isWardrobeChunkFileName,
  escapeRegExp,
} from './wp_release_shared.js';

// Build/minify/obfuscation ownership for release packaging.

export function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

export function buildThreeVendor({ root, outFileAbs, minify, sourcemap }) {
  const args = [path.join('tools', 'wp_three_vendor.js'), '--out', outFileAbs];
  if (minify === false) args.push('--no-minify');
  else args.push('--minify');
  if (sourcemap) args.push('--sourcemap');
  else args.push('--no-sourcemap');
  run('node', args, root);
}

export function buildAppBundle({ root, outFileAbs, minify, sourcemap, buildMode = 'client' }) {
  const args = [path.join('tools', 'wp_bundle.js'), '--out', outFileAbs, '--build-mode', buildMode];
  if (minify === false) args.push('--no-minify');
  else args.push('--minify');
  if (sourcemap) args.push('--sourcemap');
  else args.push('--no-sourcemap');
  run('node', args, root);
}

export function buildReleaseHtml(root, templateAbs) {
  if (templateAbs && exists(templateAbs)) {
    return fs.readFileSync(templateAbs, 'utf8');
  }
  // Prefer a dedicated release HTML template kept under tools/.
  // This keeps release output lean: no fallback loader and no multi-file JS loading.
  const tplPreferred = path.join(root, 'tools', 'index_release_bundle.html');
  const tplFallback = path.join(root, 'tools', 'index_release.html');

  const pick = exists(tplPreferred) ? tplPreferred : tplFallback;
  if (!exists(pick)) {
    throw new Error(
      '[WP Release] Missing release HTML template. Expected tools/index_release_bundle.html or tools/index_release.html'
    );
  }
  return fs.readFileSync(pick, 'utf8');
}

export function resolveSafeUnderRoot(rootAbs, relOrAbsPath, label) {
  const root = path.resolve(rootAbs);
  const pAbs = path.isAbsolute(relOrAbsPath)
    ? path.resolve(relOrAbsPath)
    : path.resolve(rootAbs, String(relOrAbsPath || ''));

  // Prevent "../../" escapes.
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!(pAbs === root || pAbs.startsWith(rootWithSep))) {
    throw new Error(`[WP Release] Unsafe ${label || 'path'} (must be under repo root): ${relOrAbsPath}`);
  }
  return pAbs;
}

export function ensureDistBundleCurrent({
  root,
  distDir,
  bundlePath,
  bundleMapPath,
  distKeepSourceMap,
  buildMode = 'client',
}) {
  const bundleMtime = mtimeMsSafe(bundlePath);
  const newestSrc = Math.max(
    newestMtimeUnder(path.join(root, 'esm'), { excludeDirs: ['node_modules', 'dist', 'dist_vite'] }),
    newestMtimeUnder(path.join(root, 'types'), { excludeDirs: ['node_modules', 'dist', 'dist_vite'] }),
    mtimeMsSafe(path.join(root, 'tsconfig.dist.json'))
  );
  const newestDistModules = Math.max(
    newestMtimeUnder(path.join(distDir, 'esm')),
    newestMtimeUnder(path.join(distDir, 'types'))
  );
  const newestInput = Math.max(newestSrc, newestDistModules);
  const STALE_TOLERANCE_MS = 5;

  const bundleModePath = `${bundlePath}.buildmode.txt`;
  const bundleMode = exists(bundleModePath) ? fs.readFileSync(bundleModePath, 'utf8').trim() : '';

  let needBundle = !exists(bundlePath);
  let needReason = needBundle ? 'missing' : null;

  if (!needBundle && bundleMode !== buildMode) {
    needBundle = true;
    needReason = 'mode_mismatch';
  }

  if (!needBundle && distKeepSourceMap && !exists(bundleMapPath)) {
    needBundle = true;
    needReason = 'missing_sourcemap';
  }

  if (!needBundle && newestInput && bundleMtime && bundleMtime + STALE_TOLERANCE_MS < newestInput) {
    needBundle = true;
    needReason = 'stale';
  }

  if (!needBundle) return { bundled: false, reason: null };

  const msg =
    needReason === 'missing'
      ? 'Bundle missing. Running debug bundle...'
      : needReason === 'missing_sourcemap'
        ? 'Bundle sourcemap missing (needed for dist debug). Re-running debug bundle...'
        : needReason === 'mode_mismatch'
          ? `Bundle build mode mismatch (${bundleMode || 'unknown'} -> ${buildMode}). Re-running bundle...`
          : 'Bundle is stale vs sources/dist modules. Re-running debug bundle...';
  console.log('[WP Release] ' + msg);

  const bundleArgs = [path.join('tools', 'wp_bundle.js')];
  try {
    const outRel = path.relative(root, bundlePath);
    if (outRel) bundleArgs.push('--out', outRel);
  } catch {
    // ignore
  }
  bundleArgs.push('--build-mode', buildMode);
  if (!distKeepSourceMap) bundleArgs.push('--no-sourcemap');
  run('node', bundleArgs, root);

  if (!exists(bundlePath)) throw new Error('[WP Release] Dist bundle still missing after bundling.');
  return { bundled: true, reason: needReason };
}

export function prepareDistSite({ root, distDir, htmlTemplate }) {
  // Creates a debug-friendly site in dist/:
  //   dist/index.html
  //   dist/pro_styles.css (+ any css assets copied to root)
  //   dist/libs/**
  //   dist/wardrobepro.bundle.js (+ .map if available)
  //
  // This keeps TWO versions:
  //   - dist/ (debug, readable-ish + sourcemaps)
  //   - dist/release/ (production, minified + optionally obfuscated)
  try {
    // Clean previous dist site files (but keep dist/release/)
    const distIndex = path.join(distDir, 'index.html');
    if (exists(distIndex)) fs.unlinkSync(distIndex);

    // Old layout cleanup
    rmrf(path.join(distDir, 'css'));
    const distCssFile = path.join(distDir, 'pro_styles.css');
    if (exists(distCssFile)) fs.unlinkSync(distCssFile);

    rmrf(path.join(distDir, 'libs'));

    // Copy CSS contents into dist root (user preference: no dist/css folder)
    const cssSrc = path.join(root, 'css');
    if (exists(cssSrc)) copyDirContents(cssSrc, distDir, { exclude: ['logo.png'] });

    // Copy libs
    const libsSrc = path.join(root, 'libs');
    const distLibsDir = path.join(distDir, 'libs');
    if (exists(libsSrc)) copyDir(libsSrc, distLibsDir);

    // Debug dist/index.html loads ./libs/three.vendor.js (unhashed), while release/index.html
    // gets a hashed vendor file built later into dist/release/libs. Build the dist vendor too,
    // otherwise the dist debug site boots a bundle that references a file that does not exist.
    const distVendorOutAbs = path.join(distLibsDir, 'three.vendor.js');
    console.log('[WP Release] Building Three vendor bundle for dist debug site...');
    buildThreeVendor({
      root,
      outFileAbs: distVendorOutAbs,
      minify: false,
      sourcemap: false,
    });

    // Copy root assets referenced by HTML (e.g., logo.png) if present
    const logoSrc = path.join(root, 'logo.png');
    if (exists(logoSrc)) copyFile(logoSrc, path.join(distDir, 'logo.png'));

    // Copy embedded logo data (offline-safe; used by wp_logo_data.js)
    const logoDataSrc = path.join(root, 'wp_logo_data.js');
    if (exists(logoDataSrc)) copyFile(logoDataSrc, path.join(distDir, 'wp_logo_data.js'));

    // Copy Vite-style public assets (served from site root)
    const publicSrc = path.join(root, 'public');
    if (exists(publicSrc)) copyDirContents(publicSrc, distDir);
    // Supabase client config (optional)
    const supaCfgMjs = path.join(root, 'wp_runtime_config.mjs');
    if (exists(supaCfgMjs)) copyFile(supaCfgMjs, path.join(distDir, 'wp_runtime_config.mjs'));

    // Use a dedicated release HTML template that loads the local libs + single bundle.
    const html = htmlTemplate || buildReleaseHtml(root, null);
    fs.writeFileSync(distIndex, html, 'utf8');

    console.log('[WP Release] Dist debug site ready:', distDir);
  } catch (e) {
    console.warn('[WP Release] Could not prepare dist debug site:', String(e && e.message ? e.message : e));
  }
}

export async function maybeMinifyBundle({
  inJsPath,
  inMapPath,
  outJsPath,
  outMapPath,
  wantMinify,
  keepSourceMap,
}) {
  const stripSourceMapComment = code => code.replace(/\n?\/\/# sourceMappingURL=.*?\s*$/m, '\n');

  if (!wantMinify) {
    let code = fs.readFileSync(inJsPath, 'utf8');
    if (!keepSourceMap) code = stripSourceMapComment(code);
    fs.writeFileSync(outJsPath, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
    if (keepSourceMap && exists(inMapPath)) copyFile(inMapPath, outMapPath);
    return { minified: false };
  }

  if (!terser || typeof terser.minify !== 'function') {
    console.warn('[WP Release] Minification requested, but dependency "terser" is missing.');
    console.warn('             Run: npm i -D terser');
    let code = fs.readFileSync(inJsPath, 'utf8');
    if (!keepSourceMap) code = stripSourceMapComment(code);
    fs.writeFileSync(outJsPath, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
    if (keepSourceMap && exists(inMapPath)) copyFile(inMapPath, outMapPath);
    return { minified: false, reason: 'missing_terser' };
  }

  const code = fs.readFileSync(inJsPath, 'utf8');
  const inputMap = keepSourceMap && exists(inMapPath) ? JSON.parse(fs.readFileSync(inMapPath, 'utf8')) : null;

  const result = await terser.minify(code, {
    compress: true,
    mangle: true,
    format: { comments: false },
    sourceMap: keepSourceMap
      ? {
          content: inputMap || undefined,
          filename: path.basename(outJsPath),
          url: path.basename(outMapPath),
        }
      : false,
  });

  if (!result || typeof result.code !== 'string') {
    console.warn('[WP Release] Terser returned an unexpected result; falling back to non-minified bundle.');
    let fallback = fs.readFileSync(inJsPath, 'utf8');
    if (!keepSourceMap) fallback = stripSourceMapComment(fallback);
    fs.writeFileSync(outJsPath, fallback.endsWith('\n') ? fallback : `${fallback}\n`, 'utf8');
    if (keepSourceMap && exists(inMapPath)) copyFile(inMapPath, outMapPath);
    return { minified: false, reason: 'terser_failed' };
  }

  fs.writeFileSync(outJsPath, result.code + '\n', 'utf8');
  if (keepSourceMap && typeof result.map === 'string') fs.writeFileSync(outMapPath, result.map, 'utf8');
  return { minified: true };
}

export async function maybeMinifyHtml({ html, wantMinify }) {
  if (!wantMinify) return { html, minified: false };

  const minifyFn = htmlMinifier && typeof htmlMinifier.minify === 'function' ? htmlMinifier.minify : null;
  if (!minifyFn) {
    console.warn(
      '[WP Release] HTML minification requested, but dependency "html-minifier-terser" is missing.'
    );
    console.warn('             Run: npm i -D html-minifier-terser');
    return { html, minified: false, reason: 'missing_html_minifier' };
  }

  try {
    const out = await minifyFn(html, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      sortAttributes: true,
      sortClassName: true,
      keepClosingSlash: true,
      minifyCSS: true,
      minifyJS: true,
    });
    return { html: out, minified: true };
  } catch (e) {
    console.warn('[WP Release] HTML minifier failed; keeping non-minified HTML.');
    console.warn(String(e && e.message ? e.message : e));
    return { html, minified: false, reason: 'html_minify_failed' };
  }
}

export function maybeMinifyCssDir({ cssDir, wantMinify }) {
  if (!wantMinify) return { minified: false };

  if (!CleanCSS || typeof CleanCSS !== 'function') {
    console.warn('[WP Release] CSS minification requested, but dependency "clean-css" is missing.');
    console.warn('             Run: npm i -D clean-css');
    return { minified: false, reason: 'missing_clean_css' };
  }

  function collectCssFiles(dir, out) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) collectCssFiles(p, out);
      else if (
        ent.isFile() &&
        ent.name.endsWith('.css') &&
        !ent.name.endsWith('.min.css') &&
        // Don't touch vendor CSS inside libs/ if you ever add it there.
        !p.includes(path.sep + 'libs' + path.sep)
      ) {
        out.push(p);
      }
    }
  }

  const files = [];
  collectCssFiles(cssDir, files);

  const cleaner = new CleanCSS({ level: 2 });
  let changed = 0;

  for (const f of files) {
    const input = fs.readFileSync(f, 'utf8');
    const out = cleaner.minify(input);
    if (out && typeof out.styles === 'string' && out.styles.length > 0) {
      fs.writeFileSync(f, out.styles + '\n', 'utf8');
      changed++;
    } else if (out && out.errors && out.errors.length) {
      console.warn('[WP Release] clean-css reported errors for:', f);
      for (const err of out.errors) console.warn('  -', err);
    }
  }

  return { minified: changed > 0, files: changed };
}

export async function maybeObfuscateJs({ inJsPath, outJsPath, wantObfuscate, mode, keepSourceMap }) {
  if (!wantObfuscate) return { obfuscated: false };

  let obfuscator = JavaScriptObfuscator;
  if (!obfuscator || typeof obfuscator.obfuscate !== 'function')
    obfuscator = await loadJavaScriptObfuscator();

  if (!obfuscator || typeof obfuscator.obfuscate !== 'function') {
    console.warn('[WP Release] Obfuscation requested, but dependency "javascript-obfuscator" is missing.');
    console.warn('             Run: npm i -D javascript-obfuscator');
    copyFile(inJsPath, outJsPath);
    return { obfuscated: false, reason: 'missing_obfuscator' };
  }

  // IMPORTANT:
  // Obfuscation is a deterrent, not security. Anyone can still debug a client-side app.
  // Also: aggressive options can break apps and slow them down. So defaults are conservative.
  const baseOptions = {
    compact: true,
    simplify: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    renameProperties: false,
    selfDefending: false,
    numbersToExpressions: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    // Keep chunk file names in plain text so our content-hash rewriter can update them reliably.
    // We allow string arrays, but we MUST avoid base64/rc4 encoding, otherwise dynamic import strings become opaque.
    stringArray: true,
    stringArrayRotate: true,
    stringArrayThreshold: 0.15,
    stringArrayEncoding: ['none'],
  };

  const strongOptions = {
    ...baseOptions,
    // These increase resistance, but can slow things down and risk bugs.
    // Keep thresholds moderate: this project has heavy 3D/export code and we prefer stability/perf.
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.08,
    stringArrayThreshold: 0.35,
  };

  const liteOptions = {
    ...baseOptions,
    // Small + fast. Focus on name mangling; avoid string arrays (they can inflate size).
    stringArray: false,
    stringArrayRotate: false,
    stringArrayThreshold: 0,
  };

  const options = mode === 'strong' ? strongOptions : mode === 'lite' ? liteOptions : baseOptions;

  // Source maps + obfuscation is possible, but it weakens the deterrence.
  // We'll only generate a map when --debug is set.
  if (keepSourceMap) {
    options.sourceMap = true;
    options.sourceMapMode = 'separate';
    options.sourceMapFileName = path.basename(outJsPath) + '.map';
  }

  const code = fs.readFileSync(inJsPath, 'utf8');
  const result = obfuscator.obfuscate(code, options);

  fs.writeFileSync(outJsPath, result.getObfuscatedCode() + '\n', 'utf8');
  if (keepSourceMap) {
    const mapPath = outJsPath + '.map';
    fs.writeFileSync(mapPath, result.getSourceMap(), 'utf8');
  }

  return { obfuscated: true, mode };
}

export function normalizeObfuscateMode(mode) {
  return mode === 'lite' || mode === 'strong' || mode === 'balanced' ? mode : 'balanced';
}

export function resolveReleaseJsObfuscationPolicy({ filePath, requestedMode, wantObfuscate }) {
  const modeRequested = normalizeObfuscateMode(requestedMode);
  if (!wantObfuscate) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'disabled' };
  }

  const name = path.basename(String(filePath || '')).toLowerCase();
  const isWpChunk = isWardrobeChunkFileName(name);
  const isWpChunkWithBase = base =>
    new RegExp(`^wardrobepro\\d*\\.chunk-${escapeRegExp(String(base || ''))}(?:\\.|$)`, 'i').test(name);

  const modeSensitive =
    modeRequested === 'lite' ? 'lite' : modeRequested === 'strong' ? 'strong' : 'balanced';

  // Never obfuscate vendor chunks: large size, low IP value, and highest risk of breakage/regressions.
  if (name === 'three.vendor.js')
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:three_vendor' };
  if (isWpChunkWithBase('vendor')) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:vendor_chunk' };
  }
  if (isWpChunkWithBase('pdf')) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:pdf_vendor_chunk' };
  }

  // React PDF editor chunk is very large and UI-heavy; keep it un-obfuscated for responsiveness/debuggability.
  if (isWpChunkWithBase('pdf_ui')) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:pdf_ui_chunk' };
  }

  // Rolldown manual code splitting may emit a dedicated runtime chunk.
  // Keep it unobfuscated for maximum startup safety.
  if (isWpChunkWithBase('runtime') || isWpChunkWithBase('rolldown-runtime')) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:runtime_chunk' };
  }

  // Main entry bundle is the highest-risk startup path and now contains more eager
  // React/UI boot code after the Vite 8/Rolldown chunk reductions. Keep it minified
  // and hashed, but do not run javascript-obfuscator on it: that tradeoff preserves
  // startup stability while still allowing stronger protection on truly on-demand features.
  if (name === 'wardrobepro.bundle.js') {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:entry_bundle_startup_safety' };
  }

  // Core/runtime-adjacent chunks participate in startup or hold shared live bindings.
  // Prefer stability here as well; the initial execution graph is not a good obfuscation target.
  if (isWpChunkWithBase('core')) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:core_chunk_startup_safety' };
  }
  if (
    isWpChunkWithBase('boot_main') ||
    isWpChunkWithBase('feedback') ||
    isWpChunkWithBase('modes') ||
    isWpChunkWithBase('notes_export') ||
    isWpChunkWithBase('primary_mode') ||
    isWpChunkWithBase('project_io') ||
    isWpChunkWithBase('boot_sequence') ||
    isWpChunkWithBase('boot_react_ui')
  ) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:startup_chunk' };
  }

  // Only obfuscate an explicit allow-list of truly on-demand feature chunks.
  //
  // Why so strict? Under Rolldown/Vite 8, shared chunks can be re-shaped as the graph changes
  // (for example after reducing facade chunks or moving modules from lazy -> eager). A chunk
  // name that *looks* secondary may still participate in startup through static imports/live
  // bindings. The earlier default-obfuscate policy was too optimistic and could break boot only
  // in release builds.
  //
  // Professional tradeoff:
  // - Keep minification/hashing on every asset.
  // - Apply javascript-obfuscator only to chunks we know are optional user-triggered features.
  // - Skip everything else unless we later prove it is startup-safe.
  if (
    isWpChunkWithBase('export_canvas') ||
    isWpChunkWithBase('export_ui') ||
    isWpChunkWithBase('settings_backup')
  ) {
    return { wantObfuscate: true, mode: modeSensitive, reason: 'allowlist:on_demand_feature' };
  }

  if (isWpChunk) {
    return { wantObfuscate: false, mode: modeRequested, reason: 'skip:non_allowlisted_chunk_startup_safety' };
  }

  // Fallback for any other release JS we may obfuscate in the future.
  // Keep startup-adjacent safety by default; opt-in later per file when proven safe.
  return { wantObfuscate: false, mode: modeRequested, reason: 'skip:fallback_startup_safety' };
}

export async function maybeObfuscateReleaseJs({
  inJsPath,
  outJsPath,
  wantObfuscate,
  requestedMode,
  keepSourceMap,
}) {
  const policy = resolveReleaseJsObfuscationPolicy({
    filePath: outJsPath || inJsPath,
    requestedMode,
    wantObfuscate,
  });

  if (wantObfuscate) {
    const base = path.basename(outJsPath || inJsPath || '');
    const action = policy.wantObfuscate ? `obfuscate:${policy.mode}` : 'skip';
    console.log(`[WP Release] Obfuscation policy ${base}: ${action} (${policy.reason})`);
  }

  const info = await maybeObfuscateJs({
    inJsPath,
    outJsPath,
    wantObfuscate: policy.wantObfuscate,
    mode: policy.mode,
    keepSourceMap,
  });

  return { ...info, policy };
}
