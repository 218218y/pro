declare module 'pdf-lib' {
  export const PDFDocument: {
    load(bytes: Uint8Array | ArrayBuffer): Promise<any>;
    create(): Promise<any>;
  };

  export const PDFName: {
    of(name: string): any;
  };
}

declare module '@pdf-lib/fontkit' {
  const fontkit: unknown;
  export default fontkit;
}
