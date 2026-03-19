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

const SERVICE_ITEM_LABELS_FOR_OS = [
  "FORNECIMENTO DE MATERIAL",
  "SERVIÇOS DE LOCAÇÃO DE EQUIPAMENTOS",
  "SERVIÇOS EVENTUAIS",
  "SERVIÇOS DE DESLOCAMENTO ENGENHEIRO",
  "SERVIÇOS DE DESLOCAMENTO CORRETIVO",
  "SERVIÇOS DE DESLOCAMENTO PREVENTIVO"
];

const formatarMoeda = (valorNumerico) => {
  if (valorNumerico === undefined || valorNumerico === null || isNaN(valorNumerico)) return "0,00";
  return Number(valorNumerico).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const hoje = new Date().toISOString().split("T")[0];

  const [listaContratos, setListaContratos] = useState([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  
  const [contratoId, setContratoId] = useState("");
  const [mes, setMes] = useState(mesesNomes[new Date().getMonth()]);
  const [ano, setAno] = useState("2026");
  const [status, setStatus] = useState("Em instrução");
  
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
  }, []);

  useEffect(() => {
    if (contratos && contratos.length > 0) {
      setListaContratos(contratos);
      return;
    }
    setLoadingContratos(true);
    // Busca global para administradores
    base44.entities.Contrato.list()
      .then((res) => setListaContratos(res || []))
      .catch(() => toast.error("Erro ao buscar a lista de contratos"))
      .finally(() => setLoadingContratos(false));
  }, [contratos]);

  useEffect(() => {
    if (!contratoId) {
      setSelectedItems([]);
      setNfsData({});
      return;
    }
    base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
      .then(setEmpenhos)
      .catch(() => setEmpenhos([]));
  }, [contratoId, ano]);

  const toggleItem = (itemId) => {
    setSelectedItems(prev => {
      const idStr = String(itemId);
      if (prev.includes(idStr)) {
        return prev.filter(id => id !== idStr);
      } else {
        setNfsData(current => ({
          ...current,
          [idStr]: current[idStr] || { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }
        }));
        return [...prev, idStr];
      }
    });
  };

  const handleNFMoneyChange = (itemId, field, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    setNfsData(prev => {
      const current = prev[itemId] || {};
      const updated = { ...current, [field]: numericValue };
      const val = updated.valor || 0;
      const ret = updated.retencao || 0;
      const glo = updated.glosa || 0;
      updated.valor_final = val - ret - glo;
      return { ...prev, [itemId]: updated };
    });
  };

  const handleOSMoneyChange = (index, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    setOrdensServico(prev => {
      const up = [...prev];
      up[index].valor = numericValue;
      return up;
    });
  };

  const toggleLocalOS = (index, local) => {
    setOrdensServico(prev => {
      const up = [...prev];
      const currentLocais = up[index].locais;
      if (currentLocais.includes(local)) {
        up[index].locais = currentLocais.filter(l => l !== local);
      } else {
        up[index].locais = [...currentLocais, local];
      }
      return up;
    });
  };

  const addOS = () => {
    setOrdensServico(prev => [...prev, {
      id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: []
    }]);
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
        let dataFormatada = hoje;
        if (data.data_nf && data.data_nf.includes("/")) {
          const partes = data.data_nf.split("/");
          if (partes.length === 3) dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }

        setNfsData(prev => {
          const nextState = { ...prev };
          selectedItems.forEach((itemId, idx) => {
            const current = nextState[itemId] || {};
            nextState[itemId] = {
              ...current,
              numero_nf: data.numero_nf || current.numero_nf,
              data_nf: dataFormatada,
              // Aplica o valor total apenas no primeiro item
              valor: idx === 0 && data.valor_total ? data.valor_total : current.valor,
              valor_final: idx === 0 && data.valor_total ? (data.valor_total - (current.retencao || 0) - (current.glosa || 0)) : current.valor_final
            };
          });
          return nextState;
        });

        if (data.os_numero && ordensServico.length === 1 && !ordensServico[0].numero_os) {
          const upOS = [...ordensServico];
          upOS[0].numero_os = data.os_numero;
          setOrdensServico(upOS);
        }
        
        toast.success("Dados preenchidos via IA.");
      }
    } catch (error) {
      toast.error("Erro na leitura do PDF.");
    } finally {
      setExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const executeSave = async () => {
    if (saving) return; // Trava contra cliques simultâneos
    if (!contratoId || selectedItems.length === 0) {
      toast.error("Selecione o contrato e pelo menos um item.");
      return;
    }

    setSaving(true);
    try {
      // Ajuste de Mapeamento para Administrador: Envia "" em vez de null para campos opcionais
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
          ordens_servico: payloadOS,
          alterado_por: user?.full_name || "Sistema"
        });
      }
      toast.success("Salvo com sucesso!");
      if (onSave) onSave();
    } catch (err) {
      toast.error("Erro ao salvar. Verifique se todos os campos obrigatórios (*) estão preenchidos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-8 max-w-4xl mx-auto font-sans text-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1a2e4a]">Gestão de Lançamentos Financeiros (ADM)</h2>
        <Badge className="bg-[#1a2e4a] text-white px-3 py-1">Ambiente de Controle</Badge>
      </div>

      <div className="space-y-6">
        
        <div className="space-y-2">
          <Label className="font-semibold text-gray-700">Contrato <span className="text-red-500">*</span></Label>
          <Select value={contratoId || undefined} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 bg-white border-gray-300">
              <SelectValue placeholder={loadingContratos ? "Carregando base..." : "Selecione o contrato"} />
            </SelectTrigger>
            <SelectContent>
              {listaContratos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.numero} | {c.contratada}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/30">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase text-[11px] font-black tracking-wider text-gray-400">Mês de Referência da Medição</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500">Mês <span className="text-red-500">*</span></Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500">Ano <span className="text-red-500">*</span></Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500">Status <span className="text-red-500">*</span></Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold text-gray-700">Itens para Pagamento/Medição (Selecione um ou mais) <span className="text-red-500">*</span></Label>
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-md bg-white max-h-48 overflow-y-auto">
            {itens?.filter(i => String(i.contrato_id) === contratoId).map(item => (
              <div key={item.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                <Checkbox 
                  id={`it-${item.id}`} 
                  checked={selectedItems.includes(String(item.id))} 
                  onCheckedChange={() => toggleItem(item.id)} 
                />
                <label htmlFor={`it-${item.id}`} className="text-sm font-medium uppercase text-gray-600 cursor-pointer">{item.nome}</label>
              </div>
            ))}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1a2e4a] uppercase tracking-wider text-gray-400">Dados das Notas Fiscais</h3>
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
              const item = itensContratoAtivos.find(i => String(i.id) === itemId);
              const data = nfsData[itemId] || {};
              const empenho = empenhos.find(e => String(e.item_contrato_id) === itemId);
              return (
                <div key={itemId} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-gray-200">
                  <div className="font-bold text-sm uppercase text-[#1a2e4a] border-b pb-2 flex justify-between items-center">
                    <span>{item?.nome}</span>
                    {empenho && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">{empenho.numero_empenho}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Nº NF *</Label><Input value={data.numero_nf || ""} onChange={e => handleNFMoneyChange(itemId, "numero_nf", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Data NF</Label><Input type="date" value={data.data_nf || ""} onChange={e => handleNFMoneyChange(itemId, "data_nf", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Valor Bruto (R$) *</Label><Input value={formatarMoeda(data.valor)} onChange={e => handleNFMoneyChange(itemId, "valor", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500 uppercase text-red-500">Retenção (R$)</Label><Input value={formatarMoeda(data.retencao)} onChange={e => handleNFMoneyChange(itemId, "retencao", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500 uppercase text-red-500">Glosa (R$)</Label><Input value={formatarMoeda(data.glosa)} onChange={e => handleNFMoneyChange(itemId, "glosa", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs font-black uppercase text-green-500">Líquido Pago (R$)</Label><Input disabled className="bg-green-50 font-black text-green-700" value={formatarMoeda(data.valor_final)} /></div>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold Text-gray-500">Processo SEI</Label><Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="000.000/2026" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold Text-gray-500">Ordem Bancária</Label><Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="2026OB..." /></div>
            </div>

            {exigeOS && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center"><h3 className="text-sm font-black text-[#1a2e4a] uppercase tracking-wider text-gray-400">Ordens de Serviço</h3><Button variant="outline" size="sm" onClick={addOS}><Plus className="h-4 w-4 mr-1" /> Adicionar OS</Button></div>
                {ordensServico.map((os, i) => (
                  <div key={os.id} className="border rounded-lg p-5 bg-gray-50/30 space-y-4 border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Nº OS <span className="text-red-500">*</span></Label><Input value={os.numero_os} onChange={e => { const up = [...ordensServico]; up[i].numero_os = e.target.value; setOrdensServico(up); }} /></div>
                      <div className="space-y-1"><Label className="text-xs font-bold Text-gray-500 uppercase">Valor OS (R$)</Label><Input value={formatarMoeda(os.valor)} onChange={e => handleOSMoneyChange(i, e.target.value)} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">Data do Lançamento <span className="text-red-500">*</span></Label><Input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs font-bold Text-gray-500">Observações</Label><Input value={observacoes} onChange={e => setObservacoes(e.target.value)} /></div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <Button variant="ghost" onClick={onCancel} disabled={saving} className="font-bold uppercase text-xs">Cancelar</Button>
              <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] text-white px-10 h-12 font-black uppercase text-xs tracking-widest hover:bg-[#2a4a7a]">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Finalizar Lançamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}