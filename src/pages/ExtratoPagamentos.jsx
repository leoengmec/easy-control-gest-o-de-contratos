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
import { Loader2, Search, Download, FilterX, Clock, User } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

export default function ExtratoPagamentos() {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [user, setUser] = useState(null);
  
  const [filtroContrato, setFiltroContrato] = useState("todos");
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
      const [resLanc, resCont] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list("-created_date", 2000),
        base44.entities.Contrato.list()
      ]);
      setLancamentos(resLanc || []);
      setContratos(resCont || []);
    } catch (err) {
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await base44.entities.LancamentoFinanceiro.update(id, { 
        status: novoStatus,
        data_ultima_alteracao_status: new Date().toISOString(),
        alterado_por: user?.full_name || "Sistema"
      });
      toast.success("Status atualizado com sucesso");
      carregarDados(); // Recarrega para mostrar a nova data e status
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  };

  const dadosFiltrados = lancamentos?.filter(l => {
    const matchContrato = filtroContrato === "todos" || l.contrato_id === filtroContrato;
    const matchAno = l.ano?.toString() === filtroAno;
    const matchMes = filtroMes === "0" || l.mes?.toString() === filtroMes;
    const matchStatus = filtroStatus === "Todos" || l.status === filtroStatus;
    const matchNF = !buscaNF || l.numero_nf?.toLowerCase().includes(buscaNF.toLowerCase());
    return matchContrato && matchAno && matchMes && matchStatus && matchNF;
  }) || [];

  const totalBruto = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalLiquido = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.valor_pago_final) || 0), 0);
  const totalGlosas = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.glosa) || 0), 0);

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest">Sincronizando Base...</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10 text-base">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-[#1a2e4a] tracking-tight uppercase">Extrato de Pagamentos</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Gestão e Fiscalização JFRN</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold py-6 px-8 text-sm">
          <Download className="mr-3 h-5 w-5" /> EXPORTAR RELATÓRIO
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-t-8 border-t-blue-600 shadow-xl">
          <CardHeader className="pb-2 text-gray-500 text-xs font-black uppercase">Valor Bruto NF</CardHeader>
          <CardContent><div className="text-3xl font-black text-[#1a2e4a]">{formatBRL(totalBruto)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-green-600 shadow-xl">
          <CardHeader className="pb-2 text-gray-400 text-xs font-black uppercase">Valor Líquido Pago</CardHeader>
          <CardContent><div className="text-3xl font-black text-green-700">{formatBRL(totalLiquido)}</div></CardContent>
        </Card>
        <Card className="border-t-8 border-t-red-600 shadow-xl">
          <CardHeader className="pb-2 text-gray-400 text-xs font-black uppercase">Total Glosado</CardHeader>
          <CardContent><div className="text-3xl font-black text-red-600">{formatBRL(totalGlosas)}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white border-none shadow-md ring-1 ring-black/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-[#1a2e4a]">Contrato</Label>
            <Select value={filtroContrato} onValueChange={setFiltroContrato}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-[#1a2e4a]">Ano</Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-[#1a2e4a]">Mês</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mesesNomes.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-[#1a2e4a]">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-12 bg-gray-50 border-gray-200 font-bold text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-[#1a2e4a]">Busca NF</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <Input className="h-12 pl-10 bg-gray-50 border-gray-200 font-bold text-sm" placeholder="Número..." value={buscaNF} onChange={e => setBuscaNF(e.target.value)} />
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
              <TableHead className="text-white font-black uppercase text-xs">Auditoria (Quem/Quando)</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Status (Clique p/ alterar)</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-xs px-8">Valor Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-32 text-gray-300 font-black uppercase text-sm">Nenhum registro encontrado</TableCell></TableRow>
            ) : (
              dadosFiltrados.map((l) => (
                <TableRow key={l.id} className="hover:bg-blue-50/40 border-b border-gray-100 transition-colors">
                  <TableCell className="py-6">
                    <div className="font-black text-[#1a2e4a] text-lg">NF {l.numero_nf}</div>
                    <div className="text-xs text-gray-400 font-black uppercase flex items-center gap-1">
                      <Clock size={12}/> {l.data_nf}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-blue-800 text-xs mb-1 uppercase bg-blue-50 px-2 py-1 rounded inline-block">
                      {contratos.find(c => c.id === l.contrato_id)?.numero || "---"}
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase block">{l.item_label}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <User size={14} className="text-gray-400" /> {l.alterado_por || "Não registrado"}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                      Alt: {l.data_ultima_alteracao_status ? new Date(l.data_ultima_alteracao_status).toLocaleDateString() : "---"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="focus:outline-none">
                          <Badge className={`text-[10px] font-black uppercase px-3 py-1 cursor-pointer hover:opacity-80 transition-all ${
                            l.status === 'Pago' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {l.status}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2 bg-white shadow-2xl border-gray-200">
                        <div className="grid gap-1">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(l.id, status)}
                              className="text-left px-3 py-2 text-xs font-bold uppercase hover:bg-gray-100 rounded-md transition-colors text-[#1a2e4a]"
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="text-right font-black text-[#1a2e4a] px-8">
                    <div className="text-xs text-gray-300 line-through font-bold mb-1">{formatBRL(l.valor)}</div>
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