import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SITE2_TABS = ['structure', 'design', 'interior', 'sketch', 'settings'];
const VALID_VARIANTS = new Set(['main', 'site2', 'client']);
const VALID_TABS = new Set(DEFAULT_SITE2_TABS);

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBoolean(value, fallback = undefined) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const low = value.trim().toLowerCase();
    if (low === 'true' || low === '1' || low === 'yes') return true;
    if (low === 'false' || low === '0' || low === 'no') return false;
  }
  return fallback;
}

function uniqStrings(values) {
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const s = asString(value);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function normalizeTabs(value, fallback = []) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : Array.isArray(fallback)
        ? fallback
        : [];
  const out = [];
  for (const item of raw) {
    const tab = asString(item).toLowerCase();
    if (VALID_TABS.has(tab) && !out.includes(tab)) out.push(tab);
  }
  return out;
}

function normalizeVariantName(value) {
  const variant = asString(value, 'main').toLowerCase();
  if (!VALID_VARIANTS.has(variant)) {
    throw new Error(`[WP Site Profile] Unsupported variant "${value}". Use main or site2.`);
  }
  return variant === 'client' ? 'site2' : variant;
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"]/g,
    ch =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      })[ch]
  );
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

export function parseSiteReleaseArgs(args = []) {
  const argv = Array.isArray(args) ? args.slice() : [];
  const passthrough = [];
  let store = '';
  let variant = 'main';
  let outDirRel = '';
  let distRootRel = '';

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === '--store' || a === '--site-profile') && argv[i + 1]) {
      store = argv[++i];
      continue;
    }
    if (a.startsWith('--store=')) {
      store = a.slice('--store='.length);
      continue;
    }
    if (a.startsWith('--site-profile=')) {
      store = a.slice('--site-profile='.length);
      continue;
    }
    if ((a === '--variant' || a === '--site-variant') && argv[i + 1]) {
      variant = argv[++i];
      continue;
    }
    if (a.startsWith('--variant=')) {
      variant = a.slice('--variant='.length);
      continue;
    }
    if (a.startsWith('--site-variant=')) {
      variant = a.slice('--site-variant='.length);
      continue;
    }
    if (a === '--out' && argv[i + 1]) {
      outDirRel = argv[++i];
      continue;
    }
    if (a.startsWith('--out=')) {
      outDirRel = a.slice('--out='.length);
      continue;
    }
    if (a === '--dist-root' && argv[i + 1]) {
      distRootRel = argv[++i];
      continue;
    }
    if (a.startsWith('--dist-root=')) {
      distRootRel = a.slice('--dist-root='.length);
      continue;
    }
    passthrough.push(a);
  }

  if (!asString(store)) {
    throw new Error(
      '[WP Site Profile] Missing --store <profile-id>. Example: --store store-1 --variant main'
    );
  }

  return {
    store: asString(store),
    variant: normalizeVariantName(variant),
    outDirRel: asString(outDirRel),
    distRootRel: asString(distRootRel),
    passthrough,
  };
}

export async function loadSiteProfile(root, storeId) {
  const id = asString(storeId);
  if (!id) throw new Error('[WP Site Profile] Missing store id');

  const profileDir = path.resolve(root, 'sites', id);
  const profilePath = path.join(profileDir, 'site.profile.mjs');
  if (!fs.existsSync(profilePath)) {
    throw new Error(`[WP Site Profile] Missing profile: ${path.relative(root, profilePath)}`);
  }

  const mod = await import(pathToFileURL(profilePath).toString() + `?t=${Date.now()}`);
  const profile = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
  if (!isRecord(profile)) throw new Error(`[WP Site Profile] Invalid profile export: ${profilePath}`);

  return normalizeSiteProfile({ root, profileDir, profile, requestedStoreId: id });
}

