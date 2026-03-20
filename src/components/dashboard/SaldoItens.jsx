import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function SaldoItens({ contrato, lancamentos, ano }) {
  const [itensOrcados, setItensOrcados] = useState([]);

  useEffect(() => {
    // Busca o planeamento orçamental para o ano específico
    base44.entities.OrcamentoContratualItemAnual.filter({ 
      contrato_id: contrato.id, 
      ano: parseInt(ano) 
    }).then(res => setItensOrcados(res || []));
  }, [contrato.id, ano]);

  if (itensOrcados.length === 0) {
    return (
      <div className="text-[10px] text-gray-400 text-center py-4 uppercase font-bold tracking-widest border-2 border-dashed rounded-lg">
        Sem planeamento orçamental para {ano}
      </div>
    );
  }

  // Função de normalização rigorosa para garantir que "MOR Natal" na planilha 
  // seja igual a "mor natal" no banco
  const normalizar = (texto) => 
    (texto || "").toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b text-gray-400 uppercase font-black">
            <th className="text-left py-2 pr-3">Item / Categoria</th>
            <th className="text-right py-2 px-2 text-blue-600">Orçado</th>
            <th className="text-right py-2 px-2 text-green-600">Pago</th>
            <th className="text-right py-2 px-2 text-amber-600">Aprov.</th>
            <th className="text-right py-2 pl-3">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {itensOrcados.map(io => {
            // REGRA DE OURO: Filtra lançamentos por ID do Item ou por Label (Aglutinador)
            const lancItem = lancamentos.filter(l =>
              String(l.ano) === String(ano) &&
              (
                (l.item_contrato_id && l.item_contrato_id === io.item_contrato_id) ||
                normalizar(l.item_label) === normalizar(io.item_label)
              )
            );

            const pago = lancItem.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
            const aprovisionado = lancItem.filter(l => ["SOF", "Aprovisionado", "Em execução"].includes(l.status))
                                          .reduce((s, l) => s + (l.valor || 0), 0);
            
            const saldo = (io.valor_orcado || 0) - pago - aprovisionado;

            return (
              <tr key={io.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2 pr-3 font-bold text-[#1a2e4a] uppercase">{io.item_label}</td>
                <td className="py-2 px-2 text-right font-mono text-blue-700 bg-blue-50/30">{fmt(io.valor_orcado)}</td>
                <td className="py-2 px-2 text-right font-mono text-green-700">{fmt(pago)}</td>
                <td className="py-2 px-2 text-right font-mono text-amber-700">{fmt(aprovisionado)}</td>
                <td className={`py-2 pl-3 text-right font-mono font-black ${saldo < 0 ? "text-red-600" : "text-[#1a2e4a]"}`}>
                  {fmt(saldo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}