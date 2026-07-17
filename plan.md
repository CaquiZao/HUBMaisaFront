# Downloads de arquivos e upload de imagens no Acervo

Hoje o modal de upload só guarda `nome` e `tamanho` — o binário é descartado, então não dá pra baixar depois. Imagens só aceitam URL. Vamos passar a guardar o conteúdo (como data URL) para permitir download e permitir subir imagem como PNG além de URL.

## Mudanças

### 1. Tipos (`src/types.ts`)
- `Recurso.arquivo`: adicionar `dataUrl?: string` (base64 do arquivo enviado). Mantém compat com mocks existentes que só têm nome/tamanho/mime.
- `Recurso.imagem`: tornar `largura`/`altura` opcionais e adicionar `dataUrl?: string` para imagens carregadas do disco.

### 2. Modal de novo recurso (`src/components/acervo/pagina.tsx`)
- **Arquivo**: no `onChange`/`onDrop`, ler o `File` via `FileReader.readAsDataURL` e guardar `dataUrl` + `mime` no state, além de nome/tamanho.
- **Imagem**: alternador com duas opções — "URL" (comportamento atual) ou "Upload PNG/JPG". No modo upload, dropzone igual ao de arquivo, lê como data URL e mede `naturalWidth/Height` via `Image()` antes de salvar. Aceita `image/png, image/jpeg, image/webp`.
- Ao criar o recurso, persistir `dataUrl` em `arquivo` ou `imagem` conforme o tipo.

### 3. Download no painel de detalhes
- No `PreviewArquivo` (linha ~986), adicionar botão "Baixar" no cabeçalho do arquivo:
  - Se `dataUrl` existe → `<a href={dataUrl} download={nome}>` estilizado como botão.
  - Se não (mocks legados sem binário) → botão desabilitado com tooltip "Arquivo de exemplo — sem binário".
- Para imagens, adicionar o mesmo botão "Baixar" abaixo da preview quando houver `dataUrl` ou quando `url` for de mesma origem (imagens externas ficam com botão "Abrir original" para evitar CORS).

### 4. Persistência
- O `recursos-store` já usa `localStorage`. Data URLs podem crescer — adicionar aviso simples: se o arquivo passar de ~4 MB, mostrar toast "Arquivo grande — pode não ser salvo entre sessões" e ainda assim permitir criação (mantém em memória mesmo que o `setItem` falhe). Envolver o `setItem` num `try/catch` que degrada silenciosamente.

## Fora de escopo
- Backend / storage real (segue mock-only, conforme spec original).
- Compressão de imagens.
- Preview real de PDF (segue placeholder atual).
