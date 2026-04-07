jsx import React, { useState, useEffect, useMemo } from 'react'; import { Card, CardContent, CardHeader } from "@/components/ui/card"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; import { base44 } from '@/api/base44Client'; import GaugeChart from './GaugeChart'; // Assumindo que GaugeChart está no mesmo diretório

// --- TIPAGEM (Para melhor suporte TypeScript, se aplicável) --- interface Contrato { id: string;
numero: string;
contratada: string;
valor_global: number; }

interface OrcamentoContratualAnual { contrato_id: string;
ano: number;
valor_orcado: number; }

interface LancamentoFinanceiro { id: string;
contrato_id: string;
item_label: string;
valor: number; // Valor orçado ou previsto para o lançamento
valor_pago_final: number; // Valor efetivamente pago
ano: number;
mes: number; }

interface OrcamentoContratualItemAnual { contrato_id: string;
ano: number;
item_label: string;
valor_orcado: number; }

interface TabelaItem { label: string;
orcado: number;
pago: number;
aprov: number;
saldo: number;
pct: number; }

interface GrupoTabela { nome: string;
itens: string[];
rows: TabelaItem[]; }

// --- CONSTANTES E FUNÇÕES AUXILIARES --- const ANOS = [2024, 2025, 2026, 2027, 2028]; const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Mapeamento para normalizar labels de itens const NOME_MAP: { [key: string]: string } = {
"SERVIÇOS DE DESLOCAMENTO CORRETIVO": "Deslocamento Corretivo",
"SERVIÇOS DE DESLOCAMENTO PREVENTIVO": "Deslocamento Preventivo",
"SERVIÇOS DE DESLOCAMENTO ENGENHEIRO": "Deslocamento do Engenheiro",
"SERVIÇOS EVENTUAIS": "Serviços Eventuais",
"SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS": "Locações",
"FORNECIMENTO DE MATERIAL": "Fornecimento de Materiais", };

// Definição dos grupos de itens (apenas Serviços Fixos e Demandas Eventuais) const GRUPOS_DEFINICAO = [ { nome: "Serviços Fixos",
itens: ["MOR Natal", "MOR Mossoró", "Deslocamento Preventivo"] }, { nome: "Demandas Eventuais",
itens: ["Deslocamento Corretivo", "Deslocamento do Engenheiro", "Serviços Eventuais", "Locações", "Fornecimento de Materiais"] } ];

// Lista de todos os labels de itens válidos para exibição const TODOS_ITENS_VALIDOS = GRUPOS_DEFINICAO.flatMap(g => g.itens);

// Função para normalizar labels (remover "Serviços de", tratar MOR) const normalizarLabel = (label: string | undefined): string => { if (!label) return ""; const upper = label.toUpperCase(); if (NOME_MAP[upper]) return NOME_MAP[upper];

// Tratamento especial para MOR if (upper.includes("MOR NATAL")) return "MOR Natal"; if (upper.includes("MOR MOSSORO") || upper.includes("MOR MOSSORÓ")) return "MOR Mossoró";

return label; };

// Função para identificar a categoria principal de um item normalizado const identificarCategoria = (itemLabelNormalizado: string): string => { const servicosFixosLabels = GRUPOS_DEFINICAO.find(g => g.nome === "Serviços Fixos")?.itens || []; return servicosFixosLabels.includes(itemLabelNormalizado) ? 'Serviços Fixos' : 'Demandas Eventuais'; };

// --- COMPONENTE PRINCIPAL --- export default function ContractFinancialOverview({ contrato }: { contrato: Contrato }) { const [ano, setAno] = useState(new Date().getFullYear()); const [itemFiltro, setItemFiltro] = useState("todos");

const [orcamentoAnual, setOrcamentoAnual] = useState<OrcamentoContratualAnual | null>(null); const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]); const [itensOrcados, setItensOrcados] = useState<OrcamentoContratualItemAnual[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);

