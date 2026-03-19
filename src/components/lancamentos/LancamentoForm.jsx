import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução", "Em bloco de assinatura"];

const formatarMoeda = (valor) => {
  if (!valor) return "0,00";
  const apenasNumeros = valor.toString().replace(/\D/g, "");
  const valorDecimal = Number(apenasNumeros) / 100;
  return valorDecimal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function ItemNFCard({ entry, index, empenhos, onChange }) {
  const handleChangeValor = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const numericValue = Number(rawValue) / 100;
    const formattedValue = formatarMoeda(rawValue);
    
    onChange(index, "valor_formatado", formattedValue);
    onChange(index, "valor", numericValue);
  };

  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-black text-sm text-[#1a2e4a] uppercase">{entry.item_label || "Detalhes da Nota Fiscal"}</span>
        {entry.nota_empenho_id && (() => {
          const ne = empenhos?.find(e => String(e.id) === String(entry.nota_empenho_id));
          return ne ? (
            <Badge variant="outline" className="text-[10px] font-black bg-blue-50 text-blue-700 border-blue-200 uppercase px-3 py-1">
              Empenho: {ne.numero_empenho}
            </Badge>
          ) : null;
        })()}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Número da NF *</Label>
          <Input 
            className="font-black text-[#1a2e4a] h-10" 
            value={entry.numero_nf || ""} 
            onChange={e => onChange(index, "numero_nf", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Data da NF *</Label>
          <Input 
            type="date" 
            className="font-bold text-gray-700 h-10"
            value={entry.data_nf || ""} 
            onChange={e => onChange(index, "data_nf", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Valor da NF (R$) *</Label>
          <Input 
            type="text" 
            className="font-black text-xl text-right text-green-700 h-10"
            value={entry.valor_formatado || formatarMoeda(entry.valor || 0)} 
            onChange={handleChangeValor} 
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Tipo de Lançamento *</Label>
          <Select value={entry.tipo_lancamento || "Pagamento"} onValueChange={v => onChange(index, "tipo_lancamento", v)}>
            <SelectTrigger className="font-bold text-gray-700 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pagamento">Pagamento</SelectItem>
              <SelectItem value="Medição">Medição</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Ordem de Serviço (OS)</Label>
          <Input 
            className="font-bold text-gray-700 h-10" 
            value={entry.os_numero || ""} 
            placeholder="Ex: OS 123/2026"
            onChange={e => onChange(index, "os_numero", e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-gray-500">Descrição / Objeto</Label>
          <Input 
            className="font-bold text-gray-700 h-10" 
            value={entry.descricao || ""} 
            placeholder="Resumo do material ou serviço"
            onChange={e => onChange(index, "descricao", e.target.value)} 
          />
        </div>
      </div>
    </div>
  );
}

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date().toISOString().split("T")[0];

  const [listaContratos, setListaContratos] = useState([]);
  const [loadingContratos, setLoadingContratos] = useState(false);
  
  const [contratoId, setContratoId] = useState(lancamento?.contrato_id ? String(lancamento.contrato_id) : "");
  const [ano, setAno] = useState(lancamento?.ano || anoAtual);
  const [mes, setMes] = useState(lancamento?.mes || new Date().getMonth() + 1);
  const [status, setStatus] = useState(lancamento?.status || "Em instrução");
  const [processoPagSei, setProcessoPagSei] = useState(lancamento?.processo_pagamento_sei || "");
  
  const [itensLancamento, setItensLancamento] = useState(lancamento ? [lancamento] : [{ 
    item_label: "Lançamento Avulso", 
    valor: 0, 
    valor_formatado: "0,00",
    tipo_lancamento: "Pagamento",
    os_numero: "",
    descricao: ""
  }]);
  
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0 });
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [itensMaterialExtraidos, setItensMaterialExtraidos] = useState([]);
  const [user, setUser] = useState(null);
  const pdfInputRef = useRef(null);

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
      .then((res) => {
        if (isMounted) {
          setListaContratos(res || []);
        }
      })
      .catch(() => {
        if (isMounted) toast.error("Erro ao buscar a lista de contratos");
      })
      .finally(() => {
        if (isMounted) setLoadingContratos(false);
      });

    return () => { isMounted = false; };
  }, [contratos]);

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
    toast.info("Enviando para IA. Isso pode levar até 20 segundos dependendo do tamanho do PDF.");

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes || !uploadRes.file_url) throw new Error("Falha no envio do arquivo para o servidor");

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf: { type: "string" },
            data_nf: { type: "string", description: "Data no formato DD/MM/YYYY" },
            valor_total: { type: "number" },
            os_numero: { type: "string" },
            descricao_geral: { type: "string" },
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
        
        let dataFormatada = hoje;
        if (data.data_nf) {
          if (data.data_nf.includes("/")) {
            const partes = data.data_nf.split("/");
            if (partes.length === 3) {
              dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
          } else if (data.data_nf.includes("-")) {
             dataFormatada = data.data_nf;
          }
        }
        
        setItensLancamento(prev => prev.map(entry => ({
          ...entry,
          numero_nf: data.numero_nf || entry.numero_nf,
          data_nf: dataFormatada,
          valor: data.valor_total || entry.valor,
          valor_formatado: formatarMoeda(((data.valor_total || 0) * 100).toFixed(0)),
          os_numero: data.os_numero || entry.os_numero,
          descricao: data.descricao_geral || entry.descricao
        })));
        
        toast.success("Leitura da Nota Fiscal concluída.");
      } else {
        throw new Error("A IA não conseguiu ler os dados do PDF");
      }
    } catch (error) {
      toast.error("Erro no processamento. O PDF pode ser muito pesado ou o tempo limite foi atingido.");
    } finally {
      setExtractingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const executeSave = async () => {
    if (!contratoId) {
      toast.error("Selecione um contrato antes de salvar.");
      return;
    }

    setSaving(true);
    setSavingProgress({ current: 1, total: itensLancamento.length });

    try {
      let currentIndex = 1;
      for (const entry of (itensLancamento || [])) {
        setSavingProgress({ current: currentIndex, total: itensLancamento.length });
        const valorReal = parseFloat(entry.valor) || 0;
        
        const created = await base44.entities.LancamentoFinanceiro.create({
          contrato_id: contratoId,
          ano: parseInt(ano),
          mes: parseInt(mes),
          status,
          valor: valorReal,
          numero_nf: entry.numero_nf,
          data_nf: entry.data_nf,
          item_label: entry.item_label,
          tipo_lancamento: entry.tipo_lancamento,
          os_numero: entry.os_numero,
          descricao: entry.descricao,
          processo_pagamento_sei: processoPagSei,
          alterado_por: user?.full_name || "Sistema",
          data_update: new Date().toISOString()
        });

        if (itensMaterialExtraidos?.length > 0) {
          for (const itemMat of itensMaterialExtraidos) {
            await base44.entities.ItemMaterialNF.create({
              ...itemMat,
              lancamento_financeiro_id: created.id,
              os_numero: entry.os_numero || "",
              contrato_id: contratoId
            });
            await new Promise(r => setTimeout(r, 150));
          }
        }
        
        currentIndex++;
        await new Promise(r => setTimeout(r, 300));
      }
      
      toast.success("Lançamento efetuado com sucesso.");
      if (onSave) onSave();
      
    } catch (err) {
      toast.error("Falha de comunicação com o banco de dados.");
    } finally {
      setSaving(false);
      setSavingProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Card className="font-sans border-none shadow-2xl">
      <CardHeader className="bg-[#1a2e4a] rounded-t-xl text-white">
        <CardTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
          Painel de Entrada de Notas Fiscais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 p-8 bg-gray-50/50">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="space-y-2">
            <Label className="font-black uppercase text-xs text-gray-500">Contrato Vinculado *</Label>
            <Select value={contratoId || undefined} onValueChange={setContratoId}>
              <SelectTrigger className="h-12 font-bold text-sm bg-gray-50">
                <SelectValue placeholder={loadingContratos ? "Buscando contratos no banco..." : "Selecione o contrato..."} />
              </SelectTrigger>
              <SelectContent>
                {listaContratos.length === 0 && !loadingContratos && (
                  <SelectItem value="empty" disabled>Nenhum contrato localizado</SelectItem>
                )}
                {listaContratos?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.numero} | {c.contratada}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-black uppercase text-xs text-gray-500">Status Inicial *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 font-bold text-sm bg-gray-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-8 border-2 border-dotted border-blue-200 rounded-2xl bg-blue-50/30 flex flex-col items-center justify-center transition-all hover:bg-blue-50">
            <input ref={pdfInputRef} type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-xs px-8 h-14 shadow-lg" 
              onClick={() => pdfInputRef.current?.click()} 
              disabled={extractingPdf}
            >
              {extractingPdf ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : <Upload className="mr-3 h-5 w-5" />}
              {extractingPdf ? "Lendo documento..." : "Importar Nota Fiscal (PDF)"}
            </Button>
            <p className="text-[11px] text-gray-400 mt-4 uppercase font-bold tracking-widest text-center max-w-md">
              A inteligência artificial fará a leitura ótica e preencherá os valores e itens de material automaticamente.
            </p>
        </div>

        {itensMaterialExtraidos.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
            <h4 className="text-green-800 font-black uppercase text-xs flex items-center gap-2 mb-4">
              Auditoria da IA: Materiais Detectados
            </h4>
            <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
              {itensMaterialExtraidos.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded border border-green-100">
                  <span className="font-bold text-gray-700 truncate pr-4">{item.quantidade}x {item.descricao}</span>
                  <span className="font-black text-green-700 whitespace-nowrap">
                    {formatarMoeda(((item.valor_total_item || 0) * 100).toFixed(0))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {itensLancamento?.map((entry, idx) => (
            <ItemNFCard 
              key={idx} 
              entry={entry} 
              index={idx} 
              empenhos={empenhos} 
              onChange={(i, f, v) => {
                const up = [...itensLancamento];
                up[i][f] = v;
                setItensLancamento(up);
              }} 
            />
          ))}
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button variant="outline" className="font-bold uppercase text-xs h-12 px-8" onClick={onCancel} disabled={saving}>
            Cancelar Lançamento
          </Button>
          <Button 
            onClick={executeSave} 
            disabled={saving || !contratoId} 
            className="bg-[#1a2e4a] hover:bg-[#2a4a7a] text-white font-black uppercase text-xs h-12 px-10 shadow-xl transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-3 h-4 w-4" /> 
                Gravando Lançamento...
              </>
            ) : "Confirmar e Gravar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}