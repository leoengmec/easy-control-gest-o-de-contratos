import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [contratoSelecionado, setContratoSelecionado] = useState("");
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !contratoSelecionado) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const resultado = await base44.functions.invoke('processarPlanilhaLancamentos', {
        fileUrl: file_url,
        contratoId: contratoSelecionado
      });

      if (resultado.data.sucesso && resultado.data.dados?.length > 0) {
        setPreview(resultado.data.dados);
      } else {
        const detalhes = resultado.data.detalhesErros?.[0]?.erros?.join(", ") || "Verifique o formato das colunas.";
        alert(`Erro de Validação: ${detalhes}`);
      }
    } catch (error) {
      alert("Erro ao processar arquivo: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportar = async () => {
    setProcessing(true);
    try {
      for (const lanc of preview) {
        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoSelecionado,
          ano: Number(lanc.ano),
          mes: Number(lanc.mes),
          valor: Number(lanc.valor),
          status: lanc.status || "Em instrução",
          item_label: lanc.item_label || "",
          numero_nf: String(lanc.numero_nf || ""),
          data_nf: lanc.data_nf || null,
          processo_pagamento_sei: String(lanc.processo_pagamento_sei || ""),
          ordem_bancaria: String(lanc.ordem_bancaria || ""),
          observacoes: lanc.observacoes || ""
        });
      }
      alert("Importação concluída com sucesso!");
      onComplete();
    } catch (error) {
      alert("Erro ao salvar registros: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border-t-4 border-t-[#1a2e4a]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a2e4a]">Importar Lote</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!preview ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione o Contrato</Label>
              <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
                <SelectTrigger><SelectValue placeholder="Contrato destino..." /></SelectTrigger>
                <SelectContent>
                  {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} - {c.contratada}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => !uploading && contratoSelecionado && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
              <Upload className="w-10 h-10 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Clique para enviar a planilha corrigida</p>
              <p className="text-xs text-gray-500 mt-2">Formato aceito: .xlsx com colunas técnicas</p>
              {uploading && <Loader2 className="w-6 h-6 mx-auto mt-4 animate-spin text-[#1a2e4a]" />}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-blue-900">{preview.length} itens prontos</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Trocar arquivo</Button>
            </div>
            <Button className="w-full bg-[#1a2e4a]" onClick={handleImportar} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirmar Importação"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}