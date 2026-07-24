import { useState, useEffect } from "react";
import { Link, useRouterState, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Github, ExternalLink, Pencil, Check, X, LogOut } from "lucide-react";
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
  IconBell,
  MaisaLogoIcon,
} from "@/components/icons";
import { useCardsState } from "@/lib/cards-store";
import { useIdeias } from "@/lib/ideias-store";
import { useRecursosLista } from "@/lib/recursos-store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import type { ReactNode } from "react";

type SubItem = {
  to: "/acervo" | "/acervo/atas" | "/acervo/mural";
  label: string;
  icone: ReactNode;
};

type SidebarProps = {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
};

/**
 * Sidebar — 200px navy. Barra de ouro layoutId="active-bar".
 * <1024px colapsa para 56px, só ícones.
 * Acervo é um accordion com sub-abas: Todos / Atas / Mural.
 */
export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  
  const nomeUsuario = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const avatarUsuario = user?.user_metadata?.avatar_url || "";
  
  const acervoAtivo = pathname === "/acervo" || pathname.startsWith("/acervo/");
  const [acervoAberto, setAcervoAberto] = useState(acervoAtivo);

  const cardsStore = useCardsState();
  const minhasTasksCount = cardsStore.filter(
    (c) =>
      !c.arquivado &&
      (c.responsaveisIds?.includes(user?.id || '') || c.responsavelId === user?.id) &&
      c.coluna !== "feito" &&
      c.coluna !== "validado",
  ).length;

  const ideiasLista = useIdeias();
  const recursosStore = useRecursosLista();

  const subAcervo: SubItem[] = [
    { to: "/acervo", label: "Todos", icone: <IconList /> },
    { to: "/acervo/atas", label: "Atas", icone: <IconAta /> },
    { to: "/acervo/mural", label: "Mural", icone: <IconImage /> },
  ];

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col bg-navy text-white transition-[width] duration-300",
        "w-[56px] lg:w-[240px] 2xl:w-[280px]",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-3 lg:px-4">
        <MaisaLogoIcon size={30} className="shrink-0" />
        <span className="hidden text-[15px] font-black tracking-wider text-white lg:inline uppercase font-sans">
          MAISA HUB
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
                className="absolute -left-2 top-1.5 h-5 w-[2px] bg-gold"
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
                  {recursosStore.length}
                </span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setAcervoAberto((v) => !v);
                }}
                aria-expanded={acervoAberto}
                aria-label={
                  acervoAberto ? "Recolher Acervo" : "Expandir Acervo"
                }
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
            contagem={cardsStore.length}
            ativo={pathname.startsWith("/kanban")}
          />
          <ItemLink
            to="/ideias"
            label="Ideias"
            icone={<IconBulb />}
            contagem={
              ideiasLista.filter(
                (i) =>
                  i.status === "nova" ||
                  i.status === "em_discussao" ||
                  i.status === "aberta",
              ).length
            }
            ativo={pathname.startsWith("/ideias")}
          />
          <ItemLink
            to="/alertas"
            label="Alertas"
            icone={<IconBell />}
            contagem={minhasTasksCount}
            ativo={pathname.startsWith("/alertas")}
          />
        </ul>
      </nav>

      {/* Card de Atalho GitHub (Amarelo) */}
      <GithubShortcutCard />

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
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar 
              membro={{
                nome: nomeUsuario,
                iniciais: nomeUsuario.slice(0, 2).toUpperCase(),
                avatarUrl: avatarUsuario,
              }} 
              size={24} 
            />
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-[12px] font-medium text-white">
                {nomeUsuario}
              </p>
              <p className="meta-11 truncate text-white/50">Poli Júnior</p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sair / SSO Login"
            aria-label="Sair da conta"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-white/50 hover:bg-navy-2 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
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
  to: "/" | "/kanban" | "/ideias" | "/alertas";
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
          className="absolute -left-2 top-1.5 h-5 w-[2px] bg-gold"
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

function GithubShortcutCard() {
  const DEFAULT_URL = "https://github.com/helisul/monorepo";
  const [url, setUrl] = useState(DEFAULT_URL);
  const [tempUrl, setTempUrl] = useState(DEFAULT_URL);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hub_github_url");
    if (saved) {
      setUrl(saved);
      setTempUrl(saved);
    }
  }, []);

  const salvar = () => {
    let finalUrl = tempUrl.trim();
    if (
      finalUrl &&
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://")
    ) {
      finalUrl = `https://${finalUrl}`;
    }
    if (finalUrl) {
      setUrl(finalUrl);
      localStorage.setItem("hub_github_url", finalUrl);
    }
    setEditando(false);
  };

  const extrairNome = (u: string) => {
    try {
      const parsed = new URL(u);
      return parsed.pathname.replace(/^\//, "") || parsed.hostname;
    } catch {
      return u.replace(/^https?:\/\//, "");
    }
  };

  return (
    <div className="mb-3 px-2">
      {/* Colapsado (<1024px) */}
      <div className="block lg:hidden">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Atalho GitHub do Projeto"
          className="press flex h-9 w-full items-center justify-center rounded-lg bg-gold text-navy shadow-xs transition-all hover:bg-gold/90"
        >
          <Github size={18} />
        </a>
      </div>

      {/* Expansivo (>=1024px) */}
      <div className="hidden lg:block">
        <div className="ShortcutCard p-3 shadow-sm border border-gold/50">
          <div className="relative z-10 w-full flex flex-col">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ffd277] text-[rgba(0,0,0,0.842)] shadow-xs">
                  <Github size={15} />
                </span>
                <div className="min-w-0 flex-1 text-[#ffd277]">
                  <p className="text-[12px] font-bold leading-tight truncate">
                    GitHub
                  </p>
                  <p className="text-[10.5px] leading-tight truncate opacity-80 font-medium">
                    {extrairNome(url)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (editando) {
                    setTempUrl(url);
                    setEditando(false);
                  } else {
                    setTempUrl(url);
                    setEditando(true);
                  }
                }}
                aria-label={
                  editando ? "Cancelar edição" : "Editar link do GitHub"
                }
                title={editando ? "Cancelar" : "Editar link"}
                className="press flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#ffd277]/60 hover:bg-white/10 hover:text-[#ffd277] transition-colors"
              >
                {editando ? <X size={13} /> : <Pencil size={13} />}
              </button>
            </div>

            {/* Form editando or Link de acesso */}
            {editando ? (
              <div className="mt-2.5 flex flex-col gap-1.5">
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-[11px] text-[#ffd277] placeholder:text-white/40 focus:border-[#ffd277] focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvar();
                    if (e.key === "Escape") {
                      setTempUrl(url);
                      setEditando(false);
                    }
                  }}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={salvar}
                    className="press flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-[#ffd277] h-6 text-[11px] font-semibold text-black hover:bg-[#ffd277]/90 transition-colors"
                  >
                    <Check size={12} />
                    <span>Salvar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempUrl(url);
                      setEditando(false);
                    }}
                    className="press inline-flex items-center justify-center rounded-md border border-white/20 h-6 px-2 text-[11px] font-medium text-[#ffd277] hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-[#ffd277]/10 px-3 text-[11.5px] font-semibold text-[#ffd277] shadow-xs transition-all hover:bg-[#ffd277]/20 border border-[#ffd277]/20"
                >
                  <span>Acessar Repositório</span>
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
