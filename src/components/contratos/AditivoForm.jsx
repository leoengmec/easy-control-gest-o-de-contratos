import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tipoLabels = {
  tempo: "Prorrogação de Prazo",
  repactuacao: "Repactuação",
  reajuste: "Reajuste de Valor",
  inclusao_itens: "Inclusão de Itens",
  exclusao_itens: "Exclusão de Itens",
  outro: "Outro"
};

export default function AditivoForm({ contratoId, aditivo, valorAtual, onSave, onCancel }) {
  const [form, setForm] = useState({
    contrato_id: contratoId,
    tipo: aditivo?.tipo || "",
    numero_aditivo: aditivo?.numero_aditivo || "",
    data_assinatura: aditivo?.data_assinatura || "",
    nova_data_fim: aditivo?.nova_data_fim || "",
    valor_anterior: aditivo?.valor_anterior ?? (valorAtual || ""),
    novo_valor: aditivo?.novo_valor || "",
    percentual_reajuste: aditivo?.percentual_reajuste || "",
    documento_sei: aditivo?.documento_sei || "",
    descricao: aditivo?.descricao || ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      valor_anterior: parseFloat(form.valor_anterior) || null,
      novo_valor: parseFloat(form.novo_valor) || null,
      percentual_reajuste: parseFloat(form.percentual_reajuste) || null
    };
    if (aditivo?.id) {
      await base44.entities.Aditivo.update(aditivo.id, data);
    } else {
      await base44.entities.Aditivo.create(data);
      // Se for aditivo de tempo, atualiza a data_fim do contrato
      if (data.tipo === "tempo" && data.nova_data_fim) {
        await base44.entities.Contrato.update(contratoId, { data_fim: data.nova_data_fim });
      }
      // Se for aditivo de valor, atualiza o valor_global
      if ((data.tipo === "repactuacao" || data.tipo === "reajuste") && data.novo_valor) {
        await base44.entities.Contrato.update(contratoId, { valor_global: data.novo_valor });
      }
    }
    onSave();
  };

  const showCamposTempo = form.tipo === "tempo";
  const showCamposValor = form.tipo === "repactuacao" || form.tipo === "reajuste";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a] text-base">{aditivo ? "Editar Aditivo" : "Registrar Termo Aditivo"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de Aditivo *</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número do Aditivo</Label>
              <Input value={form.numero_aditivo} onChange={e => set("numero_aditivo", e.target.value)} placeholder="Ex: 1º Aditivo" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data de Assinatura *</Label>
              <Input type="date" value={form.data_assinatura} onChange={e => set("data_assinatura", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Documento SEI</Label>
              <Input value={form.documento_sei} onChange={e => set("documento_sei", e.target.value)} placeholder="Número do documento SEI" />
            </div>
          </div>

          {showCamposTempo && (
            <div className="space-y-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Label>Nova Data de Término *</Label>
              <Input type="date" value={form.nova_data_fim} onChange={e => set("nova_data_fim", e.target.value)} />
              <p className="text-xs text-blue-600">A data de término do contrato será atualizada automaticamente.</p>
            </div>
          )}

          {showCamposValor && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="space-y-1">
                <Label>Valor Anterior (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_anterior} onChange={e => set("valor_anterior", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Novo Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.novo_valor} onChange={e => set("novo_valor", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>% Reajuste</Label>
                <Input type="number" step="0.01" value={form.percentual_reajuste} onChange={e => set("percentual_reajuste", e.target.value)} placeholder="Ex: 5.5" />
              </div>
              <p className="text-xs text-amber-600 sm:col-span-3">O valor global do contrato será atualizado automaticamente.</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Descrição / Justificativa</Label>
            <Textarea value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Descreva o motivo e as alterações do aditivo" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Aditivo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}