import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, CheckCircle2, Clock, PiggyBank, Filter, X } from "lucide-react";
import ContratoCard from "@/components/dashboard/ContratoCard";
import GraficoDashboardConsolidado from "@/components/dashboard/GraficoDashboardConsolidado";
import ContractFinancialOverview from "@/components/dashboard/ContractFinancialOverview";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Dashboard() {
  // Forced HMR update
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [orcamentosContratuais, setOrcamentosContratuais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("ativo");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [contratoSelecionado, setContratoSelecionado] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalContratos, setTotalContratos] = useState(0);
  const [totalContratosAtivos, setTotalContratosAtivos] = useState(0);
  const [listaContratosAtivos, setListaContratosAtivos] = useState([]);
  const itensPorPagina = 10;

  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);

  useEffect(() => {
    setLoading(true);
    const query = {};
    if (filtroStatus !== "todos") query.status = filtroStatus;
    
    const skip = (paginaAtual - 1) * itensPorPagina;
    const anoFiltro = parseInt(filtroAno);

    Promise.all([
      base44.entities.Contrato.filter(query, "-created_date", itensPorPagina, skip),
      contratoSelecionado === "todos" 
        ? base44.entities.LancamentoFinanceiro.filter({ ano: anoFiltro })
        : base44.entities.LancamentoFinanceiro.filter({ contrato_id: contratoSelecionado, ano: anoFiltro }),
      contratoSelecionado === "todos"
        ? base44.entities.NotaEmpenho.filter({ ano: anoFiltro })
        : base44.entities.NotaEmpenho.filter({ contrato_id: contratoSelecionado, ano: anoFiltro }),
      contratoSelecionado === "todos"
        ? base44.entities.OrcamentoContratualAnual.filter({ ano: anoFiltro })
        : base44.entities.OrcamentoContratualAnual.filter({ contrato_id: contratoSelecionado, ano: anoFiltro }),
    ])
      .then(([c, l, e, o]) => {
        setContratos(c);
        setLancamentos(l);
        setEmpenhos(e);
        setOrcamentosContratuais(o);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao carregar dados do Dashboard:", error);
        setLoading(false);
      });
  }, [filtroStatus, paginaAtual, contratoSelecionado, filtroAno]);

  useEffect(() => {
    const query = {};
    if (filtroStatus !== "todos") query.status = filtroStatus;
    
    Promise.all([
      base44.entities.Contrato.filter(query),
      base44.entities.Contrato.filter({ status: "ativo" }),
      base44.entities.LancamentoFinanceiro.list(),
      base44.entities.OrcamentoContratualAnual.list()
    ]).then(([todosContratos, contratosAtivos, todosLancamentos, todosOrcamentos]) => {
      setTotalContratos(todosContratos.length);
      setTotalContratosAtivos(contratosAtivos.length);
      setListaContratosAtivos(contratosAtivos);
      
      // Extrair anos únicos de lançamentos e orçamentos
      const anosLanc = todosLancamentos.map(l => l.ano).filter(Boolean);
      const anosOrc = todosOrcamentos.map(o => o.ano).filter(Boolean);
      const anosUnicos = [...new Set([...anosLanc, ...anosOrc])].sort((a, b) => b - a);
      setAnosDisponiveis(anosUnicos.map(String));
    });
  }, [filtroStatus]);

  const lancamentosBase = contratoSelecionado === "todos"
    ? lancamentos
    : lancamentos.filter(l => l.contrato_id === contratoSelecionado);

  const empenhosFiltrados = contratoSelecionado === "todos"
    ? empenhos
    : empenhos.filter(e => e.contrato_id === contratoSelecionado);

  const orcamentosContratuaisFiltrados = contratoSelecionado === "todos"
    ? orcamentosContratuais
    : orcamentosContratuais.filter(o => o.contrato_id === contratoSelecionado);

  const anoFiltro = parseInt(filtroAno);
  const lancamentosAno = lancamentosBase.filter(l => l.ano === anoFiltro);
  const totalPagoAno = lancamentosAno.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionadoAno = lancamentosAno.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmpenhado = empenhosFiltrados.filter(e => e.ano === anoFiltro).reduce((s, e) => s + (e.valor_total || 0), 0);

  const contratosFiltrados = filtroBusca
    ? contratos.filter(c =>
        c.numero?.toLowerCase().includes(filtroBusca.toLowerCase()) ||
        c.contratada?.toLowerCase().includes(filtroBusca.toLowerCase()) ||
        c.objeto?.toLowerCase().includes(filtroBusca.toLowerCase())
      )
    : contratos;

  const totalPaginas = Math.ceil(totalContratos / itensPorPagina);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-gray-500">Carregando...</div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Dashboard</h1>
          <p className="text-gray-500 text-sm">Gestão de contratos de manutenção</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
            <SelectTrigger className="h-8 text-xs w-64">
              <SelectValue placeholder="Todos os contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os contratos</SelectItem>
              {contratos.filter(c => c.status === "ativo").map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.numero} · {c.contratada?.substring(0, 25)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border-l-4 border-l-blue-500 cursor-help hover:bg-slate-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-500 font-medium">Contratos Ativos</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1a2e4a]">{totalContratosAtivos}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              align="start" 
              className="max-h-64 overflow-y-auto p-3 shadow-xl border border-slate-200 bg-white text-slate-900 z-[100]"
            >
              {listaContratosAtivos.length > 0 ? (
                <ul className="text-xs space-y-3">
                  {listaContratosAtivos.map(c => (
                    <li key={c.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0 flex flex-col gap-1">
                      <span className="font-bold text-slate-900 text-[13px]">{c.numero}</span>
                      <span className="text-slate-600 font-medium">{c.contratada}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-600 font-medium">Nenhum contrato ativo</div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 font-medium">Total Pago ({filtroAno})</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalPagoAno)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">Aprovisionado ({filtroAno})</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalProvisionadoAno)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500 font-medium">Empenhado ({filtroAno})</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalEmpenhado)}</div>
          </CardContent>
        </Card>
      </div>

      <GraficoDashboardConsolidado
        contratos={contratos}
        lancamentos={lancamentosBase}
        empenhos={empenhosFiltrados}
        orcamentosContratuais={orcamentosContratuaisFiltrados}
        contratoSelecionado={contratoSelecionado}
      />

      <div className="space-y-6 mt-8">
        <h2 className="text-xl font-bold text-[#1a2e4a] border-b pb-2">Quadros de Análise Financeira</h2>
        <div className="space-y-6">
          <ContractFinancialOverview title="Quadro Superior" defaultAno={anoAtual} />
          <ContractFinancialOverview title="Quadro Inferior" defaultAno={anoAtual} />
        </div>
      </div>

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
            onClick={() => {
              setFiltroStatus(s);
              setPaginaAtual(1);
            }}
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

      {totalPaginas > 1 && !filtroBusca && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
          >
            Anterior
          </Button>
          <div className="flex gap-1">
            {[...Array(totalPaginas)].map((_, i) => (
              <Button
                key={i + 1}
                variant={paginaAtual === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setPaginaAtual(i + 1)}
                className="w-9 h-9"
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}