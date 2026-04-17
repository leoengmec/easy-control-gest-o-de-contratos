import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle, Loader2 } from "lucide-react";

// DICIONÁRIO DE TRADUÇÃO: Mapeia o nome na sua planilha para o campo no banco
const DICIONARIO_CAMPOS = {
  "Mês de referência": "mes",
  "Mês": "mes",
  "Ano": "ano",
  "Valor NF": "valor",
  "Valor pago": "valor",
  "Natureza da despesa": "item_label",
  "Objeto do Contrato": "item_label",
  "Nº NF": "numero_nf",
  "Data de Emissão": "data_nf",
  "Processo SEI": "processo_pagamento_sei",
  "Ordem bancária": "ordem_bancaria",
  "Status": "status",
  "Observação": "observacoes"
};

const MESES_TEXTO = {
  "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
  "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
};

export default function ImportarLancamentosLote({ contratos, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [dadosParaGravar, setDadosParaGravar] = useState(null);
  const [contratoId, setContratoId] = useState("");
  const fileInputRef = useRef(null);

  // Função que lê e traduz a planilha no navegador do usuário
  const processarArquivoLocal = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);

      const formatados = json.map(linha => {
        const novaLinha = {};
        Object.keys(linha).forEach(chaveOriginal => {
          const chaveTecnica = DICIONARIO_CAMPOS[chaveOriginal] || chaveOriginal;
          let valor = linha[chaveOriginal];

          // Converte mês de texto (Jan) para número (1)
          if (chaveTecnica === "mes" && typeof valor === "string") {
            valor = MESES_TEXTO[valor] || valor;
          }

          // Limpa R$ e formata número
          if (chaveTecnica === "valor" && typeof valor === "string") {
            valor = parseFloat(valor.replace(/[R$\s.]/g, "").replace(",", "."));
          }

          novaLinha[chaveTecnica] = valor;
        });
        return novaLinha;
      });

      setDadosParaGravar(formatados);
    };
    reader.readAsBinaryString(file);
  };

  const salvarNoBanco = async () => {
    if (!contratoId || !dadosParaGravar) return;
    setLoading(true);

    let sucessos = 0;
    let erros = 0;

    try {
      for (const item of dadosParaGravar) {
        try {
          // Cria o registro diretamente na Entidade (Gasta 0 créditos de Function)
          await base44.entities.LancamentoFinanceiro.create({
            ...item,
            contrato_id: contratoId,
            ano: Number(item.ano),
            mes: Number(item.mes),
            valor: Number(item.valor || 0)
          });
          sucessos++;
        } catch (err) {
          console.error("Erro na linha:", item, err);
          erros++;
        }
      }
      alert(`Fim do processo. Sucessos: ${sucessos} | Erros: ${erros}`);
      onComplete();
    } catch (err) {
      alert("Erro ao conectar com o banco: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-2xl border-t-4 border-[#1a2e4a]">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle>Importador de Lançamentos</CardTitle>
          <X className="cursor-pointer text-gray-400" onClick={onCancel} />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="font-bold text-[#1a2e4a]">Selecione o Contrato Destino</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!dadosParaGravar ? (
          <div 
            className="border-2 border-dashed border-gray-200 p-12 text-center rounded-xl hover:bg-gray-50 cursor-pointer"
            onClick={() => contratoId && fileInputRef.current.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={processarArquivoLocal} />
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold">Subir Planilha Original</p>
            <p className="text-xs text-gray-400">Suas colunas originais serão mapeadas automaticamente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{dadosParaGravar.length} linhas prontas para salvar.</span>
            </div>
            <Button className="w-full bg-[#1a2e4a] h-12" onClick={salvarNoBanco} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Importação"}
            </Button>
            <Button variant="ghost" className="w-full text-gray-400" onClick={() => setDadosParaGravar(null)} disabled={loading}>Substituir Arquivo</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}