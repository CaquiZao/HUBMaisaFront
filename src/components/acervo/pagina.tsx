import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { recursos as recursosBase, membros } from "@/mocks";
import type { Recurso, TipoRecurso } from "@/types";
import {
  Button,
  Tag,
  Avatar,
  Modal,
  Dropdown,
  Input,
  Textarea,
  Label,
  EmptyState,
  useToast,
  type DropdownItem,
} from "@/components/ui";
import {
  IconFile,
  IconLink,
  IconDoc,
  IconAta,
  IconClose,
  IconPlus,
  IconExternal,
  IconChevronRight,
  IconImage,
  IconPin,
} from "@/components/icons";
import { Star } from "lucide-react";
import { tempoRelativo, dataCurta } from "@/lib/tempo";
import { useCategorias, encontrar as encontrarCategoria } from "@/lib/categorias";
import {
  useRecursosState,
  toggleFixado,
  toggleFavorito,
  isFixado,
  isFavorito,
} from "@/lib/recursos-store";

export type SubAcervo = "todos" | "atas" | "mural";

const TIPOS: TipoRecurso[] = ["arquivo", "link", "imagem"];
const ROTULOS_SUGERIDOS = ["Doc", "PRD", "Ata", "Post-mortem", "Guia", "ADR", "Runbook"];

function rotuloTipo(t: TipoRecurso) {
  if (t === "arquivo") return "Arquivo";
  if (t === "link") return "Link";
  return "Imagem";
}

function iconePorRecurso(r: Recurso, className?: string) {
  if (r.rotulo === "Ata") return <IconAta className={className} />;
  if (r.tipo === "link") return <IconLink className={className} />;
  if (r.tipo === "imagem") return <IconImage className={className} />;
  if (r.corpo) return <IconDoc className={className} />;
  return <IconFile className={className} />;
}

function membroPorId(id: string) {
  return membros.find((m) => m.id === id) ?? membros[0];
}

function tamanhoHumano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SearchState = {
  tipo?: TipoRecurso;
  cat?: string;
  rot?: string;
  fav?: 0 | 1;
  sort?: "recente" | "titulo";
  id?: string;
};

