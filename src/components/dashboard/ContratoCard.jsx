import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContratoCard({ contrato }) {
  // Lógica de Fallback conforme Schema (Novo vs Legado)
  // Garante que o projeto não "detone" se um dos campos estiver ausente
  const exibirNumero = contrato.numero_contrato || contrato.numero || "Sem Número";
  const exibirEmpresa = contrato.empresa || contrato.contratada || "Empresa não identificada";
  
  // Tratamento da data de vigência para os dois padrões de campo possíveis
  const dataVigencia = contrato.data_fim || contrato.data_fim_vigencia;

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-100 group">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-[#1a2e4a] group-hover:text-white transition-colors">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1a2e4a]">{exibirNumero}</span>
              {contrato.status && (
                <Badge variant="outline" className="text-[9px] uppercase font-bold border-blue-200 text-blue-700">
                  {contrato.status}
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[300px]" title={exibirEmpresa}>
              {exibirEmpresa}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Vigência Final</div>
            <div className="flex items-center justify-end gap-1 text-xs font-semibold text-gray-700">
              <Calendar size={12} className="text-blue-500" /> 
              {dataVigencia ? new Date(dataVigencia).toLocaleDateString('pt-BR') : "N/A"}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="hover:bg-blue-50 transition-all">
            <Link to={`/contratos/${contrato.id}`} className="text-blue-600 font-bold flex items-center gap-1 text-[11px] uppercase">
              Detalhes <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}