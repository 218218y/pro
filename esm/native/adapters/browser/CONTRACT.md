# Browser adapter contract (Pure ESM)

מטרה: להחזיק _כל_ גישה ל-`document`/`window`/DOM בתוך `esm/native/adapters/browser/*`, כדי ש-Core/Platform/Kernel/Builder יישארו "נקיים" (ואפשר יהיה להריץ/לבדוק אותם גם בלי סביבת דפדפן מלאה).

## Namespaces

### `App.browser`

- `App.browser.confirm(message: string): boolean`
- `App.browser.prompt(message: string, def?: unknown): string | null`
- `App.browser.userAgent?: string` (legacy; prefer `getUserAgent()`)
- `App.browser.getWindow(): Window | null`
- `App.browser.getDocument(): Document | null`
- `App.browser.getNavigator(): Navigator | null`
- `App.browser.getLocation(): Location | null`
- `App.browser.getUserAgent(): string`
- `App.browser.getLocationSearch(): string`
- `App.browser.raf(cb: FrameRequestCallback): number` (מחזיר -1 אם לא נתמך)
- `App.browser.caf(handle: number): void`
- `App.browser.now(): number`
- `App.browser.delay(ms: number): Promise<boolean>`
- `App.browser.onWindow(type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions): void`
- `App.browser.offWindow(type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions): void`
- `App.browser.onDocument(type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions): void`
- `App.browser.offDocument(type: string, handler: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions): void`
- `App.browser.getDPR(): number`
- `App.browser.getViewportSize(): { width: number, height: number }`
- `App.browser.getClipboardItemCtor(): ClipboardItem constructor | null`
- `App.browser.clipboardWrite(items: ClipboardItems): Promise<void>`
- `App.browser.clipboardWriteText(text: string): Promise<void>`
- `App.browser.clipboardReadText(): Promise<string>`
- `App.browser.hasDOM(): boolean`
- `App.browser.hasRAF(): boolean`
- `App.browser.hasClipboard(): boolean`
- `App.browser.setDoorStatusCss(isOpen: boolean): void`
- `App.browser.dom` — שמור לעתיד (כיום אובייקט ריק; לא API ציבורי)

### `App.platform`

- `createCanvas(w?: number, h?: number): HTMLCanvasElement | OffscreenCanvas | null`

## Notes

- הכוונה היא ש"דברים נמוכים" (platform/builder/kernel/services) לא יקראו `document.*` ישירות.
- ה-UI צריך להשתמש ב-`esm/native/services/api.js` ל-`get$`/`getQs` וכו'.
- אירועי DOM (כמו resize/pointerdown/visibilitychange) נקשרים ישירות עם `addEventListener`/`removeEventListener` + disposer מסודר, ללא שכבת bind/onDomReady.
