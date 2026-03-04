import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ArrowRight, Calendar, Building2 } from "lucide-react";
import GraficoContrato from "./GraficoContrato";
import SaldoItens from "./SaldoItens";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "-";

export default function ContratoCard({ contrato, lancamentos, empenhos, orcamentoContratual }) {
  const [expanded, setExpanded] = useState(false);

  const anoAtual = new Date().getFullYear();

  const lancamentosContrato = lancamentos.filter(l => l.contrato_id === contrato.id);
  const lancamentosAno = lancamentosContrato.filter(l => l.ano === anoAtual);

  const totalPagoAno = lancamentosAno.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionadoAno = lancamentosAno.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmInstrucaoAno = lancamentosAno.filter(l => l.status === "Em instrução" || l.status === "Em execução" || l.status === "SOF").reduce((s, l) => s + (l.valor || 0), 0);

  const totalPagoVigencia = lancamentosContrato.filter(l => l.status === "Pago").reduce((s, l) => s + (l.valor || 0), 0);
  const totalProvisionadoVigencia = lancamentosContrato.filter(l => l.status === "Aprovisionado").reduce((s, l) => s + (l.valor || 0), 0);

  const empenhoContrato = empenhos.filter(e => e.contrato_id === contrato.id && e.ano === anoAtual);
  const totalEmpenhado = empenhoContrato.reduce((s, e) => s + (e.valor_total || 0), 0);

  const valorOrcado = orcamentoContratual?.valor_orcado || 0;
  const valorFinanceiroNufip = contrato.valor_financeiro_disponivel_nufip || 0;

  // Saldo do ano: compara financeiro NUFIP (prioritário) ou orçado JFRN com o total pago+aprovisionado
  const baseReferenciaAno = valorFinanceiroNufip > 0 ? valorFinanceiroNufip : valorOrcado;
  const saldoAno = baseReferenciaAno - totalPagoAno - totalProvisionadoAno;
  const saldoVigencia = (contrato.valor_global || 0) - totalPagoVigencia - totalProvisionadoVigencia;

  // Vigência
  const hoje = new Date();
  const dataFim = contrato.data_fim ? new Date(contrato.data_fim + "T00:00:00") : null;
  const diasRestantes = dataFim ? Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24)) : null;
  const vencendoEm30 = diasRestantes !== null && diasRestantes <= 30 && diasRestantes > 0;
  const vencido = diasRestantes !== null && diasRestantes <= 0;

  return (
    <Card className={`border-l-4 ${vencido ? "border-l-red-500" : vencendoEm30 ? "border-l-amber-500" : "border-l-blue-500"}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#1a2e4a] text-sm">{contrato.numero}</span>
              <Badge variant="outline" className={`text-xs ${contrato.status === "ativo" ? "text-green-600 border-green-200" : "text-gray-500"}`}>
                {contrato.status}
              </Badge>
              {vencido && <Badge className="bg-red-100 text-red-700 text-xs border-0">Vigência expirada</Badge>}
              {vencendoEm30 && <Badge className="bg-amber-100 text-amber-700 text-xs border-0">Vence em {diasRestantes}d</Badge>}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="font-medium">{contrato.contratada}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{contrato.escopo_resumido || contrato.objeto}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{fmtDate(contrato.data_inicio)} → {fmtDate(contrato.data_fim)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={createPageUrl(`ContratoDetalhe?id=${contrato.id}`)}>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-blue-600">
                Detalhes <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Grid de valores principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium mb-1">Valor Contratado Vigente</div>
            <div className="text-sm font-bold text-blue-800">{fmt(contrato.valor_global)}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xs text-amber-600 font-medium mb-1">Valor Empenhado ({anoAtual})</div>
            <div className="text-sm font-bold text-amber-800">{fmt(totalEmpenhado)}</div>
          </div>
          <div className={`rounded-lg p-3 ${valorFinanceiroNufip > 0 ? "bg-purple-50" : "bg-gray-50"}`}>
            <div className={`text-xs font-medium mb-1 ${valorFinanceiroNufip > 0 ? "text-purple-600" : "text-gray-500"}`}>Financeiro NUFIP ({anoAtual})</div>
            <div className={`text-sm font-bold ${valorFinanceiroNufip > 0 ? "text-purple-800" : "text-gray-400"}`}>{valorFinanceiroNufip > 0 ? fmt(valorFinanceiroNufip) : "Não informado"}</div>
          </div>
          <div className={`rounded-lg p-3 ${valorOrcado > 0 ? "bg-green-50" : "bg-gray-50"}`}>
            <div className={`text-xs font-medium mb-1 ${valorOrcado > 0 ? "text-green-600" : "text-gray-500"}`}>Orçado JFRN ({anoAtual})</div>
            <div className={`text-sm font-bold ${valorOrcado > 0 ? "text-green-800" : "text-gray-400"}`}>{valorOrcado > 0 ? fmt(valorOrcado) : "Não informado"}</div>
          </div>
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 font-medium mb-2">Saldo do Ano ({anoAtual})</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">{valorFinanceiroNufip > 0 ? "Financeiro NUFIP:" : "Orçado JFRN:"}</span>
                <span className="font-semibold text-blue-700">{baseReferenciaAno > 0 ? fmt(baseReferenciaAno) : <span className="text-gray-400">Não informado</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pago:</span>
                <span className="font-semibold text-green-600">{fmt(totalPagoAno)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aprovisionado:</span>
                <span className="font-semibold text-amber-600">{fmt(totalProvisionadoAno)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Em instrução:</span>
                <span className="font-semibold text-blue-600">{fmt(totalEmInstrucaoAno)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between">
                <span className="text-gray-600 font-medium">Saldo:</span>
                <span className={`font-bold ${saldoAno < 0 ? "text-red-600" : "text-green-600"}`}>{baseReferenciaAno > 0 ? fmt(saldoAno) : <span className="text-gray-400">—</span>}</span>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500 font-medium mb-2">Saldo da Vigência</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Pago total:</span>
                <span className="font-semibold text-green-600">{fmt(totalPagoVigencia)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aprovisionado total:</span>
                <span className="font-semibold text-amber-600">{fmt(totalProvisionadoVigencia)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between">
                <span className="text-gray-600 font-medium">Saldo:</span>
                <span className={`font-bold ${saldoVigencia < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(saldoVigencia)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Saldo por item */}
        {expanded && (
          <div className="mb-3 border rounded-lg p-3">
            <div className="text-xs text-gray-500 font-medium mb-2">Saldo por Item × Orçado ({anoAtual})</div>
            <SaldoItens contrato={contrato} lancamentos={lancamentosContrato} ano={anoAtual} />
          </div>
        )}

        {/* Seção expandida com gráficos */}
        {expanded && (
          <GraficoContrato
            contrato={contrato}
            lancamentos={lancamentosContrato}
            empenhos={empenhoContrato}
            valorOrcado={valorOrcado}
            valorFinanceiroNufip={valorFinanceiroNufip}
          />
        )}
      </CardContent>
    </Card>
  );
}