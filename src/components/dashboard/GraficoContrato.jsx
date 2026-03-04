import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, LineChart, Line, ComposedChart, Area
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtK = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toFixed(0);
};

const MESES_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// Categorias padronizadas para o filtro (igual ao dashboard consolidado)
const CATEGORIAS_LABEL = [
  "MOR Natal",
  "MOR Mossoró",
  "Deslocamento Preventivo",
  "Deslocamento Corretivo",
  "Locações",
  "Serviços eventuais",
  "Fornecimento de Material",
];

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

export default function GraficoContrato({ contrato, lancamentos, empenhos, valorOrcado, valorFinanceiroNufip }) {
  const [itens, setItens] = useState([]);
  const [itensOrcados, setItensOrcados] = useState([]);
  const [abaGrafico, setAbaGrafico] = useState("mensal");
  const [itemSelecionado, setItemSelecionado] = useState("todos");

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano: anoAtual }),
    ]).then(([i, io]) => {
      setItens(i);
      setItensOrcados(io);
    });
  }, [contrato.id]);

  // Opções do filtro: categorias salvas em OrcamentoContratualItemAnual + fallback para itens do contrato
  const opcoesSelect = itensOrcados.length > 0
    ? itensOrcados.map(io => ({ id: io.item_label, label: io.item_label }))
    : itens.map(i => ({ id: i.id, label: i.nome }));

  // Filtra lançamentos pelo item selecionado
  const lancsFiltrados = itemSelecionado === "todos"
    ? lancamentos
    : lancamentos.filter(l => {
        // Tenta por item_label (categoria padronizada) ou item_contrato_id
        if (l.item_label === itemSelecionado) return true;
        if (l.item_contrato_id === itemSelecionado) return true;
        // Para MOR Natal/Mossoró, agrupa lançamentos cujo item_label contenha o texto
        if (itemSelecionado.startsWith("MOR") && l.item_label?.includes(itemSelecionado)) return true;
        return false;
      });

  // Valor máximo do item (para ReferenceLine)
  const valorMaxItem = (() => {
    if (itemSelecionado === "todos") {
      return valorFinanceiroNufip > 0 ? valorFinanceiroNufip : valorOrcado;
    }
    // Busca no orçamento salvo por item_label
    const orcadoItem = itensOrcados.find(io => io.item_label === itemSelecionado);
    if (orcadoItem) return orcadoItem.valor_orcado;
    // Fallback: busca pelo id do item
    const orcadoById = itensOrcados.find(io => io.item_contrato_id === itemSelecionado);
    if (orcadoById) return orcadoById.valor_orcado;
    const itemData = itens.find(i => i.id === itemSelecionado);
    return itemData?.valor_total_contratado || 0;
  })();

  // Dados mensais: Orçado (distribuído), Pago, Aprovisionado, Em instrução
  const dadosMensais = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const orcadoMes = valorMaxItem > 0 ? valorMaxItem / 12 : 0;
    const pago = lancsFiltrados.filter(l => l.mes === m && l.ano === anoAtual && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovisionado = lancsFiltrados.filter(l => l.mes === m && l.ano === anoAtual && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const emInstrucao = lancsFiltrados.filter(l => l.mes === m && l.ano === anoAtual && ["Em instrução","Em execução","SOF"].includes(l.status)).reduce((s, l) => s + (l.valor || 0), 0);
    return { name, "Orçado/Mês": orcadoMes, Pago: pago, Aprovisionado: aprovisionado, "Em instrução": emInstrucao };
  });

  // Acumulado ao longo do ano (para gráfico de linha)
  const dadosAcumulados = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const pagoAcum = lancsFiltrados.filter(l => l.mes <= m && l.ano === anoAtual && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovAcum = lancsFiltrados.filter(l => l.mes <= m && l.ano === anoAtual && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    const orcadoAcum = valorMaxItem > 0 ? valorMaxItem * (m / 12) : 0;
    return { name, "Realizado (acum.)": pagoAcum, "Realizado + Aprovisionado": pagoAcum + aprovAcum, "Orçado (acum.)": orcadoAcum };
  });

  // Dados por item (comparativo Contratado x Orçado x Realizado)
  const dadosPorItem = (() => {
    const labelsItens = [...new Set([
      ...itens.map(i => ({ id: i.id, label: i.nome })),
      ...itensOrcados.map(io => ({ id: io.item_contrato_id, label: io.item_label }))
    ].map(x => x.label))];

    return labelsItens.map(label => {
      const item = itens.find(i => i.nome === label);
      const orcadoItem = itensOrcados.find(io => io.item_label === label || io.item_contrato_id === item?.id);
      const lancsItem = lancamentos.filter(l =>
        l.ano === anoAtual && (l.item_label === label || l.item_contrato_id === item?.id)
      );
      const pago = lancsItem.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
      const aprovisionado = lancsItem.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
      const contratadoAnual = item?.valor_total_contratado || 0;
      const orcadoAnual = orcadoItem?.valor_orcado || 0;
      return {
        name: label?.length > 22 ? label.substring(0, 22) + "…" : label,
        nomeCompleto: label,
        "Contratado (anual)": contratadoAnual,
        "Orçado (JFRN)": orcadoAnual,
        Pago: pago,
        Aprovisionado: aprovisionado,
        max: Math.max(contratadoAnual, orcadoAnual)
      };
    });
  })();

  // Comparativo geral
  const totalEmpenhado = empenhos.reduce((s, e) => s + (e.valor_total || 0), 0);
  const totalPago = lancamentos.filter(l => l.ano === anoAtual && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalAprov = lancamentos.filter(l => l.ano === anoAtual && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const dadosComparativos = [
    { name: "Valor Global", Valor: contrato.valor_global || 0 },
    { name: "Empenhado", Valor: totalEmpenhado },
    { name: "Orçado JFRN", Valor: valorOrcado },
    { name: "Financeiro NUFIP", Valor: valorFinanceiroNufip || 0 },
    { name: "Pago", Valor: totalPago },
    { name: "Aprovisionado", Valor: totalAprov },
  ].filter(d => d.Valor > 0);

  const CORES_COMP = ["#3b82f6","#f59e0b","#22c55e","#a855f7","#10b981","#f97316"];

  const abas = [
    { key: "mensal", label: "Mensal" },
    { key: "acumulado", label: "Acumulado" },
    { key: "itens", label: "Por Item" },
    { key: "comparativo", label: "Comparativo" },
  ];

  return (
    <div className="border-t pt-4 space-y-3">
      {/* Controles */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
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
        {(abaGrafico === "mensal" || abaGrafico === "acumulado") && itens.length > 0 && (
          <Select value={itemSelecionado} onValueChange={setItemSelecionado}>
            <SelectTrigger className="h-7 text-xs w-48">
              <SelectValue placeholder="Filtrar por item" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os itens</SelectItem>
              {itens.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.nome?.length > 30 ? item.nome.substring(0, 30) + "…" : item.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Gráfico Mensal - Barras com ReferenceLine */}
      {abaGrafico === "mensal" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-between">
            <span>Pagamentos por Mês · {anoAtual}</span>
            {valorMaxItem > 0 && (
              <span className="text-red-500 font-semibold">
                — Máximo: {fmt(valorMaxItem / 12)}/mês
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={dadosMensais} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {valorMaxItem > 0 && (
                <ReferenceLine y={valorMaxItem / 12} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: `Máx/mês`, position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
              )}
              <Bar dataKey="Pago" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={30} />
              <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={30} />
              <Bar dataKey="Em instrução" fill="#93c5fd" radius={[3,3,0,0]} maxBarSize={30} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico Acumulado - Linha */}
      {abaGrafico === "acumulado" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-between">
            <span>Realizado Acumulado vs. Orçado · {anoAtual}</span>
            {valorMaxItem > 0 && (
              <span className="text-purple-500 font-semibold">Teto: {fmt(valorMaxItem)}</span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={dadosAcumulados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {valorMaxItem > 0 && (
                <ReferenceLine y={valorMaxItem} stroke="#a855f7" strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: "Teto", position: "insideTopRight", fontSize: 9, fill: "#a855f7" }} />
              )}
              <Area dataKey="Orçado (acum.)" fill="#dbeafe" stroke="#3b82f6" strokeWidth={1.5} dot={false} fillOpacity={0.4} />
              <Line dataKey="Realizado (acum.)" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line dataKey="Realizado + Aprovisionado" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico Por Item - Contratado x Orçado x Realizado */}
      {abaGrafico === "itens" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium">Contratado × Orçado × Realizado por Item · {anoAtual}</div>
          {dadosPorItem.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, dadosPorItem.length * 50)}>
              <BarChart data={dadosPorItem} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Contratado (anual)" fill="#3b82f6" radius={[0,3,3,0]} maxBarSize={14} />
                <Bar dataKey="Orçado (JFRN)" fill="#22c55e" radius={[0,3,3,0]} maxBarSize={14} />
                <Bar dataKey="Pago" fill="#10b981" radius={[0,3,3,0]} maxBarSize={14} />
                <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[0,3,3,0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">Nenhum dado encontrado</div>
          )}
        </div>
      )}

      {/* Gráfico Comparativo */}
      {abaGrafico === "comparativo" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium">Comparativo Geral de Valores · {anoAtual}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosComparativos} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Valor" radius={[4,4,0,0]} maxBarSize={50}>
                {dadosComparativos.map((_, i) => (
                  <rect key={i} fill={CORES_COMP[i % CORES_COMP.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {dadosComparativos.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CORES_COMP[i % CORES_COMP.length] }} />
                <span className="text-gray-500 truncate">{d.name}:</span>
                <span className="font-semibold text-gray-800 shrink-0">{fmt(d.Valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}