export function normalizeSiteProfile({ root, profileDir, profile, requestedStoreId }) {
  const id = asString(profile.id || profile.storeId || requestedStoreId);
  if (!id) throw new Error('[WP Site Profile] Profile id is required');

  const displayName = asString(profile.displayName, id);
  const assets = isRecord(profile.assets) ? profile.assets : {};
  const supabase = isRecord(profile.supabase) ? profile.supabase : {};
  const variantsRaw = isRecord(profile.variants) ? profile.variants : {};

  const normalized = {
    id,
    storeId: id,
    displayName,
    releaseStatus: asString(profile.releaseStatus),
    profileDir,
    profileRelDir: path.relative(root, profileDir).replace(/\\/g, '/'),
    storageNamespace: asString(profile.storageNamespace),
    assets: {
      logoData: asString(assets.logoData, './wp_logo_data.js'),
      logo: asString(assets.logo),
      orderPdfTemplate: asString(assets.orderPdfTemplate, './order_template.pdf'),
    },
    supabase: {
      url: asString(supabase.url),
      anonKey: asString(supabase.anonKey),
      table: asString(
        supabase.table,
        id === 'bargig' ? 'wp_shared_state' : `wp_shared_state_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`
      ),
      publicRoom: asString(supabase.publicRoom, 'public'),
      privateRoom: typeof supabase.privateRoom === 'string' ? supabase.privateRoom.trim() : '',
      roomParam: asString(supabase.roomParam, 'room'),
      shareBaseUrl: asString(supabase.shareBaseUrl, 'https://pro218.bargig-furniture.com/'),
      pollMs: Number.isFinite(Number(supabase.pollMs)) ? Number(supabase.pollMs) : 1500,
      diagnostics: asBoolean(supabase.diagnostics, false),
      realtime: asBoolean(supabase.realtime, true),
      realtimeMode: asString(supabase.realtimeMode, 'broadcast'),
      realtimeChannelPrefix: asString(
        supabase.realtimeChannelPrefix,
        `wp_cloud_sync_${id.replace(/[^a-zA-Z0-9]+/g, '_')}`
      ),
      site2SketchInitialAutoLoad: asBoolean(supabase.site2SketchInitialAutoLoad, true),
      site2SketchInitialMaxAgeHours: Number.isFinite(Number(supabase.site2SketchInitialMaxAgeHours))
        ? Number(supabase.site2SketchInitialMaxAgeHours)
        : 12,
      showRoomWidget: asBoolean(supabase.showRoomWidget, true),
    },
    variants: {},
  };

  for (const name of ['main', 'site2']) {
    const raw = isRecord(variantsRaw[name]) ? variantsRaw[name] : {};
    const isSite2 = name === 'site2';
    normalized.variants[name] = {
      name,
      title: asString(raw.title, isSite2 ? `${displayName} - אתר לקוחות` : `${displayName} - אתר ראשי`),
      siteVariant: isSite2 ? 'site2' : 'main',
      site2EnabledTabs: isSite2
        ? normalizeTabs(raw.site2EnabledTabs, DEFAULT_SITE2_TABS)
        : normalizeTabs(raw.site2EnabledTabs, []),
      shareBaseUrl: asString(raw.shareBaseUrl, normalized.supabase.shareBaseUrl),
      showRoomWidget: asBoolean(raw.showRoomWidget, normalized.supabase.showRoomWidget),
      storageNamespace: asString(raw.storageNamespace, normalized.storageNamespace),
      orderPdfTemplateUrl: asString(raw.orderPdfTemplateUrl, 'order_template.pdf'),
      extraConfig: isRecord(raw.config) ? { ...raw.config } : {},
      extraFlags: isRecord(raw.flags) ? { ...raw.flags } : {},
    };
  }

  return normalized;
}

export function resolveProfileAsset(root, profile, assetKey, fallbackRel) {
  const assets = isRecord(profile.assets) ? profile.assets : {};
  const rel = asString(assets[assetKey], fallbackRel);
  const base = path.isAbsolute(rel)
    ? rel
    : path.resolve(profile.profileDir || path.join(root, 'sites', profile.id), rel);
  return base;
}

export function buildRuntimeConfigSource(profile, variantName) {
  const variant = profile.variants[normalizeVariantName(variantName)];
  if (!variant) throw new Error(`[WP Site Profile] Missing variant ${variantName} in ${profile.id}`);

  const supabaseCloudSync = {
    ...profile.supabase,
    shareBaseUrl: variant.shareBaseUrl || profile.supabase.shareBaseUrl,
    showRoomWidget: variant.showRoomWidget,
  };

  const config = {
    cacheBudgetMb: 128,
    cacheMaxItems: 2000,
    debugBootTimings: false,
    branding: {
      storeId: profile.id,
      displayName: profile.displayName,
    },
    storageNamespace: variant.storageNamespace || '',
    siteVariant: variant.siteVariant,
    orderPdf: {
      templateUrl: variant.orderPdfTemplateUrl || 'order_template.pdf',
    },
    supabaseCloudSync,
    ...variant.extraConfig,
  };

  if (variant.siteVariant === 'site2') {
    config.site2EnabledTabs = variant.site2EnabledTabs;
  }

  return (
    `// Auto-generated by tools/wp_release_site.js from ${profile.profileRelDir}/site.profile.mjs.\n` +
    `// Do not edit this generated release copy directly; edit the site profile instead.\n` +
    `export default ${safeJson({ flags: { ...variant.extraFlags }, config })};\n`
  );
}

