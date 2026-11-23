/** The visible horizontal slice of one arch, in coordinates of the complete arch. */
import type { DoorArchCut, DoorArchPoint, DoorArchProfile, DoorArchRect } from '../../types/maps.js';

function unit(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function readDoorArchProfile(value: unknown): DoorArchProfile | null {
  if (!value || typeof value !== 'object') return null;
  const { start, end, rise, link } = value as Partial<DoorArchProfile>;
  if (!unit(start) || !unit(end) || !unit(rise) || end <= start || rise <= 0) return null;
  if (link !== undefined && (typeof link !== 'string' || !link || link.length > 240)) return null;
  return { start, end, rise, ...(link ? { link } : {}) };
}

export function readDoorArchCut(value: unknown): DoorArchCut | null {
  if (!value || typeof value !== 'object') return null;
  const { peak, profile } = value as Partial<DoorArchCut>;
  const arch = readDoorArchProfile(profile);
  if (!arch || !unit(peak) || peak <= arch.rise || peak >= 1) return null;
  return { peak, profile: arch };
}

export function isDoorArchCutKey(key: string): boolean {
  return /^splitarch_d[1-9]\d*$/.test(key);
}

export function doorArchY(rect: DoorArchRect, profile: DoorArchProfile, x: number): number {
  const u = profile.start + ((profile.end - profile.start) * (x - rect.minX)) / (rect.maxX - rect.minX);
  return (
    rect.maxY - (rect.maxY - rect.minY) * profile.rise * (1 - Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)))
  );
}

export function sampleDoorArch(rect: DoorArchRect, profile: DoorArchProfile): DoorArchPoint[] {
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
      return { x, y: doorArchY(rect, profile, x) };
    });
}

export function doorArchOutline(rect: DoorArchRect, profile: DoorArchProfile): DoorArchPoint[] {
  return [{ x: rect.minX, y: rect.minY }, ...sampleDoorArch(rect, profile), { x: rect.maxX, y: rect.minY }];
}

export function containsDoorArchPoint(
  rect: DoorArchRect,
  profile: DoorArchProfile,
  point: DoorArchPoint
): boolean {
  return (
    point.x >= rect.minX &&
    point.x <= rect.maxX &&
    point.y >= rect.minY &&
    point.y <= doorArchY(rect, profile, point.x)
  );
}

function archSpanAtHeight(rect: DoorArchRect, profile: DoorArchProfile, y: number) {
  const span = rect.maxY - rect.minY;
  const rise = span * profile.rise;
  const level = (y - (rect.maxY - rise)) / rise;
  if (level >= 1) return null;
  const radius = level <= 0 ? 1 : Math.sqrt(1 - level ** 2);
  const left = Math.max(profile.start, (1 - radius) / 2);
  const right = Math.min(profile.end, (1 + radius) / 2);
  if (left >= right) return null;
  const scale = (rect.maxX - rect.minX) / (profile.end - profile.start);
  return {
    left: rect.minX + (left - profile.start) * scale,
    right: rect.minX + (right - profile.start) * scale,
  };
}

export function doorArchesOverlap(
  first: { rect: DoorArchRect; profile: DoorArchProfile },
  second: { rect: DoorArchRect; profile: DoorArchProfile }
): boolean {
  const bottom = Math.max(first.rect.minY, second.rect.minY);
  const a = archSpanAtHeight(first.rect, first.profile, bottom);
  const b = archSpanAtHeight(second.rect, second.profile, bottom);
  return !!a && !!b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.0001;
}

export function doorArchCutRange(rect: DoorArchRect, cut: DoorArchCut): [number, number] {
  const height = rect.maxY - rect.minY;
  const arc = { ...rect, maxY: rect.minY + cut.peak * height };
  const profile = { ...cut.profile, rise: cut.profile.rise / cut.peak };
  const crown = Math.max(0, Math.min(1, (0.5 - profile.start) / (profile.end - profile.start)));
  return [
    Math.min(doorArchY(arc, profile, arc.minX), doorArchY(arc, profile, arc.maxX)),
    doorArchY(arc, profile, arc.minX + crown * (arc.maxX - arc.minX)),
  ];
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

/** Triangulate the intersection of two contours whose vertical sections are single spans. */
export function intersectDoorContours(
  outline: readonly DoorArchPoint[],
  clip: readonly DoorArchPoint[]
): DoorArchPoint[] {
  const xMin = Math.max(...[outline, clip].map(path => Math.min(...path.map(point => point.x))));
  const xMax = Math.min(...[outline, clip].map(path => Math.max(...path.map(point => point.x))));
  const stations = [...new Set([xMin, xMax, ...outline.map(point => point.x), ...clip.map(point => point.x)])]
    .filter(x => x >= xMin && x <= xMax)
    .sort((a, b) => a - b);
  const triangles: DoorArchPoint[] = [];
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
      triangles.push(ll, lr, ul, ul, lr, ur);
    }
  }
  return triangles;
}
