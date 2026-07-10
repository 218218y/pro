import type { ProjectFileLike } from '../../../../types';
import { buildProjectFileFlightFingerprint } from '../project_file_flight_key.js';

export type ProjectDragDropToastFn = (msg: string, type?: string) => void;

export type ProjectDragDropController = {
  isFileDrag: (e: DragEvent | null) => boolean;
  preventDefaultsForFilesOnly: (e: Event) => void;
  onDragOverClass: (e: Event) => void;
  onDragLeaveClass: () => void;
  onDropHandle: (e: Event) => Promise<void>;
};

type DataTransferItemLike = { kind?: string };
type DataTransferFilesLike = FileList | ArrayLike<ProjectFileLike>;

function readDataTransferItemKind(item: unknown): string {
  return item && typeof item === 'object' && 'kind' in item && typeof item.kind === 'string' ? item.kind : '';
}

function isProjectFileLike(value: unknown): value is ProjectFileLike {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

export function readDroppedProjectFile(
  files: DataTransferFilesLike | null | undefined
): ProjectFileLike | null {
  if (!files || typeof files.length !== 'number' || files.length < 1) return null;
  const first = files[0];
  return isProjectFileLike(first) ? first : null;
}

export function readDroppedProjectFileFlightKey(file: ProjectFileLike | null | undefined): string | null {
  if (!file) return null;
  const lastModifiedValue = Reflect.get(file, 'lastModified');
  return buildProjectFileFlightFingerprint({
    name: typeof file.name === 'string' ? file.name : undefined,
    size: typeof file.size === 'number' ? file.size : undefined,
    mediaType: typeof file.type === 'string' ? file.type : undefined,
    lastModified: typeof lastModifiedValue === 'number' ? lastModifiedValue : undefined,
  });
}

function hasFilesType(dt: DataTransfer): boolean {
  const types = dt.types;
  if (!types) return false;
  try {
    return Array.from(types).some(type => String(type) === 'Files');
  } catch {
    return false;
  }
}

function hasFileItems(dt: DataTransfer): boolean {
  const items = dt.items;
  if (!items || !items.length) return false;
  try {
    return Array.from(items).some(
      (item: DataTransfer | DataTransferItem | DataTransferItemLike) =>
        readDataTransferItemKind(item) === 'file'
    );
  } catch {
    return false;
  }
}

export function isProjectFileDrag(e: DragEvent | null): boolean {
  try {
    const dt = e?.dataTransfer ?? null;
    if (!dt) return false;
    if (hasFilesType(dt)) return true;
    if (hasFileItems(dt)) return true;
    const files = dt.files;
    return !!(files && files.length);
  } catch {
    return false;
  }
}
