import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRecursosLista } from "@/lib/recursos-store";
import { useIdeias } from "@/lib/ideias-store";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Button, Input, Label, Modal, Tag, useToast } from "@/components/ui";
import { useTema } from "@/lib/tema";
import { supabase } from "@/lib/supabase";
import {
  useCategorias,
  adicionarCategoria,
  renomearCategoria,
  removerCategoria,
  mudarCorCategoria,
  CORES_DISPONIVEIS,
  obterEstiloCategoria,
  hexToRgba,
  type CorCategoria,
} from "@/lib/categorias";
import {
  useRotulos,
  adicionarRotulo,
  renomearRotulo,
  removerRotulo,
  mudarCorRotulo,
} from "@/lib/rotulos";
import { IconPlus, IconClose } from "@/components/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/config")({
  head: () => ({
    meta: [
      { title: "Config — Hub" },
      { name: "description", content: "Preferências do time." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const { tema, trocar } = useTema();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  
  const nomeUsuario = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const emailUsuario = user?.email || "";
  const iniciaisUsuario = nomeUsuario.slice(0, 2).toUpperCase();

  const [nomeInput, setNomeInput] = useState(nomeUsuario);
  const [salvandoNome, setSalvandoNome] = useState(false);

  async function handleSalvarNome() {
    if (!nomeInput.trim() || nomeInput === nomeUsuario) return;
    setSalvandoNome(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nomeInput.trim() }
      });
      if (error) throw error;
      push({ titulo: "Perfil atualizado", descricao: "Nome alterado com sucesso." });
      // Reload is required because session info in context doesn't always automatically reflect metadata immediately without a refresh or deep state update.
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      console.error(err);
      push({ titulo: "Erro", descricao: "Não foi possível alterar o nome." });
    } finally {
      setSalvandoNome(false);
    }
  }

  const membroAtualMock = {
    id: user?.id || "mock",
    nome: nomeUsuario,
    iniciais: iniciaisUsuario,
    avatar: user?.user_metadata?.avatar_url || "",
    papel: "admin"
  };

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
          <Avatar membro={membroAtualMock} size={32} />
          <div>
            <p className="text-[13px] font-medium text-ink">
              {nomeUsuario}
            </p>
            <p className="meta-11 text-ink-faint">
              {emailUsuario}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1 max-w-[320px]">
            <Label htmlFor="cf-nome">Nome</Label>
            <Input
              id="cf-nome"
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSalvarNome();
              }}
            />
          </div>
          <Button 
            variant="primary" 
            onClick={handleSalvarNome} 
            disabled={salvandoNome || !nomeInput.trim() || nomeInput === nomeUsuario}
          >
            {salvandoNome ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </section>

      {/* Tema */}
      <section className="mt-10">
        <h2 className="eyebrow mb-3">Tema</h2>
        <div className="w-[60px] h-[78px]">
          <label className="switch scale-[0.4] origin-top-left">
            <input
              type="checkbox"
              checked={tema === "claro"}
              onChange={(e) => trocar(e.target.checked ? "claro" : "escuro")}
            />
            <div className="button">
              <div className="light"></div>
              <div className="dots"></div>
              <div className="characters"></div>
              <div className="shine"></div>
              <div className="shadow"></div>
            </div>
          </label>
        </div>
      </section>

      {/* Categorias */}
      <section className="mt-10">
        <CategoriasSecao />
      </section>

      {/* Rótulos */}
      <section className="mt-10">
        <RotulosSecao />
      </section>

      {/* Sair */}
      <section className="mt-10 border-t border-line pt-6 mb-12">
        <Button variant="danger" onClick={signOut}>
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
  const recursosBase = useRecursosLista();

  const contagens = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recursosBase) {
      m.set(r.categoria, (m.get(r.categoria) ?? 0) + 1);
    }
    return m;
  }, [recursosBase]);

  const paraDeletar = categorias.find((c) => c.id === confirmando);
  const afetados = confirmando
    ? recursosBase.filter((r) => r.categoria === confirmando)
    : [];

  return (
    <>
      <h2 className="eyebrow">Categorias</h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Personalize nomes e cores. Renomear preserva os recursos existentes.
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

              <div className="ml-auto flex items-center gap-2">
                <ColorPicker
                  atual={c.cor}
                  onEscolher={(cor) => mudarCorCategoria(c.id, cor)}
                />
                {emEdicao ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditando(null)}>
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
          paraDeletar ? `"${paraDeletar.nome}" será removida das opções.` : ""
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
          <p className="text-[13px] text-ink">
            Nenhum recurso usa esta categoria.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-ink">
              {afetados.length}{" "}
              {afetados.length === 1 ? "recurso está" : "recursos estão"}{" "}
              categorizados como <b>{paraDeletar?.nome}</b>. Eles continuarão
              existindo, mas ficarão sem categoria válida.
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
  const [customHex, setCustomHex] = useState(
    atual.startsWith("#") ? atual : "#3B82F6",
  );

  const estiloAtual = obterEstiloCategoria(atual);

  const aplicarCustom = () => {
    let hex = customHex.trim();
    if (!hex.startsWith("#")) hex = `#${hex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^#[0-9A-Fa-f]{3}$/.test(hex)) {
      onEscolher(hex);
      setAberto(false);
    }
  };

  const hexPreview = customHex.trim().startsWith("#")
    ? customHex.trim()
    : `#${customHex.trim()}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Trocar cor da categoria"
        className={cn(
          "inline-flex h-6 items-center gap-1.5 rounded-[4px] border px-2 text-[11px] font-mono transition-all hover:opacity-90 capitalize",
          estiloAtual.className,
        )}
        style={estiloAtual.style}
      >
        <span
          className="h-2 w-2 rounded-full border border-black/20 shrink-0"
          style={{
            backgroundColor: atual.startsWith("#")
              ? atual
              : (CORES_DISPONIVEIS.find((c) => c.id === atual)?.hex ?? "#888"),
          }}
        />
        <span>{atual}</span>
      </button>

      {aberto ? (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setAberto(false)}
          />

          <div className="absolute right-0 top-8 z-30 w-64 rounded-lg border border-line bg-canvas p-3 shadow-float animate-in fade-in zoom-in-95 duration-100">
            <p className="meta-11 font-semibold text-ink-muted mb-2">
              Paleta de Cores
            </p>

            {/* Grid de Presets */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {CORES_DISPONIVEIS.map((p) => {
                const est = obterEstiloCategoria(p.id);
                const isSelected = atual === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.nome}
                    onClick={() => {
                      onEscolher(p.id);
                      setAberto(false);
                    }}
                    className={cn(
                      "relative flex h-6 w-full items-center justify-center rounded-[4px] border transition-transform hover:scale-105",
                      est.className,
                      isSelected ? "ring-2 ring-gold ring-offset-1" : "",
                    )}
                    style={est.style}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line pt-2.5">
              <p className="meta-11 font-semibold text-ink-muted mb-1.5">
                Cor Personalizada (Hex)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(hexPreview)
                      ? hexPreview
                      : "#3B82F6"
                  }
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border border-line bg-transparent p-0"
                  title="Escolher no seletor"
                />
                <Input
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  placeholder="#3B82F6"
                  className="h-7 text-[12px] font-mono uppercase"
                />
                <Button
                  variant="primary"
                  className="h-7 px-2.5 text-[11px] shrink-0"
                  onClick={aplicarCustom}
                >
                  Aplicar
                </Button>
              </div>

              {/* Prévia do Tag */}
              <div className="mt-2.5 flex items-center justify-between rounded bg-raise px-2.5 py-1.5">
                <span className="meta-11 text-ink-faint">Prévia:</span>
                <span
                  className="inline-flex items-center rounded-full border px-2 py-[1px] font-mono text-[11px] font-medium uppercase"
                  style={{
                    backgroundColor: hexToRgba(hexPreview, 0.15),
                    borderColor: hexToRgba(hexPreview, 0.45),
                    color: hexPreview,
                  }}
                >
                  Exemplo
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RotulosSecao() {
  const rotulos = useRotulos();
  const recursosLocais = useRecursosLista();
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const ideiasBase = useIdeias();

  const contagens = useMemo(() => {
    const m = new Map<string, number>();
    for (const rot of rotulos) {
      const id = rot.id;
      const keyStr = rot.id.toLowerCase();
      const nomeStr = rot.nome.toLowerCase();

      let total = 0;
      for (const r of recursosLocais) {
        if (
          r.rotulo?.toLowerCase() === keyStr ||
          r.rotulo?.toLowerCase() === nomeStr ||
          r.tags?.some(
            (t) => t.toLowerCase() === keyStr || t.toLowerCase() === nomeStr,
          )
        ) {
          total += 1;
        }
      }
      for (const i of ideiasBase) {
        if (
          i.tags?.some(
            (t) => t.toLowerCase() === keyStr || t.toLowerCase() === nomeStr,
          )
        ) {
          total += 1;
        }
      }
      m.set(id, total);
    }
    return m;
  }, [rotulos, recursosLocais, ideiasBase]);

  const paraDeletar = rotulos.find((r) => r.id === confirmando);
  const afetadosRecursos =
    confirmando && paraDeletar
      ? recursosLocais.filter(
          (r) =>
            r.rotulo?.toLowerCase() === paraDeletar.id.toLowerCase() ||
            r.rotulo?.toLowerCase() === paraDeletar.nome.toLowerCase() ||
            r.tags?.some(
              (t) =>
                t.toLowerCase() === paraDeletar.id.toLowerCase() ||
                t.toLowerCase() === paraDeletar.nome.toLowerCase(),
            ),
        )
      : [];
  const afetadosIdeias =
    confirmando && paraDeletar
      ? ideiasBase.filter((i) =>
          i.tags?.some(
            (t) =>
              t.toLowerCase() === paraDeletar.id.toLowerCase() ||
              t.toLowerCase() === paraDeletar.nome.toLowerCase(),
          ),
        )
      : [];
  const totalAfetados = afetadosRecursos.length + afetadosIdeias.length;

  return (
    <>
      <h2 className="eyebrow">Rótulos (Tags)</h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Adicione, edite e remova rótulos (tags) usados para organizar recursos e
        ideias.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Input
          placeholder="Nome do novo rótulo"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          className="max-w-[280px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && novoNome.trim()) {
              adicionarRotulo(novoNome.trim());
              setNovoNome("");
            }
          }}
        />
        <Button
          variant="primary"
          disabled={!novoNome.trim()}
          onClick={() => {
            adicionarRotulo(novoNome.trim());
            setNovoNome("");
          }}
        >
          <IconPlus />
          Adicionar
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-line rounded-[10px] border border-line bg-canvas">
        {rotulos.map((r) => {
          const emEdicao = editando === r.id;
          const qtd = contagens.get(r.id) ?? 0;
          return (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <Tag tone="rotulo" rotuloId={r.id} pill className="uppercase">
                {r.nome}
              </Tag>
              {emEdicao ? (
                <Input
                  value={nomeEdit}
                  autoFocus
                  onChange={(e) => setNomeEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renomearRotulo(r.id, nomeEdit);
                      setEditando(null);
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                  className="max-w-[220px]"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ink">{r.nome}</span>
                  {r.fixo && (
                    <span className="meta-11 rounded border border-line bg-raise px-1.5 py-0.5 text-ink-muted">
                      Rótulo fixo
                    </span>
                  )}
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <ColorPicker
                  atual={r.cor}
                  onEscolher={(cor) => mudarCorRotulo(r.id, cor)}
                />
                {r.fixo ? (
                  <span className="meta-11 text-ink-faint px-2 italic">
                    Sistema
                  </span>
                ) : emEdicao ? (
                  <>
                    <Button variant="ghost" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        renomearRotulo(r.id, nomeEdit);
                        setEditando(null);
                      }}
                    >
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(r.id);
                        setNomeEdit(r.nome);
                      }}
                      className="meta-11 rounded-[4px] px-2 py-1 text-ink-muted hover:bg-raise hover:text-ink cursor-pointer"
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(r.id)}
                      className="meta-11 rounded-[4px] px-2 py-1 text-ink-muted hover:bg-raise hover:text-[#B23A3A] cursor-pointer"
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
        titulo="Deletar rótulo"
        descricao={
          paraDeletar ? `"${paraDeletar.nome}" será removido das opções.` : ""
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
                if (confirmando) removerRotulo(confirmando);
                setConfirmando(null);
              }}
            >
              Deletar mesmo assim
            </Button>
          </>
        }
      >
        {totalAfetados === 0 ? (
          <p className="text-[13px] text-ink">
            Nenhum recurso ou ideia utiliza este rótulo.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-ink">
              {totalAfetados}{" "}
              {totalAfetados === 1 ? "item possui" : "itens possuem"} o rótulo{" "}
              <b>{paraDeletar?.nome}</b>.
            </p>
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-[6px] border border-line bg-raise p-2">
              {afetadosRecursos.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 text-[12.5px] text-ink"
                >
                  <span className="text-[10px] uppercase font-mono px-1 rounded bg-line text-ink-muted shrink-0">
                    Recurso
                  </span>
                  <span className="truncate">{r.titulo}</span>
                </li>
              ))}
              {afetadosIdeias.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-2 text-[12.5px] text-ink"
                >
                  <span className="text-[10px] uppercase font-mono px-1 rounded bg-line text-ink-muted shrink-0">
                    Ideia
                  </span>
                  <span className="truncate">{i.titulo}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
