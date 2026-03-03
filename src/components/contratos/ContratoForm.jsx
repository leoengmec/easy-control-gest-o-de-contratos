import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContratoForm({ contrato, onSave, onCancel }) {
  const [form, setForm] = useState({
    numero: contrato?.numero || "",
    objeto: contrato?.objeto || "",
    contratada: contrato?.contratada || "",
    cnpj: contrato?.cnpj || "",
    valor_global: contrato?.valor_global || "",
    data_inicio: contrato?.data_inicio || "",
    data_fim: contrato?.data_fim || "",
    status: contrato?.status || "ativo",
    fiscal_email: contrato?.fiscal_email || "",
    gestor_email: contrato?.gestor_email || "",
    processo_sei: contrato?.processo_sei || "",
    observacoes: contrato?.observacoes || ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, valor_global: parseFloat(form.valor_global) || 0 };
    if (contrato?.id) {
      await base44.entities.Contrato.update(contrato.id, data);
    } else {
      await base44.entities.Contrato.create(data);
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a]">{contrato ? "Editar Contrato" : "Novo Contrato"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Número do Contrato *</Label>
              <Input value={form.numero} onChange={e => set("numero", e.target.value)} required placeholder="Ex: 001/2025" />
            </div>
            <div className="space-y-1">
              <Label>Processo SEI</Label>
              <Input value={form.processo_sei} onChange={e => set("processo_sei", e.target.value)} placeholder="Ex: 0000000-00.0000.0.00.0000" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Objeto do Contrato *</Label>
            <Textarea value={form.objeto} onChange={e => set("objeto", e.target.value)} required placeholder="Descrição do objeto contratado" rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Empresa Contratada *</Label>
              <Input value={form.contratada} onChange={e => set("contratada", e.target.value)} required placeholder="Nome da empresa" />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Valor Global (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_global} onChange={e => set("valor_global", e.target.value)} required placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Data de Início *</Label>
              <Input type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Data de Término *</Label>
              <Input type="date" value={form.data_fim} onChange={e => set("data_fim", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email do Fiscal</Label>
              <Input type="email" value={form.fiscal_email} onChange={e => set("fiscal_email", e.target.value)} placeholder="fiscal@jfrn.jus.br" />
            </div>
            <div className="space-y-1">
              <Label>Email do Gestor</Label>
              <Input type="email" value={form.gestor_email} onChange={e => set("gestor_email", e.target.value)} placeholder="gestor@jfrn.jus.br" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações gerais sobre o contrato" rows={2} />
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