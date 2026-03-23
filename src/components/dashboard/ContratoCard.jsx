import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ArrowUpRight, MoreVertical, Plus, FileText, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ContratoCard({ contrato, lancamentos = [], orcamentoContratual }) {
  // Lógica de Fallback conforme Schema (Novo vs Legado)
  // Garante que o projeto não "detone" se um dos campos estiver ausente
  const exibirNumero = contrato.numero_contrato || contrato.numero || "Sem Número";
  const exibirEmpresa = contrato.empresa || contrato.contratada || "Empresa não identificada";
  
  // Tratamento da data de vigência para os dois padrões de campo possíveis
  const dataVigencia = contrato.data_fim || contrato.data_fim_vigencia;

  const ultimos3Meses = new Date();
  ultimos3Meses.setMonth(ultimos3Meses.getMonth() - 3);
  const gastosRecentes = lancamentos.filter(l => l.contrato_id === contrato.id && l.status === "Pago" && new Date(l.data_nf || l.data_lancamento) >= ultimos3Meses);
  const mediaMensal = gastosRecentes.reduce((s, l) => s + (l.valor || 0), 0) / 3;
  const orcadoTotal = orcamentoContratual?.valor_orcado || 0;
  const pagoTotal = lancamentos.filter(l => l.contrato_id === contrato.id && l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const saldo = orcadoTotal - pagoTotal;
  const mesesRestantesSaldo = mediaMensal > 0 ? Math.floor(saldo / mediaMensal) : 0;

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
        
        <div className="flex items-center gap-4 md:gap-8">
          {mesesRestantesSaldo > 0 && mediaMensal > 0 && (
            <div className="hidden md:block text-right">
              <div className="text-[10px] text-orange-400 uppercase font-bold tracking-tight">Burn Rate</div>
              <div className="text-[10px] font-semibold text-orange-600">
                Saldo acaba em {mesesRestantesSaldo} meses
              </div>
            </div>
          )}
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Vigência Final</div>
            <div className="flex items-center justify-end gap-1 text-xs font-semibold text-gray-700">
              <Calendar size={12} className="text-blue-500" /> 
              {dataVigencia ? new Date(dataVigencia).toLocaleDateString('pt-BR') : "N/A"}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50">
                <MoreVertical size={16} className="text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={`/empenhos?contrato=${contrato.id}`} className="flex items-center gap-2 cursor-pointer"><Plus size={14}/> Novo Empenho</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/contratos/${contrato.id}/aditivos`} className="flex items-center gap-2 cursor-pointer"><FileText size={14}/> Aditivos</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/lancamentos?contrato=${contrato.id}`} className="flex items-center gap-2 cursor-pointer"><Activity size={14}/> Novo Lançamento</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/contratos/${contrato.id}`} className="flex items-center gap-2 cursor-pointer"><ArrowUpRight size={14}/> Detalhes</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}