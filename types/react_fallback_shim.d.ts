declare module 'react' {
  export type Key = string | number;
  export type ReactText = string | number;
  export type ReactNode = any;
  export type DependencyList = readonly unknown[];
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type Dispatch<A> = (value: A) => void;
  export type RefObject<T> = { readonly current: T | null };
  export type MutableRefObject<T> = { current: T };
  export type LegacyRef<T> = ((instance: T | null) => void) | MutableRefObject<T | null> | null;
  export type Ref<T> = LegacyRef<T>;
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type ComponentType<P = {}> = ((props: P) => ReactElement | null) | ComponentClass<P>;
  export type FC<P = {}> = FunctionComponent<P>;

  export type CSSProperties = Record<string, string | number | undefined>;

  export interface Attributes {
    key?: Key | null;
  }
  export interface RefAttributes<T> {
    ref?: Ref<T>;
  }
  export interface ClassAttributes<T> extends Attributes, RefAttributes<T> {}
  export interface DOMAttributes<T> {
    children?: ReactNode;
    dangerouslySetInnerHTML?: { __html: string };
    onClick?: MouseEventHandler<T>;
    onChange?: ChangeEventHandler<T>;
    onKeyDown?: KeyboardEventHandler<T>;
    onKeyUp?: KeyboardEventHandler<T>;
    onPointerDown?: PointerEventHandler<T>;
    onPointerMove?: PointerEventHandler<T>;
    onPointerUp?: PointerEventHandler<T>;
    onPointerCancel?: PointerEventHandler<T>;
    onMouseDown?: MouseEventHandler<T>;
    onMouseMove?: MouseEventHandler<T>;
    onMouseUp?: MouseEventHandler<T>;
    onMouseEnter?: MouseEventHandler<T>;
    onMouseLeave?: MouseEventHandler<T>;
    onDragStart?: DragEventHandler<T>;
    onDragOver?: DragEventHandler<T>;
    onDragEnd?: DragEventHandler<T>;
    onDrop?: DragEventHandler<T>;
    onFocus?: FocusEventHandler<T>;
    onBlur?: FocusEventHandler<T>;
    onWheel?: WheelEventHandler<T>;
    onInput?: FormEventHandler<T>;
    onBeforeInput?: FormEventHandler<T>;
    onCompositionStart?: FormEventHandler<T>;
    onCompositionUpdate?: FormEventHandler<T>;
    onPaste?: FormEventHandler<T>;
    onCut?: FormEventHandler<T>;
    onSubmit?: FormEventHandler<T>;
  }
  export interface HTMLAttributes<T> extends DOMAttributes<T> {
    className?: string;
    style?: CSSProperties;
    title?: string;
    role?: string;
    tabIndex?: number;
    id?: string;
    hidden?: boolean;
    contentEditable?: boolean | 'inherit' | 'plaintext-only';
    suppressContentEditableWarning?: boolean;
    spellCheck?: boolean;
    draggable?: boolean;
    children?: ReactNode;
    'aria-hidden'?: boolean | 'true' | 'false';
    'aria-label'?: string;
    'aria-pressed'?: boolean | 'true' | 'false';
    'aria-selected'?: boolean | 'true' | 'false';
    'aria-expanded'?: boolean | 'true' | 'false';
    'aria-controls'?: string;
    'aria-describedby'?: string;
    'aria-current'?: string | boolean;
    'data-no-dismiss-edit'?: string;
    [key: `data-${string}`]: string | number | boolean | undefined;
  }
  export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }
  export interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    accept?: string;
    autoComplete?: string;
    checked?: boolean;
    disabled?: boolean;
    inputMode?: string;
    max?: number | string;
    min?: number | string;
    multiple?: boolean;
    name?: string;
    placeholder?: string;
    readOnly?: boolean;
    step?: number | string;
    type?: string;
    value?: string | number | readonly string[];
  }
  export interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: boolean;
    multiple?: boolean;
    name?: string;
    value?: string | number | readonly string[];
  }

  export interface SyntheticEvent<T = Element, E = Event> {
    nativeEvent: E;
    currentTarget: T;
    target: EventTarget & T;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    preventDefault(): void;
    isDefaultPrevented(): boolean;
    stopPropagation(): void;
    stopImmediatePropagation?(): void;
    isPropagationStopped(): boolean;
    persist(): void;
    timeStamp: number;
    type: string;
  }
  export interface DragDataTransferLike {
    effectAllowed:
      | 'none'
      | 'copy'
      | 'copyLink'
      | 'copyMove'
      | 'link'
      | 'linkMove'
      | 'move'
      | 'all'
      | 'uninitialized';
    dropEffect?: string;
    files?: FileList;
    items?: DataTransferItemList;
    types?: readonly string[];
    clearData?(type?: string): void;
    setData(type: string, data: string): void;
    getData(type: string): string;
    setDragImage?(image: Element, x: number, y: number): void;
  }
  export interface DragEvent<T = Element> extends MouseEvent<T> {
    dataTransfer: DragDataTransferLike | null;
  }
  export interface PointerEvent<T = Element> extends MouseEvent<T> {
    pointerId: number;
    pressure: number;
    pointerType: string;
  }
  export interface FocusEvent<T = Element> extends SyntheticEvent<T> {
    relatedTarget: EventTarget | null;
  }
  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> {}
  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T> {
    altKey: boolean;
    charCode: number;
    ctrlKey: boolean;
    code: string;
    key: string;
    keyCode: number;
    metaKey: boolean;
    repeat: boolean;
    shiftKey: boolean;
    which: number;
    getModifierState(key: string): boolean;
  }
  export interface MouseEvent<T = Element, E = globalThis.MouseEvent> extends SyntheticEvent<T, E> {
    altKey: boolean;
    button: number;
    buttons: number;
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    metaKey: boolean;
    movementX: number;
    movementY: number;
    pageX: number;
    pageY: number;
    screenX: number;
    screenY: number;
    shiftKey: boolean;
  }
  export interface WheelEvent<T = Element> extends MouseEvent<T, globalThis.WheelEvent> {
    deltaMode: number;
    deltaX: number;
    deltaY: number;
    deltaZ: number;
  }

  export type EventHandler<E extends SyntheticEvent<any>> = (event: E) => void;
  export type DragEventHandler<T = Element> = EventHandler<DragEvent<T>>;
  export type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent<T>>;
  export type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent<T>>;
  export type MouseEventHandler<T = Element> = EventHandler<MouseEvent<T>>;
  export type PointerEventHandler<T = Element> = EventHandler<PointerEvent<T>>;
  export type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;
  export type FormEventHandler<T = Element> = EventHandler<FormEvent<T>>;
  export type WheelEventHandler<T = Element> = EventHandler<WheelEvent<T>>;

  export type ReactElement<_P = any, _T = any> = any;
  export interface FunctionComponent<P = {}> {
    (props: PropsWithChildren<P>): ReactElement | null;
  }
  export interface ComponentClass<P = {}, S = {}> {
    new (props: P): Component<P, S>;
  }

  export class Component<P = {}, S = {}, _SS = any> {
    constructor(props: P);
    props: Readonly<P>;
    state: Readonly<S>;
    setState(
      state: Partial<S> | ((prevState: Readonly<S>, props: Readonly<P>) => Partial<S> | S | null)
    ): void;
    forceUpdate(): void;
    render(): ReactNode;
  }

  export interface ErrorInfo {
    componentStack: string;
  }

  export function createElement(type: any, props?: any, ...children: ReactNode[]): ReactElement;
  export interface Context<T> {
    Provider: FunctionComponent<{ value: T; children?: ReactNode }>;
    Consumer: FunctionComponent<{ children: (value: T) => ReactNode }>;
    _currentValue?: T;
  }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  export function useMemo<T>(factory: () => T, deps: DependencyList | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: DependencyList | undefined
  ): T;
  export function useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  export function useSyncExternalStore<T>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T
  ): T;
  export function useId(): string;
  export function memo<P>(
    component: FunctionComponent<P>,
    propsAreEqual?: (prev: Readonly<P>, next: Readonly<P>) => boolean
  ): FunctionComponent<P>;
  export function forwardRef<T, P = {}>(
    render: (props: P, ref: Ref<T>) => ReactElement | null
  ): FunctionComponent<P & RefAttributes<T>>;
  export function lazy<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>): T;
  export const Suspense: FunctionComponent<{ fallback?: ReactNode }>;
  export const StrictMode: FunctionComponent<{ children?: ReactNode }>;

  export namespace JSX {
    interface Element extends ReactElement<any, any> {}
    interface ElementClass {
      render(): ReactNode;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends Attributes {}
    interface IntrinsicClassAttributes<T> extends ClassAttributes<T> {}
    interface IntrinsicElements {
      div: HTMLAttributes<HTMLDivElement>;
      span: HTMLAttributes<HTMLSpanElement>;
      button: ButtonHTMLAttributes<HTMLButtonElement>;
      input: InputHTMLAttributes<HTMLInputElement>;
      select: SelectHTMLAttributes<HTMLSelectElement>;
      option: HTMLAttributes<HTMLOptionElement>;
      textarea: HTMLAttributes<HTMLTextAreaElement>;
      canvas: HTMLAttributes<HTMLCanvasElement>;
      img: HTMLAttributes<HTMLImageElement>;
      label: HTMLAttributes<HTMLLabelElement>;
      i: HTMLAttributes<HTMLElement>;
      p: HTMLAttributes<HTMLParagraphElement>;
      ul: HTMLAttributes<HTMLUListElement>;
      li: HTMLAttributes<HTMLLIElement>;
      section: HTMLAttributes<HTMLElement>;
      header: HTMLAttributes<HTMLElement>;
      footer: HTMLAttributes<HTMLElement>;
      strong: HTMLAttributes<HTMLElement>;
      em: HTMLAttributes<HTMLElement>;
      br: HTMLAttributes<HTMLElement>;
      [elemName: string]: HTMLAttributes<any>;
    }
  }
}

