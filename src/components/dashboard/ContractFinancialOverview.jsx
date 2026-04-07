import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import GaugeChart from './GaugeChart';

// --- CONSTANTES E FUNÇÕES AUXILIARES ---
const ANOS = [2024, 2025, 2026, 2027, 2028];
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Mapeamento para normalizar labels de itens
const NOME_MAP = {
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO": "Deslocamento Corretivo",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO": "Deslocamento Preventivo",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO": "Deslocamento do Engenheiro",
  "SERVIÇOS EVENTUAIS": "Serviços Eventuais",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS": "Locações",
  "FORNECIMENTO DE MATERIAL": "Fornecimento de Materiais",
};

// Definição dos grupos de itens (apenas Serviços Fixos e Demandas Eventuais)
const GRUPOS_DEFINICAO = [
  {
    nome: "Serviços Fixos",
    itens: ["MOR Natal", "MOR Mossoró", "Deslocamento Preventivo"]
  },
  {
    nome: "Demandas Eventuais",
    itens: ["Deslocamento Corretivo", "Deslocamento do Engenheiro", "Serviços Eventuais", "Locações", "Fornecimento de Materiais"]
  }
];

// Lista de todos os labels de itens válidos para exibição
const TODOS_ITENS_VALIDOS = GRUPOS_DEFINICAO.flatMap(g => g.itens);

// Função para normalizar labels (remover "Serviços de", tratar MOR)
const normalizarLabel = (label) => {
  if (!label) return "";
  const upper = label.toUpperCase();
  if (NOME_MAP[upper]) return NOME_MAP[upper];

  // Tratamento especial para MOR
  if (upper.includes("MOR NATAL")) return "MOR Natal";
  if (upper.includes("MOR MOSSORO") || upper.includes("MOR MOSSORÓ")) return "MOR Mossoró";

  return label;
};

// Função para identificar a categoria principal de um item normalizado
const identificarCategoria = (itemLabelNormalizado) => {
  const servicosFixosLabels = GRUPOS_DEFINICAO.find(g => g.nome === "Serviços Fixos")?.itens || [];
  return servicosFixosLabels.includes(itemLabelNormalizado) ? 'Serviços Fixos' : 'Demandas Eventuais';
};

// Cache global (fora do componente)
const dataCache = new Map();

const getCacheKey = (contratoId, ano) => `${contratoId}-${ano}`;

const getCachedData = (contratoId, ano) => {
  const key = getCacheKey(contratoId, ano);
  const cached = dataCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutos
    return cached.data;
  }
  
  dataCache.delete(key);
  return null;
};

