import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText, DollarSign, TrendingUp, AlertTriangle,
  ArrowRight, PiggyBank, CheckCircle2, Clock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Dashboard() {
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      base44.entities.Contrato.list(),
      base44.entities.LancamentoFinanceiro.filter({ ano: anoAtual }),
      base44.entities.OrcamentoAnual.filter({ ano: anoAtual })
    ]).then(([c, l, o]) => {
      setContratos(c);
      setLancamentos(l);
      setOrcamento(o[0] || null);
      setLoading(false);
    });
  }, []);

  const contratosAtivos = contratos.filter(c => c.status === "ativo");
  const totalPago = lancamentos.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionado = lancamentos.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmpenhos = lancamentos.filter(l => l.nota_empenho_id && l.status !== "Cancelado").reduce((s, l) => s + (l.valor || 0), 0);
  const dotacaoAtual = orcamento?.valor_dotacao_atual || 0;
  const saldoDisponivel = dotacaoAtual - totalEmpenhos;

  // Dados por mês para gráfico
  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const pago = lancamentos.filter(l => l.mes === m && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
    const provisao = lancamentos.filter(l => l.mes === m && l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
    return {
      name: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i],
      Pago: pago,
      Provisionado: provisao
    };
  });

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-gray-500">Carregando...</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2e4a]">Dashboard</h1>
        <p className="text-gray-500 text-sm">Visão geral dos contratos de manutenção · {anoAtual}</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Contratos Ativos</span>
            </div>
            <div className="text-2xl font-bold text-[#1a2e4a]">{contratosAtivos.length}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 font-medium">Total Pago ({anoAtual})</span>
            </div>
            <div className="text-lg font-bold text-[#1a2e4a]">{fmt(totalPago)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">Provisionado</span>
            </div>
            <div className="text-lg font-bold text-[#1a2e4a]">{fmt(totalProvisionado)}</div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${saldoDisponivel < 0 ? "border-l-red-500" : "border-l-purple-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className={`w-4 h-4 ${saldoDisponivel < 0 ? "text-red-500" : "text-purple-500"}`} />
              <span className="text-xs text-gray-500 font-medium">Saldo Disponível</span>
            </div>
            <div className={`text-lg font-bold ${saldoDisponivel < 0 ? "text-red-600" : "text-[#1a2e4a]"}`}>{fmt(saldoDisponivel)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orçamento resumo */}
      {orcamento && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium mb-1">Orçamento {anoAtual}</div>
                <div className="text-sm">
                  <span className="text-gray-500">Dotação inicial: </span>
                  <span className="font-semibold">{fmt(orcamento.valor_dotacao_inicial)}</span>
                  {orcamento.valor_dotacao_atual !== orcamento.valor_dotacao_inicial && (
                    <span className="ml-3 text-gray-500">Dotação atual: <span className="font-semibold text-blue-600">{fmt(orcamento.valor_dotacao_atual)}</span></span>
                  )}
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Empenhado: </span>
                  <span className="font-semibold text-amber-600">{fmt(totalEmpenhos)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Utilizado: </span>
                  <span className="font-semibold">{dotacaoAtual > 0 ? ((totalPago / dotacaoAtual) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(100, dotacaoAtual > 0 ? (totalPago / dotacaoAtual) * 100 : 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gráfico mensal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#1a2e4a]">Pagamentos vs Provisões por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={meses} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Pago" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="Provisionado" fill="#f59e0b" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de contratos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2e4a]">Contratos Ativos</CardTitle>
              <Link to={createPageUrl("Contratos")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {contratosAtivos.length === 0 && <div className="text-sm text-gray-400 text-center py-4">Nenhum contrato ativo</div>}
            {contratosAtivos.slice(0, 5).map(c => {
              const pago = lancamentos.filter(l => l.contrato_id === c.id && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
              const pct = c.valor_global > 0 ? (pago / c.valor_global) * 100 : 0;
              return (
                <div key={c.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1a2e4a] truncate">{c.numero} · {c.contratada}</div>
                      <div className="text-xs text-gray-500 truncate">{c.objeto}</div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200 text-xs shrink-0">ativo</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Pago: {fmt(pago)} / {fmt(c.valor_global)}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}