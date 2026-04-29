export const IMPORT_COLUMNS = [
  "codigoInterno",
  "razaoSocial",
  "nomeFantasia",
  "cnpj",
  "cpf",
  "inscricaoEstadual",
  "inscricaoMunicipal",
  "email",
  "telefone",
  "regimeTributario",
  "tipoAtividade",
  "prioridade",
  "filial",
  "respBusca",
  "respElaboracao",
  "respConferencia",
  "diaVencimentoHonorarios",
  "situacaoFolha",
  "fatorR",
  "fechaAutomatico",
  "entregaImpressa",
  "clienteBusca",
  "escritorioEntrega",
  "entregaDigisac",
  "semMovimentoTemp",
  "exigirAbrirCard",
  "exigirConferencia",
  "grupos",
  "etiquetas",
  "observacaoGeral",
  // Documentos fiscais
  "nfe_ativo",
  "nfe_origem",
  "nfe_formaChegada",
  "nfe_nomeSistema",
  "nfce_ativo",
  "nfce_origem",
  "nfce_formaChegada",
  "nfce_nomeSistema",
  "nfs_ativo",
  "nfs_origem",
  "nfs_formaChegada",
  "nfs_nomeSistema",
  "cte_ativo",
  "cte_origem",
  "cte_formaChegada",
  "cte_nomeSistema",
  "recibo_ativo",
  "recibo_origem",
  "recibo_formaChegada",
  "recibo_nomeSistema",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRowRaw = Record<ImportColumn, string>;

export const HEADER_LABELS: Record<ImportColumn, string> = {
  codigoInterno: "Código Interno",
  razaoSocial: "Razão Social *",
  nomeFantasia: "Nome Fantasia",
  cnpj: "CNPJ",
  cpf: "CPF",
  inscricaoEstadual: "Inscrição Estadual",
  inscricaoMunicipal: "Inscrição Municipal",
  email: "E-mail",
  telefone: "Telefone",
  regimeTributario: "Regime Tributário",
  tipoAtividade: "Tipo de Atividade",
  prioridade: "Prioridade",
  filial: "Filial",
  respBusca: "Resp. Busca",
  respElaboracao: "Resp. Elaboração",
  respConferencia: "Resp. Conferência",
  diaVencimentoHonorarios: "Dia Venc. Honorários",
  situacaoFolha: "Situação Folha",
  fatorR: "Fator R",
  fechaAutomatico: "Fecha Automático",
  entregaImpressa: "Entrega Impressa",
  clienteBusca: "Cliente Busca",
  escritorioEntrega: "Escritório Entrega",
  entregaDigisac: "Entrega Digisac",
  semMovimentoTemp: "Sem Movimento Temp",
  exigirAbrirCard: "Exigir Abrir Card",
  exigirConferencia: "Exigir Conferência",
  grupos: "Grupos (separe por ;)",
  etiquetas: "Etiquetas (separe por ;)",
  observacaoGeral: "Observação Geral",
  // Documentos fiscais
  nfe_ativo: "NFe Ativo",
  nfe_origem: "NFe Origem",
  nfe_formaChegada: "NFe Forma Chegada",
  nfe_nomeSistema: "NFe Nome Sistema",
  nfce_ativo: "NFCe Ativo",
  nfce_origem: "NFCe Origem",
  nfce_formaChegada: "NFCe Forma Chegada",
  nfce_nomeSistema: "NFCe Nome Sistema",
  nfs_ativo: "NFS-e Ativo",
  nfs_origem: "NFS-e Origem",
  nfs_formaChegada: "NFS-e Forma Chegada",
  nfs_nomeSistema: "NFS-e Nome Sistema",
  cte_ativo: "CTe Ativo",
  cte_origem: "CTe Origem",
  cte_formaChegada: "CTe Forma Chegada",
  cte_nomeSistema: "CTe Nome Sistema",
  recibo_ativo: "Recibo Aluguel Ativo",
  recibo_origem: "Recibo Aluguel Origem",
  recibo_formaChegada: "Recibo Aluguel Forma Chegada",
  recibo_nomeSistema: "Recibo Aluguel Nome Sistema",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\*+\s*$/, "")
    .replace(/\s*\(.+?\)\s*/g, "")
    .trim()
    .toLowerCase();
}

