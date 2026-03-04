import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];

const CATEGORIAS = [
  { value: "Deslocamento Corretivo",  label: "Deslocamento Corretivo",  tipo: "servico" },
  { value: "Deslocamento Preventivo", label: "Deslocamento Preventivo", tipo: "servico" },
  { value: "Locações",                label: "Locações",                tipo: "servico" },
  { value: "MOR Natal",               label: "MOR Natal",               tipo: "servico" },
  { value: "MOR Mossoró",             label: "MOR Mossoró",             tipo: "servico" },
  { value: "Serviços eventuais",      label: "Serviços eventuais",      tipo: "servico" },
  { value: "Fornecimento de Materiais", label: "Fornecimento de Materiais", tipo: "material" },
];

const MOR_NATAL_MATCH   = ["ARTÍFICE DE ELÉTRICA NATAL","AUXILIAR DE ARTÍFICE ELÉTRICA NATAL","AUXILIAR DE ARTÍFICE CIVIL NATAL","ARTÍFICE CIVIL NATAL","ENGENHEIRO DE CAMPO NATAL"];
const MOR_MOSSORO_MATCH = ["ARTÍFICE ELÉTRICA MOSSORÓ","AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ","AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ","ARTÍFICE CIVIL MOSSORÓ"];

function getItensDoGrupo(categoria, itensContrato) {
  const up = (n) => (n || "").toUpperCase();
  if (categoria === "MOR Natal")   return itensContrato.filter(i => MOR_NATAL_MATCH.some(m => up(i.nome).includes(m)));
  if (categoria === "MOR Mossoró") return itensContrato.filter(i => MOR_MOSSORO_MATCH.some(m => up(i.nome).includes(m)));
  return [];
}

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
  const [osNumero,            setOsNumero]            = useState(lancamento?.os_numero || "");
  const [osData,              setOsData]              = useState(lancamento?.os_data || "");
  const [osLocal,             setOsLocal]             = useState(lancamento?.os_local || "");
  const [dataLancamento,      setDataLancamento]      = useState(lancamento?.data_lancamento || hoje);
  const [observacoes,         setObservacoes]         = useState(lancamento?.observacoes || "");

  // Cada entrada: { item_label, nota_empenho_id, numero_nf, data_nf, valor }
  const [itensLancamento, setItensLancamento] = useState(() => {
    if (lancamento) {
      return [{
        item_label:      lancamento.item_label || "",
        nota_empenho_id: lancamento.nota_empenho_id || null,
        numero_nf:       lancamento.numero_nf || "",
        data_nf:         lancamento.data_nf || hoje,
        valor:           lancamento.valor || "",
      }];
    }
    return [];
  });

  const [empenhos,         setEmpenhos]         = useState([]);
  const [serviceEmpenhoId, setServiceEmpenhoId] = useState(null);
  const [materialEmpenhoId,setMaterialEmpenhoId]= useState(null);
  const [saving,           setSaving]           = useState(false);
  const [extractingPdf,    setExtractingPdf]    = useState(false);
  const pdfInputRef = useRef(null);

  const itensContrato = itens.filter(i => i.contrato_id === contratoId);
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

  // Atualiza automaticamente os empenho_ids dos itens quando empenhos mudam
  useEffect(() => {
    if (!empenhos.length) return;
    setItensLancamento(prev => prev.map(entry => {
      const cat = CATEGORIAS.find(c => c.value === entry.item_label);
      const id  = cat?.tipo === "material" ? materialEmpenhoId : serviceEmpenhoId;
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

  // Categorias que NÃO são MOR (OS se aplica apenas a essas)
  const isMorCategoria = (label) => label === "MOR Natal" || label === "MOR Mossoró";

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractingPdf(true);

    // Verifica se algum item selecionado é MOR (não possui OS)
    const temItensMor = itensLancamento.some(entry => isMorCategoria(entry.item_label));
    // Só extrai OS se houver itens não-MOR selecionados
    const extrairOS = itensLancamento.some(entry => !isMorCategoria(entry.item_label));

    const osProperties = extrairOS ? {
      os_numero: {
        type: "string",
        description: "Número da Ordem de Serviço (OS), encontrado no campo 'Descrição do Serviço' do PDF, no formato 'O.S XXX.YYYY' (ex: O.S 021.2025). Extraia apenas o código numérico (ex: '021.2025'). NÃO confundir com o número do contrato. Se não encontrar, retorne null."
      },
      os_data: {
        type: "string",
        description: "Data da Ordem de Serviço, encontrada no campo 'Descrição do Serviço' junto ao número da OS, geralmente indicada como mês e ano em português (ex: NOVEMBRO 2025). Retorne no formato YYYY-MM-DD usando o primeiro dia do mês. Se não encontrar, retorne null."
      },
    } : {};

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf:   { type: "string", description: "Número da nota fiscal. Se não encontrar, retorne null." },
            data_nf:     { type: "string", description: "Data de emissão da nota fiscal no formato YYYY-MM-DD. Se não encontrar, retorne null." },
            valor_total: { type: "number", description: "Valor total da nota fiscal em reais. Se não encontrar, retorne null." },
            ...osProperties,
          }
        }
      });

      if (result.status === "success" && result.output) {
        const data = result.output;

        // Preenche OS apenas se aplicável e se foram extraídos com sucesso
        if (extrairOS) {
          if (data.os_numero) setOsNumero(data.os_numero);
          if (data.os_data)   setOsData(data.os_data);
          // Se não extraiu, mantém o campo atual para preenchimento manual
        }

        // Preenche NF em TODOS os itens selecionados (incluindo MOR)
        setItensLancamento(prev => prev.map(entry => ({
          ...entry,
          numero_nf: data.numero_nf   != null ? data.numero_nf   : entry.numero_nf,
          data_nf:   data.data_nf     != null ? data.data_nf     : entry.data_nf,
          valor:     data.valor_total != null ? data.valor_total : entry.valor,
        })));

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
      os_numero:            osNumero,
      os_data:              osData,
      os_local:             osLocal,
      data_lancamento:      dataLancamento,
      observacoes,
    };

    if (lancamento?.id) {
      const entry = itensLancamento[0] || {};
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        ...baseData,
        valor:           parseFloat(entry.valor) || 0,
        item_label:      entry.item_label,
        nota_empenho_id: entry.nota_empenho_id,
        numero_nf:       entry.numero_nf,
        data_nf:         entry.data_nf,
      });
    } else {
      for (const entry of itensLancamento) {
        await base44.entities.LancamentoFinanceiro.create({
          ...baseData,
          valor:           parseFloat(entry.valor) || 0,
          item_label:      entry.item_label,
          nota_empenho_id: entry.nota_empenho_id,
          numero_nf:       entry.numero_nf,
          data_nf:         entry.data_nf,
        });
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
                  value={itensLancamento[0]?.item_label || ""}
                  onValueChange={v => {
                    const cat = CATEGORIAS.find(c => c.value === v);
                    setItensLancamento([{
                      item_label:      v,
                      nota_empenho_id: cat?.tipo === "material" ? materialEmpenhoId : serviceEmpenhoId,
                      numero_nf:       itensLancamento[0]?.numero_nf || "",
                      data_nf:         itensLancamento[0]?.data_nf || hoje,
                    }]);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
                  {CATEGORIAS.map(cat => (
                    <div key={cat.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.value}`}
                        checked={itensLancamento.some(e => e.item_label === cat.value)}
                        onCheckedChange={() => toggleCategoria(cat.value)}
                      />
                      <label htmlFor={`cat-${cat.value}`} className="text-sm cursor-pointer leading-tight">
                        {cat.label}
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
                  key={entry.item_label}
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

          {/* OS */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1a2e4a]">Informações da OS</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Número da OS</Label>
                <Input value={osNumero} onChange={e => setOsNumero(e.target.value)} placeholder="Nº da OS" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data da OS</Label>
                <Input type="date" value={osData} onChange={e => setOsData(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Local de Prestação</Label>
                <Select value={osLocal} onValueChange={setOsLocal}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                  <SelectContent>
                    {["Natal","Mossoró","Assú","Caicó","Pau dos Ferros","Ceará Mirim"].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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