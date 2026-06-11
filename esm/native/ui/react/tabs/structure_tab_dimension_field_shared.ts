import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, FocusEvent, MouseEvent, SetStateAction, WheelEvent } from 'react';

import { structureTabReportNonFatal } from './structure_tab_shared.js';

export type StructureDraftSyncValue = number | '';
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

export function readStructureRequiredCommit(raw: string): StructureDraftCommitResult {
  const text = String(raw || '').trim();
  if (!text || text === '-' || text === '.' || text === '-.') return { kind: 'pending' };
  const value = Number(text);
  if (!Number.isFinite(value)) return { kind: 'invalid' };
  return { kind: 'value', value };
}

export function readStructureOptionalCommit(raw: string): StructureOptionalDraftCommitResult {
  const text = String(raw || '').trim();
  if (!text) return { kind: 'empty' };
  if (text === '-' || text === '.' || text === '-.') return { kind: 'pending' };
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return { kind: 'invalid' };
  return { kind: 'value', value };
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
}): number | null {
  const { event, draft, placeholder, step } = args;
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
    const next = base + dir * stepValue;
    return next <= 0 ? 1 : next;
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
}): number | null {
  const { key, draft, placeholder, step } = args;
  if ((key !== 'ArrowUp' && key !== 'ArrowDown') || String(draft || '').trim() || placeholder == null) {
    return null;
  }

  const base = Number(placeholder);
  if (!Number.isFinite(base)) return null;
  const dir = key === 'ArrowUp' ? 1 : -1;
  const stepValue = Number(step) || 1;
  const next = base + dir * stepValue;
  return next <= 0 ? 1 : next;
}

function sanitizeStructureDimIdPart(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}
