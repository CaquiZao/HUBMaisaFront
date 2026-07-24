import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  KanbanSquare,
  ClipboardList,
  Star,
  ChevronRight,
} from "lucide-react";
import { Avatar, Modal, Tag, useNomeCategoria } from "@/components/ui";
import { useCategorias } from "@/lib/categorias";
import {
  IconFile,
  IconLink,
  IconDoc,
  IconAta,
  IconImage,
  IconPin,
} from "@/components/icons";
import { tempoRelativo } from "@/lib/tempo";
import {
  useRecursosLista,
  isFavorito,
  isFixado,
  toggleFavorito,
  toggleFixado,
  getFavoritoAt,
} from "@/lib/recursos-store";
import { useCardsState } from "@/lib/cards-store";
import { useMembros, membroPorId } from "@/lib/membros-store";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import type { Recurso, Atividade } from "@/types";
import { useIdeias } from "@/lib/ideias-store";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Início — Hub" },
      { name: "description", content: "Continuar de onde você parou." },
    ],
  }),
  component: InicioPage,
});

function iconePorRecurso(r: Recurso) {
  if (r.rotulo === "Ata") return <IconAta size={20} />;
  if (r.tipo === "link") return <IconLink size={20} />;
  if (r.tipo === "imagem") return <IconImage size={20} />;
  return <IconFile size={20} />;
}


