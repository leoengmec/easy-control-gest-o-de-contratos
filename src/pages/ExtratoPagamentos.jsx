import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, User, FileText, ArrowRight, History } from "lucide-react";
import TimelineHistorico from "@/components/lancamentos/TimelineHistorico";
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

  // States para atualização de Status e Histórico
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [motivoStatus, setMotivoStatus] = useState("");
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [lancamentoTimeline, setLancamentoTimeline] = useState(null);

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

  const openStatusModal = (lancamento, status) => {
    setLancamentoSelecionado(lancamento);
    setNovoStatus(status);
    setMotivoStatus("");
    setIsStatusModalOpen(true);
  };

  const confirmarAlteracaoStatus = async () => {
    if (!motivoStatus.trim()) {
      toast.error("A justificativa é obrigatória para alteração de status.");
      return;
    }
    
    setSalvandoStatus(true);
    const agoraISO = new Date().toISOString();
    const nomeResponsavel = user?.full_name || "Leonardo Alves";
    const idResponsavel = user?.id || "admin";

    try {
      // 1. Atualiza o Lançamento
      await base44.entities.LancamentoFinanceiro.update(lancamentoSelecionado.id, {
        status: novoStatus,
        responsavel_alteracao_status: nomeResponsavel,
        data_alteracao_status: agoraISO
      });

      // 2. Registra no Histórico
      await base44.entities.HistoricoLancamento.create({
        lancamento_financeiro_id: String(lancamentoSelecionado.id),
        tipo_acao: "atualizacao_status",
        status_anterior: lancamentoSelecionado.status,
        status_novo: novoStatus,
        motivo: motivoStatus,
        realizado_por: nomeResponsavel,
        realizado_por_id: idResponsavel,
        data_acao: agoraISO
      });
      
      toast.success(`Status atualizado para ${novoStatus}`);
      
      // Atualização otimista
      setLancamentos(prev => prev.map(l => 
        l.id === lancamentoSelecionado.id ? { 
          ...l, 
          status: novoStatus, 
          responsavel_alteracao_status: nomeResponsavel, 
          data_alteracao_status: agoraISO 
        } : l
      ));
      
      setIsStatusModalOpen(false);
    } catch (error) {
      toast.error("Erro ao persistir auditoria de status.");
    } finally {
      setSalvandoStatus(false);
    }
  };

  const openTimeline = (lancamento) => {
    setLancamentoTimeline(lancamento);
    setIsTimelineOpen(true);
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
                  <div className="flex flex-col gap-2 items-start">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] font-bold border-gray-200 shadow-none hover:border-blue-300 hover:bg-blue-50">
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
                              onClick={() => {
                                if(st !== l.status) openStatusModal(l, st);
                              }}
                            >
                              {st}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px] text-blue-600 uppercase font-bold" onClick={() => openTimeline(l)}>
                      <History className="h-3 w-3 mr-1" /> Histórico
                    </Button>
                  </div>
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

      {/* Modal de Confirmação de Status com Justificativa */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#1a2e4a] uppercase">Justificar Alteração de Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Status Atual</div>
                <Badge variant="outline" className="text-xs bg-white">{lancamentoSelecionado?.status}</Badge>
              </div>
              <ArrowRight className="text-gray-300" />
              <div className="flex-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Novo Status</div>
                <Badge className="text-xs bg-blue-100 text-blue-700 border-none">{novoStatus}</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Motivo da Alteração *</label>
              <Textarea 
                placeholder="Descreva detalhadamente o motivo da mudança deste status..."
                className="h-28 resize-none bg-white"
                value={motivoStatus}
                onChange={(e) => setMotivoStatus(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarAlteracaoStatus} disabled={salvandoStatus} className="bg-[#1a2e4a] text-white hover:bg-[#2a4a7a]">
              {salvandoStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Alteração
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Timeline / Histórico */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-gray-50 border-b p-6">
            <DialogTitle className="text-lg font-black text-[#1a2e4a] uppercase flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Histórico de Auditoria
            </DialogTitle>
            <div className="text-xs text-gray-500 font-medium mt-1">NF {lancamentoTimeline?.numero_nf} - {lancamentoTimeline?.item_label}</div>
          </DialogHeader>
          <div className="p-6">
            {lancamentoTimeline && <TimelineHistorico lancamentoId={lancamentoTimeline.id} />}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}