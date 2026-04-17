import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [contratoSelecionado, setContratoSelecionado] = useState("");
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!contratoSelecionado) {
      alert("Por favor, selecione um contrato antes de subir o arquivo.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload do arquivo para o storage do Base44
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Chama a Edge Function para processar a planilha
      const resultado = await base44.functions.invoke('processarPlanilhaLancamentos', {
        fileUrl: file_url,
        contratoId: contratoSelecionado
      });

      if (resultado.data.sucesso && resultado.data.dados?.length > 0) {
        setPreview(resultado.data.dados);
        if (resultado.data.erros > 0) {
          alert(`Planilha processada com avisos: ${resultado.data.erros} linhas ignoradas por erro.`);
        }
      } else {
        const erroMsg = resultado.data.detalhesErros?.[0]?.erros?.join(", ") || "Formato de colunas inválido.";
        alert(`Erro ao processar: ${erroMsg}`);
      }
    } catch (error) {
      alert("Erro na comunicação com o servidor: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImportar = async () => {
    if (!preview || preview.length === 0) return;

    setProcessing(true);
    let sucessos = 0;
    let erros = 0;

    try {
      // Loop de criação baseado na Entidade LancamentoFinanceiro
      for (const lanc of preview) {
        try {
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
          sucessos++;
        } catch (err) {
          console.error("Erro na linha:", lanc, err);
          erros++;
        }
      }

      alert(`Sucesso! ${sucessos} lançamentos criados. ${erros > 0 ? erros + " falhas." : ""}`);
      onComplete();
    } catch (error) {
      alert("Erro crítico durante a importação: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader className="bg-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a2e4a]">Importar Lançamentos</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={processing}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!preview ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">1. Selecione o Contrato Destino</Label>
              <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">2. Upload da Planilha (.xlsx)</Label>
              <div className="border-2 border-dashed border-blue-100 rounded-xl p-10 text-center bg-blue-50/30">
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-70" />
                <p className="text-sm text-gray-600 mb-4">Certifique-se que as colunas seguem o padrão técnico (ano, mes, valor...).</p>
                <Button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading || !contratoSelecionado}
                  className="bg-[#1a2e4a]"
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? "Processando Arquivo..." : "Selecionar Planilha"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
              <div>
                <p className="font-bold text-green-800">{preview.length} lançamentos validados</p>
                <p className="text-xs text-green-600">Clique em confirmar para salvar no banco de dados.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreview(null)} disabled={processing}>Alterar Arquivo</Button>
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left border-b">Referência</th>
                    <th className="p-2 text-left border-b">Item</th>
                    <th className="p-2 text-right border-b">Valor</th>
                    <th className="p-2 text-left border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((l, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2">{l.mes}/{l.ano}</td>
                      <td className="p-2">{l.item_label}</td>
                      <td className="p-2 text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                      </td>
                      <td className="p-2">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleImportar} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              {processing ? "Salvando no Banco..." : "Confirmar Importação em Lote"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}