import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Building2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContratoCard({ contrato }) {
  return (
    <Card className="hover:shadow-md transition-shadow border-gray-100">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1a2e4a]">{contrato.numero}</span>
              <Badge variant="outline" className="text-[9px] uppercase">{contrato.status}</Badge>
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[300px]">{contrato.contratada}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:block">
            <div className="text-[10px] text-gray-400 uppercase font-bold">Vigência</div>
            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
              <Calendar size={12} /> {contrato.data_fim_vigencia || "N/A"}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/contratos/${contrato.id}`} className="text-blue-600 font-bold text-xs uppercase">
              Detalhes <ArrowUpRight size={14} className="ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}