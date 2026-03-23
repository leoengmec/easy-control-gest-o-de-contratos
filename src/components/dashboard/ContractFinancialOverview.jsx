import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GaugeChart from "./GaugeChart";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const ANOS = [2024, 2025, 2026, 2027];

export default function ContractFinancialOverview({ contrato }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [itemFiltro, setItemFiltro] = useState("todos");
  const [orcamentoAnual, setOrcamentoAnual] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [itensOrcados, setItensOrcados] = useState([]);
  const [itensContrato, setItensContrato] = useState([]);

  useEffect(() => {
    if (!contrato?.id) return;
    
    Promise.all([
      base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
    ]).then(([oa, l, oi, ic]) => {
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l || []);
      setItensOrcados(oi || []);
      setItensContrato(ic || []);
    }).catch(err => console.error("Erro ao carregar dados:", err));
  }, [contrato.id, ano]);

  const formatLabel = (label) => {
    if (!label) return "";
    return label.split(' ').map(w => {
      const u = w.toUpperCase();
      if (u === 'MOR') return 'MOR';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  };

  const processarItensDropdown = () => {
    const ativos = itensContrato.filter(i => i.ativo !== false);
    const morNatalExists = ativos.some(i => i.nome?.toUpperCase().includes("NATAL"));
    const morMossoroExists = ativos.some(i => i.nome?.toUpperCase().includes("MOSSORO"));
    
    const avulsos = ativos
      .filter(i => !i.nome?.toUpperCase().includes("NATAL") && !i.nome?.toUpperCase().includes("MOSSORO"))
      .map(i => formatLabel(i.nome));

    const final = [...avulsos];
    if (morNatalExists) final.push("MOR Natal");
    if (morMossoroExists) final.push("MOR Mossoró");
    
    return [...new Set(final)].sort();
  };

  const itensDropdown = processarItensDropdown();

  const calcularDadosExibicao = () => {
    let selecionados = [];
    let orcado = 0;

    if (itemFiltro === "todos") {
      selecionados = lancamentos;
      orcado = orcamentoAnual?.valor_orcado || 0;
    } else if (itemFiltro.startsWith("MOR")) {
      const cidade = itemFiltro.includes("Natal") ? "NATAL" : "MOSSORO";
      selecionados = lancamentos.filter(l => l.item_label?.toUpperCase().includes(cidade));
      orcado = itensOrcados
        .filter(i => i.item_label?.toUpperCase().includes(cidade))
        .reduce((acc, curr) => acc + (curr.valor_orcado || 0), 0);
    } else {
      selecionados = lancamentos.filter(l => formatLabel(l.item_label) === itemFiltro);
      orcado = itensOrcados.find(i => formatLabel(i.item_label) === itemFiltro)?.valor_orcado || 0;
    }

    const pago = selecionados.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprov = selecionados.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

    return { 
      pago, aprov, orcado, 
      pctPago: orcado > 0 ? (pago / orcado) * 100 : 0, 
      pctAprov: orcado > 0 ? (aprov / orcado) * 100 : 0 
    };
  };

  const d = calcularDadosExibicao();

  return (
    <Card className="border border-blue-100 shadow-sm overflow-hidden mb-6">
      <CardHeader className="pb-3 pt-4 px-4 bg-slate-50/80 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[#1a2e4a]">{contrato.numero}</div>
            <div className="text-[11px] text-gray-500 truncate max-w-md italic">{contrato.contratada}</div>
          </div>
          <div className="flex gap-2">
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-24 bg-white shadow-sm border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={itemFiltro} onValueChange={setItemFiltro}>
              <SelectTrigger className="h-8 text-xs w-52 bg-white shadow-sm border-blue-200">
                <SelectValue placeholder="Selecionar Item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                {itensDropdown.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex flex-col items-center">
            <GaugeChart value={d.pctPago} label="Execução Financeira (PAGO)" sublabel={`/ ${fmt(d.orcado)}`} rawValue={d.pago} />
            {itemFiltro !== "todos" && (
              <div className="mt-4 flex flex-col items-center gap-1">
                <div className="px-6 py-1.5 bg-blue-100/50 text-[#1a2e4a] font-bold rounded-full border border-blue-200 text-xs uppercase tracking-wider">{itemFiltro}</div>
                <span className="text-[10px] text-blue-600 font-medium">Valor Pago: {fmt(d.pago)}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <GaugeChart value={d.pctAprov} label="Aprovisionado (SALDO RESERVADO)" sublabel={`/ ${fmt(d.orcado)}`} rawValue={d.aprov} color="#f59e0b" />
            {itemFiltro !== "todos" && (
              <div className="mt-4 flex flex-col items-center gap-1">
                <div className="px-6 py-1.5 bg-amber-100/50 text-amber-700 font-bold rounded-full border border-amber-200 text-xs uppercase tracking-wider">{itemFiltro}</div>
                <span className="text-[10px] text-amber-600 font-medium">Aprovisionado: {fmt(d.aprov)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] text-center">Distribuição Orçamentária por Item</h4>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b">
                  <th className="text-left p-3 font-semibold">Item do Contrato</th>
                  <th className="text-right p-3 font-semibold">Status Orçamentário</th>
                  <th className="text-right p-3 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {itensDropdown.map(label => {
                  const isSelected = itemFiltro === label;
                  const hasOrcamento = itensOrcados.some(i => {
                    const l = formatLabel(i.item_label);
                    return l === label || (label.startsWith("MOR") && i.item_label?.toUpperCase().includes(label.split(' ')[1].toUpperCase()));
                  });
                  return (
                    <tr key={label} className={`border-b border-slate-50 transition-colors ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-medium text-slate-700">{label}</td>
                      <td className="p-3 text-right">
                        {hasOrcamento 
                          ? <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold border border-green-100">CONFIGURADO</span>
                          : <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">SEM TETO ANUAL</span>
                        }
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => setItemFiltro(label)}
                          className={`text-[10px] font-bold uppercase ${isSelected ? "text-blue-600 underline" : "text-slate-400 hover:text-blue-500"}`}
                        >
                          {isSelected ? "Visualizando" : "Filtrar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}