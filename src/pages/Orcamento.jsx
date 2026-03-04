import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, History, TrendingUp, TrendingDown, Minus, PiggyBank } from "lucide-react";
import { format } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const anoAtual = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);

export default function Orcamento() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [anoSel, setAnoSel] = useState(String(anoAtual));
  const [showForm, setShowForm] = useState(false);
  const [showHistForm, setShowHistForm] = useState(false);
  const [editingOrc, setEditingOrc] = useState(null);
  const [formOrc, setFormOrc] = useState({ ano: anoAtual, valor_dotacao_inicial: "", valor_dotacao_atual: "", observacoes: "" });
  const [formHist, setFormHist] = useState({ tipo_alteracao: "suplementacao", valor_novo: "", motivo: "", data_alteracao: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = async () => {
    const [o, h] = await Promise.all([
      base44.entities.OrcamentoAnual.list(),
      base44.entities.HistoricoOrcamento.list("-data_alteracao")
    ]);
    setOrcamentos(o);
    setHistorico(h);
    setLoading(false);
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor";

  const orcamentoSel = orcamentos.find(o => String(o.ano) === anoSel);
  const historicoSel = historico.filter(h => String(h.ano) === anoSel);

  const handleSaveOrc = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...formOrc,
      ano: parseInt(formOrc.ano),
      valor_dotacao_inicial: parseFloat(formOrc.valor_dotacao_inicial) || 0,
      valor_dotacao_atual: parseFloat(formOrc.valor_dotacao_atual) || 0
    };
    if (editingOrc?.id) {
      await base44.entities.OrcamentoAnual.update(editingOrc.id, data);
    } else {
      await base44.entities.OrcamentoAnual.create(data);
    }
    setSaving(false);
    setShowForm(false);
    setEditingOrc(null);
    load();
  };

  const handleRegistrarAlteracao = async (e) => {
    e.preventDefault();
    if (!orcamentoSel) return;
    setSaving(true);
    const valorAnterior = orcamentoSel.valor_dotacao_atual;
    const valorNovo = parseFloat(formHist.valor_novo) || 0;
    await base44.entities.HistoricoOrcamento.create({
      orcamento_anual_id: orcamentoSel.id,
      ano: orcamentoSel.ano,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      tipo_alteracao: formHist.tipo_alteracao,
      motivo: formHist.motivo,
      data_alteracao: formHist.data_alteracao
    });
    await base44.entities.OrcamentoAnual.update(orcamentoSel.id, { valor_dotacao_atual: valorNovo });
    setSaving(false);
    setShowHistForm(false);
    setFormHist({ tipo_alteracao: "suplementacao", valor_novo: "", motivo: "", data_alteracao: new Date().toISOString().split("T")[0] });
    load();
  };

  const tipoIcone = (tipo) => {
    if (["suplementacao"].includes(tipo)) return <TrendingUp className="w-3.5 h-3.5 text-green-600" />;
    if (["reducao", "corte"].includes(tipo)) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Orçamento Anual</h1>
          <p className="text-gray-500 text-sm">Dotação orçamentária e histórico de alterações</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={anoSel} onValueChange={setAnoSel}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
          </Select>
          {canEdit && !orcamentoSel && (
            <Button onClick={() => { setFormOrc({ ano: parseInt(anoSel), valor_dotacao_inicial: "", valor_dotacao_atual: "", observacoes: "" }); setShowForm(true); }} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Cadastrar Orçamento
            </Button>
          )}
        </div>
      </div>

      {/* Orçamento atual */}
      {orcamentoSel ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">ORÇAMENTO {orcamentoSel.ano}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-gray-500">Dotação Inicial</div>
                    <div className="text-xl font-bold text-[#1a2e4a] mt-1">{fmt(orcamentoSel.valor_dotacao_inicial)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Dotação Atual</div>
                    <div className="text-xl font-bold text-blue-600 mt-1">{fmt(orcamentoSel.valor_dotacao_atual)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Variação</div>
                    <div className={`text-xl font-bold mt-1 ${orcamentoSel.valor_dotacao_atual >= orcamentoSel.valor_dotacao_inicial ? "text-green-600" : "text-red-600"}`}>
                      {fmt(orcamentoSel.valor_dotacao_atual - orcamentoSel.valor_dotacao_inicial)}
                    </div>
                  </div>
                </div>
                {orcamentoSel.observacoes && <div className="mt-3 text-xs text-gray-500">{orcamentoSel.observacoes}</div>}
              </div>
              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setEditingOrc(orcamentoSel); setFormOrc({ ...orcamentoSel }); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowHistForm(true)} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                    <History className="w-3.5 h-3.5 mr-1" /> Registrar Alteração
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-400">
            <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div>Nenhum orçamento cadastrado para {anoSel}</div>
          </CardContent>
        </Card>
      )}

      {/* Formulário orçamento */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-[#1a2e4a]">{editingOrc ? "Editar Orçamento" : "Novo Orçamento"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveOrc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Ano *</Label>
                  <Select value={String(formOrc.ano)} onValueChange={v => setFormOrc(f => ({ ...f, ano: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Dotação Inicial (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={formOrc.valor_dotacao_inicial}
                    onChange={e => setFormOrc(f => ({ ...f, valor_dotacao_inicial: e.target.value, valor_dotacao_atual: f.valor_dotacao_atual || e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Dotação Atual (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={formOrc.valor_dotacao_atual}
                    onChange={e => setFormOrc(f => ({ ...f, valor_dotacao_atual: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={formOrc.observacoes} onChange={e => setFormOrc(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingOrc(null); }} disabled={saving}>Cancelar</Button>
                <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulário de alteração */}
      {showHistForm && orcamentoSel && (
        <Card className="border-amber-200">
          <CardHeader><CardTitle className="text-sm text-amber-700">Registrar Alteração Orçamentária</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleRegistrarAlteracao} className="space-y-4">
              <div className="text-xs text-gray-500 bg-amber-50 rounded p-3">
                Dotação atual: <strong>{fmt(orcamentoSel.valor_dotacao_atual)}</strong>. Informe o novo valor após a alteração.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Tipo de Alteração *</Label>
                  <Select value={formHist.tipo_alteracao} onValueChange={v => setFormHist(f => ({ ...f, tipo_alteracao: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suplementacao">Suplementação</SelectItem>
                      <SelectItem value="reducao">Redução</SelectItem>
                      <SelectItem value="corte">Corte</SelectItem>
                      <SelectItem value="remanejamento">Remanejamento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Novo Valor da Dotação (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={formHist.valor_novo} onChange={e => setFormHist(f => ({ ...f, valor_novo: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Data da Alteração *</Label>
                  <Input type="date" value={formHist.data_alteracao} onChange={e => setFormHist(f => ({ ...f, data_alteracao: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motivo / Justificativa</Label>
                <Textarea value={formHist.motivo} onChange={e => setFormHist(f => ({ ...f, motivo: e.target.value }))} rows={2} placeholder="Descreva o motivo da alteração orçamentária..." />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowHistForm(false)} disabled={saving}>Cancelar</Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={saving}>{saving ? "Salvando..." : "Registrar Alteração"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      {orcamentoSel && historicoSel.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Alterações ({anoSel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicoSel.map(h => (
                <div key={h.id} className="flex items-start gap-3 border rounded-lg p-3">
                  <div className="mt-0.5">{tipoIcone(h.tipo_alteracao)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{h.tipo_alteracao}</Badge>
                      <span className="text-xs text-gray-500">{h.data_alteracao ? format(new Date(h.data_alteracao), "dd/MM/yyyy") : "—"}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {fmt(h.valor_anterior)} → <strong className={h.valor_novo >= h.valor_anterior ? "text-green-600" : "text-red-600"}>{fmt(h.valor_novo)}</strong>
                      <span className={`ml-2 ${h.valor_novo >= h.valor_anterior ? "text-green-600" : "text-red-600"}`}>
                        ({h.valor_novo >= h.valor_anterior ? "+" : ""}{fmt(h.valor_novo - h.valor_anterior)})
                      </span>
                    </div>
                    {h.motivo && <div className="text-xs text-gray-400 mt-1">{h.motivo}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}