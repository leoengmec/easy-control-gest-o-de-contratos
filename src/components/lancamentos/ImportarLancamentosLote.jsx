import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

// TRADUTOR INTELIGENTE: Mapeia o que está na planilha para o que está no Banco
const DE_PARA = {
  "Mês de referência": "mes",
  "Mês": "mes",
  "Ano": "ano",
  "Valor NF": "valor",
  "Valor pago": "valor",
  "Objeto do Contrato": "item_label",
  "Natureza da despesa": "item_label",
  "Nº NF": "numero_nf",
  "Nota Fiscal": "numero_nf",
  "Data de Emissão": "data_nf",
  "Data da NF": "data_nf",
  "Processo SEI": "processo_pagamento_sei",
  "Ordem bancária": "ordem_bancaria",
  "Status": "status"
};

const MESES_MAP = {
  "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
  "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
};

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [dadosTratados, setDadosTratados] = useState(null);
  const [contratoId, setContratoId] = useState("");
  const fileInputRef = useRef(null);

  const processarPlanilhaLocal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);

      // ADEQUAÇÃO AUTOMÁTICA DOS CAMPOS
      const formatados = json.map(linha => {
        const novaLinha = {};
        Object.keys(linha).forEach(campoOriginal => {
          const campoTecnico = DE_PARA[campoOriginal] || campoOriginal;
          let valor = linha[campoOriginal];

          if (campoTecnico === "mes" && typeof valor === "string") valor = MESES_MAP[valor] || valor;
          if (campoTecnico === "valor" && typeof valor === "string") {
            valor = parseFloat(valor.replace(/[R$\s.]/g, "").replace(",", "."));
          }
          
          novaLinha[campoTecnico] = valor;
        });
        return novaLinha;
      });

      setDadosTratados(formatados);
    };
    reader.readAsBinaryString(file);
  };

  const executarImportacao = async () => {
    if (!contratoId || !dadosTratados) return;
    setLoading(true);

    try {
      let sucessos = 0;
      // Cria um por um direto na Entidade (isso não usa créditos de Function)
      for (const item of dadosTratados) {
        try {
          await base44.entities.LancamentoFinanceiro.create({
            ...item,
            contrato_id: contratoId,
            ano: Number(item.ano),
            mes: Number(item.mes),
            valor: Number(item.valor)
          });
          sucessos++;
        } catch (e) {
          console.error("Erro na linha:", item, e);
        }
      }
      alert(`Importação concluída: ${sucessos} registros criados.`);
      onComplete();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-2xl border-t-4 border-[#1a2e4a]">
      <CardHeader className="bg-white rounded-t-lg border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#1a2e4a]">Importador Inteligente (Modo Local)</CardTitle>
          <X className="cursor-pointer text-gray-400 hover:text-red-500" onClick={onCancel} />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">1. Escolha o Contrato</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!dadosTratados ? (
          <div 
            className="border-2 border-dashed border-blue-200 p-12 text-center hover:bg-blue-50 transition-all rounded-xl cursor-pointer"
            onClick={() => contratoId && fileInputRef.current.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={processarPlanilhaLocal} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <p className="text-[#1a2e4a] font-semibold">Subir Planilha Original</p>
            <p className="text-xs text-gray-400 mt-2">O sistema vai traduzir "Mês de referência" e "Valor NF" automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-green-600" />
              <span className="text-sm font-bold text-green-800">{dadosTratados.length} linhas prontas para salvar.</span>
            </div>
            <Button className="w-full bg-[#1a2e4a] h-12" onClick={executarImportacao} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmar e Salvar no Banco"}
            </Button>
            <Button variant="ghost" className="w-full text-gray-400" onClick={() => setDadosTratados(null)} disabled={loading}>Trocar arquivo</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}