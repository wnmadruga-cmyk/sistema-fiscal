import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized, serverError } from "@/lib/api-response";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const grupoId = searchParams.get("grupoId") ?? "";

    const isPrivileged = usuario.perfil === "ADMIN" || usuario.perfil === "GERENTE";
    const empresaWhere = isPrivileged
      ? { escritorioId: usuario.escritorioId, ativa: true }
      : usuario.perfil === "CONFERENTE"
      ? { escritorioId: usuario.escritorioId, ativa: true, respConferenciaId: usuario.id }
      : {
          escritorioId: usuario.escritorioId,
          ativa: true,
          OR: [{ respBuscaId: usuario.id }, { respElaboracaoId: usuario.id }],
        };

    const empresas = await prisma.empresa.findMany({
      where: empresaWhere,
      include: {
        regimeTributario: { select: { nome: true, codigo: true } },
        tipoAtividade: { select: { nome: true } },
        prioridade: { select: { nome: true } },
        filial: { select: { nome: true } },
        respBusca: { select: { nome: true } },
        respElaboracao: { select: { nome: true } },
        respConferencia: { select: { nome: true } },
        grupos: { include: { grupo: { select: { nome: true } } } },
        etiquetas: { include: { etiqueta: { select: { nome: true } } } },
      },
      orderBy: { razaoSocial: "asc" },
    });

    // Filtros opcionais (mirror dos filtros client-side)
    const filtradas = empresas.filter((e) => {
      const matchSearch =
        !search ||
        e.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
        (e.codigoInterno?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (e.cnpj?.includes(search) ?? false);

      const matchGrupo =
        !grupoId || e.grupos.some((g) => g.grupo.nome === grupoId || (g as { grupo: { id?: string; nome: string } }).grupo.id === grupoId);

      return matchSearch && matchGrupo;
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "ECM Flow Fiscal";
    wb.created = new Date();

    const ws = wb.addWorksheet("Empresas");

    const headers = [
      { key: "codigoInterno", header: "Código" },
      { key: "razaoSocial", header: "Razão Social" },
      { key: "nomeFantasia", header: "Nome Fantasia" },
      { key: "cnpj", header: "CNPJ" },
      { key: "cpf", header: "CPF" },
      { key: "inscricaoEstadual", header: "Inscrição Estadual" },
      { key: "inscricaoMunicipal", header: "Inscrição Municipal" },
      { key: "email", header: "E-mail" },
      { key: "telefone", header: "Telefone" },
      { key: "regime", header: "Regime" },
      { key: "tipoAtividade", header: "Tipo Atividade" },
      { key: "filial", header: "Filial" },
      { key: "prioridade", header: "Prioridade" },
      { key: "grupos", header: "Grupos" },
      { key: "etiquetas", header: "Etiquetas" },
      { key: "respBusca", header: "Resp. Busca" },
      { key: "respElaboracao", header: "Resp. Elaboração" },
      { key: "respConferencia", header: "Resp. Conferência" },
      { key: "diaVencimentoHonorarios", header: "Dia Venc. Honorários" },
      { key: "situacaoFolha", header: "Situação Folha" },
      { key: "fatorR", header: "Fator R" },
      { key: "fechaAutomatico", header: "Fecha Automático" },
      { key: "entregaImpressa", header: "Entrega Impressa" },
      { key: "clienteBusca", header: "Cliente Busca" },
      { key: "escritorioEntrega", header: "Escritório Entrega" },
      { key: "entregaDigisac", header: "Entrega Digisac" },
      { key: "entregaSecretaria", header: "Entrega Secretaria" },
      { key: "semMovimentoTemp", header: "Sem Movimento Temp." },
      { key: "exigirAbrirCard", header: "Exigir Abrir Card" },
      { key: "exigirConferencia", header: "Exigir Conferência" },
      { key: "observacaoGeral", header: "Observação" },
    ];

    // Cabeçalho
    const headerRow = ws.addRow(headers.map((h) => h.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];

    // Larguras de coluna
    const widths = [10, 40, 30, 18, 14, 18, 18, 30, 15, 18, 20, 15, 15, 25, 20, 20, 20, 20, 10, 15, 10, 12, 12, 12, 14, 12, 14, 14, 12, 12, 40];
    headers.forEach((_, i) => {
      ws.getColumn(i + 1).width = widths[i] ?? 16;
    });

    // Linhas de dados
    for (const e of filtradas) {
      ws.addRow([
        e.codigoInterno ?? "",
        e.razaoSocial,
        e.nomeFantasia ?? "",
        e.cnpj ?? "",
        e.cpf ?? "",
        e.inscricaoEstadual ?? "",
        e.inscricaoMunicipal ?? "",
        e.email ?? "",
        e.telefone ?? "",
        e.regimeTributario?.nome ?? "",
        e.tipoAtividade?.nome ?? "",
        e.filial?.nome ?? "",
        e.prioridade?.nome ?? "",
        e.grupos.map((g) => g.grupo.nome).join("; "),
        e.etiquetas.map((t) => t.etiqueta.nome).join("; "),
        e.respBusca?.nome ?? "",
        e.respElaboracao?.nome ?? "",
        e.respConferencia?.nome ?? "",
        e.diaVencimentoHonorarios ?? "",
        e.situacaoFolha,
        e.fatorR ? "Sim" : "Não",
        e.fechaAutomatico ? "Sim" : "Não",
        e.entregaImpressa ? "Sim" : "Não",
        e.clienteBusca ? "Sim" : "Não",
        e.escritorioEntrega ? "Sim" : "Não",
        e.entregaDigisac ? "Sim" : "Não",
        e.entregaSecretaria ? "Sim" : "Não",
        e.semMovimentoTemp ? "Sim" : "Não",
        e.exigirAbrirCard ? "Sim" : "Não",
        e.exigirConferencia ? "Sim" : "Não",
        e.observacaoGeral ?? "",
      ]);
    }

    // Zebra nas linhas
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5F9" },
          };
        });
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="empresas-${date}.xlsx"`,
      },
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
