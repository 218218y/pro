// Physical PDF placement is independent of the browser viewport and PNG pixel density.
// PDF units are points (72 per inch). Keep the complete image and its aspect ratio.
export const A4_PAGE_WIDTH_PT = (210 / 25.4) * 72;
export const A4_PAGE_HEIGHT_PT = (297 / 25.4) * 72;

export function fitPdfImageToPage(input: {
  pageWidth: number;
  pageHeight: number;
  imageWidth: number;
  imageHeight: number;
  margin: number;
}): { x: number; y: number; width: number; height: number } {
  const { pageWidth, pageHeight, imageWidth, imageHeight, margin } = input;
  if (
    ![pageWidth, pageHeight, imageWidth, imageHeight, margin].every(Number.isFinite) ||
    pageWidth <= 0 ||
    pageHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    margin < 0 ||
    margin * 2 >= Math.min(pageWidth, pageHeight)
  ) {
    throw new Error('Invalid PDF page/image dimensions');
  }
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}
