import type {
  DesignTabColorActionFailureResult,
  DesignTabColorActionKind,
} from './design_tab_color_action_types.js';

export function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readKind(value: unknown): DesignTabColorActionKind | null {
  switch (trimString(value)) {
    case 'reorder-swatches':
      return 'reorder-swatches';
    case 'toggle-lock':
      return 'toggle-lock';
    case 'delete-color':
      return 'delete-color';
    case 'upload-texture':
      return 'upload-texture';
    case 'save-custom-color':
      return 'save-custom-color';
    case 'remove-texture':
      return 'remove-texture';
    default:
      return null;
  }
}

export function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function readOptionalString(value: unknown): string | undefined {
  const text = trimString(value);
  return text || undefined;
}

export function readRequiredString(value: unknown): string | null {
  const text = trimString(value);
  return text || null;
}

export function isFailureResult(
  value: DesignTabColorActionFailureResult | null | undefined
): value is DesignTabColorActionFailureResult {
  return !!value && value.ok === false;
}
