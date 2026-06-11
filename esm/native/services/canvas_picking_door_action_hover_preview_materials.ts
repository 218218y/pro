import type { UnknownRecord } from '../../../types';
import {
  __asObject,
  type PreviewMaterialLike,
} from './canvas_picking_door_action_hover_preview_contracts.js';

function __asPreviewMaterial(value: unknown): PreviewMaterialLike | null {
  return __asObject<PreviewMaterialLike>(value);
}

function __setMaterialColor(mat: unknown, hex: number): void {
  const material = __asPreviewMaterial(mat);
  const color = material?.color;
  try {
    if (color && typeof color.setHex === 'function') color.setHex(hex);
    else if (color && typeof color.set === 'function') color.set(hex);
  } catch {
    // ignore
  }
}

function __setMaterialEmissive(mat: unknown, hex: number, intensity: number): void {
  const material = __asPreviewMaterial(mat);
  const emissive = material?.emissive;
  try {
    if (emissive && typeof emissive.setHex === 'function') emissive.setHex(hex);
    else if (emissive && typeof emissive.set === 'function') emissive.set(hex);
  } catch {
    // ignore
  }
  if (material) {
    material.emissiveIntensity = intensity;
    material.needsUpdate = true;
  }
}

function __setMaterialOpacity(mat: unknown, opacity: number): void {
  const material = __asPreviewMaterial(mat);
  if (!material) return;
  material.transparent = opacity < 0.999;
  material.opacity = opacity;
  material.needsUpdate = true;
}

export function __styleDoorTrimPreview(
  preview: unknown,
  opts: { isRemove: boolean; isCentered: boolean }
): void {
  const previewRec = __asObject<UnknownRecord>(preview);
  if (!previewRec) return;
  const marker = __asObject<UnknownRecord>(previewRec.hoverMarker);
  const mesh = __asObject<UnknownRecord>(previewRec.mesh);
  const parts = [marker?.material, mesh?.material];
  const { isRemove, isCentered } = opts;
  const color = isRemove ? 0xff5a5a : isCentered ? 0xffd04d : 0x5aa7ff;
  const emissive = isRemove ? 0x4a1111 : isCentered ? 0x4a3200 : 0x17336b;
  const opacity = isRemove ? 0.38 : isCentered ? 0.6 : 0.44;
  for (let i = 0; i < parts.length; i++) {
    __setMaterialColor(parts[i], color);
    __setMaterialEmissive(parts[i], emissive, 0.65);
    __setMaterialOpacity(parts[i], opacity);
  }
}

export function __styleMirrorGuidePreview(preview: unknown, opts: { isCentered: boolean }): void {
  if (!opts.isCentered) return;
  const previewRec = __asObject<UnknownRecord>(preview);
  if (!previewRec) return;
  const marker = __asObject<UnknownRecord>(previewRec.hoverMarker);
  const mesh = __asObject<UnknownRecord>(previewRec.mesh);
  const parts = [marker?.material, mesh?.material];
  for (let i = 0; i < parts.length; i++) {
    __setMaterialColor(parts[i], 0xffd04d);
    __setMaterialEmissive(parts[i], 0x4a3200, 0.75);
    __setMaterialOpacity(parts[i], 0.35);
  }
}
