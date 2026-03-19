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
import { Loader2, Search, Download, FilterX, Clock, User, Landmark, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

export default function ExtratoPagamentos() {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [vigencias, setVigencias] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [user, setUser] = useState(null);
  
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroVigencia, setFiltroVigencia] = useState("todos");
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
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
      const [resLanc, resCont, resVig, resOrc] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list("-created_date", 2000).catch(() => []),
        base44.entities.Contrato.list().catch(() => []),
        base44.entities.Aditivo.list().catch(() => []),
        base44.entities.OrcamentoAnual.list().catch(() => [])
      ]);
      
      setLancamentos(resLanc || []);
      setContratos(resCont || []);
      setVigencias(resVig || []);
      setOrcamentos(resOrc || []);
    } catch (err) {
      toast.error("Erro ao sincronizar base de dados.");
    } finally {
      setLoading(false);
    }
  }

  // FUNÇÃO DE MÁSCARA MONETÁRIA (1 -> 0,01)
  const formatCurrencyInput = (value) => {
    const digits = value.replace(/\D/g, "");
    const numberValue = Number(digits) / 100;
    return numberValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await base44.entities.LancamentoFinanceiro.update(id, { 
        status: novoStatus,
        data_ultima_alteracao_status: new Date().toISOString(),
        alterado_por: user?.full_name || "Sistema"
      });
      toast.success("Status atualizado");
      carregarDados();
    } catch (err) {
      toast.error("Erro na atualização");
    }
  };

  const dadosFiltrados = (lancamentos || []).filter(l => {
    if (!l) return false;
    const matchContrato = filtroContrato === "todos" || l.contrato_id === filtroContrato;
    const matchVigencia = filtroVigencia === "todos" || l.vigencia_id === filtroVigencia;
    const matchAno = l.ano?.toString() === filtroAno;
    const matchMes = filtroMes === "0" || l.mes?.toString() === filtroMes;
    const matchStatus = filtroStatus === "Todos" || l.status === filtroStatus;
    const matchNF = !buscaNF || (l.numero_nf && l.numero_nf.toLowerCase().includes(buscaNF.toLowerCase()));
    return matchContrato && matchVigencia && matchAno && matchMes && matchStatus && matchNF;
  });

  const orcamentoAno = (orcamentos || []).find(o => o.ano?.toString() === filtroAno && (filtroContrato === "todos" || o.contrato_id === filtroContrato));
  const valorOrcado = Number(orcamentoAno?.valor_orcado || orcamentoAno?.valor_dotacao_inicial || 0);
  const valorEmpenhado = Number(orcamentoAno?.valor_empenhado || orcamentoAno?.valor_dotacao_atual || 0);

  const totalBruto = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalLiquido = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.valor_pago_final) || 0), 0);
  const totalGlosas = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.glosa) || 0), 0);
  const saldoEmpenho = valorEmpenhado - totalLiquido;

  const formatBRL = (v) => {
    const value = Number(v) || 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest text-lg">Atualizando Valores...</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10 text-base">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] tracking-tight uppercase">Extrato de Pagamentos</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Gestão Financeira e Orçamentária JFRN</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold py-6 px-8 text-sm uppercase">
          <Download className="mr-3 h-5 w-5" /> Exportar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-t-8 border-t-slate-400 shadow-lg bg-white">
          <CardHeader className="pb-1 text-slate-500 text-[11px] font-black uppercase flex flex-row items-center gap-2">
            <Landmark size={14}/> Orçado Anual
          </CardHeader>
          <CardContent><div className="text-xl font-black text-slate-700">{formatBRL(valorOrcado)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-orange-500 shadow-lg bg-white">
          <CardHeader className="pb-1 text-orange-600 text-[11px] font-black uppercase flex flex-row items-center gap-2">
            <TrendingUp size={14}/> Empenhado
          </CardHeader>
          <CardContent><div className="text-xl font-black text-orange-700">{formatBRL(valorEmpenhado)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-green-600 shadow-lg bg-white">
          <CardHeader className="pb-1 text-green-600 text-[11px] font-black uppercase font-bold">Executado (Pago)</CardHeader>
          <CardContent><div className="text-xl font-black text-green-800">{formatBRL(totalLiquido)}</div></CardContent>
        </Card>
        <Card className={`border-t-8 shadow-lg bg-white ${saldoEmpenho < 0 ? 'border-t-red-600' : 'border-t-blue-600'}`}>
          <CardHeader className="pb-1 text-blue-600 text-[11px] font-black uppercase flex flex-row items-center gap-2">
            <AlertCircle size={14}/> Saldo Empenho
          </CardHeader>
          <CardContent><div className="text-xl font-black text-blue-900">{formatBRL(saldoEmpenho)}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white border-none shadow-md ring-1 ring-black/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Contrato</Label>
            <Select value={filtroContrato} onValueChange={setFiltroContrato}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Vigência</Label>
            <Select value={filtroVigencia} onValueChange={setFiltroVigencia}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {vigencias.filter(v => filtroContrato === "todos" || v.contrato_id === filtroContrato).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.tipo || `Vigência ${v.data_assinatura}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Ano</Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Mês</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-100 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mesesNomes.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-[#1a2e4a] text-xs">Status</Label>
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
            <div className="relative">
              <Search className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
              <Input className="h-12 pl-10 bg-gray-50 border-gray-100 font-bold text-sm" placeholder="Pesquisar..." value={buscaNF} onChange={e => setBuscaNF(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="hover:bg-[#1a2e4a] border-none">
              <TableHead className="text-white font-black py-6 uppercase text-xs">NF / Emissão</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Contrato / Item</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Auditoria</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Status</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-xs px-8">Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-32 text-gray-300 font-black uppercase text-sm">Sem registros para o filtro selecionado</TableCell></TableRow>
            ) : (
              dadosFiltrados.map((l) => (
                <TableRow key={l.id} className="hover:bg-blue-50/40 border-b border-gray-100">
                  <TableCell className="py-6">
                    <div className="font-black text-[#1a2e4a] text-lg">NF {l.numero_nf}</div>
                    <div className="text-[10px] text-gray-400 font-black uppercase">{l.data_nf}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-blue-800 text-[10px] mb-1 uppercase bg-blue-50 px-2 py-0.5 rounded inline-block">
                      {contratos.find(c => c.id === l.contrato_id)?.numero || "---"}
                    </div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase block truncate max-w-[150px]">{l.item_label}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                      <User size={12} className="text-gray-400" /> {l.alterado_por || "Lançador"}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                      {l.data_ultima_alteracao_status ? new Date(l.data_ultima_alteracao_status).toLocaleDateString() : "Sem alteração"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="focus:outline-none">
                          <Badge className={`text-[10px] font-black uppercase px-3 py-1 cursor-pointer hover:scale-105 transition-all shadow-sm ${
                            l.status === 'Pago' ? 'bg-green-600' : 'bg-[#1a2e4a]'
                          }`}>
                            {l.status}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-1 bg-white shadow-2xl">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(l.id, status)}
                            className="w-full text-left px-3 py-2 text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-700 rounded-md"
                          >
                            {status}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-right font-black text-[#1a2e4a] px-8">
                    <div className="text-[11px] text-gray-300 line-through font-bold">{formatBRL(l.valor)}</div>
                    <div className="text-xl">{formatBRL(l.valor_pago_final)}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}