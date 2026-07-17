import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cards as cardsBase, membros } from "@/mocks";
import type { Card, Coluna } from "@/types";
import { StatusDot, Tag, Avatar, EmptyState } from "@/components/ui";
import { IconCornerDown } from "@/components/icons";

export const Route = createFileRoute("/_app/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban — Hub" },
      { name: "description", content: "Sprint atual do time." },
    ],
  }),
  component: KanbanPage,
});

const COLUNAS: { id: Coluna; titulo: string }[] = [
  { id: "planejado", titulo: "Planejado" },
  { id: "fazendo", titulo: "Fazendo" },
  { id: "feito", titulo: "Feito" },
  { id: "validado", titulo: "Validado" },
];

function membroPorId(id: string) {
  return membros.find((m) => m.id === id) ?? membros[0];
}

function KanbanPage() {
  const [items, setItems] = useState<Card[]>(cardsBase);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaOrigem, setColunaOrigem] = useState<Coluna | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const porColuna = useMemo(() => {
    const map: Record<Coluna, Card[]> = {
      planejado: [],
      fazendo: [],
      feito: [],
      validado: [],
    };
    for (const c of items) map[c.coluna].push(c);
    for (const k of Object.keys(map) as Coluna[]) {
      map[k].sort((a, b) => a.ordem - b.ordem);
    }
    return map;
  }, [items]);

  function encontraColuna(id: string): Coluna | null {
    if ((COLUNAS as { id: string }[]).some((c) => c.id === id))
      return id as Coluna;
    const c = items.find((x) => x.id === id);
    return c?.coluna ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setArrastandoId(id);
    setColunaOrigem(items.find((c) => c.id === id)?.coluna ?? null);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const colAtiva = encontraColuna(activeId);
    const colSobre = encontraColuna(overId);
    if (!colAtiva || !colSobre) return;
    if (colAtiva === colSobre) return;

    // mover card para nova coluna (posição no fim ou perto do over)
    setItems((atual) => {
      const cActiva = atual.find((c) => c.id === activeId);
      if (!cActiva) return atual;
      const alvoLista = atual
        .filter((c) => c.coluna === colSobre)
        .sort((a, b) => a.ordem - b.ordem);
      const idxOver =
        overId === colSobre
          ? alvoLista.length
          : alvoLista.findIndex((c) => c.id === overId);
      const novoIdx = idxOver < 0 ? alvoLista.length : idxOver;
      const semAtivo = atual.filter((c) => c.id !== activeId);
      const outrosNaAlvo = semAtivo
        .filter((c) => c.coluna === colSobre)
        .sort((a, b) => a.ordem - b.ordem);
      outrosNaAlvo.splice(novoIdx, 0, { ...cActiva, coluna: colSobre });
      const outrosDemais = semAtivo.filter((c) => c.coluna !== colSobre);
      return [
        ...outrosDemais,
        ...outrosNaAlvo.map((c, i) => ({ ...c, ordem: i })),
      ];
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) {
      setArrastandoId(null);
      setColunaOrigem(null);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const col = encontraColuna(overId);
    if (col) {
      // reorder dentro da coluna
      setItems((atual) => {
        const lista = atual
          .filter((c) => c.coluna === col)
          .sort((a, b) => a.ordem - b.ordem);
        const idxA = lista.findIndex((c) => c.id === activeId);
        const idxO =
          overId === col ? lista.length - 1 : lista.findIndex((c) => c.id === overId);
        if (idxA < 0 || idxO < 0 || idxA === idxO) return atual;
        const reordenada = arrayMove(lista, idxA, idxO);
        const outros = atual.filter((c) => c.coluna !== col);
        return [
          ...outros,
          ...reordenada.map((c, i) => ({ ...c, ordem: i })),
        ];
      });
    }
    // flash de ouro por 700ms
    setFlash((s) => new Set(s).add(activeId));
    window.setTimeout(() => {
      setFlash((s) => {
        const n = new Set(s);
        n.delete(activeId);
        return n;
      });
    }, 700);
    setArrastandoId(null);
    setColunaOrigem(null);
  }

  const cardArrastando = arrastandoId
    ? items.find((c) => c.id === arrastandoId) ?? null
    : null;

  return (
    <div>
      <header>
        <p className="eyebrow">Kanban</p>
        <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
          Sprint 12
        </h1>
      </header>

      <div className="mt-6 -mx-8 overflow-x-auto px-8 pb-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="grid min-w-[880px] grid-cols-4 gap-3">
            {COLUNAS.map((col) => (
              <ColunaView
                key={col.id}
                col={col}
                cards={porColuna[col.id]}
                isOrigem={colunaOrigem === col.id}
                arrastandoId={arrastandoId}
                flash={flash}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {cardArrastando ? (
              <div
                style={{
                  transform: "scale(1.02) rotate(1.5deg)",
                }}
                className="rounded-[10px] border border-line bg-canvas p-3 shadow-float"
              >
                <CardBody c={cardArrastando} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function ColunaView({
  col,
  cards,
  isOrigem,
  arrastandoId,
  flash,
}: {
  col: { id: Coluna; titulo: string };
  cards: Card[];
  isOrigem: boolean;
  arrastandoId: string | null;
  flash: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const alvo = isOver && !isOrigem;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="relative">
        <div className="flex items-center gap-2 px-1 pb-2">
          <StatusDot coluna={col.id} />
          <h2 className="text-[13px] font-medium text-ink">{col.titulo}</h2>
          <span className="meta-11 text-ink-faint">{cards.length}</span>
        </div>
        {isOrigem ? (
          <motion.div
            layoutId="active-bar"
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            aria-hidden="true"
            className="absolute bottom-0 left-1 h-[2px] w-8 rounded-full bg-gold"
          />
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className={
          "min-h-[120px] rounded-[10px] border p-1.5 transition-colors " +
          (alvo
            ? "border-dashed border-line-strong bg-raise"
            : "border-transparent")
        }
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {cards.length === 0 ? (
              <div className="flex h-[100px] items-center justify-center">
                <span className="text-[13px] text-ink-faint">Sem cards.</span>
              </div>
            ) : (
              cards.map((c) => (
                <SortableCard
                  key={c.id}
                  c={c}
                  arrastando={arrastandoId === c.id}
                  flash={flash.has(c.id)}
                />
              ))
            )}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableCard({
  c,
  arrastando,
  flash,
}: {
  c: Card;
  arrastando: boolean;
  flash: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: c.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || arrastando ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "mb-1.5 cursor-grab rounded-[10px] border border-line bg-canvas p-3 " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
        (flash ? "kanban-flash" : "")
      }
    >
      <CardBody c={c} />
    </div>
  );
}

function CardBody({ c }: { c: Card }) {
  const resp = c.responsavelId ? membroPorId(c.responsavelId) : null;
  return (
    <>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-ink">
          {c.titulo}
        </p>
        {resp ? <Avatar membro={resp} size={20} /> : null}
      </div>
      {c.descricao ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-[16px] text-ink-muted">
          {c.descricao}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-1.5">
        <Tag className="capitalize">{c.categoria}</Tag>
        {c.ideiaOrigemId ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-[1px] font-mono text-[11px] leading-[14px] text-ink-faint">
            <IconCornerDown />
            de uma ideia
          </span>
        ) : null}
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepEmpty = EmptyState;
