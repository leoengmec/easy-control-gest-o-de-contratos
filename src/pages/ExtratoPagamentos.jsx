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
      // Pega o nome do usuário logado no momento da alteração
      const currentUser = await base44.auth.me();
      
      await base44.entities.LancamentoFinanceiro.update(id, { 
        status: novoStatus,
        // Atualiza os campos de auditoria de status conforme a regra de ADM
        data_alteracao_status: new Date().toLocaleString('pt-BR'),
        responsavel_alteracao_status: currentUser?.full_name || "Leonardo Alves"
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

  const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
      <p className="font-black text-[#1a2e4a] uppercase tracking-widest text-lg">Atualizando Auditoria...</p>
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-10">
      {/* ... Cabeçalho e Cards de Resumo permanecem iguais ... */}

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
            {dadosFiltrados.map((l) => {
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
                  <TableCell>
                    <div className="flex items-center gap-2 text-[12px] font-black text-[#1a2e4a] uppercase leading-tight">
                      <Building2 size={16} className="text-blue-500 flex-shrink-0" />
                      {contrato?.contratada || "Não Informada"}
                    </div>
                  </TableCell>

                  {/* Coluna Responsável por lançamento - Mapeada para os campos de criação */}
                  <TableCell>
                    <div className="flex items-center gap-2 text-[12px] font-black text-gray-700 uppercase">
                      <User size={15} className="text-gray-400 flex-shrink-0" /> 
                      {l.responsavel_por_lancamento || "Lançador Original"}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                      DATA: {l.data_do_lancamento_original || "---"}
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

                  {/* Coluna Responsável / Data Alteração Status - Mapeada para os campos de alteração */}
                  <TableCell>
                    <div className="text-[12px] font-black text-gray-800 uppercase leading-tight">
                      {l.responsavel_alteracao_status || "Sem registro"}
                    </div>
                    <div className="text-[11px] text-gray-400 font-black uppercase mt-1 flex items-center gap-1 italic">
                      <History size={12}/> 
                      {l.data_alteracao_status || "N/A"}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-black text-[#1a2e4a] px-12">
                    <div className="text-[11px] text-gray-300 line-through font-bold mb-1 opacity-50">{formatBRL(l.valor)}</div>
                    <div className="text-3xl tracking-tighter">{formatBRL(valorExibido)}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}