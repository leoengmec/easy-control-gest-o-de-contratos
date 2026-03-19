import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, Download, Clock, User, Landmark, TrendingUp, AlertCircle, History, Building2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

export default function ExtratoPagamentos() {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [aditivos, setAditivos] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [orcamentosAnuais, setOrcamentosAnuais] = useState([]);
  const [user, setUser] = useState(null);
  
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroVigencia, setFiltroVigencia] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("2025"); 
  const [filtroMes, setFiltroMes] = useState("0"); 
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [buscaNF, setBuscaNF] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [resLanc, resCont, resAdit, resEmp, resOrc] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list("-created_date", 2000),
        base44.entities.Contrato.list(),
        base44.entities.Aditivo.list(),
        base44.entities.NotaEmpenho.list(),
        base44.entities.OrcamentoAnual.list()
      ]);
      setLancamentos(resLanc || []);
      setContratos(resCont || []);
      setAditivos(resAdit || []);
      setEmpenhos(resEmp || []);
      setOrcamentosAnuais(resOrc || []);
    } catch (err) {
      toast.error("Erro ao sincronizar dados orçamentários.");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await base44.entities.LancamentoFinanceiro.update(id, { 
        status: novoStatus,
        data_ultima_alteracao_status: new Date().toISOString(),
        responsavel_alteracao_status: user?.full_name || "Sistema"
      });
      toast.success(`Status: ${novoStatus}`);
      carregarDados();
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const dadosFiltrados = (lancamentos || []).filter(l => {
    const matchContrato = filtroContrato === "todos" || l.contrato_id === filtroContrato;
    const matchAno = l.ano?.toString() === filtroAno;
    const matchMes = filtroMes === "0" || l.mes?.toString() === filtroMes;
    const matchStatus = filtroStatus === "Todos" || l.status === filtroStatus;
    const matchNF = !buscaNF || (l.numero_nf?.toLowerCase().includes(buscaNF.toLowerCase()));
    return matchContrato && matchAno && matchMes && matchStatus && matchNF;
  });

  const orcamentoDoAno = orcamentosAnuais.find(o => o.ano?.toString() === filtroAno);
  const valorOrcadoGlobal = Number(orcamentoDoAno?.valor_dotacao_atual || orcamentoDoAno?.valor_dotacao_inicial || 0);
  const totalEmpenhadoNoAno = empenhos.filter(e => e.ano?.toString() === filtroAno && (filtroContrato === "todos" || e.contrato_id === filtroContrato)).reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);
  const totalPagoNoAno = lancamentos.filter(l => l.ano?.toString() === filtroAno && (filtroContrato === "todos" || l.contrato_id === filtroContrato) && l.status === "Pago").reduce((acc, curr) => acc + (Number(curr.valor_pago_final) || 0), 0);
  const saldoEmpenhoDisponivel = totalEmpenhadoNoAno - totalPagoNoAno;

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest">Processando Auditoria...</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10">
      {/* Cabeçalho e Cards de Orçamento Omitidos para brevidade, mas mantidos no código final */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-[#1a2e4a] tracking-tight uppercase">Extrato de Pagamentos</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Controle Orçamentário e Auditoria</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold py-8 px-10 text-base shadow-xl uppercase">
          <Download className="mr-3 h-6 w-6" /> Relatório Consolidado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-t-8 border-t-slate-400 shadow-xl bg-white">
          <CardHeader className="pb-1 text-slate-500 text-[11px] font-black uppercase flex items-center gap-2"><Landmark size={14}/> Orçado Anual {filtroAno}</CardHeader>
          <CardContent><div className="text-2xl font-black text-slate-700">{formatBRL(valorOrcadoGlobal)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-orange-500 shadow-xl bg-white">
          <CardHeader className="pb-1 text-orange-600 text-[11px] font-black uppercase flex items-center gap-2"><TrendingUp size={14}/> Empenhado</CardHeader>
          <CardContent><div className="text-2xl font-black text-orange-700">{formatBRL(totalEmpenhadoNoAno)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-green-600 shadow-xl bg-white">
          <CardHeader className="pb-1 text-green-600 text-[11px] font-black uppercase">Executado (Pago)</CardHeader>
          <CardContent><div className="text-2xl font-black text-green-800">{formatBRL(totalPagoNoAno)}</div></CardContent>
        </Card>
        <Card className={`border-t-8 shadow-xl bg-white ${saldoEmpenhoDisponivel < 0 ? 'border-t-red-600' : 'border-t-blue-600'}`}>
          <CardHeader className="pb-1 text-blue-600 text-[11px] font-black uppercase flex items-center gap-2"><AlertCircle size={14}/> Saldo de Empenho</CardHeader>
          <CardContent><div className="text-2xl font-black text-blue-900">{formatBRL(saldoEmpenhoDisponivel)}</div></CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-white border-none shadow-md ring-1 ring-black/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Contrato</Label>
            <Select value={filtroContrato} onValueChange={setFiltroContrato}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-28"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Ano</Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm text-blue-600"><SelectValue /></SelectTrigger>
              <SelectContent>{["2022", "2023", "2024", "2025", "2026"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Mês</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{mesesNomes.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Busca NF</Label>
            <div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
              <Input className="h-12 pl-10 bg-gray-50 border-gray-100 font-bold text-sm" placeholder="Pesquisar..." value={buscaNF} onChange={e => setBuscaNF(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabela Refatorada conforme solicitado */}
      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="hover:bg-[#1a2e4a] border-none">
              <TableHead className="text-white font-black py-7 uppercase text-[10px]">NF / Emissão</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Contrato / Item</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Empresa Contratada</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Responsável por lançamento</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Status (Clique p/ alterar)</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Responsável/Data Alteração Status</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-[10px] px-10">Valor Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-40 text-gray-300 font-black uppercase text-lg">Troque o filtro de Ano para visualizar o histórico</TableCell></TableRow>
            ) : (
              dadosFiltrados.map((l) => {
                const contrato = contratos.find(c => c.id === l.contrato_id);
                return (
                  <TableRow key={l.id} className="hover:bg-blue-50/40 border-b border-gray-100">
                    <TableCell className="py-8 px-6">
                      <div className="font-black text-[#1a2e4a] text-xl">NF {l.numero_nf}</div>
                      <div className="text-[11px] text-gray-400 font-black uppercase flex items-center gap-1"><Clock size={12}/> {l.data_nf}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-black text-blue-800 text-[10px] mb-1 uppercase bg-blue-50 px-2 py-0.5 rounded inline-block">
                        {contrato?.numero || "---"}
                      </div>
                      <div className="text-sm font-bold text-gray-600 uppercase block truncate max-w-[200px]">{l.item_label}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-black text-[#1a2e4a] uppercase">
                        <Building2 size={14} className="text-blue-500" />
                        {contrato?.contratada || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                        <User size={14} className="text-gray-400" /> 
                        {l.alterado_por || "Lançador Original"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="focus:outline-none cursor-pointer">
                            <Badge className={`text-[10px] font-black uppercase px-4 py-2 shadow-lg transition-transform hover:scale-105 ${l.status === 'Pago' ? 'bg-green-600' : 'bg-[#1a2e4a]'}`}>
                              {l.status}
                            </Badge>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 bg-white shadow-2xl border-gray-200">
                          {STATUS_OPTIONS.map((status) => (
                            <button key={status} onClick={() => handleStatusChange(l.id, status)} className="w-full text-left px-4 py-2 text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">
                              {status}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-black text-gray-700 uppercase">
                        {l.responsavel_alteracao_status || "Sem alteração"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-black uppercase mt-1 flex items-center gap-1">
                        <History size={11}/> 
                        {l.data_ultima_alteracao_status ? new Date(l.data_ultima_alteracao_status).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "---"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-[#1a2e4a] px-10">
                      <div className="text-xs text-gray-300 line-through font-bold">{formatBRL(l.valor)}</div>
                      <div className="text-2xl">{formatBRL(l.valor_pago_final)}</div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}