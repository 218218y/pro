// Builder core pure carcass computations.

import { prepareCarcassInput, type PreparedCarcassInput } from './core_carcass_shared.js';
import { buildCarcassShell } from './core_carcass_shell.js';
import { buildCarcassCornice } from './core_carcass_cornice.js';

export function computeCarcassOps(input: unknown) {
  const prepared = prepareCarcassInput(input);
  const { boards, backPanels, backPanel } = buildCarcassShell(prepared);
  const cornice = buildCarcassCornice(prepared);
  return buildCarcassResult(prepared, boards, backPanels, backPanel, cornice);
}

function buildCarcassResult(
  prepared: PreparedCarcassInput,
  boards: unknown[],
  backPanels: unknown[] | null,
  backPanel: unknown,
  cornice: unknown
) {
  return {
    baseHeight: prepared.baseHeight,
    startY: prepared.startY,
    cabinetBodyHeight: prepared.cabinetBodyHeight,
    base: prepared.base,
    boards,
    backPanels,
    backPanel,
    cornice,
  };
}
