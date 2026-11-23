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
