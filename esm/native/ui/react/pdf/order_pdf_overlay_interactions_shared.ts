export type StageGestureState = {
  down: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  startedOnEmpty: boolean;
};

export type RefBox<T> = { current: T };

export type StagePointerEventLike = {
  button?: number;
  pointerId?: number;
  clientX?: number;
  clientY?: number;
  target?: EventTarget | null;
  currentTarget?: EventTarget | null;
};

export type DragEventLike = {
  preventDefault?: () => void;
  stopPropagation?: () => void;
  dataTransfer?: {
    dropEffect?: string;
    effectAllowed?: string;
    files?: FileList | null;
    items?: DataTransferItemList | null;
    types?: readonly string[];
    clearData?: (type?: string) => void;
    setData?: (type: string, data: string) => void;
    getData?: (type: string) => string;
    setDragImage?: (image: Element, x: number, y: number) => void;
  } | null;
};

export type InputChangeEventLike = {
  target?: {
    files?: FileList | null;
    value?: string;
  } | null;
};
