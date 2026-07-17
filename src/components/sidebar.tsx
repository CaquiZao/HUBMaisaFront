import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui";
import {
  IconArchive,
  IconBulb,
  IconHome,
  IconKanban,
  IconSettings,
  IconChevronRight,
  IconAta,
  IconImage,
  IconList,
} from "@/components/icons";
import { cards, ideias, membroAtual, recursos } from "@/mocks";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SubItem = {
  to: "/acervo" | "/acervo/atas" | "/acervo/mural";
  label: string;
  icone: ReactNode;
};

/**
 * Sidebar — 200px navy. Barra de ouro layoutId="active-bar".
 * <1024px colapsa para 56px, só ícones.
 * Acervo é um accordion com sub-abas: Todos / Atas / Mural.
 */
export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const acervoAtivo = pathname === "/acervo" || pathname.startsWith("/acervo/");
  const [acervoAberto, setAcervoAberto] = useState(acervoAtivo);

  const subAcervo: SubItem[] = [
    { to: "/acervo", label: "Todos", icone: <IconList /> },
    { to: "/acervo/atas", label: "Atas", icone: <IconAta /> },
    { to: "/acervo/mural", label: "Mural", icone: <IconImage /> },
  ];

  return (
    <aside
      className={cn(
        "flex h-dvh shrink-0 flex-col bg-navy text-white",
        "w-[56px] lg:w-[200px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-3 lg:px-4">
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-gold"
        />
        <span className="hidden text-[13px] font-medium tracking-tight text-white lg:inline">
          Hub
        </span>
      </div>

      <nav className="mt-2 flex-1 px-2" aria-label="Navegação principal">
        <ul className="flex flex-col gap-0.5">
          <ItemLink
            to="/"
            label="Início"
            icone={<IconHome />}
            contagem={0}
            ativo={pathname === "/"}
          />

          {/* Acervo com accordion */}
          <li className="relative">
            {acervoAtivo ? (
              <motion.span
                layoutId="active-bar"
                aria-hidden="true"
                className="absolute -left-2 top-1.5 h-8 w-[2px] bg-gold"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <div className="flex items-center">
              <Link
                to="/acervo"
                aria-current={acervoAtivo ? "page" : undefined}
                onClick={() => setAcervoAberto(true)}
                className={cn(
                  "flex h-8 flex-1 items-center gap-2.5 rounded-[6px] px-2 text-[13px]",
                  "transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]",
                  acervoAtivo
                    ? "bg-navy-3 text-white"
                    : "text-white/70 hover:bg-navy-2 hover:text-white",
                )}
              >
                <span className="shrink-0" aria-hidden="true">
                  <IconArchive />
                </span>
                <span
                  className={cn(
                    "hidden lg:inline",
                    acervoAtivo ? "font-medium" : "font-normal",
                  )}
                >
                  Acervo
                </span>
                <span
                  className={cn(
                    "meta-11 ml-auto hidden lg:inline",
                    acervoAtivo ? "text-white/80" : "text-white/50",
                  )}
                >
                  {recursos.length}
                </span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setAcervoAberto((v) => !v);
                }}
                aria-expanded={acervoAberto}
                aria-label={acervoAberto ? "Recolher Acervo" : "Expandir Acervo"}
                className={cn(
                  "hidden h-8 w-6 shrink-0 items-center justify-center rounded-[4px] text-white/60 hover:bg-navy-2 hover:text-white lg:inline-flex",
                  "transition-transform",
                )}
              >
                <motion.span
                  animate={{ rotate: acervoAberto ? 90 : 0 }}
                  transition={{ duration: 0.14 }}
                  className="inline-flex"
                >
                  <IconChevronRight />
                </motion.span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {acervoAberto ? (
                <motion.ul
                  key="sub"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                  className="hidden overflow-hidden lg:block"
                >
                  {subAcervo.map((s) => {
                    const ativoSub =
                      s.to === "/acervo"
                        ? pathname === "/acervo"
                        : pathname.startsWith(s.to);
                    return (
                      <li key={s.to} className="mt-0.5">
                        <Link
                          to={s.to}
                          className={cn(
                            "flex h-7 items-center gap-2 rounded-[6px] pl-7 pr-2 text-[12.5px]",
                            ativoSub
                              ? "text-white"
                              : "text-white/60 hover:bg-navy-2 hover:text-white",
                          )}
                        >
                          <span className="opacity-70">{s.icone}</span>
                          <span>{s.label}</span>
                          {ativoSub ? (
                            <span
                              aria-hidden="true"
                              className="ml-auto h-1 w-1 rounded-full bg-gold"
                            />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </li>

          <ItemLink
            to="/kanban"
            label="Kanban"
            icone={<IconKanban />}
            contagem={cards.length}
            ativo={pathname.startsWith("/kanban")}
          />
          <ItemLink
            to="/ideias"
            label="Ideias"
            icone={<IconBulb />}
            contagem={ideias.filter((i) => i.status === "aberta").length}
            ativo={pathname.startsWith("/ideias")}
          />
        </ul>
      </nav>

      <div className="border-t border-white/10 px-2 py-3">
        <Link
          to="/config"
          aria-current={pathname === "/config" ? "page" : undefined}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[13px]",
            "transition-colors duration-[120ms]",
            pathname === "/config"
              ? "bg-navy-3 text-white"
              : "text-white/70 hover:bg-navy-2 hover:text-white",
          )}
        >
          <IconSettings aria-hidden={true} />
          <span className="hidden lg:inline">Config</span>
        </Link>
        <div className="mt-2 flex items-center gap-2 px-2">
          <Avatar membro={membroAtual} size={24} />
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-[12px] font-medium text-white">
              {membroAtual.nome}
            </p>
            <p className="meta-11 truncate text-white/50">Membro</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ItemLink({
  to,
  label,
  icone,
  contagem,
  ativo,
}: {
  to: "/" | "/kanban" | "/ideias";
  label: string;
  icone: ReactNode;
  contagem: number;
  ativo: boolean;
}) {
  return (
    <li className="relative">
      {ativo ? (
        <motion.span
          layoutId="active-bar"
          aria-hidden="true"
          className="absolute -left-2 top-1.5 h-[calc(100%-12px)] w-[2px] bg-gold"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      ) : null}
      <Link
        to={to}
        aria-current={ativo ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[13px]",
          "transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)]",
          ativo
            ? "bg-navy-3 text-white"
            : "text-white/70 hover:bg-navy-2 hover:text-white",
        )}
      >
        <span className="shrink-0" aria-hidden="true">
          {icone}
        </span>
        <span
          className={cn(
            "hidden lg:inline",
            ativo ? "font-medium" : "font-normal",
          )}
        >
          {label}
        </span>
        {contagem > 0 ? (
          <span
            className={cn(
              "meta-11 ml-auto hidden lg:inline",
              ativo ? "text-white/80" : "text-white/50",
            )}
          >
            {contagem}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
