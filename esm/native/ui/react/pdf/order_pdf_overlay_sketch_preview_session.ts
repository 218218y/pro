export type OrderPdfSketchPreviewSessionSnapshot<TCameraPose = unknown> = {
  sketchMode: boolean;
  doorsOpen: boolean | null;
  cameraPose: TCameraPose | null;
};

export function readOrderPdfSketchPreviewSessionMode(args: {
  readSketchMode: () => boolean;
  fallback?: boolean;
}): boolean {
  const fallback = !!args.fallback;
  try {
    return !!args.readSketchMode();
  } catch {
    return fallback;
  }
}

export function readOrderPdfSketchPreviewSessionDoorsOpen(args: {
  readDoorsOpen: () => boolean;
  fallback?: boolean;
}): boolean {
  const fallback = !!args.fallback;
  try {
    return !!args.readDoorsOpen();
  } catch {
    return fallback;
  }
}

export function readOrderPdfSketchPreviewSessionCameraPose<TCameraPose>(args: {
  readCameraPose: () => TCameraPose | null;
  fallback?: TCameraPose | null;
}): TCameraPose | null {
  try {
    const pose = args.readCameraPose();
    return pose == null ? (args.fallback ?? null) : pose;
  } catch {
    return args.fallback ?? null;
  }
}

export function captureOrderPdfSketchPreviewSessionSnapshot<TCameraPose = unknown>(args: {
  readSketchMode: () => boolean;
  readDoorsOpen?: (() => boolean) | null;
  readCameraPose?: (() => TCameraPose | null) | null;
}): OrderPdfSketchPreviewSessionSnapshot<TCameraPose> {
  const readDoorsOpen = typeof args.readDoorsOpen === 'function' ? args.readDoorsOpen : null;
  const readCameraPose = typeof args.readCameraPose === 'function' ? args.readCameraPose : null;
  return {
    sketchMode: readOrderPdfSketchPreviewSessionMode({
      readSketchMode: args.readSketchMode,
      fallback: false,
    }),
    doorsOpen: readDoorsOpen
      ? readOrderPdfSketchPreviewSessionDoorsOpen({
          readDoorsOpen,
          fallback: false,
        })
      : null,
    cameraPose: readCameraPose
      ? readOrderPdfSketchPreviewSessionCameraPose({
          readCameraPose,
          fallback: null,
        })
      : null,
  };
}

export function restoreOrderPdfSketchPreviewSessionMode(args: {
  originalSketchMode: boolean;
  readSketchMode: () => boolean;
  restoreSketchMode: (next: boolean) => void;
}): void {
  const originalSketchMode = !!args.originalSketchMode;
  const currentSketchMode = readOrderPdfSketchPreviewSessionMode({
    readSketchMode: args.readSketchMode,
    fallback: originalSketchMode,
  });
  if (currentSketchMode === originalSketchMode) return;
  args.restoreSketchMode(originalSketchMode);
}

export function restoreOrderPdfSketchPreviewSessionDoorsOpen(args: {
  originalDoorsOpen: boolean;
  readDoorsOpen: () => boolean;
  restoreDoorsOpen: (next: boolean) => void;
}): void {
  const originalDoorsOpen = !!args.originalDoorsOpen;
  const currentDoorsOpen = readOrderPdfSketchPreviewSessionDoorsOpen({
    readDoorsOpen: args.readDoorsOpen,
    fallback: originalDoorsOpen,
  });
  if (currentDoorsOpen === originalDoorsOpen) return;
  args.restoreDoorsOpen(originalDoorsOpen);
}

export function restoreOrderPdfSketchPreviewSessionSnapshot<TCameraPose = unknown>(args: {
  snapshot: OrderPdfSketchPreviewSessionSnapshot<TCameraPose> | null | undefined;
  readSketchMode: () => boolean;
  restoreSketchMode: (next: boolean) => void;
  readDoorsOpen?: (() => boolean) | null;
  restoreDoorsOpen?: ((next: boolean) => void) | null;
  restoreCameraPose?: ((pose: TCameraPose) => void) | null;
}): void {
  const snapshot = args.snapshot;
  if (!snapshot) return;
  restoreOrderPdfSketchPreviewSessionMode({
    originalSketchMode: snapshot.sketchMode,
    readSketchMode: args.readSketchMode,
    restoreSketchMode: args.restoreSketchMode,
  });
  const readDoorsOpen = typeof args.readDoorsOpen === 'function' ? args.readDoorsOpen : null;
  const restoreDoorsOpen = typeof args.restoreDoorsOpen === 'function' ? args.restoreDoorsOpen : null;
  if (readDoorsOpen && restoreDoorsOpen && typeof snapshot.doorsOpen === 'boolean') {
    restoreOrderPdfSketchPreviewSessionDoorsOpen({
      originalDoorsOpen: snapshot.doorsOpen,
      readDoorsOpen,
      restoreDoorsOpen,
    });
  }
  const restoreCameraPose = typeof args.restoreCameraPose === 'function' ? args.restoreCameraPose : null;
  if (!restoreCameraPose || snapshot.cameraPose == null) return;
  restoreCameraPose(snapshot.cameraPose);
}

export async function runOrderPdfSketchPreviewBuildSession<T, TCameraPose = unknown>(args: {
  readSketchMode: () => boolean;
  restoreSketchMode: (next: boolean) => void;
  readDoorsOpen?: (() => boolean) | null;
  restoreDoorsOpen?: ((next: boolean) => void) | null;
  readCameraPose?: (() => TCameraPose | null) | null;
  restoreCameraPose?: ((pose: TCameraPose) => void) | null;
  build: () => Promise<T>;
}): Promise<T> {
  const snapshot = captureOrderPdfSketchPreviewSessionSnapshot<TCameraPose>({
    readSketchMode: args.readSketchMode,
    readDoorsOpen: args.readDoorsOpen,
    readCameraPose: args.readCameraPose,
  });

  try {
    return await args.build();
  } finally {
    restoreOrderPdfSketchPreviewSessionSnapshot<TCameraPose>({
      snapshot,
      readSketchMode: args.readSketchMode,
      restoreSketchMode: args.restoreSketchMode,
      readDoorsOpen: args.readDoorsOpen,
      restoreDoorsOpen: args.restoreDoorsOpen,
      restoreCameraPose: args.restoreCameraPose,
    });
  }
}
