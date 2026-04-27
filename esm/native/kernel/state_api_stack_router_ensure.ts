import type { StateApiStackRouterContext } from './state_api_stack_router_shared.js';
import {
  asEnsureAt,
  asEnsureRoot,
  asModuleConfig,
  ensureCornerCellDirect,
  ensureCornerRootDirect,
  ensureListCellDirect,
  normalizeModuleStack,
  parseCornerCellIndex,
  readModuleIndex,
  readModulesBucketKey,
} from './state_api_stack_router_shared.js';

export function installStateApiStackRouterEnsure(ctx: StateApiStackRouterContext): void {
  const { modulesNs, cornerNs, safeCall } = ctx;

  if (typeof modulesNs.ensureForStack !== 'function') {
    modulesNs.ensureForStack = function ensureForStack(stack: unknown, moduleKey: unknown) {
      const out = safeCall(() => {
        const stackNorm = normalizeModuleStack(stack);
        const cornerCellIdx = parseCornerCellIndex(moduleKey);

        if (cornerCellIdx != null) {
          if (stackNorm === 'bottom') {
            const ensureLowerCellAt = asEnsureAt(cornerNs['ensureLowerCellAt']);
            if (ensureLowerCellAt) return ensureLowerCellAt(cornerCellIdx);
          }
          const ensureCellAt = asEnsureAt(cornerNs['ensureCellAt']);
          if (ensureCellAt) return ensureCellAt(cornerCellIdx);
        } else if (moduleKey === 'corner') {
          if (stackNorm === 'bottom') {
            const ensureLowerConfig = asEnsureRoot(cornerNs['ensureLowerConfig']);
            if (ensureLowerConfig) return ensureLowerConfig();
          }
          const ensureConfig = asEnsureRoot(cornerNs['ensureConfig']);
          if (ensureConfig) return ensureConfig();
        } else {
          if (stackNorm === 'bottom') {
            const ensureLowerAt = asEnsureAt(modulesNs['ensureLowerAt']);
            if (ensureLowerAt) return ensureLowerAt(Number(moduleKey));
          } else {
            const ensureAt = asEnsureAt(modulesNs['ensureAt']);
            if (ensureAt) return ensureAt(Number(moduleKey));
          }
        }

        if (cornerCellIdx != null) return ensureCornerCellDirect(ctx, stackNorm, cornerCellIdx);
        if (moduleKey === 'corner') return ensureCornerRootDirect(ctx, stackNorm);

        const moduleIndex = readModuleIndex(moduleKey);
        if (moduleIndex == null) return null;
        return ensureListCellDirect(ctx, readModulesBucketKey(stackNorm), moduleIndex);
      });

      return out === undefined ? null : asModuleConfig(out);
    };
  }

  if (typeof modulesNs.ensureCornerCellAt !== 'function') {
    modulesNs.ensureCornerCellAt = function ensureCornerCellAt(cellIndex: unknown) {
      const parsed = Number(cellIndex);
      if (!Number.isFinite(parsed) || parsed < 0) return null;
      const out = safeCall(() => modulesNs.ensureForStack?.('top', `corner:${Math.floor(parsed)}`));
      return out === undefined ? null : asModuleConfig(out);
    };
  }
}
