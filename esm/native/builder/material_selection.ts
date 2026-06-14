import type { SavedColorLike, UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';

export type FrontMaterialGetter = (
  color: string | null,
  type: string,
  useCustomTexture?: boolean,
  customTextureDataURL?: string | null
) => unknown;

export type MaterialSelectionCfgLike = UnknownRecord & {
  customUploadedDataURL?: unknown;
  savedColors?: unknown;
};

export type MaterialSelectionStringifier = (value: unknown, defaultValue?: string) => string;

export type FrontMaterialInput = {
  colorKey: string;
  useTexture: boolean;
  textureDataURL: string | null;
};

function asCfg(value: unknown): MaterialSelectionCfgLike {
  return asRecord<MaterialSelectionCfgLike>(value) || {};
}

function toText(value: unknown, fallback: string, toStr?: MaterialSelectionStringifier): string {
  if (typeof toStr === 'function') return String(toStr(value, fallback) || fallback);
  if (value == null) return fallback;
  return String(value || fallback);
}

function readTextureDataURL(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function readSavedColors(cfgLike: unknown): SavedColorLike[] {
  const cfg = asCfg(cfgLike);
  const list = Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
  const out: SavedColorLike[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const entry = asRecord<SavedColorLike>(list[index]);
    if (entry && typeof entry.id === 'string' && entry.id) out.push(entry);
  }
  return out;
}

export function findSavedColorById(cfgLike: unknown, id: string): SavedColorLike | null {
  const savedColors = readSavedColors(cfgLike);
  for (let index = 0; index < savedColors.length; index += 1) {
    const saved = savedColors[index];
    if (saved.id === id) return saved;
  }
  return null;
}

export function resolveGlobalFrontMaterialInput(args: {
  colorChoice?: unknown;
  customColor?: unknown;
  cfg: unknown;
  defaultColor?: string;
  toStr?: MaterialSelectionStringifier;
}): FrontMaterialInput {
  const cfg = asCfg(args.cfg);
  const fallback = args.defaultColor || '#ffffff';
  const colorChoice = toText(args.colorChoice, fallback, args.toStr);
  const customColor = toText(args.customColor, fallback, args.toStr);

  if (colorChoice === 'custom') {
    const textureDataURL = readTextureDataURL(cfg.customUploadedDataURL);
    if (textureDataURL) return { colorKey: colorChoice, useTexture: true, textureDataURL };
    return { colorKey: customColor, useTexture: false, textureDataURL: null };
  }

  if (colorChoice.startsWith('saved_')) {
    const saved = findSavedColorById(cfg, colorChoice);
    if (saved) {
      const textureDataURL = readTextureDataURL(saved.textureData);
      if (saved.type === 'texture' && textureDataURL) {
        return { colorKey: saved.id, useTexture: true, textureDataURL };
      }
      if (typeof saved.value === 'string' && saved.value) {
        return { colorKey: saved.value, useTexture: false, textureDataURL: null };
      }
    }
  }

  return { colorKey: colorChoice, useTexture: false, textureDataURL: null };
}

export function resolveSelectionFrontMaterial(args: {
  selection: unknown;
  cfg: unknown;
  getMaterial: FrontMaterialGetter;
  customColor?: unknown;
  defaultColor?: string;
  toStr?: MaterialSelectionStringifier;
}): unknown {
  const fallback = args.defaultColor || '#ffffff';
  const selection = toText(args.selection, '', args.toStr);
  if (selection === 'custom') {
    if (args.customColor != null) {
      return args.getMaterial(toText(args.customColor, fallback, args.toStr), 'front', false);
    }
    return args.getMaterial(selection, 'front', false);
  }

  if (selection.startsWith('saved_')) {
    const saved = findSavedColorById(args.cfg, selection);
    if (saved) {
      const textureDataURL = readTextureDataURL(saved.textureData);
      if (saved.type === 'texture' && textureDataURL) {
        return args.getMaterial(saved.id, 'front', true, textureDataURL);
      }
      if (typeof saved.value === 'string' && saved.value) {
        return args.getMaterial(saved.value, 'front', false);
      }
    }
  }

  return args.getMaterial(selection, 'front', false);
}