type ReactJsxElement = import('react').ReactElement<any, any>;
type ReactJsxNode = import('react').ReactNode;
type ReactJsxAttributes = import('react').Attributes;
type ReactJsxClassAttributes<T> = import('react').ClassAttributes<T>;

declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface Element extends ReactJsxElement {}
    interface ElementClass {
      render(): ReactJsxNode;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends ReactJsxAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJsxClassAttributes<T> {}
    interface IntrinsicElements {
      div: HTMLAttributes<HTMLDivElement>;
      span: HTMLAttributes<HTMLSpanElement>;
      button: ButtonHTMLAttributes<HTMLButtonElement>;
      input: InputHTMLAttributes<HTMLInputElement>;
      select: SelectHTMLAttributes<HTMLSelectElement>;
      option: HTMLAttributes<HTMLOptionElement>;
      textarea: HTMLAttributes<HTMLTextAreaElement>;
      canvas: HTMLAttributes<HTMLCanvasElement>;
      img: HTMLAttributes<HTMLImageElement>;
      label: HTMLAttributes<HTMLLabelElement>;
      i: HTMLAttributes<HTMLElement>;
      p: HTMLAttributes<HTMLParagraphElement>;
      ul: HTMLAttributes<HTMLUListElement>;
      li: HTMLAttributes<HTMLLIElement>;
      section: HTMLAttributes<HTMLElement>;
      header: HTMLAttributes<HTMLElement>;
      footer: HTMLAttributes<HTMLElement>;
      strong: HTMLAttributes<HTMLElement>;
      em: HTMLAttributes<HTMLElement>;
      br: HTMLAttributes<HTMLElement>;
      [elemName: string]: HTMLAttributes<any>;
    }
  }

  export function jsx(type: any, props: any, key?: string): any;
  export function jsxs(type: any, props: any, key?: string): any;
  export const Fragment: any;
}