export function PaginaAcervo({
  sub,
  sp,
  rota,
}: {
  sub: SubAcervo;
  sp: SearchState;
  rota: "/acervo" | "/acervo/atas" | "/acervo/mural";
}) {
  const navigate = useNavigate();
  const [novoAberto, setNovoAberto] = useState(false);
  const [recursosLocais, setRecursosLocais] = useState<Recurso[]>(recursosBase);
  const estadoStore = useRecursosState();
  const categorias = useCategorias();

  // Recursos com overlay de fixado/favorito
  const recursos = useMemo(
    () =>
      recursosLocais.map((r) => ({
        ...r,
        fixado: isFixado(r.id, r.fixado, estadoStore),
        favoritoPor: (() => {
          const eraFav = r.favoritoPor.includes("m-rafa");
          const efet = isFavorito(r.id, eraFav, estadoStore);
          if (efet === eraFav) return r.favoritoPor;
          if (efet) return [...r.favoritoPor, "m-rafa"];
          return r.favoritoPor.filter((x) => x !== "m-rafa");
        })(),
      })),
    [recursosLocais, estadoStore],
  );

  const filtrados = useMemo(() => {
    let list = [...recursos];

    // Restrições por sub-rota
    if (sub === "atas") list = list.filter((r) => r.rotulo === "Ata");
    if (sub === "mural") list = list.filter((r) => r.tipo === "imagem");

    if (sub !== "mural" && sp.tipo) list = list.filter((r) => r.tipo === sp.tipo);
    if (sub === "todos" && sp.rot) list = list.filter((r) => r.rotulo === sp.rot);
    if (sp.cat) list = list.filter((r) => r.categoria === sp.cat);
    if (sp.fav === 1) list = list.filter((r) => r.favoritoPor.includes("m-rafa"));

    if (sp.sort === "titulo") {
      list.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.atualizadoEm).getTime() -
          new Date(a.atualizadoEm).getTime(),
      );
      list.sort((a, b) => Number(b.fixado) - Number(a.fixado));
    }
    return list;
  }, [recursos, sub, sp.tipo, sp.rot, sp.cat, sp.fav, sp.sort]);

  const selecionado = sp.id ? recursos.find((r) => r.id === sp.id) ?? null : null;

  const temFiltro = !!(sp.tipo || sp.cat || sp.rot || sp.fav);

  function setSearch(next: Partial<SearchState>) {
    navigate({
      to: rota,
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }) as never,
    });
  }
  function limparFiltros() {
    navigate({ to: rota, search: { id: sp.id } as never });
  }
  function abrir(id: string) {
    setSearch({ id });
  }
  function fecharPainel() {
    navigate({
      to: rota,
      search: (prev: Record<string, unknown>) => {
        const { id: _drop, ...rest } = prev;
        void _drop;
        return rest as never;
      },
    });
  }

  const rotulosExistentes = useMemo(() => {
    const s = new Set<string>();
    for (const r of recursosLocais) if (r.rotulo) s.add(r.rotulo);
    return [...s].sort();
  }, [recursosLocais]);

  return (
    <div>
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            {filtrados.length}{" "}
            <span className="text-ink-muted">
              {filtrados.length === 1 ? "recurso" : "recursos"}
            </span>
          </h1>
        </div>
        <Button variant="primary" onClick={() => setNovoAberto(true)}>
          <IconPlus />
          Adicionar
        </Button>
      </header>

      {/* Barra de filtros */}
      <div className="sticky top-0 z-10 -mx-8 mt-6 border-b border-line bg-canvas/95 px-8 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          {sub !== "mural" ? (
            <FiltroDropdown
              rotulo="Tipo"
              valor={sp.tipo ? rotuloTipo(sp.tipo) : null}
              itens={[
                {
                  tipo: "item",
                  label: "Todos",
                  onSelect: () => setSearch({ tipo: undefined }),
                },
                { tipo: "separador" },
                ...TIPOS.map<DropdownItem>((t) => ({
                  tipo: "item",
                  label: rotuloTipo(t),
                  onSelect: () => setSearch({ tipo: t }),
                })),
              ]}
            />
          ) : null}

          {sub === "todos" ? (
            <FiltroDropdown
              rotulo="Rótulo"
              valor={sp.rot ?? null}
              itens={[
                {
                  tipo: "item",
                  label: "Todos",
                  onSelect: () => setSearch({ rot: undefined }),
                },
                { tipo: "separador" },
                ...rotulosExistentes.map<DropdownItem>((r) => ({
                  tipo: "item",
                  label: r,
                  onSelect: () => setSearch({ rot: r }),
                })),
              ]}
            />
          ) : null}

          <FiltroDropdown
            rotulo="Categoria"
            valor={
              sp.cat ? categorias.find((c) => c.id === sp.cat)?.nome ?? sp.cat : null
            }
            itens={[
              {
                tipo: "item",
                label: "Todas",
                onSelect: () => setSearch({ cat: undefined }),
              },
              { tipo: "separador" },
              ...categorias.map<DropdownItem>((c) => ({
                tipo: "item",
                label: c.nome,
                onSelect: () => setSearch({ cat: c.id }),
              })),
            ]}
          />

          <button
            onClick={() => setSearch({ fav: sp.fav === 1 ? undefined : 1 })}
            className={
              "press inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2.5 text-[13px] transition-colors " +
              (sp.fav === 1
                ? "border-gold bg-gold-wash text-gold-ink"
                : "border-line text-ink hover:bg-raise")
            }
            aria-pressed={sp.fav === 1}
          >
            Favoritos
          </button>
          <div className="ml-auto">
            <FiltroDropdown
              rotulo="Ordenar"
              valor={sp.sort === "titulo" ? "Título" : "Recentes"}
              align="end"
              itens={[
                {
                  tipo: "item",
                  label: "Mais recentes",
                  onSelect: () => setSearch({ sort: undefined }),
                },
                {
                  tipo: "item",
                  label: "Título A–Z",
                  onSelect: () => setSearch({ sort: "titulo" }),
                },
              ]}
            />
          </div>
          {temFiltro ? (
            <button
              onClick={limparFiltros}
              className="meta-11 text-ink-faint hover:text-ink"
            >
              limpar
            </button>
          ) : null}
        </div>
      </div>

      {/* Conteúdo + painel */}
      <div
        className="mt-4 grid gap-6"
        style={{ gridTemplateColumns: selecionado ? "minmax(0,1fr) 480px" : "1fr" }}
      >
        <div className="min-w-0">
          {filtrados.length === 0 ? (
            <div className="mt-16">
              {temFiltro ? (
                <EmptyState
                  titulo="Nada com esses filtros."
                  descricao="Ajuste ou limpe para ver mais."
                  acao={
                    <Button variant="secondary" onClick={limparFiltros}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  titulo="Nenhum recurso ainda."
                  descricao="Adicione o primeiro arquivo, link ou imagem."
                  acao={
                    <Button
                      variant="primary"
                      onClick={() => setNovoAberto(true)}
                    >
                      <IconPlus /> Adicionar
                    </Button>
                  }
                />
              )}
            </div>
          ) : sub === "mural" ? (
            <MuralAcervo
              itens={filtrados}
              ativoId={sp.id}
              onAbrir={abrir}
            />
          ) : (
            <ul
              role="list"
              className="stagger overflow-hidden rounded-[10px] border border-line bg-canvas"
            >
              {filtrados.map((r) => (
                <RecursoRow
                  key={r.id}
                  r={r}
                  ativo={r.id === sp.id}
                  onAbrir={() => abrir(r.id)}
                  onFixar={() => toggleFixado(r.id, r.fixado)}
                  onFavoritar={() => toggleFavorito(r.id, r.favoritoPor.includes("m-rafa"))}
                />
              ))}
            </ul>
          )}
        </div>

        {selecionado ? (
          <PainelLateral
            r={selecionado}
            onFechar={fecharPainel}
            onFavoritar={() =>
              toggleFavorito(selecionado.id, selecionado.favoritoPor.includes("m-rafa"))
            }
            onFixar={() => toggleFixado(selecionado.id, selecionado.fixado)}
          />
        ) : null}
      </div>

      <ModalAdicionar
        open={novoAberto}
        onClose={() => setNovoAberto(false)}
        sub={sub}
        rotulosSugeridos={[...new Set([...ROTULOS_SUGERIDOS, ...rotulosExistentes])]}
        onCriar={(r) => {
          setRecursosLocais((atual) => [r, ...atual]);
          setNovoAberto(false);
          abrir(r.id);
        }}
      />
    </div>
  );
}

