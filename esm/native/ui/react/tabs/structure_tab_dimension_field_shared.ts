import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, FocusEvent, MouseEvent, SetStateAction, WheelEvent } from 'react';

import { structureTabReportNonFatal } from './structure_tab_shared.js';

export type StructureDraftSyncValue = number | '';
export type StructureDimInputBounds = {
  min?: number;
  max?: number;
  integer?: boolean;
  /**
   * Allows the exact value 0 as a domain-specific sentinel while keeping the
   * normal positive min/max range for every non-zero value. Used for the
   * intentional "no cabinet" states (0 doors => width 0), not as a blanket
   * permission for tiny positive dimensions.
   */
  allowZero?: boolean;
};
export type StructureDraftCommitResult =
  | { kind: 'pending' }
  | { kind: 'invalid' }
  | { kind: 'value'; value: number };
export type StructureOptionalDraftCommitResult =
  | { kind: 'empty' }
  | { kind: 'pending' }
  | { kind: 'invalid' }
  | { kind: 'value'; value: number };

export function formatStructureDraftValue(value: StructureDraftSyncValue): string {
  return value === '' ? '' : String(value);
}

export function useStructureDraft(
  value: StructureDraftSyncValue
): [string, Dispatch<SetStateAction<string>>] {
  const [draft, setDraft] = useState<string>(() => formatStructureDraftValue(value));
  const lastExternal = useRef<StructureDraftSyncValue>(value);

  useEffect(() => {
    if (lastExternal.current !== value) {
      lastExternal.current = value;
      setDraft(formatStructureDraftValue(value));
    }
  }, [value]);

  return [draft, setDraft];
}

export function useStructureDimInputId(activeId: string, prefix: 'dim' | 'dimopt'): string {
  const reactId = useId();
  return useMemo(() => {
    const base = sanitizeStructureDimIdPart(activeId || prefix);
    const rid = sanitizeStructureDimIdPart(String(reactId));
    return `wp-r-${prefix}-${base}-${rid}`;
  }, [activeId, prefix, reactId]);
}

export function readStructureRequiredCommit(
  raw: string,
  bounds?: StructureDimInputBounds
): StructureDraftCommitResult {
  const text = String(raw || '').trim();
  if (!text || text === '-' || text === '.' || text === '-.') return { kind: 'pending' };
  const value = Number(text);
  if (!Number.isFinite(value) || !isStructureValueWithinBounds(value, bounds)) return { kind: 'invalid' };
  return { kind: 'value', value: bounds?.integer ? Math.round(value) : value };
}

export function readStructureOptionalCommit(
  raw: string,
  bounds?: StructureDimInputBounds
): StructureOptionalDraftCommitResult {
  const text = String(raw || '').trim();
  if (!text) return { kind: 'empty' };
  if (text === '-' || text === '.' || text === '-.') return { kind: 'pending' };
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || !isStructureValueWithinBounds(value, bounds)) {
    return { kind: 'invalid' };
  }
  return { kind: 'value', value: bounds?.integer ? Math.round(value) : value };
}

export function isStructureValueWithinBounds(value: number, bounds?: StructureDimInputBounds): boolean {
  if (!Number.isFinite(value)) return false;
  if (bounds?.integer && Math.abs(value - Math.round(value)) > 0.0001) return false;
  if (bounds?.allowZero && Math.abs(value) < 0.0001) return true;
  if (typeof bounds?.min === 'number' && Number.isFinite(bounds.min) && value < bounds.min) return false;
  if (typeof bounds?.max === 'number' && Number.isFinite(bounds.max) && value > bounds.max) return false;
  return true;
}

export function readStructureDimensionValidationMessage(
  raw: string,
  bounds?: StructureDimInputBounds,
  optional = false
): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (text === '-' || text === '.' || text === '-.') return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return 'יש להזין מספר תקין';
  if (!optional && bounds?.integer && Math.abs(value - Math.round(value)) > 0.0001) {
    return 'יש להזין מספר שלם';
  }
  if (optional && bounds?.integer && Math.abs(value - Math.round(value)) > 0.0001) {
    return 'יש להזין מספר שלם';
  }

  if (bounds?.allowZero && Math.abs(value) < 0.0001) return null;

  const hasMin = typeof bounds?.min === 'number' && Number.isFinite(bounds.min);
  const hasMax = typeof bounds?.max === 'number' && Number.isFinite(bounds.max);
  if (hasMin && hasMax && (value < Number(bounds.min) || value > Number(bounds.max))) {
    return `הטווח המותר: ${formatStructureBound(bounds.min)}–${formatStructureBound(bounds.max)}`;
  }
  if (hasMin && value < Number(bounds.min)) {
    return `הערך המינימלי: ${formatStructureBound(bounds.min)}`;
  }
  if (hasMax && value > Number(bounds.max)) {
    return `הערך המקסימלי: ${formatStructureBound(bounds.max)}`;
  }
  return null;
}

function formatStructureBound(value: number | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.abs(n - Math.round(n)) < 0.0001 ? String(Math.round(n)) : String(n);
}

export function isStructureSameNumericValue(current: number | '', next: number): boolean {
  if (current === '') return false;
  return Math.abs((Number(current) || 0) - next) < 0.0001;
}

export function selectStructureDimInput(e: FocusEvent<HTMLInputElement>, code: string): void {
  try {
    e.currentTarget.select();
  } catch (__wpErr) {
    structureTabReportNonFatal(code, __wpErr);
  }
}

export function blurStructureDimOnWheel(e: WheelEvent<HTMLInputElement>): void {
  const doc = e.currentTarget.ownerDocument;
  if (doc && doc.activeElement === e.currentTarget) {
    e.stopPropagation();
    e.currentTarget.blur();
  }
}

export function resolveStructureSpinnerPointerStep(args: {
  event: MouseEvent<HTMLInputElement>;
  draft: string;
  placeholder?: number;
  step: number;
  bounds?: StructureDimInputBounds;
}): number | null {
  const { event, draft, placeholder, step, bounds } = args;
  if (String(draft || '').trim() || placeholder == null) return null;

  try {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const zone = Math.max(24, Math.min(44, rect.width * 0.25));
    const inSpinnerZone = x <= zone || x >= rect.width - zone;
    if (!inSpinnerZone) return null;

    const dir = y <= rect.height / 2 ? 1 : -1;
    const base = Number(placeholder);
    const stepValue = Number(step) || 1;
    if (!Number.isFinite(base) || !Number.isFinite(stepValue)) return null;
    const rawNext = base + dir * stepValue;
    if (bounds && !isStructureValueWithinBounds(rawNext, bounds)) return null;
    return rawNext <= 0 ? 1 : rawNext;
  } catch (__wpErr) {
    structureTabReportNonFatal('L108', __wpErr);
    return null;
  }
}

export function resolveStructurePlaceholderArrowStep(args: {
  key: string;
  draft: string;
  placeholder?: number;
  step: number;
  bounds?: StructureDimInputBounds;
}): number | null {
  const { key, draft, placeholder, step, bounds } = args;
  if ((key !== 'ArrowUp' && key !== 'ArrowDown') || String(draft || '').trim() || placeholder == null) {
    return null;
  }

  const base = Number(placeholder);
  if (!Number.isFinite(base)) return null;
  const dir = key === 'ArrowUp' ? 1 : -1;
  const stepValue = Number(step) || 1;
  const rawNext = base + dir * stepValue;
  if (bounds && !isStructureValueWithinBounds(rawNext, bounds)) return null;
  return rawNext <= 0 ? 1 : rawNext;
}

function sanitizeStructureDimIdPart(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}
