import type { WardrobeProRuntimeConfig } from '../../../types';

import {
  clampNumber,
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
      issues.push({ kind: 'warn', path: 'config', message: 'config must be an object (using defaults)' });
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
        message: 'cacheBudgetMb must be a number (default used)',
      });
      delete out.cacheBudgetMb;
    } else {
      out.cacheBudgetMb = clampNumber(n, 16, 4096);
    }
  }

  if (typeof out.cacheMaxItems !== 'undefined') {
    const n = toFiniteNumber(out.cacheMaxItems);
    if (n == null) {
      issues.push({
        kind: 'warn',
        path: 'cacheMaxItems',
        message: 'cacheMaxItems must be a number (default used)',
      });
      delete out.cacheMaxItems;
    } else {
      out.cacheMaxItems = Math.trunc(clampNumber(n, 100, 200000));
    }
  }

  if (typeof out.debugBootTimings !== 'undefined') {
    const b = toBool(out.debugBootTimings);
    if (b == null) {
      issues.push({
        kind: 'warn',
        path: 'debugBootTimings',
        message: 'debugBootTimings must be boolean (ignored)',
      });
      delete out.debugBootTimings;
    } else {
      out.debugBootTimings = b;
    }
  }

  if (typeof out.siteVariant !== 'undefined') {
    const sv = normalizeSiteVariant(out.siteVariant);
    if (!sv) {
      issues.push({
        kind: 'warn',
        path: 'siteVariant',
        message: 'siteVariant must be "main" or "site2" (ignored)',
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
        message: 'site2EnabledTabs must be array/string (ignored)',
      });
      delete out.site2EnabledTabs;
    } else {
      out.site2EnabledTabs = tabs;
    }
  }

  if (typeof out.supabaseCloudSync !== 'undefined') {
    const next = validateSupabaseCloudSync(out.supabaseCloudSync, issues, opts);
    if (next) out.supabaseCloudSync = next;
    else delete out.supabaseCloudSync;
  }

  return { config: out, issues };
}
