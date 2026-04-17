import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, Upload, Search } from "lucide-react";
import LancamentoForm from "@/components/lancamentos/LancamentoForm.jsx";
import ImportarLancamentosLote from "@/components/lancamentos/ImportarLancamentosLote.jsx";

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

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { loadLancamentos(); }, [filtroAno, filtroContrato]);

  const loadBase = async () => {
    const c = await base44.entities.Contrato.list();
    setContratos(c);
  };

  const loadLancamentos = async () => {
    setLoading(true);
    try {
      const filter = { ano: parseInt(filtroAno) };
      if (filtroContrato !== "todos") filter.contrato_id = filtroContrato;
      const data = await base44.entities.LancamentoFinanceiro.filter(filter, "-created_date");
      setLancamentos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = lancamentos.filter(l => {
    const termo = filtroBusca.toLowerCase();
    return !filtroBusca || 
           l.numero_nf?.toLowerCase().includes(termo) || 
           l.item_label?.toLowerCase().includes(termo);
  });

  const totalGeral = filtered.reduce((s, l) => s + (l.valor || 0), 0);

  if (showImportar) return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <ImportarLancamentosLote 
        contratos={contratos} 
        onComplete={() => { setShowImportar(false); loadLancamentos(); }} 
        onCancel={() => setShowImportar(false)} 
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1a2e4a] tracking-tight">Financeiro</h1>
          <p className="text-gray-500 font-medium">Gestão de Lançamentos e Notas Fiscais</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportar(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <Upload className="w-4 h-4 mr-2" /> Importar Lote
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-[#1a2e4a]">
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <Label className="text-xs uppercase text-gray-400 font-bold">Ano</Label>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs uppercase text-gray-400 font-bold">Contrato</Label>
          <Select value={filtroContrato} onValueChange={setFiltroContrato}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Contratos</SelectItem>
              {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} - {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-gray-400 font-bold">Busca Rápida</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="NF, Item..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <Card>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-600">Período</th>
                <th className="text-left p-4 font-semibold text-gray-600">Item/Label</th>
                <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                <th className="text-right p-4 font-semibold text-gray-600">Valor</th>
                <th className="text-left p-4 font-semibold text-gray-600">NF / Processo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center p-10 text-gray-400">Carregando dados...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-10 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium">{mesesNomes[(l.mes || 1) - 1]}/{l.ano}</td>
                    <td className="p-4 text-gray-600">{l.item_label || "—"}</td>
                    <td className="p-4">
                      <Badge className={statusColors[l.status] || "bg-gray-100"}>{l.status}</Badge>
                    </td>
                    <td className="p-4 text-right font-bold text-[#1a2e4a]">{fmt(l.valor)}</td>
                    <td className="p-4 text-xs text-gray-500">
                      {l.numero_nf && <div>NF: {l.numero_nf}</div>}
                      {l.processo_pagamento_sei && <div>SEI: {l.processo_pagamento_sei}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan="3" className="p-4 text-right text-gray-500 uppercase text-xs">Total Filtrado</td>
                <td className="p-4 text-right text-lg text-[#1a2e4a]">{fmt(totalGeral)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}