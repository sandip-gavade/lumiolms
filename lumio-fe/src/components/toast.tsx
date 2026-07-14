'use client';

import { CheckCircle2, XCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, variant: ToastItem['variant'] = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-[360px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card-lg animate-fadeUp ${
              t.variant === 'success'
                ? 'bg-white border-ink-200 text-ink-800'
                : 'bg-white border-danger-lighter text-ink-800'
            }`}
          >
            {t.variant === 'success' ? (
              <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
            ) : (
              <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
            )}
            <span className="text-sm leading-snug flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-600 shrink-0">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
