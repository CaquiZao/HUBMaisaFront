import { IconSearch } from "@/components/icons";

/**
 * SearchTrigger — barra de 36px no topo do conteúdo. Abre o palette (⌘K).
 */
export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Abrir busca (Cmd K)"
      className={
        "group flex h-9 w-full max-w-[540px] items-center gap-2 rounded-[6px] " +
        "border border-line bg-canvas px-2.5 text-left " +
        "hover:border-line-strong hover:bg-raise " +
        "transition-colors duration-[120ms]"
      }
    >
      <span className="text-ink-faint" aria-hidden="true">
        <IconSearch />
      </span>
      <span className="flex-1 text-[13px] text-ink-faint">
        Buscar recursos, ideias, tarefas
      </span>
    </button>
  );
}
