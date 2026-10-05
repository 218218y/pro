export type OrderPdfFieldKey =
  'orderNumber' | 'orderDate' | 'projectName' | 'deliveryAddress' | 'phone' | 'mobile' | 'details' | 'notes';

export type OrderPdfImageFieldKey =
  'orderNo' | 'date' | 'name' | 'address' | 'phone' | 'mobile' | 'details' | 'notes';

export type OrderPdfOverlayFieldRectLike = { x: number; top: number; w: number; h: number };
export type OrderPdfTemplateBoxLike = { x: number; y: number; w: number; h: number };

type OrderPdfOverlayFieldStyle = { left: number; top: number; width: number; height: number };

export type OrderPdfFieldSpec = {
  key: OrderPdfFieldKey;
  imageKey: OrderPdfImageFieldKey;
  templateFieldName: string;
  generatedFieldName: string;
  overlayRect: OrderPdfOverlayFieldRectLike;
  templateBox: OrderPdfTemplateBoxLike;
  dir: 'rtl' | 'ltr';
  align: 'left' | 'right';
  multiline: boolean;
};

export const ORDER_PDF_FIELD_KEYS = Object.freeze([
  'orderNumber',
  'orderDate',
  'projectName',
  'deliveryAddress',
  'phone',
  'mobile',
  'details',
  'notes',
] as const satisfies readonly OrderPdfFieldKey[]);

export const ORDER_PDF_TEMPLATE_PAGE_WIDTH = 595.2756;
export const ORDER_PDF_TEMPLATE_PAGE_HEIGHT = 841.8898;

function toTemplateBox(rect: OrderPdfOverlayFieldRectLike): OrderPdfTemplateBoxLike {
  return {
    x: rect.x,
    y: ORDER_PDF_TEMPLATE_PAGE_HEIGHT - rect.top,
    w: rect.w,
    h: rect.h,
  };
}

function freezeSpec(input: Omit<OrderPdfFieldSpec, 'templateBox'>): OrderPdfFieldSpec {
  const overlayRect = Object.freeze({ ...input.overlayRect });
  return Object.freeze({
    ...input,
    overlayRect,
    templateBox: Object.freeze(toTemplateBox(overlayRect)),
  });
}

function buildOrderPdfFieldRecord<T>(
  mapValue: (key: OrderPdfFieldKey, spec: OrderPdfFieldSpec) => T
): Record<OrderPdfFieldKey, T> {
  return {
    orderNumber: mapValue('orderNumber', ORDER_PDF_FIELD_SPECS.orderNumber),
    orderDate: mapValue('orderDate', ORDER_PDF_FIELD_SPECS.orderDate),
    projectName: mapValue('projectName', ORDER_PDF_FIELD_SPECS.projectName),
    deliveryAddress: mapValue('deliveryAddress', ORDER_PDF_FIELD_SPECS.deliveryAddress),
    phone: mapValue('phone', ORDER_PDF_FIELD_SPECS.phone),
    mobile: mapValue('mobile', ORDER_PDF_FIELD_SPECS.mobile),
    details: mapValue('details', ORDER_PDF_FIELD_SPECS.details),
    notes: mapValue('notes', ORDER_PDF_FIELD_SPECS.notes),
  };
}

