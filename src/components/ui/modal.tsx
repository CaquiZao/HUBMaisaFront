import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal — focus trap, Esc fecha, foco retorna ao gatilho (§13).
 * Sem Radix. Sem shadcn.
 */
export function Modal({
  open,
  onClose,
  titulo,
  descricao,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const painelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const tituloId = useId();
  const descricaoId = useId();

  // salvar elemento a retornar o foco
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [open]);

  // Focar primeiro item focável do modal apenas ao abrir
  useEffect(() => {
    if (!open) return;
    const painel = painelRef.current;
    if (!painel) return;

    // Apenas na primeira vez
    const initial = painel.querySelector<HTMLElement>(FOCUSABLE);
    if (initial && document.activeElement === document.body) {
      initial.focus();
    }
  }, [open]);

  // Esc + focus trap
  useEffect(() => {
    if (!open) return;

    const painel = painelRef.current;
    if (!painel) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focaveis = painel!.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAntes;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="modal-container"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 sm:p-12"
        >
          <motion.div
            data-motion="fade"
            className="fixed inset-0 bg-[rgba(13,21,39,0.35)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={descricao ? descricaoId : undefined}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            className={cn(
              "relative z-10 mt-16 w-full rounded-[10px] border border-line bg-canvas shadow-float",
            )}
            style={{ maxWidth: width }}
          >
            <header className="border-b border-line px-5 py-4">
              <h2 id={tituloId} className="text-[14px] font-medium text-ink">
                {titulo}
              </h2>
              {descricao ? (
                <p id={descricaoId} className="mt-1 text-[13px] text-ink-muted">
                  {descricao}
                </p>
              ) : null}
            </header>
            <div className="px-5 py-4">{children}</div>
            {footer ? (
              <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Hook simples pra fechar por Esc quando um consumidor precisar em outro contexto.
 */
export function useEscape(active: boolean, onEscape: () => void) {
  const cb = useCallback(onEscape, [onEscape]);
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cb();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, cb]);
}
