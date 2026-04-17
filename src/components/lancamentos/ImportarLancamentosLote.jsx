import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

// DICIONÁRIO DE ADEQUAÇÃO: Mapeia nomes da planilha para campos da Entidade
const MAPA_CAMPOS = {
  "Mês de referência": "mes",
  "Mês": "mes",
  "Ano": "ano",
  "Valor NF": "valor",
  "Valor": "valor",
  "Valor pago": "valor",
  "Objeto do Contrato": "item_label",
  "Natureza da despesa": "item_label",
  "Nº NF": "numero_nf",
  "Nota Fiscal": "numero_nf",
  "Data de Emissão": "data_nf",
  "Data da NF": "data_nf",
  "Processo SEI": "processo_pagamento_sei",
  "Ordem bancária": "ordem_bancaria",
  "Status": "status",
  "Observação": "observacoes",
  "Observações": "observacoes"
};

const MAPA_MESES = {
  "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
  "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
};

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [contratoSelecionado, setContratoSelecionado] = useState("");
  const fileInputRef = useRef(null);

  // Função que adequa a nomenclatura da planilha para o código
  const adequarDados = (dadosOriginais) => {
    return dadosOriginais.map(linha => {
      const linhaAdeguada = {};
      
      Object.keys(linha).forEach(chaveOriginal => {
        const chaveDestino = MAPA_CAMPOS[chaveOriginal] || chaveOriginal;
        let valor = linha[chaveOriginal];

        // Tratamento especial para Mês (converte "Jan" para 1)
        if (chaveDestino === "mes" && typeof valor === "string") {
          valor = MAPA_MESES[valor] || valor;
        }

        // Tratamento especial para Valor (limpa R$ e símbolos)
        if (chaveDestino === "valor" && typeof valor === "string") {
          valor = parseFloat(valor.replace(/[R$\s.]/g, "").replace(",", "."));
        }

        linhaAdeguada[chaveDestino] = valor;
      });
      return linhaAdeguada;
    });
  };

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

      if (resultado.data.sucesso) {
        // Aqui o código adequa os nomes da planilha para os nomes da Entidade
        const dadosTratados = adequarDados(resultado.data.dados);
        setPreview(dadosTratados);
      } else {
        alert("Erro no processamento. Verifique se as colunas básicas existem.");
      }
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImportar = async () => {
    setProcessing(true);
    try {
      for (const lanc of preview) {
        await base44.entities.LancamentoFinanceiro.create({
          ...lanc,
          contrato_id: contratoSelecionado,
          ano: Number(lanc.ano),
          mes: Number(lanc.mes),
          valor: Number(lanc.valor)
        });
      }
      alert("Importação realizada com sucesso!");
      onComplete();
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-xl border-t-4 border-[#1a2e4a]">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Importar Planilha Estruturada</CardTitle>
          <Button variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <div className="space-y-4">
            <Label>Selecione o Contrato</Label>
            <Select value={contratoSelecionado} onValueChange={setContratoSelecionado}>
              <SelectTrigger><SelectValue placeholder="Contrato..." /></SelectTrigger>
              <SelectContent>
                {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
            <div 
              className="border-2 border-dashed p-10 text-center cursor-pointer hover:bg-gray-50"
              onClick={() => contratoSelecionado && fileInputRef.current.click()}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Upload className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Suba sua planilha habitual (Mês de referência, Valor NF, etc.)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-bold text-green-700 bg-green-50 p-3 rounded">
              {preview.length} linhas identificadas e mapeadas com sucesso.
            </div>
            <Button className="w-full bg-[#1a2e4a]" onClick={handleImportar} disabled={processing}>
              {processing ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Importação"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}