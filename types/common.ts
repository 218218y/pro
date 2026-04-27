// Shared base types for gradual TypeScript adoption.
// Keep these permissive enough for migration, but prefer `unknown` over broad call/record bags
// so consumers must narrow intentionally.

/** Safer record bag (unknown values). Prefer this over loose dictionary bags. */
export type UnknownRecord = Record<string, unknown>;

/** Canonical unknown argument tuple for generic callable helpers. */
export type UnknownArgs = readonly unknown[];

/** Generic unknown callable. */
export type UnknownCallable<Args extends UnknownArgs = UnknownArgs, Result = unknown> = (
  ...args: Args
) => Result;

/** Generic async callable. */
export type UnknownAsyncFn<Args extends UnknownArgs = UnknownArgs, Result = unknown> = (
  ...args: Args
) => Promise<Result>;

/** Generic callable that may be absent. */
export type NullableUnknownCallable<
  Args extends UnknownArgs = UnknownArgs,
  Result = unknown,
> = UnknownCallable<Args, Result> | null;

/** Generic bag-of-things namespace used across the app container. */
export interface Namespace {
  [k: string]: unknown;
}
