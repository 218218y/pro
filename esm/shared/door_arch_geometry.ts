/** The visible horizontal slice of one arch, in coordinates of the complete arch. */
import type {
  DoorArchCut,
  DoorArchPoint,
  DoorArchProfile,
  DoorArchRect,
  DoorPlacementShape,
} from '../../types/maps.js';
export function readDoorPlacementShape(value: unknown): DoorPlacementShape {
  return value === 'arch' || value === 'arch-down' || value === 'arch-both' || value === 'ellipse'
    ? value
    : 'straight';
}

function unit(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function readDoorArchProfile(value: unknown): DoorArchProfile | null {
  if (!value || typeof value !== 'object') return null;
  const { start, end, rise, link, shape, fitToFront } = value as Partial<DoorArchProfile>;
  if (!unit(start) || !unit(end) || !unit(rise) || end <= start || rise <= 0) return null;
  if (link !== undefined && (typeof link !== 'string' || !link || link.length > 240)) return null;
  if (shape !== undefined && shape !== 'arch-down' && shape !== 'arch-both' && shape !== 'ellipse')
    return null;
  if (fitToFront !== undefined && fitToFront !== true) return null;
  return {
    start,
    end,
    rise,
    ...(link ? { link } : {}),
    ...(shape ? { shape } : {}),
    ...(fitToFront ? { fitToFront } : {}),
  };
}

function readDoorArchCut(value: unknown): DoorArchCut | null {
  if (!value || typeof value !== 'object') return null;
  const { peak, base, profile } = value as Partial<DoorArchCut>;
  const arch = readDoorArchProfile(profile);
  if (!arch || arch.fitToFront || !unit(peak)) return null;
  if (!arch.shape) return base === undefined && peak > arch.rise && peak < 1 ? { peak, profile: arch } : null;
  if (!unit(base) || base <= 0 || peak <= base) return null;
  if (arch.shape === 'arch-down') {
    if (peak !== 1 || arch.rise >= peak - base) return null;
  } else if (peak >= 1 || arch.rise * 2 > peak - base + 1e-9) {
    return null;
  }
  return { peak, base, profile: arch };
}

export function readDoorArchCuts(value: unknown): DoorArchCut[] {
  // Projects saved before multi-cut authoring stored one cut at the same key.
  const entries: unknown[] = Array.isArray(value) ? value : [value];
  return entries.flatMap(entry => {
    const cut = readDoorArchCut(entry);
    return cut ? [cut] : [];
  });
}

export function isDoorArchCutKey(key: string): boolean {
  return /^splitarch_(?:d[1-9]\d*|desk_[a-zA-Z0-9_-]+)$/.test(key);
}

export function doorArchSpan(rect: DoorArchRect, profile: DoorArchProfile, x: number) {
  const u = profile.start + ((profile.end - profile.start) * (x - rect.minX)) / (rect.maxX - rect.minX);
  const rise = profile.shape === 'ellipse' ? 0.5 : profile.rise;
  const delta = (rect.maxY - rect.minY) * rise * (1 - Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)));
  return {
    minY: profile.shape ? rect.minY + delta : rect.minY,
    maxY: profile.shape === 'arch-down' ? rect.maxY : rect.maxY - delta,
  };
}

export function sampleDoorArch(
  rect: DoorArchRect,
  profile: DoorArchProfile,
  edge: 'minY' | 'maxY' = 'maxY'
): DoorArchPoint[] {
  const first = Math.acos(1 - 2 * profile.start);
  const last = Math.acos(1 - 2 * profile.end);
  const angles = [first, last];
  for (let i = 1; i < 48; i++) {
    const angle = (i * Math.PI) / 48;
    if (angle > first + 1e-8 && angle < last - 1e-8) angles.push(angle);
  }
  return angles
    .sort((a, b) => a - b)
    .map(angle => {
      const fraction = ((1 - Math.cos(angle)) / 2 - profile.start) / (profile.end - profile.start);
      const x = rect.minX + (rect.maxX - rect.minX) * Math.max(0, Math.min(1, fraction));
      return { x, y: doorArchSpan(rect, profile, x)[edge] };
    });
}