const HEADER_LOOKUP = (() => {
  const m: Record<string, ImportColumn> = {};
  for (const col of IMPORT_COLUMNS) {
    m[normalize(col)] = col;
    m[normalize(HEADER_LABELS[col])] = col;
  }
  return m;
})();

export function resolveHeader(header: string): ImportColumn | null {
  return HEADER_LOOKUP[normalize(header)] ?? null;
}

export type Lookups = {
  regimes: { id: string; nome: string; codigo: string }[];
  atividades: { id: string; nome: string }[];
  prioridades: { id: string; nome: string }[];
  filiais: { id: string; nome: string }[];
  grupos: { id: string; nome: string }[];
  etiquetas: { id: string; nome: string }[];
  usuarios: { id: string; nome: string; email: string | null }[];
  formasChegada: { id: string; nome: string }[];
};

export const TIPOS_DOCUMENTO = ["NFE", "NFCE", "NOTA_SERVICO", "CTE", "RECIBO_ALUGUEL"] as const;
export type TipoDocumentoImport = (typeof TIPOS_DOCUMENTO)[number];

export const ORIGENS_DOCUMENTO = ["ESCRITORIO", "TERCEIROS"] as const;
export type OrigemDocumentoImport = (typeof ORIGENS_DOCUMENTO)[number];

export const FORMAS_CHEGADA_ENUM = ["EMAIL", "ACESSO", "ALT", "OUTRO"] as const;
export type FormaChegadaImport = (typeof FORMAS_CHEGADA_ENUM)[number];

export type ConfigDocumentoImport = {
  tipoDocumento: TipoDocumentoImport;
  ativo: boolean;
  origem: OrigemDocumentoImport;
  formaChegada?: FormaChegadaImport;
  nomeSistema?: string;
};

const TRUE_VALS = new Set(["true", "1", "sim", "yes", "s", "x"]);
const FALSE_VALS = new Set(["false", "0", "nao", "não", "no", "n"]);

export function parseBool(v: string | undefined): boolean {
  const t = (v ?? "").trim().toLowerCase();
  if (TRUE_VALS.has(t)) return true;
  if (FALSE_VALS.has(t)) return false;
  return false;
}

