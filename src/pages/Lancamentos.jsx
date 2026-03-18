import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, DollarSign, Upload, Info } from "lucide-react";
import LancamentoForm from "@/components/lancamentos/LancamentoForm.jsx";
import ImportarLancamentosLote from "@/components/lancamentos/ImportarLancamentosLote.jsx";
import StatusEditor from "@/components/lancamentos/StatusEditor.jsx";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const statusColors = {
  "SOF": "bg-blue-100 text-blue-800",
  "Pago": "bg-green-100 text-green-800",
  "Cancelado": "bg-gray-100 text-gray-500",
  "Aprovisionado": "bg-amber-100 text-amber-800",
  "Em execução": "bg-purple-100 text-purple-800",
  "Em instrução": "bg-sky-100 text-sky-800"
};
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [user, setUser] = useState(null);
  const [usuarios, setUsuarios] = useState({});
  const [historicos, setHistoricos] = useState([]);
  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showImportar, setShowImportar] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadBase();
  }, []);

  useEffect(() => { loadLancamentos(); }, [filtroAno, filtroContrato]);

  const loadBase = async () => {
    const [c, i, todosLancamentos] = await Promise.all([
      base44.entities.Contrato.list(),
      base44.entities.ItemContrato.list(),
      base44.entities.LancamentoFinanceiro.list()
    ]);
    setContratos(c);
    setItens(i);
    
    // Extrair anos únicos dos lançamentos
    const anosUnicos = [...new Set(todosLancamentos.map(l => l.ano).filter(Boolean))].sort((a, b) => b - a);
    setAnosDisponiveis(anosUnicos.map(String));
    
    loadLancamentos();
  };

  const loadLancamentos = async () => {
    setLoading(true);
    const filter = { ano: parseInt(filtroAno) };
    if (filtroContrato !== "todos") filter.contrato_id = filtroContrato;
    const data = await base44.entities.LancamentoFinanceiro.filter(filter, "-created_date");
    setLancamentos(data);
    
    // Buscar usuários únicos
    const emailsUnicos = [...new Set(data.map(l => l.created_by).filter(Boolean))];
    if (emailsUnicos.length > 0) {
      const users = await base44.entities.User.list();
      const userMap = {};
      users.forEach(u => {
        if (emailsUnicos.includes(u.email)) {
          userMap[u.email] = u.full_name;
        }
      });
      setUsuarios(userMap);
    }

    // Buscar históricos de cancelamento
    const hists = await base44.entities.HistoricoLancamento.filter({ tipo_acao: "cancelamento" });
    setHistoricos(hists);
    
    setLoading(false);
  };

  const handleDelete = async (lancamento) => {
    if (!confirm("Excluir este lançamento?")) return;
    // Se for material, exclui os itens de material associados
    const isMaterial = lancamento.item_label === "Fornecimento de Materiais";
    if (isMaterial) {
      const itensMat = await base44.entities.ItemMaterialNF.filter({ lancamento_financeiro_id: lancamento.id });
      for (const item of itensMat) {
        await base44.entities.ItemMaterialNF.delete(item.id);
      }
    }
    await base44.entities.LancamentoFinanceiro.delete(lancamento.id);
    loadLancamentos();
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor" || user?.role === "fiscal";

  const filtered = lancamentos.filter(l => filtroStatus === "todos" || l.status === filtroStatus);

  const totalFiltrado = filtered.reduce((s, l) => s + (l.valor || 0), 0);

  if (showImportar) return (
    <div className="p-6">
      <ImportarLancamentosLote
        contratos={contratos}
        onComplete={() => { setShowImportar(false); loadLancamentos(); }}
        onCancel={() => setShowImportar(false)}
      />
    </div>
  );

  if (showForm || editing) return (
    <div className="p-6 max-w-2xl mx-auto">
      <LancamentoForm
        lancamento={editing}
        contratos={contratos}
        itens={itens}
        onSave={() => { setShowForm(false); setEditing(null); loadLancamentos(); }}
        onCancel={() => { setShowForm(false); setEditing(null); }}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Lançamentos Financeiros</h1>
          <p className="text-gray-500 text-sm">{filtered.length} lançamento(s) · Total: {fmt(totalFiltrado)}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={() => setShowImportar(true)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <Upload className="w-4 h-4 mr-2" /> Importar em Lote
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
              <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={filtroAno} onValueChange={setFiltroAno}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroContrato} onValueChange={setFiltroContrato}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todos os contratos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os contratos</SelectItem>
            {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Todos os status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Resumo por mês */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const total = filtered.filter(l => l.mes === m).reduce((s, l) => s + l.valor, 0);
          return (
            <div key={m} className={`text-center p-2 rounded-lg border ${total > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"}`}>
              <div className="text-xs text-gray-500">{mesesNomes[i]}</div>
              <div className={`text-xs font-bold mt-0.5 ${total > 0 ? "text-[#1a2e4a]" : "text-gray-300"}`}>
                {total > 0 ? `${(total / 1000).toFixed(0)}k` : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div>Nenhum lançamento encontrado</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-medium text-gray-500">Mês/Ano</th>
                <th className="text-left p-3 font-medium text-gray-500">Contrato</th>
                <th className="text-left p-3 font-medium text-gray-500">Item</th>
                <th className="text-left p-3 font-medium text-gray-500">Status</th>
                <th className="text-right p-3 font-medium text-gray-500">Valor</th>
                <th className="text-left p-3 font-medium text-gray-500">NF / OS / SEI</th>
                <th className="text-left p-3 font-medium text-gray-500">Cadastrado por</th>
                {canEdit && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const contrato = contratos.find(c => c.id === l.contrato_id);
                const item = itens.find(i => i.id === l.item_contrato_id);
                return (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{mesesNomes[(l.mes || 1) - 1]}/{l.ano}</td>
                    <td className="p-3 text-xs text-gray-600">{contrato?.numero || "—"}</td>
                    <td className="p-3 text-xs text-gray-600">{l.item_label || item?.nome || "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {canEdit ? (
                          <StatusEditor lancamento={l} onUpdate={loadLancamentos} />
                        ) : (
                          <Badge className={`text-xs ${statusColors[l.status] || "bg-gray-100 text-gray-600"}`}>
                            {l.status || "—"}
                          </Badge>
                        )}
                        {l.status === "Cancelado" && (() => {
                          const hist = historicos.find(h => h.lancamento_financeiro_id === l.id && h.tipo_acao === "cancelamento");
                          return hist?.motivo ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs">Motivo do Cancelamento:</div>
                                    <div className="text-xs">{hist.motivo}</div>
                                    {hist.realizado_por && (
                                      <div className="text-xs text-gray-400 mt-2">
                                        Por: {hist.realizado_por}
                                      </div>
                                    )}
                                    {hist.data_acao && (
                                      <div className="text-xs text-gray-400">
                                        Em: {new Date(hist.data_acao).toLocaleDateString("pt-BR")}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{fmt(l.valor)}</td>
                    <td className="p-3 text-xs text-gray-500 space-y-0.5">
                      {l.numero_nf && <div>NF: {l.numero_nf}</div>}
                      {l.ordens_servico?.length > 0 ? (
                        l.ordens_servico.map((os, idx) => (
                          <div key={idx}>OS: {os.numero}</div>
                        ))
                      ) : l.os_numero && <div>OS: {l.os_numero}</div>}
                      {l.processo_pagamento_sei && <div>SEI: {l.processo_pagamento_sei}</div>}
                      {!l.numero_nf && !l.ordens_servico?.length && !l.os_numero && !l.processo_pagamento_sei && "—"}
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      <div className="font-medium">{usuarios[l.created_by] || l.created_by || "—"}</div>
                      {l.created_date && (
                        <div className="text-gray-400 mt-0.5">
                          {new Date(l.created_date).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditing(l)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => handleDelete(l)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}