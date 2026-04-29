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

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

const empty = { nome: "", cor: "#3b82f6" };

export function EtiquetasManager({ initial }: { initial: Etiqueta[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Etiqueta | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(e: Etiqueta) {
    setEditing(e);
    setForm({ nome: e.nome, cor: e.cor });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const url = editing ? `/api/etiquetas/${editing.id}` : "/api/etiquetas";
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
    if (!confirm("Remover esta etiqueta?")) return;
    const res = await fetch(`/api/etiquetas/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao remover"); return; }
    toast.success("Removida");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Etiqueta</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {initial.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-6 text-center text-muted-foreground">Nenhuma etiqueta cadastrada</CardContent></Card>
        )}
        {initial.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: e.cor }}>{e.nome}</span>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Etiqueta" : "Nova Etiqueta"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-10 w-20" />
                <span className="px-3 py-1 rounded-full text-xs text-white" style={{ background: form.cor }}>{form.nome || "Preview"}</span>
              </div>
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