function InicioPage() {
  const [modalAtividadesAberta, setModalAtividadesAberta] = useState(false);
  const recursosStore = useRecursosLista();
  const cardsStore = useCardsState();
  const cats = useCategorias();
  const membrosLista = useMembros();
  const ideiasLista = useIdeias();
  const { user } = useAuth();
  
  const nomeUsuario = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const minhasTasks = cardsStore.filter(c => !c.arquivado && c.coluna !== "validado" && (c.responsaveisIds?.includes(user?.id || '') || c.responsavelId === user?.id));

  // Recursos com overlay do estado do store (fixados e favoritos)
  const recursosProcessados = useMemo(
    () =>
      recursosStore.map((r) => {
        const userId = user?.id || '';
        const eraFav = r.favoritoPor?.includes(userId) ?? false;
        const efetFav = isFavorito(r.id, eraFav, userId);
        const favArray = (() => {
          if (efetFav === eraFav) return r.favoritoPor ?? [];
          if (efetFav) return [...(r.favoritoPor ?? []), userId];
          return (r.favoritoPor ?? []).filter((x) => x !== userId);
        })();
        return {
          ...r,
          fixado: isFixado(r.id, r.fixado),
          favoritoPor: favArray,
        };
      }),
    [recursosStore, user?.id],
  );

  // Todos os recursos fixados do Acervo
  const recursosFixados = useMemo(
    () => recursosProcessados.filter((r) => r.fixado),
    [recursosProcessados],
  );

  const cardsFazendo = cardsStore.filter((c) => c.coluna === "fazendo").length;

  type AtalhoCard = {
    id: string;
    icone: React.ReactNode;
    rotulo: string;
    titulo: string;
    meta: string;
    to: string;
    categoriaId?: string;
    search?: Record<string, unknown>;
    recurso?: Recurso;
  };

  // Lista de atalhos incluindo o Sprint Atual + todos os Recursos Fixados
  const atalhosCards = useMemo<AtalhoCard[]>(() => {
    return [
      {
        id: "sprint-kanban",
        icone: <KanbanSquare size={22} strokeWidth={1.75} />,
        rotulo: "Sprint atual",
        titulo:
          cardsFazendo > 0
            ? `${cardsFazendo} ${cardsFazendo === 1 ? "card" : "cards"} em Fazendo`
            : "Nada em Fazendo",
        meta: "Quadro Kanban",
        to: "/kanban",
      },
      ...recursosFixados.map((r) => ({
        id: r.id,
        icone: iconePorRecurso(r),
        categoriaId: r.categoria,
        rotulo: r.rotulo || r.categoria || "Fixado",
        titulo: r.titulo,
        meta: `atualizado ${tempoRelativo(r.atualizadoEm)}`,
        to: "/acervo",
        search: { id: r.id },
        recurso: r,
      })),
    ];
  }, [cardsFazendo, recursosFixados]);

  // Classe responsiva do grid para adaptar o tamanho dos cards até 5 por linha
  const gridColsClass = useMemo(() => {
    const count = atalhosCards.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
    if (count === 4)
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }, [atalhosCards.length]);

  // Favoritos do usuário logado, ordenados pelos mais recentemente favoritados/atualizados
  const todosFavoritos: Recurso[] = useMemo(() => {
    return recursosProcessados
      .filter((r) => r.favoritoPor?.includes(user?.id || ''))
      .sort((a, b) => {
        const timeA =
          getFavoritoAt(a.id) ??
          new Date(a.atualizadoEm).getTime();
        const timeB =
          getFavoritoAt(b.id) ??
          new Date(b.atualizadoEm).getTime();
        return timeB - timeA;
      });
  }, [recursosProcessados, user?.id]);

  const favoritos = useMemo(() => todosFavoritos.slice(0, 5), [todosFavoritos]);

  const atividadeRecente = useMemo<Atividade[]>(() => {
    const atividades: Atividade[] = [];
    
    recursosProcessados.forEach(r => {
      atividades.push({
        id: `rec-${r.id}`,
        autorId: r.autorId,
        verbo: "adicionou",
        alvoTipo: "recurso",
        alvoId: r.id,
        alvoTitulo: r.titulo,
        em: r.atualizadoEm || r.criadoEm || new Date().toISOString()
      });
    });

    cardsStore.forEach(c => {
      atividades.push({
        id: `card-${c.id}`,
        autorId: c.autorId,
        verbo: "criou",
        alvoTipo: "card",
        alvoId: c.id,
        alvoTitulo: c.titulo,
        em: c.atualizadoEm || c.criadoEm || new Date().toISOString()
      });
    });

    ideiasLista.forEach(i => {
      atividades.push({
        id: `ideia-${i.id}`,
        autorId: i.autorId,
        verbo: "criou",
        alvoTipo: "ideia",
        alvoId: i.id,
        alvoTitulo: i.titulo,
        em: i.criadaEm || new Date().toISOString()
      });
    });

    return atividades.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime());
  }, [recursosProcessados, cardsStore, ideiasLista]);

  return (
    <div className="space-y-12">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Início</p>
          <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            Bem-vindo(a) de volta, {nomeUsuario}.
          </h1>
          <p className="mt-1 text-[13px] text-ink-faint">
            Você tem <strong>{minhasTasks.length}</strong> {minhasTasks.length === 1 ? 'task' : 'tasks'} para a Sprint atual.
          </p>
        </div>
      </header>

      {/* Atalhos & Recursos Fixados */}
      <section>
        <div className="flex items-center justify-between">
          <p className="eyebrow inline-flex items-center gap-2">
            <span className="dot-neon" aria-hidden="true" />
            Atalhos ({atalhosCards.length})
          </p>
          <Link
            to="/acervo"
            className="meta-11 text-ink-faint hover:text-ink transition-colors"
          >
            Gerenciar no Acervo ({recursosFixados.length}{" "}
            {recursosFixados.length === 1 ? "fixado" : "fixados"})
          </Link>
        </div>

        <div className={cn("mt-3 grid gap-3", gridColsClass)}>
          {atalhosCards.map((item) => (
            <ContinuarCard
              key={item.id}
              icone={item.icone}
              rotulo={item.rotulo}
              categoriaId={item.categoriaId}
              titulo={item.titulo}
              meta={item.meta}
              to={item.to}
              search={item.search}
              isSprint={item.id === "sprint-kanban"}
              sprintCount={cardsFazendo}
              onUnpin={
                item.recurso
                  ? () => toggleFixado(item.recurso!.id, item.recurso!.fixado)
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Favoritos */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">Favoritos</p>
          <Link
            to="/acervo"
            search={{ fav: 1 } as never}
            className="meta-11 text-ink-faint hover:text-ink"
          >
            Ver todos ({todosFavoritos.length})
          </Link>
        </div>
        {favoritos.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">
            Nada favoritado ainda.
          </p>
        ) : (
          <ul className="stagger mt-3 divide-y divide-line rounded-[10px] border border-line bg-canvas">
            {favoritos.map((r, idx) => {
              const autor = membroPorId(r.autorId);
              const nomeCat = cats.find((c) => c.id === r.categoria)?.nome ?? r.categoria;
              return (
              <li key={r.id}>
                <div className="group flex h-10 items-center gap-3 px-3 hover:bg-raise">
                  <Link
                    to="/acervo"
                    search={{ id: r.id } as never}
                    className="flex flex-1 items-center gap-3 min-w-0"
                  >
                    <span className="text-ink-faint shrink-0">
                      {iconePorRecurso(r)}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="truncate text-[13px] text-ink group-hover:text-gold-ink transition-colors">
                        {r.titulo}
                      </span>
                      <div className="flex items-center gap-1.5 meta-11 text-ink-muted shrink-0">
                        <Tag tone="tipo" tipo={r.tipo} pill className="text-[9px] py-0.5 uppercase">
                          {r.tipo}
                        </Tag>
                        {r.rotulo && (
                          <Tag tone="rotulo" rotuloId={r.rotulo} pill className="text-[9px] py-0.5 uppercase">
                            {r.rotulo}
                          </Tag>
                        )}
                        <Tag tone="categoria" categoria={r.categoria} pill className="text-[9px] py-0.5 uppercase">
                          {nomeCat}
                        </Tag>
                        <span className="w-[3px] h-[3px] rounded-full bg-line-strong mx-0.5" />
                        <span>{autor?.nome}</span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorito(r.id, r.favoritoPor?.includes("m-rafa") ?? false, "m-rafa");
                    }}
                    title="Remover dos favoritos"
                    className="star-twinkle inline-flex text-gold hover:text-gold/80 p-1 shrink-0"
                    aria-label="Remover dos favoritos"
                  >
                    <Star size={14} strokeWidth={1.75} fill="currentColor" />
                  </button>
                  <Link
                    to="/acervo"
                    search={{ id: r.id } as never}
                    className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 shrink-0"
                  >
                    <ChevronRight size={16} strokeWidth={1.75} />
                  </Link>
                </div>
              </li>
            )})}
          </ul>
        )}
      </section>

      {/* Atividade */}
      <section>
        <p className="eyebrow">Atividade</p>
        {atividadeRecente.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">Sem atividade.</p>
        ) : (
          <ul className="stagger mt-3 divide-y divide-line rounded-[10px] border border-line bg-canvas">
            {atividadeRecente.map((a) => {
              const autor = membroPorId(a.autorId);
              return (
                <li key={a.id}>
                  <Link
                    to={
                      a.alvoTipo === "recurso"
                        ? "/acervo"
                        : a.alvoTipo === "ideia"
                          ? "/ideias"
                          : "/kanban"
                    }
                    search={
                      (a.alvoTipo === "recurso" || a.alvoTipo === "ideia"
                        ? { id: a.alvoId }
                        : undefined) as never
                    }
                    className="group flex h-10 items-center gap-3 px-3 hover:bg-raise transition-colors duration-150"
                  >
                    <Avatar membro={autor} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      <span className="text-ink">
                        {autor.nome.split(" ")[0]}
                      </span>{" "}
                      <span className="text-ink-muted">
                        {a.verbo}{" "}
                        {a.alvoTipo === "card"
                          ? "card"
                          : a.alvoTipo === "ideia"
                            ? "ideia"
                            : "recurso"}{" "}
                      </span>
                      <span className="font-medium text-ink group-hover:text-gold-ink dark:group-hover:text-gold transition-colors">
                        {a.alvoTitulo}
                      </span>
                      {a.detalhe ? (
                        <span className="text-ink-muted"> {a.detalhe}</span>
                      ) : null}
                    </span>
                    <span
                      className="meta-11 shrink-0 text-ink-faint"
                      title={a.em}
                    >
                      {tempoRelativo(a.em)}
                    </span>
                    <span className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
                      <ChevronRight size={16} strokeWidth={1.75} />
                    </span>
                  </Link>
                </li>
              );
            })}
            <li key="ver-tudo">
              <button
                type="button"
                onClick={() => setModalAtividadesAberta(true)}
                className="group flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-raise hover:text-ink"
              >
                Ver tudo
                <span className="text-ink-faint transition-transform group-hover:translate-x-0.5">
                  <ChevronRight size={14} strokeWidth={1.75} />
                </span>
              </button>
            </li>
          </ul>
        )}
      </section>

      <Modal
        open={modalAtividadesAberta}
        onClose={() => setModalAtividadesAberta(false)}
        titulo="Atividades Registradas"
        descricao="Histórico de todas as ações recentes no HUB Maisa."
        width={600}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ul className="divide-y divide-line">
            <li className="py-2.5 text-ink-muted text-sm text-center">Nenhuma atividade recente.</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function ContinuarCard({
  icone,
  rotulo,
  titulo,
  meta,
  to,
  search,
  onUnpin,
  categoriaId,
  isSprint,
  sprintCount,
}: {
  icone: React.ReactNode;
  rotulo: string;
  titulo: string;
  meta: string;
  to: string;
  search?: Record<string, unknown>;
  onUnpin?: () => void;
  categoriaId?: string;
  isSprint?: boolean;
  sprintCount?: number;
}) {
  const nomeCat = useNomeCategoria(categoriaId ?? "");

  return (
    <div className="card-hover press group relative flex flex-col justify-between rounded-[12px] border border-line bg-canvas p-4 hover:border-line-strong hover:bg-raise transition-all min-w-0 shadow-2xs">
      <Link
        to={to as never}
        search={search as never}
        className="flex flex-col justify-between h-full min-w-0 gap-3"
      >
        <div className="flex items-center justify-between gap-2 pr-6">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-line bg-raise text-ink shadow-2xs"
          >
            {icone}
          </span>
        </div>
        {isSprint ? (
          <div className="flex flex-col gap-0.5 pt-1 mt-auto">
            <span className="text-[38px] font-black leading-none tracking-tighter text-ink group-hover:text-gold-ink transition-colors">
              {sprintCount}
            </span>
            <p className="text-[13px] font-medium text-ink-muted leading-tight">
              {sprintCount === 1 ? "card fazendo" : "cards fazendo"}
            </p>
          </div>
        ) : (
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink group-hover:text-navy transition-colors pt-1">
            {titulo}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between gap-2 min-w-0 pt-2 border-t border-line/50">
          <p className="meta text-[11.5px] text-ink-faint truncate">{meta}</p>
          {rotulo ? (
            <Tag
              tone="rotulo"
              pill
              className="uppercase shrink-0 max-w-[110px] truncate text-[10.5px]"
            >
              {rotulo}
            </Tag>
          ) : categoriaId ? (
            <Tag
              tone="categoria"
              categoria={categoriaId}
              pill
              className="uppercase shrink-0 max-w-[110px] truncate text-[10.5px]"
            >
              {nomeCat}
            </Tag>
          ) : null}
        </div>
      </Link>

      {onUnpin ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUnpin();
          }}
          title="Desafixar do Início"
          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-[5px] text-gold hover:bg-line/30 transition-all cursor-pointer"
        >
          <IconPin size={15} filled={true} />
        </button>
      ) : null}
    </div>
  );
}
