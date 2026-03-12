import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const TIPO_LABELS = {
  sem_mao_de_obra_residente: "Sem Mão de Obra Residente",
  com_mao_de_obra_residente: "Com Mão de Obra Residente"
};

function calcMesesRestantesNoAno(dataInicio) {
  if (!dataInicio) return 12;
  const anoAtual = new Date().getFullYear();
  const inicio = new Date(dataInicio);
  if (inicio.getFullYear() < anoAtual) return 12;
  if (inicio.getFullYear() > anoAtual) return 0;
  const mesInicio = inicio.getMonth();
  return 12 - mesInicio;
}

function calcValores(item, contratoDataInicio) {
  const vu = item.valor_unitario || 0;
  const qtd = item.quantidade_contratada || 1;
  const prazo = item.prazo_vigencia_meses || 0;
  const vTotal = item.valor_total_contratado || vu * qtd;
  const mesesAno = calcMesesRestantesNoAno(contratoDataInicio);

  let mensal = 0, anual = 0, vigencia = 0;
  if (item.periodicidade === "mensal") {
    mensal = vu * qtd;
    anual = mensal * mesesAno;
    vigencia = prazo > 0 ? mensal * prazo : vTotal;
  } else if (item.periodicidade === "anual") {
    anual = vu * qtd;
    mensal = anual / 12;
    vigencia = vTotal;
  } else if (item.periodicidade === "eventual" || item.periodicidade === "unico") {
    mensal = vu;
    anual = mensal * mesesAno;
    vigencia = vTotal;
  } else {
    mensal = 0;
    anual = 0;
    vigencia = vTotal;
  }
  return { mensal, anual, vigencia };
}

function TabelaItens({ itens, contratoDataInicio, canEdit, onEdit, onDelete }) {
  const totais = itens.reduce(
    (acc, item) => {
      const v = calcValores(item, contratoDataInicio);
      return { mensal: acc.mensal + v.mensal, anual: acc.anual + v.anual, vigencia: acc.vigencia + v.vigencia };
    },
    { mensal: 0, anual: 0, vigencia: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-medium text-gray-500">Item / Serviço</th>
            <th className="text-left p-3 font-medium text-gray-500">Unidade</th>
            <th className="text-right p-3 font-medium text-gray-500">Qtd</th>
            <th className="text-right p-3 font-medium text-gray-500">V. Unit. (R$)</th>
            <th className="text-right p-3 font-medium text-gray-500">V. Total (R$)</th>
            <th className="text-right p-3 font-medium text-gray-500">Mensal</th>
            <th className="text-right p-3 font-medium text-gray-500">Anual</th>
            <th className="text-right p-3 font-medium text-gray-500">V. Contrato</th>
            {canEdit && <th className="p-3 w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const v = calcValores(item, contratoDataInicio);
            return (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium text-[#1a2e4a]">{item.nome}</div>
                  {item.descricao && <div className="text-xs text-gray-400 mt-0.5">{item.descricao}</div>}
                  <Badge variant="outline" className="text-xs capitalize mt-1">{item.periodicidade}</Badge>
                </td>
                <td className="p-3 text-gray-600">{item.unidade || "—"}</td>
                <td className="p-3 text-right">{item.quantidade_contratada || "—"}</td>
                <td className="p-3 text-right">{fmt(item.valor_unitario)}</td>
                <td className="p-3 text-right font-semibold">{fmt(item.valor_total_contratado || item.valor_unitario * (item.quantidade_contratada || 1))}</td>
                <td className="p-3 text-right text-blue-700">{v.mensal > 0 ? fmt(v.mensal) : "—"}</td>
                <td className="p-3 text-right text-indigo-700">{v.anual > 0 ? fmt(v.anual) : "—"}</td>
                <td className="p-3 text-right font-semibold text-[#1a2e4a]">{fmt(v.vigencia)}</td>
                {canEdit && (
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(item)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-red-400" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold text-[#1a2e4a]">
            <td colSpan={5} className="p-3 text-right">Total do grupo:</td>
            <td className="p-3 text-right text-blue-700">{totais.mensal > 0 ? fmt(totais.mensal) : "—"}</td>
            <td className="p-3 text-right text-indigo-700">{totais.anual > 0 ? fmt(totais.anual) : "—"}</td>
            <td className="p-3 text-right">{fmt(totais.vigencia)}</td>
            {canEdit && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GrupoSection({ titulo, itens, contratoDataInicio, canEdit, onEdit, onDelete, corHeader }) {
  if (itens.length === 0) return null;
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`px-4 py-2 font-semibold text-sm ${corHeader}`}>{titulo}</div>
      <TabelaItens itens={itens} contratoDataInicio={contratoDataInicio} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export default function ItensAgrupados({ itens, contratoDataInicio, canEdit, onEdit, onDelete }) {
  // Agrupa primeiro por tipo_contrato_manutencao, depois por grupo_servico
  const tiposPresentes = [...new Set(itens.map(i => i.tipo_contrato_manutencao || "sem_mao_de_obra_residente"))];

  return (
    <div className="space-y-6">
      {tiposPresentes.map(tipo => {
        const itensTipo = itens.filter(i => (i.tipo_contrato_manutencao || "sem_mao_de_obra_residente") === tipo);
        const fixos = itensTipo.filter(i => (i.grupo_servico || "fixo") === "fixo");
        const demanda = itensTipo.filter(i => i.grupo_servico === "por_demanda");

        const totalGeral = itensTipo.reduce((acc, item) => acc + calcValores(item, contratoDataInicio).vigencia, 0);

        return (
          <div key={tipo} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-[#1a2e4a] uppercase tracking-wide">
                Manutenção — {TIPO_LABELS[tipo]}
              </h3>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <GrupoSection
              titulo="Serviços Fixos"
              itens={fixos}
              contratoDataInicio={contratoDataInicio}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              corHeader="bg-blue-50 text-blue-800 border-b border-blue-100"
            />

            <GrupoSection
              titulo="Serviços por Demanda"
              itens={demanda}
              contratoDataInicio={contratoDataInicio}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              corHeader="bg-amber-50 text-amber-800 border-b border-amber-100"
            />

            <div className="flex justify-end">
              <div className="bg-[#1a2e4a] text-white text-sm font-semibold px-4 py-2 rounded-lg">
                Total {TIPO_LABELS[tipo]}: {fmt(totalGeral)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}