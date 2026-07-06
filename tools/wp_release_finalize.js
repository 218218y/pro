import fs from 'node:fs';
import path from 'node:path';
import { exists, sha256File, escapeRegExp, listReleaseCssRelFiles } from './wp_release_shared.js';

function buildNoCacheUpdateScript(buildId) {
  const metaNoCache = [
    '<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />',
    '<meta http-equiv="Pragma" content="no-cache" />',
    '<meta http-equiv="Expires" content="0" />',
  ].join('\n    ');

  const updateScript = `
    <script>
      (function(){
        try {
          var BUILD_ID = ${JSON.stringify(buildId)};
          window.__WP_RELEASE_BUILD_ID__ = BUILD_ID;
          window.__WP_ASSET_VERSION__ = BUILD_ID;

          var KEY = '__wp_update_attempt__';
          var ASSET_RECOVERY_KEY = '__wp_asset_recovery_attempt__';
          var BANNER_ID = 'wp-update-banner';
          var RECOVERY_STARTED = false;

          function showBanner(nextId){
            try {
              if (document.getElementById(BANNER_ID)) return;
              var d = document.createElement('div');
              d.id = BANNER_ID;
              d.style.cssText = [
                'position:fixed',
                'left:12px',
                'right:12px',
                'bottom:12px',
                'z-index:999999',
                'background:rgba(0,0,0,.86)',
                'color:#fff',
                'padding:12px 14px',
                'border-radius:14px',
                'font-family:Heebo,Arial,sans-serif',
                'display:flex',
                'gap:12px',
                'align-items:center',
                'justify-content:space-between',
              ].join(';');

              var msg = document.createElement('div');
              msg.style.cssText = 'line-height:1.4; font-size:14px;';
              msg.textContent = 'זוהתה גרסה חדשה. צריך רענון נקי כדי למשוך את קבצי האתר החדשים.';

              var actions = document.createElement('div');
              actions.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap;';

              var btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = 'טען גרסה חדשה';
              btn.style.cssText = 'cursor:pointer; border:0; padding:8px 12px; border-radius:10px; font-weight:800;';
              btn.onclick = function(){ forceReload(nextId || '1', 'manual-banner'); };

              var hint = document.createElement('div');
              hint.style.cssText = 'font-size:12px; opacity:.85;';
              hint.textContent = 'אם זה חוזר: Cloudflare > Caching > Purge Everything';

              actions.appendChild(btn);
              actions.appendChild(hint);
              d.appendChild(msg);
              d.appendChild(actions);
              document.body.appendChild(d);
            } catch(_) {}
          }

          function forceReload(nextId, reason){
            try {
              var u = new URL(location.href);
              u.searchParams.set('v', String(nextId || Date.now()));
              u.searchParams.set('wp_reload', String(reason || 'update'));
              location.replace(u.toString());
            } catch(_) {
              try { location.reload(); } catch(__) {}
            }
          }

          function looksLikeStaleChunkError(err){
            try {
              var text = '';
              if (typeof err === 'string') text = err;
              else if (err && typeof err.message === 'string') text = err.message;
              else if (err && typeof err.reason === 'string') text = err.reason;
              else if (err && err.reason && typeof err.reason.message === 'string') text = err.reason.message;
              else if (err && typeof err.filename === 'string') text = err.filename;
              text = String(text || '');
              return /Failed to fetch dynamically imported module|Importing a module script failed|Expected a JavaScript(?:-or-Wasm)? module script|wardrobepro\.chunk-|ChunkLoadError/i.test(text);
            } catch(_) {
              return false;
            }
          }

          async function deleteBrowserCaches(){
            try {
              if (window.caches && typeof window.caches.keys === 'function') {
                var keys = await window.caches.keys();
                await Promise.all(keys.map(function(k){ return window.caches.delete(k); }));
              }
            } catch(_) {}
          }

          async function readLatestBuildId(){
            try {
              var r = await fetch('./version.json?ts=' + Date.now(), { cache: 'no-store' });
              if (!r || !r.ok) return '';
              var meta = await r.json();
              return meta && meta.cache && meta.cache.buildId ? String(meta.cache.buildId) : '';
            } catch(_) {
              return '';
            }
          }

          async function recoverFromStaleAsset(assetUrl, reason){
            try {
              if (RECOVERY_STARTED) return;
              RECOVERY_STARTED = true;
              var next = await readLatestBuildId();
              var token = String(next || Date.now());
              var marker = [BUILD_ID, token, String(reason || ''), String(assetUrl || '')].join('|');
              try {
                if (sessionStorage.getItem(ASSET_RECOVERY_KEY) === marker) {
                  RECOVERY_STARTED = false;
                  showBanner(token);
                  return;
                }
                sessionStorage.setItem(ASSET_RECOVERY_KEY, marker);
              } catch(_) {}
              await deleteBrowserCaches();
              try { sessionStorage.removeItem(KEY); } catch(_) {}
              forceReload(token, reason || 'stale-asset');
            } catch(_) {
              RECOVERY_STARTED = false;
              forceReload(Date.now(), reason || 'stale-asset-fallback');
            }
          }

          async function recoverFromStaleChunk(reason){
            return recoverFromStaleAsset('', reason || 'stale-chunk');
          }

          async function checkForUpdate(){
            try {
              var next = await readLatestBuildId();
              if (!next || next === BUILD_ID) return;

              var attempted = null;
              try { attempted = sessionStorage.getItem(KEY); } catch(_) {}
              if (attempted === next) {
                showBanner(next);
                return;
              }

              try { sessionStorage.setItem(KEY, next); } catch(_) {}
              await deleteBrowserCaches();
              forceReload(next, 'version-check');
            } catch(_) {}
          }

          function start(){
            try { window.__WP_CHECK_FOR_UPDATE__ = checkForUpdate; } catch(_) {}
            try { window.__WP_RECOVER_FROM_STALE_ASSET__ = recoverFromStaleAsset; } catch(_) {}
            setTimeout(checkForUpdate, 0);
            setTimeout(checkForUpdate, 1500);
            setInterval(function(){
              if (document.visibilityState === 'visible') checkForUpdate();
            }, 3 * 60 * 1000);
            document.addEventListener('visibilitychange', function(){
              if (document.visibilityState === 'visible') checkForUpdate();
            });
            window.addEventListener('unhandledrejection', function(ev){
              if (looksLikeStaleChunkError(ev && (ev.reason || ev))) recoverFromStaleChunk('unhandledrejection');
            });
            window.addEventListener('error', function(ev){
              if (looksLikeStaleChunkError(ev && (ev.error || ev.message || ev.filename))) recoverFromStaleChunk('module-error');
            }, true);
          }

          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
          else start();
        } catch(_) {}
      })();
    </script>
    `;

  return { metaNoCache, updateScript };
}

