import { useEffect, useSyncExternalStore } from "react";
import type { Membro } from "@/types";
import { supabase } from "./supabase";

let membrosState: Membro[] = [];
let hidratado = false;
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (channel) return;
  channel = supabase.channel('realtime-membros')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'membros' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const m = payload.new;
        membrosState = [...membrosState, { id: m.id, nome: m.nome, iniciais: m.nome.substring(0, 2).toUpperCase(), avatarUrl: m.avatarUrl || undefined }];
      } else if (payload.eventType === 'UPDATE') {
        const m = payload.new;
        membrosState = membrosState.map(x => x.id === m.id ? { id: m.id, nome: m.nome, iniciais: m.nome.substring(0, 2).toUpperCase(), avatarUrl: m.avatarUrl || undefined } : x);
      } else if (payload.eventType === 'DELETE') {
        membrosState = membrosState.filter(x => x.id !== payload.old.id);
      }
      listeners.forEach((l) => l());
    }).subscribe();
}

export async function fetchMembros() {
  if (typeof window === "undefined") return;
  try {
    const { data, error } = await supabase
      .from('membros')
      .select('id, nome, avatarUrl');
      
    if (error) throw error;
    
    if (data) {
      membrosState = data.map(m => ({
        id: m.id,
        nome: m.nome,
        iniciais: m.nome.substring(0, 2).toUpperCase(),
        avatarUrl: m.avatarUrl || undefined,
      }));
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.error("Erro ao carregar membros do Supabase:", e);
  }
}

export function subscribeMembros(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMembrosState(): Membro[] {
  return membrosState;
}

function getSsrMembrosState(): Membro[] {
  return [];
}

export function useMembros(): Membro[] {
  const list = useSyncExternalStore(
    subscribeMembros,
    getMembrosState,
    getSsrMembrosState,
  );

  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      fetchMembros();
      setupRealtime();
    }
  }, []);

  return list;
}

export function membroPorId(id: string): Membro {
  return (
    membrosState.find((m) => m.id === id) ?? {
      id,
      nome: "Usuário",
      iniciais: "?",
    }
  );
}
