import type {
  CanonicalPatchDispatchOptions,
  MetaTouchDispatchTarget,
  MetaTouchOptions,
  RootPatchDispatchTarget,
  SliceDispatchTarget,
  SliceWriteOptions,
} from './slice_write_access_shared.js';

export type RootPatchDispatchOptions = Pick<
  CanonicalPatchDispatchOptions,
  'allowRootActionPatch' | 'allowRootStorePatch'
>;

function freezeRootPatchDispatchTargets(
  ...targets: RootPatchDispatchTarget[]
): readonly RootPatchDispatchTarget[] {
  return Object.freeze(targets.slice());
}

const DEFAULT_ROOT_PATCH_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootStorePatch');
const ROOT_PATCH_DISPATCH_TARGETS_WITH_ACTION = freezeRootPatchDispatchTargets(
  'rootActionPatch',
  'rootStorePatch'
);
const ROOT_PATCH_ACTION_ONLY_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootActionPatch');
const EMPTY_ROOT_PATCH_DISPATCH_TARGETS = freezeRootPatchDispatchTargets();

const sliceDispatchTargetsCache = new Map<number, readonly SliceDispatchTarget[]>();
const metaTouchDispatchTargetsCache = new Map<number, readonly MetaTouchDispatchTarget[]>();

function createRootPatchDispatchTargetSet(
  opts?: RootPatchDispatchOptions
): readonly RootPatchDispatchTarget[] {
  const allowRootActionPatch = !!opts?.allowRootActionPatch;
  const allowRootStorePatch = opts?.allowRootStorePatch === true;
  if (!allowRootStorePatch) {
    return allowRootActionPatch ? ROOT_PATCH_ACTION_ONLY_DISPATCH_TARGETS : EMPTY_ROOT_PATCH_DISPATCH_TARGETS;
  }
  return allowRootActionPatch ? ROOT_PATCH_DISPATCH_TARGETS_WITH_ACTION : DEFAULT_ROOT_PATCH_DISPATCH_TARGETS;
}

function createSliceDispatchTargetCacheKey(opts: SliceWriteOptions): number {
  return (
    (opts.preferStoreWriter ? 1 : 0) |
    (opts.skipNamespacePatch ? 2 : 0) |
    (opts.allowRootActionPatch ? 4 : 0) |
    (opts.allowRootStorePatch ? 8 : 0)
  );
}

function createMetaTouchDispatchTargetCacheKey(opts?: MetaTouchOptions): number {
  return (
    (opts?.preferStoreWriter ? 1 : 0) |
    (opts?.skipNamespaceTouch ? 2 : 0) |
    (opts?.allowRootActionPatch ? 4 : 0) |
    (opts?.allowRootStorePatch ? 8 : 0)
  );
}

function buildCanonicalDispatchTargetOrder<T>(args: {
  preferPrimary?: boolean;
  skipSecondary?: boolean;
  primary: T;
  secondary: T;
  tailTargets: readonly T[];
}): readonly T[] {
  const out: T[] = [];
  if (args.preferPrimary) out.push(args.primary);
  if (!args.skipSecondary) out.push(args.secondary);
  if (!args.preferPrimary) out.push(args.primary);
  out.push(...args.tailTargets);
  return Object.freeze(out.slice());
}

export function resolveRootPatchDispatchTargets(
  opts?: RootPatchDispatchOptions
): readonly RootPatchDispatchTarget[] {
  return createRootPatchDispatchTargetSet(opts);
}

export function resolveCanonicalMetaTouchOptions(opts?: CanonicalPatchDispatchOptions): MetaTouchOptions {
  const metaTouchOptions = opts?.metaTouchOptions;
  return {
    allowRootActionPatch: metaTouchOptions?.allowRootActionPatch ?? opts?.allowRootActionPatch,
    allowRootStorePatch: metaTouchOptions?.allowRootStorePatch ?? opts?.allowRootStorePatch,
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
    tailTargets: resolveRootPatchDispatchTargets(opts),
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
    tailTargets: resolveRootPatchDispatchTargets(opts),
  });
  metaTouchDispatchTargetsCache.set(key, out);
  return out;
}
