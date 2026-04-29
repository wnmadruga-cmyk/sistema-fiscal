"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Search, X } from "lucide-react";

interface Erro {
  id: string;
  nome: string;
  descricao: string | null;
  categorias: string[];
  peso: number;
  pesosCategoria: Record<string, number>;
  empresaIds: string[];
  grupoIds: string[];
}

interface Props {
  initial: Erro[];
  empresas: { id: string; razaoSocial: string; codigoInterno: string | null }[];
  grupos: { id: string; nome: string; cor: string | null }[];
}

const empty = {
  nome: "",
  descricao: "",
  categorias: [] as string[],
  peso: 1,
  pesosCategoria: {} as Record<string, number>,
  empresaIds: [] as string[],
  grupoIds: [] as string[],
};

export function ErrosManager({ initial, empresas, grupos }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Erro | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [categoriaInput, setCategoriaInput] = useState("");

  function openNew() {
    setEditing(null);
    setForm(empty);
    setEmpresaSearch("");
    setCategoriaInput("");
    setOpen(true);
  }

  function openEdit(e: Erro) {
    setEditing(e);
    setForm({
      nome: e.nome,
      descricao: e.descricao ?? "",
      categorias: e.categorias ?? [],
      peso: e.peso ?? 1,
      pesosCategoria: e.pesosCategoria ?? {},
      empresaIds: e.empresaIds,
      grupoIds: e.grupoIds,
    });
    setEmpresaSearch("");
    setCategoriaInput("");
    setOpen(true);
  }

  function addCategoria() {
    const v = categoriaInput.trim();
    if (!v || form.categorias.includes(v)) {
      setCategoriaInput("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      categorias: [...prev.categorias, v],
      pesosCategoria: { ...prev.pesosCategoria, [v]: prev.pesosCategoria[v] ?? 1 },
    }));
    setCategoriaInput("");
  }

  function removeCategoria(c: string) {
    setForm((prev) => {
      const next = { ...prev.pesosCategoria };
      delete next[c];
      return { ...prev, categorias: prev.categorias.filter((x) => x !== c), pesosCategoria: next };
    });
  }

  function setPesoCategoria(c: string, peso: number) {
    setForm((prev) => ({
      ...prev,
      pesosCategoria: { ...prev.pesosCategoria, [c]: Math.max(1, Math.min(10, peso || 1)) },
    }));
  }

  async function save() {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/erros-possiveis/${editing.id}` : "/api/erros-possiveis";
    const method = editing ? "PUT" : "POST";
    const categoriasFinal = categoriaInput.trim() && !form.categorias.includes(categoriaInput.trim())
      ? [...form.categorias, categoriaInput.trim()]
      : form.categorias;
    const payload = {
      ...form,
      categorias: categoriasFinal,
      descricao: form.descricao.trim() || null,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro ao salvar");
      return;
    }
    toast.success(editing ? "Erro atualizado!" : "Erro cadastrado!");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover este erro?")) return;
    const res = await fetch(`/api/erros-possiveis/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Removido");
    router.refresh();
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

  function selecionarTodas() {
    setForm((prev) => ({ ...prev, empresaIds: empresasFiltradas.map((e) => e.id) }));
  }

  function limparEmpresas() {
    setForm((prev) => ({ ...prev, empresaIds: [] }));
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Erro
        </Button>
      </div>

      <div className="grid gap-3">
        {initial.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">
            Nenhum erro cadastrado ainda.
          </CardContent></Card>
        )}
        {initial.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{e.nome}</h3>
                  {e.categorias?.map((c) => (
                    <Badge key={c} variant="outline">{c} · peso {e.pesosCategoria?.[c] ?? e.peso ?? 1}</Badge>
                  ))}
                  {e.categorias.length === 0 && (
                    <Badge variant="secondary">Peso {e.peso ?? 1}</Badge>
                  )}
                </div>
                {e.descricao && <p className="text-sm text-muted-foreground mb-2">{e.descricao}</p>}
                <div className="flex flex-wrap gap-1">
                  {e.grupoIds.map((gid) => {
                    const g = grupos.find((x) => x.id === gid);
                    return g && (
                      <Badge key={gid} style={{ backgroundColor: g.cor ?? "#64748b", color: "white" }}>
                        🗂 {g.nome}
                      </Badge>
                    );
                  })}
                  {e.empresaIds.length > 0 && (
                    <Badge variant="secondary">🏢 {e.empresaIds.length} empresa(s)</Badge>
                  )}
                  {!e.grupoIds.length && !e.empresaIds.length && (
                    <span className="text-xs text-muted-foreground italic">Sem vínculos</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Erro" : "Novo Erro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Categorias (com peso individual de 1 a 10)</Label>
              <div className="space-y-1.5">
                {form.categorias.map((c) => (
                  <div key={c} className="flex items-center gap-2 border rounded-md px-2 py-1.5">
                    <span className="flex-1 text-sm">{c}</span>
                    <Label className="text-xs text-muted-foreground">Peso</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="w-20 h-8"
                      value={form.pesosCategoria[c] ?? 1}
                      onChange={(e) => setPesoCategoria(c, Number(e.target.value))}
                    />
                    <button type="button" onClick={() => removeCategoria(c)} className="text-muted-foreground hover:text-destructive p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova categoria (Enter para adicionar)"
                    value={categoriaInput}
                    onChange={(e) => setCategoriaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addCategoria();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCategoria}>Adicionar</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Label className="text-xs text-muted-foreground">Peso padrão (sem categoria):</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  className="w-20 h-8"
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrição (aparece em letra miúda na tela de conferência)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Vincular a Grupos</Label>
              <div className="flex flex-wrap gap-2 border rounded-md p-3 min-h-[42px]">
                {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo cadastrado</span>}
                {grupos.map((g) => (
                  <button key={g.id} type="button" onClick={() => toggleGrupo(g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${form.grupoIds.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {g.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Vincular a Empresas específicas</Label>
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
                <button type="button" onClick={selecionarTodas} className="text-primary hover:underline">
                  Selecionar {empresaSearch ? "filtradas" : "todas"} ({empresasFiltradas.length})
                </button>
                {form.empresaIds.length > 0 && (
                  <button type="button" onClick={limparEmpresas} className="text-muted-foreground hover:underline">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {e.codigoInterno && (
                            <span className="text-xs text-muted-foreground font-mono">{e.codigoInterno}</span>
                          )}
                          <span className="truncate">{e.razaoSocial}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
