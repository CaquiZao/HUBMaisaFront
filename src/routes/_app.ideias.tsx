import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  ideias as ideiasBase,
  comentarios as comentariosBase,
  cards as cardsBase,
  membros,
} from "@/mocks";
import type { Card, Categoria, Comentario, Ideia } from "@/types";
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
} from "@/components/ui";
import {
  IconChevronUp,
  IconClose,
  IconCornerDown,
  IconExternal,
} from "@/components/icons";
import { tempoRelativo, dataCurta } from "@/lib/tempo";

const search = z.object({
  id: z.string().optional(),
  q: z.string().optional(),
});

const CATEGORIAS: Categoria[] = [
  "produto",
  "backend",
  "frontend",
  "ux",
  "marketing",
  "comercial",
  "pesquisa",
  "infra",
];

const USUARIO_ATUAL = "m-rafa";

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

function membroPorId(id: string) {
  return membros.find((m) => m.id === id) ?? membros[0];
}

function IdeiasPage() {
  const navigate = useNavigate();
  const sp = Route.useSearch();
  const [ideias, setIdeias] = useState<Ideia[]>(ideiasBase);
  const [comentarios, setComentarios] =
    useState<Comentario[]>(comentariosBase);
  const [cards, setCards] = useState<Card[]>(cardsBase);
  const [novaAberta, setNovaAberta] = useState(false);
  const [virarModal, setVirarModal] = useState<Ideia | null>(null);
  const { push } = useToast();

  const q = (sp.q ?? "").trim().toLowerCase();

  const lista = useMemo(() => {
    let base = [...ideias];
    if (q) {
      base = base.filter(
        (i) =>
          i.titulo.toLowerCase().includes(q) ||
          i.corpo.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    // status !arquivada primeiro (mais votos), depois arquivadas
    base.sort((a, b) => {
      const aArq = a.status === "arquivada" ? 1 : 0;
      const bArq = b.status === "arquivada" ? 1 : 0;
      if (aArq !== bArq) return aArq - bArq;
      return b.votos.length - a.votos.length;
    });
    return base;
  }, [ideias, q]);

  const selecionada = sp.id ? ideias.find((i) => i.id === sp.id) ?? null : null;

  function abrir(id: string) {
    navigate({
      to: "/ideias",
      search: (prev: Record<string, unknown>) =>
        ({ ...prev, id }) as never,
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

  function toggleVoto(id: string) {
    setIdeias((atual) =>
      atual.map((i) => {
        if (i.id !== id) return i;
        const jaVotou = i.votos.includes(USUARIO_ATUAL);
        return {
          ...i,
          votos: jaVotou
            ? i.votos.filter((v) => v !== USUARIO_ATUAL)
            : [...i.votos, USUARIO_ATUAL],
        };
      }),
    );
  }

  function adicionarComentario(ideiaId: string, corpo: string) {
    const novo: Comentario = {
      id: `co-${crypto.randomUUID().slice(0, 8)}`,
      ideiaId,
      autorId: USUARIO_ATUAL,
      corpo,
      criadoEm: new Date().toISOString(),
    };
    setComentarios((atual) => [...atual, novo]);
  }

  function virarCard(ideia: Ideia, titulo: string, categoria: Categoria) {
    const cardId = `c-${crypto.randomUUID().slice(0, 8)}`;
    const agora = new Date().toISOString();
    const novoCard: Card = {
      id: cardId,
      titulo,
      descricao: ideia.corpo.slice(0, 200),
      coluna: "planejado",
      ordem: cards.filter((c) => c.coluna === "planejado").length,
      categoria,
      autorId: USUARIO_ATUAL,
      ideiaOrigemId: ideia.id,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    setCards((atual) => [...atual, novoCard]);
    setIdeias((atual) =>
      atual.map((i) =>
        i.id === ideia.id
          ? { ...i, status: "virou-card", cardGeradoId: cardId }
          : i,
      ),
    );
    setVirarModal(null);
    push({
      titulo: "Ideia virou card",
      descricao: `"${titulo}" está em Planejado.`,
    });
  }

  return (
    <div>
      <header className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Ideias</p>
          <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
            {ideias.filter((i) => i.status === "aberta").length}{" "}
            <span className="text-ink-muted">abertas</span>
          </h1>
        </div>
        <Button variant="primary" onClick={() => setNovaAberta(true)}>
          Nova ideia
        </Button>
      </header>

      <div className="mt-6 max-w-md">
        <Input
          type="search"
          aria-label="Buscar ideias"
          placeholder="Buscar ideia"
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

      <div
        className="mt-4 grid gap-6"
        style={{
          gridTemplateColumns: selecionada ? "minmax(0,1fr) 480px" : "1fr",
        }}
      >
        <div className="min-w-0">
          {lista.length === 0 ? (
            <div className="mt-16">
              <EmptyState
                titulo={q ? "Nada com essa busca." : "Nenhuma ideia ainda."}
                descricao={q ? undefined : "Comece capturando a primeira."}
                acao={
                  <Button
                    variant="primary"
                    onClick={() => setNovaAberta(true)}
                  >
                    Nova ideia
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="stagger space-y-1.5">
              {lista.map((i) => (
                <IdeiaRow
                  key={i.id}
                  i={i}
                  ativo={i.id === sp.id}
                  onVoto={() => toggleVoto(i.id)}
                  onAbrir={() => abrir(i.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {selecionada ? (
          <ThreadPanel
            i={selecionada}
            comentarios={comentarios.filter(
              (c) => c.ideiaId === selecionada.id,
            )}
            card={
              selecionada.cardGeradoId
                ? cards.find((c) => c.id === selecionada.cardGeradoId) ?? null
                : null
            }
            onFechar={fechar}
            onVoto={() => toggleVoto(selecionada.id)}
            onComentar={(corpo) => adicionarComentario(selecionada.id, corpo)}
            onVirarCard={() => setVirarModal(selecionada)}
          />
        ) : null}
      </div>

      <NovaIdeiaModal
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        onCriar={(titulo, corpo, categoria) => {
          const id = `i-${crypto.randomUUID().slice(0, 8)}`;
          const nova: Ideia = {
            id,
            titulo,
            corpo,
            categoria,
            tags: [],
            autorId: USUARIO_ATUAL,
            votos: [USUARIO_ATUAL],
            status: "aberta",
            criadaEm: new Date().toISOString(),
          };
          setIdeias((atual) => [nova, ...atual]);
          setNovaAberta(false);
          abrir(id);
          push({ titulo: "Ideia criada", descricao: titulo });
        }}
      />

      {virarModal ? (
        <VirarCardModal
          ideia={virarModal}
          onClose={() => setVirarModal(null)}
          onConfirmar={(titulo, categoria) =>
            virarCard(virarModal, titulo, categoria)
          }
        />
      ) : null}
    </div>
  );
}

function IdeiaRow({
  i,
  ativo,
  onVoto,
  onAbrir,
}: {
  i: Ideia;
  ativo: boolean;
  onVoto: () => void;
  onAbrir: () => void;
}) {
  const votou = i.votos.includes(USUARIO_ATUAL);
  const arquivada = i.status === "arquivada";
  const virou = i.status === "virou-card";

  return (
    <li
      className={
        "flex items-start gap-3 rounded-[10px] border border-line bg-canvas p-3 transition-colors " +
        (ativo ? "bg-raise" : "hover:bg-raise") +
        (arquivada ? " opacity-60" : "")
      }
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVoto();
        }}
        aria-pressed={votou}
        aria-label={votou ? "Remover voto" : "Votar na ideia"}
        className={
          "flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-[6px] border transition-colors " +
          (votou
            ? "border-gold bg-gold-wash text-gold-ink"
            : "border-line text-ink-muted hover:border-line-strong")
        }
      >
        <IconChevronUp className={votou ? "text-gold" : ""} />
        <span
          className="mt-0.5 text-[12px] leading-none"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {i.votos.length}
        </span>
      </button>
      <button
        type="button"
        onClick={onAbrir}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-ink">
            {i.titulo}
          </p>
          {virou ? (
            <span className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-[1px] font-mono text-[11px] leading-[14px] text-ink-faint">
              <IconCornerDown />
              virou card
            </span>
          ) : null}
          {arquivada ? <Tag>arquivada</Tag> : null}
        </div>
        <p className="mt-1 line-clamp-1 text-[12px] leading-4 text-ink-muted">
          {i.corpo}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Tag className="capitalize">{i.categoria}</Tag>
          <span className="meta-11 text-ink-faint">
            {tempoRelativo(i.criadaEm)}
          </span>
        </div>
      </button>
    </li>
  );
}

function ThreadPanel({
  i,
  comentarios,
  card,
  onFechar,
  onVoto,
  onComentar,
  onVirarCard,
}: {
  i: Ideia;
  comentarios: Comentario[];
  card: Card | null;
  onFechar: () => void;
  onVoto: () => void;
  onComentar: (corpo: string) => void;
  onVirarCard: () => void;
}) {
  const [rascunho, setRascunho] = useState("");
  const autor = membroPorId(i.autorId);
  const votou = i.votos.includes(USUARIO_ATUAL);
  const podeVirar = i.status === "aberta";

  return (
    <aside
      className="sticky top-24 h-fit min-w-0 rounded-[10px] border border-line bg-canvas"
      aria-label={`Thread de ${i.titulo}`}
    >
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="meta text-ink-faint">Ideia</p>
          <h2 className="mt-0.5 text-[14px] font-medium leading-5 text-ink">
            {i.titulo}
          </h2>
        </div>
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-faint hover:bg-raise"
        >
          <IconClose />
        </button>
      </header>

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 text-[13px]">
          <Avatar membro={autor} size={20} />
          <span className="text-ink">{autor.nome.split(" ")[0]}</span>
          <span className="meta-11 text-ink-faint">
            {dataCurta(i.criadaEm)}
          </span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-5 text-ink">
          {i.corpo}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Tag className="capitalize">{i.categoria}</Tag>
          {i.tags.map((t) => (
            <Tag key={t}>#{t}</Tag>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onVoto}
            aria-pressed={votou}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-[6px] border px-2.5 text-[13px] transition-colors " +
              (votou
                ? "border-gold bg-gold-wash text-gold-ink"
                : "border-line text-ink hover:bg-raise")
            }
          >
            <IconChevronUp className={votou ? "text-gold" : ""} />
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {i.votos.length}
            </span>
            <span>{votou ? "votado" : "votar"}</span>
          </button>
          {podeVirar ? (
            <Button variant="secondary" onClick={onVirarCard}>
              Virar card
            </Button>
          ) : null}
          {card ? (
            <Link
              to="/kanban"
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-line px-2.5 text-[13px] text-ink hover:bg-raise"
            >
              <IconExternal />
              Card: {card.titulo.slice(0, 24)}
              {card.titulo.length > 24 ? "…" : ""}
            </Link>
          ) : null}
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
                      <span className="text-[13px] text-ink">
                        {m.nome.split(" ")[0]}
                      </span>
                      <span className="meta-11 text-ink-faint">
                        {dataCurta(c.criadoEm)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-5 text-ink">
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
            Publicar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="ni-tit">Título</Label>
          <Input
            id="ni-tit"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Uma linha, direto ao ponto."
          />
        </div>
        <div>
          <Label htmlFor="ni-corpo">Descrição</Label>
          <Textarea
            id="ni-corpo"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="Contexto, quem pediu, por que agora."
            rows={5}
          />
        </div>
        <div>
          <Label htmlFor="ni-cat">Categoria</Label>
          <select
            id="ni-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value as Categoria)}
            className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function VirarCardModal({
  ideia,
  onClose,
  onConfirmar,
}: {
  ideia: Ideia;
  onClose: () => void;
  onConfirmar: (titulo: string, cat: Categoria) => void;
}) {
  const [titulo, setTitulo] = useState(ideia.titulo);
  const [cat, setCat] = useState<Categoria>(ideia.categoria);
  return (
    <Modal
      open
      onClose={onClose}
      titulo="Virar card"
      descricao="Cria um card em Planejado, ligado a esta ideia."
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!titulo.trim()}
            onClick={() => onConfirmar(titulo.trim(), cat)}
          >
            Criar card
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="vc-tit">Título do card</Label>
          <Input
            id="vc-tit"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="vc-cat">Categoria</Label>
          <select
            id="vc-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value as Categoria)}
            className="block h-9 w-full rounded-[6px] border border-line bg-canvas px-2 text-[13px] text-ink"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
