import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import type { Recurso, TipoRecurso } from "@/types";
import { useMembros, membroPorId } from "@/lib/membros-store";
import { cn } from "@/lib/utils";
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
  IconImage,
  IconPin,
  IconSearch,
} from "@/components/icons";
import {
  Star,
  ChevronRight,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { tempoRelativo, dataCurta } from "@/lib/tempo";
import {
  useCategorias,
  encontrar as encontrarCategoria,
} from "@/lib/categorias";
import { useRotulos } from "@/lib/rotulos";
import {
  useRecursosState,
  useRecursosLista,
  addRecurso,
  updateRecurso,
  deleteRecurso,
  toggleFixado,
  toggleFavorito,
  isFixado,
  isFavorito,
} from "@/lib/recursos-store";

export type SubAcervo = "todos" | "atas" | "mural";

const TIPOS: TipoRecurso[] = ["arquivo", "link", "imagem"];
const ROTULOS_SUGERIDOS = [
  "Doc",
  "PRD",
  "Ata",
  "Post-mortem",
  "Guia",
  "ADR",
  "Runbook",
];

function rotuloTipo(t: TipoRecurso) {
  if (t === "arquivo") return "Arquivo";
  if (t === "link") return "Link";
  return "Imagem";
}

function iconePorRecurso(r: Recurso, className?: string) {
  if (r.rotulo === "Ata") return <IconAta className={className} />;
  if (r.tipo === "link") return <IconLink className={className} />;
  if (r.tipo === "imagem") return <IconImage className={className} />;
  return <IconFile className={className} />;
}


function tamanhoHumano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StarBurst() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {[...Array(6)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-[3px] w-[3px] rounded-full bg-gold"
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5, 0],
            x: Math.cos((i * 60 * Math.PI) / 180) * 18,
            y: Math.sin((i * 60 * Math.PI) / 180) * 18,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function abrirUrl(url: string) {
  let link = url.trim();
  if (!/^https?:\/\//i.test(link)) {
    link = `https://${link}`;
  }
  window.open(link, "_blank", "noopener,noreferrer");
}

function baixarRecurso(r: Recurso) {
  if (r.tipo === "link" && r.url) {
    abrirUrl(r.url);
    return;
  }

  if (r.imagem?.dataUrl) {
    if (r.imagem.dataUrl.startsWith("http")) {
      fetch(r.imagem.dataUrl).then(res => res.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slugify(r.titulo || "imagem")}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } else {
      const a = document.createElement("a");
      a.href = r.imagem.dataUrl;
      a.download = `${slugify(r.titulo || "imagem")}.${extDeMime(r.imagem.dataUrl) || "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return;
  }

  if (r.imagem?.url) {
    abrirUrl(r.imagem.url);
    return;
  }

  if (r.arquivo?.dataUrl) {
    if (r.arquivo.dataUrl.startsWith("http")) {
      fetch(r.arquivo.dataUrl).then(res => res.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = r.arquivo!.nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    } else {
      const a = document.createElement("a");
      a.href = r.arquivo.dataUrl;
      a.download = r.arquivo.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return;
  }

  let content = "";
  let mimeType = "text/plain;charset=utf-8";
  let fileName = r.arquivo?.nome || `${slugify(r.titulo)}.txt`;

  if (r.ata) {
    content =
      `# ${r.titulo}\nData: ${r.ata.data}\nParticipantes: ${r.ata.participantes.map((id) => membroPorId(id).nome).join(", ")}\n\n## Decisões\n` +
      r.ata.decisoes.map((d) => `- ${d}`).join("\n");
    fileName = `${slugify(r.titulo)}.md`;
    mimeType = "text/markdown;charset=utf-8";
  } else {
    content = `# ${r.titulo}\n\nCategoria: ${r.categoria}\nTipo: ${r.tipo}\n\n${r.descricao || "Recurso do Acervo"}`;
  }

  const blob = new Blob([content], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

function normalizarTexto(txt: string): string {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function construirCorpusRecurso(
  r: Recurso,
  categorias: Array<{ id: string; nome: string }>,
): string {
  const autor = membroPorId(r.autorId);
  const catObj = categorias.find((c) => c.id === r.categoria);
  const catNome = catObj ? catObj.nome : r.categoria;
  const rotTipo = rotuloTipo(r.tipo);

  const dtAtual = new Date(r.atualizadoEm);
  const dtCriado = new Date(r.criadoEm);
  const dataFormatadaAtual = dataCurta(r.atualizadoEm);
  const dataFormatadaCriado = dataCurta(r.criadoEm);
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const mesNomeAtual = meses[dtAtual.getMonth()] || "";
  const mesNomeCriado = meses[dtCriado.getMonth()] || "";
  const anoAtual = Number.isNaN(dtAtual.getFullYear())
    ? ""
    : dtAtual.getFullYear().toString();
  const anoCriado = Number.isNaN(dtCriado.getFullYear())
    ? ""
    : dtCriado.getFullYear().toString();

  const partes = [
    r.titulo,
    r.descricao ?? "",
    r.rotulo ?? "",
    r.tipo,
    rotTipo,
    r.categoria,
    catNome,
    autor?.nome ?? "",
    r.tags ? r.tags.join(" ") : "",
    r.arquivo?.nome ?? "",
    r.url ?? "",
    r.imagem?.alt ?? "",
    dataFormatadaAtual,
    dataFormatadaCriado,
    mesNomeAtual,
    mesNomeCriado,
    anoAtual,
    anoCriado,
  ];

  if (r.ata) {
    partes.push(r.ata.data);
    for (const pId of r.ata.participantes ?? []) {
      const m = membroPorId(pId);
      if (m) partes.push(m.nome);
    }
  }

  return normalizarTexto(partes.join(" "));
}

type SearchState = {
  q?: string;
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
  const [editandoRecurso, setEditandoRecurso] = useState<Recurso | null>(null);
  const [excluindoRecurso, setExcluindoRecurso] = useState<Recurso | null>(
    null,
  );
  const recursosLocais = useRecursosLista();
  const estadoStore = useRecursosState();
  const categorias = useCategorias();

  const { user } = useAuth();
  const userId = user?.id || "m-rafa";
  const membros = useMembros();

  // Recursos com overlay de fixado/favorito
  const recursos = useMemo(
    () =>
      recursosLocais.map((r) => ({
        ...r,
        fixado: isFixado(r.id, r.fixado),
        favoritoPor: (() => {
          const eraFav = r.favoritoPor.includes(userId);
          const efet = isFavorito(r.id, eraFav, userId);
          if (efet === eraFav) return r.favoritoPor;
          if (efet) return [...r.favoritoPor, userId];
          return r.favoritoPor.filter((x) => x !== userId);
        })(),
      })),
    [recursosLocais, userId],
  );

  const filtrados = useMemo(() => {
    let list = [...recursos];

    // Restrições por sub-rota
    if (sub === "atas") list = list.filter((r) => r.rotulo === "Ata");
    if (sub === "mural") list = list.filter((r) => r.tipo === "imagem");

    // Busca inteligente por palavra-chave (título, descrição, rótulo, tipo, categoria, autor, data...)
    if (sp.q && sp.q.trim()) {
      const qNorm = normalizarTexto(sp.q.trim());
      const tokens = qNorm.split(/\s+/).filter(Boolean);
      list = list.filter((r) => {
        const corpus = construirCorpusRecurso(r, categorias);
        return tokens.every((token) => corpus.includes(token));
      });
    }

    if (sub !== "mural" && sp.tipo)
      list = list.filter((r) => r.tipo === sp.tipo);
    if (sub === "todos" && sp.rot) {
      const rotProcurado = sp.rot.toLowerCase();
      list = list.filter(
        (r) =>
          r.rotulo?.toLowerCase() === rotProcurado ||
          r.tags?.some((t) => t.toLowerCase() === rotProcurado),
      );
    }
    if (sp.cat) list = list.filter((r) => r.categoria === sp.cat);
    if (sp.fav === 1)
      list = list.filter((r) => r.favoritoPor.includes(userId));

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
  }, [
    recursos,
    sub,
    sp.q,
    sp.tipo,
    sp.rot,
    sp.cat,
    sp.fav,
    sp.sort,
    categorias,
    userId,
  ]);

  const selecionado = sp.id
    ? (recursos.find((r) => r.id === sp.id) ?? null)
    : null;

  const temFiltro = !!(sp.q || sp.tipo || sp.cat || sp.rot || sp.fav);

  function setSearch(next: Partial<SearchState>) {
    navigate({
      to: rota,
      search: (prev: Record<string, unknown>) =>
        ({ ...prev, ...next }) as never,
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

  const rotulosConfig = useRotulos();
  const rotulosExistentes = useMemo(() => {
    const s = new Set<string>();
    for (const rot of rotulosConfig) if (rot.nome) s.add(rot.nome);
    for (const r of recursosLocais) if (r.rotulo) s.add(r.rotulo);
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [recursosLocais, rotulosConfig]);

  return (
    <div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md bg-gold-wash px-2 text-[15px] font-bold tracking-tight text-gold-ink border border-gold/30 shadow-sm">
              {filtrados.length}
            </span>
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
          {/* Campo de busca rápida e profunda */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por título, descrição, autor, categoria, data..."
              value={sp.q ?? ""}
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              className="h-8 w-full rounded-[6px] border border-line bg-canvas pl-8 pr-7 text-[13px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-none"
            />
            {sp.q ? (
              <button
                type="button"
                onClick={() => setSearch({ q: undefined })}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <IconClose size={12} />
              </button>
            ) : null}
          </div>

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
              sp.cat
                ? (categorias.find((c) => c.id === sp.cat)?.nome ?? sp.cat)
                : null
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
        className={cn(
          "mt-4 grid gap-6 transition-all duration-200",
          selecionado
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
            : "grid-cols-1",
        )}
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
              onEditar={(r) => setEditandoRecurso(r)}
              onExcluir={(r) => setExcluindoRecurso(r)}
            />
          ) : (
            <ul
              role="list"
              className="overflow-hidden rounded-[10px] border border-line bg-canvas"
            >
              <AnimatePresence initial={false}>
                {filtrados.map((r) => (
                  <RecursoRow
                    key={r.id}
                    r={r}
                    ativo={r.id === sp.id}
                    onAbrir={() => abrir(r.id)}
                    onFixar={() => toggleFixado(r.id, r.fixado)}
                    onFavoritar={() =>
                      toggleFavorito(r.id, r.favoritoPor.includes(userId), userId)
                    }
                    onEditar={() => setEditandoRecurso(r)}
                    onExcluir={() => setExcluindoRecurso(r)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {selecionado ? (
          <PainelLateral
            r={selecionado}
            onFechar={fecharPainel}
            onFavoritar={() =>
              toggleFavorito(
                selecionado.id,
                selecionado.favoritoPor.includes(userId),
                userId
              )
            }
            onFixar={() => toggleFixado(selecionado.id, selecionado.fixado)}
            onEditar={() => setEditandoRecurso(selecionado)}
            onExcluir={() => setExcluindoRecurso(selecionado)}
          />
        ) : null}
      </div>

      <ModalAdicionar
        open={novoAberto}
        onClose={() => setNovoAberto(false)}
        sub={sub}
        userId={user?.id || ""}
        rotulosSugeridos={[
          ...new Set([...ROTULOS_SUGERIDOS, ...rotulosExistentes]),
        ]}
        onCriar={async (r) => {
          await addRecurso(r);
          setNovoAberto(false);
          abrir(r.id);
        }}
      />

      <ModalEditar
        open={!!editandoRecurso}
        onClose={() => setEditandoRecurso(null)}
        r={editandoRecurso}
        rotulosSugeridos={[
          ...new Set([...ROTULOS_SUGERIDOS, ...rotulosExistentes]),
        ]}
        onSalvar={(id, updates) => {
          updateRecurso(id, updates);
        }}
      />

      <ModalConfirmarExclusao
        open={!!excluindoRecurso}
        onClose={() => setExcluindoRecurso(null)}
        r={excluindoRecurso}
        onConfirmar={(id) => {
          deleteRecurso(id);
          fecharPainel();
          setExcluindoRecurso(null);
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
          {valor ? (
            <span>{valor}</span>
          ) : (
            <span className="text-ink-muted">todos</span>
          )}
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
  onEditar,
  onExcluir,
}: {
  r: Recurso;
  ativo: boolean;
  onAbrir: () => void;
  onFixar: () => void;
  onFavoritar: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id || "m-rafa";
  const autor = membroPorId(r.autorId);
  const catNome = encontrarCategoria(r.categoria)?.nome ?? r.categoria;
  const favorito = r.favoritoPor.includes(userId);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: -24,
        scale: 0.94,
        height: 0,
        filter: "blur(4px)",
        transition: { duration: 0.28, ease: [0.32, 0, 0.67, 0] },
      }}
      className="overflow-hidden border-b border-line last:border-b-0"
    >
      <div
        onClick={onAbrir}
        className={
          "group flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left " +
          "hover:bg-raise transition-colors min-w-0 overflow-hidden " +
          (ativo ? "bg-raise" : "")
        }
      >
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFixar();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-pressed={r.fixado}
          aria-label={r.fixado ? "Desfixar" : "Fixar"}
          className={
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] transition-colors relative overflow-hidden " +
            (r.fixado
              ? "text-gold hover:bg-gold-wash/50"
              : "text-ink-faint opacity-40 hover:text-ink hover:bg-line/40")
          }
        >
          {r.fixado && (
            <>
              <motion.span
                key="bubble-fixado"
                className="absolute inset-0 pointer-events-none rounded-full bg-gold/30"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <StarBurst key="burst-fixado" />
            </>
          )}
          <motion.span
            animate={{
              scale: r.fixado ? [1, 1.45, 0.85, 1.15, 1] : 1,
              rotate: r.fixado ? [0, 15, -15, 0] : 0,
            }}
            transition={{
              duration: 0.4,
              ease: "easeInOut",
            }}
            className="inline-flex"
          >
            <IconPin size={16} filled={r.fixado} />
          </motion.span>
        </motion.button>
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFavoritar();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
          className={
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] transition-colors relative overflow-hidden " +
            (favorito
              ? "text-gold hover:bg-line/20"
              : "text-ink-faint opacity-40 hover:text-ink hover:bg-line/40")
          }
        >
          {favorito && (
            <>
              <motion.span
                key="bubble-favorito"
                className="absolute inset-0 pointer-events-none rounded-full bg-gold/30"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <StarBurst key="burst-favorito" />
            </>
          )}
          <motion.span
            animate={{
              scale: favorito ? [1, 1.45, 0.85, 1.15, 1] : 1,
              rotate: favorito ? [0, 15, -15, 0] : 0,
            }}
            transition={{
              duration: 0.4,
              ease: "easeInOut",
            }}
            className="inline-flex"
          >
            <Star
              size={16}
              strokeWidth={1.75}
              fill={favorito ? "currentColor" : "none"}
            />
          </motion.span>
        </motion.button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left overflow-hidden">
          <span className="shrink-0 text-ink-faint">{iconePorRecurso(r)}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 min-w-0">
              {r.fixado ? (
                <Tag tone="fixado" pill className="uppercase shrink-0">
                  Fixado
                </Tag>
              ) : null}
              {r.rotulo ? (
                <Tag
                  tone="rotulo"
                  pill
                  className="uppercase shrink-0 sm:hidden"
                >
                  {r.rotulo}
                </Tag>
              ) : null}
              <span className="truncate text-[13px] text-ink min-w-0 flex-1">
                {r.titulo}
              </span>
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 shrink-0">
            {r.rotulo ? (
              <Tag tone="rotulo" pill className="uppercase">
                {r.rotulo}
              </Tag>
            ) : null}
            <Tag tone="tipo" tipo={r.tipo} pill className="uppercase">
              {rotuloTipo(r.tipo)}
            </Tag>
            <Tag
              tone="categoria"
              categoria={r.categoria}
              pill
              className="uppercase"
            >
              {catNome}
            </Tag>
          </span>
          <span className="shrink-0">
            <Avatar membro={autor} size={20} />
          </span>
          <span
            className="meta-11 hidden sm:inline-block w-16 md:w-20 shrink-0 whitespace-nowrap text-right text-ink-faint"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {dataCurta(r.atualizadoEm)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              baixarRecurso(r);
            }}
            aria-label={r.tipo === "link" ? "Abrir link" : "Baixar arquivo"}
            title={r.tipo === "link" ? "Abrir link" : "Baixar arquivo"}
            className="press inline-flex h-7 shrink-0 items-center gap-1 rounded-[6px] border border-line px-2 text-[12px] font-medium text-ink transition-colors hover:border-gold hover:bg-gold-wash hover:text-gold-ink"
          >
            {r.tipo === "link" ? (
              <>
                <ExternalLink size={13} strokeWidth={1.75} />
                <span className="hidden xl:inline">Abrir</span>
              </>
            ) : (
              <>
                <Download size={13} strokeWidth={1.75} />
                <span className="hidden xl:inline">Baixar</span>
              </>
            )}
          </button>
          <span className="hidden sm:inline-block shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
            <ChevronRight size={16} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function MuralAcervo({
  itens,
  ativoId,
  onAbrir,
  onEditar,
  onExcluir,
}: {
  itens: Recurso[];
  ativoId?: string;
  onAbrir: (id: string) => void;
  onEditar?: (r: Recurso) => void;
  onExcluir?: (r: Recurso) => void;
}) {
  return (
    <div
      className={cn(
        "gap-3 [column-fill:_balance]",
        ativoId
          ? "columns-1 sm:columns-2 xl:columns-3"
          : "columns-2 md:columns-3 xl:columns-4",
      )}
    >
      <AnimatePresence initial={false}>
        {itens.map((r) => (
          <MuralCard
            key={r.id}
            r={r}
            ativo={r.id === ativoId}
            onAbrir={() => onAbrir(r.id)}
            onEditar={onEditar ? () => onEditar(r) : undefined}
            onExcluir={onExcluir ? () => onExcluir(r) : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function MuralCard({
  r,
  ativo,
  onAbrir,
  onEditar,
  onExcluir,
}: {
  r: Recurso;
  ativo: boolean;
  onAbrir: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
}) {
  const img = r.imagem;
  const autor = membroPorId(r.autorId);
  const razao =
    img && img.largura && img.altura
      ? `${img.largura} / ${img.altura}`
      : "3 / 4";
  const favoritoConta = r.favoritoPor.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.82,
        y: 12,
        filter: "blur(6px)",
        transition: { duration: 0.28, ease: "easeIn" },
      }}
      className="mb-3 break-inside-avoid"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onAbrir}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAbrir();
          }
        }}
        className={
          "card-hover press group relative block w-full cursor-pointer overflow-hidden rounded-[10px] bg-raise text-left " +
          (ativo ? "ring-2 ring-gold ring-offset-2 ring-offset-canvas" : "")
        }
        aria-label={`Abrir ${r.titulo}`}
      >
        {img ? (
          <img
            src={img.url || img.dataUrl}
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
          <div className="flex flex-wrap items-center gap-1">
            {r.fixado ? (
              <Tag tone="fixado" pill className="uppercase shadow-float">
                Fixado
              </Tag>
            ) : null}
            {r.rotulo ? (
              <Tag tone="rotulo" pill className="uppercase shadow-float">
                {r.rotulo}
              </Tag>
            ) : null}
          </div>
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
        <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-navy/85 p-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-medium leading-4 text-[#F2F4F8]">
              {r.titulo}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {r.rotulo ? (
                <Tag tone="rotulo" pill className="uppercase">
                  {r.rotulo}
                </Tag>
              ) : null}
              <Tag
                tone="categoria"
                categoria={r.categoria}
                pill
                className="uppercase"
              >
                {encontrarCategoria(r.categoria)?.nome ?? r.categoria}
              </Tag>
              <span className="meta-11 text-[#C9CFDA]">
                {autor.nome.split(" ")[0]} · {dataCurta(r.atualizadoEm)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                baixarRecurso(r);
              }}
              aria-label={r.tipo === "link" ? "Abrir link" : "Baixar arquivo"}
              title={r.tipo === "link" ? "Abrir link" : "Baixar arquivo"}
              className="press inline-flex h-7 items-center gap-1 rounded-[6px] border border-white/20 px-2 text-[12px] font-medium text-white hover:bg-white/20 transition-colors"
            >
              {r.tipo === "link" ? (
                <ExternalLink size={13} />
              ) : (
                <Download size={13} />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PainelLateral({
  r,
  onFechar,
  onFavoritar,
  onFixar,
  onEditar,
  onExcluir,
}: {
  r: Recurso;
  onFechar: () => void;
  onFavoritar: () => void;
  onFixar: () => void;
  onEditar?: () => void;
  onExcluir?: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id || "m-rafa";
  const autor = membroPorId(r.autorId);
  const favorito = r.favoritoPor.includes(userId);
  return (
    <AnimatePresence mode="wait">
      {/* Backdrop overlay para telas menores (< lg) */}
      <motion.div
        key={`backdrop-${r.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onFechar}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
      />

      <motion.aside
        key={r.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-canvas shadow-2xl lg:sticky lg:top-24 lg:z-auto lg:h-fit lg:w-full lg:max-w-none lg:rounded-[10px] lg:border lg:shadow-none"
        aria-label={`Detalhes de ${r.titulo}`}
      >
        <header className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-3">
          <span className="shrink-0 text-ink-faint">{iconePorRecurso(r)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-medium leading-5 text-ink line-clamp-2">
              {r.titulo}
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar painel"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-ink-faint hover:bg-raise"
          >
            <IconClose />
          </button>
        </header>

        <div className="px-4 py-4">
          <DetalhesRecurso
            r={r}
            autor={autor}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

function DetalhesRecurso({
  r,
  autor,
  onEditar,
  onExcluir,
}: {
  r: Recurso;
  autor: ReturnType<typeof membroPorId>;
  onEditar?: () => void;
  onExcluir?: () => void;
}) {
  const catNome = encontrarCategoria(r.categoria)?.nome ?? r.categoria;
  return (
    <>
      <button
        type="button"
        onClick={() => baixarRecurso(r)}
        className="Btn mb-4"
      >
        {r.tipo === "link" ? (
          <>
            <ExternalLink size={15} strokeWidth={2.2} />
            <span>Abrir Link</span>
          </>
        ) : (
          <>
            <Download size={15} strokeWidth={2.2} />
            <span>Baixar Arquivo</span>
          </>
        )}
      </button>

      {(r.tipo === "imagem" || (r.tipo === "arquivo" && r.arquivo?.mime?.startsWith("image/"))) && (
        <div className="mb-4 overflow-hidden rounded-[8px] border border-line bg-raise/50">
          <img
            src={r.url || r.imagem?.dataUrl || r.arquivo?.dataUrl || ""}
            alt={r.titulo}
            className="w-full h-auto object-contain max-h-[300px] block"
          />
        </div>
      )}

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
          <Tag
            tone="categoria"
            categoria={r.categoria}
            pill
            className="uppercase"
          >
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
      </dl>

      {r.descricao ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="meta text-ink-faint mb-1.5">Descrição</p>
          <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
            {r.descricao}
          </p>
        </div>
      ) : null}

      {r.rotulo === "Ata" && r.ata ? (
        <div className="mt-4 rounded-[6px] border border-line bg-raise/40 p-3">
          <p className="meta text-ink-faint">
            Ata de{" "}
            <span
              className="text-ink"
              style={{ fontFamily: "var(--font-mono)" }}
            >
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
                  className="inline-flex items-center gap-1 rounded-[4px] border border-line bg-canvas px-1.5 py-[1px]"
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
      ) : null}

      <p className="meta-11 mt-4 text-ink-faint">
        criado {tempoRelativo(r.criadoEm)}
      </p>

      {onEditar || onExcluir ? (
        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          {onEditar ? (
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex-1"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onEditar}
                className="w-full"
              >
                <Pencil size={14} className="mr-1.5 shrink-0" />
                Editar recurso
              </Button>
            </motion.div>
          ) : null}
          {onExcluir ? (
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex-1"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onExcluir}
                className="w-full text-red-600 hover:text-red-700 border-red-200/80 dark:border-red-900/50 dark:text-red-400 hover:bg-transparent dark:hover:bg-transparent"
              >
                <Trash2 size={14} className="mr-1.5 shrink-0" />
                Excluir
              </Button>
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </>
  );
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
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "arquivo"
  );
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
        <span className="meta-11 text-ink-faint">
          {tamanhoHumano(arq.tamanho)}
        </span>
        <button
          type="button"
          onClick={() => baixarRecurso(r)}
          className="press meta-11 rounded-[4px] border border-line px-2 py-1 text-ink hover:bg-raise"
        >
          Baixar
        </button>
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
            <span className="meta text-ink-faint">
              Sem preview para este formato.
            </span>
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
  userId,
}: {
  open: boolean;
  onClose: () => void;
  sub: SubAcervo;
  rotulosSugeridos: string[];
  onCriar: (r: Recurso) => Promise<void> | void;
  userId: string;
}) {
  const categorias = useCategorias();
  const rotulosConfig = useRotulos();
  const catDefault = categorias[0]?.id ?? "produto";
  const tipoInicial: TipoRecurso = sub === "mural" ? "imagem" : "arquivo";
  const rotuloInicial = sub === "atas" ? "Ata" : "";

  const [tipo, setTipo] = useState<TipoRecurso>(tipoInicial);
  const [rotulo, setRotulo] = useState<string>(rotuloInicial);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>(catDefault);
  const [url, setUrl] = useState("");
  const [arquivoObj, setArquivoObj] = useState<File | null>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [arquivoTamanho, setArquivoTamanho] = useState(0);
  const [arquivoMime, setArquivoMime] = useState("application/octet-stream");
  const [arquivoDataUrl, setArquivoDataUrl] = useState<string | undefined>(
    undefined,
  );
  const [imagemModo, setImagemModo] = useState<"url" | "upload">("url");
  const [imagemUrl, setImagemUrl] = useState("");
  const [imagemObj, setImagemObj] = useState<File | null>(null);
  const [imagemDataUrl, setImagemDataUrl] = useState<string | undefined>(
    undefined,
  );
  const [imagemDim, setImagemDim] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [dragAtivo, setDragAtivo] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    setArquivoObj(null);
    setArquivoNome("");
    setArquivoTamanho(0);
    setArquivoMime("application/octet-stream");
    setArquivoDataUrl(undefined);
    setImagemModo("url");
    setImagemUrl("");
    setImagemObj(null);
    setImagemDataUrl(undefined);
    setImagemDim(null);
    setUploading(false);
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
    setArquivoObj(f);
    setArquivoNome(f.name);
    setArquivoTamanho(f.size);
    setArquivoMime(f.type || "application/octet-stream");
    try {
      const dataUrl = await lerComoDataUrl(f);
      setArquivoDataUrl(dataUrl);
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
      setImagemObj(f);
      const dataUrl = await lerComoDataUrl(f);
      setImagemDataUrl(dataUrl);
      const dim = await new Promise<{ w: number; h: number }>((resolve) => {
        const im = new Image();
        im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => resolve({ w: 0, h: 0 });
        im.src = dataUrl;
      });
      setImagemDim(dim.w && dim.h ? dim : null);
    } catch {
      push({ titulo: "Falha ao ler imagem", descricao: f.name });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    
    setUploading(true);
    
    const agora = new Date().toISOString();
    const temImagemUrl = imagemModo === "url" && imagemUrl.trim();
    const temImagemUpload = imagemModo === "upload" && imagemDataUrl;
    
    let supabaseArquivoDataUrl = arquivoDataUrl;
    let supabaseImagemDataUrl = imagemDataUrl;
    
    try {
      // Importa supabase localmente (como é um arquivo utilitário e a gente já tem `src/lib/supabase.ts`)
      const { supabase } = await import('@/lib/supabase');
      
      // Realizar upload do Arquivo
      if (tipo === "arquivo" && arquivoObj) {
        const fileExt = arquivoNome.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `recursos/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('arquivos')
          .upload(filePath, arquivoObj);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('arquivos')
          .getPublicUrl(filePath);
          
        supabaseArquivoDataUrl = publicUrl;
      }
      
      // Realizar upload de Imagem
      if (tipo === "imagem" && temImagemUpload && imagemObj) {
        const fileExt = imagemObj.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `imagens/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('arquivos')
          .upload(filePath, imagemObj);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('arquivos')
          .getPublicUrl(filePath);
          
        supabaseImagemDataUrl = publicUrl;
      }
      
      const novo: Omit<Recurso, "id" | "criadoEm" | "atualizadoEm"> = {
        tipo,
        rotulo: rotulo.trim() || undefined,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        categoria,
        tags: [],
        favoritoPor: [],
        fixado: false,
        autorId: userId, // Utiliza o ID real do usuário logado
        url: tipo === "link" ? url.trim() || undefined : undefined,
        arquivo:
          tipo === "arquivo" && arquivoNome
            ? {
                nome: arquivoNome,
                tamanho: arquivoTamanho || 0,
                mime: arquivoMime,
                dataUrl: supabaseArquivoDataUrl,
              }
            : undefined,
        imagem:
          tipo === "imagem" && (temImagemUrl || temImagemUpload)
            ? {
                url: temImagemUpload && supabaseImagemDataUrl ? supabaseImagemDataUrl : imagemUrl.trim(),
                dataUrl: temImagemUpload ? supabaseImagemDataUrl : undefined,
                largura: imagemDim?.w,
                altura: imagemDim?.h,
                alt: titulo.trim(),
              }
            : undefined,
      };
      
      await onCriar(novo as Recurso); // Store local converte e chama addRecurso (já async)
      push({ titulo: "Recurso adicionado", descricao: titulo.trim() });
      reset();
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Não foi possível salvar no servidor.";
      push({ titulo: "Erro no upload", descricao: msg });
    } finally {
      setUploading(false);
    }
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
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!titulo.trim() || uploading}
          >
            {uploading ? "Salvando..." : "Adicionar"}
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
          <select
            id="ac-rotulo"
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            className="w-full h-10 rounded-[6px] border border-line bg-canvas px-3 text-[13px] text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="">Nenhum rótulo</option>
            {rotulosConfig.map((r) => (
              <option key={r.id} value={r.nome}>
                {r.nome}
              </option>
            ))}
          </select>
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
                (dragAtivo
                  ? "border-gold bg-gold-wash"
                  : "border-line hover:bg-raise")
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
                  <p className="text-[13px] text-ink">
                    Arraste um arquivo ou clique
                  </p>
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
                    (dragAtivo
                      ? "border-gold bg-gold-wash"
                      : "border-line hover:bg-raise")
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
                      <p className="text-[13px] text-ink">
                        Arraste uma imagem ou clique
                      </p>
                      <p className="meta-11 mt-1 text-ink-faint">
                        PNG, JPG, WebP
                      </p>
                    </>
                  )}
                </label>
                {imagemDataUrl ? (
                  <div className="mt-2 overflow-hidden rounded-[6px] border border-line bg-raise">
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

function ModalEditar({
  open,
  onClose,
  r,
  rotulosSugeridos,
  onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  r: Recurso | null;
  rotulosSugeridos: string[];
  onSalvar: (id: string, updates: Partial<Recurso>) => void;
}) {
  const toast = useToast();
  const categorias = useCategorias();
  const rotulosConfig = useRotulos();

  const [tipo, setTipo] = useState<TipoRecurso>("arquivo");
  const [rotulo, setRotulo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("produto");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (r) {
      setTipo(r.tipo);
      setRotulo(r.rotulo ?? "");
      setTitulo(r.titulo);
      setCategoria(r.categoria);
      setDescricao(r.descricao ?? "");
      setUrl(r.url ?? "");
    }
  }, [r]);

  if (!r) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.push({
        titulo: "Atenção",
        descricao: "Informe o título do recurso.",
      });
      return;
    }

    const updates: Partial<Recurso> = {
      tipo,
      rotulo: rotulo.trim() || undefined,
      titulo: titulo.trim(),
      categoria,
      descricao: descricao.trim() || undefined,
      url: tipo === "link" ? url.trim() || undefined : r?.url,
    };

    onSalvar(r!.id, updates);
    toast.push({
      titulo: "Atualizado",
      descricao: "Recurso atualizado com sucesso!",
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo="Editar Recurso"
      descricao="Atualize os dados e o conteúdo do recurso selecionado."
      width={560}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-editar-recurso" variant="primary">
            Salvar alterações
          </Button>
        </>
      }
    >
      <form
        id="form-editar-recurso"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <Label>Formato / Tipo</Label>
          <div
            role="radiogroup"
            aria-label="Tipo de recurso"
            className="grid grid-cols-3 gap-1.5 mt-1"
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
                    ? "border-navy bg-raise text-ink font-medium"
                    : "border-line text-ink hover:bg-raise")
                }
              >
                <span>{rotuloTipo(t)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="ed-rotulo">Rótulo (opcional)</Label>
          <select
            id="ed-rotulo"
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            className="w-full h-10 rounded-[6px] border border-line bg-canvas px-3 text-[13px] text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="">Nenhum rótulo</option>
            {rotulosConfig.map((r) => (
              <option key={r.id} value={r.nome}>
                {r.nome}
              </option>
            ))}
            {rotulo &&
            !rotulosConfig.some(
              (r) => r.nome.toLowerCase() === rotulo.toLowerCase(),
            ) ? (
              <option value={rotulo}>{rotulo}</option>
            ) : null}
          </select>
        </div>

        <div>
          <Label htmlFor="ed-titulo">Título</Label>
          <Input
            id="ed-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: PRD do Módulo X"
            required
          />
        </div>

        <div>
          <Label htmlFor="ed-cat">Categoria</Label>
          <select
            id="ed-cat"
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
            <Label htmlFor="ed-url">URL</Label>
            <Input
              id="ed-url"
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="ed-desc">Descrição</Label>
          <Textarea
            id="ed-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Uma linha explicando pra que serve."
          />
        </div>
      </form>
    </Modal>
  );
}

function ModalConfirmarExclusao({
  open,
  onClose,
  r,
  onConfirmar,
}: {
  open: boolean;
  onClose: () => void;
  r: Recurso | null;
  onConfirmar: (id: string) => void;
}) {
  const toast = useToast();
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (open) setExcluindo(false);
  }, [open]);

  if (!r) return null;

  const autor = membroPorId(r.autorId);
  const catNome = encontrarCategoria(r.categoria)?.nome ?? r.categoria;

  const handleExcluir = () => {
    setExcluindo(true);
    setTimeout(() => {
      onClose();
      onConfirmar(r.id);
      toast.push({
        titulo: "Removido",
        descricao: "Recurso excluído com sucesso.",
      });
      setExcluindo(false);
    }, 150);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo="Excluir recurso"
      descricao="Confirme a remoção permanente deste item do acervo."
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
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-red-600 px-4 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {excluindo ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Sim, excluir recurso
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-3.5 py-1">
        {/* Resource Preview Card */}
        <div className="flex items-start gap-3 rounded-[8px] border border-line bg-raise/50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/40">
            {iconePorRecurso(r)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-semibold text-ink truncate">
              {r.titulo}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Tag
                tone="categoria"
                categoria={r.categoria}
                pill
                className="uppercase"
              >
                {catNome}
              </Tag>
              {r.rotulo ? (
                <Tag tone="rotulo" pill className="uppercase">
                  {r.rotulo}
                </Tag>
              ) : null}
              <span className="meta-11 text-ink-faint">
                por {autor.nome.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="rounded-[8px] border border-red-200/80 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 p-3 text-[12.5px] text-red-700 dark:text-red-300 leading-relaxed">
          <p className="font-medium flex items-center gap-1.5">
            ⚠️ Ação permanente e irreversível
          </p>
          <p className="mt-1 text-red-600/90 dark:text-red-400/90 meta-11">
            Este recurso e seus metadados associados serão removidos do Acervo e
            não poderão ser recuperados.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/** Sub-navegação exibida no topo do Acervo, alinhada à sidebar accordion. */
export function AcervoSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const abas: {
    to: "/acervo" | "/acervo/atas" | "/acervo/mural";
    label: string;
  }[] = [
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
          <Link
            key={a.to}
            to={a.to}
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
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 38,
                  mass: 0.6,
                }}
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
