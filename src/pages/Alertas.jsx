import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { BellRing, AlertTriangle } from 'lucide-react';

export default function Alertas() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    try {
      const data = await base44.entities.AlertaContrato.filter({ status: 'ativo' }, "-created_date");
      setAlertas(data);
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BellRing className="w-8 h-8 text-[#1a2e4a]" />
        <h1 className="text-3xl font-bold text-[#1a2e4a]">Alertas e Avisos</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alertas.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <AlertTriangle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-center text-gray-500">Nenhum alerta ativo no momento</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          alertas.map((alerta) => (
            <Card key={alerta.id} className={`border-l-4 hover:shadow-md transition-shadow ${
              alerta.prioridade === 'alta' ? 'border-l-red-500' : 'border-l-amber-500'
            }`}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-[#1a2e4a] leading-tight">{alerta.tipo}</h3>
                      <Badge variant={alerta.prioridade === 'alta' ? 'destructive' : 'outline'} 
                             className={alerta.prioridade !== 'alta' ? 'text-amber-600 border-amber-200 bg-amber-50 capitalize ml-2' : 'capitalize ml-2'}>
                        {alerta.prioridade || 'média'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{alerta.descricao}</p>
                    
                    <div className="bg-gray-50 p-2 rounded-md border text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-semibold text-gray-700">Contrato ID:</span>
                      <span className="truncate">{alerta.contrato_id || "Geral/Não especificado"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}