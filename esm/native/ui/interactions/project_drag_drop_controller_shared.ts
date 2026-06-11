import type { ProjectFileLike } from '../../../../types';

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
  return item && typeof item === 'object' && 'kind' in item ? String(item.kind || '') : '';
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

function readDroppedProjectFileScalar(value: unknown): string {
  return value == null ? '' : String(value);
}

export function readDroppedProjectFileFlightKey(file: ProjectFileLike | null | undefined): string | null {
  if (!file) return null;
  const name = readDroppedProjectFileScalar(typeof file.name === 'string' ? file.name : '');
  const size = readDroppedProjectFileScalar(typeof file.size === 'number' ? file.size : '');
  const type = readDroppedProjectFileScalar(typeof file.type === 'string' ? file.type : '');
  const lastModifiedValue = Reflect.get(file, 'lastModified');
  const lastModified =
    typeof lastModifiedValue === 'number' ? readDroppedProjectFileScalar(lastModifiedValue) : '';
  if (!name && !size && !type && !lastModified) return null;
  return [name, size, type, lastModified].join('|');
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
