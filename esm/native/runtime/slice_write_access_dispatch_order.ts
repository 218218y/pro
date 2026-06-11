import type {
  CanonicalPatchDispatchOptions,
  MetaTouchDispatchTarget,
  MetaTouchOptions,
  RootPatchDispatchTarget,
  SliceDispatchTarget,
  SliceWriteOptions,
} from './slice_write_access_shared.js';

export type RootFallbackOptions = Pick<
  CanonicalPatchDispatchOptions,
  'allowRootActionPatchFallback' | 'allowRootStorePatchFallback'
>;

function freezeRootPatchDispatchTargets(
  ...targets: RootPatchDispatchTarget[]
): readonly RootPatchDispatchTarget[] {
  return Object.freeze(targets.slice());
}

const DEFAULT_ROOT_FALLBACK_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootStorePatch');
const ROOT_FALLBACK_DISPATCH_TARGETS_WITH_ACTION = freezeRootPatchDispatchTargets(
  'rootActionPatch',
  'rootStorePatch'
);
const ROOT_FALLBACK_ACTION_ONLY_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootActionPatch');
const EMPTY_ROOT_FALLBACK_DISPATCH_TARGETS = freezeRootPatchDispatchTargets();

const sliceDispatchTargetsCache = new Map<number, readonly SliceDispatchTarget[]>();
const metaTouchDispatchTargetsCache = new Map<number, readonly MetaTouchDispatchTarget[]>();

function createRootFallbackDispatchTargetSet(opts?: RootFallbackOptions): readonly RootPatchDispatchTarget[] {
  const allowRootActionPatchFallback = !!opts?.allowRootActionPatchFallback;
  const allowRootStorePatchFallback = opts?.allowRootStorePatchFallback !== false;
  if (!allowRootStorePatchFallback) {
    return allowRootActionPatchFallback
      ? ROOT_FALLBACK_ACTION_ONLY_DISPATCH_TARGETS
      : EMPTY_ROOT_FALLBACK_DISPATCH_TARGETS;
  }
  return allowRootActionPatchFallback
    ? ROOT_FALLBACK_DISPATCH_TARGETS_WITH_ACTION
    : DEFAULT_ROOT_FALLBACK_DISPATCH_TARGETS;
}

function createSliceDispatchTargetCacheKey(opts: SliceWriteOptions): number {
  return (
    (opts.preferStoreWriter ? 1 : 0) |
    (opts.skipNamespacePatch ? 2 : 0) |
    (opts.allowRootActionPatchFallback ? 4 : 0) |
    (opts.allowRootStorePatchFallback === false ? 0 : 8)
  );
}

function createMetaTouchDispatchTargetCacheKey(opts?: MetaTouchOptions): number {
  return (
    (opts?.preferStoreWriter ? 1 : 0) |
    (opts?.skipNamespaceTouch ? 2 : 0) |
    (opts?.allowRootActionPatchFallback ? 4 : 0) |
    (opts?.allowRootStorePatchFallback === false ? 0 : 8)
  );
}

function buildCanonicalDispatchTargetOrder<T>(args: {
  preferPrimary?: boolean;
  skipSecondary?: boolean;
  primary: T;
  secondary: T;
  fallbacks: readonly T[];
}): readonly T[] {
  const out: T[] = [];
  if (args.preferPrimary) out.push(args.primary);
  if (!args.skipSecondary) out.push(args.secondary);
  if (!args.preferPrimary) out.push(args.primary);
  out.push(...args.fallbacks);
  return Object.freeze(out.slice());
}

export function resolveRootFallbackDispatchTargets(
  opts?: RootFallbackOptions
): readonly RootPatchDispatchTarget[] {
  return createRootFallbackDispatchTargetSet(opts);
}

export function resolveCanonicalMetaTouchOptions(opts?: CanonicalPatchDispatchOptions): MetaTouchOptions {
  const metaTouchOptions = opts?.metaTouchOptions;
  return {
    allowRootActionPatchFallback:
      metaTouchOptions?.allowRootActionPatchFallback ?? opts?.allowRootActionPatchFallback,
    allowRootStorePatchFallback:
      metaTouchOptions?.allowRootStorePatchFallback ?? opts?.allowRootStorePatchFallback,
    preferStoreWriter: metaTouchOptions?.preferStoreWriter,
    skipNamespaceTouch: metaTouchOptions?.skipNamespaceTouch,
  };
}

export function resolveSliceDispatchTargets(opts: SliceWriteOptions): readonly SliceDispatchTarget[] {
  const key = createSliceDispatchTargetCacheKey(opts);
  const cached = sliceDispatchTargetsCache.get(key);
  if (cached) return cached;

  const out = buildCanonicalDispatchTargetOrder<SliceDispatchTarget>({
    preferPrimary: opts.preferStoreWriter,
    skipSecondary: opts.skipNamespacePatch,
    primary: 'storeWriter',
    secondary: 'namespacePatch',
    fallbacks: resolveRootFallbackDispatchTargets(opts),
  });
  sliceDispatchTargetsCache.set(key, out);
  return out;
}

export function resolveMetaTouchDispatchTargets(opts?: MetaTouchOptions): readonly MetaTouchDispatchTarget[] {
  const key = createMetaTouchDispatchTargetCacheKey(opts);
  const cached = metaTouchDispatchTargetsCache.get(key);
  if (cached) return cached;

  const out = buildCanonicalDispatchTargetOrder<MetaTouchDispatchTarget>({
    preferPrimary: opts?.preferStoreWriter,
    skipSecondary: opts?.skipNamespaceTouch,
    primary: 'metaStoreWriter',
    secondary: 'metaTouch',
    fallbacks: resolveRootFallbackDispatchTargets(opts),
  });
  metaTouchDispatchTargetsCache.set(key, out);
  return out;
}
