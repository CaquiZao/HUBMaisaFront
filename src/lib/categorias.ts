/**
 * Store persistente de categorias conectada ao Supabase.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type CorCategoria = string;

export type CategoriaItem = {
  id: string;
  nome: string;
  cor: CorCategoria;
};

export const PALETA_CATEGORIA: Record<string, string> = {
  roxo: "bg-[#F3EEFE] border-[#D9C9FA] text-[#4B2E9E]",
  azul: "bg-[#E6F0FE] border-[#BFD6FB] text-[#1E3A8A]",
  ciano: "bg-[#E0F5FA] border-[#B3E3EF] text-[#0E5C6E]",
  rosa: "bg-[#FCE7EF] border-[#F3B9CE] text-[#9B2C4E]",
  ambar: "bg-[#FEEEDC] border-[#F8CFA0] text-[#8A4A0B]",
  verde: "bg-[#E3F6EA] border-[#B7E3C4] text-[#1F6A3A]",
  indigo: "bg-[#EAE9FD] border-[#C9C6F5] text-[#3B2E8C]",
  grafite: "bg-[#EBEEF3] border-[#CFD5DE] text-[#374151]",
  vermelho: "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]",
  laranja: "bg-[#FFEDD5] border-[#FDBA74] text-[#9A3412]",
  esmeralda: "bg-[#D1FAE5] border-[#6EE7B7] text-[#065F46]",
  violeta: "bg-[#F3E8FF] border-[#D8B4FE] text-[#6B21A8]",
  fuchsia: "bg-[#FAE8FF] border-[#F0ABFC] text-[#86198F]",
  coral: "bg-[#FFE4E6] border-[#FDA4AF] text-[#9F1239]",
};

export type PresetCor = {
  id: string;
  nome: string;
  hex: string;
};

export const CORES_DISPONIVEIS: PresetCor[] = [
  { id: "roxo", nome: "Roxo", hex: "#4B2E9E" },
  { id: "azul", nome: "Azul", hex: "#1E3A8A" },
  { id: "ciano", nome: "Ciano", hex: "#0E5C6E" },
  { id: "rosa", nome: "Rosa", hex: "#9B2C4E" },
  { id: "ambar", nome: "Âmbar", hex: "#8A4A0B" },
  { id: "verde", nome: "Verde", hex: "#1F6A3A" },
  { id: "indigo", nome: "Índigo", hex: "#3B2E8C" },
  { id: "grafite", nome: "Grafite", hex: "#374151" },
  { id: "vermelho", nome: "Vermelho", hex: "#991B1B" },
  { id: "laranja", nome: "Laranja", hex: "#9A3412" },
  { id: "esmeralda", nome: "Esmeralda", hex: "#065F46" },
  { id: "violeta", nome: "Violeta", hex: "#6B21A8" },
  { id: "fuchsia", nome: "Fúcsia", hex: "#86198F" },
  { id: "coral", nome: "Coral", hex: "#9F1239" },
];

export function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "").trim();
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) return `rgba(100, 100, 100, ${alpha})`;
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(100, 100, 100, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function obterEstiloCategoria(cor: string): {
  className: string;
  style?: React.CSSProperties;
} {
  if (cor in PALETA_CATEGORIA) {
    return { className: PALETA_CATEGORIA[cor] };
  }
  if (cor.startsWith("#")) {
    return {
      className: "border",
      style: {
        backgroundColor: hexToRgba(cor, 0.14),
        borderColor: hexToRgba(cor, 0.45),
        color: cor,
      },
    };
  }
  return { className: "bg-canvas border-line text-ink-muted" };
}

const DEFAULTS: CategoriaItem[] = [
  { id: "produto", nome: "Produto", cor: "roxo" },
  { id: "backend", nome: "Backend", cor: "azul" },
  { id: "frontend", nome: "Frontend", cor: "ciano" },
  { id: "ux", nome: "UX", cor: "rosa" },
  { id: "marketing", nome: "Marketing", cor: "ambar" },
  { id: "comercial", nome: "Comercial", cor: "verde" },
  { id: "pesquisa", nome: "Pesquisa", cor: "indigo" },
  { id: "infra", nome: "Infra", cor: "grafite" },
];

let estado: CategoriaItem[] = [];
let promiseLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (channel) return;
  channel = supabase.channel('realtime-categorias')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        estado = [...estado, payload.new as CategoriaItem].sort((a, b) => a.nome.localeCompare(b.nome));
      } else if (payload.eventType === 'UPDATE') {
        estado = estado.map(c => c.id === payload.new.id ? (payload.new as CategoriaItem) : c).sort((a, b) => a.nome.localeCompare(b.nome));
      } else if (payload.eventType === 'DELETE') {
        estado = estado.filter(c => c.id !== payload.old.id);
      }
      for (const l of listeners) l();
    }).subscribe();
}

async function carregar() {
  const { data, error } = await supabase.from("categorias").select("*").order("ordem", { ascending: true });
  if (error) {
    console.error("Erro ao carregar categorias:", error);
    return;
  }
  if (data) {
    estado = data;
    for (const l of listeners) l();
  }
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
  return [];
}

let hidratado = false;

export function useCategorias() {
  const list = useSyncExternalStore(subscribe, snapshot, ssrSnapshot);
  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      if (!promiseLoad) {
        promiseLoad = carregar();
      }
      setupRealtime();
    }
  }, []);
  return list;
}

export function slugify(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `cat-${Date.now().toString(36)}`
  );
}

export async function adicionarCategoria(nome: string, cor?: CorCategoria) {
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
    cor ?? CORES_DISPONIVEIS.find((c) => !usados.has(c.id))?.id ?? "grafite";
    
  const novaCat = { id, nome: nomeLimpo, cor: corEscolhida, ordem: estado.length };
  estado = [...estado, novaCat];
  for (const l of listeners) l();
  
  await supabase.from("categorias").insert(novaCat);
  return id;
}

export async function renomearCategoria(id: string, novoNome: string) {
  const nome = novoNome.trim();
  if (!nome) return;
  estado = estado.map((c) => (c.id === id ? { ...c, nome } : c));
  for (const l of listeners) l();
  
  await supabase.from("categorias").update({ nome }).eq("id", id);
}

export async function mudarCorCategoria(id: string, cor: CorCategoria) {
  estado = estado.map((c) => (c.id === id ? { ...c, cor } : c));
  for (const l of listeners) l();
  
  await supabase.from("categorias").update({ cor }).eq("id", id);
}

export async function removerCategoria(id: string) {
  estado = estado.filter((c) => c.id !== id);
  for (const l of listeners) l();
  
  await supabase.from("categorias").delete().eq("id", id);
}

export function encontrar(id: string): CategoriaItem | undefined {
  return estado.find((c) => c.id === id);
}

/** Snapshot síncrono para componentes fora do React (SSR/mocks). */
export function listarSync(): CategoriaItem[] {
  return estado;
}

