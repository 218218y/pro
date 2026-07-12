import {
  createSketchBoxContentCommandEnvelope,
  SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
  type SketchBoxContentCommand,
} from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';

type SketchBoxContentCommandHoverFixtureHost = {
  ts?: number;
  tool?: string;
  hostModuleKey?: number | 'corner' | `corner:${number}` | null;
  hostIsBottom?: boolean;
};

export function withSketchBoxContentCommand(
  host: SketchBoxContentCommandHoverFixtureHost,
  command: SketchBoxContentCommand
): Record<string, unknown> & {
  boxContentCommand: ReturnType<typeof createSketchBoxContentCommandEnvelope>;
} {
  return {
    ts: typeof host.ts === 'number' && Number.isFinite(host.ts) ? host.ts : Date.now(),
    tool: typeof host.tool === 'string' ? host.tool : 'test-sketch-box-content',
    hostModuleKey: Object.prototype.hasOwnProperty.call(host, 'hostModuleKey') ? host.hostModuleKey : null,
    hostIsBottom: host.hostIsBottom === true,
    kind: SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
    boxContentCommand: createSketchBoxContentCommandEnvelope(command),
  };
}
