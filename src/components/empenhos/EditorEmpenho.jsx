import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, contratos, open, onOpenChange, onUpdate }) {
  const [saving, setSaving] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState("reforco"); 
  const [valorAjuste, setValorAjuste] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  const [formData, setFormData] = useState({
    numero_empenho: "", 
    contrato_id: "", 
    ptres: "168312", 
    natureza_despesa: "339039", 
    subelemento: "17", 
    processo_sei: "", 
    ano: new Date().getFullYear()
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
    if (!formData.contrato_id) return toast.error("Vínculo com o contrato é obrigatório.");
    if (!justificativa.trim()) return toast.error("A justificativa técnica é obrigatória.");
    
    const valorNum = parseFloat(valorAjuste) || 0;
    if (valorNum <= 0) return toast.error("Informe um valor válido para o ajuste.");

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

      toast.success("Operação realizada com sucesso.");
      onUpdate();
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl bg-white font-sans">
        <DialogHeader className="bg-[#1a2e4a] p-6 text-white">
          <div className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-blue-300" /> Ajuste do Empenho
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-4 bg-white">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1">
              <Link2 size={12} /> Contrato Vinculado (SIAFI/JFRN)
            </Label>
            <Select 
              value={formData.contrato_id} 
              onValueChange={v => setFormData({...formData, contrato_id: v})}
            >
              <SelectTrigger className="h-10 font-bold border-gray-300 bg-gray-50/30 text-[#1a2e4a]">
                <SelectValue placeholder="Selecione o Contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos?.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.numero} - {c.contratada}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Número da NE</Label>
              <Input 
                value={formData.numero_empenho} 
                onChange={e => setFormData({...formData, numero_empenho: e.target.value.toUpperCase()})} 
                className="h-9 font-bold border-gray-300 text-[#1a2e4a]" 
                placeholder="2026NE..." 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-gray-400">Ano Fiscal</Label>
              <Input 
                type="number"
                value={formData.ano} 
                onChange={e => setFormData({...formData, ano: e.target.value})} 
                className="h-9 font-bold border-gray-300" 
              />
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
                <TrendingUp className="w-3 h-3 mr-2" /> {empenho ? "Reforço" : "Valor Inicial"}
              </Button>
              {empenho && (
                <Button 
                  type="button" 
                  variant={tipoAjuste === "reducao" ? "default" : "outline"} 
                  className={`flex-1 h-9 text-[10px] font-bold uppercase ${tipoAjuste === "reducao" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`} 
                  onClick={() => setTipoAjuste("reducao")}
                >
                  <TrendingDown className="w-3 h-3 mr-2" /> Redução
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase">Valor do Ajuste (R$)</Label>
              <Input 
                type="number" 
                value={valorAjuste} 
                onChange={e => setValorAjuste(e.target.value)} 
                placeholder="0,00" 
                className="font-mono text-lg h-11 border-gray-300 text-[#1a2e4a]" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> Justificativa Técnica
            </Label>
            <Textarea 
              value={justificativa} 
              onChange={e => setJustificativa(e.target.value)} 
              placeholder="Descreva o motivo..." 
              className="h-20 resize-none text-xs border-gray-300" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button 
              onClick={handleSalvar} 
              disabled={saving} 
              className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white uppercase text-[10px] font-black px-8 h-11"
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirmar Ajuste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}