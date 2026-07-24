import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { Ideia, Comentario, StatusIdeia, Categoria } from "@/types";

let ideiasEstado: Ideia[] = [];
let comentariosEstado: Comentario[] = [];

let promiseLoadIdeias: Promise<void> | null = null;
const ideiasListeners = new Set<() => void>();
const comentariosListeners = new Set<() => void>();
let channelIdeias: ReturnType<typeof supabase.channel> | null = null;
let channelComentarios: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (!channelIdeias) {
    channelIdeias = supabase.channel('realtime-ideias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideias' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          ideiasEstado = [payload.new as Ideia, ...ideiasEstado];
        } else if (payload.eventType === 'UPDATE') {
          ideiasEstado = ideiasEstado.map(i => i.id === payload.new.id ? (payload.new as Ideia) : i);
        } else if (payload.eventType === 'DELETE') {
          ideiasEstado = ideiasEstado.filter(i => i.id !== payload.old.id);
        }
        for (const l of ideiasListeners) l();
      }).subscribe();
  }
  if (!channelComentarios) {
    channelComentarios = supabase.channel('realtime-comentarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          comentariosEstado = [...comentariosEstado, payload.new as Comentario];
        } else if (payload.eventType === 'UPDATE') {
          comentariosEstado = comentariosEstado.map(c => c.id === payload.new.id ? (payload.new as Comentario) : c);
        } else if (payload.eventType === 'DELETE') {
          comentariosEstado = comentariosEstado.filter(c => c.id !== payload.old.id);
        }
        for (const l of comentariosListeners) l();
      }).subscribe();
  }
}

async function carregarIdeiasEComentarios() {
  const { data: ideiasData, error: errorIdeias } = await supabase
    .from("ideias")
    .select("*")
    .order("criadaEm", { ascending: false });
    
  if (errorIdeias) {
    console.error("Erro ao carregar ideias:", errorIdeias);
  } else if (ideiasData && ideiasData.length > 0) {
    ideiasEstado = ideiasData;
  }
  for (const l of ideiasListeners) l();

  const { data: comData, error: errorCom } = await supabase
    .from("comentarios")
    .select("*")
    .order("criadoEm", { ascending: true });
    
  if (errorCom) {
    console.error("Erro ao carregar comentários:", errorCom);
  } else if (comData && comData.length > 0) {
    comentariosEstado = comData;
  }
  for (const l of comentariosListeners) l();
}

function subscribeIdeias(l: () => void) {
  ideiasListeners.add(l);
  return () => {
    ideiasListeners.delete(l);
  };
}

function snapshotIdeias() {
  return ideiasEstado;
}

function ssrSnapshotIdeias() {
  return [];
}

function subscribeComentarios(l: () => void) {
  comentariosListeners.add(l);
  return () => {
    comentariosListeners.delete(l);
  };
}

function snapshotComentarios() {
  return comentariosEstado;
}

function ssrSnapshotComentarios() {
  return [];
}

let hidratado = false;

export function useIdeias() {
  const list = useSyncExternalStore(subscribeIdeias, snapshotIdeias, ssrSnapshotIdeias);
  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      if (!promiseLoadIdeias) {
        promiseLoadIdeias = carregarIdeiasEComentarios();
      }
      setupRealtime();
    }
  }, []);
  return list;
}

export function useComentarios(ideiaId?: string) {
  const list = useSyncExternalStore(subscribeComentarios, snapshotComentarios, ssrSnapshotComentarios);
  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      if (!promiseLoadIdeias) {
        promiseLoadIdeias = carregarIdeiasEComentarios();
      }
    }
  }, []);
  
  if (ideiaId) {
    return list.filter((c) => c.ideiaId === ideiaId);
  }
  return list;
}

export async function adicionarIdeia(ideia: Omit<Ideia, "id" | "criadaEm" | "votos">) {
  const id = `i-${Date.now().toString(36)}`;
  const nova: Ideia = {
    ...ideia,
    id,
    votos: [ideia.autorId],
    criadaEm: new Date().toISOString(),
  };
  ideiasEstado = [nova, ...ideiasEstado];
  for (const l of ideiasListeners) l();

  await supabase.from("ideias").insert(nova);
  return nova;
}

export async function adicionarComentario(ideiaId: string, autorId: string, corpo: string) {
  const id = `co-${Date.now().toString(36)}`;
  const novo: Comentario = {
    id,
    ideiaId,
    autorId,
    corpo,
    criadoEm: new Date().toISOString(),
  };
  comentariosEstado = [...comentariosEstado, novo];
  for (const l of comentariosListeners) l();

  await supabase.from("comentarios").insert(novo);
  return novo;
}

export async function toggleVotoIdeia(ideiaId: string, autorId: string) {
  const target = ideiasEstado.find(i => i.id === ideiaId);
  if (!target) return;
  
  let newVotos = [...(target.votos || [])];
  if (newVotos.includes(autorId)) {
    newVotos = newVotos.filter(id => id !== autorId);
  } else {
    newVotos.push(autorId);
  }
  
  ideiasEstado = ideiasEstado.map(i => i.id === ideiaId ? { ...i, votos: newVotos } : i);
  for (const l of ideiasListeners) l();
  
  await supabase.from("ideias").update({ votos: newVotos }).eq("id", ideiaId);
}

export async function alterarStatusIdeia(ideiaId: string, status: StatusIdeia) {
  ideiasEstado = ideiasEstado.map(i => i.id === ideiaId ? { ...i, status } : i);
  for (const l of ideiasListeners) l();
  await supabase.from("ideias").update({ status }).eq("id", ideiaId);
}

export async function salvarIdeiaEditada(id: string, titulo: string, corpo: string, categoria: Categoria, status: StatusIdeia) {
  ideiasEstado = ideiasEstado.map(i => i.id === id ? { ...i, titulo, corpo, categoria, status } : i);
  for (const l of ideiasListeners) l();
  await supabase.from("ideias").update({ titulo, corpo, categoria, status }).eq("id", id);
}

export async function excluirIdeia(id: string) {
  ideiasEstado = ideiasEstado.filter(i => i.id !== id);
  for (const l of ideiasListeners) l();
  await supabase.from("ideias").delete().eq("id", id);
}
