import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import type { AppContainer } from '../../../../types';

import { restoreReactFeedbackHost, setReactFeedbackHost } from '../feedback_shared.js';
import {
  clearOverlayFeedbackPromptFocusTimers,
  clearOverlayFeedbackToastTimers,
  createOverlayFeedbackPromptFocusTimerState,
  createOverlayFeedbackToastTimerState,
  scheduleOverlayFeedbackPromptFocusTimers,
  scheduleOverlayFeedbackToastTimers,
} from './overlay_feedback_host_timers.js';
import {
  type ModalState,
  type ToastItem,
  readInputValue,
  readToastKind,
  hasClosestElement,
  reportOverlayAppNonFatal,
} from './overlay_app_shared.js';

export interface OverlayFeedbackHostBridge {
  app: AppContainer;
  doc: Document | null;
  toastContainer: HTMLElement | null;
}

function ToastView(props: {
  key?: string | number;
  app: AppContainer;
  item: ToastItem;
  onRemove: (id: number) => void;
}) {
  const { app, item, onRemove } = props;
  const [shown, setShown] = useState(false);
  const timerStateRef = useRef(createOverlayFeedbackToastTimerState());

  useEffect(() => {
    scheduleOverlayFeedbackToastTimers({
      App: app,
      state: timerStateRef.current,
      itemId: item.id,
      setShown,
      onRemove,
      report: reportOverlayAppNonFatal,
    });
    return () => {
      clearOverlayFeedbackToastTimers(app, timerStateRef.current);
    };
  }, [app, item.id, onRemove]);

  let icon = 'fa-check-circle';
  if (item.kind === 'error') icon = 'fa-times-circle';
  if (item.kind === 'info') icon = 'fa-info-circle';

  return (
    <div className={`toast toast-${item.kind}${shown ? ' show' : ''}`}>
      <i className={`fas ${icon}`} /> <span>{item.message}</span>
    </div>
  );
}

