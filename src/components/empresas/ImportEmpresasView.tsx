"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  IMPORT_COLUMNS,
  type ImportColumn,
  type ImportRowRaw,
  type Lookups,
  validateRow,
} from "@/lib/empresas-import-shared";

const COL_LABEL: Record<ImportColumn, string> = {
  codigoInterno: "Código",
  razaoSocial: "Razão Social *",
  nomeFantasia: "Fantasia",
  cnpj: "CNPJ",
  cpf: "CPF",
  inscricaoEstadual: "IE",
  inscricaoMunicipal: "IM",
  email: "E-mail",
  telefone: "Telefone",
  regimeTributario: "Regime",
  tipoAtividade: "Atividade",
  prioridade: "Prioridade",
  filial: "Filial",
  respBusca: "Resp. Busca",
  respElaboracao: "Resp. Elab.",
  respConferencia: "Resp. Conf.",
  diaVencimentoHonorarios: "Dia Venc.",
  situacaoFolha: "Folha",
  fatorR: "Fator R",
  fechaAutomatico: "Fecha Auto",
  entregaImpressa: "Imp.",
  clienteBusca: "Cli. Busca",
  escritorioEntrega: "Esc. Entrega",
  entregaDigisac: "Digisac",
  semMovimentoTemp: "S/ Mov.",
  exigirAbrirCard: "Exig. Card",
  exigirConferencia: "Exig. Conf.",
  grupos: "Grupos",
  etiquetas: "Etiquetas",
  observacaoGeral: "Observação",
  nfe_ativo: "NFe Ativo",
  nfe_origem: "NFe Origem",
  nfe_formaChegada: "NFe Chegada",
  nfe_nomeSistema: "NFe Sistema",
  nfce_ativo: "NFCe Ativo",
  nfce_origem: "NFCe Origem",
  nfce_formaChegada: "NFCe Chegada",
  nfce_nomeSistema: "NFCe Sistema",
  nfs_ativo: "NFS-e Ativo",
  nfs_origem: "NFS-e Origem",
  nfs_formaChegada: "NFS-e Chegada",
  nfs_nomeSistema: "NFS-e Sistema",
  cte_ativo: "CTe Ativo",
  cte_origem: "CTe Origem",
  cte_formaChegada: "CTe Chegada",
  cte_nomeSistema: "CTe Sistema",
  recibo_ativo: "Recibo Ativo",
  recibo_origem: "Recibo Origem",
  recibo_formaChegada: "Recibo Chegada",
  recibo_nomeSistema: "Recibo Sistema",
};

type Row = {
  raw: ImportRowRaw;
  errors: Partial<Record<ImportColumn, string>>;
  duplicado?: boolean;
};

