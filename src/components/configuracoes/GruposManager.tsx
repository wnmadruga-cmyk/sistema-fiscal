"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EtapaCard =
  | "BUSCA_DOCUMENTOS"
  | "BAIXAR_NOTAS_ACESSO"
  | "PEDIR_NOTAS_RECEITA_PR"
  | "POSSIVEIS_SEM_MOVIMENTO"
  | "CONFERENCIA_APURACAO"
  | "CONFERENCIA"
  | "TRANSMISSAO"
  | "ENVIO"
  | "ENVIO_ACESSORIAS"
  | "IMPRESSAO_PROTOCOLO"
  | "CONCLUIDO";

const ETAPAS: { value: EtapaCard; label: string }[] = [
  { value: "BUSCA_DOCUMENTOS",        label: "Busca de Documentos" },
  { value: "BAIXAR_NOTAS_ACESSO",     label: "Baixar Notas Acesso Sistema" },
  { value: "PEDIR_NOTAS_RECEITA_PR",  label: "Pedir Notas Receita PR" },
  { value: "POSSIVEIS_SEM_MOVIMENTO", label: "Possíveis Sem Movimento" },
  { value: "CONFERENCIA_APURACAO",    label: "Conferência e Apuração" },
  { value: "CONFERENCIA",             label: "Conferência" },
  { value: "TRANSMISSAO",             label: "Transmissão" },
  { value: "ENVIO",                   label: "Envio" },
  { value: "ENVIO_ACESSORIAS",        label: "Enviado via Acessorias" },
  { value: "IMPRESSAO_PROTOCOLO",     label: "Impressão e Protocolo" },
  { value: "CONCLUIDO",               label: "Concluído" },
];

interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  diasPrazo: number | null;
  sobrepoePrioridade: boolean;
  exigirAbrirCard: boolean;
  exigirConferencia: boolean;
  etapaInicial: EtapaCard | null;
  empresasCount: number;
  empresaIds: string[];
}
interface Empresa { id: string; nome: string; codigoInterno?: string | null }

const empty = { nome: "", descricao: "", cor: "#3b82f6", diasPrazo: null as number | null, sobrepoePrioridade: false, exigirAbrirCard: false, exigirConferencia: false, etapaInicial: null as EtapaCard | null, empresaIds: [] as string[] };

