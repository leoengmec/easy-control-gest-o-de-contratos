import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  History, 
  Plus, 
  DollarSign, 
  PieChart,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtros
  const [busca, setBusca] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [statusSelecionados, setStatusSelecionados] = useState([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [contratoId, setContratoId] = useState("todos");

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resL, resC] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list("-data_nf"),
        base44.entities.Contrato.list()
      ]);
      setLancamentos(resL || []);
      setContratos(resC || []);
    } catch (e) {
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const toggleStatus = (status) => {
    setStatusSelecionados(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // Lógica de Filtragem
  const dadosFiltrados = lancamentos.filter(l => {
    const contrato = contratos.find(c => c.id === l.contrato_id);
    const termo = busca.toLowerCase();
    
    const matchBusca = l.numero_nf?.toLowerCase().includes(termo) || 
                      l.descricao?.toLowerCase().includes(termo) ||
                      contrato?.numero?.toLowerCase().includes(termo);
                      
    const matchStatus = statusSelecionados.length === 0 || statusSelecionados.includes(l.status);
    const matchContrato = contratoId === "todos" || l.contrato_id === contratoId;
    const matchData = (!dataInicio || l.data_nf >= dataInicio) && 
                     (!dataFim || l.data_nf <= dataFim);

    return matchBusca && matchStatus && matchContrato && matchData;
  });

  // Cálculo de Totalizadores (Melhoria Proposta)
  const totalFiltrado = dadosFiltrados.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalPago = dadosFiltrados.filter(l => l.status === "Pago").reduce((acc, curr) => acc + (curr.valor || 0), 0);

  if (loading) return <div className="p-20 text-center font-black text-[#1a2e4a] animate-pulse text-2xl">CARREGANDO EASY CONTROL...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-end border-b-4 border-[#1a2e4a] pb-6">
        <div>
          <h1 className="text-5xl font-black text-[#1a2e4a] uppercase tracking-tighter">Extrato de Pagamentos</h1>
          <p className="text-lg font-bold text-blue-800 uppercase mt-2">JFRN - Supervisão de Manutenção e Orçamento</p>
        </div>
        <Button className="bg-[#1a2e4a] hover:bg-[#2c4a75] font-black uppercase text-sm h-14 px-8 shadow-2xl">
          <Plus className="mr-2 w-5 h-5" /> Novo Lançamento
        </Button>
      </div>

      {/* Cards de Resumo (Totalizadores em Tempo Real) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-8 border-l-blue-600 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Soma dos Itens Filtrados</p>
              <h2 className="text-3xl font-black text-[#1a2e4a]">{fmt(totalFiltrado)}</h2>
            </div>
            <PieChart size={40} className="text-blue-100" />
          </CardContent>
        </Card>
        <Card className="border-l-8 border-l-green-600 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Total Efetivamente Pago</p>
              <h2 className="text-3xl font-black text-green-700">{fmt(totalPago)}</h2>
            </div>
            <DollarSign size={40} className="text-green-100" />
          </CardContent>
        </Card>
      </div>

      {/* Painel de Filtros Avançados */}
      <Card className="border-2 border-[#1a2e4a]/10 bg-gray-50/30">
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#1a2e4a]">Busca Rápida (NF ou Contrato)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  placeholder="Ex: NF 1234..." 
                  className="pl-10 h-12 text-lg font-bold border-2"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#1a2e4a]">Selecionar Contrato</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger className="h-12 border-2 font-bold text-[#1a2e4a]">
                  <SelectValue placeholder="Todos os contratos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Contratos</SelectItem>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id} className="font-bold">{c.numero} - {c.contratada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#1a2e4a]">Período (Data da NF)</Label>
              <div className="flex gap-3">
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-12 border-2 font-bold" />
                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-12 border-2 font-bold" />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 pb-2">
              {["Pago", "Aprovisionado", "SOF", "Cancelado"].map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <Checkbox 
                    id={s} 
                    checked={statusSelecionados.includes(s)} 
                    onCheckedChange={() => toggleStatus(s)} 
                    className="border-2 border-[#1a2e4a]"
                  />
                  <label htmlFor={s} className="text-sm font-black uppercase text-[#1a2e4a] cursor-pointer">{s}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados (Escala Ampliada) */}
      <div className="rounded-2xl border-2 border-gray-100 bg-white overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-[#1a2e4a]">
            <TableRow className="h-16">
              <TableHead className="text-white font-black uppercase text-xs">Data NF / Número</TableHead>
              <TableHead className="text-white font-black uppercase text-xs">Contrato / Empresa</TableHead>
              <TableHead className="text-white font-black uppercase text-xs text-center">Auditoria</TableHead>
              <TableHead className="text-white font-black uppercase text-xs text-right">Valor do Lançamento</TableHead>
              <TableHead className="text-white font-black uppercase text-xs text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosFiltrados.map((l) => {
              const c = contratos.find(con => con.id === l.contrato_id);
              return (
                <TableRow key={l.id} className="hover:bg-blue-50/50 transition-colors h-24 border-b">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-[#1a2e4a]">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <div className="text-xl font-black text-[#1a2e4a]">
                          {l.data_nf ? format(parseISO(l.data_nf), "dd/MM/yyyy") : "—"}
                        </div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">NF: {l.numero_nf || "Não informado"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-base font-black text-amber-700 uppercase">{c?.numero || "S/Vínculo"}</div>
                    <div className="text-xs font-bold text-gray-500 uppercase truncate max-w-[280px]">{c?.contratada}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase">
                        <User size={14} className="text-blue-600" /> {l.responsavel_alteracao || "Leonardo P. Silva"}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        <History size={12} /> {l.data_ultima_alteracao ? format(parseISO(l.data_ultima_alteracao), "dd/MM HH:mm") : "Registro Inicial"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-2xl font-black text-[#1a2e4a]">{fmt(l.valor)}</div>
                    {l.glosa > 0 && <div className="text-[10px] font-bold text-red-500 uppercase">Glosa: {fmt(l.glosa)}</div>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`uppercase text-[11px] font-black px-4 py-1.5 border-2 ${
                      l.status === 'Pago' ? 'bg-green-50 text-green-700 border-green-200' : 
                      l.status === 'Aprovisionado' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {l.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {dadosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center gap-4 text-gray-300">
                    <FileText size={60} />
                    <p className="text-xl font-black uppercase">Nenhum lançamento encontrado com estes filtros.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}