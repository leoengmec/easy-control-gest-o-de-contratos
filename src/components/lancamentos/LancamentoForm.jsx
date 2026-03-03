import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const [form, setForm] = useState({
    contrato_id: lancamento?.contrato_id || "",
    item_contrato_id: lancamento?.item_contrato_id || "",
    ano: lancamento?.ano || anoAtual,
    mes: lancamento?.mes || new Date().getMonth() + 1,
    tipo: lancamento?.tipo || "pagamento",
    valor: lancamento?.valor || "",
    numero_nf: lancamento?.numero_nf || "",
    numero_empenho: lancamento?.numero_empenho || "",
    data_lancamento: lancamento?.data_lancamento || new Date().toISOString().split("T")[0],
    status: lancamento?.status || "aprovado_nao_pago",
    observacoes: lancamento?.observacoes || ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const itensContrato = itens.filter(i => i.contrato_id === form.contrato_id);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      ano: parseInt(form.ano),
      mes: parseInt(form.mes),
      valor: parseFloat(form.valor) || 0
    };
    if (lancamento?.id) {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, data);
    } else {
      await base44.entities.LancamentoFinanceiro.create(data);
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-[#1a2e4a]">{lancamento ? "Editar Lançamento" : "Novo Lançamento"}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Contrato *</Label>
              <Select value={form.contrato_id} onValueChange={v => { set("contrato_id", v); set("item_contrato_id", ""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                <SelectContent>
                  {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Item do Contrato</Label>
              <Select value={form.item_contrato_id} onValueChange={v => set("item_contrato_id", v)} disabled={!form.contrato_id}>
                <SelectTrigger><SelectValue placeholder="Selecione o item (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sem item específico</SelectItem>
                  {itensContrato.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Mês *</Label>
              <Select value={String(form.mes)} onValueChange={v => set("mes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mesesNomes.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano *</Label>
              <Select value={String(form.ano)} onValueChange={v => set("ano", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagamento">Pagamento</SelectItem>
                  <SelectItem value="provisao">Provisão</SelectItem>
                  <SelectItem value="empenho">Empenho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado_nao_pago">Aprovado/Não pago</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => set("valor", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Número da NF</Label>
              <Input value={form.numero_nf} onChange={e => set("numero_nf", e.target.value)} placeholder="Nº da Nota Fiscal" />
            </div>
            <div className="space-y-1">
              <Label>Número do Empenho</Label>
              <Input value={form.numero_empenho} onChange={e => set("numero_empenho", e.target.value)} placeholder="Nº do empenho" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data do Lançamento</Label>
              <Input type="date" value={form.data_lancamento} onChange={e => set("data_lancamento", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving || !form.contrato_id}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}