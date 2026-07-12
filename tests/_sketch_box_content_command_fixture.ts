import {
  createSketchBoxContentCommandEnvelope,
  type SketchBoxContentCommand,
} from '../esm/native/services/canvas_picking_sketch_box_content_command.ts';

export function withSketchBoxContentCommand<T extends Record<string, unknown>>(
  record: T,
  command: SketchBoxContentCommand
): T & { boxContentCommand: ReturnType<typeof createSketchBoxContentCommandEnvelope> } {
  return {
    ...record,
    boxContentCommand: createSketchBoxContentCommandEnvelope(command),
  };
}
