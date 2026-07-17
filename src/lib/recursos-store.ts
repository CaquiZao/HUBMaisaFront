/**
 * Store persistente de estado dos recursos (fixados/favoritos).
 * Overlay sobre os mocks: cada recurso ainda tem `fixado` e `favoritoPor`
 * como valores iniciais, mas as ações do usuário são gravadas aqui.
 */
import { useEffect, useSyncExternalStore } from "react";

type Estado = {
  fixados: Record<string, boolean | undefined>;
  favoritos: Record<string, boolean | undefined>;
};

const KEY = "hub.recursos.v1";
let estado: Estado = { fixados: {}, favoritos: {} };
const listeners = new Set<() => void>();

function carregar() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Estado;
      if (parsed && typeof parsed === "object") {
        estado = {
          fixados: parsed.fixados ?? {},
          favoritos: parsed.favoritos ?? {},
        };
      }
    }
  } catch {
    /* ignore */
  }
}

function persistir() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(estado));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const emptyState: Estado = { fixados: {}, favoritos: {} };
function snapshot() {
  return estado;
}
function ssr() {
  return emptyState;
}

let hidratado = false;
export function useRecursosState() {
  const s = useSyncExternalStore(subscribe, snapshot, ssr);
  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      carregar();
      for (const l of listeners) l();
    }
  }, []);
  return s;
}

export function toggleFixado(id: string, baseFixado: boolean) {
  const atual = estado.fixados[id];
  const efetivo = atual === undefined ? baseFixado : atual;
  estado = {
    ...estado,
    fixados: { ...estado.fixados, [id]: !efetivo },
  };
  persistir();
}

export function toggleFavorito(id: string, baseFavorito: boolean) {
  const atual = estado.favoritos[id];
  const efetivo = atual === undefined ? baseFavorito : atual;
  estado = {
    ...estado,
    favoritos: { ...estado.favoritos, [id]: !efetivo },
  };
  persistir();
}

export function isFixado(id: string, baseFixado: boolean, s: Estado = estado) {
  const v = s.fixados[id];
  return v === undefined ? baseFixado : v;
}

export function isFavorito(
  id: string,
  baseFavorito: boolean,
  s: Estado = estado,
) {
  const v = s.favoritos[id];
  return v === undefined ? baseFavorito : v;
}
