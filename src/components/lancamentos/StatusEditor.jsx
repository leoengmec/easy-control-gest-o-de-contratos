import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  gray: "bg-gray-100 text-gray-700 border-gray-300",
  blue: "bg-blue-100 text-blue-700 border-blue-300",
  green: "bg-green-100 text-green-700 border-green-300",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
  red: "bg-red-100 text-red-700 border-red-300",
  purple: "bg-purple-100 text-purple-700 border-purple-300",
  orange: "bg-orange-100 text-orange-700 border-orange-300",
};

export default function StatusEditor({ lancamento, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadStatusOptions();
  }, []);

  const loadStatusOptions = async () => {
    try {
      const data = await base44.entities.ConfiguracaoStatusLancamento.filter({ ativo: true });
      const sorted = data.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      setStatusOptions(sorted);
    } catch {
      // Fallback para status padrão se não houver configuração
      setStatusOptions([
        { nome: "SOF", cor: "gray", ordem: 1 },
        { nome: "Em instrução", cor: "blue", ordem: 2 },
        { nome: "Em bloco de assinatura", cor: "yellow", ordem: 3 },
        { nome: "Em execução", cor: "orange", ordem: 4 },
        { nome: "Aprovisionado", cor: "purple", ordem: 5 },
        { nome: "Pago", cor: "green", ordem: 6 },
        { nome: "Cancelado", cor: "red", ordem: 7 },
      ]);
    }
  };

  // Recarregar status quando abrir o popover
  useEffect(() => {
    if (open) {
      loadStatusOptions();
    }
  }, [open]);

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      toast.error("Selecione um status");
      return;
    }

    setSaving(true);
    const agora = new Date().toISOString();

    try {
      // Buscar o último histórico para calcular tempo entre alterações
      const historicos = await base44.entities.HistoricoLancamento.filter({
        lancamento_financeiro_id: lancamento.id,
      });
      
      const ultimaAlteracao = historicos
        .filter(h => h.tipo_acao === "atualizacao_status")
        .sort((a, b) => new Date(b.data_acao) - new Date(a.data_acao))[0];

      let tempoDecorrido = null;
      if (ultimaAlteracao) {
        const diffMs = new Date(agora) - new Date(ultimaAlteracao.data_acao);
        tempoDecorrido = Math.round(diffMs / (1000 * 60 * 60 * 24)); // dias
      }

      // Atualizar o status do lançamento
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        status: selectedStatus,
      });

      // Criar registro no histórico
      await base44.entities.HistoricoLancamento.create({
        lancamento_financeiro_id: lancamento.id,
        tipo_acao: "atualizacao_status",
        status_anterior: lancamento.status,
        status_novo: selectedStatus,
        motivo: motivo || `Alteração de status para ${selectedStatus}`,
        realizado_por: user?.full_name || user?.email || "Sistema",
        realizado_por_id: user?.id || "",
        data_acao: agora,
      });

      toast.success(`Status alterado para "${selectedStatus}"`);
      setOpen(false);
      setSelectedStatus("");
      setMotivo("");
      onUpdate();
    } catch (error) {
      toast.error("Erro ao alterar status: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const currentStatusConfig = statusOptions.find(s => s.nome === lancamento.status);
  const colorClass = STATUS_COLORS[currentStatusConfig?.cor || "blue"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
        >
          {lancamento.status}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Alterar Status</h4>
            <p className="text-xs text-gray-500">Status atual: {lancamento.status}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Novo Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.nome}
                  onClick={() => setSelectedStatus(option.nome)}
                  disabled={option.nome === lancamento.status}
                  className={`
                    text-xs px-3 py-2 rounded-md border transition-all
                    ${option.nome === lancamento.status ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                    ${selectedStatus === option.nome ? "ring-2 ring-offset-1 ring-blue-500" : ""}
                    ${STATUS_COLORS[option.cor || "blue"]}
                  `}
                >
                  {selectedStatus === option.nome && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {option.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Motivo da Alteração (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              className="text-xs h-20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setSelectedStatus("");
                setMotivo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleStatusChange}
              disabled={!selectedStatus || saving}
              className="bg-[#1a2e4a] hover:bg-[#2a4a7a]"
            >
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}