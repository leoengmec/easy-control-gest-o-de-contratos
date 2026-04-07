import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import GaugeChart from './GaugeChart';

const ANOS = [2024, 2025, 2026, 2027, 2028];
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ContractFinancialOverview({ contrato }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [itemFiltro, setItemFiltro] = useState("todos");

  const [orcamentoAnual, setOrcamentoAnual] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [itensOrcados, setItensOrcados] = useState([]);
  const [itensContrato, setItensContrato] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
    ]).then(([oa, l, oi, ic]) => {
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l);
      setItensOrcados(oi);
      setItensContrato(ic);
    });
  }, [contrato.id, ano]);

  const orcadoTotal = orcamentoAnual?.valor_orcado || 0;
  const contratadoTotal = contrato.valor_global || 0;

  const lancsFiltrados = itemFiltro === "todos"
    ? lancamentos
    : lancamentos.filter(l => l.item_label === itemFiltro);

  const totalPago = lancsFiltrados.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalAprov = lancsFiltrados.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

  const orcadoFiltrado = itemFiltro === "todos"
    ? orcadoTotal
    : (itensOrcados.find(i => i.item_label === itemFiltro)?.valor_orcado || 0);

  const pctPagoOrcado = orcadoFiltrado > 0 ? (totalPago / orcadoFiltrado) * 100 : 0;
  const pctAprovOrcado = orcadoFiltrado > 0 ? (totalAprov / orcadoFiltrado) * 100 : 0;

  // Mapa para renomear os labels (removendo "Serviços de")
  const NOME_MAP = {
    "SERVIÇOS DE DESLOCAMENTO CORRETIVO": "Deslocamento Corretivo",
    "SERVIÇOS DE DESLOCAMENTO PREVENTIVO": "Deslocamento Preventivo",
    "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO": "Deslocamento do Engenheiro",
    "SERVIÇOS EVENTUAIS": "Serviços Eventuais",
    "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS": "Locações",
    "FORNECIMENTO DE MATERIAL": "Fornecimento de Materiais",
  };

  const normalizarLabel = (label) => {
    if (!label) return "";
    const upper = label.toUpperCase();
    if (NOME_MAP[upper]) return NOME_MAP[upper];
    
    // Tratamento especial para MOR
    if (upper.includes("MOR NATAL")) return "MOR Natal";
    if (upper.includes("MOR MOSSORO") || upper.includes("MOR MOSSORÓ")) return "MOR Mossoró";
    
    return label;
  };

  // Definição dos grupos (apenas Serviços Fixos e Demandas Eventuais)
  const GRUPOS = [
    {
      nome: "Serviços Fixos",
      itens: ["MOR Natal", "MOR Mossoró", "Deslocamento Preventivo"]
    },
    {
      nome: "Demandas Eventuais",
      itens: ["Deslocamento Corretivo", "Deslocamento do Engenheiro", "Serviços Eventuais", "Locações", "Fornecimento de Materiais"]
    }
  ];

  // Itens únicos para o filtro (apenas os que pertencem aos grupos válidos)
  const todosItensValidos = GRUPOS.flatMap(g => g.itens);
  
  const itensDisponiveis = [
    ...new Set([
      ...lancamentos.map(l => normalizarLabel(l.item_label)),
      ...itensOrcados.map(i => normalizarLabel(i.item_label)),
    ].filter(Boolean))
  ].filter(item => todosItensValidos.includes(item)).sort();

  // Tabela detalhada por item
  const tabelaItens = itensDisponiveis.map(label => {
    // Buscar orçado (considerando variações de nome)
    const itemOrcado = itensOrcados.find(i => normalizarLabel(i.item_label) === label);
    const orcado = itemOrcado?.valor_orcado || 0;
    
    // Buscar lançamentos (considerando variações de nome)
    const lancamentosDoItem = lancamentos.filter(l => normalizarLabel(l.item_label) === label);
    
    const pago = lancamentosDoItem.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprov = lancamentosDoItem.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const saldo = orcado - pago - aprov;
    const pct = orcado > 0 ? Math.min((pago / orcado) * 100, 100) : 0;
    
    return { label, orcado, pago, aprov, saldo, pct };
  }).filter(i => i.orcado > 0 || i.pago > 0 || i.aprov > 0);

  // Organizar os itens processados nos grupos
  const gruposComItens = GRUPOS.map(grupo => {
    const rows = tabelaItens.filter(item => grupo.itens.includes(item.label));
    return { ...grupo, rows };
  }).filter(g => g.rows.length > 0);

  const temTabela = gruposComItens.length > 0;

  // Totais apenas dos itens válidos (exclui "Outros Itens")
  const totalTabelaOrcado = gruposComItens.flatMap(g => g.rows).reduce((s, i) => s + i.orcado, 0);
  const totalTabelaPago = gruposComItens.flatMap(g => g.rows).reduce((s, i) => s + i.pago, 0);
  const totalTabelaAprov = gruposComItens.flatMap(g => g.rows).reduce((s, i) => s + i.aprov, 0);
  const totalTabelaSaldo = totalTabelaOrcado - totalTabelaPago - totalTabelaAprov;
  const totalTabelaPct = totalTabelaOrcado > 0 ? Math.min((totalTabelaPago / totalTabelaOrcado) * 100, 100) : 0;

  return (
    <Card className="border border-blue-100">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-[#1a2e4a]">{contrato.numero}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">{contrato.contratada}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={itemFiltro} onValueChange={setItemFiltro}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                {itensDisponiveis.map(it => (
                  <SelectItem key={it} value={it}>{it}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Gauge Charts */}
        <div className="flex flex-wrap justify-around gap-4 py-2">
          <GaugeChart
            value={pctPagoOrcado}
            label="Pago vs Orçado"
            sublabel={`/ ${fmt(orcadoFiltrado)}`}
            rawValue={totalPago}
          />
          <GaugeChart
            value={pctAprovOrcado}
            label="Aprovisionado vs Orçado"
            sublabel={`/ ${fmt(orcadoFiltrado)}`}
            rawValue={totalAprov}
            color="#f59e0b"
          />
        </div>

        {/* Filtros aplicados */}
        <div className="mb-4 mt-3 text-center">
          <div className="text-base font-semibold text-[#1a2e4a]">
            {itemFiltro === "todos" ? "Todos os itens" : itemFiltro}
          </div>
          <div className="text-base font-semibold text-[#1a2e4a]">
            {ano}
          </div>
        </div>

        {/* Tabela detalhada por item */}
        {temTabela && (
          <div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider">Item / Categoria</th>
                    <th className="text-right py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider">Orçado</th>
                    <th className="text-right py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider">Pago</th>
                    <th className="text-right py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider">Aprovisionado</th>
                    <th className="text-right py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider">Saldo</th>
                    <th className="w-32 py-2.5 px-4 text-gray-600 font-bold uppercase tracking-wider text-left">Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposComItens.map((grupo, gIdx) => (
                    <React.Fragment key={`group-${gIdx}`}>
                      {/* Cabeçalho do Grupo */}
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <td colSpan={6} className={`py-2 font-bold uppercase tracking-wider pl-4 ${grupo.nome === 'Serviços Fixos' ? 'text-blue-800' : 'text-amber-600'}`}>
                          {grupo.nome}
                        </td>
                      </tr>
                      {/* Itens do Grupo */}
                      {grupo.rows.map((item, i) => (
                        <tr key={`item-${gIdx}-${i}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-2 font-medium text-gray-700 pl-6">{item.label}</td>
                          <td className="py-2 text-right text-blue-600">{fmt(item.orcado)}</td>
                          <td className="py-2 text-right text-green-600 font-semibold">{fmt(item.pago)}</td>
                          <td className="py-2 text-right text-amber-500">{fmt(item.aprov)}</td>
                          <td className={`py-2 text-right font-bold pr-4 ${item.saldo < 0 ? "text-red-500" : "text-[#1a2e4a]"}`}>
                            {fmt(item.saldo)}
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${item.pct}%`,
                                    backgroundColor: item.pct >= 90 ? "#ef4444" : item.pct >= 70 ? "#f59e0b" : "#22c55e"
                                  }} 
                                />
                              </div>
                              <span className="text-gray-500 font-medium w-8 text-right text-[10px]">{item.pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-300">
                    <td className="py-3 font-black text-slate-800 pl-4 uppercase tracking-wider">Total Geral</td>
                    <td className="py-3 text-right font-black text-blue-700">{fmt(totalTabelaOrcado)}</td>
                    <td className="py-3 text-right font-black text-green-700">{fmt(totalTabelaPago)}</td>
                    <td className="py-3 text-right font-black text-amber-600">{fmt(totalTabelaAprov)}</td>
                    <td className={`py-3 text-right font-black pr-4 ${totalTabelaSaldo < 0 ? "text-red-600" : "text-[#1a2e4a]"}`}>
                      {fmt(totalTabelaSaldo)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-300 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${totalTabelaPct}%`,
                              backgroundColor: totalTabelaPct >= 90 ? "#ef4444" : totalTabelaPct >= 70 ? "#f59e0b" : "#22c55e"
                            }}
                          />
                        </div>
                        <span className="text-slate-700 font-black w-8 text-right text-[10px]">{totalTabelaPct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        {!temTabela && (
          <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed rounded-lg">
            Sem dados orçamentários para {ano}
          </div>
        )}
      </CardContent>
    </Card>
  );
}