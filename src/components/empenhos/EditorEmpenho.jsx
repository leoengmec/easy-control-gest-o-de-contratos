import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, open, onOpenChange, onUpdate, user }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    numero_empenho: "",
    valor_total: "",
    valor_saldo: "",
    observacoes: ""
  });

  useEffect(() => {
    if (empenho && open) {
      setFormData({
        numero_empenho: empenho.numero_empenho || "",
        valor_total: formatMoneyInput((empenho.valor_total || 0).toFixed(2).replace(".", "")),
        valor_saldo: formatMoneyInput((empenho.valor_saldo || 0).toFixed(2).replace(".", "")),
        observacoes: empenho.observacoes || ""
      });
    }
  }, [empenho, open]);

  const formatMoneyInput = (value) => {
    if (!value) return "";
    const cleanValue = value.toString().replace(/\D/g, "");
    if (cleanValue === "") return "";
    const numberValue = Number(cleanValue) / 100;
    return numberValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseMoneyValue = (formattedValue) => {
    if (!formattedValue) return 0;
    const cleanStr = formattedValue.toString().replace(/\./g, "").replace(",", ".");
    return Number(cleanStr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await base44.entities.NotaEmpenho.update(empenho.id, {
        numero_empenho: formData.numero_empenho,
        valor_total: parseMoneyValue(formData.valor_total),
        valor_saldo: parseMoneyValue(formData.valor_saldo),
        observacoes: formData.observacoes
      });
      
      toast.success("Empenho atualizado com sucesso!");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar empenho:", error);
      toast.error("Erro ao atualizar os dados do empenho.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-[#1a2e4a] p-6 text-white">
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Editar Nota de Empenho</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase">Número NE *</Label>
            <Input 
              required
              value={formData.numero_empenho}
              onChange={(e) => setFormData({...formData, numero_empenho: e.target.value})}
              className="h-11 border-gray-300 font-bold uppercase"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase">Valor Total (R$) *</Label>
              <Input 
                required
                value={formData.valor_total}
                onChange={(e) => setFormData({...formData, valor_total: formatMoneyInput(e.target.value)})}
                className="h-11 border-gray-300 font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase">Valor Saldo (R$) *</Label>
              <Input 
                required
                value={formData.valor_saldo}
                onChange={(e) => setFormData({...formData, valor_saldo: formatMoneyInput(e.target.value)})}
                className="h-11 border-gray-300 font-mono text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase">Observações</Label>
            <Textarea 
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              className="resize-none h-24 border-gray-300"
              placeholder="Adicione notas ou justificativas..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="uppercase text-xs font-bold h-11 px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white uppercase text-xs font-black h-11 px-8 shadow-lg">
              {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}