// Efeito para carregar dados do BD useEffect(() => { setLoading(true); setError(null); Promise.all([ base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contrato.id, ano }),
base44.entities.LancamentoFinanceiro.filter({ contrato_id: contrato.id, ano }),
base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }), ]).then(([oa, l, oi]) => { setOrcamentoAnual(oa[0] || null); setLancamentos(l); setItensOrcados(oi); }).catch((err) => { console.error("Erro ao carregar dados financeiros:", err); setError("Não foi possível carregar os dados financeiros."); }).finally(() => { setLoading(false); }); }, [contrato.id, ano]);

// --- CÁLCULOS E PROCESSAMENTO DE DADOS --- const orcadoTotalAnual = orcamentoAnual?.valor_orcado || 0;

// Itens únicos para o filtro dropdown (apenas os que pertencem aos grupos válidos) const itensDisponiveisParaFiltro = useMemo(() => { const uniqueLabels = new Set(); lancamentos.forEach(l => { const normalized = normalizarLabel(l.item_label); if (TODOS_ITENS_VALIDOS.includes(normalized)) { uniqueLabels.add(normalized); } }); itensOrcados.forEach(i => { const normalized = normalizarLabel(i.item_label); if (TODOS_ITENS_VALIDOS.includes(normalized)) { uniqueLabels.add(normalized); } }); return Array.from(uniqueLabels).sort(); }, [lancamentos, itensOrcados]);

// Processamento da tabela detalhada por item const { gruposComItens, totalTabelaOrcado, totalTabelaPago, totalTabelaAprov, totalTabelaSaldo, totalTabelaPct } = useMemo(() => { // Coletar todos os labels de itens que devem aparecer na tabela (de orçamentos e lançamentos) const allRelevantLabels = new Set(); itensOrcados.forEach(i => { const normalized = normalizarLabel(i.item_label); if (TODOS_ITENS_VALIDOS.includes(normalized)) { allRelevantLabels.add(normalized); } }); lancamentos.forEach(l => { const normalized = normalizarLabel(l.item_label); if (TODOS_ITENS_VALIDOS.includes(normalized)) { allRelevantLabels.add(normalized); } });

// Se o filtro de item estiver ativo, considerar apenas ele
const labelsParaProcessar = itemFiltro === "todos"
  ? Array.from(allRelevantLabels)
  : [itemFiltro];

const tabelaItens: TabelaItem[] = labelsParaProcessar.map(label => {
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
const gruposComItens: GrupoTabela[] = GRUPOS_DEFINICAO.map(grupo => {
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

// Cálculos para os Gauge Charts (sempre baseados no total anual, não no filtro de item) const totalPagoGeral = lancamentos.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor_pago_final || 0), 0); const totalAprovGeral = lancamentos.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

const pctPagoOrcadoGeral = orcadoTotalAnual > 0 ? (totalPagoGeral / orcadoTotalAnual) * 100 : 0;
const pctAprovOrcadoGeral = orcadoTotalAnual > 0 ? (totalAprovGeral / orcadoTotalAnual) * 100 : 0;

// --- RENDERIZAÇÃO --- if (loading) { return ( Carregando dados financeiros... ); }

if (error) { return ( Erro: {error} ); }

return (

{contrato.numero}

{contrato.contratada}

 <Select value={String(ano)} onValueChange={v => setAno(Number(v))}> {ANOS.map(a => {a})} Todos os itens {itensDisponiveisParaFiltro.map(it => ( {it} ))}

 {/* Gauge Charts */}

 <GaugeChart value={pctPagoOrcadoGeral} label="Pago vs Orçado" sublabel={/ ${fmt(orcadoTotalAnual)}} rawValue={totalPagoGeral} /> <GaugeChart value={pctAprovOrcadoGeral} label="Aprovisionado vs Orçado" sublabel={/ ${fmt(orcadoTotalAnual)}} rawValue={totalAprovGeral} color="#f59e0b" />



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
                                width: `${item.pct}%`,<br/>
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
                        width: `${totalTabelaPct}%`,<br/>
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


); }