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

interface Forma { id: string; nome: string }

export function FormasChegadaManager({ initial }: { initial: Forma[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Forma | null>(null);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing(null); setNome(""); setOpen(true); }
  function openEdit(f: Forma) { setEditing(f); setNome(f.nome); setOpen(true); }

  async function save() {
    if (!nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const url = editing ? `/api/formas-chegada/${editing.id}` : "/api/formas-chegada";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Erro");
      return;
    }
    toast.success("Salvo!");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover?")) return;
    const res = await fetch(`/api/formas-chegada/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro"); return; }
    toast.success("Removido");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </div>
      <div className="grid gap-2">
        {initial.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma cadastrada — adicione as formas que sua equipe usa</CardContent></Card>
        )}
        {initial.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <span>{f.nome}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} Forma de Chegada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Email, Acesso ao sistema, ALT, WhatsApp..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
