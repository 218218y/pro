export type PendingReasonState = {
  ordered: string[];
  seen: Set<string>;
  overflow: number;
};

const MAX_PENDING_REASON_ITEMS = 6;

export function createPendingReasonState(): PendingReasonState {
  return {
    ordered: [],
    seen: new Set<string>(),
    overflow: 0,
  };
}

export function normalizePendingReason(scopeLabel: string, reason: string): string {
  const trimmed = String(reason || '').trim();
  return trimmed || scopeLabel;
}

export function addPendingReason(state: PendingReasonState, scopeLabel: string, reason: string): void {
  const normalized = normalizePendingReason(scopeLabel, reason);
  if (state.seen.has(normalized)) return;
  state.seen.add(normalized);
  if (state.ordered.length < MAX_PENDING_REASON_ITEMS) {
    state.ordered.push(normalized);
    return;
  }
  state.overflow += 1;
}

export function readPendingReasonSummary(state: PendingReasonState, scopeLabel: string): string {
  const ordered = state.ordered.length > 0 ? state.ordered : [scopeLabel];
  const base = ordered.join('|');
  return state.overflow > 0 ? `${base}|…(+${state.overflow})` : base;
}

export function resetPendingReasonState(state: PendingReasonState): void {
  state.ordered.length = 0;
  state.seen.clear();
  state.overflow = 0;
}
