import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, open, onOpenChange, onUpdate, user }) {
  const [saving, setSaving] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState("reforco"); 
  const [valorAjuste, setValorAjuste] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  const [formData, setFormData] = useState({
    ptres: "",
    natureza_despesa: "",
    subelemento: "",
    processo_sei: ""
  });

  useEffect(() => {
    if (empenho && open) {
      setFormData({
        ptres: empenho.ptres || "168312",
        natureza_despesa: empenho.natureza_despesa || "339039",
        subelemento: empenho.subelemento || "17",
        processo_sei: empenho.processo_sei || "0002596-20.2020"
      });
      setJustificativa("");
      setValorAjuste("");
    }
  }, [empenho, open]);

  const handleSalvar = async () => {
    if (!justificativa) return toast.error("A justificativa é obrigatória para o log da JFRN.");
    
    setSaving(true);
    const agoraISO = new Date().toISOString();
    const valorNumerico = Number(valorAjuste) || 0;
    
    const modificador = tipoAjuste === "reforco" ? 1 : -1;
    const novoValorTotal = Number(empenho.valor_total || 0) + (valorNumerico * modificador);
    const novoValorSaldo = Number(empenho.valor_saldo || 0) + (valorNumerico * modificador);

    try {
      await base44.entities.NotaEmpenho.update(empenho.id, {
        ...formData,
        valor_total: novoValorTotal,
        valor_saldo: novoValorSaldo,
        responsavel_alteracao: user?.full_name || "Leonardo Pereira da Silva",
        data_ultima_alteracao: agoraISO
      });

      await base44.entities.LogAuditoria.create({
        entidade_id: empenho.id,
        numero_ne: empenho.numero_empenho,
        tipo_acao: tipoAjuste.toUpperCase(),
        valor_operacao: valorNumerico * modificador,
        justificativa: justificativa,
        responsavel: user?.full_name || "Leonardo Pereira da Silva",
        data_acao: agoraISO
      });

      toast.success(`Operação de ${tipoAjuste} concluída.`);
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar ajuste orçamentário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl font-sans bg-white">
        <DialogHeader className="bg-[#1a2e4a] p-6 text-white">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Ajuste de Empenho</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">PTRES</Label>
              <Input value={formData.ptres} onChange={e => setFormData({...formData, ptres: e.target.value})} className="h-9 font-bold border-gray-300" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Natureza (ND)</Label>
              <Input value={formData.natureza_despesa} onChange={e => setFormData({...formData, natureza_despesa: e.target.value})} className="h-9 font-bold border-gray-300" />
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 space-y-4">
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={tipoAjuste === "reforco" ? "default" : "outline"}
                className={`flex-1 h-9 text-[10px] font-bold uppercase ${tipoAjuste === "reforco" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                onClick={() => setTipoAjuste("reforco")}
              >
                <TrendingUp className="w-3 h-3 mr-2" /> Reforço
              </Button>
              <Button 
                type="button"
                variant={tipoAjuste === "reducao" ? "default" : "outline"}
                className={`flex-1 h-9 text-[10px] font-bold uppercase ${tipoAjuste === "reducao" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => setTipoAjuste("reducao")}
              >
                <TrendingDown className="w-3 h-3 mr-2" /> Redução
              </Button>
            </div>
            
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Valor do Ajuste (R$)</Label>
              <Input 
                type="number" 
                value={valorAjuste} 
                onChange={e => setValorAjuste(e.target.value)}
                placeholder="0,00"
                className="font-mono text-lg h-11 border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> Justificativa da Alteração *
            </Label>
            <Textarea 
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo técnico..."
              className="h-24 resize-none border-gray-300 text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving} className="bg-[#1a2e4a] text-white uppercase text-[10px] font-black px-8 h-11">
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}