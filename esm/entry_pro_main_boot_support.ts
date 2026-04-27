import { createBootErrorPolicy } from './boot/boot_error_policy.js';
import { ensureUiFrameworkFlag } from './native/runtime/runtime_globals.js';
import { validateRuntimeConfig, validateRuntimeFlags } from './native/runtime/runtime_config_validation.js';

import type { Deps3D, WardrobeProRuntimeConfig, WardrobeProRuntimeFlags } from '../types';
import type { ThreeLike } from '../types/three';

import {
  getErrorMessage,
  getOverlayCallback,
  isRecord,
  isThreeLikeNamespace,
  parseRuntimeConfigModule,
  parseSite2EnabledTabs,
  parseSiteVariantFromMeta,
  readMetaContent,
} from './entry_pro_main_shared.js';

import type { BootFailure, BootFailureKind, RuntimeConfigModuleResult } from './entry_pro_main_shared.js';

const __bootErrorPolicy = createBootErrorPolicy({
  scope: 'entry_pro_main',
  defaultReportGroup: 'boot',
  defaultSoftGroup: 'entry_pro_main',
  formatReportMessage: (group, op) => `[WardrobePro][entry_pro_main] ${group}.${op}`,
  formatSoftWarnMessage: (_group, op) => `[WardrobePro][entry_pro_main] ${op}`,
});

export function bootShouldFailFast(win: Window | null): boolean {
  return __bootErrorPolicy.shouldFailFast(win);
}

export function bootSoftWarn(op: string, err: unknown, throttleMs = 1500): void {
  __bootErrorPolicy.softWarn(err, { op, throttleMs });
}

export function bootReportBestEffort(
  win: Window | null,
  err: unknown,
  meta: { op: string; phase?: string },
  opts: { failFast?: boolean } = {}
): void {
  __bootErrorPolicy.reportBestEffort(
    err,
    {
      group: meta && meta.phase ? String(meta.phase) : 'boot',
      op: meta && meta.op ? String(meta.op) : 'unknown',
    },
    { win, failFast: !!opts.failFast }
  );
}

export function reportOverlayFailurePreservingOriginal(
  win: Window | null,
  overlayErr: unknown,
  meta: { op: string; phase?: string },
  originalErr: unknown
): never {
  try {
    bootReportBestEffort(win, overlayErr, meta);
  } catch (reportErr) {
    bootSoftWarn(
      `${meta && meta.phase ? String(meta.phase) : 'boot'}.${meta && meta.op ? String(meta.op) : 'unknown'}.report`,
      reportErr,
      0
    );
  }
  // Preserve the original boot failure (overlay/reporting failures are secondary).
  throw originalErr;
}

export function classifyFailure(err: unknown, ctx: Record<string, unknown>): BootFailure {
  const msg = getErrorMessage(err);
  const lower = msg.toLowerCase();
  if (lower.includes('three') || lower.includes('orbitcontrols') || lower.includes('roundedboxgeometry')) {
    return { kind: 'three', message: msg || 'THREE load failure', error: err, context: ctx };
  }
  if (lower.includes('boot') || lower.includes('install') || lower.includes('manifest')) {
    return { kind: 'boot', message: msg || 'Boot failure', error: err, context: ctx };
  }
  return { kind: 'unknown', message: msg || 'Unknown failure', error: err, context: ctx };
}

export function getHelpHtml(kind: BootFailureKind): string {
  if (kind === 'three') {
    return (
      '<p><b>THREE failed to load</b>. Check:</p>' +
      '<ul>' +
      '<li>That <code>libs/three/build/three.module.js</code> exists and is served by the dev server.</li>' +
      '<li>That OrbitControls / RoundedBoxGeometry paths exist under <code>libs/three/examples/jsm/</code>.</li>' +
      '<li>That your server is not blocking module requests (CORS / MIME types).</li>' +
      '</ul>'
    );
  }

  if (kind === 'boot') {
    return (
      '<p><b>Boot failed</b>. Try:</p>' +
      '<ul>' +
      '<li>Run <code>npm run verify:tsx</code> to validate the ESM graph under Node.</li>' +
      '<li>Check the console for the first thrown error (the boot overlay shows the same details).</li>' +
      '</ul>'
    );
  }

  return '<p>Check the console for additional context.</p>';
}

export async function loadThreeEsm(): Promise<ThreeLike> {
  // IMPORTANT:
  // We intentionally avoid *string-literal* dynamic import specifiers here.
  // When `checkJs` is enabled in some tsconfig profiles, TypeScript will
  // otherwise try to typecheck the vendor ESM files under /libs (THREE,
  // OrbitControls, geometries) and produce a flood of irrelevant errors.
  // Using non-literal specifiers keeps the vendor code out of the TS program
  // while still loading correctly at runtime.
  const THREE_PATH = '../libs/three/build/three.module.js';
  const ORBIT_PATH = '../libs/three/examples/jsm/controls/OrbitControls.js';
  const ROUNDED_BOX_PATH = '../libs/three/examples/jsm/geometries/RoundedBoxGeometry.js';

  // Base namespace.
  const threeNs: unknown = await import(/* @vite-ignore */ THREE_PATH);

  // Extras (OrbitControls + RoundedBoxGeometry). They are optional; fail if missing.
  const controlsMod: unknown = await import(/* @vite-ignore */ ORBIT_PATH);
  const geoMod: unknown = await import(/* @vite-ignore */ ROUNDED_BOX_PATH);

  const OrbitControls = isRecord(controlsMod) ? controlsMod.OrbitControls : null;
  const RoundedBoxGeometry = isRecord(geoMod) ? geoMod.RoundedBoxGeometry : null;

  if (typeof OrbitControls !== 'function') {
    throw new Error('[WardrobePro][Pro] Missing OrbitControls export from ESM controls module.');
  }
  if (typeof RoundedBoxGeometry !== 'function') {
    throw new Error('[WardrobePro][Pro] Missing RoundedBoxGeometry export from ESM geometries module.');
  }

  const baseNs = isRecord(threeNs) ? threeNs : null;
  if (!isThreeLikeNamespace(baseNs)) {
    throw new Error('[WardrobePro][Pro] Invalid THREE ESM namespace.');
  }

  // Merge into a single namespace and return as a permissive ThreeLike.
  return Object.assign({}, baseNs, {
    OrbitControls,
    RoundedBoxGeometry,
  });
}