export function ReactFeedbackHost(props: { bridge: OverlayFeedbackHostBridge }) {
  const { app, doc, toastContainer } = props.bridge;

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: null,
    title: '',
    message: '',
    value: '',
  });

  const promptCbRef = useRef<((v: string | null) => void) | null>(null);
  const confirmCbRef = useRef<(() => void) | null>(null);
  const confirmCancelCbRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const promptFocusTimerStateRef = useRef(createOverlayFeedbackPromptFocusTimerState());

  const toast = useCallback((msg: unknown, kind?: unknown) => {
    const message = msg == null ? '' : String(msg);
    const nextKind = readToastKind(kind);
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, kind: nextKind, message }]);
  }, []);

  const prompt = useCallback((title: string, defaultValue: string, cb?: ((v: unknown) => void) | null) => {
    promptCbRef.current = typeof cb === 'function' ? (value: string | null) => cb(value) : null;
    confirmCbRef.current = null;
    confirmCancelCbRef.current = null;
    setModal({
      open: true,
      mode: 'prompt',
      title: String(title || ''),
      message: '',
      value: String(defaultValue || ''),
    });
  }, []);

  useLayoutEffect(() => {
    if (!modal.open || modal.mode !== 'prompt') {
      clearOverlayFeedbackPromptFocusTimers(app, promptFocusTimerStateRef.current);
      return;
    }

    const focusAndSelect = () => {
      try {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        try {
          input.select();
        } catch (err) {
          reportOverlayAppNonFatal('feedback-host:prompt-select', err);
        }
        try {
          input.setSelectionRange(0, input.value.length);
        } catch (err) {
          reportOverlayAppNonFatal('feedback-host:prompt-range', err);
        }
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:prompt-focus', err);
      }
    };

    scheduleOverlayFeedbackPromptFocusTimers({
      App: app,
      state: promptFocusTimerStateRef.current,
      report: reportOverlayAppNonFatal,
      scheduleAnimationFrame: focusAndSelect => requestAnimationFrame(focusAndSelect),
      runFocusAndSelect: focusAndSelect,
    });
    return () => {
      clearOverlayFeedbackPromptFocusTimers(app, promptFocusTimerStateRef.current);
    };
  }, [app, modal.mode, modal.open, modal.title]);

  const confirm = useCallback(
    (title: string, message: string, onYes?: (() => void) | null, onNo?: (() => void) | null) => {
      confirmCbRef.current = typeof onYes === 'function' ? onYes : null;
      confirmCancelCbRef.current = typeof onNo === 'function' ? onNo : null;
      promptCbRef.current = null;
      setModal({
        open: true,
        mode: 'confirm',
        title: String(title || ''),
        message: String(message || ''),
        value: '',
      });
    },
    []
  );

  useEffect(() => {
    const host = { toast, prompt, confirm };
    const previous = setReactFeedbackHost(app, host);
    return () => {
      try {
        restoreReactFeedbackHost(app, host, previous);
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:unregister', err);
      }
    };
  }, [app, confirm, prompt, toast]);

  const close = useCallback(
    (opts?: { cancelled?: boolean }) => {
      const shouldCancel = opts?.cancelled === true && modal.open;
      const promptCancelCb = shouldCancel && modal.mode === 'prompt' ? promptCbRef.current : null;
      const confirmCancelCb = shouldCancel && modal.mode === 'confirm' ? confirmCancelCbRef.current : null;
      setModal({ open: false, mode: null, title: '', message: '', value: '' });
      promptCbRef.current = null;
      confirmCbRef.current = null;
      confirmCancelCbRef.current = null;
      try {
        if (promptCancelCb) promptCancelCb(null);
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:prompt-cancel', err);
      }
      try {
        if (confirmCancelCb) confirmCancelCb();
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:confirm-cancel', err);
      }
    },
    [modal.mode, modal.open]
  );

  const confirmOk = useCallback(() => {
    if (!modal.open || !modal.mode) return;
    if (modal.mode === 'prompt') {
      const callback = promptCbRef.current;
      close();
      try {
        if (callback) callback(String(modal.value || ''));
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:prompt-confirm', err);
      }
      return;
    }

    const callback = confirmCbRef.current;
    close();
    try {
      if (callback) callback();
    } catch (err) {
      reportOverlayAppNonFatal('feedback-host:confirm-ok', err);
    }
  }, [close, modal]);

  useEffect(() => {
    if (!modal.open || !doc) return;
    const win = doc.defaultView || null;
    if (!win) return;

    const captureOpts: AddEventListenerOptions = { capture: true };
    const onKeyDown = (event: KeyboardEvent) => {
      try {
        if (!modal.open) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          close({ cancelled: true });
          return;
        }
        if (event.key !== 'Enter') return;
        const active = doc.activeElement || null;
        const inModal = !!(active && hasClosestElement(active) && active.closest('#customPromptModal'));
        if (!inModal) return;
        event.preventDefault();
        confirmOk();
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:modal-keydown', err);
      }
    };

    try {
      win.addEventListener('keydown', onKeyDown, captureOpts);
    } catch (err) {
      reportOverlayAppNonFatal('feedback-host:add-keydown', err);
    }

    return () => {
      try {
        win.removeEventListener('keydown', onKeyDown, captureOpts);
      } catch (err) {
        reportOverlayAppNonFatal('feedback-host:remove-keydown', err);
      }
    };
  }, [close, confirmOk, doc, modal.message, modal.mode, modal.open, modal.title, modal.value]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toastItem => toastItem.id !== id));
  }, []);

  const body = doc && doc.body ? doc.body : null;

  const toastsNode = toastContainer
    ? createPortal(
        <>
          {toasts.map(item => (
            <ToastView key={item.id} app={app} item={item} onRemove={removeToast} />
          ))}
        </>,
        toastContainer
      )
    : null;

  const modalNode = body
    ? createPortal(
        <div id="customPromptModal" className={`modal-overlay${modal.open ? ' open' : ''}`}>
          <div className="modal-box">
            <div id="modalTitle" className="modal-title">
              {modal.title}
            </div>

            {modal.open && modal.mode === 'confirm' ? (
              <p id="modalMessage" className="modal-message">
                {modal.message}
              </p>
            ) : (
              <p id="modalMessage" className="modal-message hidden" />
            )}

            {modal.open && modal.mode === 'prompt' ? (
              <input
                id="modalInput"
                ref={(el: HTMLInputElement | null) => {
                  inputRef.current = el;
                }}
                type="text"
                className="modal-input"
                name="modalPrompt"
                aria-labelledby="modalTitle"
                aria-describedby="modalMessage"
                value={modal.value}
                onChange={(event: import('react').ChangeEvent<HTMLInputElement>) => {
                  const nextValue = readInputValue(event);
                  setModal(prev => (prev.open ? { ...prev, value: nextValue } : prev));
                }}
              />
            ) : (
              <input
                id="modalInput"
                className="modal-input hidden"
                name="modalPrompt"
                aria-labelledby="modalTitle"
                aria-describedby="modalMessage"
                aria-hidden="true"
                tabIndex={-1}
                readOnly
                value=""
              />
            )}

            <div className="modal-actions">
              <button
                id="modalConfirmBtn"
                type="button"
                className={modal.open && modal.mode === 'confirm' ? 'btn btn-danger' : 'btn btn-save'}
                onClick={confirmOk}
              >
                אישור
              </button>
              <button
                id="modalCancelBtn"
                type="button"
                className="btn btn-cancel"
                onClick={() => close({ cancelled: true })}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>,
        body
      )
    : null;

  return (
    <>
      {toastsNode}
      {modalNode}
    </>
  );
}
