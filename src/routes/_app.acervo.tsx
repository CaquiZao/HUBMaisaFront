import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AcervoSubnav } from "@/components/acervo/pagina";

export const Route = createFileRoute("/_app/acervo")({
  head: () => ({
    meta: [
      { title: "Acervo — Hub" },
      { name: "description", content: "Arquivos, links e imagens do time." },
    ],
  }),
  component: AcervoLayout,
});

function AcervoLayout() {
  return (
    <div>
      <header>
        <p className="eyebrow">Acervo</p>
      </header>
      <div className="mt-4">
        <AcervoSubnav />
      </div>
      <Outlet />
    </div>
  );
}
