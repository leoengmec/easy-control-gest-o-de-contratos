import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle2, Upload } from "lucide-react";

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
      console.error("Erro no processamento do PDF:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let resLancamento;
      if (lancamento?.id) {
        resLancamento = await base44.entities.LancamentoFinanceiro.update(lancamento.id, formData);
      } else {
        resLancamento = await base44.entities.LancamentoFinanceiro.create(formData);
      }

      // Proteção: usa ?.find para evitar erro se 'itens' for nulo
      const itemSelecionado = itens?.find(i => i.id === formData.item_contrato_id);
      const isMaterial = itemSelecionado?.nome === "Fornecimento de Materiais" 
                         || formData.item_contrato_id?.includes("material");

      if (isMaterial && extraido?.itens_material?.length > 0) {
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
            lancamento_financeiro_id: resLancamento.id
          });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      onSave();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-blue-600">
      <CardContent className="pt-6 font-sans">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-blue-600" />
            <h2 className="text-lg font-bold text-[#1a2e4a]">
              {lancamento ? "Editar Lançamento" : "Novo Lançamento"}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contrato</Label>
              <Select value={formData.contrato_id} onValueChange={v => setFormData({...formData, contrato_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {/* PROTEÇÃO: contratos?.map evita erro se a lista for undefined */}
                  {contratos?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Item</Label>
              <Select value={formData.item_contrato_id} onValueChange={v => setFormData({...formData, item_contrato_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {/* PROTEÇÃO: itens?.map evita erro se a lista for undefined */}
                  {itens?.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 border-2 border-dashed rounded-xl bg-gray-50 flex flex-col items-center justify-center">
            {uploading ? (
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <Loader2 className="animate-spin" /> Processando PDF...
              </div>
            ) : extraido ? (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 size={20} /> NF {extraido.numero_nf} lida com sucesso!
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-medium">Importar PDF da Nota Fiscal</span>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1"><Label>NF</Label><Input value={formData.numero_nf} onChange={e => setFormData({...formData, numero_nf: e.target.value})} /></div>
            <div className="space-y-1"><Label>OS</Label><Input value={formData.os_numero} onChange={e => setFormData({...formData, os_numero: e.target.value})} /></div>
            <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" value={formData.valor} onChange={e => setFormData({...formData, valor: parseFloat(e.target.value)})} /></div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a] text-white" disabled={loading || uploading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Salvar Lançamento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}