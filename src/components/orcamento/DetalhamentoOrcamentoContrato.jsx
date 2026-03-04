import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Save, RefreshCw, AlertCircle } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Palavras-chave para identificar MOR Natal e MOR Mossoró
const MOR_NATAL_KEYS = ["natal", "civil natal", "elétrica natal", "elétrico natal", "artífice natal", "auxiliar natal", "administrativo natal", "engenheiro"];
const MOR_MOSSORO_KEYS = ["mossoró", "mossoro", "civil mossoró", "elétrica mossoró"];
const DESL_PREVENTIVO_KEYS = ["deslocamento preventivo"];
const MATERIAL_KEYS = ["material", "fornecimento de material"];

function isMorNatal(nome) {
  const n = nome.toLowerCase();
  return MOR_NATAL_KEYS.some(k => n.includes(k)) && !isMorMossoro(nome);
}
function isMorMossoro(nome) {
  const n = nome.toLowerCase();
  return MOR_MOSSORO_KEYS.some(k => n.includes(k));
}
function isDeslPreventivo(nome) {
  const n = nome.toLowerCase();
  return DESL_PREVENTIVO_KEYS.some(k => n.includes(k));
}
function isMaterial(nome) {
  const n = nome.toLowerCase();
  return MATERIAL_KEYS.some(k => n.includes(k));
}

function calcularValorAnual(item) {
  // valor_total_contratado é o valor mensal * quantidade
  // Para periodicidade mensal, valor anual = valor_unitario * quantidade * 12
  if (item.periodicidade === "mensal") {
    return (item.valor_unitario || 0) * (item.quantidade_contratada || 1) * 12;
  }
  return item.valor_total_contratado || 0;
}

function distribuirOrcamento(itens, totalOrcado) {
  // Identifica grupos
  const morNatalItens = itens.filter(i => isMorNatal(i.nome) && !isMaterial(i.nome));
  const morMossoroItens = itens.filter(i => isMorMossoro(i.nome) && !isMaterial(i.nome));
  const deslPrevItens = itens.filter(i => isDeslPreventivo(i.nome));
  const materialItens = itens.filter(i => isMaterial(i.nome));

  const fixedIds = new Set([
    ...morNatalItens.map(i => i.id),
    ...morMossoroItens.map(i => i.id),
    ...deslPrevItens.map(i => i.id),
    ...materialItens.map(i => i.id),
  ]);

  const demaisItens = itens.filter(i => !fixedIds.has(i.id));

  // Calcula valor anual de cada grupo fixo
  const valMorNatal = morNatalItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valMorMossoro = morMossoroItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valDeslPrev = deslPrevItens.reduce((s, i) => s + calcularValorAnual(i), 0);
  const valMaterial = materialItens.reduce((s, i) => s + calcularValorAnual(i), 0);

  // Valor restante para distribuição proporcional (material não entra no empenho de serviços)
  const totalFixo = valMorNatal + valMorMossoro + valDeslPrev;
  const restante = totalOrcado - totalFixo - valMaterial;

  // Total anual contratado dos demais (para calcular proporção)
  const totalDemaisContratado = demaisItens.reduce((s, i) => s + calcularValorAnual(i), 0);

  const linhas = [];

  if (morNatalItens.length > 0) {
    linhas.push({
      key: "MOR_NATAL",
      label: "MOR Natal",
      item_contrato_id: null,
      valor_orcado: valMorNatal,
      natureza_despesa: "servico",
      origem: "contratado",
      valor_contratado_anual: valMorNatal,
    });
  }

  if (morMossoroItens.length > 0) {
    linhas.push({
      key: "MOR_MOSSORO",
      label: "MOR Mossoró",
      item_contrato_id: null,
      valor_orcado: valMorMossoro,
      natureza_despesa: "servico",
      origem: "contratado",
      valor_contratado_anual: valMorMossoro,
    });
  }

  if (deslPrevItens.length > 0) {
    linhas.push({
      key: "DESL_PREV",
      label: deslPrevItens[0].nome,
      item_contrato_id: deslPrevItens[0].id,
      valor_orcado: valDeslPrev,
      natureza_despesa: "servico",
      origem: "contratado",
      valor_contratado_anual: valDeslPrev,
    });
  }

  demaisItens.forEach(item => {
    const valAnual = calcularValorAnual(item);
    const proporcao = totalDemaisContratado > 0 ? valAnual / totalDemaisContratado : 0;
    const valOrcado = restante > 0 ? proporcao * restante : 0;
    linhas.push({
      key: item.id,
      label: item.nome,
      item_contrato_id: item.id,
      valor_orcado: Math.round(valOrcado * 100) / 100,
      natureza_despesa: "servico",
      origem: "proporcional",
      valor_contratado_anual: valAnual,
    });
  });

  if (materialItens.length > 0) {
    linhas.push({
      key: "MATERIAL",
      label: "Fornecimento de Material",
      item_contrato_id: materialItens[0].id,
      valor_orcado: valMaterial,
      natureza_despesa: "material",
      origem: "contratado",
      valor_contratado_anual: valMaterial,
    });
  }

  return linhas;
}

