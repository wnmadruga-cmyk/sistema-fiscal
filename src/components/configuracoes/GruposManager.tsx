"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  diasPrazo: number | null;
  sobrepoePrioridade: boolean;
  exigirAbrirCard: boolean;
  exigirConferencia: boolean;
  empresasCount: number;
  empresaIds: string[];
}
interface Empresa { id: string; nome: string }

const empty = { nome: "", descricao: "", cor: "#3b82f6", diasPrazo: null as number | null, sobrepoePrioridade: false, exigirAbrirCard: false, exigirConferencia: false, empresaIds: [] as string[] };

export function GruposManager({ initial, empresas }: { initial: Grupo[]; empresas: Empresa[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(g: Grupo) {
    setEditing(g);
    setForm({ nome: g.nome, descricao: g.descricao ?? "", cor: g.cor ?? "#3b82f6", diasPrazo: g.diasPrazo, sobrepoePrioridade: g.sobrepoePrioridade, exigirAbrirCard: g.exigirAbrirCard, exigirConferencia: g.exigirConferencia, empresaIds: g.empresaIds });
    setOpen(true);
  }

  function toggle(id: string) {
    setForm((f) => ({
      ...f,
      empresaIds: f.empresaIds.includes(id) ? f.empresaIds.filter((x) => x !== id) : [...f.empresaIds, id],
    }));
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
    toast.success("Salvo!");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover este grupo?")) return;
    const res = await fetch(`/api/grupos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao remover"); return; }
    toast.success("Removido");
    router.refresh();
  }

  const filtered = empresas.filter((e) => e.nome.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Grupo</Button>
      </div>
      <div className="grid gap-3">
        {initial.length === 0 && (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhum grupo cadastrado</CardContent></Card>
        )}
        {initial.map((g) => (
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
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>Empresas vinculadas ({form.empresaIds.length})</Label>
                <Input placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs h-8" />
              </div>
              <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma empresa</p>}
                {filtered.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.empresaIds.includes(e.id)}
                      onChange={() => toggle(e.id)}
                    />
                    <span className="text-sm">{e.nome}</span>
                  </label>
                ))}
              </div>
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
