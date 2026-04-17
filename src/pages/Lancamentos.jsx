import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Plus } from "lucide-react";
import ImportarLancamentosLote from "@/components/lancamentos/ImportarLancamentosLote.jsx";

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportar, setShowImportar] = useState(false);

  useEffect(() => { 
    base44.entities.Contrato.list().then(setContratos);
    atualizarLista(); 
  }, []);

  const atualizarLista = async () => {
    setLoading(true);
    const data = await base44.entities.LancamentoFinanceiro.list("-created_date");
    setLancamentos(data);
    setLoading(false);
  };

  if (showImportar) return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <ImportarLancamentosLote 
        contratos={contratos} 
        onComplete={() => { setShowImportar(false); atualizarLista(); }} 
        onCancel={() => setShowImportar(false)} 
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lançamentos Financeiros</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportar(true)}><Upload className="w-4 h-4 mr-2" /> Importar</Button>
          <Button className="bg-[#1a2e4a]"><Plus className="w-4 h-4 mr-2" /> Novo</Button>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Referência</th>
              <th className="p-4 text-left">Item</th>
              <th className="p-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="text-center p-10">Atualizando lista...</td></tr>
            ) : lancamentos.map(l => (
              <tr key={l.id} className="border-b">
                <td className="p-4 font-medium">{l.mes}/{l.ano}</td>
                <td className="p-4">{l.item_label}</td>
                <td className="p-4 text-right font-bold text-[#1a2e4a]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}