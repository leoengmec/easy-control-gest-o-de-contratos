import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";

export default function EditorEmpenho({ empenho, contratos, open, onOpenChange, onUpdate, user }) {
  const [saving, setSaving] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState("reforco"); 
  const [valorAjuste, setValorAjuste] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  const [formData, setFormData] = useState({
    numero_empenho: "", 
    contrato_id: "", 
    ptres: "", 
    natureza_despesa: "", 
    subelemento: "", 
    processo_sei: "", 
    ano: new Date().getFullYear()
  });

  // Sincroniza dados ao abrir o modal
  useEffect(() => {
    if (open && empenho) {
      setFormData({
        numero_empenho: empenho.numero_empenho || "",
        contrato_id: empenho.contrato_id || "",
        ptres: empenho.ptres || "",
        natureza_despesa: empenho.natureza_despesa || "",
        subelemento: empenho.subelemento || "",
        processo_sei: empenho.processo_sei || "",
        ano: empenho.ano || new Date().getFullYear()
      });
      setValorAjuste("");
      setJustificativa("");
    }
  }, [open, empenho]);

  const handleSalvar = async () => {
    if (!valorAjuste || Number(valorAjuste) <= 0) {
      return toast.error("Informe um valor válido para o ajuste");
    }
    if (!justificativa.trim()) {
      return toast.error("A justificativa técnica é obrigatória");
    }

    setSaving(true);
    try {
      const valorNumerico = parseFloat(valorAjuste);
      const saldoAtual = parseFloat(empenho.valor_saldo || 0);
      const totalAtual = parseFloat(empenho.valor_total || 0);
      
      // REGRA: Cálculo de Saldo realizado no Front-end
      const novoSaldo = tipoAjuste === "reforco" 
        ? saldoAtual + valorNumerico 
        : saldoAtual - valorNumerico;

      const novoTotal = tipoAjuste === "reforco"
        ? totalAtual + valorNumerico
        : totalAtual - valorNumerico;

      if (novoSaldo < 0) {
        throw new Error("Saldo insuficiente na nota de empenho para realizar esta anulação.");
      }

      // 1. Atualização da Nota de Empenho (Persistência de valor absoluto)
      await base44.entities.NotaEmpenho.update(empenho.id, {
        ...formData,
        valor_total: novoTotal,
        valor_saldo: novoSaldo,
        responsavel_alteracao: user?.full_name || user?.email || "Usuário Sistema",
        data_ultima_alteracao: new Date().toISOString()
      });

      // 2. Registro na LogAuditoria (Substituindo HistoricoOrcamento conforme Schema)
      await base44.entities.LogAuditoria.create({
        entidade_id: empenho.id,
        tipo_acao: tipoAjuste === "reforco" ? "REFORCO_EMPENHO" : "ANULACAO_EMPENHO",
        valor_operacao: valorNumerico,
        justificativa: justificativa,
        responsavel: user?.full_name || user?.email || "Sistema",
        data_acao: new Date().toISOString()
      });

      toast.success("Empenho atualizado e log de auditoria registrado!");
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro na operação:", error);
      toast.error(error.message || "Erro ao processar alteração no empenho");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-t-4 border-[#1a2e4a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a2e4a] uppercase font-black tracking-tighter">
            <FileText className="w-5 h-5" /> Editor de Nota de Empenho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase opacity-60">Tipo de Movimentação</Label>
              <Select value={tipoAjuste} onValueChange={setTipoAjuste}>
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reforco" className="text-green-600 font-bold">➕ REFORÇO</SelectItem>
                  <SelectItem value="anulacao" className="text-red-600 font-bold">➖ ANULAÇÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase opacity-60">Valor (R$)</Label>
              <Input 
                type="number" 
                value={valorAjuste} 
                onChange={e => setValorAjuste(e.target.value)} 
                placeholder="0,00" 
                className="font-mono text-lg h-11 border-gray-300" 
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
              placeholder="Descreva o motivo desta alteração orçamentária..." 
              className="h-24 resize-none text-xs border-gray-300 focus:ring-[#1a2e4a]" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="uppercase text-[10px] font-bold">Cancelar</Button>
            <Button 
              onClick={handleSalvar} 
              disabled={saving} 
              className="bg-[#1a2e4a] hover:bg-[#2c4a75] text-white uppercase text-[10px] font-black px-8 h-11 shadow-lg transition-all"
            >
              {saving ? <Loader2 className="animate-spin" /> : "Gravar Alteração"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}