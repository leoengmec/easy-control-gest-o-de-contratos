import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, Plus } from "lucide-react";
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

  const [processoPagSei, setProcessoPagSei] = useState(lancamento?.processo_pagamento_sei || "");
  const [ordemBancaria, setOrdemBancaria] = useState(lancamento?.ordem_bancaria || "");
  const [dataLancamento, setDataLancamento] = useState(hoje);
  const [observacoes, setObservacoes] = useState(lancamento?.observacoes || "");

  const [ordensServico, setOrdensServico] = useState([{
    id: Date.now(),
    numero_os: "",
    data_emissao: "",
    descricao: "",
    valor: 0,
    data_execucao: "",
    locais: []
  }]);

  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [itensMaterialExtraidos, setItensMaterialExtraidos] = useState([]);
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
    let isMounted = true;
    setLoadingContratos(true);
    base44.entities.Contrato.list()
      .then((res) => { if (isMounted) setListaContratos(res || []); })
      .catch(() => { if (isMounted) toast.error("Erro ao buscar a lista de contratos"); })
      .finally(() => { if (isMounted) setLoadingContratos(false); });
    return () => { isMounted = false; };
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
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        setNfsData(current => ({
          ...current,
          [itemId]: current[itemId] || { numero_nf: "", data_nf: hoje, valor: 0, retencao: 0, glosa: 0, valor_final: 0 }
        }));
        return [...prev, itemId];
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

  const handleNFTextChange = (itemId, field, value) => {
    setNfsData(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value }
    }));
  };

  const handleOSMoneyChange = (osIndex, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    setOrdensServico(prev => {
      const up = [...prev];
      up[osIndex].valor = numericValue;
      return up;
    });
  };

  const toggleLocalOS = (osIndex, local) => {
    setOrdensServico(prev => {
      const up = [...prev];
      const currentLocais = up[osIndex].locais;
      if (currentLocais.includes(local)) {
        up[osIndex].locais = currentLocais.filter(l => l !== local);
      } else {
        up[osIndex].locais = [...currentLocais, local];
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
            os_numero: { type: "string" },
            itens_material: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  descricao: { type: "string" },
                  unidade: { type: "string" },
                  quantidade: { type: "number" },
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
              valor: idx === 0 && data.valor_total ? data.valor_total : current.valor,
              valor_final: idx === 0 && data.valor_total ? (data.valor_total - (current.retencao || 0) - (current.glosa || 0)) : current.valor_final
            };
          });
          return nextState;
        });

        if (data.os_numero && ordensServico.length === 1 && !ordensServico[0].numero_os) {
           setOrdensServico([{ ...ordensServico[0], numero_os: data.os_numero }]);
        }
        
        toast.success("Dados preenchidos automaticamente.");
      }
    } catch (error) {
      toast.error("A inteligência artificial não conseguiu ler este arquivo.");
    } finally {
      setExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const executeSave = async () => {
    // 1. Blindagem de Validação Inicial
    if (!contratoId || selectedItems.length === 0) {
      toast.error("Selecione o contrato e pelo menos um item da lista.");
      return;
    }

    // Varrendo as notas para garantir que não vai vazio pro banco
    for (const itemId of selectedItems) {
      const itemData = nfsData[itemId];
      if (!itemData?.numero_nf || itemData.numero_nf.trim() === "") {
        toast.error("O Número da NF é obrigatório para todos os itens selecionados.");
        return;
      }
      if (!itemData?.valor || itemData.valor <= 0) {
        toast.error("O Valor da NF não pode ser zero.");
        return;
      }
    }

    // Varrendo as OSs para garantir preenchimento
    if (exigeOS) {
      for (const os of ordensServico) {
        if (!os.numero_os || os.numero_os.trim() === "") {
          toast.error("Preencha o Número da Ordem de Serviço.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Garantindo que enviaremos strings vazias ("") e não valores nulos (null)
      const payloadOS = exigeOS ? ordensServico.map(os => ({
        numero: os.numero_os || "",
        data_emissao: os.data_emissao || "",
        descricao: os.descricao || "",
        valor: os.valor || 0,
        data_execucao: os.data_execucao || "",
        locais_prestacao_servicos: os.locais || []
      })) : [];

      for (const itemId of selectedItems) {
        const itemData = nfsData[itemId];
        const itemObj = itensContratoAtivos.find(i => String(i.id) === String(itemId));
        
        const created = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          item_contrato_id: itemId,
          item_label: itemObj?.nome || "Item",
          ano: parseInt(ano),
          mes: mesesNomes.indexOf(mes) + 1,
          status,
          numero_nf: itemData.numero_nf,
          data_nf: itemData.data_nf,
          valor: itemData.valor || 0,
          retencao: itemData.retencao || 0,
          glosa: itemData.glosa || 0,
          valor_pago_final: itemData.valor_final || 0,
          processo_pagamento_sei: processoPagSei,
          ordem_bancaria: ordemBancaria,
          data_lancamento: dataLancamento,
          observacoes: observacoes,
          ordens_servico: payloadOS,
          alterado_por: user?.full_name || "Sistema",
          data_update: new Date().toISOString()
        });

        const isMaterial = itemObj?.nome?.toUpperCase().includes("MATERIAL");
        if (isMaterial && itensMaterialExtraidos?.length > 0) {
          for (const mat of itensMaterialExtraidos) {
            await base44.entities.ItemMaterialNF.create({
              ...mat,
              lancamento_financeiro_id: created.id,
              os_numero: ordensServico[0]?.numero_os || "",
              contrato_id: contratoId
            });
            await new Promise(r => setTimeout(r, 100));
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
      
      toast.success("Lançamento salvo e gravado no extrato com sucesso!");
      
      // Limpeza de Tela Pós-Salvamento
      setContratoId("");
      setSelectedItems([]);
      setNfsData({});
      setOrdensServico([{ id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, data_execucao: "", locais: [] }]);
      setProcessoPagSei("");
      setOrdemBancaria("");
      setObservacoes("");
      
      if (onSave) onSave();
      
    } catch (err) {
      toast.error("Erro na comunicação com o servidor. O lançamento não foi salvo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto font-sans">
      <h2 className="text-xl font-bold text-[#1a2e4a] mb-6">
        {lancamento ? "Editar Lançamento" : "Novo Lançamento"}
      </h2>

      <div className="space-y-6">
        
        <div className="space-y-2">
          <Label className="font-semibold text-gray-700">Contrato <span className="text-red-500">*</span></Label>
          <Select value={contratoId || undefined} onValueChange={setContratoId}>
            <SelectTrigger className="h-10 text-sm bg-white border-gray-300">
              <SelectValue placeholder={loadingContratos ? "Carregando..." : "Selecione o contrato"} />
            </SelectTrigger>
            <SelectContent>
              {listaContratos?.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.numero} | {c.contratada}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-5 border border-gray-200 rounded-lg bg-gray-50/30">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Mês de Referência da Medição</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Mês <span className="text-red-500">*</span></Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Ano <span className="text-red-500">*</span></Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2024", "2025", "2026", "2027"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600">Status <span className="text-red-500">*</span></Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {contratoId && (
          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">Itens do Contrato <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10 font-normal bg-white border-gray-300 text-gray-700">
                  {selectedItems.length === 0 
                    ? "Selecione os itens a serem pagos..." 
                    : `${selectedItems.length} item(s) selecionado(s)`}
                  <span className="opacity-50 text-[10px]">▼</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-2 bg-white shadow-xl" align="start">
                {itensContratoAtivos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhum item vinculado a este contrato</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {itensContratoAtivos.map(item => (
                      <div key={item.id} className="flex items-center space-x-3 p-1 hover:bg-gray-50 rounded">
                        <Checkbox 
                          id={`popover-item-${item.id}`} 
                          checked={selectedItems.includes(String(item.id))}
                          onCheckedChange={() => toggleItem(String(item.id))}
                        />
                        <label htmlFor={`popover-item-${item.id}`} className="text-sm font-medium text-gray-700 leading-tight cursor-pointer uppercase w-full">
                          {item.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a2e4a]">Notas Fiscais</h3>
              <div>
                <input ref={pdfInputRef} type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={extractingPdf}
                >
                  {extractingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Importar PDF da NF
                </Button>
              </div>
            </div>

            {itensMaterialExtraidos.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm flex items-center gap-2 text-green-700 font-medium">
                <CheckCircle2 size={16} /> A IA detectou e vinculou {itensMaterialExtraidos.length} materiais a este lançamento.
              </div>
            )}

            {selectedItems.map(itemId => {
              const itemObj = itensContratoAtivos.find(i => String(i.id) === String(itemId));
              const data = nfsData[itemId] || {};
              const empenhoSelecionado = empenhos?.find(e => String(e.item_contrato_id) === String(itemId));

              return (
                <div key={itemId} className="border border-gray-200 rounded-lg p-5 bg-white">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold text-sm text-[#1a2e4a] uppercase">{itemObj?.nome}</span>
                    {empenhoSelecionado && (
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                        {empenhoSelecionado.numero_empenho}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Número da NF <span className="text-red-500">*</span></Label>
                      <Input 
                        value={data.numero_nf || ""} 
                        onChange={(e) => handleNFTextChange(itemId, "numero_nf", e.target.value)}
                        placeholder="Nº da NF"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Data da NF <span className="text-red-500">*</span></Label>
                      <Input 
                        type="date" 
                        value={data.data_nf || ""} 
                        onChange={(e) => handleNFTextChange(itemId, "data_nf", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Valor da NF (R$) <span className="text-red-500">*</span></Label>
                      <Input 
                        value={formatarMoeda(data.valor * 100)} 
                        onChange={(e) => handleNFMoneyChange(itemId, "valor", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Retenção (R$)</Label>
                      <Input 
                        value={formatarMoeda(data.retencao * 100)} 
                        onChange={(e) => handleNFMoneyChange(itemId, "retencao", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Glosa (R$)</Label>
                      <Input 
                        value={formatarMoeda(data.glosa * 100)} 
                        onChange={(e) => handleNFMoneyChange(itemId, "glosa", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Valor Final Pago (R$)</Label>
                      <Input 
                        disabled
                        className="bg-gray-100 font-bold"
                        value={formatarMoeda(data.valor_final * 100)} 
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Processo de Pagamento SEI</Label>
                <Input 
                  value={processoPagSei} 
                  onChange={e => setProcessoPagSei(e.target.value)} 
                  placeholder="Nº do processo SEI"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Ordem Bancária</Label>
                <Input 
                  value={ordemBancaria} 
                  onChange={e => setOrdemBancaria(e.target.value)} 
                  placeholder="Nº da ordem bancária"
                />
              </div>
            </div>

            {exigeOS && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold text-[#1a2e4a]">Ordens de Serviço</h3>
                  <Button variant="outline" size="sm" onClick={addOS} className="text-sm font-semibold">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar OS
                  </Button>
                </div>

                {ordensServico.map((os, index) => (
                  <div key={os.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50/20 space-y-4">
                    <h4 className="font-semibold text-sm text-gray-700">OS #{index + 1}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-semibold">Número da OS <span className="text-red-500">*</span></Label>
                        <Input 
                          value={os.numero_os} 
                          onChange={(e) => {
                            const up = [...ordensServico]; up[index].numero_os = e.target.value; setOrdensServico(up);
                          }}
                          placeholder="Nº da OS"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-semibold">Data de emissão da OS</Label>
                        <Input 
                          type="date" 
                          value={os.data_emissao} 
                          onChange={(e) => {
                            const up = [...ordensServico]; up[index].data_emissao = e.target.value; setOrdensServico(up);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600 font-semibold">Descrição resumida do serviço</Label>
                      <Input 
                        value={os.descricao} 
                        onChange={(e) => {
                          const up = [...ordensServico]; up[index].descricao = e.target.value; setOrdensServico(up);
                        }}
                        placeholder="Descrição resumida"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-semibold">Valor da OS (R$) <span className="text-red-500">*</span></Label>
                        <Input 
                          value={formatarMoeda(os.valor * 100)} 
                          onChange={(e) => handleOSMoneyChange(index, e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600 font-semibold">Data de execução do serviço</Label>
                        <Input 
                          type="date" 
                          value={os.data_execucao} 
                          onChange={(e) => {
                            const up = [...ordensServico]; up[index].data_execucao = e.target.value; setOrdensServico(up);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-gray-600 font-semibold">Local de Prestação de Serviços</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-gray-200 rounded p-4 bg-white">
                        {CIDADES_OS.map(cidade => (
                          <div key={cidade} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`os-${os.id}-cidade-${cidade}`}
                              checked={os.locais.includes(cidade)}
                              onCheckedChange={() => toggleLocalOS(index, cidade)}
                            />
                            <label htmlFor={`os-${os.id}-cidade-${cidade}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                              {cidade}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Data do Lançamento <span className="text-red-500">*</span></Label>
                <Input 
                  type="date"
                  value={dataLancamento} 
                  onChange={e => setDataLancamento(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Observações</Label>
                <Input 
                  value={observacoes} 
                  onChange={e => setObservacoes(e.target.value)} 
                  placeholder="Observações..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={onCancel} disabled={saving} className="font-semibold text-gray-600">
                Cancelar
              </Button>
              <Button onClick={executeSave} disabled={saving} className="bg-[#1a2e4a] hover:bg-[#2a4a7a] font-semibold">
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                {saving ? "Salvando..." : "Salvar lançamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}