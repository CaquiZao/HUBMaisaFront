import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PaginaAcervo } from "@/components/acervo/pagina";

const search = z.object({
  q: z.string().optional(),
  tipo: z.enum(["arquivo", "link", "imagem"]).optional(),
  cat: z.string().optional(),
  rot: z.string().optional(),
  fav: z.union([z.literal(1), z.literal(0)]).optional(),
  sort: z.enum(["recente", "titulo"]).optional(),
  id: z.string().optional(),
});

export const Route = createFileRoute("/_app/acervo/")({
  validateSearch: search,
  component: AcervoTodos,
});

function AcervoTodos() {
  const sp = Route.useSearch();
  return <PaginaAcervo sub="todos" sp={sp} rota="/acervo" />;
}
