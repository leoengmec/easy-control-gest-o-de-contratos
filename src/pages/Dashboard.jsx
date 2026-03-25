import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext"; // ✅ Injeção do Contexto
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle2, Clock, PiggyBank, Filter, X, AlertTriangle } from "lucide-react";
import ContratoCard from "@/components/dashboard/ContratoCard";
import GraficoDashboardConsolidado from "@/components/dashboard/GraficoDashboardConsolidado";
import ContractFinancialOverview from "@/components/dashboard/ContractFinancialOverview";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Dashboard() {
  const { user } = useAuth(); // ✅ Pegando dados do Leonardo ou outro usuário
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [orcamentosContratuais, setOrcamentosContratuais] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("ativo");
  const [filtroAlertaCritico, setFiltroAlertaCritico] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState("");
  const [contratoSelecionado, setContratoSelecionado] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalContratos, setTotalContratos] = useState(0);
  const [totalContratosAtivos, setTotalContratosAtivos] = useState(0);
  const itensPorPagina = 10;

  const anoAtual = new Date().getFullYear();
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);

  // 🔄 Efeito de Carga de Dados (Otimizado)
  useEffect(() => {
    setLoading(true);
    const queryContrato = {};
    if (filtroStatus !== "todos") queryContrato.status = filtroStatus;
    
    // ✅ Regra de Negócio: Se não for Admin, talvez filtrar apenas contratos do usuário
    // if (user?.perfil !== "Administrador") queryContrato.responsavel_id = user?.usuario_id;

    const skip = (paginaAtual - 1) * itensPorPagina;
    const anoFiltro = parseInt(filtroAno);

    const queryFinanceira = { ano: anoFiltro };
    if (contratoSelecionado !== "todos") queryFinanceira.contrato_id = contratoSelecionado;

    Promise.all([
      base44.entities.Contrato.filter(queryContrato, "-created_date", itensPorPagina, skip),
      base44.entities.LancamentoFinanceiro.filter(queryFinanceira),
      base44.entities.NotaEmpenho.filter(queryFinanceira),
      base44.entities.OrcamentoContratualAnual.filter(queryFinanceira),
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
  }, [filtroStatus, paginaAtual, contratoSelecionado, filtroAno, user]);

  // 📊 Efeito para Totais e Metadados
  useEffect(() => {
    const query = {};
    if (filtroStatus !== "todos") query.status = filtroStatus;
    
    Promise.all([
      base44.entities.Contrato.filter(query),
      base44.entities.Contrato.filter({ status: "ativo" }),
      base44.entities.LancamentoFinanceiro.list(), 
      base44.entities.OrcamentoContratualAnual.list(),
      base44.entities.LogAuditoria.list()
    ]).then(([todosContratos, contratosAtivos, todosLancamentos, todosOrcamentos, todosLogs]) => {
      setTotalContratos(todosContratos.length);
      setTotalContratosAtivos(contratosAtivos.length);
      setLogs(todosLogs || []);
      
      const anosUnicos = [...new Set([...todosLancamentos.map(l => l.ano), ...todosOrcamentos.map(o => o.ano)])]
        .filter(Boolean)
        .sort((a, b) => b - a);
      setAnosDisponiveis(anosUnicos.map(String).length > 0 ? anosUnicos.map(String) : [String(anoAtual)]);
    });
  }, [filtroStatus]);

  // 🧮 Lógica de Cálculos (Mantida a sua original, agora com dados filtrados)
  const anoFiltro = parseInt(filtroAno);
  const lancamentosAno = lancamentos.filter(l => l.ano === anoFiltro);
  const totalPagoAno = lancamentosAno.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionadoAno = lancamentosAno.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmpenhado = empenhos.reduce((s, e) => s + (e.valor_total || 0), 0);

  const contratosComEstouroIds = logs.filter(l => l.valor_posterior < 0).map(log => {
    const lanc = lancamentos.find(l => l.id === log.entidade_id);
    return lanc ? lanc.contrato_id : null;
  }).filter(Boolean);
  const totalAlertasCriticos = [...new Set(contratosComEstouroIds)].length;

  let contratosFiltrados = contratos;
  if (filtroBusca) {
    contratosFiltrados = contratosFiltrados.filter(c =>
      c.numero?.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      c.contratada?.toLowerCase().includes(filtroBusca.toLowerCase())
    );
  }
  if (filtroAlertaCritico) {
    contratosFiltrados = contratosFiltrados.filter(c => contratosComEstouroIds.includes(c.id));
  }

  const totalPaginas = Math.ceil(totalContratos / itensPorPagina);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-96">
       <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Olá, {user?.nome?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm">Acompanhe a saúde dos seus contratos de manutenção</p>
        </div>
        
        {/* Filtros de Ano e Contrato */}
        <div className="sm:ml-auto flex gap-2">
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
            <SelectTrigger className="h-8 text-xs w-64">
              <SelectValue placeholder="Todos os contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os contratos</SelectItem>
              {contratos.filter(c => c.status === "ativo").map(c => (
                <SelectItem key={c.id} value={c.id}>{c.numero} · {c.contratada?.substring(0, 20)}...</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card de Alerta - Apenas Administradores ou Gestores veem o destaque em vermelho */}
        <Card 
          className={`border-l-4 border-l-red-500 cursor-pointer transition-all ${filtroAlertaCritico ? 'ring-2 ring-red-400 bg-red-50' : 'hover:bg-red-50'}`}
          onClick={() => setFiltroAlertaCritico(!filtroAlertaCritico)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500 font-medium">Alertas Críticos</span>
            </div>
            <div className="text-2xl font-bold text-[#1a2e4a]">{totalAlertasCriticos}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Contratos Ativos</span>
            </div>
            <div className="text-2xl font-bold text-[#1a2e4a]">{totalContratosAtivos}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 font-medium">Total Pago</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalPagoAno)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">Aprovisionado</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalProvisionadoAno)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500 font-medium">Empenhado</span>
            </div>
            <div className="text-base font-bold text-[#1a2e4a]">{fmt(totalEmpenhado)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Consolidados */}
      <GraficoDashboardConsolidado
        contratos={contratos}
        lancamentos={lancamentos}
        empenhos={empenhos}
        orcamentosContratuais={orcamentosContratuais}
        contratoSelecionado={contratoSelecionado}
      />

      {/* Listagem de Contratos */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 font-medium">Filtros de Tabela:</span>
        </div>
        {["ativo", "encerrado", "todos"].map(s => (
          <Button
            key={s}
            variant={filtroStatus === s ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 capitalize"
            onClick={() => setFiltroStatus(s)}
          >
            {s}
          </Button>
        ))}
        <div className="relative ml-auto w-64">
          <input
            type="text"
            placeholder="Buscar por número ou empresa..."
            className="w-full text-xs border rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400"
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {contratosFiltrados.map(contrato => (
          <ContratoCard
            key={contrato.id}
            contrato={contrato}
            lancamentos={lancamentos}
            empenhos={empenhos}
            orcamentoContratual={orcamentosContratuais.find(o => o.contrato_id === contrato.id)}
          />
        ))}
      </div>
    </div>
  );
}