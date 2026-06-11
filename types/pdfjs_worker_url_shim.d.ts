// Shim for Vite-style `?url` imports used by the PDF editor.
//
// In the boot/checkjs typecheck configurations we rely on TypeScript's bundler resolver.
// The resolver can't locate virtual modules like `...?.mjs?url` on disk, so we
// provide an ambient module declaration for any import that ends with `?url`.
//
// NOTE: Don't declare a relative module like './pdf.worker.min.mjs?url' here.
// Relative specifiers inside a .d.ts are interpreted relative to *this* file,
// so they won't match imports coming from other folders.

declare module '*?url' {
  const url: string;
  export default url;
}
