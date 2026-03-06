import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GaugeChart from "./GaugeChart";

const currentYear = new Date().getFullYear();
const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027, 2028];

// Categorias pré-definidas (labels que aparecem no seletor)
const CATEGORIES = [
  { label: "MOR (Natal + Mossoró)", value: "mor" },
  { label: "MOR Natal", value: "mor_natal" },
  { label: "MOR Mossoró", value: "mor_mossoro" },
  { label: "Deslocamento Preventivo", value: "deslocamento_preventivo" },
  { label: "Deslocamento Corretivo", value: "deslocamento_corretivo" },
  { label: "Locações", value: "locacoes" },
  { label: "Serviços Eventuais", value: "servicos_eventuais" },
  { label: "Fornecimento de Materiais", value: "materiais" },
];

// Mapeia o valor de categoria para os item_labels que a compõem
const CATEGORY_LABELS_MAP = {
  mor: ["MOR Natal", "MOR Mossoró"],
  mor_natal: ["MOR Natal"],
  mor_mossoro: ["MOR Mossoró"],
  deslocamento_preventivo: ["Deslocamento Preventivo"],
  deslocamento_corretivo: ["Deslocamento Corretivo"],
  locacoes: ["Locações"],
  servicos_eventuais: ["Serviços eventuais"],
  materiais: ["Fornecimento de Materiais"],
};

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function ContractFinancialOverview({ contractId, contractName }) {
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingData, setLoadingData] = useState(true);

  const [paidVsBudgeted, setPaidVsBudgeted] = useState({ paid: 0, budgeted: 0, percent: 0, items: [] });
  const [contractedVsBudgeted, setContractedVsBudgeted] = useState({ contracted: 0, budgeted: 0, percent: 0 });

  useEffect(() => {
    if (!contractId) return;
    setLoadingData(true);

    const ano = parseInt(selectedYear);
    const relevantLabels = selectedCategory !== "all" ? CATEGORY_LABELS_MAP[selectedCategory] : null;

    Promise.all([
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contractId, ano }),
      base44.entities.LancamentoFinanceiro.filter({ contrato_id: contractId, ano, status: "Pago" }),
      base44.entities.ItemContrato.filter({ contrato_id: contractId }),
    ]).then(([orcamentos, lancamentos, contractItems]) => {

      // ── Calcular totais ──
      let totalBudgeted = 0;
      let totalPaid = 0;
      let totalContracted = 0;

      const matchLabel = (label) =>
        !relevantLabels || relevantLabels.some(rl => label?.toLowerCase().includes(rl.toLowerCase()));

      orcamentos.forEach(o => {
        if (matchLabel(o.item_label)) totalBudgeted += o.valor_orcado || 0;
      });

      lancamentos.forEach(l => {
        if (matchLabel(l.item_label)) totalPaid += l.valor || 0;
      });

      contractItems.forEach(ci => {
        if (matchLabel(ci.nome)) {
          if (ci.periodicidade === "mensal" && ci.valor_unitario && ci.quantidade_contratada) {
            totalContracted += (ci.valor_unitario * ci.quantidade_contratada * 12);
          } else {
            totalContracted += ci.valor_total_contratado || 0;
          }
        }
      });

      const percentPaid = totalBudgeted > 0 ? (totalPaid / totalBudgeted) * 100 : 0;
      const percentContracted = totalBudgeted > 0 ? (totalContracted / totalBudgeted) * 100 : 0;

      // ── Detalhamento por sub-item (apenas quando uma categoria está selecionada) ──
      const itemsDetail = [];
      if (selectedCategory !== "all" && relevantLabels) {
        const itemMap = new Map();

        orcamentos.forEach(o => {
          if (matchLabel(o.item_label)) {
            const key = o.item_label;
            if (!itemMap.has(key)) itemMap.set(key, { budgeted: 0, paid: 0, label: key });
            itemMap.get(key).budgeted += o.valor_orcado || 0;
          }
        });

        lancamentos.forEach(l => {
          if (matchLabel(l.item_label)) {
            const key = l.item_label;
            if (!itemMap.has(key)) itemMap.set(key, { budgeted: 0, paid: 0, label: key });
            itemMap.get(key).paid += l.valor || 0;
          }
        });

        itemMap.forEach((data) => {
          const percent = data.budgeted > 0 ? (data.paid / data.budgeted) * 100 : 0;
          itemsDetail.push({ ...data, percent });
        });
      }

      setPaidVsBudgeted({ paid: totalPaid, budgeted: totalBudgeted, percent: percentPaid, items: itemsDetail });
      setContractedVsBudgeted({ contracted: totalContracted, budgeted: totalBudgeted, percent: percentContracted });
      setLoadingData(false);
    }).catch(err => {
      console.error("Erro ao carregar dados do contrato:", err);
      setLoadingData(false);
    });
  }, [contractId, selectedYear, selectedCategory]);

  const gaugeThresholds = [
    { value: 60, color: "green" },
    { value: 85, color: "yellow" },
    { value: 100, color: "red" },
  ];

  const selectedCategoryLabel = CATEGORIES.find(c => c.value === selectedCategory)?.label;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-gray-500">Vigência:</span>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-7 text-xs w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANOS_DISPONIVEIS.map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs font-medium text-gray-500">Categoria/Item:</span>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="h-7 text-xs w-56">
            <SelectValue placeholder="Todos os itens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os itens</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingData ? (
        <div className="text-sm text-gray-400 py-6 text-center">Carregando dados financeiros...</div>
      ) : (
        <>
          {/* Gauge Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm text-[#1a2e4a]">Pago vs. Orçado</CardTitle>
                {selectedCategoryLabel && (
                  <p className="text-xs text-gray-400">{selectedCategoryLabel}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-4">
                <GaugeChart
                  value={paidVsBudgeted.percent}
                  label="do orçado pago"
                  thresholds={gaugeThresholds}
                />
                <div className="text-center mt-2 space-y-0.5">
                  <p className="text-xs text-gray-500">Pago: <span className="font-semibold text-gray-700">{fmt(paidVsBudgeted.paid)}</span></p>
                  <p className="text-xs text-gray-500">Orçado: <span className="font-semibold text-gray-700">{fmt(paidVsBudgeted.budgeted)}</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-sm text-[#1a2e4a]">Contratado vs. Orçado</CardTitle>
                {selectedCategoryLabel && (
                  <p className="text-xs text-gray-400">{selectedCategoryLabel}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-4">
                <GaugeChart
                  value={contractedVsBudgeted.percent}
                  label="do orçado comprometido"
                  thresholds={gaugeThresholds}
                />
                <div className="text-center mt-2 space-y-0.5">
                  <p className="text-xs text-gray-500">Contratado: <span className="font-semibold text-gray-700">{fmt(contractedVsBudgeted.contracted)}</span></p>
                  <p className="text-xs text-gray-500">Orçado: <span className="font-semibold text-gray-700">{fmt(contractedVsBudgeted.budgeted)}</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhe por sub-item */}
          {selectedCategory !== "all" && paidVsBudgeted.items.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-[#1a2e4a]">Detalhe por Item — {selectedCategoryLabel}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-1">
                  {paidVsBudgeted.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${
                          item.percent <= 60 ? "text-green-600" :
                          item.percent <= 85 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {item.percent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {fmt(item.paid)} / {fmt(item.budgeted)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}