export function GruposManager({ initial, empresas }: { initial: Grupo[]; empresas: Empresa[] }) {
  const [grupos, setGrupos] = useState<Grupo[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [importText, setImportText] = useState("");
  const [importTab, setImportTab] = useState<"lista" | "importar">("lista");

  const importResult = useMemo(() => {
    if (!importText.trim()) return null;
    const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      const found = empresas.find(
        (e) =>
          (e.codigoInterno && e.codigoInterno.toLowerCase() === lower) ||
          e.nome.toLowerCase() === lower
      );
      if (found) matched.push(found.id);
      else unmatched.push(line);
    }
    return { matched, unmatched };
  }, [importText, empresas]);

  function applyImport() {
    if (!importResult) return;
    const merged = [...new Set([...form.empresaIds, ...importResult.matched])];
    setForm((f) => ({ ...f, empresaIds: merged }));
    setImportText("");
    setImportTab("lista");
  }

  function openNew() { setEditing(null); setForm(empty); setImportText(""); setImportTab("lista"); setOpen(true); }
  function openEdit(g: Grupo) {
    setEditing(g);
    setForm({ nome: g.nome, descricao: g.descricao ?? "", cor: g.cor ?? "#3b82f6", diasPrazo: g.diasPrazo, sobrepoePrioridade: g.sobrepoePrioridade, exigirAbrirCard: g.exigirAbrirCard, exigirConferencia: g.exigirConferencia, etapaInicial: g.etapaInicial, empresaIds: g.empresaIds });
    setImportText(""); setImportTab("lista");
    setOpen(true);
  }

  function toggle(id: string) {
    setForm((f) => ({
      ...f,
      empresaIds: f.empresaIds.includes(id) ? f.empresaIds.filter((x) => x !== id) : [...f.empresaIds, id],
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function normalize(raw: any): Grupo {
    return {
      id: raw.id,
      nome: raw.nome,
      descricao: raw.descricao ?? null,
      cor: raw.cor ?? null,
      diasPrazo: raw.diasPrazo ?? null,
      sobrepoePrioridade: raw.sobrepoePrioridade ?? false,
      exigirAbrirCard: raw.exigirAbrirCard ?? false,
      exigirConferencia: raw.exigirConferencia ?? false,
      etapaInicial: raw.etapaInicial ?? null,
      empresasCount: raw._count?.empresas ?? raw.empresasCount ?? 0,
      empresaIds: raw.empresas?.map((e: { empresaId: string }) => e.empresaId) ?? raw.empresaIds ?? [],
    };
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/grupos/${editing.id}` : "/api/grupos";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    const raw = await res.json();
    const saved = normalize(raw.data ?? raw);
    if (editing) {
      setGrupos((prev) => prev.map((g) => g.id === saved.id ? saved : g));
    } else {
      setGrupos((prev) => [...prev, saved].sort((a, b) => a.nome.localeCompare(b.nome)));
    }
    toast.success("Salvo!");
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Remover este grupo?")) return;
    const res = await fetch(`/api/grupos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao remover"); return; }
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    toast.success("Removido");
  }

  const filtered = empresas.filter((e) => e.nome.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Grupo</Button>
      </div>
      <div className="grid gap-3">
        {grupos.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum grupo cadastrado</CardContent></Card>
        )}
        {grupos.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-3 h-10 rounded" style={{ background: g.cor ?? "#64748b" }} />
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {g.nome}
                    <Badge variant="secondary">{g.empresasCount} empresas</Badge>
                  </div>
                  {g.descricao && <p className="text-sm text-muted-foreground">{g.descricao}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Grupo" : "Novo Grupo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-20" />
            </div>

            <div className="space-y-2 border rounded p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sobrepor prazo da prioridade</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, empresas deste grupo usam o prazo do grupo no lugar do prazo da prioridade.</p>
                </div>
                <Switch checked={form.sobrepoePrioridade} onCheckedChange={(v) => setForm({ ...form, sobrepoePrioridade: v })} />
              </div>
              {form.sobrepoePrioridade && (
                <div className="space-y-1">
                  <Label>Dias de prazo (após o fim do mês)</Label>
                  <Input type="number" min={0} value={form.diasPrazo ?? 0} onChange={(e) => setForm({ ...form, diasPrazo: parseInt(e.target.value) || 0 })} />
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Exigir abrir card</Label>
                  <p className="text-xs text-muted-foreground">Empresas deste grupo não permitem concluir etapas/SM inline pela tabela — só pelo card.</p>
                </div>
                <Switch checked={form.exigirAbrirCard} onCheckedChange={(v) => setForm({ ...form, exigirAbrirCard: v })} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label>Exigir conferência</Label>
                  <p className="text-xs text-muted-foreground">Quando há ressalva ou reprovação, registra automaticamente um erro no controle de qualidade.</p>
                </div>
                <Switch checked={form.exigirConferencia} onCheckedChange={(v) => setForm({ ...form, exigirConferencia: v })} />
              </div>
              <div className="pt-2 border-t space-y-2">
                <div>
                  <Label>Etapa inicial do fluxo</Label>
                  <p className="text-xs text-muted-foreground">Quando definida, empresas deste grupo iniciam a competência nesta etapa, ignorando todas as demais regras de fluxo inicial.</p>
                </div>
                <Select
                  value={form.etapaInicial ?? "__none__"}
                  onValueChange={(v) => setForm({ ...form, etapaInicial: v === "__none__" ? null : (v as EtapaCard) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem override (usa regras gerais)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Sem override — usa regras gerais</span>
                    </SelectItem>
                    {ETAPAS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Empresas vinculadas ({form.empresaIds.length})</Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setImportTab("lista")}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${importTab === "lista" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportTab("importar")}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${importTab === "importar" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                  >
                    Importar
                  </button>
                </div>
              </div>

              {importTab === "lista" && (
                <>
                  <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8" />
                  <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-1">
                    {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma empresa</p>}
                    {filtered.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer">
                        <input type="checkbox" checked={form.empresaIds.includes(e.id)} onChange={() => toggle(e.id)} />
                        <span className="text-sm">
                          {e.codigoInterno && <span className="text-xs text-muted-foreground font-mono mr-1.5">{e.codigoInterno}</span>}
                          {e.nome}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {importTab === "importar" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Cole uma lista (um por linha) com código interno ou nome da empresa. Matches parciais de nome não são aceitos — o nome deve ser exato.
                  </p>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={"001\n002\nEmpresa X\nEmpresa Y"}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  {importResult && importResult.unmatched.length > 0 && (
                    <div className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Não encontrados ({importResult.unmatched.length}):</p>
                      <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-0.5">
                        {importResult.unmatched.map((u) => <li key={u} className="font-mono">{u}</li>)}
                      </ul>
                    </div>
                  )}
                  {importResult && importResult.matched.length > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{importResult.matched.length} empresa(s) encontrada(s)</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={!importResult || importResult.matched.length === 0}
                    onClick={applyImport}
                  >
                    Adicionar ao grupo
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
