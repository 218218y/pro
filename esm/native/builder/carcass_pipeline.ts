// esm/native/builder/carcass_pipeline.js
// Carcass/frame pipeline extracted from builder/core.js.
// Pure-ESM, store-driven, DOM-free. Fail-fast by design.

import type {
  BuilderApplyCarcassContextLike,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  CarcassOpsLike,
  RenderOpsLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { computeCarcassOps } from './pure_api.js';

function asFiniteNumber(v: unknown, name: string): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`[WardrobePro] Carcass pipeline: ${name} must be a finite number`);
  }
  return n;
}

type PartIdLike = {
  partId?: unknown;
};

type ApplyCarcassAndGetCabinetMetricsArgs = {
  App?: BuilderApplyCarcassContextLike['App'];
  THREE?: BuilderApplyCarcassContextLike['THREE'];
  cfg?: unknown;
  totalW?: number;
  D?: number;
  H?: number;
  woodThick?: number;
  baseType?: string;
  baseLegStyle?: string;
  baseLegHeightCm?: number | string;
  baseLegWidthCm?: number | string;
  doorsCount?: number;
  hasCornice?: boolean;
  corniceType?: string;
  // In sketch mode, caller passes the outline function; otherwise null/undefined.
  // (Historically this was a boolean, but render ops expects a function.)
  addOutlines?: BuilderApplyCarcassContextLike['addOutlines'];
  __sketchMode?: boolean;
  legMat?: unknown;
  masoniteMat?: unknown;
  whiteMat?: unknown;
  bodyMat?: unknown;
  getPartColorValue?: BuilderPartColorResolver;
  getPartMaterial?: BuilderPartMaterialResolver;
  baseHeight?: number;
  startY?: number;
  moduleInternalWidths?: number[] | null;
  moduleHeightsTotal?: number[] | null;
  moduleDepthsTotal?: number[] | null;
  // Optional prefix for partIds (used for stack-split bottom stack)
  partIdPrefix?: string;
};

function getRequiredPartId(node: unknown, path: string): string {
  const obj = asRecord<PartIdLike>(node);
  const pid = obj?.partId;
  if (typeof pid !== 'string' || !pid) {
    throw new Error(`[WardrobePro] Carcass pipeline: missing required ${path}`);
  }
  return pid;
}

function applyPartIdPrefixToCarcassOps(carcassOps: CarcassOpsLike, prefix: string) {
  const pfx = typeof prefix === 'string' ? prefix : '';
  if (!pfx) return;

  const pref = (id: unknown) => (typeof id === 'string' && id ? pfx + id : id);

  const base = asRecord<PartIdLike>(carcassOps.base);
  if (typeof base?.partId === 'string') {
    base.partId = pref(base.partId);
  }

  const cornice = asRecord<PartIdLike>(carcassOps.cornice);
  if (typeof cornice?.partId === 'string') {
    cornice.partId = pref(cornice.partId);
  }

  const boards = Array.isArray(carcassOps.boards) ? carcassOps.boards : [];
  for (let i = 0; i < boards.length; i++) {
    const board = asRecord<PartIdLike>(boards[i]);
    const pid = board?.partId;
    if (typeof pid !== 'string' || !pid) continue;
    if (pid.startsWith('body_')) board.partId = pfx + pid;
  }
}

function readApplyCarcassOps(renderOps: RenderOpsLike | null): RenderOpsLike['applyCarcassOps'] | null {
  return typeof renderOps?.applyCarcassOps === 'function' ? renderOps.applyCarcassOps : null;
}

function isCarcassOpsLike(value: unknown): value is CarcassOpsLike {
  const rec = asRecord<CarcassOpsLike>(value);
  if (!rec) return false;
  if (typeof rec.baseHeight !== 'number') return false;
  if (typeof rec.startY !== 'number') return false;
  if (typeof rec.cabinetBodyHeight !== 'number') return false;
  if (!Array.isArray(rec.boards)) return false;
  return !!asRecord(rec.backPanel);
}

function createApplyCarcassContext(
  args: ApplyCarcassAndGetCabinetMetricsArgs,
  app: UnknownRecord,
  plinthMat: unknown,
  corniceMat: unknown
): BuilderApplyCarcassContextLike {
  return {
    THREE: args.THREE,
    App: app,
    addOutlines: args.addOutlines,
    getPartMaterial: args.getPartMaterial,
    __sketchMode: args.__sketchMode,
    legMat: args.legMat,
    masoniteMat: args.masoniteMat,
    whiteMat: args.whiteMat,
    bodyMat: args.bodyMat,
    plinthMat,
    corniceMat,
  };
}

/**
 * Compute carcass ops (pure layer) and render them (render ops layer), then return cabinet metrics.
 *
 * @param {object} args
 * @param {unknown} args.App
 * @param {unknown} args.THREE
 * @param {unknown} args.cfg
 * @param {number} args.totalW
 * @param {number} args.D
 * @param {number} args.H
 * @param {number} args.woodThick
 * @param {string} args.baseType
 * @param {number} args.doorsCount
 * @param {boolean} args.hasCornice
 * @param {((mesh: unknown) => unknown)|null|undefined} args.addOutlines
 * @param {boolean} args.__sketchMode
 * @param {unknown} args.legMat
 * @param {unknown} args.masoniteMat
 * @param {unknown} args.whiteMat
 * @param {unknown} args.bodyMat
 * @param {(partId: string) => (string|null|undefined)} args.getPartColorValue
 * @param {(partId: string) => unknown} args.getPartMaterial
 * @param {number} args.baseHeight
 * @param {number} args.startY
 *
 * @returns {{ baseHeight: number, startY: number, cabinetBodyHeight: number, cabinetTopY: number, carcassOps: import('../../../types').CarcassOpsLike }}
 */
