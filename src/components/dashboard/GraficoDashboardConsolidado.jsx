import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Save, RefreshCw, AlertCircle, HardHat, Package } from "lucide-react";
import { toast } from "sonner";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// REGRA: Palavras-chave estritas para o filtro de Natureza de Despesa
const MOR_NATAL_KEYS = ["NATAL", "ENGENHEIRO"];
const MOR_MOSSORO_KEYS = ["MOSSORÓ", "MOSSORO"];
const MATERIAL_KEYS = ["MATERIAL", "FORNECIMENTO"];

export default function DetalhamentoOrcamentoContrato({ contratoId, ano, itens, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [linhas, setLinhas] = useState([]);

  // Função para identificar a natureza de despesa (Regra 39 vs 30)
  const identificarNatureza = (nomeItem) => {
    const nome = (nomeItem || "").toUpperCase();
    if (MATERIAL_KEYS.some(k => nome.includes(k))) return "material"; // 339030
    return "servico"; // 339039 (Padrão)
  };

  useEffect(() => {
    if (itens && itens.length > 0) {
      const mapeados = itens.map(item => ({
        id: item.id,
        item_label: item.nome,
        natureza_despesa: identificarNatureza(item.nome),
        valor_orcado: item.valor_total_contratado || 0
      }));
      setLinhas(mapeados);
    }
  }, [itens]);

  const totalServico = linhas
    .filter(l => l.natureza_despesa === "servico")
    .reduce((acc, curr) => acc + curr.valor_orcado, 0);

  const totalMaterial = linhas
    .filter(l => l.natureza_despesa === "material")
    .reduce((acc, curr) => acc + curr.valor_orcado, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card de Resumo de Serviços */}
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase">Natureza 339039 (Serviços)</p>
                <h3 className="text-xl font-bold text-[#1a2e4a]">{fmt(totalServico)}</h3>
              </div>
              <HardHat className="text-blue-100 w-10 h-10" />
            </div>
          </CardContent>
        </Card>

        {/* Card de Resumo de Materiais */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase">Natureza 339030 (Materiais)</p>
                <h3 className="text-xl font-bold text-[#1a2e4a]">{fmt(totalMaterial)}</h3>
              </div>
              <Package className="text-amber-100 w-10 h-10" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-xs font-black uppercase text-gray-600 flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Distribuição de Itens por Empenho
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-100">
              <tr className="text-left font-bold text-gray-500 uppercase border-b">
                <th className="p-3">Item do Contrato</th>
                <th className="p-3">Natureza</th>
                <th className="p-3 text-right">Valor Planejado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-semibold text-[#1a2e4a] uppercase">{linha.item_label}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-[9px] font-bold ${
                      linha.natureza_despesa === "servico" ? "text-blue-600 border-blue-200" : "text-amber-600 border-amber-200"
                    }`}>
                      {linha.natureza_despesa === "servico" ? "339039" : "339030"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-mono font-bold">{fmt(linha.valor_orcado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}