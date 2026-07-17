import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PaginaAcervo } from "@/components/acervo/pagina";

const search = z.object({
  cat: z.string().optional(),
  fav: z.union([z.literal(1), z.literal(0)]).optional(),
  sort: z.enum(["recente", "titulo"]).optional(),
  id: z.string().optional(),
});

export const Route = createFileRoute("/_app/acervo/mural")({
  validateSearch: search,
  head: () => ({
    meta: [{ title: "Mural — Acervo" }],
  }),
  component: AcervoMural,
});

function AcervoMural() {
  const sp = Route.useSearch();
  return <PaginaAcervo sub="mural" sp={sp} rota="/acervo/mural" />;
}
