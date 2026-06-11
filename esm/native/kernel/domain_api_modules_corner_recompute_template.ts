import type { ModuleCfgItem } from './domain_api_modules_corner_shared.js';
import {
  clonePrevModuleOnto,
  createSeedModules,
  flipDefaultLayout,
  needsModulesRecompute,
  readNeighborLayout,
  setDefaultModuleLayout,
  type DomainApiModulesCornerRecomputeRuntime,
} from './domain_api_modules_corner_recompute_shared.js';

interface SpanLike {
  i: number;
  start: number;
  end: number;
  center: number;
}

interface PairLike {
  overlap: number;
  dist: number;
  oi: number;
  ni: number;
}

function sumDoors(sig: number[]): number {
  let sum = 0;
  for (let i = 0; i < sig.length; i++) sum += Math.max(0, Math.round(sig[i] || 0));
  return sum;
}

function makeSpans(sig: number[]): SpanLike[] {
  const spans: SpanLike[] = [];
  let cur = 0;
  for (let i = 0; i < sig.length; i++) {
    const width = Math.max(0, Math.round(sig[i] || 0));
    const start = cur;
    const end = cur + width;
    spans.push({ i, start, end, center: start + (end - start) / 2 });
    cur = end;
  }
  return spans;
}

function applyPreservedTemplate(
  runtime: DomainApiModulesCornerRecomputeRuntime,
  newModules: ModuleCfgItem[]
): void {
  const preserveTemplate =
    !!runtime.options.preserveTemplate ||
    (typeof runtime.meta.source === 'string' &&
      (runtime.meta.source.indexOf('react:structure:doors') >= 0 ||
        runtime.meta.source.indexOf('ui:doors') >= 0));

  if (!preserveTemplate || !runtime.currentModules.length) return;

  const anchorSide: 'left' | 'right' =
    runtime.options &&
    typeof runtime.options.anchorSide === 'string' &&
    runtime.options.anchorSide === 'right'
      ? 'right'
      : 'left';

  const oldLen = runtime.currentModules.length;
  const newLen = newModules.length;
  const common = Math.min(oldLen, newLen);
  const newSig = runtime.modulesStructure.map(ms => (ms && typeof ms.doors === 'number' ? ms.doors : 2));
  const sumOld = sumDoors(runtime.currentModulesStructure);
  const sumNew = sumDoors(newSig);

  if (sumOld === sumNew && sumNew > 0 && oldLen && newLen) {
    const oldSpans = makeSpans(runtime.currentModulesStructure);
    const newSpans = makeSpans(newSig);
    const pairs: PairLike[] = [];
    for (let oi = 0; oi < oldSpans.length; oi++) {
      const oldSpan = oldSpans[oi];
      for (let ni = 0; ni < newSpans.length; ni++) {
        const newSpan = newSpans[ni];
        const overlap = Math.min(oldSpan.end, newSpan.end) - Math.max(oldSpan.start, newSpan.start);
        if (overlap > 0) {
          const dist = Math.abs(oldSpan.center - newSpan.center);
          pairs.push({ overlap, dist, oi, ni });
        }
      }
    }

    pairs.sort(function (a, b) {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      if (a.dist !== b.dist) return a.dist - b.dist;
      if (a.oi !== b.oi) return a.oi - b.oi;
      return a.ni - b.ni;
    });

    const usedOld: Record<number, boolean> = {};
    const usedNew: Record<number, boolean> = {};
    const assignedNewToOld: Record<number, number> = {};
    const targetPairs = oldLen <= newLen ? oldLen : newLen;
    let picked = 0;
    for (let p = 0; p < pairs.length && picked < targetPairs; p++) {
      const pair = pairs[p];
      if (usedOld[pair.oi] || usedNew[pair.ni]) continue;
      usedOld[pair.oi] = true;
      usedNew[pair.ni] = true;
      assignedNewToOld[pair.ni] = pair.oi;
      picked++;
    }

    for (let ni = 0; ni < newLen; ni++) {
      const oi = assignedNewToOld[ni];
      if (oi == null) continue;
      newModules[ni] = clonePrevModuleOnto(
        newModules[ni],
        runtime.currentModules[oi],
        ni,
        newModules[ni].doors
      );
    }

    if (!runtime.isLibraryMode && newLen > oldLen) {
      const unassigned: number[] = [];
      for (let ni = 0; ni < newLen; ni++) {
        if (assignedNewToOld[ni] == null) unassigned.push(ni);
      }
      unassigned.sort((a, b) => a - b);

      let u = 0;
      while (u < unassigned.length) {
        const segStart = unassigned[u];
        let segEnd = segStart;
        while (u + 1 < unassigned.length && unassigned[u + 1] === segEnd + 1) {
          u++;
          segEnd = unassigned[u];
        }

        const isAssigned = function (i: number): boolean {
          return assignedNewToOld[i] != null;
        };

        let left = segStart - 1;
        while (left >= 0 && !isAssigned(left)) left--;

        let right = segEnd + 1;
        while (right < newLen && !isAssigned(right)) right++;

        const hasLeft = left >= 0;
        const hasRight = right < newLen;

        if (hasLeft && (!hasRight || segStart - left <= right - segEnd)) {
          const anchorLayout = readNeighborLayout(newModules, left);
          let cur = flipDefaultLayout(anchorLayout);
          for (let i = segStart; i <= segEnd; i++) {
            setDefaultModuleLayout(newModules, i, cur);
            cur = flipDefaultLayout(cur);
          }
        } else if (hasRight) {
          const anchorLayout = readNeighborLayout(newModules, right);
          let cur = flipDefaultLayout(anchorLayout);
          for (let i = segEnd; i >= segStart; i--) {
            setDefaultModuleLayout(newModules, i, cur);
            cur = flipDefaultLayout(cur);
          }
        } else {
          let cur: 'shelves' | 'hanging_top2' = 'shelves';
          for (let i = segStart; i <= segEnd; i++) {
            setDefaultModuleLayout(newModules, i, cur);
            cur = flipDefaultLayout(cur);
          }
        }

        u++;
      }
    }
    return;
  }

  if (anchorSide === 'right') {
    const startNew = newLen - common;
    const startOld = oldLen - common;
    for (let i = 0; i < common; i++) {
      const ni = startNew + i;
      const oi = startOld + i;
      newModules[ni] = clonePrevModuleOnto(
        newModules[ni],
        runtime.currentModules[oi],
        ni,
        newModules[ni].doors
      );
    }

    if (!runtime.isLibraryMode && newLen > oldLen) {
      const neighborLayout = readNeighborLayout(newModules, startNew);
      const startLayout = flipDefaultLayout(neighborLayout);
      for (let offset = 0; offset < startNew; offset++) {
        const i = startNew - 1 - offset;
        const layout = offset % 2 === 0 ? startLayout : flipDefaultLayout(startLayout);
        setDefaultModuleLayout(newModules, i, layout);
      }
    }
    return;
  }

  for (let i = 0; i < common; i++) {
    newModules[i] = clonePrevModuleOnto(newModules[i], runtime.currentModules[i], i, newModules[i].doors);
  }

  if (!runtime.isLibraryMode && newLen > oldLen) {
    const prevLayout = oldLen > 0 ? readNeighborLayout(newModules, oldLen - 1) : null;
    const startLayout = flipDefaultLayout(prevLayout);
    for (let i = oldLen; i < newLen; i++) {
      const ordinal = i - oldLen;
      const layout = ordinal % 2 === 0 ? startLayout : flipDefaultLayout(startLayout);
      setDefaultModuleLayout(newModules, i, layout);
    }
  }
}

