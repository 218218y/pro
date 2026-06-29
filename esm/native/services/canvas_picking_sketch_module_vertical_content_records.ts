export {
  asSketchCommitRecord as asRecord,
  ensureSketchCommitRecord as ensureRecord,
  ensureSketchCommitRecordList as ensureRecordList,
  isSketchCommitRecord as isRecord,
  readSketchCommitNumber as readNumber,
  type SketchCommitRecord as RecordMap,
} from './canvas_picking_sketch_commit_geometry.js';
import { asSketchCommitRecord, readSketchCommitNumber } from './canvas_picking_sketch_commit_geometry.js';

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asSketchCommitRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readSketchCommitNumber(readRecordValue(record, key));
}
