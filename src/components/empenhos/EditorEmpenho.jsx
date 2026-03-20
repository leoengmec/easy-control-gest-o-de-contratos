import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
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
        ano: empenho?.ano || new Date().getFullYear()
      });
      setJustificativa("");
      setValorAjuste("");
      setTipoAjuste("reforco");
    }
  }, [empenho, open]);

  const handleSalvar = async () => {
    if (!formData.contrato_id) return toast.error("Selecione um contrato.");
    if (!justificativa.trim()) return toast.error("Justificativa técnica obrigatória.");
    
    const valorNum = parseFloat(valorAjuste) || 0;
    if (valorNum <= 0) return toast.error("Informe um valor válido.");

    setSaving(true);
    const mod = tipoAjuste === "reforco" ? 1 : -1;
    const agora = new Date().toISOString();

    try {
      if (empenho?.id) {
        // Cálculo no Front-end (conforme confirmado pelo Base44)
        const novoTotal = Number(empenho.valor_total || 0) + (valorNum * mod);
        const novoSaldo = Number(empenho.valor_saldo || 0) + (valorNum * mod);

        // 1. Atualiza a Nota de Empenho
        await base44.entities.NotaEmpenho.update(empenho.id, {
          ...formData,
          valor_total: novoTotal,
          valor_saldo: novoSaldo,
          responsavel_alteracao: "Leonardo Pereira da Silva",
          data_ultima_alteracao: agora
        });

        // 2. CORREÇÃO: Salva na tabela LogAuditoria (a única que aceita esses campos)
        await base44.entities.LogAuditoria.create({
          entidade_id: empenho.id,
          tipo_acao: tipoAjuste.toUpperCase(),
          valor_operacao: valorNum * mod,
          justificativa: justificativa,
          responsavel: "Leonardo Pereira da Silva",
          data_acao: agora
        });
      } else {
        // Criação de novo registro
        await base44.entities.NotaEmpenho.create({
          ...formData,
          valor_total: valorNum,
          valor_saldo: valorNum,
          responsavel_alteracao: "Leonardo Pereira da Silva",
          data_ultima_alteracao: agora
        });
      }

      toast.success("Dados persistidos no Base44 com sucesso.");
      onUpdate();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro de Schema: Verifique se a tabela LogAuditoria existe.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden font-sans border-none shadow-2xl">
        <DialogHeader className="bg-[#1a2e4a] p-6 text-white text-xl font-black uppercase">
          Ajuste do Empenho
        </DialogHeader>
        <div className="p-6 space-y-4 bg-white">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase text-gray-400">Contrato Vinculado</Label>
            <Select value={formData.contrato_id} onValueChange={v => setFormData({...formData, contrato_id: v})}>
              <SelectTrigger className="font-bold text-[#1a2e4a] border-gray-300">
                <SelectValue placeholder="Selecione..." />
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
          {/* ... restante dos campos de Input (Numero NE, Valor, Justificativa) mantidos como na versão anterior ... */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase font-bold text-xs">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving} className="bg-[#1a2e4a] text-white font-black uppercase px-8 h-11">
              {saving ? <Loader2 className="animate-spin" /> : "Confirmar no Banco"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}