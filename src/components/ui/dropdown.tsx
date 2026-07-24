import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type DropdownItem =
  | {
      tipo: "item";
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      atalho?: string;
    }
  | { tipo: "separador" };

/**
 * Dropdown — construído à mão. Roving tabindex com ↑↓, Enter/Space seleciona, Esc fecha.
 * Foco retorna ao gatilho.
 */
export function Dropdown({
  trigger,
  itens,
  align = "start",
}: {
  trigger: ReactElement;
  itens: DropdownItem[];
  align?: "start" | "end";
}) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const gatilhoRef = useRef<HTMLElement | null>(null);
  const menuId = useId();

  const itensSelecionaveis = itens
    .map((it, i) => ({ it, i }))
    .filter(
      ({ it }) => it.tipo === "item" && !("disabled" in it && it.disabled),
    );

  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        (gatilhoRef.current as HTMLElement | null)?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtivo((a) => {
          const idx = itensSelecionaveis.findIndex(({ i }) => i === a);
          const prox =
            itensSelecionaveis[(idx + 1) % itensSelecionaveis.length];
          return prox?.i ?? a;
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtivo((a) => {
          const idx = itensSelecionaveis.findIndex(({ i }) => i === a);
          const prox =
            itensSelecionaveis[
              (idx - 1 + itensSelecionaveis.length) % itensSelecionaveis.length
            ];
          return prox?.i ?? a;
        });
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const it = itens[ativo];
        if (it && it.tipo === "item" && !it.disabled) {
          it.onSelect();
          setAberto(false);
          (gatilhoRef.current as HTMLElement | null)?.focus();
        }
      }
    }
    function onClickFora(e: MouseEvent) {
      if (!menuRef.current) return;
      const alvo = e.target as Node;
      if (menuRef.current.contains(alvo)) return;
      if (gatilhoRef.current && gatilhoRef.current.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickFora);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickFora);
    };
  }, [aberto, ativo, itens, itensSelecionaveis]);

  useEffect(() => {
    if (aberto) {
      const primeiro = itensSelecionaveis[0]?.i ?? 0;
      setAtivo(primeiro);
    }
  }, [aberto, itensSelecionaveis]);

  if (!isValidElement(trigger)) return null;

  const gatilho = cloneElement(
    trigger as ReactElement<Record<string, unknown>>,
    {
      ref: (el: HTMLElement | null) => {
        gatilhoRef.current = el;
      },
      "aria-haspopup": "menu",
      "aria-expanded": aberto,
      "aria-controls": aberto ? menuId : undefined,
      onClick: (e: React.MouseEvent) => {
        const original = (
          trigger.props as { onClick?: (e: React.MouseEvent) => void }
        ).onClick;
        original?.(e);
        setAberto((a) => !a);
      },
    },
  );

  return (
    <div className="relative inline-block">
      {gatilho}
      <AnimatePresence>
        {aberto ? (
          <motion.div
            key="dropdown-menu"
            ref={menuRef}
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            className={cn(
              "absolute z-40 mt-1 min-w-[180px] rounded-[6px] border border-line bg-canvas p-1 shadow-float",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {itens.map((it, i) =>
              it.tipo === "separador" ? (
                <div key={i} role="separator" className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  disabled={it.disabled}
                  tabIndex={ativo === i ? 0 : -1}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => {
                    it.onSelect();
                    setAberto(false);
                    gatilhoRef.current?.focus();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-[4px] px-2 py-1.5 text-left text-[13px]",
                    ativo === i ? "bg-raise text-ink" : "text-ink",
                    "disabled:text-ink-faint disabled:pointer-events-none",
                  )}
                >
                  <span>{it.label}</span>
                  {"atalho" in it && it.atalho ? (
                    <span className="meta-11 text-ink-faint">{it.atalho}</span>
                  ) : null}
                </button>
              ),
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Menu wrapper de conveniência quando o gatilho precisa ser texto puro.
 */
export function DropdownLabel({ children }: { children: ReactNode }) {
  return <span className="eyebrow px-2 py-1">{children}</span>;
}
