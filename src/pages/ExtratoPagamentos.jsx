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
  const [empenhos, setEmpenhos] = useState([]);
  const [orcamentosAnuais, setOrcamentosAnuais] = useState([]);
  const [user, setUser] = useState(null);
  
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("2026"); 
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
      const [resLanc, resCont, resEmp, resOrc] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list("-created_date", 2000),
        base44.entities.Contrato.list(),
        base44.entities.NotaEmpenho.list(),
        base44.entities.OrcamentoAnual.list()
      ]);
      setLancamentos(resLanc || []);
      setContratos(resCont || []);
      setEmpenhos(resEmp || []);
      setOrcamentosAnuais(resOrc || []);
    } catch (err) {
      toast.error("Erro ao sincronizar base de dados.");
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
      toast.success(`Status atualizado para ${novoStatus}`);
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
  const totalEmpenhadoNoAno = empenhos.filter(e => e.ano?.toString() === filtroAno && (filtroContrato === "todos" || e.contrato_id === filtroContrato)).reduce((acc, curr) => acc + (Number(curr.valor_total || curr.valor || 0)), 0);
  const totalPagoNoAno = lancamentos.filter(l => l.ano?.toString() === filtroAno && (filtroContrato === "todos" || l.contrato_id === filtroContrato) && l.status === "Pago").reduce((acc, curr) => acc + (Number(curr.valor_pago_final || curr.valor_liquido || curr.valor || 0)), 0);
  const saldoEmpenhoDisponivel = totalEmpenhadoNoAno - totalPagoNoAno;

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest text-lg">Atualizando Auditoria...</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-[#1a2e4a] tracking-tight uppercase leading-none">Extrato de Pagamentos</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">Fiscalização e Auditoria Orçamentária</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold py-8 px-10 text-base shadow-xl uppercase">
          <Download className="mr-3 h-6 w-6" /> RELATÓRIO CONSOLIDADO
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

      <Card className="bg-white border-none shadow-md ring-1 ring-black/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Contrato</Label>
            <Select value={filtroContrato} onValueChange={setFiltroContrato}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Contratos</SelectItem>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label className="font-black uppercase text-[#1a2e4a] text-xs">Ano</Label>
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
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Busca NF</Label>
            <div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
              <Input className="h-12 pl-10 bg-gray-50 border-gray-100 font-bold text-sm" placeholder="Pesquisar..." value={buscaNF} onChange={(e) => setBuscaNF(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xl overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="hover:bg-[#1a2e4a] border-none">
              <TableHead className="text-white font-black py-8 uppercase text-[10px]">NF / Emissão</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Contrato / Item</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Empresa Contratada</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Responsável por lançamento</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Status (Clique p/ alterar)</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Responsável / Data Alteração Status</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-[10px] px-12">Valor Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-40 text-gray-300 font-black uppercase text-lg italic">Nenhum dado encontrado para o filtro selecionado.</TableCell></TableRow>
            ) : (
              dadosFiltrados.map((l) => {
                const contrato = contratos.find(c => c.id === l.contrato_id);
                const valorExibido = Number(l.valor_pago_final || l.valor_liquido || l.valor || 0);
                
                return (
                  <TableRow key={l.id} className="hover:bg-blue-50/40 border-b border-gray-100 transition-all">
                    <TableCell className="py-9 px-8">
                      <div className="font-black text-[#1a2e4a] text-2xl">NF {l.numero_nf}</div>
                      <div className="text-[12px] text-gray-400 font-black uppercase flex items-center gap-1 mt-1"><Clock size={13}/> {l.data_nf}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-black text-blue-800 text-[11px] mb-1 uppercase bg-blue-50 px-2 py-0.5 rounded inline-block">
                        {contrato?.numero || "N/A"}
                      </div>
                      <div className="text-sm font-bold text-gray-600 uppercase block truncate max-w-[200px] leading-tight">{l.item_label}</div>
                    </TableCell>
                    
                    {/* SETA 1: Coluna Empresa Contratada */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-[12px] font-black text-[#1a2e4a] uppercase leading-tight">
                        <Building2 size={16} className="text-blue-500 flex-shrink-0" />
                        {contrato?.contratada || "Não Informada"}
                      </div>
                    </TableCell>

                    {/* Coluna Responsável por lançamento */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-[12px] font-black text-gray-700 uppercase">
                        <User size={15} className="text-gray-400 flex-shrink-0" /> 
                        {l.alterado_por || "Lançador Original"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                        ALT: {l.data_update ? new Date(l.data_update).toLocaleDateString('pt-BR') : "---"}
                      </div>
                    </TableCell>

                    {/* Coluna Status */}
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="focus:outline-none cursor-pointer">
                            <Badge className={`text-[11px] font-black uppercase px-6 py-2 shadow-lg transition-transform hover:scale-110 ${l.status === 'Pago' ? 'bg-green-600' : 'bg-[#1a2e4a]'}`}>
                              {l.status}
                            </Badge>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-2 bg-white shadow-2xl border-gray-200">
                          <div className="grid gap-1">
                            {STATUS_OPTIONS.map((status) => (
                              <button key={status} onClick={() => handleStatusChange(l.id, status)} className="w-full text-left px-4 py-2.5 text-[11px] font-black uppercase hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors">
                                {status}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    {/* SETA 2: Coluna Responsável / Data Alteração Status */}
                    <TableCell>
                      <div className="text-[12px] font-black text-gray-800 uppercase leading-tight">
                        {l.responsavel_alteracao_status || "Sem registro"}
                      </div>
                      <div className="text-[11px] text-gray-400 font-black uppercase mt-1 flex items-center gap-1 italic">
                        <History size={12}/> 
                        {l.data_ultima_alteracao_status ? new Date(l.data_ultima_alteracao_status).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </div>
                    </TableCell>

                    {/* Coluna Valor Pago */}
                    <TableCell className="text-right font-black text-[#1a2e4a] px-12">
                      <div className="text-[11px] text-gray-300 line-through font-bold mb-1 opacity-50">{formatBRL(l.valor)}</div>
                      <div className="text-3xl tracking-tighter">{formatBRL(valorExibido)}</div>
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