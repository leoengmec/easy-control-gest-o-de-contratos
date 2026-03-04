import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TIPO_MANUTENCAO_LABELS = {
  sem_mao_de_obra_residente: "Sem Mão de Obra Residente",
  com_mao_de_obra_residente: "Com Mão de Obra Residente"
};

export default function ItemForm({ item, contratoId, prazoVigenciaMeses, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: item?.nome || "",
    descricao: item?.descricao || "",
    unidade: item?.unidade || "",
    tipo_contrato_manutencao: item?.tipo_contrato_manutencao || "sem_mao_de_obra_residente",
    grupo_servico: item?.grupo_servico || "fixo",
    valor_unitario: item?.valor_unitario || "",
    quantidade_contratada: item?.quantidade_contratada || "",
    valor_total_contratado: item?.valor_total_contratado || "",
    periodicidade: item?.periodicidade || "mensal",
    prazo_vigencia_meses: item?.prazo_vigencia_meses || prazoVigenciaMeses || "",
    ativo: item?.ativo !== false
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    const updated = { ...form, [k]: v };
    // Recalculate valor_total_contratado when relevant fields change
    const vu = parseFloat(k === "valor_unitario" ? v : updated.valor_unitario) || 0;
    const qtd = parseFloat(k === "quantidade_contratada" ? v : updated.quantidade_contratada) || 0;
    if ((k === "valor_unitario" || k === "quantidade_contratada") && vu && qtd) {
      updated.valor_total_contratado = (vu * qtd).toFixed(2);
    }
    setForm(updated);
  };

  // Calculated display values
  const vu = parseFloat(form.valor_unitario) || 0;
  const qtd = parseFloat(form.quantidade_contratada) || 0;
  const prazo = parseFloat(form.prazo_vigencia_meses) || 0;

  const valorMensal = form.periodicidade === "mensal" ? vu * qtd : vu;
  const valorAnual = form.periodicidade === "mensal" ? valorMensal * 12 : (form.periodicidade === "anual" ? vu * qtd : vu);
  const valorVigencia = prazo > 0 && form.periodicidade === "mensal"
    ? valorMensal * prazo
    : parseFloat(form.valor_total_contratado) || vu * Math.max(qtd, 1);

  const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      contrato_id: contratoId,
      valor_unitario: parseFloat(form.valor_unitario) || 0,
      quantidade_contratada: parseFloat(form.quantidade_contratada) || null,
      valor_total_contratado: parseFloat(form.valor_total_contratado) || 0,
      prazo_vigencia_meses: parseFloat(form.prazo_vigencia_meses) || null
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
      <CardHeader>
        <CardTitle className="text-base text-[#1a2e4a]">{item ? "Editar Item" : "Novo Item"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Tipo de manutenção e grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de Manutenção *</Label>
              <Select value={form.tipo_contrato_manutencao} onValueChange={v => set("tipo_contrato_manutencao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_mao_de_obra_residente">Sem Mão de Obra Residente</SelectItem>
                  <SelectItem value="com_mao_de_obra_residente">Com Mão de Obra Residente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Grupo do Serviço *</Label>
              <Select value={form.grupo_servico} onValueChange={v => set("grupo_servico", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Serviço Fixo (recorrente mensal)</SelectItem>
                  <SelectItem value="por_demanda">Serviço por Demanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nome e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome do Serviço *</Label>
              <Input
                value={form.nome}
                onChange={e => set("nome", e.target.value)}
                required
                placeholder="Ex: Engenheiro de Campo Natal"
              />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={e => set("unidade", e.target.value)} placeholder="Ex: mês, unid, hora" />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Descrição detalhada do serviço" rows={2} />
          </div>

          {/* Periodicidade, valores e quantidade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <Label>Quantidade</Label>
              <Input type="number" step="0.01" min="0" value={form.quantidade_contratada} onChange={e => set("quantidade_contratada", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>V. Total (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.valor_total_contratado} onChange={e => set("valor_total_contratado", e.target.value)} />
            </div>
          </div>

          {/* Prazo vigência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Prazo da Vigência (meses)</Label>
              <Input
                type="number"
                min="0"
                value={form.prazo_vigencia_meses}
                onChange={e => set("prazo_vigencia_meses", e.target.value)}
                placeholder="Ex: 12"
              />
              <p className="text-xs text-gray-400">Usado para calcular o valor da vigência total</p>
            </div>
          </div>

          {/* Preview dos valores calculados */}
          {vu > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Valores Calculados</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Valor Mensal</div>
                  <div className="font-bold text-[#1a2e4a]">{fmt(valorMensal)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Valor Anual</div>
                  <div className="font-bold text-[#1a2e4a]">{fmt(valorAnual)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">V. Vigência {prazo > 0 ? `(${prazo}m)` : ""}</div>
                  <div className="font-bold text-[#1a2e4a]">{fmt(valorVigencia)}</div>
                </div>
              </div>
            </div>
          )}

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