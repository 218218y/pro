import type { CanvasPickingInteriorExtension } from './canvas_picking_interior_extension_registry.js';

let interiorExtensionLoad: Promise<CanvasPickingInteriorExtension> | null = null;

export function loadCanvasPickingInteriorExtension(): Promise<CanvasPickingInteriorExtension> {
  if (interiorExtensionLoad) return interiorExtensionLoad;
  interiorExtensionLoad = import('./canvas_picking_interior_extension.js').then(module =>
    module.installCanvasPickingInteriorExtension()
  );
  return interiorExtensionLoad;
}
