/**
 * Formata "há X" em português com base em uma data ISO.
 * Sem dependência externa — Intl.RelativeTimeFormat cobre.
 */
const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const AGORA_FIXO = new Date("2026-07-16T10:00:00Z").getTime();

export function tempoRelativo(iso: string, base: number = AGORA_FIXO): string {
  const t = new Date(iso).getTime();
  const diffSec = Math.round((t - base) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const h = Math.round(diffSec / 3600);
  if (Math.abs(h) < 24) return rtf.format(h, "hour");
  const d = Math.round(diffSec / 86400);
  if (Math.abs(d) < 30) return rtf.format(d, "day");
  const mo = Math.round(diffSec / (86400 * 30));
  if (Math.abs(mo) < 12) return rtf.format(mo, "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