export function doorArchOutline(
  rect: DoorArchRect,
  profile: DoorArchProfile,
  contour?: readonly DoorArchPoint[]
): DoorArchPoint[] {
  if (profile.fitToFront && contour) return contour.slice();
  const top =
    profile.shape === 'arch-down'
      ? [
          { x: rect.minX, y: rect.maxY },
          { x: rect.maxX, y: rect.maxY },
        ]
      : sampleDoorArch(rect, profile);
  const bottom = profile.shape
    ? sampleDoorArch(rect, profile, 'minY')
    : [
        { x: rect.minX, y: rect.minY },
        { x: rect.maxX, y: rect.minY },
      ];
  return [...top, ...bottom.reverse()];
}

export function containsDoorArchPoint(
  rect: DoorArchRect,
  profile: DoorArchProfile,
  point: DoorArchPoint
): boolean {
  if (point.x < rect.minX || point.x > rect.maxX) return false;
  const { minY, maxY } = doorArchSpan(rect, profile, point.x);
  return point.y >= minY && point.y <= maxY;
}

export function doorArchesOverlap(
  first: { rect: DoorArchRect; profile: DoorArchProfile; surface: { contour?: readonly DoorArchPoint[] } },
  second: { rect: DoorArchRect; profile: DoorArchProfile; surface: { contour?: readonly DoorArchPoint[] } }
): boolean {
  if (first.rect.maxY <= second.rect.minY || second.rect.maxY <= first.rect.minY) return false;
  return (
    intersectDoorContours(
      doorArchOutline(first.rect, first.profile, first.surface.contour),
      doorArchOutline(second.rect, second.profile, second.surface.contour)
    ).length > 0
  );
}

export function resolveDoorArchCutSlice(rect: DoorArchRect, cut: DoorArchCut) {
  const height = rect.maxY - rect.minY;
  const base = cut.base ?? 0;
  return {
    rect: { ...rect, minY: rect.minY + base * height, maxY: rect.minY + cut.peak * height },
    profile: {
      start: cut.profile.start,
      end: cut.profile.end,
      rise: cut.profile.rise / (cut.peak - base),
      ...(cut.profile.shape ? { shape: cut.profile.shape } : {}),
      ...(cut.profile.link ? { link: cut.profile.link } : {}),
    },
  };
}

export function doorArchCutEdges(rect: DoorArchRect, profile: DoorArchProfile): DoorArchPoint[][] {
  if (!profile.shape) return [sampleDoorArch(rect, profile)];
  const lower = sampleDoorArch(rect, profile, 'minY');
  return profile.shape === 'arch-down' ? [lower] : [lower, sampleDoorArch(rect, profile)];
}

export function doorArchCutRange(rect: DoorArchRect, cut: DoorArchCut): [number, number] {
  const slice = resolveDoorArchCutSlice(rect, cut);
  const heights = doorArchCutEdges(slice.rect, slice.profile).flatMap(points => points.map(point => point.y));
  return [Math.min(...heights), Math.max(...heights)];
}

function cutEdgeY(edge: readonly DoorArchPoint[], x: number): number {
  const index = edge.findIndex(point => point.x >= x);
  if (index <= 0) return (index === 0 ? edge[0] : edge.at(-1))!.y;
  const a = edge[index - 1]!;
  const b = edge[index]!;
  return a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x);
}

export function sampleDoorCutEdgePair(lower: readonly DoorArchPoint[], upper: readonly DoorArchPoint[]) {
  const stations = [...new Set([...lower, ...upper].map(point => point.x))].sort((a, b) => a - b);
  return stations.map(x => ({ x, low: cutEdgeY(lower, x), high: cutEdgeY(upper, x) }));
}

export function doorArchCutsAreSeparate(
  rect: DoorArchRect,
  first: DoorArchCut,
  second: DoorArchCut,
  clearance: number
): boolean {
  const a = resolveDoorArchCutSlice(rect, first);
  const b = resolveDoorArchCutSlice(rect, second);
  const aEdges = doorArchCutEdges(a.rect, a.profile);
  const bEdges = doorArchCutEdges(b.rect, b.profile);
  return (
    sampleDoorCutEdgePair(aEdges.at(-1)!, bEdges[0]!).every(
      ({ low, high }) => high - low >= clearance - 1e-8
    ) ||
    sampleDoorCutEdgePair(bEdges.at(-1)!, aEdges[0]!).every(({ low, high }) => high - low >= clearance - 1e-8)
  );
}