export function ImportEmpresasView() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);

  function reset() {
    setRows([]);
    setLookups(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function carregar(file: File) {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/empresas/import/preview", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao ler planilha");
        return;
      }
      setRows(json.data.rows);
      setLookups(json.data.opcoes);
      if (!json.data.rows.length) toast.info("Nenhuma linha preenchida na planilha");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateCell(rowIdx: number, col: ImportColumn, value: string) {
    setRows((prev) => {
      const next = [...prev];
      const raw = { ...next[rowIdx].raw, [col]: value } as ImportRowRaw;
      const v = lookups ? validateRow(raw, lookups) : { errors: next[rowIdx].errors };
      next[rowIdx] = { raw, errors: v.errors };
      return next;
    });
  }

  function removerLinha(rowIdx: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  const totalErros = rows.reduce((acc, r) => acc + Object.keys(r.errors).length, 0);
  const linhasComErro = rows.filter((r) => Object.keys(r.errors).length && !r.duplicado).length;
  const linhasDuplicadas = rows.filter((r) => r.duplicado).length;
  const linhasOk = rows.length - linhasComErro - linhasDuplicadas;

  async function salvar() {
    if (linhasComErro > 0) {
      toast.error("Existem linhas com erro. Corrija antes de salvar.");
      return;
    }
    if (linhasOk === 0 && linhasDuplicadas > 0) {
      toast.info("Todas as linhas já existem no sistema. Nada a importar.");
      return;
    }
    if (!rows.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/empresas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((r) => r.raw) }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao importar");
        return;
      }
      const { criadas, ignoradas, erros } = json.data ?? {};
      const partes: string[] = [];
      if (criadas > 0) partes.push(`${criadas} importada(s)`);
      if (ignoradas > 0) partes.push(`${ignoradas} ignorada(s) (código já existe)`);
      if (erros?.length) {
        toast.warning(partes.join(" · "), {
          description: erros
            .slice(0, 5)
            .map((e: { index: number; mensagem: string }) => `Linha ${e.index + 1}: ${e.mensagem}`)
            .join(" • "),
        });
      } else {
        toast.success(partes.join(" · ") || "Importação concluída");
        router.push("/empresas");
      }
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Link href="/empresas">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Importar empresas</h1>
            {rows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium">{rows.length}</span> linha(s) ·{" "}
                <span className="text-emerald-600">{linhasOk} para importar</span>
                {linhasDuplicadas > 0 && (
                  <>
                    {" · "}
                    <span className="text-amber-600">{linhasDuplicadas} já existem (serão ignoradas)</span>
                  </>
                )}
                {linhasComErro > 0 && (
                  <>
                    {" · "}
                    <span className="text-red-600">{linhasComErro} com erro</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/empresas/import-template">
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4" />
              Modelo Excel
            </Button>
          </a>
          {rows.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={reset}>
                Trocar planilha
              </Button>
              <Button size="sm" onClick={salvar} disabled={saving || linhasComErro > 0 || linhasOk === 0}>
                {saving ? "Salvando..." : `Importar ${linhasOk} empresa(s)`}
              </Button>
            </>
          )}
        </div>
      </div>

      {!rows.length ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
          <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Baixe o modelo Excel (com listas suspensas para Regime, Atividade, Prioridade, Filial,
            Situação Folha, etc.), preencha e envie aqui. Você poderá revisar e corrigir antes de
            salvar. Linhas em branco são ignoradas. CSV também é aceito.
          </p>
          <div className="flex gap-2">
            <a href="/api/empresas/import-template">
              <Button variant="outline" type="button">
                <Download className="h-4 w-4" />
                Baixar modelo
              </Button>
            </a>
            <Button onClick={() => fileRef.current?.click()} disabled={loading}>
              <Upload className="h-4 w-4" />
              {loading ? "Lendo..." : "Selecionar planilha"}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) carregar(f);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="text-xs border-collapse">
            <thead className="bg-muted/60 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium border-b border-r w-10">#</th>
                {IMPORT_COLUMNS.map((c) => (
                  <th
                    key={c}
                    className="px-2 py-1.5 text-left font-medium border-b border-r whitespace-nowrap"
                  >
                    {COL_LABEL[c]}
                  </th>
                ))}
                <th className="px-2 py-1.5 border-b w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const hasError = Object.keys(row.errors).length > 0 && !row.duplicado;
                return (
                  <tr
                    key={i}
                    className={
                      row.duplicado
                        ? "bg-amber-50 dark:bg-amber-950/20 opacity-60"
                        : hasError
                        ? "bg-red-50 dark:bg-red-950/20"
                        : ""
                    }
                  >
                    <td className="px-2 py-1 border-r border-b text-muted-foreground">
                      {i + 1}
                      {row.duplicado && (
                        <span className="ml-1 text-[9px] font-medium text-amber-600 uppercase tracking-wide">
                          dup
                        </span>
                      )}
                    </td>
                    {IMPORT_COLUMNS.map((c) => {
                      const err = row.errors[c];
                      return (
                        <td key={c} className="border-r border-b p-0 align-top" title={err}>
                          <input
                            value={row.raw[c] ?? ""}
                            onChange={(e) => updateCell(i, c, e.target.value)}
                            className={`w-full min-w-[110px] px-2 py-1 bg-transparent outline-none focus:bg-background focus:ring-1 focus:ring-primary/40 ${
                              err ? "text-red-700 dark:text-red-400 ring-1 ring-red-400" : ""
                            }`}
                          />
                          {err && (
                            <p className="px-2 pb-1 text-[10px] text-red-600 leading-tight">
                              {err}
                            </p>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b text-center">
                      <button
                        onClick={() => removerLinha(i)}
                        className="p-1 hover:bg-muted rounded"
                        title="Remover linha"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
