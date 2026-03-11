import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Plus, X } from "lucide-react";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

const SERVICE_ITEM_LABELS_FOR_OS = [
  "Deslocamento Corretivo",
  "Deslocamento Preventivo",
  "Deslocamento Engenheiro",
  "Locações",
  "Serviços eventuais",
  "Fornecimento de Materiais",
];

const NATUREZA_LABELS = {
  "339039_servico": "NE Serviços (339039)",
  "339030_material": "NE Material (339030)"
};

function ItemNFCard({ entry, index, empenhos, onChange }) {
  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-[#1a2e4a]">{entry.item_label}</span>
        {entry.nota_empenho_id && (() => {
          const ne = empenhos.find(e => e.id === entry.nota_empenho_id);
          return ne ? (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {ne.numero_empenho}
            </Badge>
          ) : null;
        })()}
        {!entry.nota_empenho_id && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            Sem empenho vinculado
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Número da NF</Label>
          <Input
            value={entry.numero_nf}
            onChange={e => onChange(index, "numero_nf", e.target.value)}
            placeholder="Nº da NF"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data da NF</Label>
          <Input
            type="date"
            value={entry.data_nf}
            onChange={e => onChange(index, "data_nf", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor da NF (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={entry.valor}
            onChange={e => onChange(index, "valor", e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Retenção (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={entry.retencao || ""}
            onChange={e => onChange(index, "retencao", e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Glosa (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={entry.glosa || ""}
            onChange={e => onChange(index, "glosa", e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor Final Pago (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={(parseFloat(entry.valor || 0) - parseFloat(entry.retencao || 0) - parseFloat(entry.glosa || 0)).toFixed(2)}
            disabled
            className="bg-gray-50"
          />
        </div>
      </div>
    </div>
  );
}

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date().toISOString().split("T")[0];

  const [contratoId,          setContratoId]          = useState(lancamento?.contrato_id || "");
  const [ano,                 setAno]                 = useState(lancamento?.ano || anoAtual);
  const [mes,                 setMes]                 = useState(lancamento?.mes || new Date().getMonth() + 1);
  const [status,              setStatus]              = useState(lancamento?.status || "Em instrução");

  const [processoPagSei,      setProcessoPagSei]      = useState(lancamento?.processo_pagamento_sei || "");
  const [ordemBancaria,       setOrdemBancaria]       = useState(lancamento?.ordem_bancaria || "");
  const [ordensServico,       setOrdensServico]       = useState(lancamento?.ordens_servico || [{ 
    numero: "", 
    descricao: "", 
    valor: "", 
    locais_prestacao_servicos: [], 
    data_emissao: "", 
    data_execucao: "" 
  }]);
  const [osLocais,            setOsLocais]            = useState(lancamento?.os_locais || []);
  const [dataLancamento,      setDataLancamento]      = useState(lancamento?.data_lancamento || hoje);
  const [observacoes,         setObservacoes]         = useState(lancamento?.observacoes || "");

  // Cada entrada: { item_label, nota_empenho_id, numero_nf, data_nf, valor, retencao, glosa }
  const [itensLancamento, setItensLancamento] = useState(() => {
    if (lancamento) {
      return [{
        item_label:      lancamento.item_label || "",
        item_contrato_id: lancamento.item_contrato_id || null,
        nota_empenho_id: lancamento.nota_empenho_id || null,
        numero_nf:       lancamento.numero_nf || "",
        data_nf:         lancamento.data_nf || hoje,
        valor:           lancamento.valor || "",
        retencao:        lancamento.retencao || "",
        glosa:           lancamento.glosa || "",
      }];
    }
    return [];
  });

  const [empenhos,              setEmpenhos]              = useState([]);
  const [serviceEmpenhoId,      setServiceEmpenhoId]      = useState(null);
  const [materialEmpenhoId,     setMaterialEmpenhoId]     = useState(null);
  const [saving,                setSaving]                = useState(false);
  const [extractingPdf,         setExtractingPdf]         = useState(false);
  const [itensMaterialExtraidos,setItensMaterialExtraidos]= useState([]);
  const pdfInputRef = useRef(null);

  const itensContratoAtivos = itens.filter(i => i.contrato_id === contratoId && i.ativo);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);

  useEffect(() => {
    if (!contratoId || !ano) { setEmpenhos([]); setServiceEmpenhoId(null); setMaterialEmpenhoId(null); return; }
    base44.entities.NotaEmpenho.filter({ contrato_id: contratoId, ano: parseInt(ano) })
      .then(data => {
        setEmpenhos(data);
        setServiceEmpenhoId(data.find(e => e.natureza_despesa === "339039_servico")?.id || null);
        setMaterialEmpenhoId(data.find(e => e.natureza_despesa === "339030_material")?.id || null);
      })
      .catch(() => { setEmpenhos([]); setServiceEmpenhoId(null); setMaterialEmpenhoId(null); });
  }, [contratoId, ano]);

  useEffect(() => {
    if (!empenhos.length) return;
    setItensLancamento(prev => prev.map(entry => {
      const itemConfig = itensContratoAtivos.find(ic => ic.id === entry.item_contrato_id);
      const naturezaTipo = itemConfig?.grupo_servico === 'fixo' || itemConfig?.grupo_servico === 'por_demanda' ? 'servico' : 'material';
      const id  = naturezaTipo === "material" ? materialEmpenhoId : serviceEmpenhoId;
      return { ...entry, nota_empenho_id: id };
    }));
  }, [serviceEmpenhoId, materialEmpenhoId]);

  const toggleCategoria = (catValue) => {
    const cat = CATEGORIAS.find(c => c.value === catValue);
    setItensLancamento(prev => {
      const exists = prev.some(e => e.item_label === catValue);
      if (exists) return prev.filter(e => e.item_label !== catValue);
      return [...prev, {
        item_label:      catValue,
        nota_empenho_id: cat?.tipo === "material" ? materialEmpenhoId : serviceEmpenhoId,
        numero_nf:       "",
        data_nf:         hoje,
        valor:           "",
        retencao:        "",
        glosa:           "",
      }];
    });
  };

  const updateItem = (index, field, value) => {
    setItensLancamento(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isMorCategoria = (label) => label === "MOR Natal" || label === "MOR Mossoró";

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);

    const extrairOS = itensLancamento.some(entry =>
        SERVICE_ITEM_LABELS_FOR_OS.includes(entry.item_label)
    );

    const osProperties = extrairOS ? {
      os_numero: {
        type: "string",
        description: "Número da Ordem de Serviço (OS), encontrado no campo 'Descrição do Serviço' do PDF, no formato 'O.S XXX.YYYY' (ex: O.S 021.2025). Extraia apenas o código numérico (ex: '021.2025'). NÃO confundir com o número do contrato. Se não encontrar, retorne null."
      },
      os_data_emissao: {
        type: "string",
        description: "Data de emissão da Ordem de Serviço, encontrada no campo 'Descrição do Serviço' junto ao número da OS. Retorne no formato YYYY-MM-DD. Se não encontrar, retorne null."
      },
    } : {};

    const isMaterialNota = itensLancamento.some(e => {
        const itemConfig = itensContratoAtivos.find(ic => ic.id === e.item_contrato_id);
        return itemConfig?.grupo_servico === 'material';
    });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const itensMatSchema = isMaterialNota ? {
        itens_material: {
          type: "array",
          description: "Lista de itens/produtos da nota fiscal",
          items: {
            type: "object",
            properties: {
              descricao:       { type: "string", description: "Descrição do produto ou serviço" },
              unidade:         { type: "string", description: "Unidade de medida (UN, KG, M, PC, etc.)" },
              quantidade:      { type: "number", description: "Quantidade do item" },
              valor_unitario:  { type: "number", description: "Valor unitário do item" },
              valor_total_item:{ type: "number", description: "Valor total do item (quantidade x valor unitário)" },
            }
          }
        }
      } : {};

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf:   { type: "string", description: "Número da nota fiscal. Se não encontrar, retorne null." },
            data_nf:     { type: "string", description: "Data de emissão da nota fiscal no formato YYYY-MM-DD. Se não encontrar, retorne null." },
            valor_total: { type: "number", description: "Valor total da nota fiscal em reais. Se não encontrar, retorne null." },
            ...osProperties,
            ...itensMatSchema,
          }
        }
      });

      if (result.status === "success" && result.output) {
        const data = result.output;

        if (extrairOS && data.os_numero && data.os_data_emissao) {
          setOrdensServico([{ 
            numero: data.os_numero, 
            descricao: "", 
            valor: "", 
            locais_prestacao_servicos: [], 
            data_emissao: data.os_data_emissao, 
            data_execucao: "" 
          }]);
        }

        setItensLancamento(prev => prev.map(entry => ({
          ...entry,
          numero_nf: data.numero_nf   != null ? data.numero_nf   : entry.numero_nf,
          data_nf:   data.data_nf     != null ? data.data_nf     : entry.data_nf,
          valor:     data.valor_total != null ? data.valor_total : entry.valor,
        })));

        const isMaterial = itensLancamento.some(e => {
            const itemConfig = itensContratoAtivos.find(ic => ic.id === e.item_contrato_id);
            return itemConfig?.grupo_servico === 'material';
        });
        if (isMaterial && data.itens_material && Array.isArray(data.itens_material)) {
          setItensMaterialExtraidos(data.itens_material.map(item => ({
            ...item,
            contrato_id: contratoId,
            numero_nf: data.numero_nf || "",
            data_nf: data.data_nf || "",
            os_numero: ordensServico[0]?.numero || "",
            os_local: ordensServico[0]?.locais_prestacao_servicos[0] || "",
            valor_total_nota: data.valor_total || 0,
          })));
        }

      } else {
        alert("Não foi possível extrair dados do PDF. Verifique se o arquivo é uma nota fiscal válida.");
      }
    } finally {
      setExtractingPdf(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lancamento && itensLancamento.length === 0) { alert("Selecione ao menos um item."); return; }
    setSaving(true);

    const baseData = {
      contrato_id:          contratoId,
      ano:                  parseInt(ano),
      mes:                  parseInt(mes),
      status,
      processo_pagamento_sei: processoPagSei,
      ordem_bancaria:       ordemBancaria,
      ordens_servico:       ordensServico.filter(os => os.numero || os.descricao),
      data_lancamento:      dataLancamento,
      observacoes,
    };

    if (lancamento?.id) {
      const entry = itensLancamento[0] || {};
      const valor = parseFloat(entry.valor) || 0;
      const retencao = parseFloat(entry.retencao) || 0;
      const glosa = parseFloat(entry.glosa) || 0;
      
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        ...baseData,
        valor,
        retencao,
        glosa,
        valor_pago_final: valor - retencao - glosa,
        item_label:      entry.item_label,
        item_contrato_id: entry.item_contrato_id,
        nota_empenho_id: entry.nota_empenho_id,
        numero_nf:       entry.numero_nf,
        data_nf:         entry.data_nf,
      });
    } else {
      for (const entry of itensLancamento) {
        const valor = parseFloat(entry.valor) || 0;
        const retencao = parseFloat(entry.retencao) || 0;
        const glosa = parseFloat(entry.glosa) || 0;
        
        const created = await base44.entities.LancamentoFinanceiro.create({
          ...baseData,
          valor,
          retencao,
          glosa,
          valor_pago_final: valor - retencao - glosa,
          item_label:      entry.item_label,
          item_contrato_id: entry.item_contrato_id,
          nota_empenho_id: entry.nota_empenho_id,
          numero_nf:       entry.numero_nf,
          data_nf:         entry.data_nf,
        });

        // Registrar histórico de retenção se houver
        if (retencao > 0) {
          await base44.entities.HistoricoRetencao.create({
            lancamento_financeiro_id: created.id,
            valor_retido: retencao,
            valor_cancelado: 0,
            data_acao: hoje,
            tipo_acao: "aplicada",
          });
        }

        const itemConfig = itensContratoAtivos.find(ic => ic.id === entry.item_contrato_id);
        if (itemConfig?.grupo_servico === "material" && itensMaterialExtraidos.length > 0) {
          for (const itemMat of itensMaterialExtraidos) {
            await base44.entities.ItemMaterialNF.create({
              ...itemMat,
              lancamento_financeiro_id: created.id,
              os_numero: ordensServico[0]?.numero || "",
              os_local:  ordensServico[0]?.locais_prestacao_servicos[0] || "",
            });
          }
        }
      }
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a]">{lancamento ? "Editar Lançamento" : "Novo Lançamento"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* CONTRATO */}
          <div className="space-y-1">
            <Label>Contrato *</Label>
            <Select value={contratoId} onValueChange={v => { setContratoId(v); setItensLancamento([]); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* MÊS / ANO / STATUS */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <p className="text-sm font-semibold text-[#1a2e4a]">Mês de Referência da Medição</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Mês *</Label>
                <Select value={String(mes)} onValueChange={v => setMes(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mesesNomes.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ano *</Label>
                <Select value={String(ano)} onValueChange={v => setAno(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ITENS / CATEGORIAS */}
          {contratoId && (
            <div className="space-y-2">
              <Label>
                Itens do Contrato
                {!lancamento && <span className="text-gray-400 text-xs ml-1">(selecione um ou mais)</span>}
              </Label>
              {lancamento ? (
                <Select
                  value={itensLancamento[0]?.item_contrato_id || ""}
                  onValueChange={v => {
                    const selectedItem = itensContratoAtivos.find(item => item.id === v);
                    if (selectedItem) {
                        const naturezaTipo = selectedItem.grupo_servico === 'fixo' || selectedItem.grupo_servico === 'por_demanda' ? 'servico' : 'material';
                        setItensLancamento([{
                            item_label:       selectedItem.nome,
                            item_contrato_id: selectedItem.id,
                            nota_empenho_id:  naturezaTipo === "material" ? materialEmpenhoId : serviceEmpenhoId,
                            numero_nf:        itensLancamento[0]?.numero_nf || "",
                            data_nf:          itensLancamento[0]?.data_nf || hoje,
                            valor:            itensLancamento[0]?.valor || "",
                            retencao:         itensLancamento[0]?.retencao || "",
                            glosa:            itensLancamento[0]?.glosa || "",
                        }]);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                  <SelectContent>
                    {itensContratoAtivos.map(item => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
                  {itensContratoAtivos.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={itensLancamento.some(e => e.item_contrato_id === item.id)}
                        onCheckedChange={(checked) => toggleItemContrato(item.id, item.nome)}
                      />
                      <label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer leading-tight">
                        {item.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NF POR ITEM */}
          {itensLancamento.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-[#1a2e4a]">
                  Notas Fiscais {itensLancamento.length > 1 && <span className="font-normal text-gray-400 text-xs">({itensLancamento.length} itens)</span>}
                </Label>
                <div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                    disabled={extractingPdf}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    {extractingPdf
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Extraindo...</>
                      : <><Upload className="w-3 h-3" /> Importar PDF da NF</>
                    }
                  </Button>
                </div>
              </div>
              {itensLancamento.map((entry, idx) => (
                <ItemNFCard
                  key={entry.item_contrato_id || entry.item_label}
                  entry={entry}
                  index={idx}
                  empenhos={empenhos}
                  onChange={updateItem}
                />
              ))}
            </div>
          )}

          {/* PROCESSO SEI E ORDEM BANCÁRIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Processo de Pagamento SEI</Label>
              <Input value={processoPagSei} onChange={e => setProcessoPagSei(e.target.value)} placeholder="Nº do processo SEI" />
            </div>
            <div className="space-y-1">
              <Label>Ordem Bancária</Label>
              <Input value={ordemBancaria} onChange={e => setOrdemBancaria(e.target.value)} placeholder="Nº da ordem bancária" />
            </div>
          </div>

          {/* OS (CONDITIONAL) */}
          {shouldShowOrdensServico && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-[#1a2e4a]">Ordens de Serviço</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setOrdensServico([...ordensServico, { 
                    numero: "", 
                    descricao: "", 
                    valor: "", 
                    locais_prestacao_servicos: [], 
                    data_emissao: "", 
                    data_execucao: "" 
                  }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Adicionar OS
                </Button>
              </div>
            {ordensServico.map((os, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1a2e4a]">OS #{idx + 1}</span>
                  {ordensServico.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => setOrdensServico(ordensServico.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Número da OS</Label>
                    <Input
                      value={os.numero}
                      onChange={e => {
                        const updated = [...ordensServico];
                        updated[idx].numero = e.target.value;
                        setOrdensServico(updated);
                      }}
                      placeholder="Nº da OS"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor da OS (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={os.valor}
                      onChange={e => {
                        const updated = [...ordensServico];
                        updated[idx].valor = e.target.value;
                        setOrdensServico(updated);
                      }}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Descrição da OS</Label>
                    <Input
                      value={os.descricao}
                      onChange={e => {
                        const updated = [...ordensServico];
                        updated[idx].descricao = e.target.value;
                        setOrdensServico(updated);
                      }}
                      placeholder="Descrição detalhada"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Emissão da OS</Label>
                    <Input
                      type="date"
                      value={os.data_emissao}
                      onChange={e => {
                        const updated = [...ordensServico];
                        updated[idx].data_emissao = e.target.value;
                        setOrdensServico(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Execução da OS</Label>
                    <Input
                      type="date"
                      value={os.data_execucao}
                      onChange={e => {
                        const updated = [...ordensServico];
                        updated[idx].data_execucao = e.target.value;
                        setOrdensServico(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Locais de Prestação de Serviços para esta OS</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-2 bg-white">
                        {["Natal","Mossoró","Assú","Caicó","Pau dos Ferros","Ceará Mirim"].map(local => (
                          <div key={local} className="flex items-center gap-2">
                            <Checkbox
                              id={`os-${idx}-local-${local}`}
                              checked={(os.locais_prestacao_servicos || []).includes(local)}
                              onCheckedChange={(checked) => {
                                const updated = [...ordensServico];
                                const locais = updated[idx].locais_prestacao_servicos || [];
                                if (checked) {
                                  updated[idx].locais_prestacao_servicos = [...locais, local];
                                } else {
                                  updated[idx].locais_prestacao_servicos = locais.filter(l => l !== local);
                                }
                                setOrdensServico(updated);
                              }}
                            />
                            <label htmlFor={`os-${idx}-local-${local}`} className="text-xs cursor-pointer">
                              {local}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* LOCAIS GLOBAIS (mantido para compatibilidade) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1a2e4a]">Locais de Prestação de Serviços (Geral)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
              {LOCAIS_JFRN.map(local => (
                <div key={local} className="flex items-center gap-2">
                  <Checkbox
                    id={`local-${local}`}
                    checked={osLocais.includes(local)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setOsLocais([...osLocais, local]);
                      } else {
                        setOsLocais(osLocais.filter(l => l !== local));
                      }
                    }}
                  />
                  <label htmlFor={`local-${local}`} className="text-sm cursor-pointer leading-tight">
                    {local}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* DATA E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data do Lançamento</Label>
              <Input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button
              type="submit"
              className="bg-[#1a2e4a] hover:bg-[#2a4a7a]"
              disabled={saving || !contratoId || itensLancamento.length === 0}
            >
              {saving ? "Salvando..." : lancamento ? "Salvar" : `Criar ${itensLancamento.length > 1 ? itensLancamento.length + " lançamentos" : "lançamento"}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}