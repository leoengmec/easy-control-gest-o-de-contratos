import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, User, Calendar as CalendarIcon, Info } from "lucide-react";

export default function TimelineHistorico({ entidadeId }) {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entidadeId) return;
    
    // REGRA: Busca na LogAuditoria filtrando pelo ID da entidade (Empenho ou Contrato)
    // Ordenação decrescente pela data da ação
    base44.entities.LogAuditoria.filter({ entidade_id: String(entidadeId) }, "-data_acao")
      .then(res => setHistorico(res || []))
      .catch(err => console.error("Erro ao carregar log de auditoria:", err))
      .finally(() => setLoading(false));
  }, [entidadeId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-[#1a2e4a] h-6 w-6" />
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 p-8 font-semibold uppercase tracking-widest border-2 border-dashed rounded-lg">
        Nenhum registro de auditoria encontrado
      </div>
    );
  }

  const getTipoColor = (tipo) => {
    if (tipo?.includes("REFORCO")) return "bg-green-100 text-green-700 border-green-200";
    if (tipo?.includes("ANULACAO")) return "bg-red-100 text-red-700 border-red-200";
    if (tipo?.includes("STATUS")) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const formatarData = (dataIso) => {
    return new Date(dataIso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-gray-100 before:h-full">
        {historico.map((item) => (
          <div key={item.id} className="relative pl-8 group">
            {/* Indicador Visual da Timeline */}
            <div className={`absolute left-0 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 top-0 ${
              item.tipo_acao?.includes("REFORCO") ? "bg-green-500" : 
              item.tipo_acao?.includes("ANULACAO") ? "bg-red-500" : "bg-[#1a2e4a]"
            }`} />
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-[10px] font-black px-2 py-0 ${getTipoColor(item.tipo_acao)}`}>
                  {item.tipo_acao?.replace("_", " ")}
                </Badge>
                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                  <CalendarIcon size={10} /> {formatarData(item.data_acao)}
                </span>
              </div>
              
              <div className="text-xs font-bold text-[#1a2e4a] flex items-center gap-1 mt-1">
                <User size={12} className="opacity-50" />
                {item.responsavel || "Sistema"}
              </div>

              {item.valor_operacao > 0 && (
                <div className="text-sm font-mono font-bold mt-1">
                  {item.tipo_acao?.includes("REFORCO") ? "+" : "-"} 
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor_operacao)}
                </div>
              )}

              {item.justificativa && (
                <div className="mt-2 bg-gray-50 border border-gray-100 rounded-md p-3 text-[11px] text-gray-600 relative">
                  <Info size={12} className="absolute top-2 right-2 opacity-20" />
                  <p className="leading-relaxed italic">"{item.justificativa}"</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}