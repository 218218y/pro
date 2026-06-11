import type { AppContainer } from '../../../types';
import { asRecord } from '../runtime/record.js';
import { getTools } from '../runtime/service_access.js';
import { readRootState } from '../runtime/root_state_access.js';

function readManualToolFromModeState(App: AppContainer): string | null {
  try {
    const state = readRootState(App);
    const mode = asRecord(asRecord(state)?.mode);
    const opts = asRecord(mode?.opts);
    const manualTool = opts?.manualTool;
    return typeof manualTool === 'string' && manualTool ? manualTool : null;
  } catch {
    return null;
  }
}

export function readActiveManualTool(App: AppContainer): string | null {
  const toolFromState = readManualToolFromModeState(App);
  if (toolFromState) return toolFromState;

  try {
    const tools = getTools(App);
    const toolFromRuntime =
      typeof tools.getInteriorManualTool === 'function' ? tools.getInteriorManualTool() : null;
    return typeof toolFromRuntime === 'string' && toolFromRuntime ? toolFromRuntime : null;
  } catch {
    return null;
  }
}
