import { useEffect, useSyncExternalStore } from "react";
import type { Recurso } from "@/types";
import { supabase } from "./supabase";

let recursosListaState: Recurso[] = [];
let hidratadoLista = false;
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (channel) return;
  channel = supabase.channel('realtime-recursos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recursos' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        recursosListaState = [normalizarRecurso(payload.new), ...recursosListaState];
      } else if (payload.eventType === 'UPDATE') {
        recursosListaState = recursosListaState.map(r => r.id === payload.new.id ? normalizarRecurso(payload.new) : r);
      } else if (payload.eventType === 'DELETE') {
        recursosListaState = recursosListaState.filter(r => r.id !== payload.old.id);
      }
      listeners.forEach((l) => l());
    }).subscribe();
}

function normalizarRecurso(r: Record<string, unknown>): Recurso {
  return {
    ...(r as unknown as Recurso),
    tags: (r.tags as string[]) || [],
    favoritoPor: (r.favoritoPor as string[]) || [],
    fixado: !!r.fixado,
  };
}

async function fetchRecursos() {
  if (typeof window === "undefined") return;
  try {
    const { data, error } = await supabase
      .from('recursos')
      .select('*')
      .order('criadoEm', { ascending: false });
      
    if (error) throw error;
    
    if (data) {
      recursosListaState = data.map(normalizarRecurso);
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.error("Erro ao carregar recursos do Supabase:", e);
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function snapshotLista() {
  return recursosListaState;
}

function ssrLista() {
  return [];
}

export function useRecursosLista(): Recurso[] {
  const list = useSyncExternalStore(subscribe, snapshotLista, ssrLista);

  useEffect(() => {
    if (!hidratadoLista) {
      hidratadoLista = true;
      fetchRecursos();
      setupRealtime();
    }
  }, []);

  return list;
}

// Para manter compatibilidade com alguns componentes que esperam useRecursosState
// vamos apenas retornar um objeto vazio ou o necessário se houver.
export function useRecursosState() {
  return { fixados: {}, favoritos: {} };
}

export async function addRecurso(novo: Omit<Recurso, "id" | "criadoEm" | "atualizadoEm">) {
  const novoComId = {
    ...novo,
    id: `r-${Date.now().toString(36)}`,
  };

  const { data, error } = await supabase
    .from('recursos')
    .insert([novoComId])
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir recurso:", error);
    throw error;
  }
  
  const normal = normalizarRecurso(data);
  recursosListaState = [normal, ...recursosListaState];
  listeners.forEach((l) => l());
  return data;
}

export async function updateRecurso(id: string, updates: Partial<Recurso>) {
  const updateData = { ...updates, atualizadoEm: new Date().toISOString() };
  
  const { error } = await supabase
    .from('recursos')
    .update(updateData)
    .eq('id', id);
    
  if (error) {
    console.error("Erro ao atualizar recurso:", error);
    return;
  }

  recursosListaState = recursosListaState.map((r) => {
    if (r.id !== id) return r;
    return { ...r, ...updateData };
  });
  listeners.forEach((l) => l());
}

export async function deleteRecurso(id: string) {
  const { error } = await supabase.from('recursos').delete().eq('id', id);
  if (error) {
    console.error("Erro ao deletar recurso:", error);
    return;
  }
  
  recursosListaState = recursosListaState.filter((r) => r.id !== id);
  listeners.forEach((l) => l());
}

export async function toggleFixado(id: string, baseFixado: boolean) {
  const novoFixado = !baseFixado;
  await updateRecurso(id, { fixado: novoFixado });
}

export async function toggleFavorito(id: string, baseFavorito: boolean, userId: string) {
  const recurso = recursosListaState.find(r => r.id === id);
  if (!recurso) return;
  
  const eraFav = recurso.favoritoPor?.includes(userId) ?? false;
  const novoEfetivo = !eraFav; // Toggle

  let novoFavoritoPor = recurso.favoritoPor ?? [];
  if (novoEfetivo && !eraFav) {
    novoFavoritoPor = [...novoFavoritoPor, userId];
  } else if (!novoEfetivo && eraFav) {
    novoFavoritoPor = novoFavoritoPor.filter((x) => x !== userId);
  }
  
  await updateRecurso(id, { favoritoPor: novoFavoritoPor });
}

export function isFixado(id: string, baseFixado: boolean) {
  const recurso = recursosListaState.find(r => r.id === id);
  return recurso ? recurso.fixado : baseFixado;
}

export function isFavorito(id: string, baseFavorito: boolean, userId?: string) {
  if (!userId) return false;
  const recurso = recursosListaState.find(r => r.id === id);
  if (!recurso) return baseFavorito;
  return recurso.favoritoPor?.includes(userId) ?? false;
}

export function getFavoritoAt(id: string) {
  // Não rastreamos mais favoritosAt individualmente, 
  // mas poderíamos verificar no banco se necessário
  return undefined;
}
