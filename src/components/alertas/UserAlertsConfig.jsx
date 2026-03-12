import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";

export default function UserAlertsConfig() {
  const [user, setUser] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [contratos, setContratos] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [alertasData, contratosData] = await Promise.all([
        base44.entities.ConfiguracaoAlerta.list(),
        base44.entities.Contrato.list()
      ]);

      // Filtrar alertas globais ou específicos do usuário
      const alertasFiltrados = alertasData.filter(a => !a.user_id || a.user_id === userData.id);
      setAlertas(alertasFiltrados);
      setContratos(contratosData);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    }
  };

  const handleAtualizar = async (alerta, campo, valor) => {
    try {
      await base44.entities.ConfiguracaoAlerta.update(alerta.id, {
        ...alerta,
        [campo]: valor
      });
      toast.success("Alerta atualizado");
      carregarDados();
    } catch (error) {
      toast.error("Erro ao atualizar alerta");
    }
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      vencimento_contrato: "Vencimento de Contrato",
      aprovacao_lancamento: "Aprovação de Lançamento",
      limite_orcamento: "Limite de Orçamento"
    };
    return tipos[tipo] || tipo;
  };

  const getContratoNome = (contratoId) => {
    if (!contratoId) return "Todos os contratos";
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato ? contrato.numero : "N/A";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Minhas Configurações de Alertas</h1>
          <p className="text-sm text-gray-500">Configure os alertas que deseja receber</p>
        </div>
      </div>

      <div className="grid gap-4">
        {alertas.map(alerta => (
          <Card key={alerta.id} className={alerta.ativo ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-gray-300"}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{getTipoLabel(alerta.tipo)}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alerta.ativo}
                    onCheckedChange={(checked) => handleAtualizar(alerta, "ativo", checked)}
                  />
                  <Label className="text-sm font-normal">{alerta.ativo ? "Ativo" : "Inativo"}</Label>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Contrato:</strong> {getContratoNome(alerta.contrato_id)}</p>
                {alerta.descricao && (
                  <p className="mt-1 text-gray-500 italic">{alerta.descricao}</p>
                )}
                {alerta.user_id && (
                  <p className="mt-1 text-blue-600 text-xs">Configuração personalizada</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerta.tipo === "vencimento_contrato" && (
                  <div className="space-y-2">
                    <Label>Dias de Antecedência</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={alerta.dias_antecedencia || 30}
                        onChange={(e) => {
                          const novoAlerta = {...alerta, dias_antecedencia: parseInt(e.target.value)};
                          setAlertas(alertas.map(a => a.id === alerta.id ? novoAlerta : a));
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleAtualizar(alerta, "dias_antecedencia", alerta.dias_antecedencia)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {alerta.tipo === "limite_orcamento" && (
                  <div className="space-y-2">
                    <Label>Percentual do Orçamento (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={alerta.percentual_orcamento || 80}
                        onChange={(e) => {
                          const novoAlerta = {...alerta, percentual_orcamento: parseInt(e.target.value)};
                          setAlertas(alertas.map(a => a.id === alerta.id ? novoAlerta : a));
                        }}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleAtualizar(alerta, "percentual_orcamento", alerta.percentual_orcamento)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {alertas.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Nenhum alerta disponível. Entre em contato com o administrador para configurar alertas.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}