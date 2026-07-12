import type { UnknownRecord } from '../types';
import {
  createSketchStructuralCommandEnvelope,
  decodeSketchStructuralCommandHover,
  SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
  type SetBaseCommand,
  type SketchStructuralCommand,
} from '../esm/native/services/canvas_picking_sketch_structural_command.ts';

export type SketchStructuralHoverFixtureHost = {
  tool?: string;
  moduleKey?: number | 'corner' | `corner:${number}` | null;
  isBottom?: boolean;
  ts?: number;
};

export function withSketchStructuralCommand(
  command: SketchStructuralCommand,
  host: SketchStructuralHoverFixtureHost = {}
): UnknownRecord {
  return {
    ts: host.ts ?? Date.now(),
    tool: host.tool ?? 'test-structural-command',
    hostModuleKey: host.moduleKey ?? 0,
    hostIsBottom: host.isBottom ?? false,
    kind: SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
    boxStructuralCommand: createSketchStructuralCommandEnvelope(command),
  };
}

export function requireSketchStructuralCommandHover(value: unknown) {
  const decoded = decodeSketchStructuralCommandHover(value);
  if (!decoded.ok) throw new Error(`Invalid structural hover fixture: ${decoded.reason}`);
  return decoded.value;
}

export function createSetBaseCommand(
  overrides: Partial<SetBaseCommand> & Pick<SetBaseCommand, 'boxId' | 'baseType'>
): SetBaseCommand {
  return {
    kind: 'set-base',
    op: 'add',
    boxId: overrides.boxId,
    freePlacement: overrides.freePlacement ?? false,
    blockedReason: overrides.blockedReason ?? null,
    baseType: overrides.baseType,
    baseLegStyle: overrides.baseLegStyle ?? 'tapered',
    baseLegColor: overrides.baseLegColor ?? 'black',
    baseLegPlatformMode: overrides.baseLegPlatformMode ?? 'stage',
    baseLegPlatformSideMode: overrides.baseLegPlatformSideMode ?? 'overhang',
    baseLegPlatformSideOverhangCm: overrides.baseLegPlatformSideOverhangCm ?? 1.5,
    baseLegPlatformFrontOverhangCm: overrides.baseLegPlatformFrontOverhangCm ?? 2,
    baseLegHeightCm: overrides.baseLegHeightCm ?? 12,
    baseLegWidthCm: overrides.baseLegWidthCm ?? 3.5,
    basePlinthHeightCm: overrides.basePlinthHeightCm ?? 8,
  };
}