function FiltroDropdown({
  rotulo,
  valor,
  itens,
  align,
}: {
  rotulo: string;
  valor: string | null;
  itens: DropdownItem[];
  align?: "start" | "end";
}) {
  return (
    <Dropdown
      align={align}
      trigger={
        <button
          className={
            "inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line px-2.5 text-[13px] text-ink hover:bg-raise"
          }
        >
          <span className="text-ink-faint">{rotulo}</span>
          {valor ? <span>{valor}</span> : <span className="text-ink-muted">todos</span>}
        </button>
      }
      itens={itens}
    />
  );
}

function RecursoRow({
  r,
  ativo,
  onAbrir,
  onFixar,
  onFavoritar,
}: {
  r: Recurso;
  ativo: boolean;
  onAbrir: () => void;
  onFixar: () => void;
  onFavoritar: () => void;
}) {
  const autor = membroPorId(r.autorId);
  const catNome = encontrarCategoria(r.categoria)?.nome ?? r.categoria;
  const favorito = r.favoritoPor.includes("m-rafa");
  return (
    <li>
      <div
        className={
          "press group flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 " +
          "hover:bg-raise transition-colors " +
          (ativo ? "bg-raise" : "")
        }
      >
        <button
          type="button"
          onClick={onFixar}
          aria-pressed={r.fixado}
          aria-label={r.fixado ? "Desfixar" : "Fixar"}
          className={
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] " +
            (r.fixado
              ? "text-gold"
              : "text-ink-faint opacity-0 hover:bg-canvas group-hover:opacity-100")
          }
        >
          <IconPin />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFavoritar();
          }}
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
          className={
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] transition-colors " +
            (favorito
              ? "text-gold"
              : "text-ink-faint opacity-0 hover:bg-canvas group-hover:opacity-100")
          }
        >
          <span className={favorito ? "star-twinkle inline-flex" : "inline-flex"}>
            <Star
              size={14}
              strokeWidth={1.75}
              fill={favorito ? "currentColor" : "none"}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={onAbrir}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="text-ink-faint">{iconePorRecurso(r)}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {r.fixado ? (
                <Tag tone="fixado" pill className="uppercase">
                  Fixado
                </Tag>
              ) : null}
              <span className="truncate text-[13px] text-ink">{r.titulo}</span>
            </span>
          </span>
          <span className="hidden items-center gap-1 md:inline-flex">
            {r.rotulo ? (
              <Tag tone="rotulo" pill className="uppercase">
                {r.rotulo}
              </Tag>
            ) : null}
            <Tag tone="tipo" tipo={r.tipo} pill className="uppercase">
              {rotuloTipo(r.tipo)}
            </Tag>
            <Tag tone="categoria" categoria={r.categoria} pill className="uppercase">
              {catNome}
            </Tag>
            {r.tags.slice(0, 2).map((t) => (
              <Tag key={t} tone="hash" pill>
                #{t}
              </Tag>
            ))}
          </span>
          <Avatar membro={autor} size={20} />
          <span
            className="meta-11 w-20 shrink-0 whitespace-nowrap text-right text-ink-faint"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dataCurta(r.atualizadoEm)}
          </span>
          <span className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
            <IconChevronRight />
          </span>
        </button>
      </div>
    </li>
  );
}


function MuralAcervo({
  itens,
  ativoId,
  onAbrir,
}: {
  itens: Recurso[];
  ativoId?: string;
  onAbrir: (id: string) => void;
}) {
  return (
    <div className="stagger [column-fill:_balance] columns-2 gap-3 md:columns-3 xl:columns-4">
      {itens.map((r) => (
        <MuralCard
          key={r.id}
          r={r}
          ativo={r.id === ativoId}
          onAbrir={() => onAbrir(r.id)}
        />
      ))}
    </div>
  );
}

