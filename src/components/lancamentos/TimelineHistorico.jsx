import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, RefreshCw, Edit2, Trash2 } from "lucide-react";

export default function TimelineHistorico({ lancamentoId }) {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lancamentoId) return;
    
    // Busca e ordena da mais recente para a mais antiga (descendente)
    base44.entities.HistoricoLancamento.filter({ lancamento_financeiro_id: String(lancamentoId) }, "-data_acao")
      .then(res => setHistorico(res || []))
      .catch(err => console.error("Erro ao carregar histórico", err))
      .finally(() => setLoading(false));
  }, [lancamentoId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#1a2e4a] h-6 w-6" /></div>;

  if (historico.length === 0) return <div className="text-center text-sm text-gray-400 p-8 font-semibold uppercase tracking-widest">Nenhum histórico encontrado</div>;

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pago': return 'bg-green-100 text-green-700';
      case 'Cancelado': return 'bg-red-100 text-red-700';
      case 'Em instrução': return 'bg-blue-100 text-blue-700';
      case 'SOF': return 'bg-purple-100 text-purple-700';
      case 'Aprovisionado': return 'bg-amber-100 text-amber-700';
      case 'Em execução': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getIcon = (tipo) => {
    switch(tipo) {
      case 'criacao': return <Plus className="w-4 h-4 text-green-600" />;
      case 'atualizacao_status': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'edicao_dados': return <Edit2 className="w-4 h-4 text-amber-600" />;
      case 'exclusao': return <Trash2 className="w-4 h-4 text-red-600" />;
      default: return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  const getAcaoText = (tipo) => {
    switch(tipo) {
      case 'criacao': return 'Criação do Registro';
      case 'atualizacao_status': return 'Atualização de Status';
      case 'edicao_dados': return 'Edição de Dados';
      case 'exclusao': return 'Exclusão de Registro';
      default: return tipo;
    }
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
        {historico.map((item) => (
          <div key={item.id} className="relative pl-6">
            <span className="absolute -left-[11px] top-0 bg-white border-2 border-gray-100 rounded-full p-1">
              {getIcon(item.tipo_acao)}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#1a2e4a] uppercase tracking-wider">
                  {getAcaoText(item.tipo_acao)}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {item.data_acao ? new Date(item.data_acao).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : ''}
                </span>
              </div>
              
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                Realizado por <span className="font-bold text-gray-700">{item.realizado_por || 'Sistema'}</span>
              </div>

              {item.tipo_acao === 'atualizacao_status' && (
                <div className="flex items-center gap-2 mt-1">
                  {item.status_anterior && (
                    <>
                      <Badge className={`${getStatusColor(item.status_anterior)} border-none shadow-none text-[9px] uppercase px-2 py-0.5`}>
                        {item.status_anterior}
                      </Badge>
                      <span className="text-gray-300 text-xs">→</span>
                    </>
                  )}
                  <Badge className={`${getStatusColor(item.status_novo)} border-none shadow-none text-[9px] uppercase px-2 py-0.5`}>
                    {item.status_novo}
                  </Badge>
                </div>
              )}

              {item.motivo && (
                <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 italic">
                  "{item.motivo}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}