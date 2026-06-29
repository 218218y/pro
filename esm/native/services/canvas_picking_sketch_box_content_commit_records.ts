import { asSketchCommitRecord, readSketchCommitNumber } from './canvas_picking_sketch_commit_geometry.js';

export function readNumber(value: unknown): number | null {
  return readSketchCommitNumber(value);
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asSketchCommitRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readSketchCommitNumber(readRecordValue(record, key));
}
