import fs from 'node:fs';
import path from 'node:path';
import { exists, sha256File, escapeRegExp } from './wp_release_shared.js';

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
          var BANNER_ID = 'wp-update-banner';

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
              msg.textContent = 'זוהתה גרסה חדשה. אם משהו נראה תקוע — רענן כדי למשוך את העדכון.';

              var actions = document.createElement('div');
              actions.style.cssText = 'display:flex; gap:10px; align-items:center; flex-wrap:wrap;';

              var btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = 'רענן עכשיו';
              btn.style.cssText = 'cursor:pointer; border:0; padding:8px 12px; border-radius:10px; font-weight:800;';
              btn.onclick = function(){
                try {
                  var u = new URL(location.href);
                  u.searchParams.set('v', String(nextId || '1'));
                  location.replace(u.toString());
                } catch(_) {
                  try { location.reload(); } catch(__){}
                }
              };

              var hint = document.createElement('div');
              hint.style.cssText = 'font-size:12px; opacity:.85;';
              hint.textContent = 'אם זה חוזר: Ctrl+F5';

              actions.appendChild(btn);
              actions.appendChild(hint);
              d.appendChild(msg);
              d.appendChild(actions);
              document.body.appendChild(d);
            } catch(_) {}
          }

          async function checkForUpdate(){
            try {
              var r = await fetch('./version.json?ts=' + Date.now(), { cache: 'no-store' });
              if (!r || !r.ok) return;
              var meta = await r.json();
              var next = meta && meta.cache && meta.cache.buildId ? String(meta.cache.buildId) : '';
              if (!next || next === BUILD_ID) return;

              var attempted = null;
              try { attempted = sessionStorage.getItem(KEY); } catch(_) {}
              if (attempted === next) {
                showBanner(next);
                return;
              }

              try { sessionStorage.setItem(KEY, next); } catch(_) {}
              try {
                if (window.caches && typeof window.caches.keys === 'function') {
                  var keys = await window.caches.keys();
                  await Promise.all(keys.map(function(k){ return window.caches.delete(k); }));
                }
              } catch(_) {}

              try {
                var u = new URL(location.href);
                u.searchParams.set('v', next);
                location.replace(u.toString());
              } catch(_) {
                try { location.reload(); } catch(__) {}
              }
            } catch(_) {}
          }

          function start(){
            try { window.__WP_CHECK_FOR_UPDATE__ = checkForUpdate; } catch(_) {}
            setTimeout(checkForUpdate, 1500);
            setInterval(function(){
              if (document.visibilityState === 'visible') checkForUpdate();
            }, 3 * 60 * 1000);
            document.addEventListener('visibilitychange', function(){
              if (document.visibilityState === 'visible') checkForUpdate();
            });
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
      '  - If you use Supabase cloud sync, keep wp_runtime_config.mjs next to index.html (loaded at boot by the ESM entry).',
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
