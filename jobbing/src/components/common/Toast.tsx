"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn, uid } from "@/lib/utils";
import styles from "./Toast.module.css";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = uid();
      setToasts((prev) => [...prev, { id, message, tone }]);
      const timer = setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className={styles.region}>
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(styles.toast, styles[item.tone])}
          >
            {item.tone === "success" && (
              <CheckCircle2 className={styles.icon} aria-hidden />
            )}
            {item.tone === "error" && (
              <CircleAlert className={styles.icon} aria-hidden />
            )}
            {item.tone === "info" && (
              <Info className={styles.icon} aria-hidden />
            )}
            <p className={styles.message}>{item.message}</p>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
            >
              <X className={styles.closeIcon} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}