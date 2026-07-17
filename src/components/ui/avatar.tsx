import { cn } from "@/lib/utils";
import type { Membro } from "@/types";

type Size = 18 | 20 | 24 | 32;

const sizeMap: Record<Size, string> = {
  18: "h-[18px] w-[18px] text-[9px]",
  20: "h-5 w-5 text-[10px]",
  24: "h-6 w-6 text-[11px]",
  32: "h-8 w-8 text-[13px]",
};

/**
 * Avatar — 18/20/24/32px. Fallback: iniciais em 500 sobre navy, texto branco.
 */
export function Avatar({
  membro,
  size = 24,
  className,
}: {
  membro: Pick<Membro, "nome" | "iniciais" | "avatarUrl">;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      aria-label={membro.nome}
      title={membro.nome}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-navy font-medium text-white",
        sizeMap[size],
        className,
      )}
    >
      {membro.avatarUrl ? (
        <img
          src={membro.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{membro.iniciais}</span>
      )}
    </span>
  );
}

/**
 * Pilha de avatares — usada no header. Sobrepõe com margin negativa.
 */
export function AvatarStack({
  membros,
  max = 4,
  size = 24,
}: {
  membros: Pick<Membro, "id" | "nome" | "iniciais" | "avatarUrl">[];
  max?: number;
  size?: Size;
}) {
  const shown = membros.slice(0, max);
  const rest = membros.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <span
          key={m.id}
          className="ring-2 ring-canvas rounded-full"
          style={{ marginLeft: i === 0 ? 0 : -6 }}
        >
          <Avatar membro={m} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="meta-11 ml-1.5 text-ink-faint"
          aria-label={`Mais ${rest} pessoas`}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
