import type { ReactNode } from "react";

/**
 * EmptyState — sem ilustração, sem ícone grande. Uma linha, um botão.
 */
export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[14px] font-medium text-ink">{titulo}</p>
      {descricao ? (
        <p className="mt-1 text-[13px] text-ink-muted">{descricao}</p>
      ) : null}
      {acao ? <div className="mt-4">{acao}</div> : null}
    </div>
  );
}
