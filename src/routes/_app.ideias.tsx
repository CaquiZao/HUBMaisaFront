import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, MessageSquare } from "lucide-react";
import type { Categoria, Comentario, Ideia, StatusIdeia } from "@/types";
import {
  Avatar,
  Button,
  Tag,
  Modal,
  Input,
  Textarea,
  Label,
  useToast,
  EmptyState,
  useNomeCategoria,
} from "@/components/ui";
import { IconChevronUp, IconClose } from "@/components/icons";
import { tempoRelativo, dataCurta } from "@/lib/tempo";
import { useCategorias } from "@/lib/categorias";
import { membroPorId } from "@/lib/membros-store";
import { useIdeias, useComentarios, toggleVotoIdeia, alterarStatusIdeia, adicionarComentario, salvarIdeiaEditada, excluirIdeia, adicionarIdeia } from "@/lib/ideias-store";
import { useAuth } from "@/components/auth-provider";

const search = z.object({
  id: z.string().optional(),
  q: z.string().optional(),
  cat: z.string().optional(),
  status: z.string().optional(),
});


export const STATUS_IDEIA_MAP: Record<
  string,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  nova: {
    label: "Nova",
    bgClass: "bg-blue-500/10 dark:bg-blue-400/15",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/30",
  },
  em_discussao: {
    label: "Em discussão",
    bgClass: "bg-amber-500/10 dark:bg-amber-400/15",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500/30",
  },
  aprovada: {
    label: "Aprovada",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-400/15",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500/30",
  },
  virou_task: {
    label: "Virou task",
    bgClass: "bg-purple-500/10 dark:bg-purple-400/15",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-500/30",
  },
  descartada: {
    label: "Descartada",
    bgClass: "bg-zinc-500/10 dark:bg-zinc-400/15",
    textClass: "text-zinc-600 dark:text-zinc-400",
    borderClass: "border-zinc-500/30",
  },
  // Fallbacks para dados legados
  aberta: {
    label: "Nova",
    bgClass: "bg-blue-500/10 dark:bg-blue-400/15",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/30",
  },
  "virou-card": {
    label: "Virou task",
    bgClass: "bg-purple-500/10 dark:bg-purple-400/15",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-500/30",
  },
  arquivada: {
    label: "Descartada",
    bgClass: "bg-zinc-500/10 dark:bg-zinc-400/15",
    textClass: "text-zinc-600 dark:text-zinc-400",
    borderClass: "border-zinc-500/30",
  },
};

export function StatusIdeiaBadge({
  status,
  onClick,
}: {
  status: string;
  onClick?: () => void;
}) {
  const cfg = STATUS_IDEIA_MAP[status] ?? STATUS_IDEIA_MAP.nova;
  return (
    <span
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition-all " +
        `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass} ` +
        (onClick ? "cursor-pointer hover:scale-105" : "")
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  );
}

export const Route = createFileRoute("/_app/ideias")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Ideias — Hub" },
      { name: "description", content: "Ideias do time, com voto e thread." },
    ],
  }),
  component: IdeiasPage,
});


