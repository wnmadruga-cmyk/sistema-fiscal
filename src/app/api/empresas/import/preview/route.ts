import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized, badRequest, serverError } from "@/lib/api-response";
import { parseCsv } from "@/lib/csv";
import { loadLookups } from "@/lib/empresas-import-server";
import {
  IMPORT_COLUMNS,
  validateRow,
  isRowEmpty,
  resolveHeader,
  type ImportColumn,
  type ImportRowRaw,
} from "@/lib/empresas-import-shared";
import ExcelJS from "exceljs";

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("");
    if (o.result !== undefined) return cellToString(o.result);
  }
  return String(v);
}

async function parseXlsx(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws =
    wb.getWorksheet("Empresas") ?? wb.worksheets.find((w) => w.state !== "hidden") ?? wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };
  const headers: string[] = [];
  const headerRow = ws.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value).trim();
  });
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const arr: string[] = [];
    for (let c = 1; c <= headers.length; c++) {
      arr[c - 1] = cellToString(row.getCell(c).value);
    }
    rows.push(arr);
  });
  return { headers, rows };
}

export async function POST(request: Request) {
  try {
    const { usuario } = await requireAuth();
    const escritorioId = usuario.escritorioId;

    const contentType = request.headers.get("content-type") || "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return badRequest("Arquivo não enviado");
      const isXlsx =
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.type.includes("spreadsheetml");
      if (isXlsx) {
        const buf = await file.arrayBuffer();
        ({ headers, rows } = await parseXlsx(buf));
      } else {
        const text = await file.text();
        if (!text.trim()) return badRequest("Arquivo vazio");
        ({ headers, rows } = parseCsv(text));
      }
    } else {
      const text = await request.text();
      if (!text.trim()) return badRequest("Arquivo vazio");
      ({ headers, rows } = parseCsv(text));
    }

    if (!headers.length || !rows.length) return badRequest("Planilha sem dados");

    const idx: Partial<Record<ImportColumn, number>> = {};
    headers.forEach((h, i) => {
      const k = resolveHeader(h);
      if (k && idx[k] === undefined) idx[k] = i;
    });

    const [lookups, existingCodes] = await Promise.all([
      loadLookups(escritorioId),
      prisma.empresa.findMany({
        where: { escritorioId, codigoInterno: { not: null } },
        select: { codigoInterno: true },
      }),
    ]);

    const codigosExistentes = new Set(
      existingCodes.map((e) => e.codigoInterno!.trim().toLowerCase())
    );

    const previewRows = rows
      .map((row) => {
        const raw: Partial<ImportRowRaw> = {};
        for (const col of IMPORT_COLUMNS) {
          const i = idx[col];
          raw[col] = i === undefined ? "" : (row[i] ?? "").trim();
        }
        return raw as ImportRowRaw;
      })
      .filter((r) => !isRowEmpty(r))
      .map((raw) => {
        const v = validateRow(raw, lookups);
        const duplicado =
          !!raw.codigoInterno &&
          codigosExistentes.has(raw.codigoInterno.trim().toLowerCase());
        return { raw, errors: v.errors, duplicado };
      });

    return ok({ rows: previewRows, opcoes: lookups });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return unauthorized();
    return serverError(error);
  }
}
