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
