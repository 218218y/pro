import type {
  BuilderContentsRenderPolicy,
  BuilderCreateDoorVisualFn,
  BuilderDoorVisualOptions,
} from '../../../types/index.js';

function readDoorVisualOptions(value: unknown): BuilderDoorVisualOptions {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as BuilderDoorVisualOptions)
    : {};
}

export function bindDoorVisualRenderPolicy(
  createDoorVisual: BuilderCreateDoorVisualFn,
  renderPolicy: BuilderContentsRenderPolicy
): BuilderCreateDoorVisualFn {
  return (...args) => {
    const nextArgs = [...args] as Parameters<BuilderCreateDoorVisualFn>;
    nextArgs[13] = {
      ...readDoorVisualOptions(args[13]),
      renderPolicy,
    };
    return createDoorVisual(...nextArgs);
  };
}
