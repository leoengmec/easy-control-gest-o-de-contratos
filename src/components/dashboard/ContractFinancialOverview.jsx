import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import GaugeChart from './GaugeChart';

// --- CONSTANTES E FUNÇÕES AUXILIARES ---
const ANOS = [2024, 2025, 2026, 2027, 2028];
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Função para normalizar labels para comparação (evita problemas de maiúsculas/minúsculas)
const normalizarParaComparacao = (label) => {
  if (!label) return "";
  return label.toUpperCase().trim();
};

// Logger estruturado
const logger = {
  error: (message, context = {}) => {
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context: {
        componente: 'ContractFinancialOverview',
        ...context
      }
    };
    console.error(JSON.stringify(errorLog, null, 2));
    // Aqui você poderia enviar para um serviço de logging externo
  },
  
  info: (message, context = {}) => {
    const infoLog = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context: {
        componente: 'ContractFinancialOverview',
        ...context
      }
    };
    console.log(JSON.stringify(infoLog, null, 2));
  },
  
  warn: (message, context = {}) => {
    const warnLog = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context: {
        componente: 'ContractFinancialOverview',
        ...context
      }
    };
    console.warn(JSON.stringify(warnLog, null, 2));
  }
};

// Função centralizada de cálculos
const calcularTotaisPorItem = (lancamentos, itensOrcados, itensContrato, itemFiltro = "todos") => {
  const itensMap = new Map(); // key: label normalizado, value: object
  
  // 1. Cadastramos todos os itens do contrato
  itensContrato.forEach(i => {
    if (i.nome) {
      const key = normalizarParaComparacao(i.nome);
      if (!itensMap.has(key)) {
        itensMap.set(key, { 
          label: i.nome, 
          grupo: i.grupo_servico === 'fixo' ? 'Serviços Fixos' : 'Demandas Eventuais',
          orcado: 0, pago: 0, aprov: 0 
        });
      }
    }
  });

  // 2. Orçamentos
  itensOrcados.forEach(i => {
    if (i.item_label) {
      const key = normalizarParaComparacao(i.item_label);
      if (!itensMap.has(key)) {
        itensMap.set(key, { 
          label: i.item_label, 
          grupo: 'Demandas Eventuais', // Fallback se não estiver no ItemContrato
          orcado: 0, pago: 0, aprov: 0 
        });
      }
      const item = itensMap.get(key);
      item.orcado += (i.valor_orcado || 0);
    }
  });
  
  // 3. Lançamentos
  lancamentos.forEach(l => {
    if (l.item_label) {
      const key = normalizarParaComparacao(l.item_label);
      if (!itensMap.has(key)) {
        itensMap.set(key, { 
          label: l.item_label, 
          grupo: 'Demandas Eventuais', // Fallback
          orcado: 0, pago: 0, aprov: 0 
        });
      }
      const item = itensMap.get(key);
      if (l.status === "Pago") {
        item.pago += (l.valor_pago_final || 0);
      } else if (l.status === "Aprovisionado") {
        item.aprov += (l.valor || 0);
      }
    }
  });
  
  // Converter mapa para array e calcular saldo/pct
  const todosOsItens = Array.from(itensMap.values()).map(item => {
    const saldo = item.orcado - item.pago - item.aprov;
    const pct = item.orcado > 0 ? Math.min((item.pago / item.orcado) * 100, 100) : 0;
    return { ...item, saldo, pct };
  });

  if (itemFiltro === "todos") return todosOsItens;
  return todosOsItens.filter(item => normalizarParaComparacao(item.label) === normalizarParaComparacao(itemFiltro));
};

