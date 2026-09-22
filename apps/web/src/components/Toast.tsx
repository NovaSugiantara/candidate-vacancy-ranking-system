import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const toastKinds = ['success', 'error'] as const;

type ToastKind = (typeof toastKinds)[number];

type ToastMessage = {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
};

type ToastContextValue = {
  readonly showToast: (message: string, kind?: ToastKind) => void;
};

class ToastContextError extends Error {
  constructor() {
    super('useToast must be used inside ToastProvider.');
    this.name = 'ToastContextError';
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { readonly children: ReactNode }) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutId = useRef<number | undefined>(undefined);

  const dismissToast = useCallback(() => {
    if (timeoutId.current !== undefined) {
      window.clearTimeout(timeoutId.current);
      timeoutId.current = undefined;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      if (timeoutId.current !== undefined) {
        window.clearTimeout(timeoutId.current);
      }

      setToast({ id: Date.now(), kind, message });
      timeoutId.current = window.setTimeout(dismissToast, 5000);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      if (timeoutId.current !== undefined) {
        window.clearTimeout(timeoutId.current);
      }
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-atomic="true" aria-live="polite" className="toast-region" role="status">
        {toast ? (
          <div
            className={`toast toast-${toast.kind}`}
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : undefined}
          >
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss notification"
              className="icon-button"
              onClick={dismissToast}
              type="button"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const toastContext = useContext(ToastContext);

  if (toastContext === null) {
    throw new ToastContextError();
  }

  return toastContext;
};
