/**
 * Store persistente de categorias configuráveis.
 * - localStorage como fonte de verdade no cliente.
 * - Fallback SSR-safe para a lista padrão.
 * - Rename mantém o `id` — recursos referenciam o id (não o nome).
 */
import { useEffect, useSyncExternalStore } from "react";

export type CorCategoria =
  | "roxo"
  | "azul"
  | "ciano"
  | "rosa"
  | "ambar"
  | "verde"
  | "indigo"
  | "grafite";

export type CategoriaItem = {
  id: string;
  nome: string;
  cor: CorCategoria;
};

export const PALETA_CATEGORIA: Record<CorCategoria, string> = {
  roxo:    "bg-[#F3EEFE] border-[#D9C9FA] text-[#4B2E9E]",
  azul:    "bg-[#E6F0FE] border-[#BFD6FB] text-[#1E3A8A]",
  ciano:   "bg-[#E0F5FA] border-[#B3E3EF] text-[#0E5C6E]",
  rosa:    "bg-[#FCE7EF] border-[#F3B9CE] text-[#9B2C4E]",
  ambar:   "bg-[#FEEEDC] border-[#F8CFA0] text-[#8A4A0B]",
  verde:   "bg-[#E3F6EA] border-[#B7E3C4] text-[#1F6A3A]",
  indigo:  "bg-[#EAE9FD] border-[#C9C6F5] text-[#3B2E8C]",
  grafite: "bg-[#EBEEF3] border-[#CFD5DE] text-[#374151]",
};

export const CORES_DISPONIVEIS: CorCategoria[] = [
  "roxo", "azul", "ciano", "rosa", "ambar", "verde", "indigo", "grafite",
];

const DEFAULTS: CategoriaItem[] = [
  { id: "produto",   nome: "Produto",   cor: "roxo" },
  { id: "backend",   nome: "Backend",   cor: "azul" },
  { id: "frontend",  nome: "Frontend",  cor: "ciano" },
  { id: "ux",        nome: "UX",        cor: "rosa" },
  { id: "marketing", nome: "Marketing", cor: "ambar" },
  { id: "comercial", nome: "Comercial", cor: "verde" },
  { id: "pesquisa",  nome: "Pesquisa",  cor: "indigo" },
  { id: "infra",     nome: "Infra",     cor: "grafite" },
];

const KEY = "hub.categorias.v1";

let estado: CategoriaItem[] = DEFAULTS;
const listeners = new Set<() => void>();

function carregar() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CategoriaItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        estado = parsed;
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

function snapshot() {
  return estado;
}

function ssrSnapshot() {
  return DEFAULTS;
}

let hidratado = false;

export function useCategorias() {
  const list = useSyncExternalStore(subscribe, snapshot, ssrSnapshot);
  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      carregar();
      for (const l of listeners) l();
    }
  }, []);
  return list;
}

export function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `cat-${Date.now().toString(36)}`;
}

export function adicionarCategoria(nome: string, cor?: CorCategoria) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return null;
  let id = slugify(nomeLimpo);
  let n = 1;
  while (estado.some((c) => c.id === id)) {
    n += 1;
    id = `${slugify(nomeLimpo)}-${n}`;
  }
  const usados = new Set(estado.map((c) => c.cor));
  const corEscolhida =
    cor ?? CORES_DISPONIVEIS.find((c) => !usados.has(c)) ?? "grafite";
  estado = [...estado, { id, nome: nomeLimpo, cor: corEscolhida }];
  persistir();
  return id;
}

export function renomearCategoria(id: string, novoNome: string) {
  const nome = novoNome.trim();
  if (!nome) return;
  estado = estado.map((c) => (c.id === id ? { ...c, nome } : c));
  persistir();
}

export function mudarCorCategoria(id: string, cor: CorCategoria) {
  estado = estado.map((c) => (c.id === id ? { ...c, cor } : c));
  persistir();
}

export function removerCategoria(id: string) {
  estado = estado.filter((c) => c.id !== id);
  persistir();
}

export function encontrar(id: string): CategoriaItem | undefined {
  return estado.find((c) => c.id === id);
}

/** Snapshot síncrono para componentes fora do React (SSR/mocks). */
export function listarSync(): CategoriaItem[] {
  return estado;
}