function IdeiasPage() {
  const navigate = useNavigate();
  const sp = Route.useSearch();
  const ideiasStore = useIdeias();
  const comentariosStore = useComentarios();
  
  const [novaAberta, setNovaAberta] = useState(false);
  const [editandoIdeia, setEditandoIdeia] = useState<Ideia | null>(null);
  const [excluindoIdeia, setExcluindoIdeia] = useState<Ideia | null>(null);

  const { session } = useAuth();
  const USUARIO_ATUAL = session?.user?.id || "";

  const { push } = useToast();
  const categoriasStore = useCategorias();

  const q = (sp.q ?? "").trim().toLowerCase();
  const catFiltro = sp.cat ?? "todas";
  const statusFiltro = sp.status ?? "todos";

  const lista = useMemo(() => {
    let base = [...ideiasStore];
    if (catFiltro !== "todas") {
      base = base.filter((i) => i.categoria === catFiltro);
    }
    if (statusFiltro !== "todos") {
      base = base.filter((i) => {
        if (statusFiltro === "nova")
          return i.status === "nova" || i.status === "aberta";
        if (statusFiltro === "virou_task")
          return i.status === "virou_task" || i.status === "virou-card";
        if (statusFiltro === "descartada")
          return i.status === "descartada" || i.status === "arquivada";
        return i.status === statusFiltro;
      });
    }
    if (q) {
      base = base.filter(
        (i) =>
          (i.titulo || "").toLowerCase().includes(q) ||
          (i.corpo || "").toLowerCase().includes(q),
      );
    }
    base.sort((a, b) => (b.votos?.length || 0) - (a.votos?.length || 0));
    return base;
  }, [ideiasStore, q, catFiltro, statusFiltro]);

  const selecionada = sp.id
    ? (ideiasStore.find((i) => i.id === sp.id) ?? null)
    : null;

  function abrir(id: string) {
    navigate({
      to: "/ideias",
      search: (prev: Record<string, unknown>) => ({ ...prev, id }) as never,
    });
  }

  function fechar() {
    navigate({
      to: "/ideias",
      search: (prev: Record<string, unknown>) => {
        const { id: _drop, ...rest } = prev;
        void _drop;
        return rest as never;
      },
    });
  }

  async function handleToggleVoto(id: string) {
    if (USUARIO_ATUAL) await toggleVotoIdeia(id, USUARIO_ATUAL);
  }

  async function handleAlterarStatus(id: string, novoStatus: StatusIdeia) {
    await alterarStatusIdeia(id, novoStatus);
    const cfg = STATUS_IDEIA_MAP[novoStatus];
    push({
      titulo: "Status atualizado",
      descricao: `Status alterado para "${cfg?.label ?? novoStatus}".`,
    });
  }

  async function handleAdicionarComentario(ideiaId: string, corpo: string) {
    if (USUARIO_ATUAL) await adicionarComentario(ideiaId, USUARIO_ATUAL, corpo);
  }

  async function handleSalvarIdeiaEditada(
    id: string,
    titulo: string,
    corpo: string,
    categoria: Categoria,
    status: StatusIdeia,
  ) {
    await salvarIdeiaEditada(id, titulo, corpo, categoria, status);
    push({
      titulo: "Ideia atualizada",
      descricao: `"${titulo}" foi salva com sucesso.`,
    });
  }

  async function handleConfirmarExclusao(id: string) {
    const ideiaExcluida = ideiasStore.find((i) => i.id === id);
    await excluirIdeia(id);
    if (selecionada?.id === id) {
      fechar();
    }
    push({
      titulo: "Ideia excluída",
      descricao: ideiaExcluida
        ? `"${ideiaExcluida.titulo}" foi removida.`
        : "Ideia removida do acervo.",
    });
  }

  return (
    <div>
      <header className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Ideias</p>
          <h1 className="mt-1.5 flex items-center gap-2 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            <span className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-[8px] bg-gold-wash px-2.5 text-[17px] font-bold tracking-tight text-gold-ink border border-gold/30 shadow-[0_0_12px_rgba(234,180,9,0.4)]">
              {ideiasStore.length}
            </span>
            <span className="text-ink-muted text-[15px] font-normal">
              ideias do time
            </span>
          </h1>
        </div>
        <Button variant="primary" onClick={() => setNovaAberta(true)}>
          Nova ideia
        </Button>
      </header>

      {/* Search & Filters */}
      <div className="mt-5 space-y-3">
        <div className="max-w-md">
          <Input
            type="search"
            aria-label="Buscar ideias"
            placeholder="Buscar por título ou descrição..."
            value={sp.q ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              navigate({
                to: "/ideias",
                search: (prev: Record<string, unknown>) =>
                  ({ ...prev, q: v || undefined }) as never,
              });
            }}
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-ink-faint mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/ideias",
                search: (prev: Record<string, unknown>) =>
                  ({ ...prev, status: undefined }) as never,
              })
            }
            className={
              "px-2.5 py-1 text-[11px] font-mono rounded-full border transition-all cursor-pointer " +
              (statusFiltro === "todos"
                ? "bg-navy text-white border-navy font-semibold shadow-xs"
                : "bg-canvas text-ink-muted border-line hover:bg-raise")
            }
          >
            Todos ({ideiasStore.length})
          </button>
          {[
            { id: "nova", label: "Nova" },
            { id: "em_discussao", label: "Em discussão" },
            { id: "aprovada", label: "Aprovada" },
            { id: "virou_task", label: "Virou task" },
            { id: "descartada", label: "Descartada" },
          ].map((st) => {
            const qtd = ideiasStore.filter((i) => {
              if (st.id === "nova")
                return i.status === "nova" || i.status === "aberta";
              if (st.id === "virou_task")
                return i.status === "virou_task" || i.status === "virou-card";
              if (st.id === "descartada")
                return i.status === "descartada" || i.status === "arquivada";
              return i.status === st.id;
            }).length;
            const ativo = statusFiltro === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/ideias",
                    search: (prev: Record<string, unknown>) =>
                      ({
                        ...prev,
                        status: ativo ? undefined : st.id,
                      }) as never,
                  })
                }
                className={
                  "px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer flex items-center gap-1.5 " +
                  (ativo
                    ? "bg-raise text-ink border-gold font-semibold ring-2 ring-gold/30 shadow-xs"
                    : "bg-canvas text-ink-muted border-line hover:bg-raise")
                }
              >
                <span>{st.label}</span>
                <span className="font-mono text-[10px] text-ink-faint">
                  ({qtd})
                </span>
              </button>
            );
          })}
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-ink-faint mr-1">
            Categorias:
          </span>
          <button
            type="button"
            onClick={() =>
              navigate({
                to: "/ideias",
                search: (prev: Record<string, unknown>) =>
                  ({ ...prev, cat: undefined }) as never,
              })
            }
            className={
              "px-2.5 py-1 text-[11px] font-mono rounded-full border transition-all cursor-pointer " +
              (catFiltro === "todas"
                ? "bg-navy text-white border-navy font-semibold shadow-xs"
                : "bg-canvas text-ink-muted border-line hover:bg-raise")
            }
          >
            Todas ({ideiasStore.length})
          </button>
          {categoriasStore.map((catItem) => {
            const qtd = ideiasStore.filter((i) => i.categoria === catItem.id).length;
            if (qtd === 0 && catFiltro !== catItem.id) return null;
            const ativa = catFiltro === catItem.id;
            return (
              <button
                key={catItem.id}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/ideias",
                    search: (prev: Record<string, unknown>) =>
                      ({
                        ...prev,
                        cat: ativa ? undefined : catItem.id,
                      }) as never,
                  })
                }
                className={
                  "rounded-full transition-all cursor-pointer " +
                  (ativa
                    ? "ring-[1.5px] ring-gold scale-105 font-bold shadow-[0_0_10px_rgba(234,180,9,0.6)]"
                    : "opacity-80 hover:opacity-100")
                }
              >
                <Tag
                  tone="categoria"
                  categoria={catItem.id}
                  pill
                  className="uppercase px-2.5 py-1 text-[11px]"
                >
                  {catItem.nome} ({qtd})
                </Tag>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid & Thread Layout */}
      <div
        className="mt-5 grid gap-6"
        style={{
          gridTemplateColumns: selecionada ? "minmax(0,1fr) 460px" : "1fr",
        }}
      >
        <div className="min-w-0">
          {lista.length === 0 ? (
            <div className="mt-16">
              <EmptyState
                titulo={
                  q || catFiltro !== "todas" || statusFiltro !== "todos"
                    ? "Nenhuma ideia encontrada com esses filtros."
                    : "Nenhuma ideia registrada."
                }
                descricao={
                  q || catFiltro !== "todas" || statusFiltro !== "todos"
                    ? "Tente ajustar a busca ou filtros de categoria/status."
                    : "Comece compartilhando a primeira ideia com a equipe."
                }
                acao={
                  <Button variant="primary" onClick={() => setNovaAberta(true)}>
                    Nova ideia
                  </Button>
                }
              />
            </div>
          ) : (
            <ul
              className={
                "stagger grid gap-3.5 " +
                (selecionada
                  ? "grid-cols-1 xl:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2")
              }
            >
              <AnimatePresence initial={false}>
                {lista.map((i) => (
                  <IdeiaCard
                    key={i.id}
                    i={i}
                    ativo={i.id === sp.id}
                    usuarioAtual={USUARIO_ATUAL}
                    comentariosCount={
                      comentariosStore.filter((c) => c.ideiaId === i.id).length
                    }
                    onVoto={() => handleToggleVoto(i.id)}
                    onAbrir={() => abrir(i.id)}
                    onAlterarStatus={(novoSt) => handleAlterarStatus(i.id, novoSt)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {selecionada ? (
          <ThreadPanel
            i={selecionada}
            usuarioAtual={USUARIO_ATUAL}
            comentarios={comentariosStore.filter(
              (c) => c.ideiaId === selecionada.id,
            )}
            onFechar={fechar}
            onVoto={() => handleToggleVoto(selecionada.id)}
            onComentar={(corpo) => handleAdicionarComentario(selecionada.id, corpo)}
            onEditar={() => setEditandoIdeia(selecionada)}
            onExcluir={() => setExcluindoIdeia(selecionada)}
            onAlterarStatus={(novoSt) => handleAlterarStatus(selecionada.id, novoSt)}
          />
        ) : null}
      </div>

      <NovaIdeiaModal
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        onCriar={async (titulo, corpo, categoria) => {
          if (!USUARIO_ATUAL) {
            push({ titulo: "Erro", descricao: "Usuário não autenticado." });
            return;
          }
          const nova = await adicionarIdeia({
            titulo,
            corpo,
            categoria,
            tags: [],
            autorId: USUARIO_ATUAL,
            status: "nova",
          });
          setNovaAberta(false);
          abrir(nova.id);
          push({ titulo: "Ideia criada", descricao: titulo });
        }}
      />

      <EditarIdeiaModal
        ideia={editandoIdeia}
        onClose={() => setEditandoIdeia(null)}
        onSalvar={handleSalvarIdeiaEditada}
      />

      <ExcluirIdeiaModal
        ideia={excluindoIdeia}
        onClose={() => setExcluindoIdeia(null)}
        onConfirmar={handleConfirmarExclusao}
      />
    </div>
  );
}

function IdeiaCard({
  i,
  ativo,
  usuarioAtual,
  comentariosCount,
  onVoto,
  onAbrir,
}: {
  i: Ideia;
  ativo: boolean;
  usuarioAtual: string;
  comentariosCount: number;
  onVoto: () => void;
  onAbrir: () => void;
  onAlterarStatus?: (novo: StatusIdeia) => void;
}) {
  const autor = membroPorId(i.autorId);
  const catNome = useNomeCategoria(i.categoria);
  const votou = (i.votos || []).includes(usuarioAtual);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.88,
        y: 12,
        filter: "blur(4px)",
        transition: { duration: 0.22, ease: "easeIn" },
      }}
      className="list-none h-full"
    >
      <div
        onClick={onAbrir}
        className={
          "group relative flex flex-col justify-between h-full rounded-[12px] border border-line bg-canvas p-3.5 transition-all cursor-pointer min-w-0 shadow-sm hover:shadow-md hover:border-line-strong hover:bg-raise " +
          (ativo
            ? "ring-2 ring-gold ring-offset-2 ring-offset-canvas bg-raise"
            : "")
        }
      >
        <div>
          {/* Header row: Upvote + Category + Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVoto();
                }}
                aria-pressed={votou}
                aria-label={votou ? "Remover voto" : "Votar na ideia"}
                className={
                  "inline-flex h-7 px-2 items-center gap-1 rounded-[6px] border text-[12px] font-mono transition-colors shrink-0 cursor-pointer " +
                  (votou
                    ? "border-gold bg-gold-wash text-gold-ink font-semibold"
                    : "border-line text-ink-muted hover:border-line-strong hover:bg-raise")
                }
              >
                <IconChevronUp
                  className={votou ? "text-gold" : "text-ink-faint"}
                />
                <span>{(i.votos || []).length}</span>
              </button>

              <Tag
                tone="categoria"
                categoria={i.categoria}
                pill
                className="uppercase shrink-0 truncate max-w-[120px]"
              >
                {catNome}
              </Tag>

              <StatusIdeiaBadge status={i.status} />
            </div>
          </div>

          {/* Title & Body */}
          <h3 className="mt-3 line-clamp-2 text-[13.5px] font-semibold leading-5 text-ink group-hover:text-navy transition-colors">
            {i.titulo}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-4 text-ink-muted">
            {i.corpo}
          </p>
        </div>

        {/* Footer: Author & Meta */}
        <div className="mt-4 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-faint">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar membro={autor} size={18} />
            <span className="truncate text-ink-muted font-medium">
              {autor.nome.split(" ")[0]}
            </span>
            <span>·</span>
            <span>{tempoRelativo(i.criadaEm)}</span>
          </div>

          {comentariosCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-ink-faint font-medium">
              <MessageSquare size={12} />
              {comentariosCount}
            </span>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

function ThreadPanel({
  i,
  comentarios,
  usuarioAtual,
  onFechar,
  onVoto,
  onComentar,
  onEditar,
  onExcluir,
  onAlterarStatus,
}: {
  i: Ideia;
  comentarios: Comentario[];
  usuarioAtual: string;
  onFechar: () => void;
  onVoto: () => void;
  onComentar: (corpo: string) => void;
  onEditar: () => void;
  onExcluir: () => void;
  onAlterarStatus: (novo: StatusIdeia) => void;
}) {
  const [rascunho, setRascunho] = useState("");
  const autor = membroPorId(i.autorId);
  const catNome = useNomeCategoria(i.categoria);
  const votou = (i.votos || []).includes(usuarioAtual);

  return (
    <aside
      className="sticky top-20 h-fit min-w-0 rounded-[12px] border border-line bg-canvas shadow-sm"
      aria-label={`Thread de ${i.titulo}`}
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="meta text-ink-faint">Ideia em destaque</p>
          <h2 className="mt-0.5 text-[14px] font-semibold leading-5 text-ink line-clamp-1">
            {i.titulo}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onEditar}
            title="Editar ideia"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-faint hover:bg-raise hover:text-ink transition-colors cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onExcluir}
            title="Excluir ideia"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-line text-ink-faint hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-faint hover:bg-raise transition-colors cursor-pointer"
          >
            <IconClose />
          </button>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Meta Header */}
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <div className="flex items-center gap-2">
            <Avatar membro={autor} size={24} />
            <span className="text-ink font-medium">{autor.nome}</span>
            <span className="meta-11 text-ink-faint">
              {dataCurta(i.criadaEm)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Tag
              tone="categoria"
              categoria={i.categoria}
              pill
              className="uppercase"
            >
              {catNome}
            </Tag>
          </div>
        </div>

        {/* Status selector inside thread */}
        <div className="mt-3 flex items-center justify-between rounded-[8px] border border-line bg-raise/50 px-3 py-2 text-[12px]">
          <span className="text-ink-muted font-medium">Status da ideia:</span>
          <select
            value={
              i.status === "aberta"
                ? "nova"
                : i.status === "virou-card"
                  ? "virou_task"
                  : i.status === "arquivada"
                    ? "descartada"
                    : i.status
            }
            onChange={(e) => onAlterarStatus(e.target.value as StatusIdeia)}
            className="rounded-[6px] border border-line bg-canvas px-2 py-1 text-[11.5px] font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-gold cursor-pointer"
          >
            <option value="nova">Nova</option>
            <option value="em_discussao">Em discussão</option>
            <option value="aprovada">Aprovada</option>
            <option value="virou_task">Virou task</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>

        {/* Body */}
        <p className="mt-3.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
          {i.corpo}
        </p>

        {/* Vote Button */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onVoto}
            aria-pressed={votou}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-3 text-[12.5px] transition-all cursor-pointer " +
              (votou
                ? "border-gold bg-gold-wash text-gold-ink font-medium shadow-xs"
                : "border-line text-ink hover:bg-raise")
            }
          >
            <IconChevronUp className={votou ? "text-gold" : "text-ink-faint"} />
            <span
              style={{ fontFamily: "var(--font-mono)" }}
              className="font-semibold"
            >
              {(i.votos || []).length}
            </span>
            <span>{votou ? "Votado" : "Votar"}</span>
          </button>
        </div>

        {/* Comentários */}
        <div className="mt-6 border-t border-line pt-4">
          <p className="eyebrow">
            {comentarios.length}{" "}
            {comentarios.length === 1 ? "comentário" : "comentários"}
          </p>
          <ul className="stagger mt-3 space-y-3">
            {comentarios.map((c) => {
              const m = membroPorId(c.autorId);
              return (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar membro={m} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] text-ink font-medium">
                        {m.nome.split(" ")[0]}
                      </span>
                      <span className="meta-11 text-ink-faint">
                        {dataCurta(c.criadoEm)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-5 text-ink">
                      {c.corpo}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const v = rascunho.trim();
              if (!v) return;
              onComentar(v);
              setRascunho("");
            }}
          >
            <Textarea
              placeholder="Escreva um comentário…"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={(e) => {
                  e.preventDefault();
                  const v = rascunho.trim();
                  if (!v) return;
                  onComentar(v);
                  setRascunho("");
                }}
                disabled={!rascunho.trim()}
              >
                Comentar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </aside>
  );
}

function SelecaoCategoriaGrid({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (id: string) => void;
}) {
  const categorias = useCategorias();
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {categorias.map((c) => {
        const selecionada = c.id === valor;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={
              "rounded-full transition-all cursor-pointer " +
              (selecionada
                ? "ring-[1.5px] ring-gold scale-105 font-bold shadow-[0_0_10px_rgba(234,180,9,0.6)]"
                : "opacity-75 hover:opacity-100")
            }
          >
            <Tag
              tone="categoria"
              categoria={c.id}
              pill
              className="uppercase px-2.5 py-1 text-[11px]"
            >
              {c.nome}
            </Tag>
          </button>
        );
      })}
    </div>
  );
}

function NovaIdeiaModal({
  open,
  onClose,
  onCriar,
}: {
  open: boolean;
  onClose: () => void;
  onCriar: (titulo: string, corpo: string, cat: Categoria) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [cat, setCat] = useState<Categoria>("produto");

  function reset() {
    setTitulo("");
    setCorpo("");
    setCat("produto");
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      titulo="Nova ideia"
      width={520}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!titulo.trim()}
            onClick={() => {
              onCriar(titulo.trim(), corpo.trim(), cat);
              reset();
            }}
          >
            Publicar ideia
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="ni-tit">Título da ideia</Label>
          <Input
            id="ni-tit"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Uma linha descrevendo a ideia..."
          />
        </div>
        <div>
          <Label htmlFor="ni-corpo">Descrição / Contexto</Label>
          <Textarea
            id="ni-corpo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="Explique os detalhes, problemas resolvidos ou hipóteses..."
            rows={5}
          />
        </div>
        <div>
          <Label>Selecione a Categoria</Label>
          <SelecaoCategoriaGrid valor={cat} onChange={(c) => setCat(c)} />
        </div>
      </div>
    </Modal>
  );
}

function EditarIdeiaModal({
  ideia,
  onClose,
  onSalvar,
}: {
  ideia: Ideia | null;
  onClose: () => void;
  onSalvar: (
    id: string,
    titulo: string,
    corpo: string,
    cat: Categoria,
    status: StatusIdeia,
  ) => void;
}) {
  const [titulo, setTitulo] = useState(ideia?.titulo ?? "");
  const [corpo, setCorpo] = useState(ideia?.corpo ?? "");
  const [cat, setCat] = useState<Categoria>(ideia?.categoria ?? "produto");
  const [st, setSt] = useState<StatusIdeia>("nova");

  useEffect(() => {
    if (ideia) {
      setTitulo(ideia.titulo);
      setCorpo(ideia.corpo);
      setCat(ideia.categoria);
      const mapped =
        ideia.status === "aberta"
          ? "nova"
          : ideia.status === "virou-card"
            ? "virou_task"
            : ideia.status === "arquivada"
              ? "descartada"
              : ideia.status;
      setSt(mapped as StatusIdeia);
    }
  }, [ideia]);

  if (!ideia) return null;

  return (
    <Modal
      open={!!ideia}
      onClose={onClose}
      titulo="Editar ideia"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!titulo.trim()}
            onClick={() => {
              onSalvar(ideia.id, titulo.trim(), corpo.trim(), cat, st);
              onClose();
            }}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="ei-tit">Título da ideia</Label>
          <Input
            id="ei-tit"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da ideia..."
          />
        </div>
        <div>
          <Label htmlFor="ei-corpo">Descrição</Label>
          <Textarea
            id="ei-corpo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="Detalhamento da ideia..."
            rows={5}
          />
        </div>
        <div>
          <Label>Status da Ideia</Label>
          <select
            value={st}
            onChange={(e) => setSt(e.target.value as StatusIdeia)}
            className="w-full rounded-[6px] border border-line bg-canvas p-2 text-[13px] text-ink focus:outline-hidden focus:ring-1 focus:ring-gold cursor-pointer"
          >
            <option value="nova">Nova</option>
            <option value="em_discussao">Em discussão</option>
            <option value="aprovada">Aprovada</option>
            <option value="virou_task">Virou task</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>
        <div>
          <Label>Categoria</Label>
          <SelecaoCategoriaGrid valor={cat} onChange={(c) => setCat(c)} />
        </div>
      </div>
    </Modal>
  );
}

