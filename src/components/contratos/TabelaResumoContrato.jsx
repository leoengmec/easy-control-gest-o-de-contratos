const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Itens que compõem cada "Tipo de Serviço" agrupado (match parcial case-insensitive no nome)
const MOR_NATAL_KEYWORDS = [
  "ENGENHEIRO DE CAMPO NATAL",
  "ARTÍFICE CIVIL NATAL",
  "AUXILIAR DE ARTÍFICE CIVIL NATAL",
  "ARTÍFICE DE ELÉTRICA NATAL",
  "ARTÍFICE ELÉTRICA NATAL",
  "AUXILIAR DE ARTÍFICE ELÉTRICA NATAL",
  "AUXILIAR ARTÍFICE CIVIL NATAL",
  "AUXILIAR ARTÍFICE ELÉTRICA NATAL",
];

const MOR_MOSSORO_KEYWORDS = [
  "ARTÍFICE CIVIL MOSSORÓ",
  "AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ",
  "ARTÍFICE ELÉTRICA MOSSORÓ",
  "ARTÍFICE DE ELÉTRICA MOSSORÓ",
  "AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ",
  "AUXILIAR ARTÍFICE CIVIL MOSSORÓ",
  "AUXILIAR ARTÍFICE ELÉTRICA MOSSORÓ",
];

function matchesKeywords(nome, keywords) {
  const upper = (nome || "").toUpperCase();
  return keywords.some(k => upper.includes(k.toUpperCase()));
}

function calcMensal(item) {
  const vu = item.valor_unitario || 0;
  const qtd = item.quantidade_contratada || 1;
  if (item.periodicidade === "mensal") return vu * qtd;
  if (item.periodicidade === "anual") return (vu * qtd) / 12;
  return 0;
}

function calcVigencia(item) {
  const vu = item.valor_unitario || 0;
  const qtd = item.quantidade_contratada || 1;
  const prazo = item.prazo_vigencia_meses || 0;
  const vTotal = item.valor_total_contratado || vu * qtd;
  if (item.periodicidade === "mensal" && prazo > 0) return vu * qtd * prazo;
  return vTotal;
}