export async function loadRuntimeConfigModule(win: Window | null): Promise<RuntimeConfigModuleResult> {
  try {
    const url = new URL('../wp_runtime_config.mjs', import.meta.url).toString();
    const mod: unknown = await import(/* @vite-ignore */ url);
    const raw: unknown =
      isRecord(mod) && Object.prototype.hasOwnProperty.call(mod, 'default') ? mod.default : mod;
    return parseRuntimeConfigModule(raw);
  } catch (err) {
    // Missing file is a valid state for deployments without Cloud Sync.
    // In QA/strict environments we still report best-effort so configuration mistakes are visible.
    if (bootShouldFailFast(win)) {
      bootReportBestEffort(win, err, { phase: 'boot', op: 'load.wp_runtime_config.mjs' });
    }
    return { config: null, flags: null };
  }
}

export function applyValidatedRuntimeFlags(
  deps: Deps3D,
  runtimeFlags: WardrobeProRuntimeFlags | null,
  win: Window | null
): void {
  if (runtimeFlags) {
    deps.flags = Object.assign({}, deps.flags || {}, runtimeFlags);
  }

  // React-only build.
  ensureUiFrameworkFlag(deps, 'react');

  // Normalize runtime flags (P9).
  try {
    if (deps.flags && typeof deps.flags === 'object') {
      const vFlags = validateRuntimeFlags(deps.flags, {
        source: 'entry_pro_main',
        failFast: bootShouldFailFast(win),
      });
      if (vFlags.issues && vFlags.issues.length) {
        bootSoftWarn(
          'runtimeFlags.validate',
          new Error(vFlags.issues.map(x => (x.path ? `${x.path}: ${x.message}` : x.message)).join('; ')),
          0
        );
      }
      deps.flags = vFlags.flags;
    }
  } catch (err) {
    bootSoftWarn('runtimeFlags.validate.crash', err, 0);
  }
}

export function resolveRuntimeConfig(
  doc: Document | null,
  runtimeModule: RuntimeConfigModuleResult,
  win: Window | null
): WardrobeProRuntimeConfig {
  // Base config defaults (keep in sync with platform defaults as needed).
  const cfg: WardrobeProRuntimeConfig = {
    // Cache sizing
    cacheBudgetMb: 128,
    cacheMaxItems: 2000,

    // Debug
    debugBootTimings: false,
  };

  // Optional per-site defaults supplied via HTML <meta> tags (no window globals).
  // Example (site2):
  //   <meta name="wp-site-variant" content="site2" />
  //   <meta name="wp-site2-enabled-tabs" content="structure,design,interior,render,export" />
  try {
    const siteVariant = parseSiteVariantFromMeta(readMetaContent(doc, 'wp-site-variant'));
    if (siteVariant && typeof cfg.siteVariant === 'undefined') {
      cfg.siteVariant = siteVariant;
    }

    const enabledTabs = parseSite2EnabledTabs(readMetaContent(doc, 'wp-site2-enabled-tabs'));
    if (enabledTabs && typeof cfg.site2EnabledTabs === 'undefined') {
      cfg.site2EnabledTabs = enabledTabs;
    }
  } catch {
    // ignore
  }

  if (runtimeModule.config) Object.assign(cfg, runtimeModule.config);

  // Validate + normalize runtime config (P9).
  // This prevents common deployment mistakes (wrong types / missing supabase keys)
  // from crashing the app.
  const failFastCfg = bootShouldFailFast(win);
  const vCfg = validateRuntimeConfig(cfg, { source: 'entry_pro_main', failFast: failFastCfg });
  if (vCfg.issues && vCfg.issues.length) {
    const errs = vCfg.issues.filter(i => i && i.kind === 'error');
    const warns = vCfg.issues.filter(i => !i || i.kind !== 'error');
    if (warns.length) {
      bootSoftWarn(
        'runtimeConfig.validate',
        new Error(warns.map(x => (x.path ? `${x.path}: ${x.message}` : x.message)).join('; ')),
        0
      );
    }
    if (errs.length) {
      const e = new Error(errs.map(x => (x.path ? `${x.path}: ${x.message}` : x.message)).join('; '));
      // Always report, and fail only in strict environments.
      bootReportBestEffort(
        win,
        e,
        { phase: 'boot', op: 'runtimeConfig.validate' },
        { failFast: failFastCfg }
      );
      if (failFastCfg) throw e;
    }
  }

  return vCfg.config || cfg;
}

export async function showFatalOverlayMaybe(
  win: Window | null,
  doc: Document | null,
  err: unknown,
  opts: {
    failure: BootFailure;
    description: string;
    title?: string;
    helpKind?: BootFailureKind;
  }
): Promise<boolean> {
  const overlayMod = await import('./native/ui/error_overlay.js');
  const show = getOverlayCallback(overlayMod, 'showFatalOverlay');
  if (!show) return false;
  show({
    window: win,
    document: doc,
    title: opts.title || 'WardrobePro boot failed',
    description: opts.description,
    error: err,
    context: opts.failure,
    helpHtml: getHelpHtml(opts.helpKind || opts.failure.kind),
  });
  return true;
}
