import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];
const CIDADES_OS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

const SERVICE_ITEM_LABELS_FOR_OS = [
  "FORNECIMENTO DE MATERIAL",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
  "SERVIÇOS EVENTUAIS",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO",
  "FORNECIMENTO DE MATERIAIS"
];

const formatarMoeda = (valorNumerico) => {
  if (valorNumerico === undefined || valorNumerico === null || isNaN(valorNumerico)) return "0,00";
  return Number(valorNumerico).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date().toISOString().split("T")[0];

  const [listaContratos, setListaContratos] = useState([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  const [contratoId, setContratoId] = useState(lancamento?.contrato_id ? String(lancamento.contrato_id) : "");
  const [mes, setMes] = useState(lancamento?.mes || mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState(lancamento?.ano ? String(lancamento.ano) : String(anoAtual));
  const [status, setStatus] = useState(lancamento?.status || "Em instrução");
  const [selectedItems, setSelectedItems] = useState([]);
  const [nfsData, setNfsData] = useState({});
  const [empenhos, setEmpenhos] = useState([]);
  const [processoPagSei, setProcessoPagSei] = useState("");
  const [ordemBancaria, setOrdemBancaria] = useState("");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState("");
  const [ordensServico, setOrdensServico] = useState([{
    id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: []
  }]);

  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [user, setUser] = useState(null);
  const pdfInputRef = useRef(null);

  const itensContratoAtivos = itens?.filter(i => String(i.contrato_id) === String(contratoId)) || [];
  const exigeOS = selectedItems.some(itemId => {
    const itemObj = itensContratoAtivos.find(i => String(i.id) === String(itemId));
    return itemObj && SERVICE_ITEM_LABELS_FOR_OS.includes(itemObj.nome?.toUpperCase().trim());
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    if (!contratos || contratos.length === 0) {
      setLoadingContratos(true);
      base44.entities.Contrato.list().then(res => setListaContratos(res || [])).finally(() => setLoadingContratos(false));
    } else {
      setListaContratos(contratos);
    }
  }, [contratos]);

  useEffect(() => {
    if (!contratoId) return;
    base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) }).then(setEmpenhos).catch(() => {});
  }, [contratoId, ano]);

  const toggleItem = (itemId) => {
    setSelectedItems(prev => {
      const idStr = String(itemId);
      if (prev.includes(idStr)) return prev.filter(id => id !== idStr);
      setNfsData(curr => ({ ...curr, [idStr]: { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }}));
      return [...prev, idStr];
    });
  };

  const handleNFMoneyChange = (itemId, field, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    setNfsData(prev => {
      const current = prev[itemId] || {};
      const updated = { ...current, [field]: numericValue };
      updated.valor_final = (updated.valor || 0) - (updated.retencao || 0) - (updated.glosa || 0);
      return { ...prev, [itemId]: updated };
    });
  };

  const handleOSMoneyChange = (index, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    const newOS = [...ordensServico];
    newOS[index].valor = numericValue;
    setOrdensServico(newOS);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);
    toast.info("Processando PDF com Inteligência Artificial...");

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes || !uploadRes.file_url) throw new Error("Falha no upload");

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf: { type: "string" },
            data_nf: { type: "string" },
            valor_total: { type: "number" },
            os_numero: { type: "string" }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const data = result.output;
        let dataF = hoje;
        if (data.data_nf && data.data_nf.includes("/")) {
          const p = data.data_nf.split("/");
          dataF = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }

        setNfsData(prev => {
          const next = { ...prev };
          selectedItems.forEach((id, i) => {
            next[id] = { 
              ...next[id], 
              numero_nf: data.numero_nf || next[id].numero_nf, 
              data_nf: dataF, 
              valor: i === 0 && data.valor_total ? data.valor_total : next[id].valor,
              valor_final: i === 0 && data.valor_total ? (data.valor_total - (next[id].retencao || 0) - (next[id].glosa || 0)) : next[id].valor_final
            };
          });
          return next;
        });

        if (data.os_numero && ordensServico.length === 1 && !ordensServico[0].numero_os) {
          const upOS = [...ordensServico];
          upOS[0].numero_os = data.os_numero;
          setOrdensServico(upOS);
        }
        
        toast.success("Dados preenchidos via IA.");
      }
    } catch (err) {
      toast.error("Erro na leitura do PDF.");
    } finally {
      setExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const executeSave = async () => {
    if (saving) return;
    if (!contratoId || selectedItems.length === 0) return toast.error("Selecione Contrato e Itens.");

    setSaving(true);
    try {
      const payloadOS = exigeOS ? ordensServico.map(os => ({
        numero: os.numero_os || "",
        data_emissao: os.data_emissao || "",
        descricao: os.descricao || "",
        valor: os.valor || 0,
        data_execucao: os.data_execucao || "",
        locais_prestacao_servicos: os.locais || []
      })) : [];

      for (const itemId of selectedItems) {
        const nf = nfsData[itemId] || {};
        const itemObj = itensContratoAtivos.find(i => String(i.id) === String(itemId));
        
        await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_contrato_id: itemId,
          item_label: itemObj?.nome || "Item",
          ano: parseInt(ano),
          mes: mesesNomes.indexOf(mes) + 1,
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
          ordens_servico: payloadOS,
          alterado_por: user?.full_name || "Sistema"
        });
      }
      toast.success("Salvo com sucesso!");
      if (onSave) onSave();
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto font-sans">
      <h2 className="text-xl font-bold text-[#1a2e4a] mb-6">Novo Lançamento</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-semibold text-gray-700">Contrato *</Label>
          <Select value={contratoId} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 bg-white border-gray-300"><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
            <SelectContent>{listaContratos?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {contratoId && (
          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">Itens do Contrato *</Label>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between h-10 border-gray-300 text-gray-700">{selectedItems.length === 0 ? "Selecione os itens..." : `${selectedItems.length} selecionado(s)`}</Button></PopoverTrigger>
              <PopoverContent className="w-[400px] p-2 bg-white shadow-xl"><div className="space-y-2 max-h-60 overflow-y-auto">{itensContratoAtivos.map(item => (<div key={item.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded"><Checkbox id={`it-${item.id}`} checked={selectedItems.includes(String(item.id))} onCheckedChange={() => toggleItem(item.id)} /><label htmlFor={`it-${item.id}`} className="text-sm font-medium uppercase cursor-pointer">{item.nome}</label></div>))}</div></PopoverContent>
            </Popover>
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a2e4a] uppercase">Notas Fiscais</h3>
              <div>
                <input ref={pdfInputRef} type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={extractingPdf}
                >
                  {extractingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar PDF da NF
                </Button>
              </div>
            </div>

            {selectedItems.map(itemId => {
              const item = itensContratoAtivos.find(i => String(i.id) === String(itemId));
              const data = nfsData[itemId] || {};
              const empenho = empenhos.find(e => String(e.item_contrato_id) === String(itemId));
              return (
                <div key={itemId} className="border rounded-lg p-5 bg-white space-y-4 shadow-sm border-gray-200">
                  <div className="font-bold text-sm uppercase text-[#1a2e4a] border-b pb-2 flex justify-between items-center">
                    <span>{item?.nome}</span>
                    {empenho && <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">{empenho.numero_empenho}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Nº NF *</Label><Input className="h-9" value={data.numero_nf || ""} onChange={e => setNfsData({...nfsData, [itemId]: {...data, numero_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Data NF *</Label><Input className="h-9" type="date" value={data.data_nf || ""} onChange={e => setNfsData({...nfsData, [itemId]: {...data, data_nf: e.target.value}})} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Valor NF *</Label><Input className="h-9" value={formatarMoeda(data.valor)} onChange={e => handleNFMoneyChange(itemId, "valor", e.target.value)} /></div>
                  </div>
                </div>
              );
            })}

            {exigeOS && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center"><h3 className="text-sm font-bold uppercase text-[#1a2e4a]">Ordens de Serviço</h3><Button variant="outline" size="sm" onClick={() => setOrdensServico([...ordensServico, { id: Date.now(), numero_os: "", locais: [] }])}><Plus className="h-4 w-4 mr-1" /> Adicionar OS</Button></div>
                {ordensServico.map((os, i) => (
                  <div key={os.id} className="border rounded-lg p-5 bg-gray-50/30 space-y-4 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Nº OS *</Label><Input className="h-9 bg-white" value={os.numero_os} onChange={e => { const up = [...ordensServico]; up[i].numero_os = e.target.value; setOrdensServico(up); }} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Valor OS *</Label><Input className="h-9 bg-white" value={formatarMoeda(os.valor)} onChange={e => handleOSMoneyChange(i, e.target.value)} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <Button variant="outline" onClick={onCancel} disabled={saving} className="h-10">Cancelar</Button>
              <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] h-10 min-w-[140px] text-white hover:bg-[#2a4a7a]">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar lançamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}