export function buildSiteManifest(profile, variantName) {
  const variant = profile.variants[normalizeVariantName(variantName)];
  return {
    schema: 'wardrobepro.site-release',
    createdAt: new Date().toISOString(),
    storeId: profile.id,
    displayName: profile.displayName,
    releaseStatus: profile.releaseStatus,
    variant: variant.name,
    siteVariant: variant.siteVariant,
    supabase: {
      table: profile.supabase.table,
      publicRoom: profile.supabase.publicRoom,
      realtimeChannelPrefix: profile.supabase.realtimeChannelPrefix,
      shareBaseUrl: variant.shareBaseUrl || profile.supabase.shareBaseUrl,
    },
    assets: {
      logoData: 'wp_logo_data.js',
      orderPdfTemplate: 'order_template.pdf',
    },
  };
}

export function renderSiteReleaseTemplate(root, profile, variantName) {
  const variant = profile.variants[normalizeVariantName(variantName)];
  const templatePath = path.join(root, 'tools', 'index_release_bundle.html');
  if (!fs.existsSync(templatePath)) throw new Error(`[WP Site Profile] Missing template: ${templatePath}`);

  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(variant.title)}</title>`);

  html = html.replace(
    /<span class="copyright-notice-line copyright-notice-line--bottom">[\s\S]*?<\/span>/i,
    `<span class="copyright-notice-line copyright-notice-line--bottom">© כל הזכויות שמורות ל${escapeHtml(profile.displayName)}</span>`
  );

  html = html.replace(/\s*<meta\s+name="wp-site-variant"[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<meta\s+name="wp-site2-enabled-tabs"[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<meta\s+name="wp-store-id"[^>]*>\s*/gi, '\n');
  html = html.replace(/\s*<meta\s+name="wp-store-name"[^>]*>\s*/gi, '\n');

  const meta = [
    `<meta name="wp-store-id" content="${escapeHtml(profile.id)}" />`,
    `<meta name="wp-store-name" content="${escapeHtml(profile.displayName)}" />`,
    `<meta name="wp-site-variant" content="${escapeHtml(variant.siteVariant)}" />`,
  ];
  if (variant.siteVariant === 'site2') {
    meta.push(
      `<meta name="wp-site2-enabled-tabs" content="${escapeHtml(variant.site2EnabledTabs.join(','))}" />`
    );
  }

  html = html.replace(
    /<script src="\.\/wp_logo_data\.js"><\/script>/i,
    `${meta.map(x => '    ' + x).join('\n')}\n\n    <script src="./wp_logo_data.js"></script>`
  );
  return html;
}

export function copySiteRuntimeAssets({ root, profile, variantName, targetDir }) {
  const variant = profile.variants[normalizeVariantName(variantName)];
  fs.mkdirSync(targetDir, { recursive: true });

  const logoDataSrc = resolveProfileAsset(root, profile, 'logoData', './wp_logo_data.js');
  if (!fs.existsSync(logoDataSrc)) {
    throw new Error(
      `[WP Site Profile] Missing logo data asset for ${profile.id}: ${path.relative(root, logoDataSrc)}`
    );
  }
  fs.copyFileSync(logoDataSrc, path.join(targetDir, 'wp_logo_data.js'));

  const orderPdfSrc = resolveProfileAsset(root, profile, 'orderPdfTemplate', './order_template.pdf');
  if (!fs.existsSync(orderPdfSrc)) {
    throw new Error(
      `[WP Site Profile] Missing order PDF template for ${profile.id}: ${path.relative(root, orderPdfSrc)}`
    );
  }
  fs.copyFileSync(orderPdfSrc, path.join(targetDir, 'order_template.pdf'));

  const logoSrc = resolveProfileAsset(root, profile, 'logo', './logo.png');
  if (fs.existsSync(logoSrc)) fs.copyFileSync(logoSrc, path.join(targetDir, 'logo.png'));

  fs.writeFileSync(
    path.join(targetDir, 'wp_runtime_config.mjs'),
    buildRuntimeConfigSource(profile, variant.name),
    'utf8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'site_manifest.json'),
    `${safeJson(buildSiteManifest(profile, variant.name))}\n`,
    'utf8'
  );
}

export function writeSiteTemplate(root, profile, variantName, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const html = renderSiteReleaseTemplate(root, profile, variantName);
  fs.writeFileSync(targetPath, html, 'utf8');
  return targetPath;
}