export function resolveFinalReleaseAssets({
  releaseDir,
  hashAssets,
  hashed,
  keepSourceMap,
  chunkLogicalFiles,
}) {
  const buildId = String((hashed && hashed.buildId) || '').trim() || '0';
  const bundleLogical = 'wardrobepro.bundle.js';
  const bundleRelFinal = hashAssets ? hashed.js[bundleLogical] : bundleLogical;
  const bundleAbsFinal = path.join(releaseDir, bundleRelFinal);
  const bundleMapRelFinal = keepSourceMap && exists(`${bundleAbsFinal}.map`) ? `${bundleRelFinal}.map` : null;

  const chunksFinal = [];
  for (const logical of chunkLogicalFiles || []) {
    const rel = hashAssets ? hashed.js[logical] : logical;
    const abs = path.join(releaseDir, rel);
    if (!exists(abs)) continue;
    chunksFinal.push({
      file: rel,
      sha256: sha256File(abs),
      bytes: fs.statSync(abs).size,
      sourcemap: keepSourceMap && exists(`${abs}.map`) ? `${rel}.map` : null,
    });
  }

  const threeLogical = path.posix.join('libs', 'three.vendor.js');
  const threeRelFinal =
    hashAssets && hashed.three && hashed.three[threeLogical] ? hashed.three[threeLogical] : threeLogical;
  const threeAbsFinal = path.join(releaseDir, threeRelFinal);
  const threeVendorMetaFinal = exists(threeAbsFinal)
    ? {
        file: threeRelFinal,
        sha256: sha256File(threeAbsFinal),
        bytes: fs.statSync(threeAbsFinal).size,
        sourcemap: keepSourceMap && exists(`${threeAbsFinal}.map`) ? `${threeRelFinal}.map` : null,
      }
    : null;

  return {
    buildId,
    bundleRelFinal,
    bundleAbsFinal,
    bundleMapRelFinal,
    chunksFinal,
    threeVendorMetaFinal,
  };
}

