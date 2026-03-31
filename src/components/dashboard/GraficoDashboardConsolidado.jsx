import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Line, ReferenceLine, ComposedChart, Area,
  PieChart, Pie, Cell
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import mean from "lodash/mean";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtK = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toFixed(0);
};

const getValorFinal = (l) => l.valor_pago_final !== undefined && l.valor_pago_final !== null ? l.valor_pago_final : (l.valor || 0);

const MESES_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

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
  "MOR",
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
  "MOR": "#f59e0b",
  "Serviços eventuais": "#ec4899",
  "Fornecimento de Materiais": "#10b981",
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
    "MOR": valMorNatal + valMorMossoro,
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
      base44.entities.OrcamentoContratualAnual.list(),
      base44.entities.OrcamentoContratualItemAnual.list(),
      base44.entities.ItemContrato.list(),
    ]).then(([oa, oi, ic]) => {
      setOrcamentosAnuais(oa);
      setOrcamentosItens(oi);
      setItensContrato(ic);
    });
  }, []);

  const [abaGrafico, setAbaGrafico] = useState("mensal");
  const [contratoClicado, setContratoClicado] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const cardRef = useRef(null);

  const handleExportPNG = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `dashboard-${abaGrafico}-${anoSelecionado}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`dashboard-${abaGrafico}-${anoSelecionado}.pdf`);
  };


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
    const itensFiltro = contratoSelecionado === "todos"
      ? itensContrato
      : itensContrato.filter(i => i.contrato_id === contratoSelecionado);

    const totalOrc = orcamentosContratuais
      .filter(o => o.ano === anoSelecionado && (contratoSelecionado === "todos" || o.contrato_id === contratoSelecionado))
      .reduce((s, o) => s + (o.valor_orcado || 0), 0);

    if (itensFiltro.length === 0 || totalOrc === 0) return null;
    return calcularOrcadoPorCategoria(itensFiltro, totalOrc);
  })();

  const getOrcadoCategoria = (cat) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];

    if (orcItensAno.length > 0) {
      return orcItensAno
        .filter(o => cats.some(c => o.item_label?.toLowerCase().includes(c.toLowerCase())))
        .reduce((s, o) => s + (o.valor_orcado || 0), 0);
    }

    if (orcadoCategoriaCalculado) {
      return cats.reduce((s, c) => s + (orcadoCategoriaCalculado[c] || 0), 0);
    }

    return 0;
  };

  const getPagoCategoria = (cat, lancs) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    return lancs.filter(l => l.status === "Pago" && cats.some(c => l.item_label?.includes(c))).reduce((s, l) => s + getValorFinal(l), 0);
  };

  const getAprovCategoria = (cat, lancs) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    return lancs.filter(l => l.status === "Aprovisionado" && cats.some(c => l.item_label?.includes(c))).reduce((s, l) => s + getValorFinal(l), 0);
  };

  const categoriasAtivas = agrupamento === "grupo" ? Object.keys(GRUPOS) : CATEGORIAS;

  // Coletar anos disponíveis dinamicamente
  const anosDisponiveis = [...new Set([
    ...lancamentos.map(l => l.ano),
    ...empenhos.map(e => e.ano),
    ...orcamentosAnuais.map(o => o.ano),
    ...orcamentosItens.map(o => o.ano),
    new Date().getFullYear()
  ])].filter(Boolean).sort((a, b) => a - b);

  // 1. Distribuição por Status (Pizza)
  const totalContratos = contratos.length;
  const distStatus = ["ativo", "encerrado", "suspenso"].map(status => {
    const count = contratos.filter(c => c.status === status).length;
    return {
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      percent: totalContratos > 0 ? ((count / totalContratos) * 100).toFixed(0) : 0,
    };
  }).filter(d => d.value > 0);

  // 2. Gráfico por Categoria
  const empenhosFiltro = empenhos.filter(e =>
    e.ano === anoSelecionado &&
    (contratoSelecionado === "todos" || e.contrato_id === contratoSelecionado)
  );
  const empenhadoServico = empenhosFiltro.filter(e => e.natureza_despesa === "339039_servico").reduce((s, e) => s + (e.valor_total || 0), 0);
  const empenhadoMaterial = empenhosFiltro.filter(e => e.natureza_despesa === "339030_material").reduce((s, e) => s + (e.valor_total || 0), 0);

  const getEmpenhadoCategoria = (cat) => {
    const cats = agrupamento === "grupo" ? (GRUPOS[cat] || [cat]) : [cat];
    const isMaterialCat = cats.includes("Fornecimento de Materiais");
    const isServicoCat = cats.some(c => c !== "Fornecimento de Materiais");
    if (isMaterialCat && !isServicoCat) return empenhadoMaterial;
    if (!isMaterialCat && isServicoCat) {
      const totalOrcadoServico = categoriasAtivas
        .filter(c => !(agrupamento === "grupo" ? GRUPOS[c] : [c]).includes("Fornecimento de Materiais"))
        .reduce((s, c) => s + getOrcadoCategoria(c), 0);
      const orcCat = getOrcadoCategoria(cat);
      if (totalOrcadoServico > 0) {
        return empenhadoServico * orcCat / totalOrcadoServico;
      }
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
  const dadosMensaisRaw = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const lancsM = lancsFiltro.filter(l => l.mes === m);
    const pago = lancsM.filter(l => l.status === "Pago").reduce((s, l) => s + getValorFinal(l), 0);
    const aprovisionado = lancsM.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + getValorFinal(l), 0);
    const instrucao = lancsM.filter(l => ["Em instrução","Em execução","SOF"].includes(l.status)).reduce((s, l) => s + getValorFinal(l), 0);
    const orcadoMes = orcadoTotal > 0 ? orcadoTotal / 12 : 0;
    return { name, Pago: pago, Aprovisionado: aprovisionado, "Em instrução": instrucao, "Orçado/Mês": orcadoMes };
  });

  const dadosMensais = dadosMensaisRaw.map((d, i, arr) => {
    const start = Math.max(0, i - 2);
    const subset = arr.slice(start, i + 1).map(x => x.Pago + x.Aprovisionado);
    const mediaMovel = mean(subset);
    return { ...d, "Tendência (Média 3m)": mediaMovel };
  });

  // 4. Acumulado do ano
  const dadosAcumulados = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const pagoAcum = lancsFiltro.filter(l => l.mes <= m && l.status === "Pago").reduce((s, l) => s + getValorFinal(l), 0);
    const aprovAcum = lancsFiltro.filter(l => l.mes <= m && l.status === "Aprovisionado").reduce((s, l) => s + getValorFinal(l), 0);
    const orcadoAcum = orcadoTotal > 0 ? orcadoTotal * (m / 12) : 0;
    return {
      name,
      "Realizado": pagoAcum,
      "Realizado + Aprovisionado": pagoAcum + aprovAcum,
      "Orçado (prop.)": orcadoAcum,
    };
  });

  const handleBarClick = (data, status) => {
    const val = data[status];
    if (val > 0) {
      const mesIndex = MESES_LABELS.indexOf(data.name) + 1;
      setContratoClicado({ mes: data.name, status, mesIndex });
      
      const statusMap = {
        "Pago": ["Pago"],
        "Aprovisionado": ["Aprovisionado"],
        "Em instrução": ["Em instrução", "Em execução", "SOF"]
      };
      const lancs = lancsFiltro.filter(l => l.mes === mesIndex && statusMap[status].includes(l.status));
      const desc = lancs.map(l => {
        let text = [];
        if (l.numero_nf) text.push(`NF: ${l.numero_nf}`);
        if (l.observacoes) text.push(l.observacoes);
        return text.join(" - ");
      }).filter(Boolean).join(" | ");

      setSelectedItem({
        status: status,
        descricao: desc || 'Sem descrição detalhada',
        valor_pago_final: val,
        valor_orcado: data["Orçado/Mês"]
      });
    }
  };

  // 5. Evolução do Orçamento Anual
  const evolucaoOrcamento = anosDisponiveis.map(ano => {
    const totalOrcado = orcamentosAnuais.filter(o => o.ano === ano).reduce((s, o) => s + (o.valor_orcado || 0), 0);
    const empenhado = empenhos.filter(e => e.ano === ano).reduce((s, e) => s + (e.valor_total || 0), 0);
    const pago = lancamentos.filter(l => l.ano === ano && l.status === "Pago").reduce((s, l) => s + getValorFinal(l), 0);
    return {
      name: String(ano),
      "Orçado": totalOrcado,
      "Empenhado": empenhado,
      "Pago": pago,
    };
  }).filter(d => d["Orçado"] > 0 || d["Empenhado"] > 0 || d["Pago"] > 0);

  const abas = [
    { key: "categoria", label: "Por Categoria" },
    { key: "mensal", label: "Mensal" },
    { key: "acumulado", label: "Acumulado" },
    { key: "evolucao", label: "Evolução Anual" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Card Principal com Abas - agora ocupa toda a largura */}
      <Card className="w-full" ref={cardRef}>
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
                    {anosDisponiveis.map(a => (
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
              {abaGrafico === "mensal" && (
                <div className="flex items-center gap-1.5">
                  <Switch id="trend" checked={showTrendLine} onCheckedChange={setShowTrendLine} className="h-4 w-7" />
                  <Label htmlFor="trend" className="text-xs cursor-pointer">Tendência</Label>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPNG} className="text-xs">
                    Exportar como PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="text-xs">
                    Exportar como PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <div className="relative mb-4 flex items-center justify-center">
                <h2 className="text-xl font-bold text-foreground text-center">Acompanhamento Financeiro · {anoSelecionado}</h2>
                {orcadoTotal > 0 && <span className="absolute right-0 text-xs text-red-500 font-medium">— Máx/mês: {fmt(orcadoTotal / 12)}</span>}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Visão Financeira por Contrato/Item</h3>
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
                  <Bar dataKey="Pago" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={28} cursor="pointer" onClick={(data) => handleBarClick(data, "Pago")} />
                  <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={28} cursor="pointer" onClick={(data) => handleBarClick(data, "Aprovisionado")} />
                  <Bar dataKey="Em instrução" fill="#93c5fd" radius={[3,3,0,0]} maxBarSize={28} cursor="pointer" onClick={(data) => handleBarClick(data, "Em instrução")} />
                  {showTrendLine && (
                    <Line type="monotone" dataKey="Tendência (Média 3m)" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              {contratoClicado && (
                <div className="mt-4 p-4 bg-slate-50 border rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-sm">
                      Detalhamento de {contratoClicado.mes} - {contratoClicado.status}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setContratoClicado(null)} className="h-6 px-2 text-xs">Fechar</Button>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const statusMap = {
                        "Pago": ["Pago"],
                        "Aprovisionado": ["Aprovisionado"],
                        "Em instrução": ["Em instrução", "Em execução", "SOF"]
                      };
                      const lancsDetail = lancsFiltro.filter(l => 
                        l.mes === contratoClicado.mesIndex && 
                        statusMap[contratoClicado.status].includes(l.status)
                      );
                      
                      if (contratoSelecionado === "todos") {
                        const lancsComContrato = lancsDetail.map(l => {
                          const c = contratos.find(c => c.id === l.contrato_id);
                          return { ...l, numeroContrato: c?.numero || "Geral" };
                        });
                        
                        lancsComContrato.sort((a, b) => a.numeroContrato.localeCompare(b.numeroContrato));
                        
                        return lancsComContrato.length > 0 ? (
                          <div className="overflow-x-auto rounded-md border border-slate-200">
                            <Table>
                              <TableHeader className="bg-slate-100">
                                <TableRow>
                                  <TableHead className="text-xs h-8 py-1">Contrato</TableHead>
                                  <TableHead className="text-xs h-8 py-1">Item / Descrição</TableHead>
                                  <TableHead className="text-xs h-8 py-1 text-right">Valor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {lancsComContrato.map((l, i) => (
                                  <TableRow key={l.id || i} className="h-8">
                                    <TableCell className="text-xs py-1 font-medium">{l.numeroContrato}</TableCell>
                                    <TableCell className="text-xs py-1 text-slate-600">{l.item_label || "Sem item especificado"}</TableCell>
                                    <TableCell className="text-xs py-1 text-right font-medium">{fmt(getValorFinal(l))}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Nenhum dado encontrado no mês.</div>
                        );
                      } else {
                        const grouped = lancsDetail.reduce((acc, l) => {
                          const label = l.item_label || "Geral / Sem item especificado";
                          acc[label] = (acc[label] || 0) + getValorFinal(l);
                          return acc;
                        }, {});

                        return Object.keys(grouped).length > 0 ? (
                          Object.entries(grouped).map(([label, valor]) => (
                            <div key={label} className="flex justify-between text-xs border-b pb-1 border-slate-200 last:border-0">
                              <span className="text-slate-600">{label}</span>
                              <span className="font-medium">{fmt(valor)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500">Nenhum dado encontrado para o agrupamento.</div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Subitem 3: Gauge/Pie e Descrição */}
              <div className="mt-6 flex flex-col items-center border-t pt-4">
                <h4 className="font-semibold text-sm mb-2 text-slate-700">Pago vs Orçado (Mês Selecionado)</h4>
                {selectedItem ? (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Valor (" + selectedItem.status + ")", value: selectedItem.valor_pago_final || 0 },
                            { name: "Restante Orçado/Mês", value: Math.max(0, (selectedItem.valor_orcado || 0) - (selectedItem.valor_pago_final || 0)) }
                          ]}
                          cx="50%" cy="100%" startAngle={180} endAngle={0}
                          innerRadius={60} outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 w-full p-3 bg-muted rounded-md border text-sm text-foreground/80">
                      <span className="font-semibold">Descrição do Item:</span> {selectedItem.descricao || 'Nenhuma descrição detalhada disponível.'}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 w-full p-3 bg-muted rounded-md border text-sm text-foreground/80 text-center">
                    Selecione um status num mês do gráfico acima para ver os detalhes da NF/OS
                  </div>
                )}
              </div>
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
                    <Bar dataKey="Orçado" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={40} />
                    <Line dataKey="Empenhado" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line dataKey="Pago" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400 text-center py-8">Cadastre orçamentos contratuais anuais para visualizar a evolução</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}