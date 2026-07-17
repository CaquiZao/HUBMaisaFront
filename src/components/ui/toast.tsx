import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Toast = {
  id: string;
  titulo: string;
  descricao?: string;
  variante?: "info" | "erro";
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => setMounted(true), []);

  const remover = useCallback((id: string) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) clearTimeout(timer);
    delete timers.current[id];
  }, []);

  const push = useCallback<ToastCtx["push"]>(
    (t) => {
      const id = crypto.randomUUID();
      setToasts((atual) => [...atual, { ...t, id }]);
      timers.current[id] = setTimeout(() => remover(id), 4000);
    },
    [remover],
  );

  useEffect(() => {
    const registrados = timers.current;
    return () => {
      Object.values(registrados).forEach(clearTimeout);
    };
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      {mounted
        ? createPortal(
            <div
              role="region"
              aria-label="Notificações"
              className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[320px] flex-col gap-2"
            >
              <AnimatePresence initial={false}>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                    className="pointer-events-auto rounded-[10px] border border-line bg-canvas p-3 shadow-float"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-medium text-ink">
                          {t.titulo}
                        </p>
                        {t.descricao ? (
                          <p className="mt-0.5 text-[12px] text-ink-muted">
                            {t.descricao}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => remover(t.id)}
                        aria-label="Fechar notificação"
                        className="text-ink-faint hover:text-ink"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 3l8 8M11 3l-8 8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast fora de ToastProvider");
  return ctx;
}
