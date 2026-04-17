import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GaugeChart from "./GaugeChart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Info, History, ChevronDown, ChevronRight } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const ANOS = [2024, 2025, 2026, 2027];
const getValorFinal = (l) => {
  const val = l.valor_pago_final !== undefined && l.valor_pago_final !== null ? l.valor_pago_final : (l.valor || 0);
  return Number(val) || 0;
};

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
    itensOriginais: ["MOR Natal", "MOR Mossoró", "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"],
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
      "FORNECIMENTO DE MATERIAL",
    ],
  },
];

export default function ContractFinancialOverview({ contrato }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [itemFiltro, setItemFiltro] = useState("todos");
  const [orcamentoAnual, setOrcamentoAnual] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [itensOrcados, setItensOrcados] = useState([]);
  const [itensContrato, setItensContrato] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedRow, setExpandedRow] = useState(null);
  const [logs, setLogs] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
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
    }).finally(() => setIsLoading(false));
  }, [contrato.id, ano]);

  const loadLogs = async (lancId) => {
    try {
      const resp = await base44.entities.HistoricoLancamento.filter({ lancamento_financeiro_id: lancId });
      const sorted = resp.sort((a,b) => new Date(b.data_acao).getTime() - new Date(a.data_acao).getTime()).slice(0,3);
      setLogs(prev => ({ ...prev, [lancId]: sorted }));
    } catch(e) {}
  };

  const handleStatusChange = async (lanc, novoStatus) => {
    if (!user) return;
    const statusAnterior = lanc.status;
    if (statusAnterior === novoStatus) return;

    // Optimistic update
    setLancamentos(prev => prev.map(l => l.id === lanc.id ? { ...l, status: novoStatus } : l));

    try {
      await base44.entities.LancamentoFinanceiro.update(lanc.id, { status: novoStatus });
      await base44.entities.HistoricoLancamento.create({
        lancamento_financeiro_id: lanc.id,
        tipo_acao: "atualizacao_status",
        status_anterior: statusAnterior,
        status_novo: novoStatus,
        realizado_por: user.full_name || user.email,
        data_acao: new Date().toISOString()
      });
      toast.success("Status atualizado com sucesso!");
      loadLogs(lanc.id);
    } catch (e) {
      toast.error("Erro ao atualizar status");
      // Rollback
      setLancamentos(prev => prev.map(l => l.id === lanc.id ? { ...l, status: statusAnterior } : l));
    }
  };

  const toggleRow = (label) => {
    const isExpanding = expandedRow !== label;
    setExpandedRow(isExpanding ? label : null);
    if (isExpanding) {
      const lancsDaLinha = lancamentos.filter(l => mapName(l.item_label) === label);
      lancsDaLinha.forEach(l => loadLogs(l.id));
    }
  };

  const orcadoTotal = orcamentoAnual?.valor_orcado || 0;
  const contratadoTotal = contrato.valor_global || 0;

  const lancsFiltrados = itemFiltro === "todos"
    ? lancamentos
    : lancamentos.filter(l => mapName(l.item_label) === itemFiltro);

  const totalPago = lancsFiltrados.filter(l => l.status === "Pago" || l.status === "SOF").reduce((s, l) => s + getValorFinal(l), 0);
  const totalAprov = lancsFiltrados.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + getValorFinal(l), 0);

  const orcadoFiltrado = itemFiltro === "todos"
    ? orcadoTotal
    : (itensOrcados.filter(i => mapName(i.item_label) === itemFiltro).reduce((s, i) => s + Number(i.valor_orcado || 0), 0));

  const pctPagoOrcado = orcadoFiltrado > 0 ? (totalPago / orcadoFiltrado) * 100 : 0;
  const pctAprovOrcado = orcadoFiltrado > 0 ? (totalAprov / orcadoFiltrado) * 100 : 0;

  const { itensDisponiveis, gruposComItens, temTabela } = useMemo(() => {
    const todosItensBrutos = [
      ...new Set([
        ...lancamentos.map(l => l.item_label),
        ...itensOrcados.map(i => i.item_label),
      ].filter(Boolean)),
    ];

    const disponiveis = [...new Set(todosItensBrutos.map(mapName))].sort();

    // Pré-agrupar totais por item_label (O(N)) para evitar O(N*M) no buildItem
    const totaisPorLabel = {};
    todosItensBrutos.forEach(label => {
      totaisPorLabel[label] = { orcado: 0, pago: 0, aprov: 0 };
    });
    
    itensOrcados.forEach(i => {
      if (i.item_label && totaisPorLabel[i.item_label]) {
        totaisPorLabel[i.item_label].orcado += Number(i.valor_orcado || 0);
      }
    });

    lancamentos.forEach(l => {
      if (l.item_label && totaisPorLabel[l.item_label]) {
        const valorFinal = getValorFinal(l);
        if (l.status === "Pago" || l.status === "SOF") {
          totaisPorLabel[l.item_label].pago += valorFinal;
        } else if (l.status === "Aprovisionado") {
          totaisPorLabel[l.item_label].aprov += valorFinal;
        }
      }
    });

    const buildItem = (origNames) => {
      let orcado = 0, pago = 0, aprov = 0;
      origNames.forEach(orig => {
        if (totaisPorLabel[orig]) {
          orcado += totaisPorLabel[orig].orcado;
          pago += totaisPorLabel[orig].pago;
          aprov += totaisPorLabel[orig].aprov;
        }
      });
      const saldo = orcado - pago - aprov;
      const pct = orcado > 0 ? Math.min((pago / orcado) * 100, 100) : 0;
      return { orcado, pago, aprov, saldo, pct };
    };

    const grupos = GRUPOS.map(g => {
      const rows = [];
      const nomesJaProcessados = new Set();
      
      g.itensOriginais.forEach(orig => {
        const mapped = mapName(orig);
        if (nomesJaProcessados.has(mapped)) return;
        const allOrigsOfSameMappedName = g.itensOriginais.filter(x => mapName(x) === mapped);
        const stats = buildItem(allOrigsOfSameMappedName);
        if (stats.orcado > 0 || stats.pago > 0) {
          rows.push({ label: mapped, ...stats });
          nomesJaProcessados.add(mapped);
        }
      });
      return { ...g, rows };
    }).filter(g => g.rows.length > 0);

    return {
      itensDisponiveis: disponiveis,
      gruposComItens: grupos,
      temTabela: grupos.length > 0
    };
  }, [lancamentos, itensOrcados]);

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
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!isLoading && (
          <>
        {/* Gauge Charts */}
        <div className="flex flex-wrap justify-around gap-4 py-2 mb-4">
          <div className="flex flex-col items-center">
            <GaugeChart
              value={pctPagoOrcado}
              label="Pago x Orçado"
              sublabel={`/ ${fmt(orcadoFiltrado)}`}
              rawValue={totalPago}
            />
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
              color="#f59e0b"
            />
          </div>
        </div>

        {/* Tabela detalhada por item */}
        {temTabela && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th scope="col" className="text-left py-1.5 text-gray-500 font-medium w-6"></th>
                    <th scope="col" className="text-left py-1.5 text-gray-500 font-medium">Item / Categoria</th>
                    <th scope="col" className="text-right py-1.5 text-gray-500 font-medium">Orçado</th>
                    <th scope="col" className="text-right py-1.5 text-gray-500 font-medium">Pago</th>
                    <th scope="col" className="text-right py-1.5 text-gray-500 font-medium">Aprovisionado</th>
                    <th scope="col" className="text-right py-1.5 text-gray-500 font-medium">Saldo</th>
                    <th scope="col" className="w-24 py-1.5 text-gray-500 font-medium pl-3">Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposComItens.map((g, gi) => (
                    <React.Fragment key={`group-${gi}`}>
                      <tr className={`${g.bg} border-b border-gray-100`}>
                        <td colSpan={7} className={`py-1.5 font-bold ${g.cor} uppercase tracking-wider px-2`}>
                          {g.titulo}
                        </td>
                      </tr>
                      {g.rows.map((item, i) => (
                        <React.Fragment key={`item-${gi}-${i}`}>
                          <tr 
                            className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => toggleRow(item.label)}
                          >
                            <td className="py-1.5 px-2 text-gray-400">
                              {expandedRow === item.label ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </td>
                            <td className="py-1.5 font-medium text-gray-700">{item.label}</td>
                            <td className="py-1.5 text-right text-blue-600">{fmt(item.orcado)}</td>
                            <td className="py-1.5 text-right text-green-600 font-semibold">{fmt(item.pago)}</td>
                            <td className="py-1.5 text-right text-amber-500">{fmt(item.aprov)}</td>
                            <td className={`py-1.5 text-right font-bold ${item.saldo < 0 ? "text-red-500" : "text-[#1a2e4a]"}`}>
                              {fmt(item.saldo)}
                            </td>
                            <td className="py-1.5 pl-3">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5" role="progressbar" aria-valuenow={item.pct} aria-valuemin="0" aria-valuemax="100">
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
                          
                          {/* Sub-tabela de lançamentos (expansível) */}
                          {expandedRow === item.label && (
                            <tr className="bg-slate-50/50 border-b border-gray-100">
                              <td colSpan={7} className="p-4">
                                <div className="text-xs text-gray-600 mb-3 font-semibold ml-6">Lançamentos Financeiros (Ano {ano})</div>
                                <div className="space-y-3 ml-6">
                                  {lancamentos.filter(l => mapName(l.item_label) === item.label).map(l => (
                                    <div key={l.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium text-gray-700">Mês {l.mes}</span>
                                          <span className="text-blue-600 font-bold">{fmt(getValorFinal(l))}</span>
                                          
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <button className="flex items-center justify-center rounded-full hover:bg-gray-100 p-1 transition-colors">
                                                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                <p className="max-w-[250px] text-xs">{l.observacoes || "Sem observações registradas."}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="px-3 py-1.5 text-[10px] font-bold rounded-full border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 transition-colors">
                                              <span className={
                                                l.status === "Pago" || l.status === "SOF" ? "text-green-600" :
                                                l.status === "Aprovisionado" ? "text-amber-500" :
                                                l.status === "Cancelado" ? "text-red-500" : "text-gray-500"
                                              }>
                                                {l.status}
                                              </span>
                                              <ChevronDown className="w-3 h-3 text-gray-400" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleStatusChange(l, "Aprovisionado")}>Aprovisionado</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(l, "Pago")}>Pago</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(l, "SOF")}>SOF</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(l, "Cancelado")}>Cancelado</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusChange(l, "Em instrução")}>Em instrução</DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      
                                      {/* Logs Area */}
                                      {logs[l.id] && logs[l.id].length > 0 && (
                                        <div className="mt-3 pt-2 pl-2 border-l-2 border-blue-100 space-y-1.5">
                                          {logs[l.id].map(log => (
                                            <div key={log.id} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                              <History className="w-3 h-3 text-blue-400" />
                                              <span>
                                                Alterado em <span className="font-medium text-gray-600">{new Date(log.data_acao).toLocaleDateString()}</span> por <span className="font-medium text-gray-600">{log.realizado_por}</span> 
                                                <span className="text-gray-400 ml-1">({log.status_anterior} &rarr; {log.status_novo})</span>
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {lancamentos.filter(l => mapName(l.item_label) === item.label).length === 0 && (
                                    <div className="text-xs text-gray-400 italic">Nenhum lançamento vinculado.</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!temTabela && (
          <div className="text-center text-xs text-gray-400 py-4">Sem dados orçamentários para {ano}</div>
        )}
          </>
        )}
      </CardContent>
    </Card>
  );
}