// Sketch external-drawer door-cut ownership (Pure ESM)
//
// The regular hinged-door builder owns split authoring unless a module contains
// sketch external drawers. Those modules defer split geometry to the post-build
// drawer-cut pass so drawer gaps and authored split lines are composed once.

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function hasSketchExternalDrawerDoorCutsInConfig(configRecord: unknown): boolean {
  const config = readRecord(configRecord);
  const sketchExtras = readRecord(config?.sketchExtras);
  if (!sketchExtras) return false;
  if (Array.isArray(sketchExtras.extDrawers) && sketchExtras.extDrawers.length > 0) return true;

  const boxes = Array.isArray(sketchExtras.boxes) ? sketchExtras.boxes : [];
  for (let i = 0; i < boxes.length; i += 1) {
    const box = readRecord(boxes[i]);
    if (!box) continue;
    if (Array.isArray(box.extDrawers) && box.extDrawers.length > 0) return true;
    if (Array.isArray(box.regularExtDrawers) && box.regularExtDrawers.length > 0) return true;
  }
  return false;
}
