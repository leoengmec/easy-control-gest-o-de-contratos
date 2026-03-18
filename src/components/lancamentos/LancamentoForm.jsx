import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle2, Upload, X } from "lucide-react";

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extraido, setExtraido] = useState(null);

  const [formData, setFormData] = useState({
    contrato_id: lancamento?.contrato_id || "",
    item_contrato_id: lancamento?.item_contrato_id || "",
    mes: lancamento?.mes || new Date().getMonth() + 1,
    ano: lancamento?.ano || new Date().getFullYear(),
    valor: lancamento?.valor || 0,
    status: lancamento?.status || "Em instrução",
    numero_nf: lancamento?.numero_nf || "",
    os_numero: lancamento?.os_numero || "",
    os_local: lancamento?.os_local || "Natal",
    arquivo_url: lancamento?.arquivo_url || ""
  });

  // 1. Extração de PDF com a IA do Base44
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await base44.storage.upload(file);
      const result = await base44.ai.extractFromPdf(url, {
        numero_nf: "string",
        data_nf: "string",
        valor_total: "number",
        os_numero: "string",
        itens_material: "array"
      });

      if (result) {
        setExtraido(result);
        setFormData(prev => ({
          ...prev,
          arquivo_url: url,
          numero_nf: result.numero_nf || prev.numero_nf,
          valor: result.valor_total || prev.valor,
          os_numero: result.os_numero || prev.os_numero
        }));
      }
    } catch (err) {
      console.error("Erro no processamento:", err);
    } finally {
      setUploading(false);
    }
  };

  // 2. Salvamento SEQUENCIAL (Fila) para evitar Erro 429
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contrato_id || !formData.item_contrato_id) {
      alert("Por favor, selecione o contrato e o tipo de item.");
      return;
    }

    setLoading(true);
    try {
      // Salva o Lançamento Principal
      const resLancamento = lancamento?.id 
        ? await base44.entities.LancamentoFinanceiro.update(lancamento.id, formData)
        : await base44.entities.LancamentoFinanceiro.create(formData);

      // Verifica se é material para salvar os itens individualmente
      const itemSelecionado = itens?.find(i => i.id === formData.item_contrato_id);
      const isMaterial = itemSelecionado?.nome === "Fornecimento de Materiais";

      if (isMaterial && extraido?.itens_material?.length > 0) {
        // Loop sequencial: um por um para não congestionar o servidor
        for (const item of extraido.itens_material) {
          await base44.entities.ItemMaterialNF.create({
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total_item: item.valor_total_item,
            numero_nf: extraido.numero_nf,
            data_nf: extraido.data_nf,
            os_numero: extraido.os_numero || formData.os_numero,
            os_local: formData.os_local,
            lancamento_financeiro_id: resLancamento.id // Vínculo essencial
          });
          // Espera 200ms entre cada item
          await new Promise(r => setTimeout(r, 200));
        }
      }
      onSave();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar. Verifique se todos os campos estão preenchidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-t-4 border-blue-600">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1a2e4a]">Lançamento de Nota</h2>
            <Button type="button" variant="ghost" size="icon" onClick={onCancel}><X size={20}/></Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contrato</Label>
              <Select value={formData.contrato_id} onValueChange={v => setFormData({...formData, contrato_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {/* SEGURANÇA: contratos?.map evita o erro de undefined */}
                  {contratos?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.numero} - {c.contratada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de Item</Label>
              <Select value={formData.item_contrato_id} onValueChange={v => setFormData({...formData, item_contrato_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {/* SEGURANÇA: itens?.map evita o erro de undefined */}
                  {itens?.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Área de Upload/IA */}
          <div className={`p-6 border-2 border-dashed rounded-xl transition-all ${extraido ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-blue-600">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-sm font-bold uppercase tracking-wider">IA lendo PDF...</span>
              </div>
            ) : extraido ? (
              <div className="flex flex-col items-center gap-1 text-green-700">
                <CheckCircle2 size={32} />
                <span className="font-bold uppercase text-xs">Leitura concluída com sucesso!</span>
                <span className="text-[10px] opacity-70">NF {extraido.numero_nf} · {extraido.itens_material?.length || 0} itens detectados</span>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center hover:opacity-70 transition-opacity">
                <Upload className="w-10 h-10 text-blue-500 mb-2" />
                <span className="text-sm font-bold text-gray-600">Importar PDF da Nota</span>
                <span className="text-[10px] text-gray-400">Os campos serão preenchidos automaticamente</span>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label>NF</Label><Input value={formData.numero_nf} onChange={e => setFormData({...formData, numero_nf: e.target.value})} /></div>
            <div className="space-y-1"><Label>OS</Label><Input value={formData.os_numero} onChange={e => setFormData({...formData, os_numero: e.target.value})} /></div>
            <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" value={formData.valor} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})} /></div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8" disabled={loading || uploading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Lançamento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}