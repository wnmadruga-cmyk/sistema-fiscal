import { competenciaLabel } from "./competencia-utils";

type FilialStat = { nome: string; total: number; concluidas: number; pendentes: number; pct: number };
type ProdItem = { responsavel: { nome: string }; total: number; concluidas: number; pendentes: number; status: string };

export interface DashboardEmailData {
  escritorioNome: string;
  competencia: string;
  totalCards: number;
  concluidosCount: number;
  pendentesCount: number;
  urgentesCount: number;
  atrasadosCount: number;
  pct: number;
  filiaisStats: FilialStat[];
  produtividade: ProdItem[];
  dataEnvio: Date;
}

function statusColor(s: string) {
  return s === "otimo" ? "#16a34a" : s === "bom" ? "#2563eb" : s === "regular" ? "#d97706" : "#dc2626";
}
function statusLabel(s: string) {
  return s === "otimo" ? "Ótimo" : s === "bom" ? "Bom" : s === "regular" ? "Regular" : "Ruim";
}

export function buildDashboardEmail(data: DashboardEmailData): string {
  const {
    escritorioNome, competencia, totalCards, concluidosCount, pendentesCount,
    urgentesCount, atrasadosCount, pct, filiaisStats, produtividade, dataEnvio,
  } = data;

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(dataEnvio);

  const pctBar = `
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="${pct}%" style="background:#16a34a;height:10px;border-radius:5px 0 0 5px"></td>
      <td style="background:#e5e7eb;height:10px;border-radius:0 5px 5px 0"></td>
    </tr></table>`;

  const filiaisRows = filiaisStats.map((f) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${f.nome}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${f.total}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#16a34a;font-weight:600">${f.concluidas}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#d97706">${f.pendentes}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${f.pct===100?"#16a34a":f.pct>=80?"#2563eb":"#d97706"}">${f.pct}%</td>
    </tr>`).join("");

  const prodRows = produtividade.map((p) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${p.responsavel.nome.split(" ")[0]}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">${p.total}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#16a34a;font-weight:600">${p.concluidas}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#d97706">${p.pendentes}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${statusColor(p.status)}">${statusLabel(p.status)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0">
<tr><td>
<table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <!-- Header -->
  <tr><td style="background:#1e40af;padding:28px 32px">
    <div style="color:#ffffff;font-size:22px;font-weight:700">${escritorioNome}</div>
    <div style="color:#bfdbfe;font-size:14px;margin-top:4px">Relatório Diário — Competência ${competenciaLabel(competencia)}</div>
    <div style="color:#93c5fd;font-size:12px;margin-top:2px">${dataFormatada}</div>
  </td></tr>

  <!-- KPIs -->
  <tr><td style="padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="25%" style="text-align:center;padding:12px;background:#eff6ff;border-radius:8px">
          <div style="font-size:28px;font-weight:800;color:#1e40af">${totalCards}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">TOTAL</div>
        </td>
        <td width="4%"></td>
        <td width="25%" style="text-align:center;padding:12px;background:#f0fdf4;border-radius:8px">
          <div style="font-size:28px;font-weight:800;color:#16a34a">${concluidosCount}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">CONCLUÍDAS</div>
        </td>
        <td width="4%"></td>
        <td width="25%" style="text-align:center;padding:12px;background:#fffbeb;border-radius:8px">
          <div style="font-size:28px;font-weight:800;color:#d97706">${pendentesCount}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">PENDENTES</div>
        </td>
        <td width="4%"></td>
        <td width="13%" style="text-align:center;padding:12px;background:${pct===100?"#f0fdf4":pct>=80?"#eff6ff":"#fffbeb"};border-radius:8px">
          <div style="font-size:28px;font-weight:800;color:${pct===100?"#16a34a":pct>=80?"#1e40af":"#d97706"}">${pct}%</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">PROGRESSO</div>
        </td>
      </tr>
    </table>

    <!-- Progress bar -->
    <div style="margin-top:16px">${pctBar}</div>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span style="font-size:11px;color:#6b7280">${concluidosCount} concluídas</span>
      <span style="font-size:11px;color:#6b7280">${pendentesCount} pendentes</span>
    </div>

    ${urgentesCount > 0 || atrasadosCount > 0 ? `
    <!-- Alertas -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
      <tr>
        ${urgentesCount > 0 ? `
        <td style="background:#fef2f2;border-radius:8px;padding:10px 16px;text-align:center">
          <span style="color:#dc2626;font-weight:700;font-size:16px">${urgentesCount}</span>
          <span style="color:#dc2626;font-size:12px;margin-left:4px">urgentes em aberto</span>
        </td>` : ""}
        ${urgentesCount > 0 && atrasadosCount > 0 ? `<td width="12"></td>` : ""}
        ${atrasadosCount > 0 ? `
        <td style="background:#fff7ed;border-radius:8px;padding:10px 16px;text-align:center">
          <span style="color:#ea580c;font-weight:700;font-size:16px">${atrasadosCount}</span>
          <span style="color:#ea580c;font-size:12px;margin-left:4px">com prazo vencido</span>
        </td>` : ""}
      </tr>
    </table>` : ""}
  </td></tr>

  ${filiaisStats.length > 0 ? `
  <!-- Por Filial -->
  <tr><td style="padding:0 32px 24px">
    <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">Status por Escritório/Filial</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Filial</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Total</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Conc.</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Pend.</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">%</th>
        </tr>
      </thead>
      <tbody>${filiaisRows}</tbody>
    </table>
  </td></tr>` : ""}

  ${produtividade.length > 0 ? `
  <!-- Produtividade -->
  <tr><td style="padding:0 32px 24px">
    <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">Produtividade por Responsável</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Nome</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Total</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Conc.</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Pend.</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase">Status</th>
        </tr>
      </thead>
      <tbody>${prodRows}</tbody>
    </table>
  </td></tr>` : ""}

  <!-- Footer -->
  <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
      Enviado automaticamente pelo sistema ECM Flow Fiscal.
      Para configurar ou desativar este relatório, acesse as configurações do sistema.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
