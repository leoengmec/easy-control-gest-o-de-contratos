import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContractFinancialOverview from "@/components/dashboard/ContractFinancialOverview";

export default function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState("all");
  const [loadingContracts, setLoadingContracts] = useState(true);

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    const loadContracts = async () => {
      setLoadingContracts(true);
      try {
        const fetchedContracts = await base44.entities.Contrato.list();
        setContracts(fetchedContracts);
      } catch (error) {
        console.error("Erro ao carregar contratos:", error);
      } finally {
        setLoadingContracts(false);
      }
    };
    loadContracts();
  }, []);

  if (loadingContracts) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-gray-500">Carregando...</div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Dashboard</h1>
          <p className="text-gray-500 text-sm">Gestão de contratos de manutenção · {anoAtual}</p>
        </div>
        <div className="sm:ml-4">
          <Select value={selectedContractId} onValueChange={setSelectedContractId}>
            <SelectTrigger className="h-8 text-xs w-64">
              <SelectValue placeholder="Todos os contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os contratos</SelectItem>
              {contracts.filter(c => c.status === "ativo").map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.numero} · {c.escopo_resumido?.substring(0, 25) || c.contratada?.substring(0, 25)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedContractId === "all" ? (
        contracts.length > 0 ? (
          <div className="space-y-8">
            {contracts.map((contract) => (
              <Card key={contract.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#1a2e4a]">
                    {contract.numero} — {contract.escopo_resumido || contract.objeto?.substring(0, 60)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContractFinancialOverview contractId={contract.id} contractName={contract.numero} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-gray-400 text-sm">Nenhum contrato encontrado.</p>
        )
      ) : (
        <ContractFinancialOverview
          contractId={selectedContractId}
          contractName={contracts.find((c) => c.id === selectedContractId)?.numero}
        />
      )}
    </div>
  );
}