import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { MaisaLogoIcon } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";

const loginSearch = z.object({
  erro: z.enum(["dominio"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearch,
  head: () => ({
    meta: [
      { title: "Login SSO — Maisa Hub" },
      {
        name: "description",
        content:
          "Acesso restrito para membros da Poli Júnior (@polijunior.com.br).",
      },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [carregando, setCarregando] = useState(false);
  const [erroDominio, setErroDominio] = useState<string | null>(
    search.erro === "dominio"
      ? "Este e-mail não pertence ao domínio @polijunior.com.br."
      : null,
  );

  const DOMINIO_OFICIAL = "@polijunior.com.br";

  const { signInWithGoogle, session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session?.user) {
      navigate({ to: (search.redirect as never) || "/" });
    }
  }, [loading, session, navigate, search.redirect]);

  async function handleLoginGoogleSSO() {
    setErroDominio(null);
    setCarregando(true);
    await signInWithGoogle();
    setCarregando(false);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-6 py-12">
      <div className="w-full max-w-[380px]">
        {/* Header / Logo */}
        <div className="flex items-center gap-2.5">
          <MaisaLogoIcon size={36} className="shrink-0" />
          <div>
            <span className="text-[16px] font-black tracking-wider text-white uppercase font-sans">
              MAISA HUB
            </span>
            <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-gold uppercase">
              POLI JÚNIOR
            </span>
          </div>
        </div>

        {/* Título em Instrument Serif */}
        <h1
          className="mt-10 text-[32px] leading-[38px] text-white font-normal"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Tudo do projeto, em um lugar só.
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-[#8892A4]">
          Acesso exclusivo via Single Sign-On (SSO) do Google Workspace para
          contas{" "}
          <strong className="text-white font-medium">@polijunior.com.br</strong>
          .
        </p>

        {/* Single SSO Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleLoginGoogleSSO}
            disabled={carregando}
            className={
              "flex h-12 w-full items-center justify-center gap-3 rounded-[8px] bg-white px-4 text-[14px] font-semibold text-zinc-900 transition-all duration-150 cursor-pointer shadow-md " +
              "hover:bg-zinc-100 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            }
          >
            {carregando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                <span>Autenticando SSO Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>Entrar com Google SSO</span>
              </>
            )}
          </button>
        </div>

        {/* Mensagem de Erro de Domínio */}
        {erroDominio ? (
          <div
            role="alert"
            className="mt-4 rounded-[8px] border border-red-500/40 bg-red-950/40 p-3 text-[12.5px] text-red-200 leading-relaxed shadow-sm animate-in fade-in"
          >
            <div className="flex items-start gap-2">
              <span className="text-red-400 font-bold shrink-0">⚠️</span>
              <div>
                <p className="font-semibold text-red-300">Acesso negado</p>
                <p className="mt-0.5 text-[12px] text-red-200/90">
                  {erroDominio}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-14 text-center text-[11px] text-[#4A5468]">
          <p>© Poli Júnior — Escola Politécnica da USP</p>
          <p className="mt-0.5 font-mono text-[10px]">polijunior.com.br</p>
        </footer>
      </div>
    </div>
  );
}
