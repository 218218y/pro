import type {
  AppContainer,
  CloudSyncClipboardLike,
  CloudSyncNonFatalReportOptions,
  CloudSyncPanelConfig,
  CloudSyncPromptSinkLike,
  CloudSyncRoomCredential,
  CloudSyncRoomStatusSnapshot,
} from '../../../types';

export type CloudSyncRoomMode = 'public' | 'private';

export type CloudSyncRoomCommandDeps = {
  App: AppContainer;
  cfg: CloudSyncPanelConfig;
  getCurrentRoom: () => string;
  getCurrentRoomToken: () => string;
  getPrivateRoom: () => string;
  getPrivateRoomToken: () => string;
  setPrivateRoomCredential: (room: string, token: string) => void;
  issuePrivateRoom: () => Promise<CloudSyncRoomCredential | null>;
  setRoomCredentialInUrl: (
    app: AppContainer,
    args: {
      roomParam: string;
      room: string | null;
      roomTokenParam: string;
      roomToken: string | null;
    }
  ) => boolean;
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

export function buildCloudSyncShareLink(
  cfg: CloudSyncPanelConfig,
  currentRoom: string,
  currentRoomToken: string
): string {
  const base = String(cfg.shareBaseUrl || 'https://pro218.bargig-furniture.com/');
  const url = new URL(base);
  url.hash = '';
  url.search = '';
  const room = readRoomString(currentRoom);
  if (room && room !== readRoomString(cfg.publicRoom)) {
    url.searchParams.set(cfg.roomParam, room);
    const token = readRoomString(currentRoomToken);
    if (!token) return '';
    url.searchParams.set(cfg.roomTokenParam, token);
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
