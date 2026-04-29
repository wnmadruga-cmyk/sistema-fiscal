export type {
  Usuario,
  Escritorio,
  Empresa,
  Grupo,
  Etiqueta,
  Prioridade,
  RegimeTributario,
  TipoAtividade,
  CompetenciaCard,
  CardEtapa,
  ChecklistTemplate,
  ChecklistItem,
  ChecklistResposta,
  ControleQualidade,
  Comentario,
  Mencao,
  Arquivo,
  Observacao,
  Notificacao,
  ConfigDocumento,
  ConfigBusca,
} from "@prisma/client";

export type {
  PerfilUsuario,
  StatusCard,
  EtapaCard,
  StatusEtapa,
  TipoDocumento,
  OrigemDocumento,
  FormaChegada,
  TipoPortalServico,
  SituacaoFolha,
  TipoErro,
  TipoNotificacao,
  EscopoChecklist,
} from "@prisma/client";

export type ApiResponse<T> = {
  data: T;
  success: boolean;
};

export type ApiError = {
  error: string;
  errors?: unknown;
  success: false;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

// Extended types with relations
export type EmpresaCompleta = import("@prisma/client").Empresa & {
  regimeTributario: import("@prisma/client").RegimeTributario | null;
  tipoAtividade: import("@prisma/client").TipoAtividade | null;
  prioridade: import("@prisma/client").Prioridade | null;
  respBusca: import("@prisma/client").Usuario | null;
  respElaboracao: import("@prisma/client").Usuario | null;
  respConferencia: import("@prisma/client").Usuario | null;
  grupos: Array<{
    grupo: import("@prisma/client").Grupo;
  }>;
  etiquetas: Array<{
    etiqueta: import("@prisma/client").Etiqueta;
  }>;
};

export type CardCompleto = import("@prisma/client").CompetenciaCard & {
  empresa: import("@prisma/client").Empresa;
  prioridade: import("@prisma/client").Prioridade | null;
  responsavel: import("@prisma/client").Usuario | null;
  etapas: import("@prisma/client").CardEtapa[];
  etiquetas: Array<{
    etiqueta: import("@prisma/client").Etiqueta;
  }>;
  _count?: {
    comentarios: number;
    arquivos: number;
    qualidade: number;
  };
};

export type ComentarioCompleto = import("@prisma/client").Comentario & {
  autor: import("@prisma/client").Usuario;
  mencoes: Array<{
    usuario: import("@prisma/client").Usuario;
  }>;
  arquivos: import("@prisma/client").Arquivo[];
  respostas: Array<
    import("@prisma/client").Comentario & {
      autor: import("@prisma/client").Usuario;
    }
  >;
};

export type FiltrosCompetencia = {
  competencia?: string;
  empresaId?: string;
  grupoId?: string;
  responsavelId?: string;
  status?: import("@prisma/client").StatusCard;
  etapaAtual?: import("@prisma/client").EtapaCard;
  urgente?: boolean;
  semMovimento?: boolean;
  search?: string;
};
