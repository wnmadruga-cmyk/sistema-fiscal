"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Search } from "lucide-react";

const ETAPAS = [
  { value: "BUSCA_DOCUMENTOS", label: "Busca de Documentos" },
  { value: "CONFERENCIA_APURACAO", label: "Conferência/Apuração" },
  { value: "CONFERENCIA", label: "Conferência" },
  { value: "TRANSMISSAO", label: "Transmissão" },
  { value: "ENVIO", label: "Envio" },
  { value: "ENVIO_ACESSORIAS", label: "Enviado via Acessorias" },
  { value: "CONCLUIDO", label: "Concluído" },
] as const;

interface Item {
  texto: string;
  descricao?: string | null;
  obrigatorio: boolean;
  ordem: number;
}

interface Template {
  id: string;
  nome: string;
  descricao: string | null;
  etapa: string;
  escopo: string;
  obrigatorio: boolean;
  ordem: number;
  empresaIds: string[];
  grupoIds: string[];
  itens: Array<{ id: string; texto: string; descricao: string | null; obrigatorio: boolean; ordem: number }>;
}

interface Empresa { id: string; razaoSocial: string; codigoInterno: string | null }
interface Grupo { id: string; nome: string; cor: string | null }

const empty = {
  nome: "",
  descricao: "",
  etapa: "BUSCA_DOCUMENTOS" as string,
  escopo: "GLOBAL" as "GLOBAL" | "GRUPO" | "EMPRESA",
  empresaIds: [] as string[],
  grupoIds: [] as string[],
  obrigatorio: false,
  ordem: 0,
  itens: [] as Item[],
};