export const ORDER_PDF_FIELD_SPECS: Readonly<Record<OrderPdfFieldKey, OrderPdfFieldSpec>> = Object.freeze({
  orderNumber: freezeSpec({
    key: 'orderNumber',
    imageKey: 'orderNo',
    templateFieldName: 'order_number',
    generatedFieldName: 'wp_order_number',
    overlayRect: { x: 411.7, top: 142.8898, w: 82.2, h: 16.5 },
    dir: 'ltr',
    align: 'right',
    multiline: false,
  }),
  orderDate: freezeSpec({
    key: 'orderDate',
    imageKey: 'date',
    templateFieldName: 'order_date',
    generatedFieldName: 'wp_order_date',
    overlayRect: { x: 34.5, top: 142.8898, w: 82.2, h: 16.5 },
    dir: 'ltr',
    align: 'left',
    multiline: false,
  }),
  projectName: freezeSpec({
    key: 'projectName',
    imageKey: 'name',
    templateFieldName: 'customer_name',
    generatedFieldName: 'wp_project_name',
    overlayRect: { x: 370.5, top: 216.5898, w: 163.3, h: 17 },
    dir: 'rtl',
    align: 'right',
    multiline: false,
  }),
  deliveryAddress: freezeSpec({
    key: 'deliveryAddress',
    imageKey: 'address',
    templateFieldName: 'address',
    generatedFieldName: 'wp_delivery_address',
    overlayRect: { x: 38.7, top: 244.0898, w: 404.055, h: 17 },
    dir: 'rtl',
    align: 'right',
    multiline: false,
  }),
  phone: freezeSpec({
    key: 'phone',
    imageKey: 'phone',
    templateFieldName: 'phone',
    generatedFieldName: 'wp_phone',
    overlayRect: { x: 204.6, top: 215.5898, w: 115.6, h: 17 },
    dir: 'ltr',
    align: 'right',
    multiline: false,
  }),
  mobile: freezeSpec({
    key: 'mobile',
    imageKey: 'mobile',
    templateFieldName: 'mobile',
    generatedFieldName: 'wp_mobile',
    overlayRect: { x: 38.7, top: 215.5898, w: 124.7, h: 17 },
    dir: 'ltr',
    align: 'right',
    multiline: false,
  }),
  details: freezeSpec({
    key: 'details',
    imageKey: 'details',
    templateFieldName: 'order_details',
    generatedFieldName: 'wp_order_details',
    overlayRect: { x: 34, top: 691.8898, w: 526, h: 414 },
    dir: 'rtl',
    align: 'right',
    multiline: true,
  }),
  notes: freezeSpec({
    key: 'notes',
    imageKey: 'notes',
    templateFieldName: 'notes',
    generatedFieldName: 'wp_notes',
    overlayRect: { x: 34, top: 775.8898, w: 526, h: 49 },
    dir: 'rtl',
    align: 'right',
    multiline: true,
  }),
});

export const ORDER_PDF_REQUIRED_TEMPLATE_FIELDS = Object.freeze(
  ORDER_PDF_FIELD_KEYS.map(key => ORDER_PDF_FIELD_SPECS[key].templateFieldName)
);

export const ORDER_PDF_TEMPLATE_BOXES: Readonly<Record<OrderPdfFieldKey, OrderPdfTemplateBoxLike>> =
  Object.freeze(buildOrderPdfFieldRecord((_key, spec) => spec.templateBox));

export const ORDER_PDF_OVERLAY_FIELD_RECTS: Readonly<Record<OrderPdfFieldKey, OrderPdfOverlayFieldRectLike>> =
  Object.freeze(buildOrderPdfFieldRecord((_key, spec) => spec.overlayRect));

export const ORDER_PDF_IMAGE_TEMPLATE_BOXES: Readonly<
  Record<OrderPdfImageFieldKey, OrderPdfTemplateBoxLike>
> = Object.freeze({
  orderNo: ORDER_PDF_FIELD_SPECS.orderNumber.templateBox,
  date: ORDER_PDF_FIELD_SPECS.orderDate.templateBox,
  name: ORDER_PDF_FIELD_SPECS.projectName.templateBox,
  address: ORDER_PDF_FIELD_SPECS.deliveryAddress.templateBox,
  phone: ORDER_PDF_FIELD_SPECS.phone.templateBox,
  mobile: ORDER_PDF_FIELD_SPECS.mobile.templateBox,
  details: ORDER_PDF_FIELD_SPECS.details.templateBox,
  notes: ORDER_PDF_FIELD_SPECS.notes.templateBox,
});

export function listOrderPdfFieldSpecs(): readonly OrderPdfFieldSpec[] {
  return ORDER_PDF_FIELD_KEYS.map(key => ORDER_PDF_FIELD_SPECS[key]);
}

export function computeOrderPdfOverlayFieldStyleMap(
  cssScale: number
): Record<OrderPdfFieldKey, OrderPdfOverlayFieldStyle> {
  return buildOrderPdfFieldRecord((key): OrderPdfOverlayFieldStyle => {
    const rect = ORDER_PDF_OVERLAY_FIELD_RECTS[key];
    return {
      left: rect.x * cssScale,
      top: (rect.top - rect.h) * cssScale,
      width: rect.w * cssScale,
      height: rect.h * cssScale,
    };
  });
}
