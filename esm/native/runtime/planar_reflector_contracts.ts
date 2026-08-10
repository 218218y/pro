import type { UnknownRecord } from '../../../types/index.js';

export type PlanarReflectorState = {
  renderTarget: UnknownRecord;
  virtualCamera: UnknownRecord;
  textureMatrix: UnknownRecord;
  material: UnknownRecord;
  originalMaterial?: unknown;
  faceSign: number;
  normalSign: number;
  clipBias: number;
  updateCount: number;
  surfaceObject: UnknownRecord;
  reflectorWorldPosition: UnknownRecord;
  cameraWorldPosition: UnknownRecord;
  rotationMatrix: UnknownRecord;
  normal: UnknownRecord;
  view: UnknownRecord;
  targetVector: UnknownRecord;
  lookAtPosition: UnknownRecord;
  clipPlane: UnknownRecord;
  reflectorPlane: UnknownRecord;
  q: UnknownRecord;
  cacheKey?: string;
  consecutiveFailureCount?: number;
  lastFailureReason?: PlanarReflectorRenderFailureReason;
  lastFailureAtMs?: number;
  retryAfterMs?: number;
};

export type PlanarReflectorMirrorStats = {
  mirrorCount: number;
  planarCount: number;
  cubeCount: number;
  explicitCubeCount: number;
};

export type PlanarMirrorRefreshResult = {
  refreshed: boolean;
  mirrorCount: number;
  planarCount: number;
  cubeCount: number;
  attemptedCount: number;
  refreshedCount: number;
  failedCount: number;
  deferredCount: number;
  backoffDeferredCount: number;
  nextIndex: number;
  completedCycle: boolean;
  firstFailureReason: PlanarReflectorRenderFailureReason | null;
  failureCounts: Partial<Record<PlanarReflectorRenderFailureReason, number>>;
  skippedReason: string | null;
};

export type PlanarMirrorRefreshOptions = {
  maxSurfaces?: number | null;
  maxBudgetMs?: number | null;
  startIndex?: number | null;
  now?: (() => number) | null;
  /**
   * Refresh only newly installed reflector targets. Rebuilds mark mirror tracking dirty even
   * when most mirrors were only recreated from the previous build; this mode prevents a
   * single added mirror from re-rendering every existing door mirror.
   */
  initialOnly?: boolean | null;
};

export type PlanarReflectorRenderFailureReason =
  | 'renderer-surface-incomplete'
  | 'backface-culled'
  | 'reflector-plane-invalid'
  | 'projection-matrix-invalid'
  | 'clip-plane-degenerate'
  | 'render-exception';

export type PlanarReflectorRenderResult =
  { ok: true } | { ok: false; reason: PlanarReflectorRenderFailureReason };