function clean(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function splitList(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isRowEmpty(row: Partial<ImportRowRaw>): boolean {
  return IMPORT_COLUMNS.every((c) => !((row[c] ?? "").trim()));
}

function findByNomeOrCodigo<T extends { id: string; nome: string; codigo?: string }>(
  list: T[],
  key: string | undefined
): T | undefined {
  const k = (key ?? "").trim().toLowerCase();
  if (!k) return undefined;
  return list.find(
    (i) =>
      i.nome.toLowerCase() === k ||
      ("codigo" in i && (i as { codigo?: string }).codigo?.toLowerCase() === k)
  );
}

export type ValidatedRow = {
  errors: Partial<Record<ImportColumn, string>>;
  data?: {
    razaoSocial: string;
    codigoInterno?: string;
    nomeFantasia?: string;
    cnpj?: string;
    cpf?: string;
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    email?: string;
    telefone?: string;
    regimeTributarioId?: string;
    tipoAtividadeId?: string;
    prioridadeId?: string;
    filialId?: string;
    respBuscaId?: string;
    respElaboracaoId?: string;
    respConferenciaId?: string;
    diaVencimentoHonorarios?: number;
    situacaoFolha: "NAO_TEM" | "RH" | "FISCAL";
    fatorR: boolean;
    fechaAutomatico: boolean;
    entregaImpressa: boolean;
    clienteBusca: boolean;
    escritorioEntrega: boolean;
    entregaDigisac: boolean;
    semMovimentoTemp: boolean;
    exigirAbrirCard: boolean;
    exigirConferencia: boolean;
    observacaoGeral?: string;
    grupoIds: string[];
    etiquetaIds: string[];
    configDocumentos: ConfigDocumentoImport[];
  };
};

export function validateRow(
  raw: Partial<ImportRowRaw>,
  lookups: Lookups
): ValidatedRow {
  const errors: ValidatedRow["errors"] = {};

  const razaoSocial = clean(raw.razaoSocial);
  if (!razaoSocial) errors.razaoSocial = "Razão social obrigatória";

  const cnpj = clean(raw.cnpj);
  const cpf = clean(raw.cpf);

  const email = clean(raw.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "E-mail inválido";
  }

  const dia = clean(raw.diaVencimentoHonorarios);
  let diaNum: number | undefined;
  if (dia) {
    const n = parseInt(dia, 10);
    if (Number.isNaN(n) || n < 1 || n > 31) errors.diaVencimentoHonorarios = "Dia 1-31";
    else diaNum = n;
  }

  const sit = (raw.situacaoFolha ?? "").trim().toUpperCase();
  let situacaoFolha: "NAO_TEM" | "RH" | "FISCAL" = "NAO_TEM";
  if (sit) {
    if (sit === "RH" || sit === "FISCAL" || sit === "NAO_TEM") situacaoFolha = sit;
    else errors.situacaoFolha = "NAO_TEM | RH | FISCAL";
  }

  let regimeId: string | undefined;
  if (clean(raw.regimeTributario)) {
    const r = findByNomeOrCodigo(lookups.regimes, raw.regimeTributario);
    if (!r) errors.regimeTributario = "Regime não encontrado";
    else regimeId = r.id;
  }

  let atividadeId: string | undefined;
  if (clean(raw.tipoAtividade)) {
    const a = findByNomeOrCodigo(lookups.atividades, raw.tipoAtividade);
    if (!a) errors.tipoAtividade = "Atividade não encontrada";
    else atividadeId = a.id;
  }

  let prioridadeId: string | undefined;
  if (clean(raw.prioridade)) {
    const p = findByNomeOrCodigo(lookups.prioridades, raw.prioridade);
    if (!p) errors.prioridade = "Prioridade não encontrada";
    else prioridadeId = p.id;
  }

  let filialId: string | undefined;
  if (clean(raw.filial)) {
    const f = findByNomeOrCodigo(lookups.filiais, raw.filial);
    if (!f) errors.filial = "Filial não encontrada";
    else filialId = f.id;
  }

  function findUsuario(key: string | undefined) {
    const k = (key ?? "").trim().toLowerCase();
    if (!k) return undefined;
    return lookups.usuarios.find(
      (u) => u.nome.toLowerCase() === k || (u.email ?? "").toLowerCase() === k
    );
  }

  let respBuscaId: string | undefined;
  if (clean(raw.respBusca)) {
    const u = findUsuario(raw.respBusca);
    if (!u) errors.respBusca = "Usuário não encontrado";
    else respBuscaId = u.id;
  }

  let respElaboracaoId: string | undefined;
  if (clean(raw.respElaboracao)) {
    const u = findUsuario(raw.respElaboracao);
    if (!u) errors.respElaboracao = "Usuário não encontrado";
    else respElaboracaoId = u.id;
  }

  let respConferenciaId: string | undefined;
  if (clean(raw.respConferencia)) {
    const u = findUsuario(raw.respConferencia);
    if (!u) errors.respConferencia = "Usuário não encontrado";
    else respConferenciaId = u.id;
  }

  const grupoNomes = splitList(raw.grupos);
  const grupoIds: string[] = [];
  const gruposNaoEncontrados: string[] = [];
  for (const n of grupoNomes) {
    const g = findByNomeOrCodigo(lookups.grupos, n);
    if (g) grupoIds.push(g.id);
    else gruposNaoEncontrados.push(n);
  }
  if (gruposNaoEncontrados.length) {
    errors.grupos = `Não encontrado: ${gruposNaoEncontrados.join(", ")}`;
  }

  const etiquetaNomes = splitList(raw.etiquetas);
  const etiquetaIds: string[] = [];
  const etiquetasNaoEncontradas: string[] = [];
  for (const n of etiquetaNomes) {
    const et = findByNomeOrCodigo(lookups.etiquetas, n);
    if (et) etiquetaIds.push(et.id);
    else etiquetasNaoEncontradas.push(n);
  }
  if (etiquetasNaoEncontradas.length) {
    errors.etiquetas = `Não encontrado: ${etiquetasNaoEncontradas.join(", ")}`;
  }

  // ── Documentos fiscais ──
  type DocPrefix = "nfe" | "nfce" | "nfs" | "cte" | "recibo";
  const docMap: Record<DocPrefix, TipoDocumentoImport> = {
    nfe: "NFE",
    nfce: "NFCE",
    nfs: "NOTA_SERVICO",
    cte: "CTE",
    recibo: "RECIBO_ALUGUEL",
  };

  const configDocumentos: ConfigDocumentoImport[] = [];
  for (const [prefix, tipo] of Object.entries(docMap) as [DocPrefix, TipoDocumentoImport][]) {
    const ativoKey = `${prefix}_ativo` as ImportColumn;
    const origemKey = `${prefix}_origem` as ImportColumn;
    const formaKey = `${prefix}_formaChegada` as ImportColumn;
    const sistemaKey = `${prefix}_nomeSistema` as ImportColumn;

    const ativoRaw = (raw[ativoKey] ?? "").trim();
    if (!ativoRaw) continue;

    const ativo = parseBool(ativoRaw);

    const origemRaw = (raw[origemKey] ?? "").trim().toUpperCase();
    const origem: OrigemDocumentoImport =
      origemRaw === "TERCEIROS" ? "TERCEIROS" : "ESCRITORIO";

    const formaRaw = (raw[formaKey] ?? "").trim().toUpperCase() as FormaChegadaImport;
    const formaChegada: FormaChegadaImport | undefined =
      FORMAS_CHEGADA_ENUM.includes(formaRaw) ? formaRaw : undefined;

    configDocumentos.push({
      tipoDocumento: tipo,
      ativo,
      origem,
      formaChegada,
      nomeSistema: clean(raw[sistemaKey]),
    });
  }

  if (Object.keys(errors).length) return { errors };

  return {
    errors,
    data: {
      razaoSocial: razaoSocial!,
      codigoInterno: clean(raw.codigoInterno),
      nomeFantasia: clean(raw.nomeFantasia),
      cnpj,
      cpf,
      inscricaoEstadual: clean(raw.inscricaoEstadual),
      inscricaoMunicipal: clean(raw.inscricaoMunicipal),
      email,
      telefone: clean(raw.telefone),
      regimeTributarioId: regimeId,
      tipoAtividadeId: atividadeId,
      prioridadeId,
      filialId,
      respBuscaId,
      respElaboracaoId,
      respConferenciaId,
      diaVencimentoHonorarios: diaNum,
      situacaoFolha,
      fatorR: parseBool(raw.fatorR),
      fechaAutomatico: parseBool(raw.fechaAutomatico),
      entregaImpressa: parseBool(raw.entregaImpressa),
      clienteBusca: parseBool(raw.clienteBusca),
      escritorioEntrega: parseBool(raw.escritorioEntrega),
      entregaDigisac: parseBool(raw.entregaDigisac),
      semMovimentoTemp: parseBool(raw.semMovimentoTemp),
      exigirAbrirCard: parseBool(raw.exigirAbrirCard),
      exigirConferencia: parseBool(raw.exigirConferencia),
      observacaoGeral: clean(raw.observacaoGeral),
      grupoIds,
      etiquetaIds,
      configDocumentos,
    },
  };
}
