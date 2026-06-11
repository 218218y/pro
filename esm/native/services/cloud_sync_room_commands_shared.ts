import type {
  AppContainer,
  CloudSyncClipboardLike,
  CloudSyncNonFatalReportOptions,
  CloudSyncPanelConfig,
  CloudSyncPromptSinkLike,
  CloudSyncRoomStatusSnapshot,
} from '../../../types';

export type CloudSyncRoomMode = 'public' | 'private';

export type CloudSyncRoomCommandDeps = {
  App: AppContainer;
  cfg: CloudSyncPanelConfig;
  getCurrentRoom: () => string;
  getPrivateRoom: () => string;
  setPrivateRoom: (value: string) => void;
  randomRoomId: () => string;
  setRoomInUrl: (app: AppContainer, param: string, value: string | null) => void;
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
};

export type CloudSyncCopyShareLinkCommandDeps = {
  App: AppContainer;
  getShareLink: () => string;
  readClipboard: () => CloudSyncClipboardLike | null;
  readPromptSink: () => CloudSyncPromptSinkLike | null;
  reportNonFatal: (
    app: AppContainer,
    op: string,
    err: unknown,
    opts?: CloudSyncNonFatalReportOptions
  ) => void;
};

export function readRoomString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildCloudSyncShareLink(cfg: CloudSyncPanelConfig, currentRoom: string): string {
  const base = String(cfg.shareBaseUrl || 'https://bargig218.netlify.app/');
  const url = new URL(base);
  url.hash = '';
  url.search = '';
  const room = readRoomString(currentRoom);
  if (room && room !== readRoomString(cfg.publicRoom)) {
    url.searchParams.set(cfg.roomParam, room);
  }
  return url.toString();
}

export function describeCloudSyncRoomStatus(
  currentRoom: string,
  publicRoom: string
): CloudSyncRoomStatusSnapshot {
  const room = readRoomString(currentRoom);
  const pub = readRoomString(publicRoom) || 'public';
  if (!room) {
    return {
      room: '',
      isPublic: null,
      status: 'סנכרון לא פעיל (אין קונפיגורציה)',
    };
  }
  if (room === pub) {
    return {
      room,
      isPublic: true,
      status: 'מצב: ציבורי (כולם רואים)',
    };
  }
  return {
    room,
    isPublic: false,
    status: `מצב: חדר פרטי (${room})`,
  };
}
