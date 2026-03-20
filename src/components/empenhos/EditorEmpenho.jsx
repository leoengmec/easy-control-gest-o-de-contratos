import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, contratos, open, onOpenChange, onUpdate, user }) {
  const [saving, setSaving] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState("reforco"); 
  const [valorAjuste, setValorAjuste] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  const [formData, setFormData] = useState({
    numero_empenho: "", contrato_id: "", ptres: "", natureza_despesa: "", subelemento: "", processo_sei: "", ano: new Date().getFullYear()
  });

  useEffect(() => {
    if (open) {
      setFormData({
        numero_empenho: empenho?.numero_empenho || "",
        contrato_id: empenho?.contrato_id || "",
        ptres: empenho?.ptres || "168312",
        natureza_despesa: empenho?.natureza_despesa || "339039",
        subelemento: empenho?.subelemento || "17",
        processo_sei: empenho?.processo_sei || "",
        ano: empenho?.ano || new Date().getFullYear()
      });
      setJustificativa("");
      setValorAjuste("");
      setTipoAjuste("reforco");
    }
  }, [empenho, open]);

  const handleSalvar = async () => {
    if (!justificativa.trim()) return toast.error("A justificativa é obrigatória.");
    if (!formData.contrato_id) return toast.error("Selecione o contrato vinculado.");
    
    const valorNum = parseFloat(valorAjuste) || 0;
    if (valorNum <= 0) return toast.error("Informe um valor válido.");

    setSaving(true);
    const mod = tipoAjuste === "reforco" ? 1 : -1;
    const agora = new Date().toISOString();

    try {
      if (empenho?.id) {
        const novoTotal = Number(empenho.valor_total || 0) + (valorNum * mod);
        const novoSaldo = Number(empenho.valor_saldo || 0) + (valorNum * mod);

        await base44.entities.NotaEmpenho.update(empenho.id, {
          ...formData,
          valor_total: novoTotal,
          valor_saldo: novoSaldo,
          responsavel_alteracao: "Leonardo Pereira da Silva",
          data_ultima_alteracao: agora
        });

        await base44.entities.HistoricoOrcamento.create({
          entidade_id: empenho.id,
          tipo_acao: tipoAjuste.toUpperCase(),
          valor_operacao: valorNum * mod,
          justificativa,
          responsavel: "Leonardo Pereira da Silva",
          data_acao: agora
        });
      } else {
        await base44.entities.NotaEmpenho.create({
          ...formData,
          valor_total: valorNum,
          valor_saldo: valorNum,
          responsavel_alteracao: "Leonardo Pereira da Silva",
          data_ultima_alteracao: agora
        });
      }

      toast.success("Operação concluída!");
      onUpdate();
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl bg-white font-sans">
        <DialogHeader className="bg-[#1a2e4a] p-6 text-white">
          <div className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} /> {empenho ? "Ajuste de Orçamento" : "Novo Empenho Anual"}
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">Contrato Vinculado</Label>
            <Select value={formData.contrato_id} onValueChange={v => setFormData({...formData, contrato_id: v})}>
              <SelectTrigger className="h-9 font-bold border-gray-300">
                <SelectValue placeholder="Selecione o Contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos?.map(c => (
                  <SelectItem key={c.id} value={c.id}>Contrato {c.numero_contrato} - {c.empresa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Número NE</Label>
              <Input value={formData.numero_empenho} onChange={e => setFormData({...formData, numero_empenho: e.target.value.toUpperCase()})} className="h-9 font-bold" placeholder="2026NE..." />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">PTRES</Label>
              <Input value={formData.ptres} onChange={e => setFormData({...formData, ptres: e.target.value})} className="h-9 font-bold" />
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed bg-gray-50/50 space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={tipoAjuste === "reforco" ? "default" : "outline"} className={`flex-1 h-9 text-[10px] font-bold uppercase ${tipoAjuste === "reforco" ? "bg-green-600 text-white" : ""}`} onClick={() => setTipoAjuste("reforco")}>
                <TrendingUp className="w-3 h-3 mr-2" /> {empenho ? "Reforço" : "Valor Inicial"}
              </Button>
              {empenho && (
                <Button type="button" variant={tipoAjuste === "reducao" ? "default" : "outline"} className={`flex-1 h-9 text-[10px] font-bold uppercase ${tipoAjuste === "reducao" ? "bg-red-600 text-white" : ""}`} onClick={() => setTipoAjuste("reducao")}>
                  <TrendingDown className="w-3 h-3 mr-2" /> Redução
                </Button>
              )}
            </div>
            <Input type="number" value={valorAjuste} onChange={e => setValorAjuste(e.target.value)} placeholder="0,00" className="font-mono text-lg h-11 border-gray-300" />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1"><AlertCircle size={12} /> Justificativa</Label>
            <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Descreva o motivo técnico..." className="h-20 resize-none text-xs border-gray-300" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving} className="bg-[#1a2e4a] text-white uppercase text-[10px] font-black px-8 h-11 shadow-lg">
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Registro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}