import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, UserPlus } from "lucide-react";
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

import { useMembros, membroPorId } from "@/lib/membros-store";
import type { Card, Coluna, Prioridade } from "@/types";
import {
  StatusDot,
  Tag,
  useNomeCategoria,
  Avatar,
  AvatarStack,
  Button,
  Modal,
  Input,
  Textarea,
  Label,
  useToast,
} from "@/components/ui";
import { IconCornerDown } from "@/components/icons";
import {
  useCardsState,
  setAllCards,
  addCard,
  updateCard,
  deleteCard,
} from "@/lib/cards-store";
import { useCategorias } from "@/lib/categorias";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

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



function KanbanPage() {
  const allItems = useCardsState();
  const items = useMemo(() => allItems.filter((c) => !c.arquivado), [allItems]);
  const archivedItems = useMemo(
    () => allItems.filter((c) => c.arquivado),
    [allItems],
  );
  const { push } = useToast();

  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaOrigem, setColunaOrigem] = useState<Coluna | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();

  // Estado do Modal de Criar/Editar Task
  const [modalAberta, setModalAberta] = useState(false);
  const [cardParaEditar, setCardParaEditar] = useState<Card | null>(null);
  const [colunaPadraoNova, setColunaPadraoNova] = useState<Coluna>("planejado");

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
    for (const c of items) {
      if (map[c.coluna]) {
        map[c.coluna].push(c);
      } else {
        map.planejado.push(c);
      }
    }
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

  async function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const colAtiva = encontraColuna(activeId);
    const colSobre = encontraColuna(overId);
    if (!colAtiva || !colSobre) return;
    if (colAtiva === colSobre) return;

    // mover card para nova coluna
    const cActiva = items.find((c) => c.id === activeId);
    if (!cActiva) return;
    const alvoLista = items
      .filter((c) => c.coluna === colSobre)
      .sort((a, b) => a.ordem - b.ordem);
    const idxOver =
      overId === colSobre
        ? alvoLista.length
        : alvoLista.findIndex((c) => c.id === overId);
    const novoIdx = idxOver < 0 ? alvoLista.length : idxOver;
    const semAtivo = items.filter((c) => c.id !== activeId);
    const outrosNaAlvo = semAtivo
      .filter((c) => c.coluna === colSobre)
      .sort((a, b) => a.ordem - b.ordem);
    outrosNaAlvo.splice(novoIdx, 0, { ...cActiva, coluna: colSobre });
    const outrosDemais = semAtivo.filter((c) => c.coluna !== colSobre);
    await setAllCards([
      ...archivedItems,
      ...outrosDemais,
      ...outrosNaAlvo.map((c, i) => ({ ...c, ordem: i })),
    ]);
  }

  async function onDragEnd(e: DragEndEvent) {
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
      const lista = items
        .filter((c) => c.coluna === col)
        .sort((a, b) => a.ordem - b.ordem);
      const idxA = lista.findIndex((c) => c.id === activeId);
      const idxO =
        overId === col
          ? lista.length - 1
          : lista.findIndex((c) => c.id === overId);
      if (idxA >= 0 && idxO >= 0 && idxA !== idxO) {
        const reordenada = arrayMove(lista, idxA, idxO);
        const outros = items.filter((c) => c.coluna !== col);
        await setAllCards([
          ...archivedItems,
          ...outros,
          ...reordenada.map((c, i) => ({ ...c, ordem: i })),
        ]);
      }
    }

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
    ? (items.find((c) => c.id === arrastandoId) ?? null)
    : null;

  function handleAbrirCriar(coluna: Coluna = "planejado") {
    setCardParaEditar(null);
    setColunaPadraoNova(coluna);
    setModalAberta(true);
  }

  function handleAbrirEditar(card: Card) {
    setCardParaEditar(card);
    setModalAberta(true);
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            Kanban
          </h1>
        </div>
        <Button variant="primary" onClick={() => handleAbrirCriar("planejado")}>
          <Plus size={16} /> Nova Task
        </Button>
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
                onCardClick={handleAbrirEditar}
                onNovaTask={() => handleAbrirCriar(col.id)}
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

      <ModalTask
        open={modalAberta}
        onClose={() => setModalAberta(false)}
        card={cardParaEditar}
        colunaPadrao={colunaPadraoNova}
        onToast={push}
        currentUserId={user?.id}
      />
    </div>
  );
}

