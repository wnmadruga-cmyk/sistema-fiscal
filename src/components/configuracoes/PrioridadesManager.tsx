"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Prioridade {
  id: string;
  nome: string;
  nivel: number;
  cor: string;
  icone: string | null;
  diasPrazo: number;
}

const empty = { nome: "", nivel: 2, cor: "#3b82f6", icone: "", diasPrazo: 0 };

export function PrioridadesManager({ initial }: { initial: Prioridade[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prioridade | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(p: Prioridade) {
    setEditing(p);
    setForm({ nome: p.nome, nivel: p.nivel, cor: p.cor, icone: p.icone ?? "", diasPrazo: p.diasPrazo ?? 0 });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/prioridades/${editing.id}` : "/api/prioridades";
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
    if (!confirm("Remover?")) return;
    const res = await fetch(`/api/prioridades/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Removida");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </div>
      <div className="grid gap-3">
        {initial.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: p.cor }}>{p.nome}</span>
                <span className="text-xs text-muted-foreground">Nível {p.nivel}</span>
                <span className="text-xs text-muted-foreground">Prazo: {p.diasPrazo} dias</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Prioridade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nível (1-4)</Label>
              <Input type="number" min={1} max={4} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-20" />
            </div>
            <div className="space-y-1">
              <Label>Prazo padrão (dias após o fim do mês)</Label>
              <Input type="number" min={0} value={form.diasPrazo} onChange={(e) => setForm({ ...form, diasPrazo: parseInt(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground">Usado para calcular o prazo do card. Pode ser sobrescrito por grupo ou no momento de gerar a competência.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
