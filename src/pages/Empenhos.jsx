import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, open, onOpenChange, onUpdate, user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...empenho });
  const [valorReforco, setValorReforco] = useState(0);
  const [justificativa, setJustificativa] = useState("");

  const handleSalvarAlteracao = async () => {
    if (!justificativa) {
      toast.error("A justificativa é obrigatória para qualquer alteração.");
      return;
    }

    setLoading(true);
    const agoraISO = new Date().toISOString();
    const novoValorTotal = Number(empenho.valor_total) + Number(valorReforco);
    const novoSaldo = Number(empenho.valor_saldo) + Number(valorReforco);

    try {
      // 1. Atualiza a Nota de Empenho
      await base44.entities.NotaEmpenho.update(empenho.id, {
        ...formData,
        valor_total: novoValorTotal,
        valor_saldo: novoSaldo,
        ultima_alteracao: agoraISO
      });

      // 2. Registra no Log de Auditoria (Entidade HistoricoEmpenho)
      await base44.entities.LogAuditoria.create({
        entidade: "NotaEmpenho",
        entidade_id: empenho.id,
        tipo_acao: valorReforco > 0 ? "reforco_orcamentario" : "edicao_dados",
        descricao: `Alteração na NE ${empenho.numero_empenho}. Reforço: R$ ${valorReforco}`,
        justificativa: justificativa,
        usuario: user?.full_name || "Sistema",
        data_acao: agoraISO
      });

      toast.success("Empenho atualizado e log registrado.");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar alteração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[#1a2e4a] font-black uppercase">Editar Empenho / Reforço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">PTRES</Label>
              <Input value={formData.ptres} onChange={e => setFormData({...formData, ptres: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Natureza (ND)</Label>
              <Input value={formData.natureza_despesa} onChange={e => setFormData({...formData, natureza_despesa: e.target.value})} />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2 text-blue-800">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase">Reforço Orçamentário</span>
            </div>
            <Label className="text-[10px]">Valor do Acréscimo (R$)</Label>
            <Input 
              type="number" 
              placeholder="0,00" 
              className="bg-white"
              onChange={(e) => setValorReforco(Number(e.target.value))}
            />
            <p className="text-[9px] text-blue-600 mt-1 font-medium italic">
              * Este valor será somado ao total e ao saldo atual.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> Justificativa da Alteração *
            </Label>
            <Textarea 
              placeholder="Explique o motivo do reforço ou da alteração dos dados técnicos..." 
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              className="h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs uppercase font-bold">Cancelar</Button>
          <Button onClick={handleSalvarAlteracao} disabled={loading} className="bg-[#1a2e4a] text-xs uppercase font-bold">
            {loading ? "Salvando..." : "Confirmar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}