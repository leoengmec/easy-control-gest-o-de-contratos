import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine, ComposedChart, Area
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtK = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toFixed(0);
};

const MESES_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027];

const STATUS_CORES = {
  ativo: "#22c55e",
  encerrado: "#6b7280",
  suspenso: "#f59e0b",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <div className="font-semibold text-gray-700 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500">{p.name}:</span>
          </div>
          <span className="font-bold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold capitalize">{payload[0].name}</div>
      <div className="text-gray-600">{payload[0].value} contrato(s)</div>
      <div className="text-gray-400">{payload[0].payload.percent}%</div>
    </div>
  );
};

const CATEGORIAS = [
  "Deslocamento Corretivo",
  "Deslocamento Preventivo",
  "Locações",
  "MOR Natal",
  "MOR Mossoró",
  "Serviços eventuais",
  "Fornecimento de Materiais",
];

const GRUPOS = {
  "MOR": ["MOR Natal", "MOR Mossoró"],
  "Serviços": ["Deslocamento Corretivo", "Deslocamento Preventivo", "Locações", "Serviços eventuais"],
  "Materiais": ["Fornecimento de Materiais"],
};

const CAT_CORES = {
  "Deslocamento Corretivo": "#3b82f6",
  "Deslocamento Preventivo": "#6366f1",
  "Locações": "#8b5cf6",
  "MOR Natal": "#f59e0b",
  "MOR Mossoró": "#f97316",
  "Serviços eventuais": "#ec4899",
  "Fornecimento de Materiais": "#10b981",
  "MOR": "#f59e0b",
  "Serviços": "#3b82f6",
  "Materiais": "#10b981",
};

// ── Helpers para classificar itens de contrato ───────────────────────────────
const MOR_NATAL_KEYS = ["natal", "artífice natal", "auxiliar natal", "administrativo natal", "engenheiro"];
const MOR_MOSSORO_KEYS = ["mossoró", "mossoro"];

function isMorMossoro(nome) { return MOR_MOSSORO_KEYS.some(k => nome.toLowerCase().includes(k)); }
function isMorNatal(nome) { return MOR_NATAL_KEYS.some(k => nome.toLowerCase().includes(k)) && !isMorMossoro(nome); }
function isMaterial(nome) { return ["material", "fornecimento de material"].some(k => nome.toLowerCase().includes(k)); }
function isDeslPreventivo(nome) { return nome.toLowerCase().includes("deslocamento preventivo"); }
function isDeslCorretivo(nome) { return nome.toLowerCase().includes("deslocamento corretivo"); }
function isLocacao(nome) { return nome.toLowerCase().includes("locação") || nome.toLowerCase().includes("locacao"); }
function isEventual(nome) { return nome.toLowerCase().includes("eventual"); }

function calcularValorAnual(item) {
  if (item.periodicidade === "mensal") return (item.valor_unitario || 0) * (item.quantidade_contratada || 1) * 12;
  return item.valor_total_contratado || 0;
}

// Dado os itens do contrato e o total orçado, calcula o orçado por categoria (igual ao DetalhamentoOrcamentoContrato)
function calcularOrcadoPorCategoria(itens, totalOrcado) {
  const morNatalItens = itens.filter(i => isMorNatal(i.nome) && !isMaterial(i.nome));
  const morMossoroItens = itens.filter(i => isMorMossoro(i.nome) && !isMaterial(i.nome));
  const deslPrevItens = itens.filter(i => isDeslPreventivo(i.nome));
  const materialItens = itens.filter(i => isMaterial(i.nome));

  const fixedIds = new Set([
    ...morNatalItens.map(i => i.id),
    ...morMossoroItens.map(i => i.id),
    ...deslPrevItens.map(i => i.id),
    ...materialItens.map(i => i.id),
  ]);
  const demaisItens = itens.filter(i => !fixedIds.has(i.id));

  const valMorNatal = morNatalItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valMorMossoro = morMossoroItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valDeslPrev = deslPrevItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valMaterial = materialItens.reduce((s, i) => s + calcularValorAnual(i), 0);

  const totalFixo = valMorNatal + valMorMossoro + valDeslPrev;
  const restante = totalOrcado - totalFixo - valMaterial;
  const totalDemaisContratado = demaisItens.reduce((s, i) => s + calcularValorAnual(i), 0);

  const result = {
    "MOR Natal": valMorNatal,
    "MOR Mossoró": valMorMossoro,
    "Deslocamento Preventivo": valDeslPrev,
    "Fornecimento de Materiais": valMaterial,
    "Deslocamento Corretivo": 0,
    "Locações": 0,
    "Serviços eventuais": 0,
  };

  demaisItens.forEach(item => {
    const valAnual = calcularValorAnual(item);
    const prop = totalDemaisContratado > 0 ? valAnual / totalDemaisContratado : 0;
    const valOrcado = restante > 0 ? prop * restante : 0;
    if (isDeslCorretivo(item.nome)) result["Deslocamento Corretivo"] += valOrcado;
    else if (isLocacao(item.nome)) result["Locações"] += valOrcado;
    else if (isEventual(item.nome)) result["Serviços eventuais"] += valOrcado;
    // demais não mapeados são ignorados
  });

  return result;
}

