/**
 * Store persistente de rótulos conectada ao Supabase.
 */
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import {
  CORES_DISPONIVEIS,
  PALETA_CATEGORIA,
  hexToRgba,
  slugify,
  type CorCategoria,
} from "@/lib/categorias";

export type RotuloItem = {
  id: string;
  nome: string;
  cor: CorCategoria;
  fixo?: boolean;
};

export const DEFAULTS_ROTULOS: RotuloItem[] = [
  { id: "ata", nome: "Ata", cor: "verde", fixo: true },
];

let estado: RotuloItem[] = [];
let promiseLoad: Promise<void> | null = null;
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (channel) return;
  channel = supabase.channel('realtime-rotulos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rotulos' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        estado = [...estado, payload.new as RotuloItem];
      } else if (payload.eventType === 'UPDATE') {
        estado = estado.map(r => r.id === payload.new.id ? (payload.new as RotuloItem) : r);
      } else if (payload.eventType === 'DELETE') {
        estado = estado.filter(r => r.id !== payload.old.id);
      }
      for (const l of listeners) l();
    }).subscribe();
}

async function carregar() {
  let { data, error } = await supabase.from("rotulos").select("*").order("ordem", { ascending: true });
  if (error) {
    console.error("Erro ao carregar rotulos:", error);
    return;
  }
  
  if (data && data.length === 0) {
    const rotulosToInsert = DEFAULTS_ROTULOS.map((r, i) => ({
      id: r.id,
      nome: r.nome,
      cor: r.cor,
      fixo: r.fixo ?? false,
      ordem: i
    }));
    const { data: inserted, error: insertError } = await supabase.from("rotulos").insert(rotulosToInsert).select();
    if (!insertError && inserted) {
      data = inserted.sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
    }
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

export function useRotulos(): RotuloItem[] {
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

export async function adicionarRotulo(
  nome: string,
  cor?: CorCategoria,
) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return null;
  let id = slugify(nomeLimpo);
  let n = 1;
  while (estado.some((r) => r.id === id)) {
    n += 1;
    id = `${slugify(nomeLimpo)}-${n}`;
  }
  const usados = new Set(estado.map((r) => r.cor));
  const corEscolhida =
    cor ?? CORES_DISPONIVEIS.find((c) => !usados.has(c.id))?.id ?? "ambar";
  
  const novoRotulo = { id, nome: nomeLimpo, cor: corEscolhida, fixo: false, ordem: estado.length };
  estado = [...estado, novoRotulo];
  for (const l of listeners) l();
  
  await supabase.from("rotulos").insert(novoRotulo);
  return id;
}

export async function renomearRotulo(id: string, novoNome: string) {
  const nome = novoNome.trim();
  if (!nome) return;
  const target = estado.find((r) => r.id === id);
  if (target?.fixo) return;
  estado = estado.map((r) => (r.id === id ? { ...r, nome } : r));
  for (const l of listeners) l();
  
  await supabase.from("rotulos").update({ nome }).eq("id", id);
}

export async function mudarCorRotulo(id: string, cor: CorCategoria) {
  estado = estado.map((r) => (r.id === id ? { ...r, cor } : r));
  for (const l of listeners) l();
  
  await supabase.from("rotulos").update({ cor }).eq("id", id);
}

export async function removerRotulo(id: string) {
  const target = estado.find((r) => r.id === id);
  if (target?.fixo) return;
  estado = estado.filter((r) => r.id !== id);
  for (const l of listeners) l();
  
  await supabase.from("rotulos").delete().eq("id", id);
}

export function encontrarRotulo(id: string): RotuloItem | undefined {
  return estado.find((r) => r.id === id);
}

export function obterEstiloRotulo(cor: string): {
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
  return { className: "bg-[#FDF6E3] border-[#EFD98A] text-[#7A5A0F]" };
}

