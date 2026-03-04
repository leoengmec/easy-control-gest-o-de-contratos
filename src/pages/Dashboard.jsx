import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle2, Clock, PiggyBank, Filter, X } from "lucide-react";
import ContratoCard from "@/components/dashboard/ContratoCard";
import GraficoDashboardConsolidado from "@/components/dashboard/GraficoDashboardConsolidado";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Dashboard() {
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [orcamentosContratuais, setOrcamentosContratuais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("ativo");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [contratoSelecionado, setContratoSelecionado] = useState("todos");

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      base44.entities.Contrato.list(),
      base44.entities.LancamentoFinanceiro.list(),
      base44.entities.NotaEmpenho.list(),
      base44.entities.OrcamentoContratualAnual.filter({ ano: anoAtual }),
    ]).then(([c, l, e, o]) => {
      setContratos(c);
      setLancamentos(l);
      setEmpenhos(e);
      setOrcamentosContratuais(o);
      setLoading(false);
    });
  }, []);

  const contratosAtivos = contratos.filter(c => c.status === "ativo");
  const lancamentosAno = lancamentos.filter(l => l.ano === anoAtual);
  const totalPagoAno = lancamentosAno.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionadoAno = lancamentosAno.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmpenhado = empenhos.filter(e => e.ano === anoAtual).reduce((s, e) => s + (e.valor_total || 0), 0);

  const contratosFiltrados = contratos.filter(c => {
    const statusOk = filtroStatus === "todos" || c.status === filtroStatus;
    const buscaOk = !filtroBusca ||
      c.numero?.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      c.contratada?.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      c.objeto?.toLowerCase().includes(filtroBusca.toLowerCase());
    return statusOk && buscaOk;
  });

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-gray-500">Carregando...</div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2e4a]">Dashboard</h1>
        <p className="text-gray-500 text-sm">Gestão de contratos de manutenção · {anoAtual}</p>
      </div>

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
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalPagoAno)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">Aprovisionado ({anoAtual})</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalProvisionadoAno)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500 font-medium">Empenhado ({anoAtual})</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalEmpenhado)}</div>
          </CardContent>
        </Card>
      </div>

      <GraficoDashboardConsolidado
        contratos={contratos}
        lancamentos={lancamentos}
        empenhos={empenhos}
        orcamentosContratuais={orcamentosContratuais}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filtrar:</span>
        </div>
        {["ativo", "encerrado", "suspenso", "todos"].map(s => (
          <Button
            key={s}
            variant={filtroStatus === s ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 capitalize"
            onClick={() => setFiltroStatus(s)}
          >
            {s === "todos" ? "Todos" : s}
          </Button>
        ))}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar contrato..."
              className="w-full text-xs border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 h-7"
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
            />
            {filtroBusca && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setFiltroBusca("")}>
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400">{contratosFiltrados.length} contrato(s)</span>
      </div>

      <div className="space-y-4">
        {contratosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Nenhum contrato encontrado</div>
        )}
        {contratosFiltrados.map(contrato => {
          const orcamentoContratual = orcamentosContratuais.find(o => o.contrato_id === contrato.id);
          return (
            <ContratoCard
              key={contrato.id}
              contrato={contrato}
              lancamentos={lancamentos}
              empenhos={empenhos}
              orcamentoContratual={orcamentoContratual}
            />
          );
        })}
      </div>
    </div>
  );
}