export default function GraficoDashboardConsolidado({ contratos, lancamentos, empenhos, orcamentosContratuais, contratoSelecionado = "todos" }) {
  const [orcamentosAnuais, setOrcamentosAnuais] = useState([]);
  const [orcamentosItens, setOrcamentosItens] = useState([]);
  const [itensContrato, setItensContrato] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [agrupamento, setAgrupamento] = useState("grupo"); // "individual" | "grupo"

  useEffect(() => {
    Promise.all([
      base44.entities.OrcamentoAnual.list(),
      base44.entities.OrcamentoContratualItemAnual.list(),
      base44.entities.ItemContrato.list(),
    ]).then(([oa, oi, ic]) => {
      setOrcamentosAnuais(oa);
      setOrcamentosItens(oi);
      setItensContrato(ic);
    });
  }, []);

  const [abaGrafico, setAbaGrafico] = useState("mensal");

  // Lançamentos do ano filtrado
  const lancsFiltro = lancamentos.filter(l => l.ano === anoSelecionado);

  // Orçado total do ano filtrado
  const orcadoTotal = orcamentosContratuais.filter(o => o.ano === anoSelecionado).reduce((s, o) => s + (o.valor_orcado || 0), 0);

  // Orcamento por item/categoria filtrado pelo ano e contrato
  const orcItensAno = orcamentosItens.filter(o =>
    o.ano === anoSelecionado &&
    (contratoSelecionado === "todos" || o.contrato_id === contratoSelecionado)
  );

  // Se não há detalhamento salvo, calcula a partir dos itens de contrato + orçamento total
  const orcadoCategoriaCalculado = (() => {
    // Agrupa itens por contrato (filtra se selecionado)
    const itensFiltro = contratoSelecionado === "todos"
      ? itensContrato
      : itensContrato.filter(i => i.contrato_id === contratoSelecionado);

    // Total orçado do ano para os contratos filtrados
    const totalOrc = orcamentosContratuais
      .filter(o => o.ano === anoSelecionado && (contratoSelecionado === "todos" || o.contrato_id === contratoSelecionado))
      .reduce((s, o) => s + (o.valor_orcado || 0), 0);

    if (itensFiltro.length === 0 || totalOrc === 0) return null;
    return calcularOrcadoPorCategoria(itensFiltro, totalOrc);
  })();

  // Helper: valor orçado para uma categoria (ou grupo)
  // Usa os registros salvos se existirem, senão usa o cálculo dinâmico a partir dos itens do contrato
  const getOrcadoCategoria = (cat) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];

    if (orcItensAno.length > 0) {
      // Há detalhamento salvo — usa ele
      return orcItensAno
        .filter(o => cats.some(c => o.item_label?.toLowerCase().includes(c.toLowerCase())))
        .reduce((s, o) => s + (o.valor_orcado || 0), 0);
    }

    // Sem detalhamento salvo — usa cálculo dinâmico
    if (orcadoCategoriaCalculado) {
      return cats.reduce((s, c) => s + (orcadoCategoriaCalculado[c] || 0), 0);
    }

    return 0;
  };

  // Helper: valor pago para uma categoria (ou grupo)
  const getPagoCategoria = (cat, lancs) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    return lancs.filter(l => l.status === "Pago" && cats.some(c => l.item_label?.includes(c))).reduce((s, l) => s + (l.valor || 0), 0);
  };

  const getAprovCategoria = (cat, lancs) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    return lancs.filter(l => l.status === "Aprovisionado" && cats.some(c => l.item_label?.includes(c))).reduce((s, l) => s + (l.valor || 0), 0);
  };

  // Categorias ativas de acordo com agrupamento
  const categoriasAtivas = agrupamento === "grupo" ? Object.keys(GRUPOS) : CATEGORIAS;

  // 1. Distribuição por Status (Pizza) - sempre sobre todos os contratos
  const totalContratos = contratos.length;
  const distStatus = ["ativo", "encerrado", "suspenso"].map(status => {
    const count = contratos.filter(c => c.status === status).length;
    return {
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percent: totalContratos > 0 ? ((count / totalContratos) * 100).toFixed(0) : 0,
    };
  }).filter(d => d.value > 0);

  // 2. Gráfico por Categoria (Pago x Orçado x Empenhado)
  const empenhosFiltro = empenhos.filter(e =>
    e.ano === anoSelecionado &&
    (contratoSelecionado === "todos" || e.contrato_id === contratoSelecionado)
  );
  const empenhadoServico = empenhosFiltro.filter(e => e.natureza_despesa === "339039_servico").reduce((s, e) => s + (e.valor_total || 0), 0);
  const empenhadoMaterial = empenhosFiltro.filter(e => e.natureza_despesa === "339030_material").reduce((s, e) => s + (e.valor_total || 0), 0);

  const getEmpenhadoCategoria = (cat) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    const isMaterial = cats.includes("Fornecimento de Materiais");
    const isServico = cats.some(c => c !== "Fornecimento de Materiais");
    if (isMaterial && !isServico) return empenhadoMaterial;
    if (!isMaterial && isServico) {
      // Tenta distribuir proporcionalmente ao orçado
      const totalOrcadoServico = categoriasAtivas
        .filter(c => !(agrupamento === "grupo" ? GRUPOS[c] : [c]).includes("Fornecimento de Materiais"))
        .reduce((s, c) => s + getOrcadoCategoria(c), 0);
      const orcCat = getOrcadoCategoria(cat);
      if (totalOrcadoServico > 0) {
        return empenhadoServico * orcCat / totalOrcadoServico;
      }
      // Sem orçado cadastrado: distribui igualmente entre categorias de serviço
      const catServico = categoriasAtivas.filter(c => !(agrupamento === "grupo" ? GRUPOS[c] : [c]).includes("Fornecimento de Materiais"));
      return empenhadoServico / catServico.length;
    }
    return 0;
  };

  const dadosPorCategoria = categoriasAtivas.map(cat => {
    const pago = getPagoCategoria(cat, lancsFiltro);
    const aprov = getAprovCategoria(cat, lancsFiltro);
    const orcado = getOrcadoCategoria(cat);
    const empenhado = getEmpenhadoCategoria(cat);
    return { name: cat, Pago: pago, Aprovisionado: aprov, Orçado: orcado, Empenhado: empenhado };
  }).filter(d => d.Pago > 0 || d.Orçado > 0 || d.Empenhado > 0);

  // 3. Gráfico Mensal
  const dadosMensais = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const lancsM = lancsFiltro.filter(l => l.mes === m);
    const pago = lancsM.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovisionado = lancsM.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const instrucao = lancsM.filter(l => ["Em instrução","Em execução","SOF"].includes(l.status)).reduce((s, l) => s + (l.valor || 0), 0);
    const orcadoMes = orcadoTotal > 0 ? orcadoTotal / 12 : 0;
    return { name, Pago: pago, Aprovisionado: aprovisionado, "Em instrução": instrucao, "Orçado/Mês": orcadoMes };
  });

  // 4. Acumulado do ano
  const dadosAcumulados = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const pagoAcum = lancsFiltro.filter(l => l.mes <= m && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovAcum = lancsFiltro.filter(l => l.mes <= m && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const orcadoAcum = orcadoTotal > 0 ? orcadoTotal * (m / 12) : 0;
    return {
      name,
      "Realizado": pagoAcum,
      "Realizado + Aprovisionado": pagoAcum + aprovAcum,
      "Orçado (prop.)": orcadoAcum,
    };
  });

  // 5. Evolução do Orçamento Anual
  const evolucaoOrcamento = ANOS_DISPONIVEIS.map(ano => {
    const orc = orcamentosAnuais.find(o => o.ano === ano);
    const empenhado = empenhos.filter(e => e.ano === ano).reduce((s, e) => s + (e.valor_total || 0), 0);
    const pago = lancamentos.filter(l => l.ano === ano && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    return {
      name: String(ano),
      "Dotação Inicial": orc?.valor_dotacao_inicial || 0,
      "Dotação Atual": orc?.valor_dotacao_atual || 0,
      "Empenhado": empenhado,
      "Pago": pago,
    };
  }).filter(d => d["Dotação Inicial"] > 0 || d["Empenhado"] > 0 || d["Pago"] > 0);

  const abas = [
    { key: "categoria", label: "Por Categoria" },
    { key: "mensal", label: "Mensal" },
    { key: "acumulado", label: "Acumulado" },
    { key: "evolucao", label: "Evolução Anual" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Card de Distribuição por Status (Pizza) */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="text-sm font-semibold text-[#1a2e4a]">Distribuição por Status</div>
          <div className="text-xs text-gray-400">{totalContratos} contrato(s) no total</div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={distStatus}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                paddingAngle={3}
              >
                {distStatus.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={STATUS_CORES[entry.name.toLowerCase()] || "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {distStatus.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_CORES[d.name.toLowerCase()] || "#6b7280" }} />
                  <span className="text-gray-600 capitalize">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{d.value}</span>
                  <span className="text-gray-400">({d.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card Principal com Abas */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 flex-wrap">
              {abas.map(aba => (
                <Button
                  key={aba.key}
                  variant={abaGrafico === aba.key ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setAbaGrafico(aba.key)}
                >
                  {aba.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {abaGrafico !== "evolucao" && (
                <Select value={String(anoSelecionado)} onValueChange={v => setAnoSelecionado(Number(v))}>
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS_DISPONIVEIS.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {abaGrafico === "categoria" && (
                <Select value={agrupamento} onValueChange={setAgrupamento}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupo">Agrupado</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Por Categoria */}
          {abaGrafico === "categoria" && (
            <div>
              <div className="text-xs text-gray-500 mb-3">Orçado × Pago × Empenhado por Categoria · {anoSelecionado}</div>
              {dadosPorCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(220, dadosPorCategoria.length * 60)}>
                  <BarChart data={dadosPorCategoria} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={agrupamento === "individual" ? 130 : 80} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Orçado" fill="#3b82f6" radius={[0,3,3,0]} maxBarSize={14} />
                    <Bar dataKey="Empenhado" fill="#f59e0b" radius={[0,3,3,0]} maxBarSize={14} />
                    <Bar dataKey="Pago" fill="#22c55e" radius={[0,3,3,0]} maxBarSize={14} />
                    <Bar dataKey="Aprovisionado" fill="#a78bfa" radius={[0,3,3,0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400 text-center py-8">Sem dados para o período</div>
              )}
            </div>
          )}

          {/* Mensal */}
          {abaGrafico === "mensal" && (
            <div>
              <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
                <span>Pagamentos mensais · {anoSelecionado}</span>
                {orcadoTotal > 0 && <span className="text-red-500 font-medium">— Máx/mês: {fmt(orcadoTotal / 12)}</span>}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={dadosMensais} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {orcadoTotal > 0 && (
                    <ReferenceLine y={orcadoTotal / 12} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: "Teto/mês", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                  )}
                  <Bar dataKey="Pago" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={28} />
                  <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={28} />
                  <Bar dataKey="Em instrução" fill="#93c5fd" radius={[3,3,0,0]} maxBarSize={28} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Acumulado */}
          {abaGrafico === "acumulado" && (
            <div>
              <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
                <span>Realizado acumulado vs. Orçado · {anoSelecionado}</span>
                {orcadoTotal > 0 && <span className="text-purple-500 font-medium">Teto: {fmt(orcadoTotal)}</span>}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={dadosAcumulados} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {orcadoTotal > 0 && (
                    <ReferenceLine y={orcadoTotal} stroke="#a855f7" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: "Orçado total", position: "insideTopRight", fontSize: 9, fill: "#a855f7" }} />
                  )}
                  <Area dataKey="Orçado (prop.)" fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} dot={false} fillOpacity={0.35} />
                  <Line dataKey="Realizado" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3, fill: "#22c55e" }} activeDot={{ r: 5 }} />
                  <Line dataKey="Realizado + Aprovisionado" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Evolução Anual */}
          {abaGrafico === "evolucao" && (
            <div>
              <div className="text-xs text-gray-500 mb-3">Evolução do Orçamento Anual</div>
              {evolucaoOrcamento.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={evolucaoOrcamento} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Dotação Inicial" fill="#dbeafe" stroke="#3b82f6" radius={[3,3,0,0]} maxBarSize={40} />
                    <Bar dataKey="Dotação Atual" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={40} />
                    <Line dataKey="Empenhado" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line dataKey="Pago" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400 text-center py-8">Cadastre orçamentos anuais para visualizar a evolução</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}