import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const MESES_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function GraficoContrato({ contrato, lancamentos, empenhos, valorOrcado, valorFinanceiroNufip }) {
  const [itens, setItens] = useState([]);
  const [abaGrafico, setAbaGrafico] = useState("mensal"); // mensal | fixo | demanda | comparativo
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [tipoServico, setTipoServico] = useState("todos"); // todos | fixo | por_demanda

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    base44.entities.ItemContrato.filter({ contrato_id: contrato.id }).then(setItens);
  }, [contrato.id]);

  // Gráfico mensal (pagamentos vs aprovisionados por mês)
  const dadosMensais = MESES_LABELS.map((name, i) => {
    const m = i + 1;
    const pago = lancamentos.filter(l => l.mes === m && l.ano === anoAtual && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovisionado = lancamentos.filter(l => l.mes === m && l.ano === anoAtual && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    return { name, Pago: pago, Aprovisionado: aprovisionado };
  });

  // Itens fixos e por demanda
  const itensFixos = itens.filter(i => i.grupo_servico === "fixo");
  const itensDemanda = itens.filter(i => i.grupo_servico === "por_demanda");

  const toggleItem = (itemId) => {
    setItensSelecionados(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Gráfico por itens selecionados (ou todos se nenhum selecionado)
  const itensParaGrafico = itensSelecionados.length > 0
    ? itens.filter(i => itensSelecionados.includes(i.id))
    : (tipoServico === "fixo" ? itensFixos : tipoServico === "por_demanda" ? itensDemanda : itens);

  const dadosPorItem = itensParaGrafico.map(item => {
    const pago = lancamentos.filter(l => l.item_contrato_id === item.id && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const aprovisionado = lancamentos.filter(l => l.item_contrato_id === item.id && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    return {
      name: item.nome?.length > 20 ? item.nome.substring(0, 20) + "..." : item.nome,
      nomeCompleto: item.nome,
      Pago: pago,
      Aprovisionado: aprovisionado
    };
  });

  // Gráfico comparativo de valores previsto
  const totalEmpenhado = empenhos.reduce((s, e) => s + (e.valor_total || 0), 0);
  const dadosComparativos = [
    { name: "Contrato Vigente", Valor: contrato.valor_global || 0, fill: "#3b82f6" },
    { name: "Empenhado", Valor: totalEmpenhado, fill: "#f59e0b" },
    { name: "Orçado JFRN", Valor: valorOrcado || 0, fill: "#22c55e" },
    { name: "Financeiro NUFIP", Valor: valorFinanceiroNufip || 0, fill: "#a855f7" },
  ];

  const abas = [
    { key: "mensal", label: "Mensal" },
    { key: "itens", label: "Por Serviço" },
    { key: "comparativo", label: "Comparativo" },
  ];

  return (
    <div className="border-t pt-4">
      {/* Abas de gráficos */}
      <div className="flex gap-1 mb-4 flex-wrap">
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

      {/* Gráfico Mensal */}
      {abaGrafico === "mensal" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium">Pagamentos vs Aprovisionados por Mês ({anoAtual})</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosMensais} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Pago" fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico Por Serviço */}
      {abaGrafico === "itens" && (
        <div>
          <div className="flex gap-1 mb-3 flex-wrap items-center">
            <span className="text-xs text-gray-500 mr-1">Filtrar:</span>
            {["todos", "fixo", "por_demanda"].map(t => (
              <Button
                key={t}
                variant={tipoServico === t ? "default" : "outline"}
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => { setTipoServico(t); setItensSelecionados([]); }}
              >
                {t === "todos" ? "Todos" : t === "fixo" ? "Serviço Fixo" : "Por Demanda"}
              </Button>
            ))}
          </div>

          {/* Seletor de itens */}
          {itensParaGrafico.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {(tipoServico === "todos" ? itens : tipoServico === "fixo" ? itensFixos : itensDemanda).map(item => (
                <Badge
                  key={item.id}
                  variant={itensSelecionados.includes(item.id) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleItem(item.id)}
                >
                  {item.nome?.length > 25 ? item.nome.substring(0, 25) + "..." : item.nome}
                </Badge>
              ))}
            </div>
          )}

          {dadosPorItem.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosPorItem} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(_, payload) => payload?.[0]?.payload?.nomeCompleto || ""} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pago" fill="#22c55e" radius={[0,3,3,0]} />
                <Bar dataKey="Aprovisionado" fill="#f59e0b" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">Nenhum lançamento encontrado para os itens selecionados</div>
          )}
        </div>
      )}

      {/* Gráfico Comparativo */}
      {abaGrafico === "comparativo" && (
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium">Comparativo de Valores ({anoAtual})</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosComparativos} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="Valor" radius={[3,3,0,0]} fill="#3b82f6">
                {dadosComparativos.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {dadosComparativos.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                <span className="text-gray-500">{d.name}:</span>
                <span className="font-semibold">{fmt(d.Valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}