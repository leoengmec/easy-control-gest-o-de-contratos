import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NATUREZA_LABELS = {
  "339039_servico": "339039 – Outros Serviços de Terceiros (Serviços de Manutenção)",
  "339030_material": "339030 – Material de Consumo (Material p/ Manutenção)"
};

export default function EmpenhoForm({ empenho, contratoId, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const [form, setForm] = useState({
    contrato_id: contratoId,
    ano: empenho?.ano || anoAtual,
    numero_empenho: empenho?.numero_empenho || "",
    natureza_despesa: empenho?.natureza_despesa || "",
    ptres: empenho?.ptres || "",
    valor_total: empenho?.valor_total || "",
    data_inclusao: empenho?.data_inclusao || new Date().toISOString().split("T")[0],
    observacoes: empenho?.observacoes || ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 1 + i);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, ano: parseInt(form.ano), valor_total: parseFloat(form.valor_total) || 0 };
    if (empenho?.id) {
      await base44.entities.NotaEmpenho.update(empenho.id, data);
    } else {
      await base44.entities.NotaEmpenho.create(data);
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a] text-base">{empenho ? "Editar Empenho" : "Novo Empenho"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Número do Empenho *</Label>
              <Input value={form.numero_empenho} onChange={e => set("numero_empenho", e.target.value)} placeholder="ex: 2026NE000040" required />
            </div>
            <div className="space-y-1">
              <Label>Ano *</Label>
              <Select value={String(form.ano)} onValueChange={v => set("ano", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Natureza da Despesa *</Label>
            <Select value={form.natureza_despesa} onValueChange={v => set("natureza_despesa", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione a natureza" /></SelectTrigger>
              <SelectContent>
                {Object.entries(NATUREZA_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.natureza_despesa === "339039_servico" && (
              <p className="text-xs text-gray-500 mt-1">Subelemento 16 – Manutenção e Conservação de Bens Imóveis</p>
            )}
            {form.natureza_despesa === "339030_material" && (
              <p className="text-xs text-gray-500 mt-1">Subelemento 24 – Material p/ Manutenção de Bens Imóveis/Instalações</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>PTRES</Label>
              <Input value={form.ptres} onChange={e => set("ptres", e.target.value)} placeholder="ex: 168312" />
            </div>
            <div className="space-y-1">
              <Label>Valor Total (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_total} onChange={e => set("valor_total", e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Data de Inclusão</Label>
              <Input type="date" value={form.data_inclusao} onChange={e => set("data_inclusao", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving || !form.numero_empenho || !form.natureza_despesa}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}