export function buildRecomputedModules(runtime: DomainApiModulesCornerRecomputeRuntime): ModuleCfgItem[] {
  const newModules = createSeedModules(runtime);
  if (!needsModulesRecompute(runtime)) {
    for (let i = 0; i < newModules.length; i++) {
      const prev = runtime.currentModules[i];
      if (prev && typeof prev === 'object') {
        newModules[i] = clonePrevModuleOnto(newModules[i], prev, i, newModules[i].doors);
      }
    }
    return newModules;
  }

  if (
    runtime.currentModules.length &&
    runtime.currentModulesStructure.length === runtime.modulesStructure.length
  ) {
    let sameSig = true;
    for (let j = 0; j < runtime.currentModulesStructure.length; j++) {
      if (
        runtime.currentModulesStructure[j] !==
        (runtime.modulesStructure[j] && runtime.modulesStructure[j].doors)
      ) {
        sameSig = false;
        break;
      }
    }
    if (sameSig) {
      for (let k = 0; k < newModules.length; k++) {
        const prev = runtime.currentModules[k];
        if (prev && typeof prev === 'object') {
          newModules[k] = clonePrevModuleOnto(newModules[k], prev, k, newModules[k].doors);
        }
      }
      return newModules;
    }
  }

  applyPreservedTemplate(runtime, newModules);
  return newModules;
}
