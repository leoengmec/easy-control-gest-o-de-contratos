import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, History, TrendingUp, TrendingDown, Minus, PiggyBank, LayoutList } from "lucide-react";
import { format } from "date-fns";
import DetalhamentoOrcamentoContrato from "@/components/orcamento/DetalhamentoOrcamentoContrato";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const anoAtual = new Date().getFullYear();

export default function Orcamento() {
  const [lancamentos, setLancamentos] = useState([]);
  const [orcamentosContratuais, setOrcamentosContratuais] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [contratoSel, setContratoSel] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [anoSel, setAnoSel] = useState(String(anoAtual));
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistForm, setShowHistForm] = useState(false);
  const [editingOrc, setEditingOrc] = useState(null);
  const [formOrc, setFormOrc] = useState({ ano: anoAtual, valor_orcado: "", observacoes: "" });
  const [formHist, setFormHist] = useState({ tipo_alteracao: "suplementacao", valor_novo: "", motivo: "", data_alteracao: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = async () => {
    const [oc, h, c, l] = await Promise.all([
      base44.entities.OrcamentoContratualAnual.list(),
      base44.entities.HistoricoOrcamentoContratualAnual.list("-data_alteracao"),
      base44.entities.Contrato.list(),
      base44.entities.LancamentoFinanceiro.list()
    ]);
    setOrcamentosContratuais(oc);
    setHistorico(h);
    setContratos(c);
    setLancamentos(l);
    
    // Extrair anos únicos de orçamentos e lançamentos
    const anosOrc = oc.map(o => o.ano).filter(Boolean);
    const anosLanc = l.map(la => la.ano).filter(Boolean);
    const anosUnicos = [...new Set([...anosOrc, ...anosLanc])].sort((a, b) => b - a);
    setAnosDisponiveis(anosUnicos.map(String));
    
    if (c.length > 0 && !contratoSel) setContratoSel(c[0].id);
    setLoading(false);
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor";

  // Orçamento do contrato selecionado no ano selecionado
  const orcamentoSel = orcamentosContratuais.find(
    o => String(o.ano) === anoSel && o.contrato_id === contratoSel
  );

  // Histórico do contrato/ano selecionados
  const historicoSel = historico.filter(
    h => String(h.ano) === anoSel && h.contrato_id === contratoSel
  );

  // Totais do ano selecionado somando todos os contratos (visão global)
  const totalOrcadoAno = orcamentosContratuais
    .filter(o => String(o.ano) === anoSel)
    .reduce((s, o) => s + (o.valor_orcado || 0), 0);

  const totalPagoAno = lancamentos
    .filter(l => String(l.ano) === anoSel && l.status === "Pago")
    .reduce((s, l) => s + (l.valor || 0), 0);

  const totalAprovAno = lancamentos
    .filter(l => String(l.ano) === anoSel && l.status === "Aprovisionado")
    .reduce((s, l) => s + (l.valor || 0), 0);

  const handleSaveOrc = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      contrato_id: contratoSel,
      ano: parseInt(formOrc.ano),
      valor_orcado: parseFloat(formOrc.valor_orcado) || 0,
      observacoes: formOrc.observacoes,
    };
    if (editingOrc?.id) {
      await base44.entities.OrcamentoContratualAnual.update(editingOrc.id, data);
    } else {
      await base44.entities.OrcamentoContratualAnual.create(data);
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
    const valorAnterior = orcamentoSel.valor_orcado;
    const valorNovo = parseFloat(formHist.valor_novo) || 0;
    await base44.entities.HistoricoOrcamentoContratualAnual.create({
      orcamento_contratual_anual_id: orcamentoSel.id,
      contrato_id: contratoSel,
      ano: orcamentoSel.ano,
      valor_anterior: valorAnterior,
      valor_novo: valorNovo,
      tipo_alteracao: formHist.tipo_alteracao,
      motivo: formHist.motivo,
      data_alteracao: formHist.data_alteracao
    });
    await base44.entities.OrcamentoContratualAnual.update(orcamentoSel.id, { valor_orcado: valorNovo });
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

  const contratoSelecionado = contratos.find(c => c.id === contratoSel);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Orçamento Anual</h1>
          <p className="text-gray-500 text-sm">Dotação orçamentária por contrato</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={anoSel} onValueChange={setAnoSel}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={contratoSel} onValueChange={setContratoSel}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione o contrato..." />
            </SelectTrigger>
            <SelectContent>
              {contratos.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.numero} — {c.contratada?.trim()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && !orcamentoSel && contratoSel && (
            <Button onClick={() => { setFormOrc({ ano: parseInt(anoSel), valor_orcado: "", observacoes: "" }); setShowForm(true); }} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Cadastrar Orçamento
            </Button>
          )}
        </div>
      </div>

      {/* Resumo global do ano */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="p-4">
          <div className="text-xs text-blue-600 font-medium mb-2">CONSOLIDADO {anoSel} — TODOS OS CONTRATOS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total Orçado</div>
              <div className="font-bold text-blue-700">{fmt(totalOrcadoAno)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Pago</div>
              <div className="font-bold text-green-700">{fmt(totalPagoAno)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Aprovisionado</div>
              <div className="font-bold text-amber-700">{fmt(totalAprovAno)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Saldo Disponível</div>
              <div className={`font-bold ${(totalOrcadoAno - totalPagoAno - totalAprovAno) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                {fmt(totalOrcadoAno - totalPagoAno - totalAprovAno)}
              </div>
            </div>
          </div>
          {totalOrcadoAno > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Execução ({(((totalPagoAno + totalAprovAno) / totalOrcadoAno) * 100).toFixed(1)}%)</span>
                <span>{fmt(totalPagoAno + totalAprovAno)} / {fmt(totalOrcadoAno)}</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(((totalPagoAno + totalAprovAno) / totalOrcadoAno) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orçamento do contrato selecionado */}
      {orcamentoSel ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-400 font-medium mb-1">
                  ORÇAMENTO {orcamentoSel.ano} · {contratoSelecionado?.numero}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-gray-500">Valor Orçado</div>
                    <div className="text-xl font-bold text-blue-600 mt-1">{fmt(orcamentoSel.valor_orcado)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Saldo Disponível</div>
                    <div className={`text-xl font-bold mt-1 ${
                      (orcamentoSel.valor_orcado - lancamentos.filter(l => String(l.ano) === anoSel && l.contrato_id === contratoSel && (l.status === "Pago" || l.status === "Aprovisionado")).reduce((s, l) => s + l.valor, 0)) < 0
                      ? "text-red-600" : "text-green-600"
                    }`}>
                      {fmt(orcamentoSel.valor_orcado - lancamentos.filter(l => String(l.ano) === anoSel && l.contrato_id === contratoSel && (l.status === "Pago" || l.status === "Aprovisionado")).reduce((s, l) => s + l.valor, 0))}
                    </div>
                  </div>
                </div>
                {orcamentoSel.observacoes && <div className="mt-3 text-xs text-gray-500">{orcamentoSel.observacoes}</div>}
              </div>
              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setEditingOrc(orcamentoSel); setFormOrc({ ano: orcamentoSel.ano, valor_orcado: orcamentoSel.valor_orcado, observacoes: orcamentoSel.observacoes || "" }); setShowForm(true); }}>
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
        contratoSel && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-gray-400">
              <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <div>Nenhum orçamento cadastrado para {contratoSelecionado?.numero} em {anoSel}</div>
              {canEdit && (
                <Button size="sm" className="mt-3 bg-[#1a2e4a] hover:bg-[#2a4a7a]"
                  onClick={() => { setFormOrc({ ano: parseInt(anoSel), valor_orcado: "", observacoes: "" }); setShowForm(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Cadastrar Orçamento
                </Button>
              )}
            </CardContent>
          </Card>
        )
      )}

      {/* Formulário orçamento */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-[#1a2e4a]">{editingOrc ? "Editar Orçamento" : "Novo Orçamento"} — {contratoSelecionado?.numero}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveOrc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Ano *</Label>
                  <Select value={String(formOrc.ano)} onValueChange={v => setFormOrc(f => ({ ...f, ano: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor Orçado (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={formOrc.valor_orcado}
                    onChange={e => setFormOrc(f => ({ ...f, valor_orcado: e.target.value }))} required />
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
                Valor orçado atual: <strong>{fmt(orcamentoSel.valor_orcado)}</strong>. Informe o novo valor após a alteração.
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
                  <Label>Novo Valor Orçado (R$) *</Label>
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

      {/* Detalhamento por Item */}
      {orcamentoSel && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
              <LayoutList className="w-4 h-4" /> Detalhamento por Item — {contratoSelecionado?.numero} ({anoSel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetalhamentoOrcamentoContrato
              contrato={contratoSelecionado}
              ano={parseInt(anoSel)}
              totalOrcado={orcamentoSel.valor_orcado}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      {historicoSel.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Alterações — {contratoSelecionado?.numero} ({anoSel})
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