import type {
  RuntimeConfigBooleanKey,
  RuntimeConfigNumberKey,
  WardrobeProRuntimeConfig,
} from '../../../types';

import {
  cloneRuntimeConfig,
  isPlainObject,
  normalizeSiteVariant,
  normalizeTabs,
  toBool,
  toFiniteNumber,
  type RuntimeConfigIssue,
  type ValidateOpts,
} from './runtime_config_validation_shared.js';
import { validateSupabaseCloudSync } from './runtime_config_validation_supabase.js';

const FINITE_NUMBER_RUNTIME_KEYS = [
  'DOOR_DELAY_MS',
  'ACTIVE_STATE_MS',
  'NOTES_THROTTLE_MS',
  'PIXEL_RATIO_MAX',
  'MIRROR_CUBE_SIZE',
  'AUTOSAVE_DEBOUNCE_MS',
  'RESIZE_DEBOUNCE_MS',
  'TEXTURE_CACHE_MAX',
  'MATERIAL_CACHE_MAX',
  'DIM_LABEL_CACHE_MAX',
  'EDGES_CACHE_MAX',
  'GEOMETRY_CACHE_MAX',
  'textures',
  'materials',
  'dimLabels',
  'edges',
  'geometries',
  'MIRROR_FRAME_BUDGET_MS',
  'MIRROR_MOTION_HOLD_MS',
  'MIRROR_MOVE_FRAME_BUDGET_MS',
  'MIRROR_MOVE_UPDATE_MS',
  'MIRROR_NO_MIRROR_RESCAN_MS',
  'MIRROR_REFLECTOR_BRIGHTNESS',
  'MIRROR_REFLECTOR_CLIP_BIAS',
  'MIRROR_REFLECTOR_COLOR',
  'MIRROR_REFLECTOR_EDGE_FEATHER_UV',
  'MIRROR_REFLECTOR_LONG_EDGE',
  'MIRROR_REFLECTOR_MAX_COUNT',
  'MIRROR_REFLECTOR_MAX_UPDATES_PER_FRAME',
  'MIRROR_REFLECTOR_MIN_EDGE',
  'MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME',
  'MIRROR_REFLECTOR_MOVE_UPDATE_MS',
  'MIRROR_REFLECTOR_MULTISAMPLE',
  'MIRROR_REFLECTOR_POLYGON_OFFSET_FACTOR',
  'MIRROR_REFLECTOR_POLYGON_OFFSET_UNITS',
  'MIRROR_REFLECTOR_SLIDING_INNER_EDGE_FEATHER_UV',
  'MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_GAP_M',
  'MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_INSET_X_M',
  'MIRROR_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M',
  'MIRROR_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV',
  'MIRROR_REFLECTOR_SURFACE_GAP_M',
  'MIRROR_REFLECTOR_SURFACE_INSET_M',
  'MIRROR_REFLECTOR_UPDATE_MS',
  'MIRROR_UPDATE_MS',
] as const satisfies readonly RuntimeConfigNumberKey[];

const BOOLEAN_RUNTIME_KEYS = [
  'RENDER_ANTIALIAS',
  'RENDER_SHADOWS_ENABLED',
  'PERSIST_EDIT_STATE',
  'MIRROR_DISABLE_DURING_MOTION',
] as const satisfies readonly RuntimeConfigBooleanKey[];

function validateFiniteRuntimeNumbers(out: WardrobeProRuntimeConfig, issues: RuntimeConfigIssue[]): void {
  for (const key of FINITE_NUMBER_RUNTIME_KEYS) {
    if (typeof out[key] === 'undefined') continue;
    const n = toFiniteNumber(out[key]);
    if (n == null) {
      issues.push({ kind: 'warn', path: key, message: `${key} must be a finite number` });
      delete out[key];
      continue;
    }
    out[key] = n;
  }
}

function validateBooleanRuntimeValues(out: WardrobeProRuntimeConfig, issues: RuntimeConfigIssue[]): void {
  for (const key of BOOLEAN_RUNTIME_KEYS) {
    if (typeof out[key] === 'undefined') continue;
    const value = toBool(out[key]);
    if (value == null) {
      issues.push({ kind: 'warn', path: key, message: `${key} must be boolean` });
      delete out[key];
      continue;
    }
    out[key] = value;
  }
}