const setCachedData = (contratoId, ano, data) => {
  const key = getCacheKey(contratoId, ano);
  dataCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// --- COMPONENTE PRINCIPAL ---
export default function ContractFinancialOverview({ contrato }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [itemFiltro, setItemFiltro] = useState("todos");

  const [orcamentoAnual, setOrcamentoAnual] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [itensOrcados, setItensOrcados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Adicionar estado de retry
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Função de retry
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setError(null);
      setLoading(true);
    } else {
      setError("Número máximo de tentativas atingido. Contate o suporte.");
    }
  }, [retryCount]);

  // Efeito para carregar dados do BD
  useEffect(() => {
    if (!contrato || !contrato.id) {
      setLoading(false);
      return;
    }

    const cachedData = getCachedData(contrato.id, ano);
    if (cachedData && retryCount === 0) { // Ignora cache se for um retry forçado
      setOrcamentoAnual(cachedData.oa);
      setLancamentos(cachedData.l);
      setItensOrcados(cachedData.oi);
      setIsCached(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsCached(false);

    Promise.all([
      base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
    ]).then(([oa, l, oi]) => {
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l);
      setItensOrcados(oi);
      
      setCachedData(contrato.id, ano, {
        oa: oa[0] || null,
        l,
        oi
      });
    }).catch((err) => {
      console.error("Erro ao carregar dados financeiros:", err);
      setError("Não foi possível carregar os dados financeiros.");
    }).finally(() => {
      setLoading(false);
    });
  }, [contrato?.id, ano, retryCount]);

  // --- CÁLCULOS E PROCESSAMENTO DE DADOS ---
  const orcadoTotalAnual = orcamentoAnual?.valor_orcado || 0;

  // Itens únicos para o filtro dropdown (apenas os que pertencem aos grupos válidos)
  const itensDisponiveisParaFiltro = useMemo(() => {
    const uniqueLabels = new Set();
    lancamentos.forEach(l => {
      const normalized = normalizarLabel(l.item_label);
      if (TODOS_ITENS_VALIDOS.includes(normalized)) {
        uniqueLabels.add(normalized);
      }
    });
    itensOrcados.forEach(i => {
      const normalized = normalizarLabel(i.item_label);
      if (TODOS_ITENS_VALIDOS.includes(normalized)) {
        uniqueLabels.add(normalized);
      }
    });
    return Array.from(uniqueLabels).sort();
  }, [lancamentos, itensOrcados]);

  // Processamento da tabela detalhada por item
  const { gruposComItens, totalTabelaOrcado, totalTabelaPago, totalTabelaAprov, totalTabelaSaldo, totalTabelaPct } = useMemo(() => {
    // Coletar todos os labels de itens que devem aparecer na tabela (de orçamentos e lançamentos)
    const allRelevantLabels = new Set();
    itensOrcados.forEach(i => {
      const normalized = normalizarLabel(i.item_label);
      if (TODOS_ITENS_VALIDOS.includes(normalized)) {
        allRelevantLabels.add(normalized);
      }
    });
    lancamentos.forEach(l => {
      const normalized = normalizarLabel(l.item_label);
      if (TODOS_ITENS_VALIDOS.includes(normalized)) {
        allRelevantLabels.add(normalized);
      }
    });

    // Se o filtro de item estiver ativo, considerar apenas ele
    const labelsParaProcessar = itemFiltro === "todos"
      ? Array.from(allRelevantLabels)
      : [itemFiltro];

    const tabelaItens = labelsParaProcessar.map(label => {
      // Buscar orçado para o item
      const itemOrcado = itensOrcados.find(i => normalizarLabel(i.item_label) === label);
      const orcado = itemOrcado?.valor_orcado || 0;

      // Buscar lançamentos para o item
      const lancamentosDoItem = lancamentos.filter(l => normalizarLabel(l.item_label) === label);

      const pago = lancamentosDoItem.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor_pago_final || 0), 0);
      const aprov = lancamentosDoItem.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
      const saldo = orcado - pago - aprov;
      const pct = orcado > 0 ? Math.min((pago / orcado) * 100, 100) : 0;

      return { label, orcado, pago, aprov, saldo, pct };
    });

    // Organizar os itens processados nos grupos definidos
    const gruposComItens = GRUPOS_DEFINICAO.map(grupo => {
      const rows = tabelaItens.filter(item => grupo.itens.includes(item.label));
      return { ...grupo, rows };
    });

    // Calcular totais gerais da tabela (apenas dos itens visíveis)
    const todosOsItensDaTabela = gruposComItens.flatMap(g => g.rows);
    const totalTabelaOrcado = todosOsItensDaTabela.reduce((s, i) => s + i.orcado, 0);
    const totalTabelaPago = todosOsItensDaTabela.reduce((s, i) => s + i.pago, 0);
    const totalTabelaAprov = todosOsItensDaTabela.reduce((s, i) => s + i.aprov, 0);
    const totalTabelaSaldo = totalTabelaOrcado - totalTabelaPago - totalTabelaAprov;
    const totalTabelaPct = totalTabelaOrcado > 0 ? Math.min((totalTabelaPago / totalTabelaOrcado) * 100, 100) : 0;

    return { gruposComItens, totalTabelaOrcado, totalTabelaPago, totalTabelaAprov, totalTabelaSaldo, totalTabelaPct };

  }, [lancamentos, itensOrcados, itemFiltro]);

  // Cálculos para os Gauge Charts (sempre baseados no total anual, não no filtro de item)
  const totalPagoGeral = lancamentos.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor_pago_final || 0), 0);
  const totalAprovGeral = lancamentos.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

  const pctPagoOrcadoGeral = orcadoTotalAnual > 0 ? (totalPagoGeral / orcadoTotalAnual) * 100 : 0;
  const pctAprovOrcadoGeral = orcadoTotalAnual > 0 ? (totalAprovGeral / orcadoTotalAnual) * 100 : 0;

  // --- RENDERIZAÇÃO ---
  if (!contrato || !contrato.id) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="text-red-600 font-semibold">
            ❌ Contrato inválido ou não encontrado
          </div>
          <div className="text-xs text-red-500 mt-1">
            Não foi possível carregar os dados financeiros. Verifique se o contrato existe.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Carregando dados financeiros...</div>;
  }

  if (error) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-red-600 font-semibold">⚠️ Erro ao carregar dados</div>
            <div className="text-xs text-red-500 mt-1">{error}</div>
            {retryCount < maxRetries && (
              <div className="text-xs text-red-400 mt-2">
                Tentativa {retryCount + 1} de {maxRetries}
              </div>
            )}
          </div>
          {retryCount < maxRetries && (
            <Button 
              size="sm" 
              onClick={handleRetry}
              className="ml-4"
            >
              🔄 Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-blue-100">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-[#1a2e4a]">{contrato.numero}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">{contrato.contratada}</div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isCached && (
              <div className="flex items-center text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200" title="Dados carregados do cache (5 min)">
                ⚡ Em cache
              </div>
            )}
            <Select value={String(ano)} onValueChange={v => setAno(Number(v))}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS.map(a => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemFiltro} onValueChange={setItemFiltro}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                {itensDisponiveisParaFiltro.map(it => (
                  <SelectItem key={it} value={it}>{it}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Gauge Charts */}
        <div className="flex flex-wrap justify-around gap-4 py-2 mb-4">
          <div className="flex flex-col items-center">
            <GaugeChart value={pctPagoOrcadoGeral} label="Pago vs Orçado" sublabel={`/ ${fmt(orcadoTotalAnual)}`} rawValue={totalPagoGeral} />
          </div>
          <div className="flex flex-col items-center">
            <GaugeChart value={pctAprovOrcadoGeral} label="Aprovisionado vs Orçado" sublabel={`/ ${fmt(orcadoTotalAnual)}`} rawValue={totalAprovGeral} color="#f59e0b" />
          </div>
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

        {/* Tabela detalhada por item (SEMPRE VISÍVEL) */}
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
                      <td colSpan={6} className={`py-2 font-bold uppercase tracking-wider pl-4 ${grupo.nome === 'Serviços Fixos' ? 'text-[#1a2e4a]' : 'text-[#d97706]'}`}>
                        {grupo.nome}
                      </td>
                    </tr>
                    {/* Itens do Grupo */}
                    {grupo.rows.length > 0 ? (
                      grupo.rows.map((item, i) => (
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
                      ))
                    ) : (
                      // Linha "Sem dados" para o grupo, se não houver itens
                      <tr className="border-b border-gray-50">
                        <td colSpan={6} className="py-2 text-center text-gray-400 italic">
                          Nenhum item para este grupo no ano selecionado.
                        </td>
                      </tr>
                    )}
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
      </CardContent>
    </Card>
  );
}