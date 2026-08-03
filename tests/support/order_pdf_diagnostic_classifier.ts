export type OrderPdfRequestLike = {
  resourceType(): string;
  url(): string;
};

export type OrderPdfResponseLike = {
  request(): OrderPdfRequestLike;
  status(): number;
};

export function isOrderPdfChunkRequest(request: OrderPdfRequestLike): boolean {
  return (
    request.resourceType() === 'script' &&
    /OrderPdfInPlaceEditorOverlay|OrderPdf|order_pdf|order-pdf/u.test(request.url())
  );
}

export function isOrderPdfChunkHttpFailure(response: OrderPdfResponseLike): boolean {
  return response.status() >= 400 && isOrderPdfChunkRequest(response.request());
}
