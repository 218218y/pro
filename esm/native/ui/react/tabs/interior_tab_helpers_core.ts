import { readModulesConfigurationListFromConfigSnapshot } from '../../../features/modules_configuration/modules_config_api.js';
import { readCornerConfigurationFromConfigSnapshot } from '../../../services/api.js';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function asStr(v: unknown, defaultValue = ''): string {
  if (typeof v === 'string') return v;
  return defaultValue;
}

export function asNum(v: unknown, defaultValue = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

function hasSketchInternalDrawersData(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as { sketchExtras?: { drawers?: unknown[] } | null };
  return Array.isArray(rec.sketchExtras?.drawers) && rec.sketchExtras.drawers.length > 0;
}

export function hasInternalDrawersDataInCfg(cfg: unknown): boolean {
  try {
    const mods = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    for (const m of mods) {
      if (hasSketchInternalDrawersData(m)) return true;
    }

    const c = readCornerConfigurationFromConfigSnapshot(cfg);
    if (hasSketchInternalDrawersData(c)) return true;
  } catch {
    // ignore malformed imported project snapshots; absence of drawer data remains false.
  }
  return false;
}
