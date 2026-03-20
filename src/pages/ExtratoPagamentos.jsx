import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  "SOF", 
  "Pago", 
  "Cancelado", 
  "Aprovisionado", 
  "Em execução", 
  "Em instrução", 
  "Em bloco de assinatura"
];

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      try {
        const [resUser, resLancamentos, resContratos] = await Promise.all([
          base44.auth.me(),
          base44.entities.LancamentoFinanceiro.list(),
          base44.entities.Contrato.list()
        ]);
        
        setUser(resUser);
        setLancamentos(resLancamentos || []);
        setContratos(resContratos || []);
      } catch (error) {
        toast.error("Erro ao sincronizar dados do Base44.");
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  // Função para encontrar os dados do contrato pelo ID
  const getDadosContrato = (id) => {
    const contrato = contratos.find(c => String(c.id) === String(id));
    return contrato ? `${contrato.numero} | ${contrato.contratada}` : "Contrato não encontrado";
  };

  const handleStatusUpdate = async (id, novoStatus) => {
    const agoraISO = new Date().toISOString();
    const nomeResponsavel = user?.full_name || "Leonardo Alves";

    try {
      await base44.entities.LancamentoFinanceiro.update(id, {
        status: novoStatus,
        responsavel_alteracao_status: nomeResponsavel,
        data_alteracao_status: agoraISO
      });
      
      toast.success(`Status atualizado: ${novoStatus}`);
      
      // Atualização otimista na UI
      setLancamentos(prev => prev.map(l => 
        l.id === id ? { 
          ...l, 
          status: novoStatus, 
          responsavel_alteracao_status: nomeResponsavel, 
          data_alteracao_status: agoraISO 
        } : l
      ));
    } catch (error) {
      toast.error("Erro ao persistir auditoria.");
    }
  };

  const formatarDataAuditoria = (dataStr) => {
    if (!dataStr) return "Sem registro";
    return new Date(dataStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-[#1a2e4a]" />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] uppercase tracking-tight">Extrato de Pagamentos</h1>
          <p className="text-sm text-gray-500">Fiscalização e Auditoria de Lançamentos JFRN</p>
        </div>
        <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
          {lancamentos.length} Registros Encontrados
        </Badge>
      </div>

      <div className="rounded-xl border shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow className="text-[11px] uppercase font-bold text-gray-600">
              <TableHead className="w-[180px]">Nota Fiscal</TableHead>
              <TableHead>Contrato e Item</TableHead>
              <TableHead>Status / Rastro</TableHead>
              <TableHead>Auditoria de Criação</TableHead>
              <TableHead>Última Alteração</TableHead>
              <TableHead className="text-right">Valor Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l) => (
              <TableRow key={l.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-bold text-[#1a2e4a]">NF {l.numero_nf}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 ml-6">Emissão: {l.data_nf}</div>
                </TableCell>
                
                <TableCell>
                  <div className="text-[11px] font-bold text-blue-900 uppercase leading-tight">
                    {getDadosContrato(l.contrato_id)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 italic">
                    Item: {l.item_label}
                  </div>
                </TableCell>

                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold border-gray-200 shadow-none">
                        {l.status}
                        <ArrowRight className="ml-2 h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2 shadow-2xl border-blue-100">
                      <div className="text-[9px] font-bold text-gray-400 uppercase mb-2 px-2">Alterar Status</div>
                      <div className="grid grid-cols-1 gap-1">
                        {STATUS_OPTIONS.map(st => (
                          <Button 
                            key={st} 
                            variant="ghost" 
                            className={`justify-start text-[10px] h-8 ${l.status === st ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}
                            onClick={() => handleStatusUpdate(l.id, st)}
                          >
                            {st}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[11px] text-gray-700 font-medium">
                      <User className="h-3 w-3" /> {l.responsavel_por_lancamento || "Sistema"}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400">
                      <Calendar className="h-3 w-3" /> {formatarDataAuditoria(l.data_do_lancamento_original)}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="text-[11px] font-bold text-blue-700">
                      {l.responsavel_alteracao_status || "N/A"}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {formatarDataAuditoria(l.data_alteracao_status)}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="text-sm font-black text-[#1a2e4a]">
                    R$ {l.valor_pago_final?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}