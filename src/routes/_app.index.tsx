import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, KanbanSquare, ClipboardList, Star } from "lucide-react";
import { recursos, cards, atividades, membros } from "@/mocks";
import { Avatar } from "@/components/ui";
import {
  IconChevronRight,
  IconFile,
  IconLink,
  IconDoc,
  IconAta,
} from "@/components/icons";
import { tempoRelativo } from "@/lib/tempo";
import type { Recurso } from "@/types";

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
  if (r.rotulo === "Ata") return <IconAta />;
  if (r.tipo === "link") return <IconLink />;
  if (r.corpo) return <IconDoc />;
  return <IconFile />;
}

function membroPorId(id: string) {
  return membros.find((m) => m.id === id) ?? membros[0];
}

function InicioPage() {
  // Derivações a partir dos mocks.
  const prdFixado = recursos.find((r) => r.fixado);
  const cardsFazendo = cards.filter((c) => c.coluna === "fazendo").length;
  const atas = recursos
    .filter((r) => r.rotulo === "Ata")
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm).getTime() -
        new Date(a.atualizadoEm).getTime(),
    );
  const ultimaAta = atas[0];

  const favoritos: Recurso[] = [...recursos]
    .sort((a, b) => b.favoritoPor.length - a.favoritoPor.length)
    .slice(0, 3);

  const atividadeRecente = [...atividades]
    .sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-12">
      {/* Cabeçalho */}
      <div>
        <p className="eyebrow">Início</p>
        <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
          Bem-vinda de volta, Rafaela.
        </h1>
      </div>

      {/* Continuar */}
      <section>
        <p className="eyebrow inline-flex items-center gap-2">
          <span className="dot-neon" aria-hidden="true" />
          Continuar
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {prdFixado ? (
            <ContinuarCard
              icone={<FileText size={28} strokeWidth={1.75} />}
              rotulo="PRD fixado"
              titulo={prdFixado.titulo}
              meta={`atualizado ${tempoRelativo(prdFixado.atualizadoEm)}`}
              to="/acervo"
              search={{ id: prdFixado.id }}
            />
          ) : null}
          <ContinuarCard
            icone={<KanbanSquare size={28} strokeWidth={1.75} />}
            rotulo="Sprint atual"
            titulo={
              cardsFazendo > 0
                ? `${cardsFazendo} ${cardsFazendo === 1 ? "card" : "cards"} em Fazendo`
                : "Nada em Fazendo"
            }
            meta="Kanban"
            to="/kanban"
          />
          {ultimaAta ? (
            <ContinuarCard
              icone={<ClipboardList size={28} strokeWidth={1.75} />}
              rotulo="Última ata"
              titulo={ultimaAta.titulo}
              meta={tempoRelativo(ultimaAta.atualizadoEm)}
              to="/acervo"
              search={{ id: ultimaAta.id }}
            />
          ) : null}
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
            Ver todos
          </Link>
        </div>
        {favoritos.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">
            Nada favoritado ainda.
          </p>
        ) : (
          <ul className="stagger mt-3 divide-y divide-line rounded-[10px] border border-line bg-canvas">
            {favoritos.map((r) => (
              <li key={r.id}>
                <Link
                  to="/acervo"
                  search={{ id: r.id } as never}
                  className="group flex h-10 items-center gap-3 px-3 hover:bg-raise"
                >
                  <span className="text-ink-faint">{iconePorRecurso(r)}</span>
                  <span className="flex-1 truncate text-[13px] text-ink">
                    {r.titulo}
                  </span>
                  <span
                    className="star-twinkle inline-flex text-gold"
                    style={{ animationDelay: `${favoritos.indexOf(r) * 220}ms` }}
                    aria-label="Favorito"
                  >
                    <Star size={14} strokeWidth={1.75} fill="currentColor" />
                  </span>
                  <span className="meta-11 text-ink-faint">
                    {r.favoritoPor.length}
                  </span>
                  <span className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
                    <IconChevronRight />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Atividade */}
      <section>
        <p className="eyebrow">Atividade</p>
        {atividadeRecente.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">Sem atividade.</p>
        ) : (
          <ul className="stagger mt-3 space-y-2">
            {atividadeRecente.map((a) => {
              const autor = membroPorId(a.autorId);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2.5 text-[13px] text-ink"
                >
                  <Avatar membro={autor} size={20} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ink">{autor.nome.split(" ")[0]}</span>{" "}
                    <span className="text-ink-muted">
                      {a.verbo}{" "}
                      {a.alvoTipo === "card"
                        ? "card"
                        : a.alvoTipo === "ideia"
                          ? "ideia"
                          : "recurso"}{" "}
                    </span>
                    <span className="text-ink">{a.alvoTitulo}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
}: {
  icone: React.ReactNode;
  rotulo: string;
  titulo: string;
  meta: string;
  to: string;
  search?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to as never}
      search={search as never}
      className="card-hover press group flex flex-col justify-between rounded-[10px] bg-canvas p-4 hover:bg-raise"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-raise text-ink"
        >
          {icone}
        </span>
        <span className="meta-11 text-ink-faint">{rotulo}</span>
      </div>
      <p className="mt-6 line-clamp-2 text-[14px] font-medium leading-5 text-ink">
        {titulo}
      </p>
      <p className="meta mt-3 text-ink-faint">{meta}</p>
    </Link>
  );
}
