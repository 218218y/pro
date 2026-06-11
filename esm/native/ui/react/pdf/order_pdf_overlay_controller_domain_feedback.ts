export type ToastLevel = 'success' | 'warning' | 'error' | 'info';

export type UiFeedbackLike = {
  toast: (message: string, level: ToastLevel) => void;
};