export function ChecklistsManager({
  initial,
  grupos,
  empresas,
}: {
  initial: Template[];
  grupos: Grupo[];
  empresas: Empresa[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState("");

  function openNew() { setEditing(null); setForm(empty); setEmpresaSearch(""); setOpen(true); }
  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      nome: t.nome,
      descricao: t.descricao ?? "",
      etapa: t.etapa,
      escopo: t.escopo as "GLOBAL" | "GRUPO" | "EMPRESA",
      empresaIds: t.empresaIds,
      grupoIds: t.grupoIds,
      obrigatorio: t.obrigatorio,
      ordem: t.ordem,
      itens: t.itens.map((i) => ({
        texto: i.texto,
        descricao: i.descricao,
        obrigatorio: i.obrigatorio,
        ordem: i.ordem,
      })),
    });
    setEmpresaSearch("");
    setOpen(true);
  }

  function addItem() {
    setForm({
      ...form,
      itens: [...form.itens, { texto: "", descricao: "", obrigatorio: false, ordem: form.itens.length }],
    });
  }
  function updateItem(idx: number, patch: Partial<Item>) {
    setForm({ ...form, itens: form.itens.map((it, i) => i === idx ? { ...it, ...patch } : it) });
  }
  function removeItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  }

  function toggleEmpresa(id: string) {
    setForm((prev) => ({
      ...prev,
      empresaIds: prev.empresaIds.includes(id)
        ? prev.empresaIds.filter((x) => x !== id)
        : [...prev.empresaIds, id],
    }));
  }
  function toggleGrupo(id: string) {
    setForm((prev) => ({
      ...prev,
      grupoIds: prev.grupoIds.includes(id)
        ? prev.grupoIds.filter((x) => x !== id)
        : [...prev.grupoIds, id],
    }));
  }

  const empresasFiltradas = useMemo(() => {
    const q = empresaSearch.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) =>
        e.razaoSocial.toLowerCase().includes(q) ||
        (e.codigoInterno ?? "").toLowerCase().includes(q)
    );
  }, [empresas, empresaSearch]);

  async function save() {
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (form.escopo === "GRUPO" && form.grupoIds.length === 0) {
      toast.error("Selecione ao menos um grupo");
      return;
    }
    if (form.escopo === "EMPRESA" && form.empresaIds.length === 0) {
      toast.error("Selecione ao menos uma empresa");
      return;
    }

    setSaving(true);
    const url = editing ? `/api/checklists/${editing.id}` : "/api/checklists";
    const payload = {
      ...form,
      descricao: form.descricao || null,
      empresaIds: form.escopo === "EMPRESA" ? form.empresaIds : [],
      grupoIds: form.escopo === "GRUPO" ? form.grupoIds : [],
    };
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    toast.success("Salvo!");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover checklist?")) return;
    const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Removido");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Checklist</Button>
      </div>

      <div className="grid gap-3">
        {initial.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.nome}</span>
                    <Badge variant="outline">{ETAPAS.find((e) => e.value === t.etapa)?.label ?? t.etapa}</Badge>
                    <Badge variant="secondary">{t.escopo}</Badge>
                    {t.grupoIds.length > 0 && (
                      <Badge>🗂 {t.grupoIds.length} grupo(s)</Badge>
                    )}
                    {t.empresaIds.length > 0 && (
                      <Badge>🏢 {t.empresaIds.length} empresa(s)</Badge>
                    )}
                    {t.obrigatorio && <Badge variant="destructive">Obrigatório</Badge>}
                  </div>
                  {t.descricao && <p className="text-xs text-muted-foreground mt-1">{t.descricao}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{t.itens.length} item(ns)</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {initial.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum checklist cadastrado</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Checklist</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Etapa</Label>
                <Select value={form.etapa} onValueChange={(v) => setForm({ ...form, etapa: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Escopo</Label>
                <Select
                  value={form.escopo}
                  onValueChange={(v) => setForm({ ...form, escopo: v as typeof form.escopo, empresaIds: [], grupoIds: [] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global</SelectItem>
                    <SelectItem value="GRUPO">Grupos</SelectItem>
                    <SelectItem value="EMPRESA">Empresas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.escopo === "GRUPO" && (
              <div className="space-y-1">
                <Label>Grupos vinculados *</Label>
                <div className="flex flex-wrap gap-2 border rounded-md p-3 min-h-[42px]">
                  {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo</span>}
                  {grupos.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGrupo(g.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        form.grupoIds.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {g.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.escopo === "EMPRESA" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Empresas vinculadas *</Label>
                  <span className="text-xs text-muted-foreground">{form.empresaIds.length} selecionada(s)</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa…"
                    value={empresaSearch}
                    onChange={(e) => setEmpresaSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, empresaIds: empresasFiltradas.map((e) => e.id) }))}
                    className="text-primary hover:underline"
                  >
                    Selecionar {empresaSearch ? "filtradas" : "todas"} ({empresasFiltradas.length})
                  </button>
                  {form.empresaIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, empresaIds: [] }))}
                      className="text-muted-foreground hover:underline"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>
                <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                  {empresasFiltradas.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">Nenhuma empresa</div>
                  )}
                  {empresasFiltradas.map((e) => {
                    const checked = form.empresaIds.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/40 cursor-pointer text-sm"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleEmpresa(e.id)} />
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {e.codigoInterno && (
                            <span className="text-xs text-muted-foreground font-mono">{e.codigoInterno}</span>
                          )}
                          <span className="truncate">{e.razaoSocial}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.obrigatorio}
                onCheckedChange={(v) => setForm({ ...form, obrigatorio: v })}
              />
              <Label>Obrigatório para concluir a etapa</Label>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar item
                </Button>
              </div>
              {form.itens.map((it, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 border rounded">
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder="Texto do item"
                      value={it.texto}
                      onChange={(e) => updateItem(idx, { texto: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={it.obrigatorio}
                        onCheckedChange={(v) => updateItem(idx, { obrigatorio: v })}
                      />
                      <span className="text-xs text-muted-foreground">Obrigatório</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.itens.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum item ainda</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
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
