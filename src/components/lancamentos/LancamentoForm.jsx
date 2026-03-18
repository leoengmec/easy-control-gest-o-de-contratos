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
          <Label className="text-xs">Número da NF <span className="text-red-500">*</span></Label>
          <Input
            value={entry.numero_nf}
            onChange={e => onChange(index, "numero_nf", e.target.value)}
            placeholder="Nº da NF"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data da NF <span className="text-red-500">*</span></Label>
          <Input
            type="date"
            value={entry.data_nf}
            onChange={e => onChange(index, "data_nf", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor da NF (R$) <span className="text-red-500">*</span></Label>
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

  const [contratoId, setContratoId] = useState(lancamento?.contrato_id || "");
  const [ano, setAno] = useState(lancamento?.ano || anoAtual);
  const [mes, setMes] = useState(lancamento?.mes || new Date().getMonth() + 1);
  const [status, setStatus] = useState(lancamento?.status || "Em instrução");
  const [processoPagSei, setProcessoPagSei] = useState(lancamento?.processo_pagamento_sei || "");
  const [ordemBancaria, setOrdemBancaria] = useState(lancamento?.ordem_bancaria || "");
  const [ordensServico, setOrdensServico] = useState(lancamento?.ordens_servico || [{ 
    numero: "", 
    descricao: "", 
    valor: "", 
    locais_prestacao_servicos: [], 
    data_emissao: "", 
    data_execucao: "" 
  }]);
  const [dataLancamento, setDataLancamento] = useState(lancamento?.data_lancamento || hoje);
  const [observacoes, setObservacoes] = useState(lancamento?.observacoes || "");

  const [itensLancamento, setItensLancamento] = useState([]);
  const [lancamentosExistentes, setLancamentosExistentes] = useState([]);
  const [empenhos, setEmpenhos] = useState([]);
  const [serviceEmpenhoId, setServiceEmpenhoId] = useState(null);
  const [materialEmpenhoId, setMaterialEmpenhoId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [itensMaterialExtraidos, setItensMaterialExtraidos] = useState([]);
  const [user, setUser] = useState(null);
  const pdfInputRef = useRef(null);

  // Estado para modal de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelJustificativa, setCancelJustificativa] = useState("");
  const [pendingCancellations, setPendingCancellations] = useState([]);

  const itensContratoAtivos = itens.filter(i => i.contrato_id === contratoId && i.ativo);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Carregar empenhos ao mudar contrato/ano
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

  // Carregar lançamentos existentes ao editar (busca por NF)
  useEffect(() => {
    if (!lancamento?.numero_nf || !contratoId) {
      setLancamentosExistentes([]);
      setItensLancamento(lancamento ? [{
        lancamento_id: lancamento.id,
        item_label: lancamento.item_label || "",
        item_contrato_id: lancamento.item_contrato_id || null,
        nota_empenho_id: lancamento.nota_empenho_id || null,
        numero_nf: lancamento.numero_nf || "",
        data_nf: lancamento.data_nf || hoje,
        valor: lancamento.valor || "",
        retencao: lancamento.retencao || "",
        glosa: lancamento.glosa || "",
      }] : []);
      return;
    }

    base44.entities.LancamentoFinanceiro.filter({ 
      contrato_id: contratoId, 
      numero_nf: lancamento.numero_nf 
    }).then(existentes => {
      setLancamentosExistentes(existentes);
      setItensLancamento(existentes.map(l => ({
        lancamento_id: l.id,
        item_label: l.item_label,
        item_contrato_id: l.item_contrato_id,
        nota_empenho_id: l.nota_empenho_id,
        numero_nf: l.numero_nf,
        data_nf: l.data_nf,
        valor: l.valor,
        retencao: l.retencao,
        glosa: l.glosa,
      })));
    }).catch(() => {});
  }, [lancamento, contratoId]);

  // Atualizar empenho_id dos itens quando empenhos carregam
  useEffect(() => {
    if (!empenhos.length) return;
    setItensLancamento(prev => prev.map(entry => {
      const itemConfig = itensContratoAtivos.find(ic => ic.id === entry.item_contrato_id);
      const naturezaTipo = itemConfig?.grupo_servico === 'fixo' || itemConfig?.grupo_servico === 'por_demanda' ? 'servico' : 'material';
      const id = naturezaTipo === "material" ? materialEmpenhoId : serviceEmpenhoId;
      return { ...entry, nota_empenho_id: id };
    }));
  }, [serviceEmpenhoId, materialEmpenhoId]);

  const toggleItemContrato = (itemId, itemLabel) => {
    setItensLancamento(prev => {
      const exists = prev.some(e => e.item_contrato_id === itemId);
      
      // Se desmarca um item existente no banco
      if (exists) {
        const entry = prev.find(e => e.item_contrato_id === itemId);
        if (entry.lancamento_id) {
          setPendingCancellations(curr => [...curr, entry.lancamento_id]);
        }
        return prev.filter(e => e.item_contrato_id !== itemId);
      }

      // Adiciona novo item
      const itemConfig = itensContratoAtivos.find(ic => ic.id === itemId);
      const naturezaTipo = itemConfig?.grupo_servico === 'fixo' || itemConfig?.grupo_servico === 'por_demanda' ? 'servico' : 'material';
      const empenhoId = naturezaTipo === "material" ? materialEmpenhoId : serviceEmpenhoId;

      return [...prev, {
        item_label: itemLabel,
        item_contrato_id: itemId,
        nota_empenho_id: empenhoId,
        numero_nf: prev[0]?.numero_nf || "",
        data_nf: prev[0]?.data_nf || hoje,
        valor: "",
        retencao: "",
        glosa: "",
      }];
    });
  };

  const toggleGrupoMOR = (grupoLabel, palavraChave) => {
    const itensDoGrupo = itensContratoAtivos.filter(item => 
      item.nome.toUpperCase().includes(palavraChave.toUpperCase()) && item.grupo_servico === 'fixo'
    );
    
    const grupoChecked = itensLancamento.some(e => e.item_label === grupoLabel);

    if (grupoChecked) {
      // Desmarcar grupo
      const entry = itensLancamento.find(e => e.item_label === grupoLabel);
      if (entry?.lancamento_id) {
        setPendingCancellations(curr => [...curr, entry.lancamento_id]);
      }
      setItensLancamento(prev => prev.filter(e => e.item_label !== grupoLabel));
    } else {
      // Adicionar grupo como um único item
      setItensLancamento(prev => [...prev, {
        item_label: grupoLabel,
        item_contrato_id: null,
        nota_empenho_id: serviceEmpenhoId,
        numero_nf: prev[0]?.numero_nf || "",
        data_nf: prev[0]?.data_nf || hoje,
        valor: "",
        retencao: "",
        glosa: "",
      }]);
    }
  };

  const updateItem = (index, field, value) => {
    setItensLancamento(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const shouldShowOrdensServico = itensLancamento.some(entry =>
    SERVICE_ITEM_LABELS_FOR_OS.includes(entry.item_label)
  );

  const hasMaterialItem = itensLancamento.some(entry => {
    const itemConfig = itensContratoAtivos.find(ic => ic.id === entry.item_contrato_id);
    return itemConfig && (itemConfig.nome === "FORNECIMENTO DE MATERIAIS" || itemConfig.nome === "FORNECIMENTO DE MATERIAL");
  });

  // Agrupar itens
  const morNatalItens = itensContratoAtivos.filter(item => 
    item.nome.toUpperCase().includes("NATAL") && item.grupo_servico === 'fixo'
  );
  const morMossoroItens = itensContratoAtivos.filter(item => 
    item.nome.toUpperCase().includes("MOSSORÓ") && item.grupo_servico === 'fixo'
  );
  const hasMORNatal = morNatalItens.length > 0;
  const hasMORMossoro = morMossoroItens.length > 0;
  
  const outrosItens = itensContratoAtivos.filter(item => 
    !morNatalItens.some(m => m.id === item.id) && 
    !morMossoroItens.some(m => m.id === item.id)
  );

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
        description: "Número da Ordem de Serviço (OS), encontrado no campo 'Descrição do Serviço' do PDF, no formato 'O.S XXX.YYYY' (ex: O.S 021.2025). Extraia apenas o código numérico (ex: '021.2025'). NÃO confundir com o número do contrato. Se não encontrar, retorne string vazia."
      },
      os_data_emissao: {
        type: "string",
        description: "Data de emissão da Ordem de Serviço, encontrada no campo 'Descrição do Serviço' junto ao número da OS. Retorne no formato YYYY-MM-DD. Se não encontrar, retorne string vazia."
      },
    } : {};

    const isMaterialNota = itensLancamento.some(e => {
        // Verifica pelo grupo_servico do item do contrato
        const itemConfig = itensContratoAtivos.find(ic => ic.id === e.item_contrato_id);
        if (itemConfig?.grupo_servico === 'material') return true;
        // Fallback: verifica pelo nome do item
        const labelUpper = (e.item_label || "").toUpperCase();
        return labelUpper.includes("MATERIAL") || labelUpper.includes("FORNECIMENTO");
    });

    try {
      console.log("=== INICIANDO UPLOAD DO PDF ===");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log("Upload concluído. URL:", file_url);

      const itensMatSchema = isMaterialNota ? {
        itens_material: {
          type: "array",
          description: "Lista de itens/produtos da nota fiscal",
          items: {
            type: "object",
            properties: {
              descricao: { type: "string", description: "Descrição do produto ou serviço" },
              unidade: { type: "string", description: "Unidade de medida (UN, KG, M, PC, etc.)" },
              quantidade: { type: "number", description: "Quantidade do item" },
              valor_unitario: { type: "number", description: "Valor unitário do item" },
              valor_total_item: { type: "number", description: "Valor total do item (quantidade x valor unitário)" },
            }
          }
        }
      } : {};

      console.log("=== SCHEMA PARA EXTRAÇÃO ===");
      console.log("isMaterialNota:", isMaterialNota);
      console.log("Schema completo:", JSON.stringify({
        type: "object",
        properties: {
          numero_nf: { type: "string" },
          data_nf: { type: "string" },
          valor_total: { type: "number" },
          ...osProperties,
          ...itensMatSchema,
        }
      }, null, 2));
      console.log("============================");

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            numero_nf: { type: "string", description: "Número da nota fiscal. Se não encontrar, retorne string vazia." },
            data_nf: { type: "string", description: "Data de emissão da nota fiscal no formato YYYY-MM-DD. Se não encontrar, retorne string vazia." },
            valor_total: { 
              type: "number", 
              description: isMaterialNota 
                ? "Valor total da nota fiscal em reais, extraído do campo 'V. TOTAL PRODUTOS'. Se não encontrar, retorne 0." 
                : "Valor total da nota fiscal em reais, extraído do campo 'Valor do Serviço'. Se não encontrar, retorne 0."
            },
            ...osProperties,
            ...itensMatSchema,
          }
        }
      });

      console.log("=== RESULTADO DA EXTRAÇÃO DO PDF ===");
      console.log("Status:", result.status);
      console.log("Output completo:", result.output);
      console.log("Details (se houver erro):", result.details);
      console.log("isMaterialNota:", isMaterialNota);
      console.log("=====================================");

      if (result.status === "success" && result.output) {
        const data = result.output;

        // Garantir que datas não sejam null ou inválidas
        const dataNfFormatada = data.data_nf && data.data_nf !== "" ? data.data_nf : hoje;
        const osDataEmissaoFormatada = data.os_data_emissao && data.os_data_emissao !== "" ? data.os_data_emissao : hoje;

        if (extrairOS && data.os_numero) {
          setOrdensServico([{ 
            numero: data.os_numero || "", 
            descricao: "", 
            valor: "", 
            locais_prestacao_servicos: [], 
            data_emissao: osDataEmissaoFormatada, 
            data_execucao: "" 
          }]);
        }

        setItensLancamento(prev => prev.map(entry => ({
          ...entry,
          numero_nf: data.numero_nf || entry.numero_nf || "",
          data_nf: dataNfFormatada,
          valor: data.valor_total || entry.valor || "",
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
            data_nf: dataNfFormatada,
            os_numero: ordensServico[0]?.numero || "",
            os_local: ordensServico[0]?.locais_prestacao_servicos[0] || "",
            valor_total_nota: data.valor_total || 0,
          })));
        }
        
        toast.success("Dados extraídos do PDF com sucesso!");
      } else {
        toast.error("Não foi possível extrair dados do PDF. Verifique se o arquivo é uma nota fiscal válida.");
      }
    } catch (error) {
      console.error("=== ERRO NA EXTRAÇÃO DO PDF ===");
      console.error("Mensagem:", error.message);
      console.error("Erro completo:", error);
      console.error("================================");
      toast.error("Erro ao processar o PDF: " + error.message);
    } finally {
      setExtractingPdf(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!contratoId) {
      toast.error("O campo 'Contrato' é obrigatório.");
      return;
    }
    
    if (!mes) {
      toast.error("O campo 'Mês' é obrigatório.");
      return;
    }
    
    if (!ano) {
      toast.error("O campo 'Ano' é obrigatório.");
      return;
    }
    
    if (!status) {
      toast.error("O campo 'Status' é obrigatório.");
      return;
    }
    
    if (!dataLancamento) {
      toast.error("O campo 'Data do Lançamento' é obrigatório.");
      return;
    }
    
    if (itensLancamento.length === 0) { 
      toast.error("Selecione ao menos um item do contrato.");
      return; 
    }

    // Validar cada item de lançamento
    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];
      if (!item.numero_nf) {
        toast.error(`Item ${i + 1}: O campo 'Número da NF' é obrigatório.`);
        return;
      }
      if (!item.data_nf) {
        toast.error(`Item ${i + 1}: O campo 'Data da NF' é obrigatório.`);
        return;
      }
      if (!item.valor || parseFloat(item.valor) <= 0) {
        toast.error(`Item ${i + 1}: O campo 'Valor da NF' é obrigatório e deve ser maior que zero.`);
        return;
      }
    }

    // Validar campos obrigatórios das Ordens de Serviço
    if (shouldShowOrdensServico) {
      for (let i = 0; i < ordensServico.length; i++) {
        const os = ordensServico[i];
        if (!os.numero || !os.numero.trim()) {
          toast.error(`OS ${i + 1}: O campo 'Número da OS' é obrigatório.`);
          return;
        }
        if (!os.data_emissao) {
          toast.error(`OS ${i + 1}: O campo 'Data de emissão da OS' é obrigatório.`);
          return;
        }
        if (!os.descricao || !os.descricao.trim()) {
          toast.error(`OS ${i + 1}: O campo 'Descrição resumida do serviço' é obrigatório.`);
          return;
        }
        if (!os.valor || parseFloat(os.valor) <= 0) {
          toast.error(`OS ${i + 1}: O campo 'Valor da OS (R$)' é obrigatório e deve ser maior que zero.`);
          return;
        }
        if (!os.locais_prestacao_servicos || os.locais_prestacao_servicos.length === 0) {
          toast.error(`OS ${i + 1}: O campo 'Local de Prestação de Serviços' é obrigatório. Selecione ao menos um local.`);
          return;
        }
      }
    }

    // Se houver cancelamentos pendentes, solicita justificativa
    if (pendingCancellations.length > 0) {
      setShowCancelModal(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);

    const baseData = {
      contrato_id: contratoId,
      ano: parseInt(ano),
      mes: parseInt(mes),
      status,
      processo_pagamento_sei: processoPagSei,
      ordem_bancaria: ordemBancaria,
      ordens_servico: ordensServico
      .filter(os => os.numero || os.descricao)
      .map(os => ({
      ...os,
      valor: os.valor ? parseFloat(os.valor) : null,
      data_emissao: os.data_emissao || hoje,
      data_execucao: os.data_execucao || ""
      })),
      data_lancamento: dataLancamento,
      observacoes,
    };

    try {
      // Processar cancelamentos
      for (const lancId of pendingCancellations) {
        const lanc = lancamentosExistentes.find(l => l.id === lancId);
        if (lanc) {
          await base44.entities.LancamentoFinanceiro.update(lancId, {
            status: "Cancelado",
            valor_pago_final: 0,
          });

          await base44.entities.HistoricoLancamento.create({
            lancamento_financeiro_id: lancId,
            tipo_acao: "cancelamento",
            status_anterior: lanc.status,
            status_novo: "Cancelado",
            motivo: cancelJustificativa,
            realizado_por: user?.full_name || user?.email || "Sistema",
            realizado_por_id: user?.id || "",
            data_acao: hoje,
          });
        }
      }

      // Criar ou atualizar lançamentos
      for (const entry of itensLancamento) {
        const valor = parseFloat(entry.valor) || 0;
        const retencao = parseFloat(entry.retencao) || 0;
        const glosa = parseFloat(entry.glosa) || 0;

        if (entry.lancamento_id) {
          // Atualizar existente
          await base44.entities.LancamentoFinanceiro.update(entry.lancamento_id, {
            ...baseData,
            valor,
            retencao,
            glosa,
            valor_pago_final: valor - retencao - glosa,
            item_label: entry.item_label,
            item_contrato_id: entry.item_contrato_id,
            nota_empenho_id: entry.nota_empenho_id,
            numero_nf: entry.numero_nf,
            data_nf: entry.data_nf,
          });
        } else {
          // Criar novo
          const created = await base44.entities.LancamentoFinanceiro.create({
            ...baseData,
            valor,
            retencao,
            glosa,
            valor_pago_final: valor - retencao - glosa,
            item_label: entry.item_label,
            item_contrato_id: entry.item_contrato_id,
            nota_empenho_id: entry.nota_empenho_id,
            numero_nf: entry.numero_nf,
            data_nf: entry.data_nf,
          });

          // Registrar histórico de criação
          await base44.entities.HistoricoLancamento.create({
            lancamento_financeiro_id: created.id,
            tipo_acao: "criacao",
            status_novo: status,
            motivo: "Lançamento criado",
            realizado_por: user?.full_name || user?.email || "Sistema",
            realizado_por_id: user?.id || "",
            data_acao: hoje,
          });

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
                os_local: ordensServico[0]?.locais_prestacao_servicos[0] || "",
              });
            }
          }
        }
      }

      onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelJustificativa.trim()) {
      alert("Por favor, informe a justificativa para o cancelamento.");
      return;
    }
    setShowCancelModal(false);
    await executeSave();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a2e4a]">
            {lancamento ? "Editar Lançamento (Nota Fiscal)" : "Novo Lançamento"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <Label>Contrato <span className="text-red-500">*</span></Label>
              <Select value={contratoId} onValueChange={v => { setContratoId(v); setItensLancamento([]); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                <SelectContent>
                  {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <p className="text-sm font-semibold text-[#1a2e4a]">Mês de Referência da Medição</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Mês <span className="text-red-500">*</span></Label>
                  <Select value={String(mes)} onValueChange={v => setMes(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mesesNomes.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ano <span className="text-red-500">*</span></Label>
                  <Select value={String(ano)} onValueChange={v => setAno(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status <span className="text-red-500">*</span></Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {contratoId && (
              <div className="space-y-2">
                <Label>
                  Itens do Contrato <span className="text-red-500">*</span>
                  <span className="text-gray-400 text-xs ml-1">(selecione um ou mais)</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
                  {hasMORNatal && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="grupo-mor-natal"
                        checked={itensLancamento.some(e => e.item_label === "MOR Natal")}
                        onCheckedChange={() => toggleGrupoMOR("MOR Natal", "NATAL")}
                      />
                      <label htmlFor="grupo-mor-natal" className="text-sm font-semibold text-[#1a2e4a] cursor-pointer">
                        MOR Natal
                      </label>
                    </div>
                  )}
                  {hasMORMossoro && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="grupo-mor-mossoro"
                        checked={itensLancamento.some(e => e.item_label === "MOR Mossoró")}
                        onCheckedChange={() => toggleGrupoMOR("MOR Mossoró", "MOSSORÓ")}
                      />
                      <label htmlFor="grupo-mor-mossoro" className="text-sm font-semibold text-[#1a2e4a] cursor-pointer">
                        MOR Mossoró
                      </label>
                    </div>
                  )}
                  {outrosItens.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={itensLancamento.some(e => e.item_contrato_id === item.id)}
                        onCheckedChange={() => toggleItemContrato(item.id, item.nome)}
                      />
                      <label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer leading-tight">
                        {item.nome}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                        <Label className="text-xs">Número da OS <span className="text-red-500">*</span></Label>
                        <Input
                          value={os.numero}
                          onChange={e => {
                            const updated = [...ordensServico];
                            updated[idx].numero = e.target.value;
                            setOrdensServico(updated);
                          }}
                          placeholder="Nº da OS"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data de emissão da OS <span className="text-red-500">*</span></Label>
                        <Input
                          type="date"
                          value={os.data_emissao}
                          onChange={e => {
                            const updated = [...ordensServico];
                            updated[idx].data_emissao = e.target.value;
                            setOrdensServico(updated);
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Descrição resumida do serviço <span className="text-red-500">*</span></Label>
                        <Input
                          value={os.descricao}
                          onChange={e => {
                            const updated = [...ordensServico];
                            updated[idx].descricao = e.target.value;
                            setOrdensServico(updated);
                          }}
                          placeholder="Descrição resumida"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor da OS (R$) <span className="text-red-500">*</span></Label>
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
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data de execução do serviço</Label>
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
                        <Label className="text-xs">Local de Prestação de Serviços <span className="text-red-500">*</span></Label>
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data do Lançamento <span className="text-red-500">*</span></Label>
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
                {saving ? "Salvando..." : `Salvar ${itensLancamento.length > 1 ? `(${itensLancamento.length} lançamentos)` : "lançamento"}`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cancelamento de Lançamento(s)
            </DialogTitle>
            <DialogDescription>
              Você desmarcou {pendingCancellations.length} item(ns) que já estava(m) registrado(s) no banco de dados. 
              Por favor, informe a justificativa para este cancelamento (obrigatório para auditoria).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Justificativa do Cancelamento *</Label>
            <Textarea
              value={cancelJustificativa}
              onChange={e => setCancelJustificativa(e.target.value)}
              placeholder="Informe o motivo do cancelamento..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button onClick={handleConfirmCancel} className="bg-red-600 hover:bg-red-700">
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}