import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { membroAtual, recursos as recursosBase } from "@/mocks";
import { Avatar, Button, Input, Label, Modal, Tag } from "@/components/ui";
import { useTema } from "@/lib/tema";
import {
  useCategorias,
  adicionarCategoria,
  renomearCategoria,
  removerCategoria,
  mudarCorCategoria,
  CORES_DISPONIVEIS,
  PALETA_CATEGORIA,
  type CorCategoria,
} from "@/lib/categorias";
import { IconPlus, IconClose } from "@/components/icons";

export const Route = createFileRoute("/_app/config")({
  head: () => ({
    meta: [
      { title: "Config — Hub" },
      { name: "description", content: "Preferências do time." },
    ],
  }),
  component: ConfigPage,
});

const ATALHOS: { tecla: string; descricao: string }[] = [
  { tecla: "⌘K", descricao: "Abrir busca" },
  { tecla: "/", descricao: "Ir para a busca" },
  { tecla: "C", descricao: "Capturar ideia" },
  { tecla: "G I", descricao: "Ir para Ideias" },
  { tecla: "G A", descricao: "Ir para Acervo" },
  { tecla: "G K", descricao: "Ir para Kanban" },
  { tecla: "G D", descricao: "Ir para Início" },
  { tecla: "Esc", descricao: "Fechar overlay" },
];

