import type { StateApiStackRouterContext } from './state_api_stack_router_shared.js';
import {
  asModuleConfig,
  ensureCornerCellDirect,
  ensureCornerRootDirect,
  ensureListCellDirect,
  normalizeModuleStack,
  parseCornerCellIndex,
  readModuleIndex,
  readModulesBucketKey,
} from './state_api_stack_router_shared.js';

const canonicalEnsureRouters = new WeakSet<object>();

export function installStateApiStackRouterEnsure(ctx: StateApiStackRouterContext): void {
  const { modulesNs } = ctx;

  if (
    typeof modulesNs.ensureForStack !== 'function' ||
    !canonicalEnsureRouters.has(modulesNs.ensureForStack)
  ) {
    const ensureForStack = function ensureForStack(stack: unknown, moduleKey: unknown) {
      const stackNorm = normalizeModuleStack(stack);
      const cornerCellIdx = parseCornerCellIndex(moduleKey);

      let out: unknown;
      if (cornerCellIdx != null) out = ensureCornerCellDirect(ctx, stackNorm, cornerCellIdx);
      else if (moduleKey === 'corner') out = ensureCornerRootDirect(ctx, stackNorm);
      else {
        const moduleIndex = readModuleIndex(moduleKey);
        if (moduleIndex == null) return null;
        out = ensureListCellDirect(ctx, readModulesBucketKey(stackNorm), moduleIndex);
      }

      return out === undefined ? null : asModuleConfig(out);
    };
    modulesNs.ensureForStack = ensureForStack;
    canonicalEnsureRouters.add(ensureForStack);
  }
}
