import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  Check,
  UserPlus,
  ArrowRight,
  Archive,
  ArchiveRestore,
} from "lucide-react";

import type { Card, Coluna, Prioridade } from "@/types";
import { useAuth } from "@/components/auth-provider";
import { useMembros, membroPorId } from "@/lib/membros-store";
import {
  StatusDot,
  Tag,
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
import { useCardsState, updateCard, deleteCard } from "@/lib/cards-store";
import { useCategorias } from "@/lib/categorias";
import { tempoRelativo } from "@/lib/tempo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — Hub" },
      { name: "description", content: "Tasks e atividades atribuídas a você." },
    ],
  }),
  component: AlertasPage,
});

const COLUNAS: { id: Coluna; titulo: string }[] = [
  { id: "planejado", titulo: "Planejado" },
  { id: "fazendo", titulo: "Fazendo" },
  { id: "feito", titulo: "Feito" },
  { id: "validado", titulo: "Validado" },
];


function AlertasPage() {
  const cards = useCardsState();
  const { push } = useToast();
  const categorias = useCategorias();
  const { user } = useAuth();
  const membros = useMembros();
  
  const myUserId = user?.id || "";

  const nomeUsuario = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const iniciaisUsuario = nomeUsuario.slice(0, 2).toUpperCase();

  const membroAtualMock = {
    id: user?.id || "mock",
    nome: nomeUsuario,
    iniciais: iniciaisUsuario,
    avatarUrl: user?.user_metadata?.avatar_url || "",
    papel: "admin"
  };

  const [filtroStatus, setFiltroStatus] = useState<
    Coluna | "todas" | "arquivado"
  >("todas");
  const [busca, setBusca] = useState("");

  // Modal para editar task
  const [modalAberta, setModalAberta] = useState(false);
  const [cardParaEditar, setCardParaEditar] = useState<Card | null>(null);

  // Filtrar apenas tasks atribuídas ao usuário logado
  const minhasTasks = useMemo(() => {
    return cards.filter((c) => {
      const ids =
        c.responsaveisIds && c.responsaveisIds.length > 0
          ? c.responsaveisIds
          : c.responsavelId
            ? [c.responsavelId]
            : [];
      return ids.includes(myUserId);
    });
  }, [cards, myUserId]);

  // Contadores
  const contadores = useMemo(() => {
    const map = {
      todas: 0,
      planejado: 0,
      fazendo: 0,
      feito: 0,
      validado: 0,
      arquivado: 0,
    };
    for (const t of minhasTasks) {
      if (t.arquivado) {
        map.arquivado++;
      } else {
        map.todas++;
        if (map[t.coluna] !== undefined) {
          map[t.coluna]++;
        }
      }
    }
    return map;
  }, [minhasTasks]);

  // Tasks filtradas por status e busca
  const tasksFiltradas = useMemo(() => {
    return minhasTasks.filter((t) => {
      if (filtroStatus === "arquivado") {
        if (!t.arquivado) return false;
      } else {
        if (t.arquivado) return false;
        if (filtroStatus !== "todas" && t.coluna !== filtroStatus) return false;
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchTitulo = (t.titulo || "").toLowerCase().includes(termo);
        const matchDesc = t.descricao?.toLowerCase().includes(termo) ?? false;
        const matchCat = (t.categoria || "").toLowerCase().includes(termo);
        return matchTitulo || matchDesc || matchCat;
      }
      return true;
    });
  }, [minhasTasks, filtroStatus, busca]);

  function handleMoverStatus(card: Card, novaColuna: Coluna) {
    if (card.coluna === novaColuna) return;
    updateCard(card.id, { coluna: novaColuna });
    const colObj = COLUNAS.find((c) => c.id === novaColuna);
    push({
      mensagem: `Task movida para "${colObj?.titulo ?? novaColuna}"`,
    });
  }

  function handleToggleArquivar(card: Card) {
    const novoStatus = !card.arquivado;
    updateCard(card.id, { arquivado: novoStatus });
    push({
      mensagem: novoStatus
        ? "Task arquivada com sucesso!"
        : "Task desarquivada com sucesso!",
    });
  }

  function handleAbrirEditar(card: Card) {
    setCardParaEditar(card);
    setModalAberta(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-navy">
            <Bell size={13} className="text-navy" /> Central de Notificações
          </p>
          <h1 className="mt-1 text-[22px] font-medium leading-7 tracking-[-0.02em] text-ink">
            Alertas & Tasks Atribuídas
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Acompanhe todas as atividades sob sua responsabilidade direta ou em
            equipe.
          </p>
        </div>

        {/* User Badge Info */}
        <div className="flex items-center gap-3 rounded-[10px] border border-line bg-canvas p-2.5 px-3.5 shadow-xs">
          <Avatar membro={membroAtualMock} size={32} />
          <div>
            <p className="text-[13px] font-medium text-ink">
              {nomeUsuario}
            </p>
            <p className="meta-11 text-ink-faint">
              {contadores.todas}{" "}
              {contadores.todas === 1 ? "task atribuída" : "tasks atribuídas"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-[8px] border border-line bg-canvas p-1 text-[12.5px]">
          <button
            type="button"
            onClick={() => setFiltroStatus("todas")}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 transition-colors",
              filtroStatus === "todas"
                ? "bg-navy text-white font-medium shadow-xs"
                : "text-ink-muted hover:text-ink hover:bg-raise",
            )}
          >
            <span>Todas</span>
            <span
              className={cn(
                "meta-11 rounded-full px-1.5 py-[0.5px]",
                filtroStatus === "todas"
                  ? "bg-white/20 text-white"
                  : "bg-raise text-ink-faint",
              )}
            >
              {contadores.todas}
            </span>
          </button>

          {COLUNAS.map((col) => {
            const ativo = filtroStatus === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setFiltroStatus(col.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 transition-colors",
                  ativo
                    ? "bg-navy text-white font-medium shadow-xs"
                    : "text-ink-muted hover:text-ink hover:bg-raise",
                )}
              >
                <StatusDot coluna={col.id} />
                <span>{col.titulo}</span>
                <span
                  className={cn(
                    "meta-11 rounded-full px-1.5 py-[0.5px]",
                    ativo
                      ? "bg-white/20 text-white"
                      : "bg-raise text-ink-faint",
                  )}
                >
                  {contadores[col.id]}
                </span>
              </button>
            );
          })}

          {/* Arquivado Tab */}
          <button
            type="button"
            onClick={() => setFiltroStatus("arquivado")}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 transition-colors",
              filtroStatus === "arquivado"
                ? "bg-navy text-white font-medium shadow-xs"
                : "text-ink-muted hover:text-ink hover:bg-raise",
            )}
          >
            <Archive size={13} />
            <span>Arquivado</span>
            <span
              className={cn(
                "meta-11 rounded-full px-1.5 py-[0.5px]",
                filtroStatus === "arquivado"
                  ? "bg-white/20 text-white"
                  : "bg-raise text-ink-faint",
              )}
            >
              {contadores.arquivado}
            </span>
          </button>
        </div>

        {/* Campo de Busca */}
        <div className="relative min-w-[220px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="text"
            placeholder="Buscar nas suas tasks..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-full rounded-[6px] border border-line bg-canvas pl-8 pr-3 text-[12.5px] text-ink placeholder:text-ink-faint hover:border-line-strong focus:outline-none focus:ring-1 focus:ring-navy transition-colors"
          />
        </div>
      </div>

      {/* Lista de Tasks */}
      {tasksFiltradas.length === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-line bg-canvas/50 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raise text-ink-faint">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-ink">
              Nenhuma task encontrada
            </p>
            <p className="meta-11 mt-0.5 text-ink-faint">
              {busca.trim()
                ? "Nenhum resultado para a sua pesquisa."
                : filtroStatus !== "todas"
                  ? "Você não possui tasks neste status no momento."
                  : "Você não possui nenhuma task atribuída."}
            </p>
          </div>
          <Link
            to="/kanban"
            className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-gold-ink hover:underline"
          >
            Ver todas as tarefas no Kanban <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {tasksFiltradas.map((task) => {
            const ids =
              task.responsaveisIds && task.responsaveisIds.length > 0
                ? task.responsaveisIds
                : task.responsavelId
                  ? [task.responsavelId]
                  : [];
            const membrosResponsaveis = ids.map(membroPorId);
            const coAtribuidos = membrosResponsaveis.filter(
              (m) => m.id !== myUserId,
            );

            const catNome =
              categorias.find((c) => c.id === task.categoria)?.nome ??
              task.categoria;

            return (
              <div
                key={task.id}
                className="group relative flex flex-col justify-between rounded-[10px] border border-line bg-canvas p-4 shadow-xs transition-all hover:border-line-strong hover:shadow-subtle"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusDot coluna={task.coluna} />
                      <span className="text-[12px] font-medium capitalize text-ink-muted">
                        {task.coluna}
                      </span>
                      <Tag
                        tone="categoria"
                        categoria={task.categoria}
                        pill
                        className="uppercase shrink-0 truncate max-w-[120px]"
                      >
                        {catNome}
                      </Tag>
                      {task.prioridade ? (
                        <Tag
                          pill
                          className={cn(
                            "uppercase font-semibold tracking-wider text-[9px] px-2 py-[0.5px]",
                            task.prioridade === "alta"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : task.prioridade === "media"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                          )}
                        >
                          {task.prioridade === "alta"
                            ? "Alta"
                            : task.prioridade === "media"
                              ? "Média"
                              : "Baixa"}
                        </Tag>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAbrirEditar(task)}
                      title="Editar task"
                      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-ink-faint hover:bg-raise hover:text-ink transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-2 text-[14px] font-medium leading-5 text-ink group-hover:text-navy transition-colors">
                    {task.titulo}
                  </h3>

                  {task.descricao ? (
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">
                      {task.descricao}
                    </p>
                  ) : null}
                </div>

                {/* Footer Info & Actions */}
                <div className="mt-4 border-t border-line/60 pt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AvatarStack
                      membros={membrosResponsaveis}
                      size={24}
                      max={3}
                    />
                    {coAtribuidos.length > 0 ? (
                      <span className="meta-11 text-ink-faint">
                        com +{coAtribuidos.length}{" "}
                        {coAtribuidos.length === 1 ? "membro" : "membros"}
                      </span>
                    ) : (
                      <span className="meta-11 text-ink-faint">Individual</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Alterar Status rápido */}
                    <select
                      value={task.coluna}
                      onChange={(e) =>
                        handleMoverStatus(task, e.target.value as Coluna)
                      }
                      className="h-7 rounded-[5px] border border-line bg-canvas px-2 text-[11.5px] text-ink hover:border-line-strong transition-colors cursor-pointer"
                    >
                      {COLUNAS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.titulo}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleToggleArquivar(task)}
                      title={
                        task.arquivado
                          ? "Desarquivar tarefa"
                          : "Arquivar tarefa"
                      }
                      className={cn(
                        "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2 text-[11.5px] transition-colors",
                        task.arquivado
                          ? "bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500/20"
                          : "border border-line text-ink-muted hover:bg-raise hover:text-ink",
                      )}
                    >
                      {task.arquivado ? (
                        <>
                          <ArchiveRestore size={12} />
                          <span>Desarquivar</span>
                        </>
                      ) : (
                        <>
                          <Archive size={12} />
                          <span>Arquivar</span>
                        </>
                      )}
                    </button>

                    <Link
                      to="/kanban"
                      title="Ver no Kanban"
                      className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-line px-2 text-[11.5px] text-ink-muted hover:bg-raise hover:text-ink transition-colors"
                    >
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição */}
      <ModalTask
        open={modalAberta}
        onClose={() => setModalAberta(false)}
        card={cardParaEditar}
        onToast={push}
      />
    </div>
  );
}

function ModalTask({
  open,
  onClose,
  card,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  card: Card | null;
  onToast: (data: { mensagem: string }) => void;
}) {
  const categoriasList = useCategorias();
  const membros = useMembros();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [coluna, setColuna] = useState<Coluna>("planejado");
  const [categoria, setCategoria] = useState("produto");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [arquivado, setArquivado] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [prioridade, setPrioridade] = useState<Prioridade>("media");

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
      }
    }
  }, [open, card]);

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!card || !titulo.trim()) return;

    updateCard(card.id, {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      coluna,
      categoria,
      responsaveisIds,
      arquivado,
      prioridade,
    });
    onToast({ mensagem: "Task atualizada com sucesso!" });
    onClose();
  }

  function handleExcluir() {
    if (!card) return;
    deleteCard(card.id);
    onToast({ mensagem: "Task excluída com sucesso." });
    setConfirmModalOpen(false);
    onClose();
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
        titulo="Editar Task"
        descricao="Atualize os detalhes, coluna ou responsáveis da task."
        width={520}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setConfirmModalOpen(true)}
            >
              <Trash2 size={14} /> Excluir
            </Button>
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
                Salvar Alterações
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <Label htmlFor="task-titulo-alerta">Título da Task *</Label>
            <Input
              id="task-titulo-alerta"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="task-descricao-alerta">Descrição</Label>
            <Textarea
              id="task-descricao-alerta"
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
                id="task-arquivada-alertas"
                type="checkbox"
                checked={arquivado}
                onChange={(e) => setArquivado(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-navy focus:ring-navy cursor-pointer"
              />
              <div className="grid gap-0.5">
                <Label
                  htmlFor="task-arquivada-alertas"
                  className="mb-0 font-medium text-ink text-[13px] cursor-pointer select-none"
                >
                  Arquivar esta task
                </Label>
                <p className="text-[11px] text-ink-faint leading-normal">
                  Tasks arquivadas não aparecem nas abas ativas do painel de
                  alertas ou Kanban.
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
