// Categoria agora é livre — o identificador (string) referencia a store
// configurável em `src/lib/categorias.ts`. As categorias padrão (produto, ux,
// etc.) já existem lá com cores mapeadas.
export type Categoria = string;

export type Membro = {
  id: string;
  nome: string;
  iniciais: string;
  avatarUrl?: string;
};

/**
 * Tipo de recurso — o formato do artefato em si.
 * "Ata", "PRD", "Post-mortem" etc. NÃO são tipos: são rótulos (`rotulo`)
 * aplicados sobre `arquivo` ou `link`.
 */
export type TipoRecurso = 'arquivo' | 'link' | 'imagem';

export type Recurso = {
  id: string;
  tipo: TipoRecurso;
  /** Rótulo semântico livre: "Ata", "PRD", "Post-mortem", "Guia" etc. */
  rotulo?: string;
  titulo: string;
  descricao?: string;
  categoria: Categoria;
  tags: string[];
  favoritoPor: string[];
  fixado: boolean;
  autorId: string;
  criadoEm: string;
  atualizadoEm: string;
  url?: string;
  arquivo?: { nome: string; tamanho: number; mime: string; dataUrl?: string };
  ata?: { data: string; participantes: string[]; decisoes: string[] };
  imagem?: { url: string; largura?: number; altura?: number; alt?: string; dataUrl?: string };
  corpo?: string;
};

export type Coluna = 'planejado' | 'fazendo' | 'feito' | 'validado';

export type Card = {
  id: string;
  titulo: string;
  descricao?: string;
  coluna: Coluna;
  ordem: number;
  categoria: Categoria;
  responsavelId?: string;
  autorId: string;
  ideiaOrigemId?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type Ideia = {
  id: string;
  titulo: string;
  corpo: string;
  categoria: Categoria;
  tags: string[];
  autorId: string;
  votos: string[];
  status: 'aberta' | 'virou-card' | 'arquivada';
  cardGeradoId?: string;
  criadaEm: string;
};

export type Comentario = {
  id: string;
  ideiaId: string;
  autorId: string;
  corpo: string;
  criadoEm: string;
};

export type Atividade = {
  id: string;
  autorId: string;
  verbo: 'criou' | 'moveu' | 'comentou' | 'adicionou' | 'favoritou';
  alvoTipo: 'recurso' | 'card' | 'ideia';
  alvoId: string;
  alvoTitulo: string;
  detalhe?: string;
  em: string;
};
