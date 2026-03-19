import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Download, FilterX, CalendarDays } from "lucide-react";

const mesesNomes = ["Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_OPTIONS = ["Todos", "SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

export default function ExtratoPagamentos() {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  
  // Filtros da Sprint 2
  const [filtroContrato, setFiltroContrato] = useState("todos");
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState("0"); 
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [buscaNF, setBuscaNF] = useState("");

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      try {
        const [resLanc, resCont] = await Promise.all([
          base44.entities.LancamentoFinanceiro.list("-data_nf", 2000),
          base44.entities.Contrato.list()
        ]);
        setLancamentos(resLanc || []);
        setContratos(resCont || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

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
      <Loader2 className="animate-spin text-[#1a2e4a] w-10 h-10" />
      <p className="text-sm font-bold text-[#1a2e4a] uppercase tracking-widest">Sincronizando Base Financeira...</p>
    </div>
  );

  return (
    <div className="space-y-6 font-sans pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] tracking-tight uppercase">Extrato de Pagamentos</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gestão de Notas Fiscais e Fluxo de Caixa</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-bold text-xs">
          <Download className="mr-2 h-4 w-4" /> RELATÓRIO SEI
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader className="pb-2 text-gray-400 text-[10px] font-black uppercase">Valor Bruto NF</CardHeader>
          <CardContent><div className="text-2xl font-black text-[#1a2e4a]">{formatBRL(totalBruto)}</div></CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500 shadow-md">
          <CardHeader className="pb-2 text-gray-400 text-[10px] font-black uppercase">Valor Líquido Pago</CardHeader>
          <CardContent><div className="text-2xl font-black text-green-700">{formatBRL(totalLiquido)}</div></CardContent>
        </Card>
        <Card className="border-t-4 border-t-red-500 shadow-md">
          <CardHeader className="pb-2 text-gray-400 text-[10px] font-black uppercase">Total Glosado</CardHeader>
          <CardContent><div className="text-2xl font-black text-red-600">{formatBRL(totalGlosas)}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white border-none shadow-sm ring-1 ring-black/5">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-400">Contrato</Label>
            <Select value={filtroContrato} onValueChange={setFiltroContrato}>
              <SelectTrigger className="bg-gray-50 border-none font-bold text-[#1a2e4a] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-400">Ano</Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger className="bg-gray-50 border-none font-bold text-[#1a2e4a] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026", "2027"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-400">Mês</Label>
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="bg-gray-50 border-none font-bold text-[#1a2e4a] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mesesNomes.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-400">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="bg-gray-50 border-none font-bold text-[#1a2e4a] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-gray-400">Pesquisar NF</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input className="pl-8 bg-gray-50 border-none text-xs font-bold" placeholder="Número..." value={buscaNF} onChange={e => setBuscaNF(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="hover:bg-[#1a2e4a] border-none">
              <TableHead className="text-white font-black py-4 uppercase text-[10px]">NF / Data</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Contrato</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Item</TableHead>
              <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
              <TableHead className="text-right text-white font-black uppercase text-[10px] px-6">Valor Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-gray-300 font-bold uppercase text-[10px]">Nenhum registro</TableCell></TableRow>
            ) : (
              dadosFiltrados.map((l) => (
                <TableRow key={l.id} className="hover:bg-blue-50/30 border-b border-gray-50">
                  <TableCell className="py-4">
                    <div className="font-black text-[#1a2e4a] text-sm">NF {l.numero_nf}</div>
                    <div className="text-[9px] text-gray-400 font-black uppercase">{l.data_nf}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-black border-blue-100 text-blue-800 bg-blue-50/50">
                      {contratos.find(c => c.id === l.contrato_id)?.numero || "---"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-gray-500 uppercase">{l.item_label}</TableCell>
                  <TableCell>
                    <Badge className={l.status === 'Pago' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none text-[9px]' : 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[9px]'}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-black text-[#1a2e4a] px-6">
                    <div className="text-[10px] text-gray-300 line-through font-normal">{formatBRL(l.valor)}</div>
                    <div className="text-sm">{formatBRL(l.valor_pago_final)}</div>
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