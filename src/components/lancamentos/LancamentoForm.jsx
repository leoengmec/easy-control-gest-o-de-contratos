import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  if (valorNumerico === undefined || valorNumerico === null) return "0,00";
  return valorNumerico.toLocaleString("pt-BR", {
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
  
  const [selectedItemId, setSelectedItemId] = useState("");
  const [empenhos, setEmpenhos] = useState([]);
  
  const [nfData, setNfData] = useState({
    numero_nf: "",
    data_nf: hoje,
    valor: 0,
    retencao: 0,
    glosa: 0,
    valor_final: 0
  });

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
    valor_formatado: "0,00",
    data_execucao: "",
    locais: []
  }]);

  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [itensMaterialExtraidos, setItensMaterialExtraidos] = useState([]);
  const [user, setUser] = useState(null);
  const pdfInputRef = useRef(null);

  const itensContratoAtivos = itens?.filter(i => String(i.contrato_id) === String(contratoId)) || [];
  const selectedItemObj = itensContratoAtivos.find(i => String(i.id) === String(selectedItemId));
  const exigeOS = selectedItemObj && SERVICE_ITEM_LABELS_FOR_OS.includes(selectedItemObj.nome?.toUpperCase().trim());
  const empenhoSelecionado = empenhos?.find(e => String(e.item_contrato_id) === String(selectedItemId));

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
      setSelectedItemId("");
      return;
    }
    base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
      .then(setEmpenhos)
      .catch(() => setEmpenhos([]));
  }, [contratoId, ano]);

  const handleNFMoneyChange = (field, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    setNfData(prev => {
      const updated = { ...prev, [field]: numericValue };
      const val = updated.valor || 0;
      const ret = updated.retencao || 0;
      const glo = updated.glosa || 0;
      updated.valor_final = val - ret - glo;
      return updated;
    });
  };

  const handleOSMoneyChange = (osIndex, rawValue) => {
    const numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
    const formattedValue = formatarMoeda(rawValue);
    
    setOrdensServico(prev => {
      const up = [...prev];
      up[osIndex].valor = numericValue;
      up[osIndex].valor_formatado = formattedValue;
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
      id: Date.now(), numero_os: "", data_emissao: "", descricao: "", valor: 0, valor_formatado: "0,00", data_execucao: "", locais: []
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

        setNfData(prev => ({
          ...prev,
          numero_nf: data.numero_nf || prev.numero_nf,
          data_nf: dataFormatada,
          valor: data.valor_total || prev.valor,
          valor_final: (data.valor_total || prev.valor) - prev.retencao - prev.glosa
        }));

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
    if (!contratoId || !selectedItemId) {
      toast.error("Selecione o contrato e o item.");
      return;
    }

    setSaving(true);
    try {
      const created = await base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoId,
        item_contrato_id: selectedItemId,
        item_label: selectedItemObj?.nome || "Item",
        ano: parseInt(ano),
        mes: mesesNomes.indexOf(mes) + 1,
        status,
        numero_nf: nfData.numero_nf,
        data_nf: nfData.data_nf,
        valor: nfData.valor || 0,
        retencao: nfData.retencao || 0,
        glosa: nfData.glosa || 0,
        valor_pago_final: nfData.valor_final || 0,
        processo_pagamento_sei: processoPagSei,
        ordem_bancaria: ordemBancaria,
        data_lancamento: dataLancamento,
        observacoes: observacoes,
        ordens_servico: exigeOS ? ordensServico : [],
        alterado_por: user?.full_name || "Sistema",
        data_update: new Date().toISOString()
      });

      const isMaterial = selectedItemObj?.nome?.toUpperCase().includes("MATERIAL");
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
      
      toast.success("Lançamento salvo com sucesso.");
      if (onSave) onSave();
      
    } catch (err) {
      toast.error("Erro ao salvar no banco de dados.");
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
            <Label className="font-semibold text-gray-700">Item do Contrato <span className="text-red-500">*</span></Label>
            <Select value={selectedItemId || undefined} onValueChange={setSelectedItemId}>
              <SelectTrigger className="h-10 text-sm bg-white border-gray-300">
                <SelectValue placeholder="Selecione o item sendo pago" />
              </SelectTrigger>
              <SelectContent>
                {itensContratoAtivos.length === 0 ? (
                  <SelectItem value="empty" disabled>Nenhum item vinculado a este contrato</SelectItem>
                ) : (
                  itensContratoAtivos.map(item => (
                    <SelectItem key={item.id} value={String(item.id)} className="uppercase">
                      {item.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedItemId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
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

            <div className="border border-gray-200 rounded-lg p-5 bg-white">
              <div className="flex justify-between items-center mb-6">
                <span className="font-semibold text-sm text-[#1a2e4a] uppercase">{selectedItemObj?.nome}</span>
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
                    value={nfData.numero_nf || ""} 
                    onChange={(e) => setNfData({...nfData, numero_nf: e.target.value})}
                    placeholder="Nº da NF"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">Data da NF <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    value={nfData.data_nf || ""} 
                    onChange={(e) => setNfData({...nfData, data_nf: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">Valor da NF (R$) <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formatarMoeda(nfData.valor * 100 || 0)} 
                    onChange={(e) => handleNFMoneyChange("valor", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">Retenção (R$)</Label>
                  <Input 
                    value={formatarMoeda(nfData.retencao * 100 || 0)} 
                    onChange={(e) => handleNFMoneyChange("retencao", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">Glosa (R$)</Label>
                  <Input 
                    value={formatarMoeda(nfData.glosa * 100 || 0)} 
                    onChange={(e) => handleNFMoneyChange("glosa", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600 font-semibold">Valor Final Pago (R$)</Label>
                  <Input 
                    disabled
                    className="bg-gray-100 font-bold"
                    value={formatarMoeda(nfData.valor_final * 100 || 0)} 
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

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
                        <Label className="text-xs text-gray-600 font-semibold">Data de emissão da OS <span className="text-red-500">*</span></Label>
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
                      <Label className="text-xs text-gray-600 font-semibold">Descrição resumida do serviço <span className="text-red-500">*</span></Label>
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
                          value={os.valor_formatado} 
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
                      <Label className="text-xs text-gray-600 font-semibold">Local de Prestação de Serviços <span className="text-red-500">*</span></Label>
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