export function applyCarcassAndGetCabinetMetrics(
  args: ApplyCarcassAndGetCabinetMetricsArgs | null | undefined
) {
  const safeArgs = args ?? {};
  const app = asRecord<BuilderApplyCarcassContextLike['App']>(safeArgs.App);
  if (!app) throw new Error('[WardrobePro] Carcass pipeline: App is required');

  const cfgObj = asRecord(safeArgs.cfg);
  const isMultiColorMode = !!cfgObj?.isMultiColorMode;

  const totalWn = asFiniteNumber(safeArgs.totalW, 'totalW');
  const Dn = asFiniteNumber(safeArgs.D, 'D');
  const Hn = asFiniteNumber(safeArgs.H, 'H');
  const woodThickN = asFiniteNumber(safeArgs.woodThick, 'woodThick');

  const doorsCountN =
    typeof safeArgs.doorsCount === 'number' ? safeArgs.doorsCount : Number(safeArgs.doorsCount ?? 0);
  const safeDoorsCount = Number.isFinite(doorsCountN) ? doorsCountN : 0;

  const baseTypeStr = typeof safeArgs.baseType === 'string' ? safeArgs.baseType : '';
  let baseHeight = typeof safeArgs.baseHeight === 'number' ? safeArgs.baseHeight : 0;
  let startY = typeof safeArgs.startY === 'number' ? safeArgs.startY : 0;

  const carcassOpsRaw = computeCarcassOps({
    totalW: totalWn,
    D: Dn,
    H: Hn,
    woodThick: woodThickN,
    baseType: baseTypeStr,
    baseLegStyle: safeArgs.baseLegStyle,
    baseLegHeightCm: safeArgs.baseLegHeightCm,
    baseLegWidthCm: safeArgs.baseLegWidthCm,
    doorsCount: safeDoorsCount,
    hasCornice: !!safeArgs.hasCornice,
    corniceType: typeof safeArgs.corniceType === 'string' ? safeArgs.corniceType : undefined,
    moduleInternalWidths: safeArgs.moduleInternalWidths,
    moduleHeightsTotal: safeArgs.moduleHeightsTotal,
    moduleDepthsTotal: safeArgs.moduleDepthsTotal,
  });

  if (!isCarcassOpsLike(carcassOpsRaw)) {
    throw new Error('[WardrobePro] Carcass ops invalid');
  }

  const carcassOps = carcassOpsRaw;

  if (safeArgs.partIdPrefix && typeof safeArgs.partIdPrefix === 'string') {
    applyPartIdPrefixToCarcassOps(carcassOps, safeArgs.partIdPrefix);
  }

  if (typeof carcassOps.baseHeight === 'number') baseHeight = carcassOps.baseHeight;
  if (typeof carcassOps.startY === 'number') startY = carcassOps.startY;

  const cabinetBodyHeight = Hn - baseHeight;
  const cabinetTopY = startY + cabinetBodyHeight;

  const applyCarcassOps = readApplyCarcassOps(getBuilderRenderOps(app));
  if (!applyCarcassOps) {
    throw new Error('[WardrobePro] Carcass ops missing: applyCarcassOps');
  }

  let plinthMat: unknown = null;
  let corniceMat: unknown = null;

  if (baseTypeStr === 'plinth') {
    plinthMat = safeArgs.bodyMat;
    const pid = getRequiredPartId(carcassOps.base, 'carcassOps.base.partId');
    if (
      isMultiColorMode &&
      typeof safeArgs.getPartColorValue === 'function' &&
      safeArgs.getPartColorValue(pid)
    ) {
      plinthMat =
        typeof safeArgs.getPartMaterial === 'function' ? safeArgs.getPartMaterial(pid) : safeArgs.bodyMat;
    }
  }

  if (safeArgs.hasCornice) {
    corniceMat = safeArgs.bodyMat;
    const pid = getRequiredPartId(carcassOps.cornice, 'carcassOps.cornice.partId');
    if (
      isMultiColorMode &&
      typeof safeArgs.getPartColorValue === 'function' &&
      safeArgs.getPartColorValue(pid)
    ) {
      corniceMat =
        typeof safeArgs.getPartMaterial === 'function' ? safeArgs.getPartMaterial(pid) : safeArgs.bodyMat;
    }
  }

  const ok = applyCarcassOps(carcassOps, createApplyCarcassContext(safeArgs, app, plinthMat, corniceMat));

  if (!ok) {
    throw new Error('[WardrobePro] Carcass ops render failed (applyCarcassOps returned falsy)');
  }

  return { baseHeight, startY, cabinetBodyHeight, cabinetTopY, carcassOps };
}
