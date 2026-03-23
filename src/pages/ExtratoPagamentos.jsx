import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Calendar, DollarSign, AlertTriangle, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ExtratoPagamentos() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [naturezas, setNaturezas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusSelecionados, setStatusSelecionados] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [resL, resC, resN, resLog] = await Promise.all([
          base44.entities.LancamentoFinanceiro.list("-data_nf"),
          base44.entities.Contrato.list(),
          base44.entities.NaturezaDespesa.list(),
          base44.entities.LogAuditoria.list("-data_acao")
        ]);
        setLancamentos(resL || []);
        setContratos(resC || []);
        setNaturezas(resN || []);
        setLogs(resLog || []);
      } catch (e) {
        toast.error("Erro ao carregar dados financeiros.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const toggleStatus = (s) => {
    setStatusSelecionados(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleStatusChange = async (lancamento, novoStatus) => {
    try {
      const responsavel = user?.full_name || user?.email || "Usuário não identificado";
      const justificativa = `Alterado por ${responsavel} em ${format(new Date(), "dd/MM/yyyy")} de ${lancamento.status} para ${novoStatus}`;
      
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { status: novoStatus });
      
      const novoLog = await base44.entities.LogAuditoria.create({
        entidade_id: lancamento.id,
        tipo_acao: "ATUALIZACAO_STATUS",
        valor_operacao: 0,
        justificativa: justificativa,
        responsavel: responsavel,
        data_acao: new Date().toISOString()
      });

      toast.success(`Status atualizado para ${novoStatus}`);
      setLancamentos(prev => prev.map(l => l.id === lancamento.id ? { ...l, status: novoStatus } : l));
      setLogs(prev => [novoLog, ...prev]);
    } catch (e) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const filtrados = lancamentos.filter(l => {
    const c = contratos.find(con => con.id === l.contrato_id);
    const termo = busca.toLowerCase();
    const matchBusca = l.numero_nf?.toLowerCase().includes(termo) || 
                      c?.numero?.toLowerCase().includes(termo) ||
                      c?.contratada?.toLowerCase().includes(termo);
    const matchStatus = statusSelecionados.length === 0 || statusSelecionados.includes(l.status);
    return matchBusca && matchStatus;
  });

  const total = filtrados.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  if (loading) return <div className="p-10 text-center font-bold text-[#1a2e4a]">Sincronizando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-[#1a2e4a] uppercase">Extrato de Pagamentos</h1>
          <p className="text-sm font-bold text-blue-600 uppercase">JFRN - Gestão Orçamentária</p>
        </div>
        <Card className="bg-[#1a2e4a] text-white p-4">
          <div className="text-[10px] uppercase font-bold opacity-70">Soma Total Filtrada</div>
          <div className="text-2xl font-black">{fmt(total)}</div>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input 
            placeholder="Buscar por NF, Número do Contrato ou Empresa..." 
            className="pl-10 h-12 text-lg border-gray-300"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <span className="text-xs font-black uppercase text-gray-400">Filtrar Status:</span>
          {["SOF", "Pago", "Aprovisionado", "Cancelado"].map(s => (
            <div key={s} className="flex items-center space-x-2">
              <Checkbox id={s} checked={statusSelecionados.includes(s)} onCheckedChange={() => toggleStatus(s)} />
              <label htmlFor={s} className="text-sm font-bold uppercase cursor-pointer">{s}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow className="h-14">
              <TableHead className="text-[10px] font-black uppercase">Data NF / Número</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Contrato / Empresa</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Cadastro</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right">Valor Bruto</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map(l => {
              const c = contratos.find(con => con.id === l.contrato_id);
              const n = naturezas.find(nat => nat.id === l.natureza_id);
              
              const logsLancamento = logs.filter(lg => lg.entidade_id === l.id).sort((a, b) => new Date(a.data_acao) - new Date(b.data_acao));
              const logCadastro = logsLancamento[0];
              const logEstouro = logsLancamento.find(lg => lg.valor_posterior < 0);
              
              const isEstouro = !!logEstouro;
              const tooltipLog = logEstouro || logCadastro;
              const hasNatal = l.item_label?.toUpperCase().includes('NATAL');
              const hasMossoro = l.item_label?.toUpperCase().includes('MOSSORO');

              return (
                <TableRow key={l.id} className="h-20 hover:bg-blue-50/30">
                  <TableCell>
                    <div className="text-xl font-black text-[#1a2e4a]">
                      {l.data_nf ? format(parseISO(l.data_nf), "dd/MM/yyyy") : "—"}
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase">NF: {l.numero_nf || "S/N"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-base font-black text-amber-700 uppercase">{c?.numero || "N/A"}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[250px]">{c?.contratada}</div>
                    {n && (
                      <Badge variant="outline" className="mt-1 text-[9px] text-blue-600 border-blue-200 uppercase">
                        ND: {n.codigo}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {logCadastro ? (
                      <>
                        <div className="text-xs font-bold text-[#1a2e4a] truncate max-w-[150px]">{logCadastro.responsavel}</div>
                        <div className="text-[10px] text-gray-500">{format(parseISO(logCadastro.data_acao), "dd/MM/yy HH:mm")}</div>
                      </>
                    ) : (
                      <div className="text-[10px] text-gray-400">Sem registro</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-end gap-2 cursor-help">
                            {isEstouro && <AlertTriangle className="w-5 h-5 text-yellow-500 animate-pulse" />}
                            <div className="text-2xl font-black text-[#1a2e4a]">{fmt(l.valor)}</div>
                          </div>
                        </TooltipTrigger>
                        {tooltipLog && (
                          <TooltipContent className="bg-white border shadow-xl p-3 max-w-xs" side="left">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Auditoria</p>
                            <p className="text-xs text-[#1a2e4a] mb-1"><strong>Responsável:</strong> {tooltipLog.responsavel}</p>
                            <p className="text-xs text-gray-600"><strong>Justificativa:</strong> {tooltipLog.justificativa}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    {l.glosa > 0 && <div className="text-[10px] font-bold text-red-500 uppercase">Glosa: {fmt(l.glosa)}</div>}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="focus:outline-none">
                          <Badge className="font-black uppercase text-[10px] px-3 py-1 cursor-pointer hover:opacity-80 transition-opacity">
                            {l.status}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {["SOF", "Pago", "Cancelado", "Aprovisionado", "Em instrução"].filter(s => s !== l.status).map(s => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(l, s)} className="text-xs cursor-pointer">
                              Mudar para {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {(hasNatal || hasMossoro) && (
                        <Badge variant="secondary" className="text-[9px] px-2 py-0 h-4 bg-amber-100 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hasNatal ? 'NATAL' : 'MOSSORÓ'}
                        </Badge>
                      )}
                    </div>
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