import type { BuilderDoorMapsConfigLike, ConfigStateLike, UiStateLike, UnknownRecord } from '../../../types';

/**
 * Explicit bridge from closed canonical store slices to builder seams that intentionally
 * accept extension records. Runtime values are plain state records; keeping the assertion
 * here prevents open index signatures from leaking back into ConfigStateLike / UiStateLike.
 */
export function asBuilderDoorMapsConfig(config: ConfigStateLike): BuilderDoorMapsConfigLike;
export function asBuilderDoorMapsConfig(
  config: ConfigStateLike | null | undefined
): BuilderDoorMapsConfigLike | undefined;
export function asBuilderDoorMapsConfig(
  config: ConfigStateLike | null | undefined
): BuilderDoorMapsConfigLike | undefined {
  return config == null ? undefined : (config as unknown as BuilderDoorMapsConfigLike);
}

export function asBuilderOpenStateRecord(
  value: ConfigStateLike | UiStateLike | null | undefined
): UnknownRecord | null | undefined {
  return value == null ? value : (value as unknown as UnknownRecord);
}