export function validateRuntimeConfig(
  cfgIn: unknown,
  opts: ValidateOpts = {}
): {
  config: WardrobeProRuntimeConfig;
  issues: RuntimeConfigIssue[];
} {
  const issues: RuntimeConfigIssue[] = [];

  if (!isPlainObject(cfgIn)) {
    if (typeof cfgIn !== 'undefined' && cfgIn !== null) {
      issues.push({ kind: 'warn', path: 'config', message: 'config must be an object' });
    }
    return { config: {}, issues };
  }

  const out = cloneRuntimeConfig(cfgIn);

  if (typeof out.cacheBudgetMb !== 'undefined') {
    const n = toFiniteNumber(out.cacheBudgetMb);
    if (n == null) {
      issues.push({
        kind: 'warn',
        path: 'cacheBudgetMb',
        message: 'cacheBudgetMb must be a number',
      });
      delete out.cacheBudgetMb;
    } else if (n < 16 || n > 4096) {
      issues.push({
        kind: 'warn',
        path: 'cacheBudgetMb',
        message: 'cacheBudgetMb must be between 16 and 4096',
      });
      delete out.cacheBudgetMb;
    } else {
      out.cacheBudgetMb = n;
    }
  }

  if (typeof out.cacheMaxItems !== 'undefined') {
    const n = toFiniteNumber(out.cacheMaxItems);
    if (n == null) {
      issues.push({
        kind: 'warn',
        path: 'cacheMaxItems',
        message: 'cacheMaxItems must be a number',
      });
      delete out.cacheMaxItems;
    } else if (!Number.isInteger(n) || n < 100 || n > 200000) {
      issues.push({
        kind: 'warn',
        path: 'cacheMaxItems',
        message: 'cacheMaxItems must be an integer between 100 and 200000',
      });
      delete out.cacheMaxItems;
    } else {
      out.cacheMaxItems = n;
    }
  }

  if (typeof out.debugBootTimings !== 'undefined') {
    const b = toBool(out.debugBootTimings);
    if (b == null) {
      issues.push({
        kind: 'warn',
        path: 'debugBootTimings',
        message: 'debugBootTimings must be boolean',
      });
      delete out.debugBootTimings;
    } else {
      out.debugBootTimings = b;
    }
  }

  validateFiniteRuntimeNumbers(out, issues);
  validateBooleanRuntimeValues(out, issues);

  if (typeof out.siteVariant !== 'undefined') {
    const sv = normalizeSiteVariant(out.siteVariant);
    if (!sv) {
      issues.push({
        kind: 'warn',
        path: 'siteVariant',
        message: 'siteVariant must be "main" or "site2"',
      });
      delete out.siteVariant;
    } else {
      out.siteVariant = sv;
    }
  }

  if (typeof out.site2EnabledTabs !== 'undefined') {
    const tabs = normalizeTabs(out.site2EnabledTabs);
    if (!tabs) {
      issues.push({
        kind: 'warn',
        path: 'site2EnabledTabs',
        message: 'site2EnabledTabs must be an array of unique canonical tab ids',
      });
      delete out.site2EnabledTabs;
    } else {
      out.site2EnabledTabs = tabs;
    }
  }

  if (typeof out.storageNamespace !== 'undefined') {
    if (typeof out.storageNamespace !== 'string') {
      issues.push({
        kind: 'warn',
        path: 'storageNamespace',
        message: 'storageNamespace must be a string',
      });
      delete out.storageNamespace;
    } else {
      out.storageNamespace = out.storageNamespace.trim();
    }
  }

  if (typeof out.orderPdf !== 'undefined') {
    if (!isPlainObject(out.orderPdf)) {
      issues.push({
        kind: 'warn',
        path: 'orderPdf',
        message: 'orderPdf must be an object',
      });
      delete out.orderPdf;
    } else {
      const orderPdf = { ...out.orderPdf } as Record<string, unknown>;
      if (typeof orderPdf.templateUrl !== 'undefined') {
        if (typeof orderPdf.templateUrl !== 'string' || !orderPdf.templateUrl.trim()) {
          issues.push({
            kind: 'warn',
            path: 'orderPdf.templateUrl',
            message: 'orderPdf.templateUrl must be a non-empty string',
          });
          delete orderPdf.templateUrl;
        } else {
          orderPdf.templateUrl = orderPdf.templateUrl.trim();
        }
      }
      out.orderPdf = orderPdf;
    }
  }

  if (typeof out.supabaseCloudSync !== 'undefined') {
    const next = validateSupabaseCloudSync(out.supabaseCloudSync, issues, opts);
    if (next) out.supabaseCloudSync = next;
    else delete out.supabaseCloudSync;
  }

  return { config: out, issues };
}
