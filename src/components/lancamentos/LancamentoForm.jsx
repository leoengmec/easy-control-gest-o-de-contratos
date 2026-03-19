import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

const ITEMS_EXIGEM_OS = [
  "FORNECIMENTO DE MATERIAL",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
  "SERVIÇOS EVENTUAIS",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"
];

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const hoje = new Date().toISOString().split("T")[0];

  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState("2026");
  const [status, setStatus] = useState("Em instrução");
  const [selectedItems, setSelectedItems] = useState([]);
  const [nfsData, setNfsData] = useState({});
  const [ordensServico, setOrdensServico] = useState([]);
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");

  const [listaContratos, setListaContratos] = useState(contratos || []);
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      base44.entities.Contrato.list().then(res => setListaContratos(res || []));
    }
  }, [contratos]);

  useEffect(() => {
    if (contratoId) {
      base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
        .then(setEmpenhos).catch(() => setEmpenhos([]));
    }
  }, [contratoId, ano]);

  const formatarMoeda = (v) => {
    if (v === undefined || v === null) return "0,00";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleMoneyChange = (itemId, field, raw) => {
    const val = Number(raw.replace(/\D/g, "")) / 100;
    setNfsData(prev => {
      const current = prev[itemId] || {};
      const updated = { ...current, [field]: val };
      updated.valor_final = (updated.valor || 0) - (updated.retencao || 0) - (updated.glosa || 0);
      return { ...prev, [itemId]: updated };
    });
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: { type: "object", properties: { numero_nf: { type: "string" }, data_nf: { type: "string" }, valor_total: { type: "number" }, os_numero: { type: "string" } } }
      });
      if (result.output) {
        const d = result.output;
        let df = hoje;
        if (d.data_nf?.includes("/")) {
          const p = d.data_nf.split("/");
          df = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        setNfsData(prev => {
          const next = { ...prev };
          selectedItems.forEach((id, i) => {
            const cur = next[id] || {};
            next[id] = { ...cur, numero_nf: d.numero_nf || cur.numero_nf, data_nf: df, valor: i === 0 ? d.valor_total : cur.valor, valor_final: i === 0 ? d.valor_total : cur.valor_final };
          });
          return next;
        });
        toast.success("Dados extraídos!");
      }
    } catch (err) { toast.error("Falha no OCR."); }
    finally { setExtractingPdf(false); }
  };

  const executeSave = async () => {
    if (saving) return;
    if (!contratoId || selectedItems.length === 0) return toast.error("Selecione contrato e itens.");

    setSaving(true);
    try {
      const payloadOS = selectedItems.some(id => ITEMS_EXIGEM_OS.includes(itens?.find(i => String(i.id) === id)?.nome?.toUpperCase()))
        ? ordensServico.map(os => ({
            numero: os.numero_os || "",
            data_emissao: os.data_emissao || "",
            descricao: os.descricao || "",
            valor: os.valor || 0,
            data_execucao: os.data_execucao || "",
            locais_prestacao_servicos: os.locais || []
          })) : [];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const itemObj = itens?.find(i => String(i.id) === String(itemId));

        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_contrato_id: itemId,
          item_label: itemObj?.nome || "Item",
          mes: mesesNomes.indexOf(mes) + 1,
          ano: parseInt(ano),
          status,
          numero_nf: nf.numero_nf || "",
          data_nf: nf.data_nf || hoje,
          valor: nf.valor || 0,
          retencao: nf.retencao || 0,
          glosa: nf.glosa || 0,
          valor_pago_final: nf.valor_final || 0,
          processo_pagamento_sei: processoPagSei,
          ordem_bancaria: ordemBancaria,
          data_lancamento: dataLancamento,
          observacoes: observacoes,
          ordens_servico: payloadOS
        });
      }
      toast.success("Salvo com sucesso!");
      if (onSave) onSave();
    } catch (err) { toast.error("Erro no servidor."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Painel de Gestão Financeira (ADM)</h2>
        <Badge className="bg-[#1a2e4a] text-white px-3 py-1">Ambiente de Controle</Badge>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 rounded-lg border border-gray-100">
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Mês *</Label>
            <Select value={mes} onValueChange={setMes}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Ano *</Label>
            <Select value={ano} onValueChange={setAno}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Status *</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Itens para Pagamento/Medição *</Label>
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-white max-h-48 overflow-y-auto">
            {itens?.filter(i => String(i.contrato_id) === contratoId).map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox checked={selectedItems.includes(String(item.id))} onCheckedChange={(c) => {
                  const id = String(item.id);
                  if (c) { setSelectedItems([...selectedItems, id]); setNfsData({...nfsData, [id]: { numero_nf: "", valor: 0, retencao: 0, glosa: 0, valor_final: 0 }}); }
                  else { setSelectedItems(selectedItems.filter(x => x !== id)); }
                }} />
                <label className="text-sm font-medium uppercase text-gray-600">{item.nome}</label>
              </div>
            ))}
          </div>
        </div>

        {selectedItems.map(itemId => {
          const item = itens?.find(i => String(i.id) === itemId);
          const data = nfsData[itemId] || {};
          const empenho = empenhos.find(e => String(e.item_contrato_id) === itemId);
          return (
            <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-l-4 border-l-[#1a2e4a]">
              <div className="flex justify-between items-center"><span className="text-xs font-black text-[#1a2e4a] uppercase">{item?.nome}</span>{empenho && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">{empenho.numero_empenho}</Badge>}</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Nº NF *</Label><Input value={data.numero_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Data NF</Label><Input type="date" value={data.data_nf} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-gray-400">Valor Bruto (R$)</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleMoneyChange(itemId, "valor", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-red-400">Retenção</Label><Input value={formatarMoeda(data.retencao)} onChange={e => handleMoneyChange(itemId, "retencao", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-bold uppercase text-red-400">Glosa</Label><Input value={formatarMoeda(data.glosa)} onChange={e => handleMoneyChange(itemId, "glosa", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-green-500">Líquido Pago</Label><Input disabled className="bg-green-50 font-black text-green-700" value={formatarMoeda(data.valor_final)} /></div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><Label className="text-xs font-bold">Processo SEI</Label><Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="000.000/2026" /></div>
          <div className="space-y-1"><Label className="text-xs font-bold">Ordem Bancária</Label><Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="2026OB..." /></div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-4">
          <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
          <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs tracking-widest">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Finalizar Lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}