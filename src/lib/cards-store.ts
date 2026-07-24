import { useEffect, useSyncExternalStore } from "react";
import type { Card, Coluna, Prioridade } from "@/types";
import { supabase } from "./supabase";

function normalizarCard(c: Record<string, unknown>): Card {
  const responsaveisIds =
    Array.isArray(c.responsaveisIds) && c.responsaveisIds.length > 0
      ? c.responsaveisIds
      : c.responsavelId
        ? [c.responsavelId as string]
        : [];
  return {
    ...(c as unknown as Card),
    responsavelId: responsaveisIds[0],
    responsaveisIds,
    prioridade: (c.prioridade as Prioridade) || "media",
  };
}

let cardsState: Card[] = [];
let hidratado = false;
const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function setupRealtime() {
  if (channel) return;
  channel = supabase.channel('realtime-cards')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cards' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          cardsState = [...cardsState, normalizarCard(payload.new)];
        } else if (payload.eventType === 'UPDATE') {
          cardsState = cardsState.map(c => c.id === payload.new.id ? normalizarCard(payload.new) : c);
        } else if (payload.eventType === 'DELETE') {
          cardsState = cardsState.filter(c => c.id !== payload.old.id);
        }
        listeners.forEach((l) => l());
      }
    )
    .subscribe();
}

async function fetchCards() {
  if (typeof window === "undefined") return;
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('coluna')
      .order('ordem');
      
    if (error) throw error;
    
    if (data) {
      cardsState = data.map(normalizarCard);
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.error("Erro ao carregar cards do Supabase:", e);
  }
}

export function subscribeCards(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCardsState(): Card[] {
  return cardsState;
}

function getSsrCardsState(): Card[] {
  return [];
}

export function useCardsState(): Card[] {
  const list = useSyncExternalStore(
    subscribeCards,
    getCardsState,
    getSsrCardsState,
  );

  useEffect(() => {
    if (!hidratado) {
      hidratado = true;
      fetchCards();
      setupRealtime();
    }
  }, []);

  return list;
}

export async function addCard(dados: {
  titulo: string;
  descricao?: string;
  coluna: Coluna;
  categoria: string;
  responsaveisIds: string[];
  autorId?: string;
  prioridade?: Prioridade;
}): Promise<Card> {
  const mesmaColuna = cardsState.filter((c) => c.coluna === dados.coluna);
  const novaOrdem = mesmaColuna.length;

  const novoCardDados = {
    id: `c-${Date.now().toString(36)}`,
    titulo: dados.titulo.trim(),
    descricao: dados.descricao?.trim() || null,
    coluna: dados.coluna,
    ordem: novaOrdem,
    categoria: dados.categoria,
    responsavelId: dados.responsaveisIds[0] || null,
    responsaveisIds: dados.responsaveisIds,
    autorId: dados.autorId,
    prioridade: dados.prioridade || "media",
  };

  const { data, error } = await supabase
    .from('cards')
    .insert([novoCardDados])
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir card:", error);
    throw error;
  }
  
  const novoCard = normalizarCard(data);
  cardsState = [novoCard, ...cardsState];
  listeners.forEach((l) => l());
  
  return novoCard;
}

export async function updateCard(id: string, updates: Partial<Card>) {
  const { responsaveisIds, ...rest } = updates;
  const updateData: Record<string, unknown> = { ...rest, atualizadoEm: new Date().toISOString() };
  
  if (responsaveisIds) {
    updateData.responsaveisIds = responsaveisIds;
    updateData.responsavelId = responsaveisIds[0] || null;
  }

  const { error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', id);
    
  if (error) {
    console.error("Erro ao atualizar card:", error);
    return;
  }

  // Otimista local update
  cardsState = cardsState.map((c) => {
    if (c.id !== id) return c;
    return normalizarCard({ ...c, ...updateData });
  });
  listeners.forEach((l) => l());
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) {
    console.error("Erro ao deletar card:", error);
    return;
  }
  
  cardsState = cardsState.filter((c) => c.id !== id);
  listeners.forEach((l) => l());
}

export async function setAllCards(novosCards: Card[]) {
  // Isso era usado apenas no local storage para DnD (reordenar)
  // No Supabase, teríamos que atualizar a ordem de cada card no banco.
  cardsState = novosCards.map(normalizarCard);
  listeners.forEach((l) => l());
  
  // Update em lote da ordem no Supabase (em um caso real idealmente usaríamos RPC ou bulk update)
  const updates = novosCards.map(c => ({
    id: c.id,
    ordem: c.ordem,
    coluna: c.coluna
  }));
  
  const { error } = await supabase.from('cards').upsert(updates);
  if (error) console.error("Erro no upsert de ordenação:", error);
}