function MuralCard({
  r,
  ativo,
  onAbrir,
}: {
  r: Recurso;
  ativo: boolean;
  onAbrir: () => void;
}) {
  const img = r.imagem;
  const autor = membroPorId(r.autorId);
  const razao =
    img && img.largura && img.altura ? `${img.largura} / ${img.altura}` : "3 / 4";
  const favoritoConta = r.favoritoPor.length;

  return (
    <button
      type="button"
      onClick={onAbrir}
      className={
        "card-hover press group relative mb-3 block w-full overflow-hidden rounded-[10px] bg-raise text-left break-inside-avoid " +
        (ativo ? "ring-2 ring-gold ring-offset-2 ring-offset-canvas" : "")
      }
      aria-label={`Abrir ${r.titulo}`}
    >
      {img ? (
        <img
          src={img.url}
          alt={img.alt ?? r.titulo}
          loading="lazy"
          style={{ aspectRatio: razao }}
          className="block h-auto w-full object-cover"
        />
      ) : (
        <div
          className="flex items-center justify-center bg-raise text-ink-faint"
          style={{ aspectRatio: razao }}
        >
          <IconImage />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
        {r.fixado ? (
          <Tag tone="fixado" pill className="uppercase shadow-float">
            Fixado
          </Tag>
        ) : (
          <span />
        )}
        {favoritoConta > 0 ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-canvas/90 px-1.5 py-[1px] backdrop-blur-sm"
            aria-label={`${favoritoConta} favoritos`}
          >
            <span className="star-twinkle inline-flex text-gold">
              <Star size={11} strokeWidth={1.75} fill="currentColor" />
            </span>
            <span className="meta-11 text-ink">{favoritoConta}</span>
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-navy/85 p-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <p className="line-clamp-2 text-[13px] font-medium leading-4 text-[#F2F4F8]">
          {r.titulo}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Tag tone="categoria" categoria={r.categoria} pill className="uppercase">
            {encontrarCategoria(r.categoria)?.nome ?? r.categoria}
          </Tag>
          <span className="meta-11 text-[#C9CFDA]">
            {autor.nome.split(" ")[0]} · {dataCurta(r.atualizadoEm)}
          </span>
        </div>
      </div>
    </button>
  );
}

function PainelLateral({
  r,
  onFechar,
  onFavoritar,
  onFixar,
}: {
  r: Recurso;
  onFechar: () => void;
  onFavoritar: () => void;
  onFixar: () => void;
}) {
  const autor = membroPorId(r.autorId);
  const favorito = r.favoritoPor.includes("m-rafa");
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={r.id}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
        className="sticky top-24 h-fit min-w-0 rounded-[10px] border border-line bg-canvas"
        aria-label={`Detalhes de ${r.titulo}`}
      >
        <header className="flex items-start gap-2 border-b border-line px-4 py-3">
          <span className="mt-0.5 text-ink-faint">{iconePorRecurso(r)}</span>
          <div className="min-w-0 flex-1">
            <p className="meta text-ink-faint">
              {r.rotulo ? `${r.rotulo} · ` : ""}
              {rotuloTipo(r.tipo)}
            </p>
            <h2 className="mt-0.5 text-[14px] font-medium leading-5 text-ink">
              {r.titulo}
            </h2>
          </div>
          <button
            onClick={onFixar}
            aria-pressed={r.fixado}
            aria-label={r.fixado ? "Desfixar" : "Fixar"}
            className={
              "inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-line " +
              (r.fixado
                ? "border-gold bg-gold-wash text-gold"
                : "text-ink-faint hover:bg-raise")
            }
          >
            <IconPin />
          </button>
          <button
            onClick={onFavoritar}
            aria-pressed={favorito}
            aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
            className={
              "inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-line " +
              (favorito
                ? "border-gold bg-gold-wash text-gold-ink"
                : "text-ink-faint hover:bg-raise")
            }
          >
            <span className="text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
              ★
            </span>
          </button>
          <button
            onClick={onFechar}
            aria-label="Fechar painel"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-faint hover:bg-raise"
          >
            <IconClose />
          </button>
        </header>

        <PainelAbas key={r.id} r={r} autor={autor} />
      </motion.aside>
    </AnimatePresence>
  );
}

type AbaId = "detalhes" | "preview";
const DURACAO_TRANSICAO_MS = 160;

function usePrefereReducirMovimento() {
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzir(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduzir(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduzir;
}

function PainelAbas({
  r,
  autor,
}: {
  r: Recurso;
  autor: ReturnType<typeof membroPorId>;
}) {
  const temPreview =
    (r.rotulo === "Ata" && !!r.ata) ||
    (r.tipo === "link" && !!r.url) ||
    (r.tipo === "arquivo" && (!!r.arquivo || !!r.corpo)) ||
    (r.tipo === "imagem" && !!r.imagem);

  const abas: { id: AbaId; rotulo: string; disabled?: boolean }[] = [
    { id: "detalhes", rotulo: "Detalhes" },
    { id: "preview", rotulo: "Preview", disabled: !temPreview },
  ];
  const [aba, setAba] = useState<AbaId>("detalhes");
  const reduzir = usePrefereReducirMovimento();
  const [carregando, setCarregando] = useState(!reduzir);
  useEffect(() => {
    if (reduzir) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const t = window.setTimeout(() => setCarregando(false), DURACAO_TRANSICAO_MS);
    return () => window.clearTimeout(t);
  }, [aba, reduzir]);
  const duracao = reduzir ? 0 : DURACAO_TRANSICAO_MS / 1000;

  return (
    <>
      <div
        role="tablist"
        aria-label="Seções do recurso"
        className="relative flex items-center gap-1 border-b border-line px-2"
      >
        {abas.map((a) => {
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              type="button"
              aria-selected={ativo}
              aria-controls={`painel-${a.id}`}
              tabIndex={ativo ? 0 : -1}
              disabled={a.disabled}
              onClick={() => setAba(a.id)}
              className={
                "press relative inline-flex h-9 items-center px-2.5 text-[13px] transition-colors " +
                (a.disabled
                  ? "cursor-not-allowed text-ink-faint/60"
                  : ativo
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink")
              }
            >
              {a.rotulo}
              {ativo ? (
                <motion.span
                  layoutId={`aba-indicador-${r.id}`}
                  className="absolute inset-x-1.5 -bottom-px h-0.5 bg-gold"
                  transition={
                    reduzir
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }
                  }
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={carregando ? `${aba}-skel` : aba}
            id={`painel-${aba}`}
            role="tabpanel"
            aria-busy={carregando || undefined}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: duracao, ease: [0.2, 0, 0, 1] }}
            data-motion="fade"
            className="px-4 py-4"
          >
            {carregando ? (
              <SkeletonAba aba={aba} />
            ) : aba === "detalhes" ? (
              <AbaDetalhes r={r} autor={autor} />
            ) : (
              <AbaPreview r={r} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function SkeletonAba({ aba }: { aba: AbaId }) {
  if (aba === "detalhes") {
    return (
      <div aria-hidden="true">
        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2">
          <div className="skeleton h-3 w-14" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-3 w-10" />
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="space-y-2">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-20 w-full" />
      <div className="skeleton h-3 w-1/2" />
    </div>
  );
}

function AbaDetalhes({
  r,
  autor,
}: {
  r: Recurso;
  autor: ReturnType<typeof membroPorId>;
}) {
  const catNome = encontrarCategoria(r.categoria)?.nome ?? r.categoria;
  return (
    <>
      <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 text-[13px]">
        <dt className="meta text-ink-faint">Tipo</dt>
        <dd>
          <Tag tone="tipo" tipo={r.tipo} pill className="uppercase">
            {rotuloTipo(r.tipo)}
          </Tag>
        </dd>
        {r.rotulo ? (
          <>
            <dt className="meta text-ink-faint">Rótulo</dt>
            <dd>
              <Tag tone="rotulo" pill className="uppercase">
                {r.rotulo}
              </Tag>
            </dd>
          </>
        ) : null}
        <dt className="meta text-ink-faint">Categoria</dt>
        <dd>
          <Tag tone="categoria" categoria={r.categoria} pill className="uppercase">
            {catNome}
          </Tag>
        </dd>
        <dt className="meta text-ink-faint">Autor</dt>
        <dd className="flex items-center gap-2">
          <Avatar membro={autor} size={18} />
          <span className="text-ink">{autor.nome}</span>
        </dd>
        <dt className="meta text-ink-faint">Atualizado</dt>
        <dd className="meta text-ink">{dataCurta(r.atualizadoEm)}</dd>
        {r.tags.length > 0 ? (
          <>
            <dt className="meta text-ink-faint">Tags</dt>
            <dd className="flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <Tag key={t} tone="hash" pill>
                  #{t}
                </Tag>
              ))}
            </dd>
          </>
        ) : null}
      </dl>
      {r.descricao ? (
        <p className="mt-4 text-[13px] leading-5 text-ink">{r.descricao}</p>
      ) : null}
      <p className="meta-11 mt-4 text-ink-faint">criado {tempoRelativo(r.criadoEm)}</p>
    </>
  );
}

function AbaPreview({ r }: { r: Recurso }) {
  if (r.rotulo === "Ata" && r.ata) {
    return (
      <div className="rounded-[6px] border border-line p-3">
        <p className="meta text-ink-faint">
          Ata de{" "}
          <span className="text-ink" style={{ fontFamily: "var(--font-mono)" }}>
            {r.ata.data}
          </span>
        </p>
        <p className="meta mt-2 text-ink-faint">Participantes</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {r.ata.participantes.map((id) => {
            const m = membroPorId(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-[1px]"
              >
                <Avatar membro={m} size={18} />
                <span className="meta text-ink">{m.nome.split(" ")[0]}</span>
              </span>
            );
          })}
        </div>
        <p className="meta mt-3 text-ink-faint">Decisões</p>
        <ul className="mt-1 space-y-1 text-[13px] text-ink">
          {r.ata.decisoes.map((d, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-ink-faint">—</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (r.tipo === "link" && r.url) {
    return (
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2.5 py-1.5 text-[13px] text-ink hover:bg-raise"
      >
        <IconExternal /> Abrir link
        <span className="meta text-ink-faint">{new URL(r.url).hostname}</span>
      </a>
    );
  }
  if (r.tipo === "imagem" && r.imagem) {
    const img = r.imagem;
    const src = img.dataUrl ?? img.url;
    const podeBaixar = !!img.dataUrl || sameOrigem(img.url);
    const nomeDownload = `${slugify(r.titulo || "imagem")}.${extDeMime(img.dataUrl) ?? "png"}`;
    return (
      <div className="overflow-hidden rounded-[6px] border border-line bg-raise">
        <img
          src={src}
          alt={img.alt ?? r.titulo}
          className="block h-auto w-full object-contain"
          style={
            img.largura && img.altura
              ? { aspectRatio: `${img.largura} / ${img.altura}` }
              : undefined
          }
        />
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5">
          <span className="meta-11 text-ink-faint">
            {img.largura && img.altura ? `${img.largura} × ${img.altura}` : "Imagem"}
          </span>
          {podeBaixar ? (
            <a
              href={src}
              download={nomeDownload}
              className="meta-11 rounded-[4px] border border-line px-2 py-1 text-ink hover:bg-raise"
            >
              Baixar
            </a>
          ) : (
            <a
              href={img.url}
              target="_blank"
              rel="noreferrer noopener"
              className="meta-11 rounded-[4px] border border-line px-2 py-1 text-ink hover:bg-raise"
            >
              Abrir original
            </a>
          )}
        </div>
      </div>
    );
  }
  if (r.tipo === "arquivo" && r.arquivo) {
    return <PreviewArquivo r={r} />;
  }
  if (r.tipo === "arquivo" && r.corpo) {
    return (
      <div className="whitespace-pre-wrap rounded-[6px] border border-line p-3 text-[13px] leading-5 text-ink">
        {r.corpo}
      </div>
    );
  }
  return <p className="text-[13px] text-ink-faint">Sem preview para este recurso.</p>;
}

function sameOrigem(url: string) {
  if (typeof window === "undefined") return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "arquivo";
}

function extDeMime(dataUrl?: string) {
  if (!dataUrl) return undefined;
  const m = /^data:([^;]+);/.exec(dataUrl);
  if (!m) return undefined;
  const mime = m[1];
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return undefined;
}

function PreviewArquivo({ r }: { r: Recurso }) {
  const arq = r.arquivo!;
  const ehPdf = arq.mime === "application/pdf";
  const ehImg = arq.mime.startsWith("image/");
  return (
    <div className="rounded-[6px] border border-line">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <IconFile />
        <span
          className="flex-1 truncate text-[13px] text-ink"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {arq.nome}
        </span>
        <span className="meta-11 text-ink-faint">{tamanhoHumano(arq.tamanho)}</span>
        {arq.dataUrl ? (
          <a
            href={arq.dataUrl}
            download={arq.nome}
            className="meta-11 rounded-[4px] border border-line px-2 py-1 text-ink hover:bg-raise"
          >
            Baixar
          </a>
        ) : (
          <span
            className="meta-11 rounded-[4px] border border-line px-2 py-1 text-ink-faint opacity-60"
            title="Arquivo de exemplo — sem binário disponível"
          >
            Baixar
          </span>
        )}
      </div>
      <div className="p-3">
        {ehPdf && arq.dataUrl ? (
          <iframe
            src={arq.dataUrl}
            title={arq.nome}
            className="h-64 w-full rounded-[4px] border border-line bg-raise"
          />
        ) : ehPdf ? (
          <div className="flex h-32 items-center justify-center rounded-[4px] border border-dashed border-line bg-raise text-center">
            <span className="meta text-ink-faint">Preview PDF (mock)</span>
          </div>
        ) : ehImg && arq.dataUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={arq.dataUrl}
            alt={arq.nome}
            className="block max-h-64 w-full rounded-[4px] border border-line object-contain"
          />
        ) : ehImg ? (
          <div className="flex h-32 items-center justify-center rounded-[4px] border border-dashed border-line bg-raise text-center">
            <span className="meta text-ink-faint">Preview de imagem</span>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center text-center">
            <span className="meta text-ink-faint">Sem preview para este formato.</span>
          </div>
        )}
      </div>
    </div>
  );
}


function ModalAdicionar({
  open,
  onClose,
  sub,
  rotulosSugeridos,
  onCriar,
}: {
  open: boolean;
  onClose: () => void;
  sub: SubAcervo;
  rotulosSugeridos: string[];
  onCriar: (r: Recurso) => void;
}) {
  const categorias = useCategorias();
  const catDefault = categorias[0]?.id ?? "produto";
  const tipoInicial: TipoRecurso = sub === "mural" ? "imagem" : "arquivo";
  const rotuloInicial = sub === "atas" ? "Ata" : "";

  const [tipo, setTipo] = useState<TipoRecurso>(tipoInicial);
  const [rotulo, setRotulo] = useState<string>(rotuloInicial);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>(catDefault);
  const [url, setUrl] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [arquivoTamanho, setArquivoTamanho] = useState(0);
  const [arquivoMime, setArquivoMime] = useState("application/octet-stream");
  const [arquivoDataUrl, setArquivoDataUrl] = useState<string | undefined>(undefined);
  const [imagemModo, setImagemModo] = useState<"url" | "upload">("url");
  const [imagemUrl, setImagemUrl] = useState("");
  const [imagemDataUrl, setImagemDataUrl] = useState<string | undefined>(undefined);
  const [imagemDim, setImagemDim] = useState<{ w: number; h: number } | null>(null);
  const [dragAtivo, setDragAtivo] = useState(false);
  const { push } = useToast();

  // Sincroniza defaults quando o sub muda ou o modal reabre.
  useEffect(() => {
    if (open) {
      setTipo(sub === "mural" ? "imagem" : "arquivo");
      setRotulo(sub === "atas" ? "Ata" : "");
      setCategoria(categorias[0]?.id ?? "produto");
    }
  }, [open, sub, categorias]);

  function reset() {
    setTipo(tipoInicial);
    setRotulo(rotuloInicial);
    setTitulo("");
    setDescricao("");
    setCategoria(catDefault);
    setUrl("");
    setArquivoNome("");
    setArquivoTamanho(0);
    setArquivoMime("application/octet-stream");
    setArquivoDataUrl(undefined);
    setImagemModo("url");
    setImagemUrl("");
    setImagemDataUrl(undefined);
    setImagemDim(null);
  }

  function lerComoDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(f);
    });
  }

  async function receberArquivo(f: File) {
    setArquivoNome(f.name);
    setArquivoTamanho(f.size);
    setArquivoMime(f.type || "application/octet-stream");
    try {
      const dataUrl = await lerComoDataUrl(f);
      setArquivoDataUrl(dataUrl);
      if (f.size > 4 * 1024 * 1024) {
        push({
          titulo: "Arquivo grande",
          descricao: "Pode não persistir entre sessões.",
        });
      }
    } catch {
      setArquivoDataUrl(undefined);
      push({ titulo: "Falha ao ler arquivo", descricao: f.name });
    }
  }

  async function receberImagem(f: File) {
    if (!f.type.startsWith("image/")) {
      push({ titulo: "Formato inválido", descricao: "Use PNG, JPG ou WebP." });
      return;
    }
    try {
      const dataUrl = await lerComoDataUrl(f);
      setImagemDataUrl(dataUrl);
      const dim = await new Promise<{ w: number; h: number }>((resolve) => {
        const im = new Image();
        im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => resolve({ w: 0, h: 0 });
        im.src = dataUrl;
      });
      setImagemDim(dim.w && dim.h ? dim : null);
      if (f.size > 4 * 1024 * 1024) {
        push({
          titulo: "Imagem grande",
          descricao: "Pode não persistir entre sessões.",
        });
      }
    } catch {
      push({ titulo: "Falha ao ler imagem", descricao: f.name });
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    const agora = new Date().toISOString();
    const temImagemUrl = imagemModo === "url" && imagemUrl.trim();
    const temImagemUpload = imagemModo === "upload" && imagemDataUrl;
    const novo: Recurso = {
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      tipo,
      rotulo: rotulo.trim() || undefined,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      tags: [],
      favoritoPor: [],
      fixado: false,
      autorId: "m-rafa",
      criadoEm: agora,
      atualizadoEm: agora,
      url: tipo === "link" ? url.trim() || undefined : undefined,
      arquivo:
        tipo === "arquivo" && arquivoNome
          ? {
              nome: arquivoNome,
              tamanho: arquivoTamanho || 0,
              mime: arquivoMime,
              dataUrl: arquivoDataUrl,
            }
          : undefined,
      imagem:
        tipo === "imagem" && (temImagemUrl || temImagemUpload)
          ? {
              url: temImagemUpload ? "" : imagemUrl.trim(),
              dataUrl: temImagemUpload ? imagemDataUrl : undefined,
              largura: imagemDim?.w,
              altura: imagemDim?.h,
              alt: titulo.trim(),
            }
          : undefined,
    };
    onCriar(novo);
    push({ titulo: "Recurso adicionado", descricao: titulo.trim() });
    reset();
  }


  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      titulo="Adicionar recurso"
      descricao="Arquivos, links e imagens do time."
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
          <Button variant="primary" onClick={onSubmit} disabled={!titulo.trim()}>
            Adicionar
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <Label>Tipo</Label>
          <div
            role="radiogroup"
            aria-label="Tipo de recurso"
            className="grid grid-cols-3 gap-1.5"
          >
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => setTipo(t)}
                className={
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] border text-[13px] transition-colors " +
                  (tipo === t
                    ? "border-navy bg-raise text-ink"
                    : "border-line text-ink hover:bg-raise")
                }
              >
                <span>{rotuloTipo(t)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="ac-rotulo">Rótulo (opcional)</Label>
          <Input
            id="ac-rotulo"
            list="ac-rotulos"
            placeholder="Ex.: PRD, Ata, Post-mortem…"
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
          />
          <datalist id="ac-rotulos">
            {rotulosSugeridos.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="ac-titulo">Título</Label>
          <Input
            id="ac-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: PRD — v0.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="ac-cat">Categoria</Label>
          <select
            id="ac-cat"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {tipo === "link" ? (
          <div>
            <Label htmlFor="ac-url">URL</Label>
            <Input
              id="ac-url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : null}

        {tipo === "arquivo" ? (
          <div>
            <Label>Arquivo</Label>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragAtivo(true);
              }}
              onDragLeave={() => setDragAtivo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragAtivo(false);
                const f = e.dataTransfer.files[0];
                if (f) void receberArquivo(f);
              }}
              className={
                "flex h-24 cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed text-center transition-colors " +
                (dragAtivo ? "border-gold bg-gold-wash" : "border-line hover:bg-raise")
              }
            >
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void receberArquivo(f);
                }}
              />
              {arquivoNome ? (
                <>
                  <p
                    className="text-[13px] text-ink"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {arquivoNome}
                  </p>
                  <p className="meta-11 mt-1 text-ink-faint">
                    {tamanhoHumano(arquivoTamanho)}
                    {arquivoDataUrl ? " · pronto para download" : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-ink">Arraste um arquivo ou clique</p>
                  <p className="meta-11 mt-1 text-ink-faint">
                    PDF, docx, markdown, planilha
                  </p>
                </>
              )}
            </label>
          </div>
        ) : null}

        {tipo === "imagem" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1 rounded-[6px] border border-line bg-raise p-0.5">
              <button
                type="button"
                onClick={() => setImagemModo("url")}
                className={
                  "flex-1 rounded-[4px] px-2 py-1 text-[12px] transition-colors " +
                  (imagemModo === "url"
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink")
                }
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setImagemModo("upload")}
                className={
                  "flex-1 rounded-[4px] px-2 py-1 text-[12px] transition-colors " +
                  (imagemModo === "upload"
                    ? "bg-canvas text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink")
                }
              >
                Upload PNG/JPG
              </button>
            </div>

            {imagemModo === "url" ? (
              <div>
                <Label htmlFor="ac-img">URL da imagem</Label>
                <Input
                  id="ac-img"
                  type="url"
                  placeholder="https://images.unsplash.com/…"
                  value={imagemUrl}
                  onChange={(e) => setImagemUrl(e.target.value)}
                />
                {imagemUrl.trim() ? (
                  <div className="mt-2 overflow-hidden rounded-[6px] border border-line bg-raise">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                      src={imagemUrl}
                      alt=""
                      className="block max-h-40 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <Label>Imagem</Label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragAtivo(true);
                  }}
                  onDragLeave={() => setDragAtivo(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragAtivo(false);
                    const f = e.dataTransfer.files[0];
                    if (f) void receberImagem(f);
                  }}
                  className={
                    "flex h-24 cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed text-center transition-colors " +
                    (dragAtivo ? "border-gold bg-gold-wash" : "border-line hover:bg-raise")
                  }
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void receberImagem(f);
                    }}
                  />
                  {imagemDataUrl ? (
                    <p className="text-[13px] text-ink">Imagem carregada</p>
                  ) : (
                    <>
                      <p className="text-[13px] text-ink">Arraste uma imagem ou clique</p>
                      <p className="meta-11 mt-1 text-ink-faint">PNG, JPG, WebP</p>
                    </>
                  )}
                </label>
                {imagemDataUrl ? (
                  <div className="mt-2 overflow-hidden rounded-[6px] border border-line bg-raise">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                      src={imagemDataUrl}
                      alt=""
                      className="block max-h-40 w-full object-cover"
                    />
                    {imagemDim ? (
                      <p className="meta-11 border-t border-line px-3 py-1.5 text-ink-faint">
                        {imagemDim.w} × {imagemDim.h}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div>
          <Label htmlFor="ac-desc">Descrição</Label>
          <Textarea
            id="ac-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Uma linha explicando pra que serve."
          />
        </div>
      </form>
    </Modal>
  );
}

/** Sub-navegação exibida no topo do Acervo, alinhada à sidebar accordion. */
export function AcervoSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const abas: { to: "/acervo" | "/acervo/atas" | "/acervo/mural"; label: string }[] = [
    { to: "/acervo", label: "Todos" },
    { to: "/acervo/atas", label: "Atas" },
    { to: "/acervo/mural", label: "Mural" },
  ];
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex items-center gap-1 border-b border-line">
      {abas.map((a) => {
        const ativo =
          a.to === "/acervo"
            ? pathname === "/acervo"
            : pathname.startsWith(a.to);
        return (
          <button
            key={a.to}
            type="button"
            onClick={() => navigate({ to: a.to })}
            aria-current={ativo ? "page" : undefined}
            className={
              "press relative inline-flex h-9 items-center px-3 text-[13px] transition-colors " +
              (ativo ? "text-ink" : "text-ink-faint hover:text-ink")
            }
          >
            {a.label}
            {ativo ? (
              <motion.span
                layoutId="acervo-subnav-indicador"
                className="absolute inset-x-2 -bottom-px h-0.5 bg-gold"
                transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.6 }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
