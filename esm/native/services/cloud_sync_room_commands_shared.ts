import type {
  AppContainer,
  CloudSyncClipboardLike,
  CloudSyncCredentialStatus,
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
  getCurrentRoomCredential: () => CloudSyncRoomCredential | null;
  getPrivateRoomCredential: () => CloudSyncRoomCredential | null;
  setPrivateRoomCredential: (credential: CloudSyncRoomCredential) => boolean;
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
  roomToken: string
): string {
  const base = String(cfg.shareBaseUrl || 'https://pro218.bargig-furniture.com/');
  const url = new URL(base);
  url.hash = '';
  url.search = '';
  const room = readRoomString(currentRoom);
  if (room && room !== readRoomString(cfg.publicRoom)) {
    const token = readRoomString(roomToken);
    if (!token) return '';
    const fragment = new URLSearchParams();
    fragment.set(cfg.roomParam, room);
    fragment.set(cfg.roomTokenParam, token);
    url.hash = fragment.toString();
  }
  return url.toString();
}

export function describeCloudSyncRoomStatus(
  currentRoom: string,
  publicRoom: string,
  credentialStatus?: CloudSyncCredentialStatus
): CloudSyncRoomStatusSnapshot {
  const room = readRoomString(currentRoom);
  const pub = readRoomString(publicRoom) || 'public';
  if (!room) {
    return {
      room: '',
      isPublic: null,
      status: 'סנכרון לא פעיל (אין קונפיגורציה)',
      credentialState: 'missing',
      credentialExpiresAt: '',
      retryAt: 0,
      failureKind: '',
    };
  }
  if (room === pub) {
    return {
      room,
      isPublic: true,
      status: 'מצב: ציבורי (כולם רואים)',
      credentialState: 'public',
      credentialExpiresAt: '',
      retryAt: 0,
      failureKind: '',
    };
  }
  const credentialState = credentialStatus?.state || 'missing';
  const statusSuffix = {
    active: 'הרשאה פעילה',
    expiring: 'ההרשאה עומדת לפוג ומתחדשת אוטומטית',
    expired: 'ההרשאה פגה; יש לפתוח קישור חדש',
    missing: 'חסרה הרשאת חדר',
    'rate-limited': 'קצב הבקשות הוגבל זמנית',
    offline: 'לא מקוון; הסנכרון יתחדש עם החיבור',
    error: 'שגיאת הרשאה או שרת',
    public: 'הרשאה פעילה',
  }[credentialState];
  return {
    room,
    isPublic: false,
    status: `מצב: חדר פרטי (${room}) — ${statusSuffix}`,
    credentialState,
    credentialExpiresAt: credentialStatus?.expiresAt || '',
    retryAt: credentialStatus?.retryAt || 0,
    failureKind: credentialStatus?.failureKind || '',
  };
}
