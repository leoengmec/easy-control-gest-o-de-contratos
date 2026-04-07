import React, { useState, useEffect } from "react";
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
    base44.entities.ItemContrato.filter({ contrato_id: contrato.id })]
    ).then(([oa, l, oi, ic]) => {
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l);
      setItensOrcados(oi);
      setItensContrato(ic);
    });
  }, [contrato.id, ano]);

  const orcadoTotal = orcamentoAnual?.valor_orcado || 0;
  const contratadoTotal = contrato.valor_global || 0;

  const lancsFiltrados = itemFiltro === "todos" ?
  lancamentos :
  lancamentos.filter((l) => l.item_label === itemFiltro);

  const totalPago = lancsFiltrados.filter((l) => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalAprov = lancsFiltrados.filter((l) => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

  const orcadoFiltrado = itemFiltro === "todos" ?
  orcadoTotal :
  itensOrcados.find((i) => i.item_label === itemFiltro)?.valor_orcado || 0;

  const pctPagoOrcado = orcadoFiltrado > 0 ? totalPago / orcadoFiltrado * 100 : 0;
  const pctAprovOrcado = orcadoFiltrado > 0 ? totalAprov / orcadoFiltrado * 100 : 0;

  // Mapa para renomear os labels (removendo "Serviços de")
  const NOME_MAP = {
    "SERVIÇOS DE DESLOCAMENTO CORRETIVO": "Deslocamento corretivo",
    "SERVIÇOS DE DESLOCAMENTO PREVENTIVO": "Deslocamento Preventivo",
    "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO": "Deslocamento do engenheiro",
    "SERVIÇOS EVENTUAIS": "Serviços Eventuais",
    "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS": "Locações",
    "FORNECIMENTO DE MATERIAL": "Fornecimento de Materiais",
    "Fornecimento de Material": "Fornecimento de Materiais",
    "FORNECIMENTO DE MATERIAIS": "Fornecimento de Materiais"
  };

  const mapName = (nome) => NOME_MAP[nome] || nome;

  // Ordem e agrupamento desejado
  const GRUPOS = [
  {
    titulo: "Serviços Fixos",
    cor: "text-blue-700",
    bg: "bg-blue-50",
    itensOriginais: ["MOR Natal", "MOR Mossoró", "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"]
  },
  {
    titulo: "Demandas Eventuais",
    cor: "text-amber-700",
    bg: "bg-amber-50",
    itensOriginais: [
    "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
    "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
    "SERVIÇOS EVENTUAIS",
    "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
    "FORNECIMENTO DE MATERIAIS",
    "Fornecimento de Material",
    "FORNECIMENTO DE MATERIAL"]

  }];


  const todosItensBrutos = [
  ...new Set([
  ...lancamentos.map((l) => l.item_label),
  ...itensOrcados.map((i) => i.item_label)].
  filter(Boolean))];


  const itensDisponiveis = [...new Set(todosItensBrutos.map(mapName))].sort();

  const buildItem = (origNames) => {
    let orcado = 0,pago = 0,aprov = 0;
    origNames.forEach((orig) => {
      orcado += itensOrcados.find((i) => i.item_label === orig)?.valor_orcado || 0;
      pago += lancamentos.filter((l) => l.item_label === orig && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
      aprov += lancamentos.filter((l) => l.item_label === orig && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    });
    const saldo = orcado - pago - aprov;
    const pct = orcado > 0 ? Math.min(pago / orcado * 100, 100) : 0;
    return { orcado, pago, aprov, saldo, pct };
  };

  const gruposComItens = GRUPOS.map((g) => {
    const rows = [];
    const nomesJaProcessados = new Set();

    g.itensOriginais.forEach((orig) => {
      if (nomesJaProcessados.has(mapName(orig))) return;
      const allOrigsOfSameMappedName = g.itensOriginais.filter((x) => mapName(x) === mapName(orig));
      const stats = buildItem(allOrigsOfSameMappedName);
      if (stats.orcado > 0 || stats.pago > 0) {
        rows.push({ label: mapName(orig), ...stats });
        nomesJaProcessados.add(mapName(orig));
      }
    });
    return { ...g, rows };
  }).filter((g) => g.rows.length > 0);

  const itensNoGrupo = new Set(GRUPOS.flatMap((g) => g.itensOriginais));
  const itensSemGrupoOriginais = todosItensBrutos.filter((l) => !itensNoGrupo.has(l));

  const itensSemGrupoRows = [];
  const nomesSemGrupoProcessados = new Set();
  itensSemGrupoOriginais.forEach((orig) => {
    if (nomesSemGrupoProcessados.has(mapName(orig))) return;
    const allOrigs = itensSemGrupoOriginais.filter((x) => mapName(x) === mapName(orig));
    const stats = buildItem(allOrigs);
    if (stats.orcado > 0 || stats.pago > 0) {
      itensSemGrupoRows.push({ label: mapName(orig), ...stats });
      nomesSemGrupoProcessados.add(mapName(orig));
    }
  });

  const temTabela = gruposComItens.length > 0 || itensSemGrupoRows.length > 0;

  return (
    <Card className="border border-blue-100">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-[#1a2e4a]">{contrato.numero}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">{contrato.contratada}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={itemFiltro} onValueChange={setItemFiltro}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                {itensDisponiveis.map((it) =>
                <SelectItem key={it} value={it}>{it}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Gauge Charts */}
        <div className="flex flex-wrap justify-around gap-4 py-2 mb-4">
          <div className="flex flex-col items-center">
            <GaugeChart
              value={pctPagoOrcado}
              label="Pago x Orçado"
              sublabel={`/ ${fmt(orcadoFiltrado)}`}
              rawValue={totalPago} />
            
            <div className="mt-2 text-center">
              <div className="inline-flex flex-col items-center gap-0.5 bg-[#1a2e4a] text-white px-4 py-2 rounded-xl border border-blue-300/30 shadow-sm">
                <span className="text-xs font-semibold tracking-wide">{itemFiltro === "todos" ? "Todos os itens" : itemFiltro}</span>
                <span className="text-xs text-blue-300 font-medium">{ano}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <GaugeChart
              value={pctAprovOrcado}
              label="Aprovisionado x Orçado"
              sublabel={`/ ${fmt(orcadoFiltrado)}`}
              rawValue={totalAprov}
              color="#f59e0b" />
            
          </div>
        </div>

        {/* Tabela detalhada por item */}
        {temTabela &&
        <div>
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
                  {gruposComItens.map((g, gi) =>
                <React.Fragment key={`group-${gi}`}>
                      <tr className={`${g.bg} border-b border-gray-100`}>
                        <td colSpan={6} className={`py-1.5 font-bold ${g.cor} uppercase tracking-wider`}>
                          {g.titulo}
                        </td>
                      </tr>
                      {g.rows.map((item, i) =>
                  <tr key={`item-${gi}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 font-medium text-gray-700 pl-4">{item.label}</td>
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
                            }} />
                          
                              </div>
                              <span className="text-gray-400 w-7 text-right">{item.pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                  )}
                    </React.Fragment>
                )}

                  {itensSemGrupoRows.length > 0 &&
                <>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        

                    
                      </tr>
                      {itensSemGrupoRows.map((item, i) =>
                  <tr key={`other-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                          
                          
                          
                          
                          

                    
                          <td className="py-1.5 pl-3">
                            










                      
                          </td>
                        </tr>
                  )}
                    </>
                }
                </tbody>
              </table>
            </div>
          </div>
        }
        {!temTabela &&
        <div className="text-center text-xs text-gray-400 py-4">Sem dados orçamentários para {ano}</div>
        }
      </CardContent>
    </Card>);

}