export default function DetalhamentoOrcamentoContrato({ contrato, ano, totalOrcado, canEdit }) {
  const [itens, setItens] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [savedLinhas, setSavedLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadItens = useCallback(async () => {
    setLoading(true);
    const [itensList, orcItems] = await Promise.all([
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id }),
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano })
    ]);
    setItens(itensList);

    if (orcItems.length > 0) {
      // Já tem detalhamento salvo
      const l = orcItems.map(o => ({
        key: o.item_contrato_id || o.item_label,
        label: o.item_label,
        item_contrato_id: o.item_contrato_id,
        valor_orcado: o.valor_orcado,
        natureza_despesa: o.natureza_despesa || "servico",
        origem: o.origem || "manual",
        valor_contratado_anual: null,
        _id: o.id,
      }));
      setLinhas(l);
      setSavedLinhas(l);
    } else {
      // Gera distribuição automática
      const l = distribuirOrcamento(itensList, totalOrcado);
      setLinhas(l);
      setSavedLinhas([]);
    }
    setLoading(false);
    setDirty(false);
  }, [contrato.id, ano, totalOrcado]);

  useEffect(() => {
    loadItens();
  }, [loadItens]);

  const handleRecalcular = () => {
    const l = distribuirOrcamento(itens, totalOrcado);
    setLinhas(l);
    setDirty(true);
  };

  const handleValorChange = (key, novoValor) => {
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, valor_orcado: parseFloat(novoValor) || 0, origem: "manual" } : l));
    setDirty(true);
  };

  const handleSalvar = async () => {
    setSaving(true);
    // Deleta os existentes e recria
    for (const s of savedLinhas) {
      if (s._id) await base44.entities.OrcamentoContratualItemAnual.delete(s._id);
    }
    for (const l of linhas) {
      await base44.entities.OrcamentoContratualItemAnual.create({
        contrato_id: contrato.id,
        item_contrato_id: l.item_contrato_id || null,
        item_label: l.label,
        ano,
        valor_orcado: l.valor_orcado,
        natureza_despesa: l.natureza_despesa,
        origem: l.origem,
      });
    }
    setSaving(false);
    setDirty(false);
    loadItens();
  };

  const totalLinhas = linhas.reduce((s, l) => s + (l.valor_orcado || 0), 0);
  const diferenca = totalOrcado - totalLinhas;

  if (loading) return <div className="text-sm text-gray-400 py-4 text-center">Carregando detalhamento...</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-gray-700">
          Detalhamento por Item — {contrato.numero} ({ano})
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={handleRecalcular} className="text-blue-700 border-blue-200 hover:bg-blue-50">
                <Wand2 className="w-3.5 h-3.5 mr-1" /> Redistribuir
              </Button>
              <Button size="sm" onClick={handleSalvar} disabled={saving || !dirty} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
                <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {Math.abs(diferenca) > 1 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Total dos itens ({fmt(totalLinhas)}) difere do orçamento ({fmt(totalOrcado)}) em {fmt(Math.abs(diferenca))}.
          {diferenca > 0 ? " Ainda faltam distribuir." : " Valores excedem o orçamento."}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500">
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-center px-3 py-2">Natureza</th>
              <th className="text-right px-3 py-2">Contratado (anual)</th>
              <th className="text-right px-3 py-2 min-w-[180px]">Orçado {ano}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.key} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{l.label}</div>
                  {l.origem === "proporcional" && (
                    <div className="text-xs text-gray-400">distribuição proporcional</div>
                  )}
                  {l.origem === "manual" && (
                    <div className="text-xs text-amber-500">ajuste manual</div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge
                    variant="outline"
                    className={l.natureza_despesa === "material" ? "text-orange-600 border-orange-200" : "text-blue-600 border-blue-200"}
                  >
                    {l.natureza_despesa === "material" ? "Material" : "Serviço"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {l.valor_contratado_anual != null ? fmt(l.valor_contratado_anual) : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={l.valor_orcado}
                      onChange={e => handleValorChange(l.key, e.target.value)}
                      className="w-40 text-right ml-auto h-8 text-sm"
                    />
                  ) : (
                    <span className="font-semibold text-[#1a2e4a]">{fmt(l.valor_orcado)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t">
              <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-gray-700">Total</td>
              <td className={`px-3 py-2 text-right font-bold text-base ${Math.abs(diferenca) > 1 ? "text-amber-600" : "text-green-600"}`}>
                {fmt(totalLinhas)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-3 py-2 text-xs text-gray-500">
                Serviços (empenho 339039)
              </td>
              <td className="px-3 py-2 text-right text-xs text-blue-700 font-medium">
                {fmt(linhas.filter(l => l.natureza_despesa === "servico").reduce((s, l) => s + l.valor_orcado, 0))}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-3 py-2 text-xs text-gray-500">
                Material (empenho 339030)
              </td>
              <td className="px-3 py-2 text-right text-xs text-orange-600 font-medium">
                {fmt(linhas.filter(l => l.natureza_despesa === "material").reduce((s, l) => s + l.valor_orcado, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}