const calcularTotaisGerais = (items) => {
  const orcado = items.reduce((s, i) => s + i.orcado, 0);
  const pago = items.reduce((s, i) => s + i.pago, 0);
  const aprov = items.reduce((s, i) => s + i.aprov, 0);
  const saldo = orcado - pago - aprov;
  return {
    orcado,
    pago,
    aprov,
    saldo,
  };
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
  const [itensContrato, setItensContrato] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Validar ano de forma segura (sem causar re-render síncrono)
  useEffect(() => {
    const anoValido = ANOS.includes(ano) ? ano : new Date().getFullYear();
    if (anoValido !== ano) {
      logger.warn("Ano inválido fornecido", { anoFornecido: ano, anoUsado: anoValido });
      setAno(anoValido);
    }
  }, [ano]);

  // Validar contrato (apenas log no topo, renderização tratada abaixo)
  if (!contrato?.id || typeof contrato.id !== 'string') {
    logger.error("Contrato sem ID válido", { contrato });
  }

  // Validar dados carregados
  if (!Array.isArray(lancamentos)) {
    logger.warn("Lançamentos não é um array", { tipo: typeof lancamentos });
    setLancamentos([]);
  }

  if (!Array.isArray(itensOrcados)) {
    logger.warn("Itens orçados não é um array", { tipo: typeof itensOrcados });
    setItensOrcados([]);
  }

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

    setLoading(true);
    setError(null);

    const cacheKey = getCacheKey(contrato.id, ano);
    const cachedData = getCachedData(contrato.id, ano);

    if (cachedData && retryCount === 0) {
      const [oa, l, oi, ic] = cachedData;
      setOrcamentoAnual(oa[0] || null);
      setLancamentos(l);
      setItensOrcados(oi);
      setItensContrato(ic || []);
      setIsCached(true);
      setLoading(false);
      return; // Usar dados em cache
    }

    setIsCached(false);

    // Se não houver cache, buscar do BD
    Promise.all([
      base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
    ])
      .then(([oa, l, oi, ic]) => {
        setCachedData(contrato.id, ano, [oa, l, oi, ic]); // Cachear dados
        setOrcamentoAnual(oa[0] || null);
        setLancamentos(l);
        setItensOrcados(oi);
        setItensContrato(ic || []);
      })
      .catch((err) => {
        logger.error("Falha ao carregar dados financeiros", {
          contratoId: contrato.id,
          ano,
          retryCount,
          errorMessage: err?.message,
          errorStack: err?.stack
        });
        setError("Não foi possível carregar os dados financeiros. Tente novamente.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [contrato?.id, ano, retryCount]);

  // --- CÁLCULOS E PROCESSAMENTO DE DADOS ---
  const orcadoTotalAnual = orcamentoAnual?.valor_orcado || 0;

  // Itens únicos para o filtro dropdown
  const itensDisponiveisParaFiltro = useMemo(() => {
    const uniqueLabelsMap = new Map();
    
    itensContrato.forEach(i => {
      if (i.nome) uniqueLabelsMap.set(normalizarParaComparacao(i.nome), i.nome);
    });
    lancamentos.forEach(l => {
      if (l.item_label) uniqueLabelsMap.set(normalizarParaComparacao(l.item_label), l.item_label);
    });
    itensOrcados.forEach(i => {
      if (i.item_label) uniqueLabelsMap.set(normalizarParaComparacao(i.item_label), i.item_label);
    });
    
    return Array.from(uniqueLabelsMap.values()).sort();
  }, [lancamentos, itensOrcados, itensContrato]);

  // Processamento da tabela detalhada por item
  const { gruposComItens, totalTabelaOrcado, totalTabelaPago, totalTabelaAprov, totalTabelaSaldo, totalTabelaPct } = useMemo(() => {
    const tabelaItens = calcularTotaisPorItem(lancamentos, itensOrcados, itensContrato, itemFiltro);

    // Organizar os itens processados nos grupos
    const gruposComItens = [
      { nome: "Serviços Fixos", rows: [] },
      { nome: "Demandas Eventuais", rows: [] }
    ];

    tabelaItens.forEach(item => {
      if (item.grupo === "Serviços Fixos") {
        gruposComItens[0].rows.push(item);
      } else {
        gruposComItens[1].rows.push(item);
      }
    });

    // Calcular totais gerais da tabela (apenas dos itens visíveis)
    const todosOsItensDaTabela = gruposComItens.flatMap(g => g.rows);
    const totais = calcularTotaisGerais(todosOsItensDaTabela);
    const totalTabelaPct = totais.orcado > 0 ? Math.min((totais.pago / totais.orcado) * 100, 100) : 0;

    return { 
      gruposComItens, 
      totalTabelaOrcado: totais.orcado, 
      totalTabelaPago: totais.pago, 
      totalTabelaAprov: totais.aprov, 
      totalTabelaSaldo: totais.saldo, 
      totalTabelaPct 
    };

  }, [lancamentos, itensOrcados, itensContrato, itemFiltro]);

  // Cálculos para os Gauge Charts (sempre baseados no total anual, não no filtro de item)
  const totaisAnuais = useMemo(() => {
    const todosItens = calcularTotaisPorItem(lancamentos, itensOrcados, itensContrato, "todos");
    return calcularTotaisGerais(todosItens);
  }, [lancamentos, itensOrcados, itensContrato]);

  const totalPagoGeral = totaisAnuais.pago;
  const totalAprovGeral = totaisAnuais.aprov;

  const pctPagoOrcadoGeral = orcadoTotalAnual > 0 ? (totalPagoGeral / orcadoTotalAnual) * 100 : 0;
  const pctAprovOrcadoGeral = orcadoTotalAnual > 0 ? (totalAprovGeral / orcadoTotalAnual) * 100 : 0;

  // --- RENDERIZAÇÃO ---
  if (!contrato?.id || typeof contrato.id !== 'string') {
    return (
      <Card className="border border-red-200">
        <CardContent className="p-4 text-red-600">
          Contrato inválido. Não é possível carregar dados.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin">⏳</div>
            <div className="text-blue-700 font-medium">
              Carregando dados financeiros...
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-2">
            Contrato: {contrato.numero} | Ano: {ano}
          </div>
        </CardContent>
      </Card>
    );
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