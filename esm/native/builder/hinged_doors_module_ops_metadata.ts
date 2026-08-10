export function attachHiddenModuleDoors<T extends object>(op: T, moduleDoors: unknown): T {
  if (typeof moduleDoors !== 'number' || !Number.isFinite(moduleDoors)) return op;
  Object.defineProperty(op, 'moduleDoors', {
    value: Math.max(1, Math.floor(moduleDoors)),
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return op;
}

export function attachHiddenCarcassMountFaceX<T extends object>(op: T, value: unknown): T {
  if (typeof value !== 'number' || !Number.isFinite(value)) return op;
  Object.defineProperty(op, 'carcassMountFaceX', {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return op;
}
