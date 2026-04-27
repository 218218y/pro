export type DownloadAnchor = {
  href: string;
  download: string;
  rel: string;
  style: { display?: string };
  click: () => void;
  remove: () => void;
};

export function createStore(config: Record<string, unknown>) {
  return {
    getState() {
      return {
        ui: {},
        config,
        runtime: {},
        mode: {},
        meta: {},
      };
    },
  };
}

export function createDownloadContext() {
  const downloads: string[] = [];
  const blobRecords: Array<{ href: string; blob: Blob }> = [];
  let blobSeq = 0;
  const body = {
    appendChild(_node: DownloadAnchor) {
      return undefined;
    },
  };
  const win = {
    URL: {
      createObjectURL(blob: Blob) {
        const href = `blob:settings-backup-${(blobSeq += 1)}`;
        blobRecords.push({ href, blob });
        return href;
      },
      revokeObjectURL() {
        return undefined;
      },
    },
    setTimeout(fn: () => void) {
      fn();
      return 0;
    },
    navigator: { userAgent: 'node-test' },
    location: { href: 'https://example.test/' },
    document: null as Document | null,
  } as unknown as Window;
  const doc = {
    body,
    defaultView: win,
    querySelector() {
      return null;
    },
    createElement() {
      const anchor: DownloadAnchor = {
        href: '',
        download: '',
        rel: '',
        style: {},
        click() {
          downloads.push(anchor.download);
        },
        remove() {
          return undefined;
        },
      };
      return anchor;
    },
  } as unknown as Document;
  (win as unknown as { document: Document }).document = doc;
  return { doc, downloads, blobRecords };
}
