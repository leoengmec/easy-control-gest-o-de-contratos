import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

export default function Reajustes() {
  const [reajustes, setReajustes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarReajustes();
  }, []);

  const carregarReajustes = async () => {
    try {
      const data = await base44.entities.Reajuste.list("-created_date");
      setReajustes(data);
    } catch (error) {
      console.error('Erro ao carregar reajustes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#1a2e4a]">Reajustes e Repactuações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reajustes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Nenhum reajuste encontrado</p>
            </CardContent>
          </Card>
        ) : (
          reajustes.map((reajuste) => (
            <Card key={reajuste.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-[#1a2e4a] capitalize">{reajuste.tipo}</h3>
                      <p className="text-sm text-gray-500">{reajuste.indice_aplicado || "Índice não informado"}</p>
                    </div>
                    <Badge variant={reajuste.status === 'pendente_aprovacao' ? 'outline' : 'default'} 
                           className={reajuste.status === 'pendente_aprovacao' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'bg-green-100 text-green-800'}>
                      {reajuste.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg border">
                    <div>
                      <p className="text-gray-500 text-xs">Percentual</p>
                      <p className="font-semibold text-[#1a2e4a]">{reajuste.percentual_reajuste}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Data Reajuste</p>
                      <p className="font-semibold text-[#1a2e4a]">{new Date(reajuste.data_reajuste).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Valor Anterior</p>
                      <p className="font-medium">R$ {reajuste.valor_anterior?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Novo Valor</p>
                      <p className="font-medium text-blue-600">R$ {reajuste.novo_valor?.toFixed(2)}</p>
                    </div>
                  </div>

                  {reajuste.status === 'pendente_aprovacao' && (
                    <Button className="w-full mt-2 bg-[#1a2e4a] hover:bg-[#2a4a7a]">Aprovar Reajuste</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}