export function rewriteReleaseHtml({
  htmlTemplate,
  releaseDir,
  hashAssets,
  hashed,
  bundleRelFinal,
  threeVendorMetaFinal,
  buildId,
}) {
  let html = htmlTemplate;

  if (hashAssets) {
    for (const [from, to] of Object.entries(hashed.css || {})) {
      const baseNoExt = String(from).replace(/\.css$/i, '');
      const re = new RegExp(`${escapeRegExp(baseNoExt)}(?:\\.[a-f0-9]{6,64})?\\.css`, 'gi');
      html = html.replace(re, to);
    }
  }

  if (threeVendorMetaFinal && threeVendorMetaFinal.file) {
    const reVendor = new RegExp(`libs\\/${escapeRegExp('three.vendor')}(?:\\.[a-f0-9]{6,64})?\\.js`, 'gi');
    html = html.replace(reVendor, threeVendorMetaFinal.file.replace(/\\/g, '/'));
  }

  if (bundleRelFinal) {
    const reBundle = new RegExp(`${escapeRegExp('wardrobepro.bundle')}(?:\\.[a-f0-9]{6,64})?\\.js`, 'gi');
    html = html.replace(reBundle, bundleRelFinal);
  }

  html = html
    .replace(/\.\/wp_logo_data\.js(\?[^"']*)?/g, `./wp_logo_data.js?v=${buildId}`)
    .replace(/\.\/wp_runtime_config\.mjs(\?[^"']*)?/g, `./wp_runtime_config.mjs?v=${buildId}`);

  if (!html.includes('__WP_RELEASE_BUILD_ID__')) {
    const { metaNoCache, updateScript } = buildNoCacheUpdateScript(buildId);
    html = html.replace(/<\/head>/i, `    ${metaNoCache}\n${updateScript}\n  </head>`);
  }

  const preloads = [];
  if (threeVendorMetaFinal && threeVendorMetaFinal.file) preloads.push(`./${threeVendorMetaFinal.file}`);
  if (bundleRelFinal) preloads.push(`./${bundleRelFinal}`);
  const coreLogical = 'wardrobepro.chunk-core.js';
  const vendorLogical = 'wardrobepro.chunk-vendor.js';
  const coreFinal = hashAssets && hashed.js && hashed.js[coreLogical] ? hashed.js[coreLogical] : coreLogical;
  const vendorFinal =
    hashAssets && hashed.js && hashed.js[vendorLogical] ? hashed.js[vendorLogical] : vendorLogical;
  if (exists(path.join(releaseDir, coreFinal))) preloads.push(`./${coreFinal}`);
  if (exists(path.join(releaseDir, vendorFinal))) preloads.push(`./${vendorFinal}`);
  if (preloads.length) {
    const tags = preloads.map(href => `<link rel="modulepreload" href="${href}" />`).join('\n    ');
    html = html.replace(/<\/head>/i, `    ${tags}\n  </head>`);
  }

  return html;
}

function toHeaderPath(relFile) {
  const rel = String(relFile || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  return rel ? `/${rel}` : '';
}

function hasFingerprintInName(relFile) {
  const base = path.posix.basename(String(relFile || '').replace(/\\/g, '/'));
  return /(?:^|[.-])[a-f0-9]{6,64}(?=\.)/i.test(base) || /-[a-f0-9]{6,64}(?=\.)/i.test(base);
}

function walkFilesRel(rootDir, dir = rootDir, out = []) {
  if (!exists(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFilesRel(rootDir, abs, out);
    else if (ent.isFile()) out.push(path.relative(rootDir, abs).replace(/\\/g, '/'));
  }
  return out;
}

export function collectImmutableReleaseAssetRelFiles({
  releaseDir,
  bundleRelFinal,
  threeVendorMetaFinal,
  chunksFinal,
}) {
  const files = new Set();

  if (bundleRelFinal && hasFingerprintInName(bundleRelFinal)) files.add(bundleRelFinal);
  if (threeVendorMetaFinal && threeVendorMetaFinal.file && hasFingerprintInName(threeVendorMetaFinal.file)) {
    files.add(threeVendorMetaFinal.file);
  }
  for (const chunk of chunksFinal || []) {
    if (chunk && chunk.file && hasFingerprintInName(chunk.file)) files.add(chunk.file);
  }

  for (const cssRel of listReleaseCssRelFiles(releaseDir)) {
    if (hasFingerprintInName(cssRel)) files.add(cssRel);
  }

  const assetsDir = path.join(releaseDir, 'assets');
  for (const rel of walkFilesRel(assetsDir)) {
    const releaseRel = path.posix.join('assets', rel);
    if (hasFingerprintInName(releaseRel)) files.add(releaseRel);
  }

  return Array.from(files).sort();
}

export function buildReleaseHeaders({ releaseDir, bundleRelFinal, threeVendorMetaFinal, chunksFinal }) {
  const immutableAssets = collectImmutableReleaseAssetRelFiles({
    releaseDir,
    bundleRelFinal,
    threeVendorMetaFinal,
    chunksFinal,
  });

  const mutableNoStorePaths = [
    '/',
    '/index.html',
    '/404.html',
    '/version.json',
    '/wp_runtime_config.mjs',
    '/wp_logo_data.js',
    '/site_manifest.json',
    '/order_template.pdf',
    '/index.template.site-profile.html',
  ];

  const staleModuleNoStorePatterns = ['/wardrobepro*', '/libs/*'];

  const lines = [
    '# Auto-generated by tools/wp_release.js for Cloudflare Pages deployments.',
    '# Do not edit this generated release copy directly; edit tools/wp_release_finalize.js or public/_headers instead.',
    '# Exact immutable asset rules are intentional: a stale missing chunk must not inherit a long cache TTL.',
    '/*',
    '  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
    '',
  ];

  for (const route of [...mutableNoStorePaths, ...staleModuleNoStorePatterns]) {
    lines.push(route);
    lines.push('  Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    lines.push('  Pragma: no-cache');
    lines.push('  Expires: 0');
    lines.push('');
  }

  for (const relFile of immutableAssets) {
    const route = toHeaderPath(relFile);
    if (!route) continue;
    lines.push(route);
    lines.push('  ! Cache-Control');
    lines.push('  ! Pragma');
    lines.push('  ! Expires');
    lines.push('  Cache-Control: public, max-age=31536000, immutable');
    lines.push('');
  }

  return `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;
}

export function writeReleaseHeaders({ releaseDir, bundleRelFinal, threeVendorMetaFinal, chunksFinal }) {
  const headers = buildReleaseHeaders({ releaseDir, bundleRelFinal, threeVendorMetaFinal, chunksFinal });
  fs.writeFileSync(path.join(releaseDir, '_headers'), headers, 'utf8');
  return headers;
}

export function buildReleaseNotFoundHtml() {
  return `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>הקובץ לא נמצא</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#fff;font-family:Heebo,Arial,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
      .card{max-width:720px;background:rgba(255,255,255,.08);border-radius:18px;padding:24px;line-height:1.7}
      code{direction:ltr;unicode-bidi:bidi-override;background:rgba(0,0,0,.35);border-radius:10px;padding:4px 8px;display:inline-block}
      button{cursor:pointer;border:0;border-radius:12px;padding:10px 14px;font-weight:800;margin-top:14px}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>הקובץ לא נמצא</h1>
      <p>כנראה נשאר בדפדפן קישור לקובץ ישן מפריסה קודמת.</p>
      <p><code id="path"></code></p>
      <button type="button" onclick="location.replace('/?v=' + Date.now() + '&wp_reload=404')">טען את האתר מחדש</button>
    </main>
    <script>try{document.getElementById('path').textContent=location.pathname}catch(_){}</script>
  </body>
</html>
`;
}

export function writeReleaseNotFoundPage({ releaseDir }) {
  const html = buildReleaseNotFoundHtml();
  fs.writeFileSync(path.join(releaseDir, '404.html'), html, 'utf8');
  return html;
}

export function writeReleaseMetadata({
  root,
  releaseDir,
  minifyInfo,
  htmlInfo,
  cssMinifyInfo,
  obfuscateInfo,
  obfuscateMode,
  keepSourceMap,
  hashAssets,
  buildMode,
  buildId,
  bundleRelFinal,
  bundleAbsFinal,
  bundleMapRelFinal,
  threeVendorMetaFinal,
  chunksFinal,
}) {
  const meta = {
    schema: 'wardrobepro.release',
    createdAt: new Date().toISOString(),
    vendors: {
      three: threeVendorMetaFinal,
    },
    bundle: {
      file: bundleRelFinal,
      buildMode: typeof buildMode === 'string' ? buildMode : 'client',
      sha256: sha256File(bundleAbsFinal),
      bytes: fs.statSync(bundleAbsFinal).size,
      sourcemap: bundleMapRelFinal,
    },
    releaseBundle: {
      file: bundleRelFinal,
      minified: Boolean(minifyInfo.minified),
      sha256: sha256File(bundleAbsFinal),
      bytes: fs.statSync(bundleAbsFinal).size,
      sourcemap: bundleMapRelFinal,
    },
    chunks: chunksFinal,
    cache: {
      assetsHashed: Boolean(hashAssets),
      buildId,
      hint: 'Serve index.html with no-cache/no-store; hashed assets can be long-cache (immutable).',
    },
    build: {
      jsMinified: Boolean(minifyInfo.minified),
      jsMinifier: minifyInfo && minifyInfo.engine ? minifyInfo.engine : null,
      htmlMinified: Boolean(htmlInfo && htmlInfo.minified),
      cssMinified: Boolean(cssMinifyInfo && cssMinifyInfo.minified),
      obfuscated: Boolean(obfuscateInfo && obfuscateInfo.obfuscated),
      obfuscateMode: obfuscateInfo && obfuscateInfo.obfuscated ? obfuscateMode : null,
      observabilityMode: typeof buildMode === 'string' ? buildMode : 'client',
      keepSourceMap,
    },
  };
  fs.writeFileSync(path.join(releaseDir, 'version.json'), JSON.stringify(meta, null, 2), 'utf8');

  const mustExist = [];
  const tplPdf = path.join(root, 'public', 'order_template.pdf');
  const tplPdfOut = path.join(releaseDir, 'order_template.pdf');
  if (exists(tplPdf)) mustExist.push(['order_template.pdf', tplPdfOut]);
  const fontTtf = path.join(root, 'public', 'fonts', 'DejaVuSans.ttf');
  const fontTtfOut = path.join(releaseDir, 'fonts', 'DejaVuSans.ttf');
  if (exists(fontTtf)) mustExist.push(['fonts/DejaVuSans.ttf', fontTtfOut]);
  const missing = mustExist.filter(([, p]) => !exists(p)).map(([label]) => label);
  if (missing.length) {
    console.warn('[WP Release] WARNING: Missing required public assets in release:', missing.join(', '));
    console.warn('             (They should be under release root. Did you move files out of /public?)');
  }

  fs.writeFileSync(
    path.join(releaseDir, 'README_RELEASE.txt'),
    [
      'WardrobePro Release (bundle mode)',
      '',
      'How to run locally:',
      '  - Serve the folder (any static server) and open index.html.',
      '  - Example (from repo root):',
      `      node tools/serve.js --port 3000 --root ${path.relative(root, releaseDir).replace(/\\/g, '/')}`,
      '      http://localhost:3000/',
      '',
      'This folder is generated via:',
      '  node tools/wp_release.js',
      '',
      'Notes:',
      '  - Three.js + extras are bundled into libs/three.vendor*.js (no libs/three folder in release).',
      '  - Keep the required wp_runtime_config.mjs next to index.html; use an empty canonical envelope when cloud sync is disabled.',
      '  - Cache: index.html should be served with NO-CACHE (no-store). Hashed JS/CSS can be served long-cache (immutable).',
      '  - By default release JS is built with Vite 8 native minification (Oxc).',
      '  - Sourcemaps are included only when --debug is set.',
      `  - Observability build mode for this release: ${typeof buildMode === 'string' ? buildMode : 'client'}.`,
      '  - A wardrobepro.bundle.js.buildmode.txt marker is emitted next to the bundle for quick inspection.',
      '  - Obfuscation is optional (use --obfuscate / --obfuscate-lite / --obfuscate-strong).',
      '  - Terser is only used as an optional post-pass after obfuscation, not as the primary JS minifier.',
      '  - Disable minification:',
      '      node tools/wp_release.js --no-minify',
      '  - Disable hashing (not recommended for production):',
      '      node tools/wp_release.js --no-hash',
      '',
    ].join('\n'),
    'utf8'
  );

  return meta;
}