function ExcluirIdeiaModal({
  ideia,
  onClose,
  onConfirmar,
}: {
  ideia: Ideia | null;
  onClose: () => void;
  onConfirmar: (id: string) => void;
}) {
  const toast = useToast();
  const [excluindo, setExcluindo] = useState(false);
  const catNome = useNomeCategoria(ideia?.categoria ?? "");

  if (!ideia) return null;
  const autor = membroPorId(ideia.autorId);

  const handleExcluir = () => {
    setExcluindo(true);
    setTimeout(() => {
      onClose();
      onConfirmar(ideia.id);
      toast.push({
        titulo: "Removido",
        descricao: "Ideia excluída com sucesso.",
      });
      setExcluindo(false);
    }, 150);
  };

  return (
    <Modal
      open={!!ideia}
      onClose={onClose}
      titulo="Excluir ideia"
      descricao="Confirme a remoção permanente desta ideia."
      width={460}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={excluindo}
          >
            Cancelar
          </Button>
          <button
            type="button"
            disabled={excluindo}
            onClick={handleExcluir}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-red-600 px-4 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {excluindo ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Sim, excluir ideia
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-3.5 py-1">
        {/* Preview card */}
        <div className="rounded-[8px] border border-line bg-raise/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Tag
              tone="categoria"
              categoria={ideia.categoria}
              pill
              className="uppercase"
            >
              {catNome}
            </Tag>
            <span className="meta-11 text-ink-faint">
              por {autor.nome.split(" ")[0]}
            </span>
          </div>
          <h4 className="text-[13.5px] font-semibold text-ink line-clamp-1">
            {ideia.titulo}
          </h4>
          <p className="text-[12px] text-ink-muted line-clamp-2">
            {ideia.corpo}
          </p>
        </div>

        {/* Warning Banner */}
        <div className="rounded-[8px] border border-red-200/80 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 p-3 text-[12.5px] text-red-700 dark:text-red-300 leading-relaxed">
          <p className="font-medium flex items-center gap-1.5">
            ⚠️ Ação permanente e irreversível
          </p>
          <p className="mt-1 text-red-600/90 dark:text-red-400/90 meta-11">
            Esta ideia e seus comentários serão completamente removidos do Hub.
          </p>
        </div>
      </div>
    </Modal>
  );
}
