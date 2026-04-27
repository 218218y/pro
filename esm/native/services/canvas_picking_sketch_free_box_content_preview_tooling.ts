export function resolveSketchShelfVariant(tool: string): string {
  const rawShelf = tool.slice('sketch_shelf:'.length).trim();
  const at = rawShelf.indexOf('@');
  return (at >= 0 ? rawShelf.slice(0, at) : rawShelf).trim() || 'regular';
}

export function resolveSketchShelfDepthOverrideM(tool: string): number | null {
  const rawShelf = tool.slice('sketch_shelf:'.length).trim();
  const at = rawShelf.indexOf('@');
  const depthCm = at >= 0 ? Number(rawShelf.slice(at + 1).trim()) : NaN;
  return Number.isFinite(depthCm) && depthCm > 0 ? depthCm / 100 : null;
}

export function resolveSketchStorageHeight(tool: string): number {
  const rawStorage = tool.slice('sketch_storage:'.length).trim();
  const storageCm = Number(rawStorage);
  return Number.isFinite(storageCm) && storageCm > 0 ? Math.max(0.05, storageCm / 100) : 0.5;
}