function ColunaView({
  col,
  cards,
  isOrigem,
  arrastandoId,
  flash,
  onCardClick,
  onNovaTask,
}: {
  col: { id: Coluna; titulo: string };
  cards: Card[];
  isOrigem: boolean;
  arrastandoId: string | null;
  flash: Set<string>;
  onCardClick: (card: Card) => void;
  onNovaTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const alvo = isOver && !isOrigem;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="relative">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-2">
            <StatusDot coluna={col.id} />
            <h2 className="text-[13px] font-medium text-ink">{col.titulo}</h2>
            <span className="meta-11 text-ink-faint">{cards.length}</span>
          </div>
          <button
            type="button"
            onClick={onNovaTask}
            title={`Adicionar task em ${col.titulo}`}
            className="press flex h-6 w-6 items-center justify-center rounded-[4px] text-ink-faint hover:bg-raise hover:text-ink transition-colors"
          >
            <Plus size={14} />
          </button>
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
              <div className="flex h-[100px] flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-line/60 p-3 text-center">
                <span className="text-[12px] text-ink-faint">Sem cards.</span>
                <button
                  type="button"
                  onClick={onNovaTask}
                  className="meta-11 inline-flex items-center gap-1 text-gold-ink hover:underline"
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>
            ) : (
              cards.map((c) => (
                <SortableCard
                  key={c.id}
                  c={c}
                  arrastando={arrastandoId === c.id}
                  flash={flash.has(c.id)}
                  onClick={() => onCardClick(c)}
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
  onClick,
}: {
  c: Card;
  arrastando: boolean;
  flash: boolean;
  onClick: () => void;
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
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={
        "group mb-1.5 cursor-grab rounded-[10px] border border-line bg-canvas p-3 " +
        "hover:border-line-strong hover:shadow-subtle transition-all " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold " +
        (flash ? "kanban-flash" : "")
      }
    >
      <CardBody c={c} />
    </div>
  );
}

function CardBody({ c }: { c: Card }) {
  const ids =
    c.responsaveisIds && c.responsaveisIds.length > 0
      ? c.responsaveisIds
      : c.responsavelId
        ? [c.responsavelId]
        : [];
  const membrosResponsaveis = ids.map(membroPorId);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-ink group-hover:text-navy transition-colors">
          {c.titulo}
        </p>
        {membrosResponsaveis.length > 0 ? (
          <AvatarStack membros={membrosResponsaveis} size={20} max={3} />
        ) : null}
      </div>
      {c.descricao ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-[16px] text-ink-muted">
          {c.descricao}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Tag
            tone="categoria"
            categoria={c.categoria}
            pill
            className="uppercase shrink-0 truncate max-w-[120px]"
          >
            {useNomeCategoria(c.categoria)}
          </Tag>
          {c.prioridade ? (
            <Tag
              pill
              className={cn(
                "uppercase font-semibold tracking-wider text-[9px] px-2 py-[0.5px]",
                c.prioridade === "alta"
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : c.prioridade === "media"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
              )}
            >
              {c.prioridade === "alta"
                ? "Alta"
                : c.prioridade === "media"
                  ? "Média"
                  : "Baixa"}
            </Tag>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ModalTask({
  open,
  onClose,
  card,
  colunaPadrao = "planejado",
  onToast,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  card: Card | null;
  colunaPadrao?: Coluna;
  onToast: (data: { mensagem: string }) => void;
  currentUserId?: string;
}) {
  const categoriasList = useCategorias();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [coluna, setColuna] = useState<Coluna>(colunaPadrao);
  const [categoria, setCategoria] = useState("produto");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [arquivado, setArquivado] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  
  const membros = useMembros();

  useEffect(() => {
    if (open) {
      setConfirmModalOpen(false);
      if (card) {
        setTitulo(card.titulo);
        setDescricao(card.descricao ?? "");
        setColuna(card.coluna);
        setCategoria(card.categoria);
        const ids =
          card.responsaveisIds && card.responsaveisIds.length > 0
            ? card.responsaveisIds
            : card.responsavelId
              ? [card.responsavelId]
              : [];
        setResponsaveisIds(ids);
        setArquivado(!!card.arquivado);
        setPrioridade(card.prioridade || "media");
      } else {
        setTitulo("");
        setDescricao("");
        setColuna(colunaPadrao);
        setCategoria(categoriasList[0]?.id ?? "produto");
        setResponsaveisIds(currentUserId ? [currentUserId] : []);
        setArquivado(false);
        setPrioridade("media");
      }
    }
  }, [open, card, colunaPadrao, categoriasList, currentUserId]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;

    try {
      if (card) {
        await updateCard(card.id, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          coluna,
          categoria,
          responsaveisIds,
          arquivado,
          prioridade,
        });
        onToast({ mensagem: "Task atualizada com sucesso!" });
      } else {
        await addCard({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          coluna,
          categoria,
          responsaveisIds,
          prioridade,
          autorId: currentUserId,
        });
        onToast({ mensagem: "Nova task criada no Kanban!" });
      }
      onClose();
    } catch (error) {
      onToast({ mensagem: "Erro ao salvar task no Supabase" });
    }
  }

  async function handleExcluir() {
    if (!card) return;
    try {
      await deleteCard(card.id);
      onToast({ mensagem: "Task excluída com sucesso." });
      setConfirmModalOpen(false);
      onClose();
    } catch (error) {
      onToast({ mensagem: "Erro ao excluir task no Supabase" });
    }
  }

  function toggleMembro(id: string) {
    setResponsaveisIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        titulo={card ? "Editar Task" : "Nova Task"}
        descricao={
          card
            ? "Atualize os detalhes, status ou responsáveis da task."
            : "Crie uma nova task para a sprint atual."
        }
        width={520}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {card ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setConfirmModalOpen(true)}
              >
                <Trash2 size={14} /> Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSalvar}
                disabled={!titulo.trim()}
              >
                {card ? "Salvar Alterações" : "Criar Task"}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <Label htmlFor="task-titulo">Título da Task *</Label>
            <Input
              id="task-titulo"
              placeholder="Ex: Reformular fluxo de navegação do acervo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="task-descricao">Descrição</Label>
            <Textarea
              id="task-descricao"
              placeholder="Adicione observações, critérios de aceite ou detalhes úteis..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Coluna / Status</Label>
              <select
                value={coluna}
                onChange={(e) => setColuna(e.target.value as Coluna)}
                className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink hover:border-line-strong transition-colors"
              >
                {COLUNAS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Categoria</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink hover:border-line-strong transition-colors capitalize"
              >
                {categoriasList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink hover:border-line-strong transition-colors"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {card && (
            <div className="flex items-start gap-2.5 rounded-[8px] border border-line bg-raise/50 p-3">
              <input
                id="task-arquivada-kanban"
                type="checkbox"
                checked={arquivado}
                onChange={(e) => setArquivado(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-navy cursor-pointer"
              />
              <div className="grid gap-0.5">
                <Label
                  htmlFor="task-arquivada-kanban"
                  className="mb-0 font-medium text-ink text-[13px] cursor-pointer select-none"
                >
                  Arquivar esta task
                </Label>
                <p className="text-[11px] text-ink-faint leading-normal">
                  Tasks arquivadas não aparecem no Kanban ou nas abas ativas do
                  painel de alertas.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Atribuir Responsáveis (Multi-atribuição)</Label>
              <span className="meta-11 text-ink-faint">
                {responsaveisIds.length}{" "}
                {responsaveisIds.length === 1 ? "selecionado" : "selecionados"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
              {membros.map((m) => {
                const selecionado = responsaveisIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMembro(m.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-[6px] border px-2.5 py-1.5 text-left text-[12px] transition-all",
                      selecionado
                        ? "border-navy bg-navy/5 text-navy font-medium shadow-xs"
                        : "border-line bg-canvas text-ink hover:bg-raise",
                    )}
                  >
                    <Avatar membro={m} size={20} />
                    <span className="flex-1 truncate">{m.nome}</span>
                    {selecionado ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[10px]">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-faint">
                        <UserPlus size={11} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        titulo="Confirmar Exclusão"
        descricao="Deseja mesmo excluir esta task?"
        width={400}
        footer={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleExcluir}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <div className="text-[13px] text-ink-muted leading-relaxed">
          Você está prestes a excluir permanentemente a task{" "}
          <strong className="text-ink font-semibold">"{titulo}"</strong>. Esta
          ação não poderá ser desfeita.
        </div>
      </Modal>
    </>
  );
}
