import { requireAuth } from "@/lib/auth";
import { unauthorized, serverError } from "@/lib/api-response";
import { loadLookups } from "@/lib/empresas-import-server";
import { IMPORT_COLUMNS, HEADER_LABELS } from "@/lib/empresas-import-shared";
import ExcelJS from "exceljs";

const EXEMPLO: Record<string, string | number> = {
  codigoInterno: "001",
  razaoSocial: "EMPRESA EXEMPLO LTDA",
  nomeFantasia: "Empresa Exemplo",
  cnpj: "00.000.000/0001-00",
  email: "contato@exemplo.com.br",
  telefone: "(11) 99999-9999",
  diaVencimentoHonorarios: 10,
  situacaoFolha: "NAO_TEM",
  fatorR: "false",
  fechaAutomatico: "false",
  entregaImpressa: "true",
  clienteBusca: "false",
  escritorioEntrega: "true",
  entregaDigisac: "false",
  semMovimentoTemp: "false",
  exigirAbrirCard: "false",
  exigirConferencia: "false",
  observacaoGeral: "Observação livre",
};

const TOTAL_LINHAS = 100;

function colLetter(i: number): string {
  let s = "";
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export async function GET() {
  try {
    const { usuario } = await requireAuth();
    const lookups = await loadLookups(usuario.escritorioId);

    const wb = new ExcelJS.Workbook();
    wb.creator = "ECM Flow Fiscal";
    wb.created = new Date();

    const ws = wb.addWorksheet("Empresas");
    const wsListas = wb.addWorksheet("Listas");

    // ── Listas sheet ──
    const listas: { titulo: string; valores: string[] }[] = [
      { titulo: "Regimes", valores: lookups.regimes.map((r) => r.nome) },
      { titulo: "Atividades", valores: lookups.atividades.map((a) => a.nome) },
      { titulo: "Prioridades", valores: lookups.prioridades.map((p) => p.nome) },
      { titulo: "Filiais", valores: lookups.filiais.map((f) => f.nome) },
      { titulo: "Grupos", valores: lookups.grupos.map((g) => g.nome) },
      { titulo: "Etiquetas", valores: lookups.etiquetas.map((e) => e.nome) },
      { titulo: "Usuarios", valores: lookups.usuarios.map((u) => u.nome) },
      { titulo: "SituacaoFolha", valores: ["NAO_TEM", "RH", "FISCAL"] },
      { titulo: "Booleano", valores: ["true", "false"] },
      { titulo: "Origem", valores: ["ESCRITORIO", "TERCEIROS"] },
      { titulo: "FormaChegada", valores: ["EMAIL", "ACESSO", "ALT", "OUTRO"] },
    ];

    listas.forEach((lista, colIdx) => {
      const letter = colLetter(colIdx);
      wsListas.getCell(`${letter}1`).value = lista.titulo;
      wsListas.getCell(`${letter}1`).font = { bold: true };
      lista.valores.forEach((v, i) => {
        wsListas.getCell(`${letter}${i + 2}`).value = v;
      });
      wsListas.getColumn(colIdx + 1).width = 22;
    });

    function listaRange(titulo: string): string | null {
      const idx = listas.findIndex((l) => l.titulo === titulo);
      if (idx === -1) return null;
      const lista = listas[idx];
      if (!lista.valores.length) return null;
      const letter = colLetter(idx);
      return `Listas!$${letter}$2:$${letter}$${lista.valores.length + 1}`;
    }

    const DOC_COLS = new Set([
      "nfe_ativo","nfe_origem","nfe_formaChegada","nfe_nomeSistema",
      "nfce_ativo","nfce_origem","nfce_formaChegada","nfce_nomeSistema",
      "nfs_ativo","nfs_origem","nfs_formaChegada","nfs_nomeSistema",
      "cte_ativo","cte_origem","cte_formaChegada","cte_nomeSistema",
      "recibo_ativo","recibo_origem","recibo_formaChegada","recibo_nomeSistema",
    ]);

    // ── Empresas sheet header ──
    IMPORT_COLUMNS.forEach((col, i) => {
      const cell = ws.getCell(1, i + 1);
      cell.value = HEADER_LABELS[col] ?? col;
      const isDoc = DOC_COLS.has(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isDoc ? "FF16A34A" : "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      ws.getColumn(i + 1).width = Math.max(14, (HEADER_LABELS[col] ?? col).length + 2);
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];

    // ── Linha de exemplo ──
    IMPORT_COLUMNS.forEach((col, i) => {
      const cell = ws.getCell(2, i + 1);
      const v = EXEMPLO[col];
      if (v !== undefined) cell.value = v;
      cell.font = { italic: true, color: { argb: "FF6B7280" } };
    });

    // ── Validações por coluna (linhas 2..TOTAL_LINHAS+1) ──
    const validacoes: Partial<Record<string, { titulo: string; promptKey?: string }>> = {
      regimeTributario: { titulo: "Regimes" },
      tipoAtividade: { titulo: "Atividades" },
      prioridade: { titulo: "Prioridades" },
      filial: { titulo: "Filiais" },
      respBusca: { titulo: "Usuarios" },
      respElaboracao: { titulo: "Usuarios" },
      respConferencia: { titulo: "Usuarios" },
      situacaoFolha: { titulo: "SituacaoFolha" },
      fatorR: { titulo: "Booleano" },
      fechaAutomatico: { titulo: "Booleano" },
      entregaImpressa: { titulo: "Booleano" },
      clienteBusca: { titulo: "Booleano" },
      escritorioEntrega: { titulo: "Booleano" },
      entregaDigisac: { titulo: "Booleano" },
      semMovimentoTemp: { titulo: "Booleano" },
      exigirAbrirCard: { titulo: "Booleano" },
      exigirConferencia: { titulo: "Booleano" },
      nfe_ativo: { titulo: "Booleano" },
      nfe_origem: { titulo: "Origem" },
      nfe_formaChegada: { titulo: "FormaChegada" },
      nfce_ativo: { titulo: "Booleano" },
      nfce_origem: { titulo: "Origem" },
      nfce_formaChegada: { titulo: "FormaChegada" },
      nfs_ativo: { titulo: "Booleano" },
      nfs_origem: { titulo: "Origem" },
      nfs_formaChegada: { titulo: "FormaChegada" },
      cte_ativo: { titulo: "Booleano" },
      cte_origem: { titulo: "Origem" },
      cte_formaChegada: { titulo: "FormaChegada" },
      recibo_ativo: { titulo: "Booleano" },
      recibo_origem: { titulo: "Origem" },
      recibo_formaChegada: { titulo: "FormaChegada" },
    };

    IMPORT_COLUMNS.forEach((col, i) => {
      const v = validacoes[col];
      if (!v) return;
      const range = listaRange(v.titulo);
      if (!range) return;
      const letter = colLetter(i);
      for (let row = 2; row <= TOTAL_LINHAS + 1; row++) {
        ws.getCell(`${letter}${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [range],
          showErrorMessage: true,
          errorStyle: "warning",
          errorTitle: "Valor inválido",
          error: "Selecione um valor da lista (aba Listas)",
        };
      }
    });

    // Comentários em grupos/etiquetas (multi-valor)
    const idxGrupos = IMPORT_COLUMNS.indexOf("grupos");
    const idxEtiquetas = IMPORT_COLUMNS.indexOf("etiquetas");
    const cellGrupos = ws.getCell(`${colLetter(idxGrupos)}1`);
    cellGrupos.note = "Múltiplos valores: separe por ; — Veja aba 'Listas' para os nomes válidos.";
    const cellEtiquetas = ws.getCell(`${colLetter(idxEtiquetas)}1`);
    cellEtiquetas.note = "Múltiplos valores: separe por ; — Veja aba 'Listas' para os nomes válidos.";

    const buffer = await wb.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modelo-empresas.xlsx"',
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