declare module 'react-dom' {
  export function createPortal(
    children: import('react').ReactNode,
    container: Element | DocumentFragment
  ): import('react').ReactPortal;
}

declare module 'react-dom/client' {
  export type Root = { render(children: import('react').ReactNode): void; unmount(): void };
  export function createRoot(container: Element | DocumentFragment): Root;
}

type ReactGlobalJsxElement = import('react').ReactElement<any, any>;
type ReactGlobalJsxNode = import('react').ReactNode;
type ReactGlobalJsxAttributes = import('react').Attributes;
type ReactGlobalJsxClassAttributes<T> = import('react').ClassAttributes<T>;

namespace JSX {
  interface Element extends ReactGlobalJsxElement {}
  interface ElementClass {
    render(): ReactGlobalJsxNode;
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes extends ReactGlobalJsxAttributes {}
  interface IntrinsicClassAttributes<T> extends ReactGlobalJsxClassAttributes<T> {}
  interface IntrinsicElements {
    div: HTMLAttributes<HTMLDivElement>;
    span: HTMLAttributes<HTMLSpanElement>;
    button: ButtonHTMLAttributes<HTMLButtonElement>;
    input: InputHTMLAttributes<HTMLInputElement>;
    select: SelectHTMLAttributes<HTMLSelectElement>;
    option: HTMLAttributes<HTMLOptionElement>;
    textarea: HTMLAttributes<HTMLTextAreaElement>;
    canvas: HTMLAttributes<HTMLCanvasElement>;
    img: HTMLAttributes<HTMLImageElement>;
    label: HTMLAttributes<HTMLLabelElement>;
    i: HTMLAttributes<HTMLElement>;
    p: HTMLAttributes<HTMLParagraphElement>;
    ul: HTMLAttributes<HTMLUListElement>;
    li: HTMLAttributes<HTMLLIElement>;
    section: HTMLAttributes<HTMLElement>;
    header: HTMLAttributes<HTMLElement>;
    footer: HTMLAttributes<HTMLElement>;
    strong: HTMLAttributes<HTMLElement>;
    em: HTMLAttributes<HTMLElement>;
    br: HTMLAttributes<HTMLElement>;
    [elemName: string]: HTMLAttributes<any>;
  }
}
