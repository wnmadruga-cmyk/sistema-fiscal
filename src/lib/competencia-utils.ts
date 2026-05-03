import { EtapaCard } from "@prisma/client";

export function formatCompetencia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function parseCompetencia(competencia: string): {
  ano: number;
  mes: number;
} {
  const [ano, mes] = competencia.split("-").map(Number);
  return { ano, mes };
}

export function competenciaLabel(competencia: string): string {
  const { ano, mes } = parseCompetencia(competencia);
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${meses[mes - 1]}/${ano}`;
}

export function competenciaAnterior(competencia: string): string {
  const { ano, mes } = parseCompetencia(competencia);
  if (mes === 1) return formatCompetencia(ano - 1, 12);
  return formatCompetencia(ano, mes - 1);
}

export function proxCompetencia(competencia: string): string {
  const { ano, mes } = parseCompetencia(competencia);
  if (mes === 12) return formatCompetencia(ano + 1, 1);
  return formatCompetencia(ano, mes + 1);
}

export function competenciaAtual(): string {
  const now = new Date();
  return formatCompetencia(now.getFullYear(), now.getMonth() + 1);
}

export const ORDEM_ETAPAS: EtapaCard[] = [
  EtapaCard.BUSCA_DOCUMENTOS,
  EtapaCard.BAIXAR_NOTAS_ACESSO,
  EtapaCard.PEDIR_NOTAS_RECEITA_PR,
  EtapaCard.POSSIVEIS_SEM_MOVIMENTO,
  EtapaCard.CONFERENCIA_APURACAO,
  EtapaCard.CONFERENCIA,
  EtapaCard.TRANSMISSAO,
  EtapaCard.ENVIO,
  EtapaCard.ENVIO_ACESSORIAS,
  EtapaCard.IMPRESSAO_PROTOCOLO,
  EtapaCard.CONCLUIDO,
];

export const LABEL_ETAPA: Record<EtapaCard, string> = {
  BUSCA_DOCUMENTOS: "Busca de Documentos",
  BAIXAR_NOTAS_ACESSO: "Baixar Notas Acesso Sistema",
  PEDIR_NOTAS_RECEITA_PR: "Pedir Notas Receita PR",
  POSSIVEIS_SEM_MOVIMENTO: "Possíveis Sem Movimento",
  CONFERENCIA_APURACAO: "Conferência e Apuração",
  CONFERENCIA: "Conferência",
  TRANSMISSAO: "Transmissão",
  ENVIO: "Envio",
  ENVIO_ACESSORIAS: "Enviado via Acessorias",
  IMPRESSAO_PROTOCOLO: "Impressão e Protocolo",
  CONCLUIDO: "Concluído",
};

export const LABEL_ETAPA_CURTO: Record<EtapaCard, string> = {
  BUSCA_DOCUMENTOS: "Busca",
  BAIXAR_NOTAS_ACESSO: "Acesso",
  PEDIR_NOTAS_RECEITA_PR: "Receita",
  POSSIVEIS_SEM_MOVIMENTO: "S/Mov.",
  CONFERENCIA_APURACAO: "Apur.",
  CONFERENCIA: "Conf.",
  TRANSMISSAO: "Transm.",
  ENVIO: "Envio",
  ENVIO_ACESSORIAS: "Acess.",
  IMPRESSAO_PROTOCOLO: "Impr.",
  CONCLUIDO: "OK",
};

export function proximaEtapa(etapa: EtapaCard): EtapaCard | null {
  const idx = ORDEM_ETAPAS.indexOf(etapa);
  if (idx === -1 || idx === ORDEM_ETAPAS.length - 1) return null;
  return ORDEM_ETAPAS[idx + 1];
}

export function etapasParaCard(opts: {
  exigirConferencia: boolean;
  conferenciaForcada?: boolean;
  exigirImpressao?: boolean;
  incluiBaixarNotasAcesso?: boolean;
  incluiPedirNotasReceita?: boolean;
  incluiPossiveisSemMovimento?: boolean;
}): EtapaCard[] {
  let etapas = ORDEM_ETAPAS;
  if (!opts.incluiBaixarNotasAcesso) {
    etapas = etapas.filter((e) => e !== EtapaCard.BAIXAR_NOTAS_ACESSO);
  }
  if (!opts.incluiPedirNotasReceita) {
    etapas = etapas.filter((e) => e !== EtapaCard.PEDIR_NOTAS_RECEITA_PR);
  }
  if (!opts.incluiPossiveisSemMovimento) {
    etapas = etapas.filter((e) => e !== EtapaCard.POSSIVEIS_SEM_MOVIMENTO);
  }
  if (!(opts.exigirConferencia || opts.conferenciaForcada)) {
    etapas = etapas.filter((e) => e !== EtapaCard.CONFERENCIA);
  }
  if (!opts.exigirImpressao) {
    etapas = etapas.filter((e) => e !== EtapaCard.IMPRESSAO_PROTOCOLO && e !== EtapaCard.ENVIO);
  }
  return etapas;
}

export function proximaEtapaCard(
  etapa: EtapaCard,
  opts: { exigirConferencia: boolean; conferenciaForcada?: boolean; exigirImpressao?: boolean }
): EtapaCard | null {
  const ordem = etapasParaCard(opts);
  const idx = ordem.indexOf(etapa);
  if (idx === -1 || idx === ordem.length - 1) return null;
  return ordem[idx + 1];
}

export function etapaAnterior(etapa: EtapaCard): EtapaCard | null {
  const idx = ORDEM_ETAPAS.indexOf(etapa);
  if (idx <= 0) return null;
  return ORDEM_ETAPAS[idx - 1];
}

export function indiceEtapa(etapa: EtapaCard): number {
  return ORDEM_ETAPAS.indexOf(etapa);
}
