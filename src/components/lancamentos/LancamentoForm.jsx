import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

const SERVICE_ITEM_LABELS_FOR_OS = [
  "FORNECIMENTO DE MATERIAL",
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
  "SERVIÇOS EVENTUAIS",
  "FORNECIMENTO DE MATERIAIS",
];

function ItemNFCard({ entry, index, empenhos, onChange }) {
  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-[#1a2e4a]">{entry.item_label}</span>
        {entry.nota_empenho_id && (() => {
          const ne = empenhos?.find(e => e.id === entry.nota_empenho_id);
          return ne ? (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {ne.numero_empenho}
            </Badge>
          ) : null;
        })()}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Número da NF *</Label>
          <Input value={entry.numero_nf} onChange={e => onChange(index, "numero_nf", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data da NF *</Label>
          <Input type="date" value={entry.data_nf} onChange={e => onChange(index, "data_nf", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor da NF (R$) *</Label>
          <Input type="number" step="0.01" value={entry.valor} onChange={e => onChange(index, "valor", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date().toISOString().split("T")[0];

  const [contratoId, setContratoId] = useState(lancamento?.contrato_id || "");
  const [ano, setAno] = useState(lancamento?.ano || anoAtual);
  const [mes, setMes] = useState(lancamento?.mes || new Date().getMonth() + 1);
  const [status, setStatus] = useState(lancamento?.status || "Em instrução");
  const [processoPagSei, setProcessoPagSei] = useState(lancamento?.processo_pagamento_sei || "");
  const [ordemBancaria, setOrdemBancaria] = useState(lancamento?.ordem_bancaria || "");
  const [ordensServico, setOrdensServico] = useState(lancamento?.ordens_servico || [{ 
    numero: "", descricao: "", valor: "", locais_prestacao_servicos: [], data_emissao: "", data_execucao: "" 
  }]);
  
  const [itensLancamento, setItensLancamento] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [itensMaterialExtraidos, setItensMaterialExtraidos] = useState([]);
  const [user, setUser] = useState(null);
  const pdfInputRef = useRef(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelJustificativa, setCancelJustificativa] = useState("");
  const [pendingCancellations, setPendingCancellations] = useState([]);

  const itensContratoAtivos = itens?.filter(i => i.contrato_id === contratoId && i.ativo) || [];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Busca empenhos
  useEffect(() => {
    if (!contratoId) return;
    base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
      .then(setEmpenhos)
      .catch(() => setEmpenhos([]));
  }, [contratoId, ano]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf: { type: "string" },
            data_nf: { type: "string" },
            valor_total: { type: "number" },
            os_numero: { type: "string" },
            itens_material: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: { type: "string" },
                  unidade: { type: "string" },
                  quantidade: { type: "number" },
                  valor_unitario: { type: "number" },
                  valor_total_item: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const data = result.output;
        setItensMaterialExtraidos(data.itens_material || []);
        setItensLancamento(prev => prev.map(entry => ({
          ...entry,
          numero_nf: data.numero_nf || entry.numero_nf,
          data_nf: data.data_nf || hoje,
          valor: data.valor_total || entry.valor
        })));
        toast.success("Dados da NF extraídos!");
      }
    } catch (error) {
      toast.error("Erro no PDF: " + error.message);
    } finally {
      setExtractingPdf(false);
    }
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      for (const entry of (itensLancamento || [])) {
        const valor = parseFloat(entry.valor) || 0;
        
        // Salva Lançamento Financeiro
        const created = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          ano: parseInt(ano),
          mes: parseInt(mes),
          status,
          valor,
          numero_nf: entry.numero_nf,
          data_nf: entry.data_nf,
          item_label: entry.item_label,
          item_contrato_id: entry.item_contrato_id,
          processo_pagamento_sei: processoPagSei,
          ordens_servico: ordensServico
        });

        // Se for material, salva os itens da IA vinculados a este lançamento
        if (entry.item_label?.toUpperCase().includes("MATERIAL") && itensMaterialExtraidos?.length > 0) {
          for (const itemMat of itensMaterialExtraidos) {
            await base44.entities.ItemMaterialNF.create({
              ...itemMat,
              lancamento_financeiro_id: created.id,
              os_numero: ordensServico[0]?.numero || "",
              os_local: ordensServico[0]?.locais_prestacao_servicos?.[0] || "Natal",
              contrato_id: contratoId
            });
            await new Promise(r => setTimeout(r, 150));
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
      onSave();
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle className="text-[#1a2e4a]">Lançamento de Nota Fiscal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Contrato *</Label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {contratos?.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 border-2 border-dashed rounded-xl bg-gray-50 flex flex-col items-center">
            <input ref={pdfInputRef} type="file" className="hidden" onChange={handlePdfUpload} />
            <Button variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={extractingPdf}>
              {extractingPdf ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
              Importar Nota Fiscal (PDF)
            </Button>
            <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest">IA do Base44 processará os itens</p>
        </div>

        {itensLancamento?.map((entry, idx) => (
          <ItemNFCard key={idx} entry={entry} index={idx} empenhos={empenhos} onChange={(i, f, v) => {
            const up = [...itensLancamento];
            up[i][f] = v;
            setItensLancamento(up);
          }} />
        ))}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={executeSave} disabled={saving || !contratoId} className="bg-[#1a2e4a] text-white">
            {saving ? "Processando fila..." : "Confirmar Lançamento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}