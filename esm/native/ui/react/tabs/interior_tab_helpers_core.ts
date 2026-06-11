import type { ModuleConfigLike } from '../../../../../types';
import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';
import { readCornerConfigurationFromConfigSnapshot } from '../../../services/api.js';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function asStr(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function asNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function hasInternalDrawersDataInCfg(cfg: unknown): boolean {
  try {
    const mods = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    for (const m of mods) {
      if (!m || typeof m !== 'object') continue;
      const mm: ModuleConfigLike = m;
      if (typeof mm.intDrawersSlot !== 'undefined') {
        const s = String(mm.intDrawersSlot);
        if (s !== '0' && s !== '') return true;
      }
      if (Array.isArray(mm.intDrawersList) && mm.intDrawersList.length) return true;
      if (Array.isArray(mm.internalDrawers) && mm.internalDrawers.length) return true;
    }

    const c = readCornerConfigurationFromConfigSnapshot(cfg);
    if (c) {
      const cc = c;
      if (typeof cc.intDrawersSlot !== 'undefined') {
        const s = String(cc.intDrawersSlot);
        if (s !== '0' && s !== '') return true;
      }
      if (Array.isArray(cc.intDrawersList) && cc.intDrawersList.length) return true;
      if (Array.isArray(cc.internalDrawers) && cc.internalDrawers.length) return true;
    }
  } catch {
    // ignore malformed imported project snapshots; absence of drawer data remains false.
  }
  return false;
}
