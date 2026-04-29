// Helpers para CSV compatível com Excel (UTF-8 BOM, separador ; comum no Brasil)

const SEP = ";";

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(SEP) || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const head = headers.map(escapeCell).join(SEP);
  const body = rows.map((r) => r.map(escapeCell).join(SEP)).join("\n");
  return "\ufeff" + head + "\n" + body + "\n";
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  // Detecta separador (; ou ,) pela 1ª linha
  const firstLine = cleaned.split("\n", 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const lines: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) { cur.push(cell); cell = ""; }
      else if (c === "\n") { cur.push(cell); lines.push(cur); cur = []; cell = ""; }
      else cell += c;
    }
  }
  if (cell.length || cur.length) { cur.push(cell); lines.push(cur); }

  const nonEmpty = lines.filter((r) => r.some((c) => c.trim().length));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const [headers, ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

export function csvResponse(filename: string, content: string): Response {
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
