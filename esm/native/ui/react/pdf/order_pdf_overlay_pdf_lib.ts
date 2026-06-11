type UnknownRecord = Record<string, unknown>;

export type PdfLibFormLike = {
  getFields?: () => unknown[];
  getTextField?: (name: string) => { getText?: () => string } | unknown;
};

export type PdfLibCatalogLike = {
  get?: (key: unknown) => unknown;
};

export type PdfLibContextLike = {
  obj?: (value: unknown) => unknown;
};

export type PdfLibLoadedDocumentLike = {
  getPages?: () => unknown[];
  getForm?: () => PdfLibFormLike | null;
  removePage?: (pageIndex: number) => unknown;
  copyPages?: (srcDoc: PdfLibLoadedDocumentLike, indexes: number[]) => Promise<unknown[]>;
  addPage?: (sizeOrPage?: unknown) => PdfLibDrawablePageLike | unknown;
  insertPage?: (index: number, page: unknown) => unknown;
  getPageCount?: () => number;
  save?: (options?: { updateFieldAppearances?: boolean }) => Promise<Uint8Array>;
  embedPng?: (bytes: Uint8Array) => Promise<unknown>;
  catalog?: PdfLibCatalogLike;
  context?: PdfLibContextLike | null;
};

export type PdfLibDocumentCtorLike = {
  load: (bytes: Uint8Array | ArrayBuffer) => Promise<PdfLibLoadedDocumentLike>;
  create: () => Promise<PdfLibLoadedDocumentLike>;
};

export type PdfLibNameCtorLike = { of: (name: string) => unknown };

export type PdfLibPageImageOptionsLike = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfLibDrawablePageLike = {
  drawImage: (image: unknown, options: PdfLibPageImageOptionsLike) => void;
};

export type PdfLibWritableDocumentLike = {
  embedPng: (bytes: Uint8Array) => Promise<unknown>;
  addPage: (size: [number, number]) => PdfLibDrawablePageLike;
  save?: (options?: { updateFieldAppearances?: boolean }) => Promise<Uint8Array>;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && (typeof value === 'object' || typeof value === 'function')
    ? (value as UnknownRecord)
    : null;
}

function readNamespace(mod: unknown): UnknownRecord | null {
  const record = asRecord(mod);
  if (!record) return null;
  const defaultNs = asRecord(record.default);
  if (!defaultNs) return record;
  return { ...defaultNs, ...record };
}

function isDocumentCtorLike(value: unknown): value is PdfLibDocumentCtorLike {
  const record = asRecord(value);
  return !!record && typeof record.load === 'function' && typeof record.create === 'function';
}

function isNameCtorLike(value: unknown): value is PdfLibNameCtorLike {
  const record = asRecord(value);
  return !!record && typeof record.of === 'function';
}

export async function loadPdfLibNamespace(): Promise<UnknownRecord> {
  const ns = readNamespace(await import('pdf-lib'));
  if (!ns) throw new Error('pdf-lib namespace missing');
  return ns;
}

export function readPdfDocumentCtor(pdfLib: UnknownRecord): PdfLibDocumentCtorLike | null {
  const ctor = pdfLib.PDFDocument;
  return isDocumentCtorLike(ctor) ? ctor : null;
}

export function readPdfNameCtor(pdfLib: UnknownRecord): PdfLibNameCtorLike | null {
  const ctor = pdfLib.PDFName;
  return isNameCtorLike(ctor) ? ctor : null;
}

export async function loadPdfDocumentCtor(): Promise<PdfLibDocumentCtorLike> {
  const pdfLib = await loadPdfLibNamespace();
  const ctor = readPdfDocumentCtor(pdfLib);
  if (!ctor) throw new Error('pdf-lib missing PDFDocument');
  return ctor;
}

export async function loadPdfNameCtor(): Promise<PdfLibNameCtorLike> {
  const pdfLib = await loadPdfLibNamespace();
  const ctor = readPdfNameCtor(pdfLib);
  if (!ctor) throw new Error('pdf-lib missing PDFName');
  return ctor;
}
