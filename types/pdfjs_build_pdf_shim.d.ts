// Shim for `pdfjs-dist/build/pdf`.
//
// pdfjs-dist ships its types, but TypeScript does not associate them with the
// deep import path `pdfjs-dist/build/pdf` in our boot/strict-boot typecheck
// configurations (moduleResolution=bundler). That makes the module implicitly
// `any` and fails strict typechecks.
//
// We load pdf.js dynamically and treat the surface as `any` at the call sites,
// so a small declaration here is the most stable fix without changing runtime
// behavior or bundler resolution.

type PdfjsGetDocumentLike = (src: unknown) => unknown;
type PdfjsBuildModule = {
  getDocument: PdfjsGetDocumentLike;
  GlobalWorkerOptions: { workerSrc?: string };
  [k: string]: unknown;
};

declare module 'pdfjs-dist/build/pdf' {
  // Keep the API minimal: we only rely on these two exports.
  export const getDocument: PdfjsGetDocumentLike;
  export const GlobalWorkerOptions: { workerSrc?: string };

  const mod: PdfjsBuildModule;
  export default mod;
}

declare module 'pdfjs-dist/build/pdf.mjs' {
  // Keep the API minimal: we only rely on these two exports.
  export const getDocument: PdfjsGetDocumentLike;
  export const GlobalWorkerOptions: { workerSrc?: string };

  const mod: PdfjsBuildModule;
  export default mod;
}
