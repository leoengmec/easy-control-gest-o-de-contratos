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
  const [naturezas, setNaturezas] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
      base44.entities.NaturezaDespesa.list()
    ]).then(([oa, l, oi, ic, nd]) => {
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l || []);
      setItensOrcados(oi || []);
      setItensContrato(ic || []);
      setNaturezas(nd || []);
    });
  }, [contrato.id, ano]);

  // Função de Padronização: Capitalize + Exceção MOR
  const formatLabel = (label) => {
    if (!label) return "";
    return label.split(' ').map(w => {
      const u = w.toUpperCase();
      if (u === 'MOR') return 'MOR';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  };

  // Processamento de Itens para o Dropdown (Aglutinação MOR)
  const processarListaDropdown = () => {
    const ativos = itensContrato.filter(i => i.ativo !== false);
    const morNatal = ativos.some(i => i.nome.toUpperCase().includes("NATAL"));
    const morMossoro = ativos.some(i => i.nome.toUpperCase().includes("MOSSORO"));
    
    const avulsos = ativos
      .filter(i => !i.nome.toUpperCase().includes("NATAL") && !i.nome.toUpperCase().includes("MOSSORO"))
      .map(i => formatLabel(i.nome));

    const final = [...avulsos];
    if (morNatal) final.push("MOR Natal");
    if (morMossoro) final.push("MOR Mossoró");
    
    return [...new Set(final)].sort();
  };

  const itensDropdown = processarListaDropdown();

  // Cálculo Dinâmico de Valores (Consolidando se for MOR)
  const calcularValoresExibicao = () => {
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
      pago, 
      aprov, 
      orcado,
      pctPago: orcado > 0 ? (pago / orcado) * 100 : 0,
      pctAprov: orcado > 0 ? (aprov / orcado) * 100 : 0
    };
  };

  const dados = calcularValoresExibicao();

  return (
    <Card className="border border-blue-100 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[#1a2e4a]">{contrato.numero}</div>
            <div className="text-xs text-gray-500 truncate max-w-md">{contrato.contratada}</div>
          </div>
          <div className="flex gap-2">
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-24 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={itemFiltro} onValueChange={setItemFiltro}>
              <SelectTrigger className="h-8 text-xs w-56 bg-white"><SelectValue placeholder="Selecione o Item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                {itensDropdown.map(it => <SelectItem key={it} value={it}>{it}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-6 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center">
            <GaugeChart value={dados.pctPago} label="Pago vs Orçado" sublabel={`/ ${fmt(dados.orcado)}`} rawValue={dados.pago} />
            {itemFiltro !== "todos" && <div className="mt-2 text-sm font-black text-blue-800 uppercase tracking-tighter">{itemFiltro}</div>}
          </div>
          <div className="flex flex-col items-center">
            <GaugeChart value={dados.pctAprov} label="Aprovisionado" sublabel={`/ ${fmt(dados.orcado)}`} rawValue={dados.aprov} color="#f59e0b" />
            {itemFiltro !== "todos" && <div className="mt-2 text-sm font-black text-amber-700 uppercase tracking-tighter">{itemFiltro}</div>}
          </div>
        </div>

        {/* Tabela só aparece na visão "todos" */}
        {itemFiltro === "todos" && (
          <div className="mt-10 border-t pt-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Distribuição por Item Financeiro</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b">
                    <th className="text-left py-2 font-semibold">Item</th>
                    <th className="text-right py-2 font-semibold">Planejado</th>
                    <th className="text-right py-2 font-semibold">Pago</th>
                    <th className="text-right py-2 font-semibold text-blue-900">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {itensDropdown.map(label => {
                    const info = itemFiltro === "todos" ? { pago: 0, aprov: 0, orcado: 0 } : {}; // Placeholder logic
                    // Aqui você pode mapear uma versão resumida da tabela usando a mesma função calcularValoresExibicao(label)
                    return (
                      <tr key={label} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-medium text-slate-700">{label}</td>
                        <td className="py-2.5 text-right text-slate-400 italic">No filtro individual</td>
                        <td className="py-2.5 text-right text-green-600">---</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">---</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}