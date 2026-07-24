import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useIdeias } from "@/lib/ideias-store";
import { useRecursosLista } from "@/lib/recursos-store";
import { useCardsState } from "@/lib/cards-store";
import { useMembros } from "@/lib/membros-store";
import { useToast } from "@/components/ui";

type Item = {
  id: string;
  grupo: "Recursos" | "Cards" | "Ideias" | "Membros";
  titulo: string;
  meta?: string;
  busca: string;
  onSelect: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedValue, setSelectedValue] = useState("");

  const recursos = useRecursosLista();
  const cards = useCardsState();
  const ideias = useIdeias();
  const membros = useMembros();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const rec = recursos.map<Item>((r) => ({
      id: `rec-${r.id}`,
      grupo: "Recursos",
      titulo: r.titulo,
      meta: r.tipo,
      busca: `rec-${r.id} Recursos ${r.titulo} ${r.descricao || ""} ${r.tipo} ${r.rotulo || ""} ${r.categoria || ""}`,
      onSelect: () =>
        navigate({ to: "/acervo", search: { id: r.id } as never }),
    }));
    const crd = cards.map<Item>((c) => ({
      id: `card-${c.id}`,
      grupo: "Cards",
      titulo: c.titulo,
      meta: c.coluna,
      busca: `card-${c.id} Cards ${c.titulo} ${c.descricao || ""} ${c.categoria || ""} ${c.autorId || ""} ${c.responsaveisIds?.join(" ") || ""}`,
      onSelect: () => navigate({ to: "/kanban" }),
    }));
    const ide = ideias.map<Item>((i) => ({
      id: `ide-${i.id}`,
      grupo: "Ideias",
      titulo: i.titulo,
      meta: `${i.votos.length} votos`,
      busca: `ide-${i.id} Ideias ${i.titulo} ${i.corpo || ""} ${i.categoria || ""} ${i.autorId || ""}`,
      onSelect: () => navigate({ to: "/ideias" }),
    }));
    const mem = membros.map<Item>((m) => ({
      id: `mem-${m.id}`,
      grupo: "Membros",
      titulo: m.nome,
      busca: `mem-${m.id} Membros ${m.nome}`,
      onSelect: () => navigate({ to: "/config" }),
    }));
    return [...rec, ...crd, ...ide, ...mem];
  }, [navigate, recursos, cards, ideias, membros]);

  const grupos: Item["grupo"][] = ["Recursos", "Cards", "Ideias", "Membros"];
  const hasQuery = query.trim().length > 0;

  const filtroTem = useMemo(() => {
    if (!hasQuery) return true;
    const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.some((it) => {
      const textToSearch = it.busca.toLowerCase();
      return searchWords.every((word) => textToSearch.includes(word));
    });
  }, [hasQuery, items, query]);

  function fechar() {
    onOpenChange(false);
  }

  function selecionar(cb: () => void) {
    cb();
    fechar();
  }

  function capturarIdeia() {
    push({
      titulo: "Ideia capturada",
      descricao: query.trim(),
    });
    fechar();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
          style={{
            background: "rgba(13, 21, 39, 0.32)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            className="w-full max-w-[560px] overflow-hidden rounded-[10px] border border-line bg-canvas shadow-float"
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
          >
            <Command
              label="Busca global"
              value={selectedValue}
              onValueChange={setSelectedValue}
              shouldFilter
              filter={(value, search) => {
                if (!search) return 1;
                const searchWords = search
                  .toLowerCase()
                  .split(/\s+/)
                  .filter(Boolean);
                const textToSearch = value.toLowerCase();
                return searchWords.every((word) => textToSearch.includes(word))
                  ? 1
                  : 0;
              }}
            >
              <div className="border-b border-line px-3">
                <Command.Input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Buscar recursos, cards, ideias, membros"
                  className="h-11 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
                {hasQuery && !filtroTem ? (
                  <button
                    type="button"
                    onClick={capturarIdeia}
                    className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[13px] text-ink hover:bg-raise"
                  >
                    <span className="text-ink-faint">+</span>
                    <span>
                      Capturar{" "}
                      <span className="font-mono text-[12px] text-ink-muted">
                        "{query.trim()}"
                      </span>{" "}
                      como ideia
                    </span>
                  </button>
                ) : (
                  <>
                    <Command.Empty className="px-2.5 py-6 text-center text-[13px] text-ink-faint">
                      Sem resultados.
                    </Command.Empty>
                    {grupos.map((g) => (
                      <Command.Group
                        key={g}
                        heading={
                          <span className="meta-11 px-2.5 pb-1 pt-2 text-ink-faint">
                            {g}
                          </span>
                        }
                      >
                        {items
                          .filter((it) => it.grupo === g)
                          .map((it) => (
                            <Command.Item
                              key={it.id}
                              value={it.busca}
                              onSelect={() => selecionar(it.onSelect)}
                              className="group relative flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[13px] text-ink data-[selected=true]:bg-raise"
                            >
                              {selectedValue === it.busca ? (
                                <motion.span
                                  layoutId="active-bar"
                                  className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold"
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 38,
                                  }}
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span className="flex-1 truncate">
                                {it.titulo}
                              </span>
                              {it.meta ? (
                                <span className="meta-11 text-ink-faint">
                                  {it.meta}
                                </span>
                              ) : null}
                            </Command.Item>
                          ))}
                      </Command.Group>
                    ))}
                  </>
                )}
              </Command.List>
              <div className="flex items-center justify-between border-t border-line px-3 py-2">
                <span className="meta-11 text-ink-faint">
                  <kbd className="rounded border border-line px-1">↑↓</kbd>{" "}
                  navegar{"  "}
                  <kbd className="rounded border border-line px-1">
                    enter
                  </kbd>{" "}
                  abrir
                </span>
                <span className="meta-11 text-ink-faint">
                  <kbd className="rounded border border-line px-1">esc</kbd>{" "}
                  fechar
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Hook central de atalhos globais (§11):
 *  ⌘K / Ctrl+K  → abrir palette
 *  /            → foco na busca (abre palette)
 *  C            → capturar ideia (abre palette vazio; usuário digita)
 *  U            → subir voto na ideia focada (no-op global)
 *  G I/A/K/D    → navegar (Ideias / Acervo / Kanban / Início)
 *  Esc          → fechar palette
 * Ignorado quando foco está em input, textarea, select ou contenteditable.
 */
export function useHubShortcuts(
  paletteOpen: boolean,
  setPaletteOpen: (v: boolean) => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [paletteOpen, setPaletteOpen]);
}
