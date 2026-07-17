import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { TipoRecurso } from "@/types";
import {
  useCategorias,
  PALETA_CATEGORIA,
  type CategoriaItem,
} from "@/lib/categorias";

/**
 * Tag — pill em mono 11px.
 * `tone="categoria"` lê a cor da store dinâmica de categorias.
 * `tone="tipo"` mapeia estaticamente os 3 tipos de recurso.
 * `tone="rotulo"` renderiza um rótulo semântico (Ata/PRD/…) com paleta gold.
 */

export type TagTone =
  | "neutral"
  | "hash"
  | "fixado"
  | "categoria"
  | "tipo"
  | "rotulo";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TagTone;
  /** ID da categoria (referência para a store). */
  categoria?: string;
  tipo?: TipoRecurso;
  pill?: boolean;
};

const TIPO_CLASSES: Record<TipoRecurso, string> = {
  arquivo: "bg-[#EBEEF3] border-[#CFD5DE] text-[#374151]",
  link:    "bg-[#E0F1FE] border-[#BADFF9] text-[#0B4A78]",
  imagem:  "bg-[#FDECF3] border-[#F5C0D6] text-[#8A2A55]",
};

const TONE_STATIC: Record<
  Exclude<TagTone, "categoria" | "tipo">,
  string
> = {
  neutral: "bg-canvas border-line text-ink-muted",
  hash:    "bg-raise border-line text-ink-muted",
  fixado:  "bg-gold-wash border-[#EFD98A] text-gold-ink",
  rotulo:  "bg-[#FDF6E3] border-[#EFD98A] text-[#7A5A0F]",
};

const FALLBACK_CATEGORIA = "bg-canvas border-line text-ink-muted";

export function Tag({
  className,
  children,
  tone = "neutral",
  categoria,
  tipo,
  pill,
  ...props
}: TagProps) {
  const cats = useCategorias();
  let toneClass = FALLBACK_CATEGORIA;
  if (tone === "categoria") {
    const it: CategoriaItem | undefined = cats.find((c) => c.id === categoria);
    toneClass = it ? PALETA_CATEGORIA[it.cor] : FALLBACK_CATEGORIA;
  } else if (tone === "tipo" && tipo) {
    toneClass = TIPO_CLASSES[tipo];
  } else if (tone === "tipo") {
    toneClass = TONE_STATIC.neutral;
  } else {
    toneClass = TONE_STATIC[tone];
  }

  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-[1px]",
        "font-mono text-[11px] leading-[14px] tracking-[0.02em]",
        pill ? "rounded-full px-2" : "rounded-[4px]",
        toneClass,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Helper para exibir o nome de uma categoria a partir do id. */
export function useNomeCategoria(id: string): string {
  const cats = useCategorias();
  return cats.find((c) => c.id === id)?.nome ?? id;
}