function ConfigPage() {
  const { tema, trocar } = useTema();
  const navigate = useNavigate();

  return (
    <div className="max-w-[720px]">
      <header>
        <p className="eyebrow">Config</p>
        <h1 className="mt-1 text-[20px] font-medium leading-7 tracking-[-0.02em] text-ink">
          Preferências
        </h1>
      </header>

      {/* Perfil */}
      <section className="mt-8">
        <h2 className="eyebrow">Perfil</h2>
        <div className="mt-3 flex items-center gap-3">
          <Avatar membro={membroAtual} size={32} />
          <div>
            <p className="text-[13px] font-medium text-ink">{membroAtual.nome}</p>
            <p className="meta-11 text-ink-faint">
              {membroAtual.iniciais.toLowerCase()}@polijunior.com.br
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="cf-nome">Nome</Label>
          <Input id="cf-nome" defaultValue={membroAtual.nome} className="max-w-[320px]" />
        </div>
      </section>

      {/* Tema */}
      <section className="mt-10">
        <h2 className="eyebrow">Tema</h2>
        <div
          role="radiogroup"
          aria-label="Tema da interface"
          className="mt-3 inline-flex rounded-[6px] border border-line p-0.5"
        >
          {(["claro", "escuro"] as const).map((op) => (
            <button
              key={op}
              type="button"
              role="radio"
              aria-checked={tema === op}
              onClick={() => trocar(op)}
              className={
                "h-8 rounded-[4px] px-3 text-[13px] capitalize transition-colors " +
                (tema === op ? "bg-raise text-ink" : "text-ink-muted hover:text-ink")
              }
            >
              {op}
            </button>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="mt-10">
        <CategoriasSecao />
      </section>

      {/* Atalhos */}
      <section className="mt-10">
        <h2 className="eyebrow">Atalhos de teclado</h2>
        <dl className="mt-3 divide-y divide-line rounded-[10px] border border-line bg-canvas">
          {ATALHOS.map((a) => (
            <div key={a.tecla} className="flex items-center justify-between px-3 py-2">
              <dt className="text-[13px] text-ink">{a.descricao}</dt>
              <dd>
                <kbd className="rounded-[4px] border border-line px-1.5 py-[1px] font-mono text-[11px] text-ink-muted">
                  {a.tecla}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sair */}
      <section className="mt-10 border-t border-line pt-6">
        <Button variant="danger" onClick={() => navigate({ to: "/login" })}>
          Sair
        </Button>
      </section>
    </div>
  );
}

function CategoriasSecao() {
  const categorias = useCategorias();
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const contagens = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recursosBase) {
      m.set(r.categoria, (m.get(r.categoria) ?? 0) + 1);
    }
    return m;
  }, []);

  const paraDeletar = categorias.find((c) => c.id === confirmando);
  const afetados = confirmando
    ? recursosBase.filter((r) => r.categoria === confirmando)
    : [];

  return (
    <>
      <h2 className="eyebrow">Categorias</h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Renomear preserva os recursos existentes. Deletar avisa quantos estão vinculados.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Input
          placeholder="Nome da nova categoria"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          className="max-w-[280px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && novoNome.trim()) {
              adicionarCategoria(novoNome.trim());
              setNovoNome("");
            }
          }}
        />
        <Button
          variant="primary"
          disabled={!novoNome.trim()}
          onClick={() => {
            adicionarCategoria(novoNome.trim());
            setNovoNome("");
          }}
        >
          <IconPlus />
          Adicionar
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-line rounded-[10px] border border-line bg-canvas">
        {categorias.map((c) => {
          const emEdicao = editando === c.id;
          const qtd = contagens.get(c.id) ?? 0;
          return (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <Tag tone="categoria" categoria={c.id} pill className="uppercase">
                {c.nome}
              </Tag>
              {emEdicao ? (
                <Input
                  value={nomeEdit}
                  autoFocus
                  onChange={(e) => setNomeEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renomearCategoria(c.id, nomeEdit);
                      setEditando(null);
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                  className="max-w-[220px]"
                />
              ) : (
                <span className="text-[13px] text-ink">{c.nome}</span>
              )}
              <span className="meta-11 text-ink-faint">
                {qtd} {qtd === 1 ? "recurso" : "recursos"}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <ColorPicker
                  atual={c.cor}
                  onEscolher={(cor) => mudarCorCategoria(c.id, cor)}
                />
                {emEdicao ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setEditando(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        renomearCategoria(c.id, nomeEdit);
                        setEditando(null);
                      }}
                    >
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditando(c.id);
                        setNomeEdit(c.nome);
                      }}
                      className="meta-11 rounded-[4px] px-2 py-1 text-ink-muted hover:bg-raise hover:text-ink"
                    >
                      Renomear
                    </button>
                    <button
                      onClick={() => setConfirmando(c.id)}
                      className="meta-11 rounded-[4px] px-2 py-1 text-ink-muted hover:bg-raise hover:text-[#B23A3A]"
                    >
                      Deletar
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!confirmando}
        onClose={() => setConfirmando(null)}
        titulo="Deletar categoria"
        descricao={
          paraDeletar
            ? `"${paraDeletar.nome}" será removida das opções.`
            : ""
        }
        width={480}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmando) removerCategoria(confirmando);
                setConfirmando(null);
              }}
            >
              Deletar mesmo assim
            </Button>
          </>
        }
      >
        {afetados.length === 0 ? (
          <p className="text-[13px] text-ink">Nenhum recurso usa esta categoria.</p>
        ) : (
          <>
            <p className="text-[13px] text-ink">
              {afetados.length}{" "}
              {afetados.length === 1 ? "recurso está" : "recursos estão"} categorizados
              como <b>{paraDeletar?.nome}</b>. Eles continuarão existindo, mas ficarão
              sem categoria válida.
            </p>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-[6px] border border-line bg-raise p-2">
              {afetados.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 text-[12.5px] text-ink"
                >
                  <IconClose className="opacity-0" />
                  <span className="truncate">{r.titulo}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}

function ColorPicker({
  atual,
  onEscolher,
}: {
  atual: CorCategoria;
  onEscolher: (c: CorCategoria) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Trocar cor"
        className={
          "inline-flex h-6 items-center gap-1 rounded-[4px] border px-1.5 text-[11px] " +
          PALETA_CATEGORIA[atual]
        }
      >
        {atual}
      </button>
      {aberto ? (
        <div className="absolute right-0 top-7 z-10 grid grid-cols-4 gap-1 rounded-[6px] border border-line bg-canvas p-1.5 shadow-float">
          {CORES_DISPONIVEIS.map((cor) => (
            <button
              key={cor}
              type="button"
              onClick={() => {
                onEscolher(cor);
                setAberto(false);
              }}
              className={
                "h-6 w-8 rounded-[4px] border " + PALETA_CATEGORIA[cor]
              }
              aria-label={cor}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