export function doorContourSpanAtX(contour: readonly DoorArchPoint[], x: number) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < contour.length; index++) {
    const a = contour[index];
    const b = contour[(index + 1) % contour.length];
    if (!a || !b || x < Math.min(a.x, b.x) - 1e-9 || x > Math.max(a.x, b.x) + 1e-9) continue;
    if (Math.abs(a.x - b.x) < 1e-9) {
      minY = Math.min(minY, a.y, b.y);
      maxY = Math.max(maxY, a.y, b.y);
    } else {
      const y = a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return minY <= maxY ? { minY, maxY } : null;
}

function intersectDoorContourBands(outline: readonly DoorArchPoint[], clip: readonly DoorArchPoint[]) {
  const xMin = Math.max(...[outline, clip].map(path => Math.min(...path.map(point => point.x))));
  const xMax = Math.min(...[outline, clip].map(path => Math.max(...path.map(point => point.x))));
  const stations = [...new Set([xMin, xMax, ...outline.map(point => point.x), ...clip.map(point => point.x)])]
    .filter(x => x >= xMin && x <= xMax)
    .sort((a, b) => a - b);
  const bands: { ll: DoorArchPoint; lr: DoorArchPoint; ul: DoorArchPoint; ur: DoorArchPoint }[] = [];
  for (let index = 1; index < stations.length; index++) {
    const x0 = stations[index - 1]!;
    const x1 = stations[index]!;
    const a0 = doorContourSpanAtX(outline, x0);
    const a1 = doorContourSpanAtX(outline, x1);
    const b0 = doorContourSpanAtX(clip, x0);
    const b1 = doorContourSpanAtX(clip, x1);
    if (!a0 || !a1 || !b0 || !b1 || x1 - x0 < 1e-8) continue;
    // Within every station interval the four boundaries are straight. Partition
    // where their ordering changes, including where the two regions meet.
    const divisions = [0, 1];
    for (const a of ['minY', 'maxY'] as const) {
      for (const b of ['minY', 'maxY'] as const) {
        const left = a0[a] - b0[b];
        const right = a1[a] - b1[b];
        if (left * right < 0) divisions.push(left / (left - right));
      }
    }
    divisions.sort((a, b) => a - b);
    const interpolate = (start: number, end: number, t: number) => start + (end - start) * t;
    const band = (t: number) => ({
      x: interpolate(x0, x1, t),
      low: Math.max(interpolate(a0.minY, a1.minY, t), interpolate(b0.minY, b1.minY, t)),
      high: Math.min(interpolate(a0.maxY, a1.maxY, t), interpolate(b0.maxY, b1.maxY, t)),
    });
    for (let part = 1; part < divisions.length; part++) {
      const left = band(divisions[part - 1]!);
      const right = band(divisions[part]!);
      if (right.x - left.x < 1e-8 || left.high + right.high <= left.low + right.low + 1e-8) continue;
      const ll = { x: left.x, y: left.low };
      const lr = { x: right.x, y: right.low };
      const ul = { x: left.x, y: left.high };
      const ur = { x: right.x, y: right.high };
      bands.push({ ll, lr, ul, ur });
    }
  }
  return bands;
}

/** The two contours must each have a single vertical span at every x. */
export function intersectDoorContours(outline: readonly DoorArchPoint[], clip: readonly DoorArchPoint[]) {
  return intersectDoorContourBands(outline, clip).flatMap(({ ll, lr, ul, ur }) => [ll, lr, ul, ul, lr, ur]);
}

export function clipDoorContour(outline: readonly DoorArchPoint[], clip: readonly DoorArchPoint[]) {
  const regions: DoorArchPoint[][] = [];
  let lower: DoorArchPoint[] = [];
  let upper: DoorArchPoint[] = [];
  for (const { ll, lr, ul, ur } of intersectDoorContourBands(outline, clip)) {
    const lastLow = lower.at(-1);
    const lastHigh = upper.at(-1);
    if (!lastLow || !lastHigh || Math.abs(lastLow.x - ll.x) > 1e-8 || ul.y - ll.y < 1e-8) {
      if (lower.length) regions.push([...lower, ...upper.reverse()]);
      lower = [ll];
      upper = [ul];
    }
    lower.push(lr);
    upper.push(ur);
  }
  if (lower.length) regions.push([...lower, ...upper.reverse()]);
  return regions;
}