export default function TabelaResumoContrato({ itens }) {
  if (!itens || itens.length === 0) return null;

  // Separar itens MOR Natal, MOR Mossoró e demais
  const morNatalItens = itens.filter(i => matchesKeywords(i.nome, MOR_NATAL_KEYWORDS));
  const morMossoroItens = itens.filter(i => matchesKeywords(i.nome, MOR_MOSSORO_KEYWORDS));

  const morNatalMensal = morNatalItens.reduce((s, i) => s + calcMensal(i), 0);
  const morNatalVigencia = morNatalItens.reduce((s, i) => s + calcVigencia(i), 0);

  const morMossoroMensal = morMossoroItens.reduce((s, i) => s + calcMensal(i), 0);
  const morMossoroVigencia = morMossoroItens.reduce((s, i) => s + calcVigencia(i), 0);

  // Itens que não são MOR Natal nem MOR Mossoró = linhas individuais
  const morNatalIds = new Set(morNatalItens.map(i => i.id));
  const morMossoroIds = new Set(morMossoroItens.map(i => i.id));
  const outrosItens = itens.filter(i => !morNatalIds.has(i.id) && !morMossoroIds.has(i.id));

  // Montar linhas da tabela
  const linhas = [];

  // Linha MOR Natal (agrupada)
  if (morNatalItens.length > 0) {
    linhas.push({
      tipo: "MOR Natal",
      descricao: morNatalItens.map(i => i.nome).join(", "),
      subItens: morNatalItens,
      quantidade: morNatalItens[0]?.quantidade_contratada || "—",
      unidade: morNatalItens[0]?.unidade || "Mês",
      mensal: morNatalMensal,
      vigencia: morNatalVigencia,
      isGrupo: true,
    });
  }

  // Linha MOR Mossoró (agrupada)
  if (morMossoroItens.length > 0) {
    linhas.push({
      tipo: "MOR Mossoró",
      descricao: morMossoroItens.map(i => i.nome).join(", "),
      subItens: morMossoroItens,
      quantidade: morMossoroItens[0]?.quantidade_contratada || "—",
      unidade: morMossoroItens[0]?.unidade || "Mês",
      mensal: morMossoroMensal,
      vigencia: morMossoroVigencia,
      isGrupo: true,
    });
  }

  // Outros itens individualmente
  outrosItens.forEach(item => {
    linhas.push({
      tipo: null,
      descricao: item.nome,
      descricaoDetalhe: item.descricao,
      quantidade: item.quantidade_contratada || "—",
      unidade: item.unidade || "Mês",
      mensal: calcMensal(item),
      vigencia: calcVigencia(item),
      isGrupo: false,
    });
  });

  const totalMensal = linhas.reduce((s, l) => s + l.mensal, 0);
  const totalVigencia = linhas.reduce((s, l) => s + l.vigencia, 0);

  return (
    <div className="rounded-lg border overflow-hidden mt-4">
      <div className="px-4 py-2.5 bg-[#1a2e4a] text-white font-semibold text-sm">
        Resumo dos Itens do Contrato
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#2a4a7a] text-white">
              <th className="text-center p-3 font-semibold w-12 border border-[#3a5a8a]">ITEM</th>
              <th className="text-left p-3 font-semibold border border-[#3a5a8a]">DESCRIÇÃO DO OBJETO</th>
              <th className="text-center p-3 font-semibold w-20 border border-[#3a5a8a]">TIPO DE SERVIÇO</th>
              <th className="text-center p-3 font-semibold w-20 border border-[#3a5a8a]">QUANT.</th>
              <th className="text-center p-3 font-semibold w-20 border border-[#3a5a8a]">UNID.</th>
              <th className="text-right p-3 font-semibold w-32 border border-[#3a5a8a]">V. MENSAL</th>
              <th className="text-right p-3 font-semibold w-36 border border-[#3a5a8a]">V. DO CONTRATO</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="text-center p-3 font-semibold text-[#1a2e4a] border border-gray-200">{idx + 1}</td>
                <td className="p-3 border border-gray-200">
                  {linha.isGrupo ? (
                    <div>
                      <div className="font-semibold text-[#1a2e4a] uppercase text-xs mb-1">
                        {linha.tipo === "MOR Natal"
                          ? "MÃO DE OBRA RESIDENTE — NATAL"
                          : "MÃO DE OBRA RESIDENTE — MOSSORÓ"}
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {linha.subItens.map(si => (
                          <div key={si.id}>• {si.nome}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-[#1a2e4a] uppercase text-xs">{linha.descricao}</div>
                      {linha.descricaoDetalhe && (
                        <div className="text-xs text-gray-400 mt-0.5">{linha.descricaoDetalhe}</div>
                      )}
                    </div>
                  )}
                </td>
                <td className="text-center p-3 border border-gray-200">
                  {linha.isGrupo ? (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      linha.tipo === "MOR Natal"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {linha.tipo}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="text-center p-3 text-gray-700 border border-gray-200">{linha.quantidade}</td>
                <td className="text-center p-3 text-gray-700 border border-gray-200">{linha.unidade}</td>
                <td className="text-right p-3 font-medium text-blue-700 border border-gray-200">
                  {linha.mensal > 0 ? fmt(linha.mensal) : "—"}
                </td>
                <td className="text-right p-3 font-semibold text-[#1a2e4a] border border-gray-200">
                  {fmt(linha.vigencia)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#1a2e4a] text-white font-semibold">
              <td colSpan={5} className="p-3 text-right text-sm border border-[#2a4a7a]">TOTAL GERAL</td>
              <td className="p-3 text-right border border-[#2a4a7a]">{fmt(totalMensal)}</td>
              <td className="p-3 text-right border border-[#2a4a7a]">{fmt(totalVigencia)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}