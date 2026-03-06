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

  // Itens únicos para o filtro
  const itensDisponiveis = [
    ...new Set(lancamentos.map(l => l.item_label).filter(Boolean)),
    ...itensOrcados.map(i => i.item_label).filter(Boolean),
  ].filter((v, i, a) => a.indexOf(v) === i).sort();

  // Tabela detalhada por item
  const todosItens = [
    ...new Set([
      ...lancamentos.map(l => l.item_label),
      ...itensOrcados.map(i => i.item_label),
    ].filter(Boolean)),
  ].sort();

  const tabelaItens = todosItens.map(label => {
    const orcado = itensOrcados.find(i => i.item_label === label)?.valor_orcado || 0;
    const pago = lancamentos.filter(l => l.item_label === label && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprov = lancamentos.filter(l => l.item_label === label && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const saldo = orcado - pago - aprov;
    const pct = orcado > 0 ? Math.min((pago / orcado) * 100, 100) : 0;
    return { label, orcado, pago, aprov, saldo, pct };
  }).filter(i => i.orcado > 0 || i.pago > 0);

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
        <div className="flex flex-wrap justify-around gap-4 mb-4 py-2">
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

        {/* Tabela detalhada por item */}
        {tabelaItens.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Pago vs Orçado por Item · {ano}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 text-gray-500 font-medium">Item / Categoria</th>
                    <th className="text-right py-1.5 text-gray-500 font-medium">Orçado</th>
                    <th className="text-right py-1.5 text-gray-500 font-medium">Pago</th>
                    <th className="text-right py-1.5 text-gray-500 font-medium">Aprovisionado</th>
                    <th className="text-right py-1.5 text-gray-500 font-medium">Saldo</th>
                    <th className="w-24 py-1.5 text-gray-500 font-medium pl-3">Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaItens.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 font-medium text-gray-700">{item.label}</td>
                      <td className="py-1.5 text-right text-blue-600">{fmt(item.orcado)}</td>
                      <td className="py-1.5 text-right text-green-600 font-semibold">{fmt(item.pago)}</td>
                      <td className="py-1.5 text-right text-amber-500">{fmt(item.aprov)}</td>
                      <td className={`py-1.5 text-right font-bold ${item.saldo < 0 ? "text-red-500" : "text-[#1a2e4a]"}`}>
                        {fmt(item.saldo)}
                      </td>
                      <td className="py-1.5 pl-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${item.pct}%`,
                                backgroundColor: item.pct >= 90 ? "#ef4444" : item.pct >= 70 ? "#f59e0b" : "#22c55e"
                              }}
                            />
                          </div>
                          <span className="text-gray-400 w-7 text-right">{item.pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tabelaItens.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-4">Sem dados orçamentários para {ano}</div>
        )}
      </CardContent>
    </Card>
  );
}