import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function SaldoItens({ contrato, lancamentos, ano }) {
  const [itensOrcados, setItensOrcados] = useState([]);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: contrato.id, ano }),
      base44.entities.ItemContrato.filter({ contrato_id: contrato.id })
    ]).then(([o, i]) => {
      setItensOrcados(o);
      setItens(i);
    });
  }, [contrato.id, ano]);

  if (itensOrcados.length === 0) {
    return (
      <div className="text-xs text-gray-400 text-center py-3">
        Sem detalhamento de orçamento por item cadastrado para {ano}.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="text-left py-1 pr-3 font-medium">Item / Categoria</th>
            <th className="text-right py-1 px-2 font-medium">Orçado</th>
            <th className="text-right py-1 px-2 font-medium">Pago</th>
            <th className="text-right py-1 px-2 font-medium">Aprovisionado</th>
            <th className="text-right py-1 pl-2 font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {itensOrcados.map(io => {
            const lancItem = lancamentos.filter(l =>
              l.ano === ano &&
              (
                (io.item_contrato_id && l.item_contrato_id && l.item_contrato_id === io.item_contrato_id) ||
                l.item_label === io.item_label
              )
            );
            const pago = lancItem.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
            const aprovisionado = lancItem.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
            const saldo = io.valor_orcado - pago - aprovisionado;
            return (
              <tr key={io.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1.5 pr-3 text-gray-700 font-medium">{io.item_label}</td>
                <td className="py-1.5 px-2 text-right text-blue-700">{fmt(io.valor_orcado)}</td>
                <td className="py-1.5 px-2 text-right text-green-700">{fmt(pago)}</td>
                <td className="py-1.5 px-2 text-right text-amber-700">{fmt(aprovisionado)}</td>
                <td className={`py-1.5 pl-2 text-right font-bold ${saldo < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(saldo)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}