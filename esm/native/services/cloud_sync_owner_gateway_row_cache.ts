import type { CloudSyncStateRow } from '../../../types';

export type CloudSyncOwnerRowCache = {
  read: (room: string) => CloudSyncStateRow | null;
  write: (row: CloudSyncStateRow | null | undefined) => void;
};

export function createCloudSyncOwnerRowCache(): CloudSyncOwnerRowCache {
  const rows = new Map<string, CloudSyncStateRow>();
  return {
    read(room: string): CloudSyncStateRow | null {
      return rows.get(room) || null;
    },
    write(row: CloudSyncStateRow | null | undefined): void {
      if (row) rows.set(row.room, row);
    },
  };
}
