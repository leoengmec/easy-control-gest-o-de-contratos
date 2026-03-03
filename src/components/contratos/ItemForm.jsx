import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ItemForm({ item, contratoId, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: item?.nome || "",
    descricao: item?.descricao || "",
    unidade: item?.unidade || "",
    valor_unitario: item?.valor_unitario || "",
    quantidade_contratada: item?.quantidade_contratada || "",
    valor_total_contratado: item?.valor_total_contratado || "",
    periodicidade: item?.periodicidade || "mensal",
    ativo: item?.ativo !== false
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    const updated = { ...form, [k]: v };
    if (k === "valor_unitario" || k === "quantidade_contratada") {
      const vu = parseFloat(k === "valor_unitario" ? v : form.valor_unitario) || 0;
      const qtd = parseFloat(k === "quantidade_contratada" ? v : form.quantidade_contratada) || 0;
      if (vu && qtd) updated.valor_total_contratado = (vu * qtd).toFixed(2);
    }
    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      contrato_id: contratoId,
      valor_unitario: parseFloat(form.valor_unitario) || 0,
      quantidade_contratada: parseFloat(form.quantidade_contratada) || null,
      valor_total_contratado: parseFloat(form.valor_total_contratado) || 0
    };
    if (item?.id) {
      await base44.entities.ItemContrato.update(item.id, data);
    } else {
      await base44.entities.ItemContrato.create(data);
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base text-[#1a2e4a]">{item ? "Editar Item" : "Novo Item"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome do Item *</Label>
              <Input value={form.nome} onChange={e => set("nome", e.target.value)} required placeholder="Ex: Mão de obra residente" />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={e => set("unidade", e.target.value)} placeholder="Ex: mês, unid, hora" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Descrição detalhada do item" rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Periodicidade</Label>
              <Select value={form.periodicidade} onValueChange={v => set("periodicidade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="eventual">Eventual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="unico">Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor Unitário (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_unitario} onChange={e => set("valor_unitario", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Quantidade Contratada</Label>
              <Input type="number" step="0.01" min="0" value={form.quantidade_contratada} onChange={e => set("quantidade_contratada", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Total Contratado (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_total_contratado} onChange={e => set("valor_total_contratado", e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}