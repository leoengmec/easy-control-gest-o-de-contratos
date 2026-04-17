import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const STATUS_MAP = {
  "Pago": "Pago",
  "Aprovisionado": "Aprovisionado",
  "SOF": "SOF",
  "Cancelado": "Cancelado",
  "Em execução": "Em execução",
  "Em instrução": "Em instrução",
};

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [contratoSelecionado, setContratoSelecionado] = useState("");
  const fileInputRef = useRef(null);

  const parseExcelDate = (excelDate) => {
    if (!excelDate) return null;
    
    // Se já é uma string no formato YYYY-MM-DD
    if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      return excelDate.split('T')[0];
    }
    
    // Se é timestamp do Excel (dias desde 1900-01-01)
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Se é string de data/hora do Excel
    if (typeof excelDate === 'string') {
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  const extrairContratoNumero = (vigencia) => {
    if (!vigencia) return null;
    // Extrai "23/2020" de "23/2020_1"
    const match = vigencia.match(/^(\d+\/\d+)/);
    return match ? match[1] : null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!contratoSelecionado) {
      alert("Selecione um contrato antes de fazer o upload.");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const resultado = await base44.functions.invoke('processarPlanilhaLancamentos', {
        fileUrl: file_url,
        contratoId: contratoSelecionado
      });

      if (resultado.data.sucesso && resultado.data.lancamentosValidos > 0) {
        setPreview(resultado.data.dados);
        
        if (resultado.data.erros > 0) {
          console.warn('Erros encontrados:', resultado.data.detalhesErros);
          alert(`Planilha processada!\n${resultado.data.lancamentosValidos} lançamentos válidos.\n${resultado.data.erros} linhas com erro (verifique o console).`);
        }
      } else {
        alert(`Erro ao processar a planilha.\n${resultado.data.erros} linhas com erro.\nDetalhes: ${JSON.stringify(resultado.data.detalhesErros.slice(0, 3))}`);
      }
    } catch (error) {
      alert("Erro ao fazer upload da planilha: " + error.message);
      console.error(error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleImportar = async () => {
    if (!contratoSelecionado) {
      alert("Selecione um contrato antes de importar.");
      return;
    }

    setProcessing(true);
    try {
      let sucessos = 0;
      let erros = 0;

      for (const lanc of preview) {
        try {
          await base44.entities.LancamentoFinanceiro.create({
            contrato_id: contratoSelecionado,
            ano: lanc.ano,
            mes: lanc.mes,
            status: lanc.status,
            valor: lanc.valor,
            item_label: lanc.item_label,
            os_local: lanc.os_local,
            os_numero: lanc.os_numero,
            os_data: lanc.os_data,
            numero_nf: lanc.numero_nf,
            data_nf: lanc.data_nf,
            data_lancamento: lanc.data_lancamento,
            processo_pagamento_sei: lanc.processo_pagamento_sei,
            ordem_bancaria: lanc.ordem_bancaria,
            observacoes: lanc.observacoes,
          });
          sucessos++;
        } catch (error) {
          console.error("Erro ao criar lançamento:", error);
          erros++;
        }
      }

      alert(`Importação concluída!\n${sucessos} lançamentos criados com sucesso.\n${erros} erros.`);
      onComplete();
    } catch (error) {
      alert("Erro durante a importação: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1a2e4a]">Importar Lançamentos em Lote</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        
        {/* Upload */}
        {!preview && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>1. Selecione o Contrato</Label>
              <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o contrato para importação" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero} – {c.contratada}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>2. Faça o Upload da Planilha Excel (.xlsx)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                  Clique para selecionar ou arraste a planilha aqui
                </p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !contratoSelecionado}
                  className="bg-[#1a2e4a] hover:bg-[#2a4a7a]"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </>
                  )}
                </Button>
                {!contratoSelecionado && (
                  <p className="text-xs text-amber-600 mt-2">
                    Selecione um contrato primeiro
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
              <p className="font-semibold mb-2">Formato esperado da planilha:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Data de referência, Vigência, Local, Natureza da despesa</li>
                <li>Ordem de serviços, Data da OS, Valor NF</li>
                <li>Nº NF, Data de Emissão, Status</li>
                <li>Processo SEI, Ordem bancária, Observação</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">
                    {preview.length} lançamento(s) prontos para importação
                  </p>
                  <p className="text-xs text-green-600">
                    Contrato: {contratos.find(c => c.id === contratoSelecionado)?.numero}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreview(null)}
              >
                Cancelar
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border-b font-medium">Mês/Ano</th>
                    <th className="text-left p-2 border-b font-medium">Item</th>
                    <th className="text-left p-2 border-b font-medium">Local</th>
                    <th className="text-right p-2 border-b font-medium">Valor</th>
                    <th className="text-left p-2 border-b font-medium">NF</th>
                    <th className="text-left p-2 border-b font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((lanc, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {lanc.mes && lanc.ano ? `${lanc.mes}/${lanc.ano}` : "—"}
                      </td>
                      <td className="p-2">{lanc.item_label || "—"}</td>
                      <td className="p-2">{lanc.os_local || "—"}</td>
                      <td className="p-2 text-right font-semibold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(lanc.valor)}
                      </td>
                      <td className="p-2">{lanc.numero_nf || "—"}</td>
                      <td className="p-2">{lanc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                disabled={processing}
              >
                Voltar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}