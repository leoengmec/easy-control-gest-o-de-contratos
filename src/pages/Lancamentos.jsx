import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import LancamentoForm from "@/components/lancamentos/LancamentoForm";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Lancamentos() {
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState([]);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    carregarDadosBase();
  }, []);

  async function carregarDadosBase() {
    setLoading(true);
    try {
      const [resContratos, resItens] = await Promise.all([
        base44.entities.Contrato.list().catch(() => []),
        base44.entities.ItemContrato.list().catch(() => [])
      ]);
      
      setContratos(resContratos || []);
      setItens(resItens || []);
    } catch (error) {
      toast.error("Erro ao sincronizar base de dados.");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = () => {
    // Ação executada após o formulário salvar com sucesso
    toast.success("Lançamento finalizado. Retornando ao extrato...");
    // Aqui você pode redirecionar o usuário para a tela de extrato se desejar
  };

  const handleCancel = () => {
    // Ação ao cancelar o lançamento
    toast.info("Lançamento cancelado.");
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-[#1a2e4a] w-12 h-12" />
        <p className="font-black text-[#1a2e4a] uppercase tracking-widest text-lg">
          Carregando ambiente de lançamento...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h1 className="text-3xl font-black text-[#1a2e4a] tracking-tight uppercase">
          Nova Entrada Financeira
        </h1>
        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
          Registro de Notas Fiscais e Execução
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <LancamentoForm 
          contratos={contratos} 
          itens={itens} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  );
}