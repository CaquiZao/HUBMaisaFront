import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { membroAtual } from "@/mocks";

const loginSearch = z.object({
  erro: z.enum(["dominio"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearch,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { erro } = Route.useSearch();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-navy px-6">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-gold"
          />
          <span className="text-[15px] font-medium tracking-tight text-white">
            Hub
          </span>
        </div>

        {/* Título em Instrument Serif — única tela com serif */}
        <h1
          className="mt-14 text-[34px] leading-[40px] text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Tudo do projeto, em um lugar só.
        </h1>
        <p className="mt-3 text-[13px] text-[#8892A4]">
          Acesso restrito a membros da Poli Júnior.
        </p>

        {/* Botão único, ouro, sem ícone colorido do Google */}
        <button
          onClick={() => {
            // Login fake: identidade já vem de membroAtual dos mocks.
            void membroAtual;
            navigate({ to: "/" });
          }}
          className={
            "mt-8 h-11 w-full rounded-[6px] bg-gold text-[14px] font-medium text-navy " +
            "hover:bg-gold-hover transition-colors duration-[120ms]"
          }
        >
          Entrar com Google
        </button>

        {/* Estado de erro de domínio — copy pronta, sem lógica real.
            Aparece quando /login?erro=dominio. */}
        {erro === "dominio" ? (
          <div
            role="alert"
            className="mt-4 rounded-[6px] border border-[#3A2A2E] bg-[#1A1520] px-3 py-2 text-[12px] text-[#E8B5B5]"
          >
            Este e-mail não é de{" "}
            <span className="font-mono">@polijunior.com.br</span>. Entre com
            uma conta do time.
          </div>
        ) : null}

        <p className="meta-11 mt-14 text-[#4A5468]">polijunior.com.br</p>
      </div>
    </div>
  );
}
