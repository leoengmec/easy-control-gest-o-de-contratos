import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, FileText, Filter, Table2, RefreshCw, TrendingUp, DollarSign, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const anoAtual = new Date().getFullYear();
const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CAMPOS_LANCAMENTO = [
  { key: "contrato_numero", label: "Nº Contrato" },
  { key: "item_label", label: "Item/Categoria" },
  { key: "ano", label: "Ano" },
  { key: "mes_label", label: "Mês" },
  { key: "status", label: "Status" },
  { key: "valor", label: "Valor (R$)" },
  { key: "numero_nf", label: "Nº NF" },
  { key: "data_nf", label: "Data NF" },
  { key: "ordem_bancaria", label: "Ordem Bancária" },
  { key: "os_numero", label: "Nº OS" },
  { key: "processo_pagamento_sei", label: "Processo SEI" },
  { key: "observacoes", label: "Observações" },
];

const CAMPOS_CONTRATO = [
  { key: "numero", label: "Nº Contrato" },
  { key: "contratada", label: "Contratada" },
  { key: "cnpj", label: "CNPJ" },
  { key: "objeto", label: "Objeto" },
  { key: "status", label: "Status" },
  { key: "valor_global", label: "Valor Global (R$)" },
  { key: "data_inicio", label: "Data Início" },
  { key: "data_fim", label: "Data Fim" },
  { key: "gestor_nome", label: "Gestor" },
  { key: "fiscal_titular_nome", label: "Fiscal Titular" },
  { key: "processo_sei", label: "Processo SEI" },
];

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState("lancamentos");
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [camposSel, setCamposSel] = useState(["contrato_numero","mes_label","status","valor"]);

  // Filtros lançamentos
  const [filtContratoId, setFiltContratoId] = useState("todos");
  const [filtAno, setFiltAno] = useState(String(anoAtual));
  const [filtMesInicio, setFiltMesInicio] = useState("1");
  const [filtMesFim, setFiltMesFim] = useState("12");
  const [filtStatus, setFiltStatus] = useState("todos");
  const [filtCategoria, setFiltCategoria] = useState("todos");
  const [filtDataNfInicio, setFiltDataNfInicio] = useState("");
  const [filtDataNfFim, setFiltDataNfFim] = useState("");

  // Filtros contratos
  const [filtStatusContrato, setFiltStatusContrato] = useState("todos");
  const [filtDataInicioContrato, setFiltDataInicioContrato] = useState("");
  const [filtDataFimContrato, setFiltDataFimContrato] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Contrato.list(),
      base44.entities.LancamentoFinanceiro.list("-ano")
    ]).then(([c, l]) => { setContratos(c); setLancamentos(l); });
  }, []);

  const campos = tipoRelatorio === "lancamentos" ? CAMPOS_LANCAMENTO : CAMPOS_CONTRATO;

  const CATEGORIAS = [
    "MOR Natal","MOR Mossoró","Deslocamento Corretivo","Deslocamento Preventivo",
    "Locações","Serviços eventuais","Fornecimento de Materiais"
  ];

  const toggleCampo = (key) => {
    setCamposSel(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const gerarRelatorio = () => {
    setLoading(true);
    let dados = [];

    if (tipoRelatorio === "lancamentos") {
      dados = lancamentos
        .filter(l => {
          if (filtContratoId !== "todos" && l.contrato_id !== filtContratoId) return false;
          if (filtAno !== "todos" && l.ano !== parseInt(filtAno)) return false;
          if (l.mes < parseInt(filtMesInicio) || l.mes > parseInt(filtMesFim)) return false;
          if (filtStatus !== "todos" && l.status !== filtStatus) return false;
          if (filtCategoria !== "todos" && l.item_label !== filtCategoria) return false;
          if (filtDataNfInicio && l.data_nf && l.data_nf < filtDataNfInicio) return false;
          if (filtDataNfFim && l.data_nf && l.data_nf > filtDataNfFim) return false;
          return true;
        })
        .map(l => {
          const contrato = contratos.find(c => c.id === l.contrato_id);
          return {
            ...l,
            _valor_raw: l.valor,
            contrato_numero: contrato?.numero || l.contrato_id,
            mes_label: MESES[(l.mes || 1) - 1],
            data_nf: l.data_nf ? format(new Date(l.data_nf), "dd/MM/yyyy") : "",
            valor: fmt(l.valor),
          };
        });
    } else {
      dados = contratos.filter(c => {
        if (filtStatusContrato !== "todos" && c.status !== filtStatusContrato) return false;
        if (filtDataInicioContrato && c.data_inicio < filtDataInicioContrato) return false;
        if (filtDataFimContrato && c.data_fim > filtDataFimContrato) return false;
        return true;
      }).map(c => ({
        ...c,
        valor_global: fmt(c.valor_global),
        data_inicio: c.data_inicio ? format(new Date(c.data_inicio), "dd/MM/yyyy") : "",
        data_fim: c.data_fim ? format(new Date(c.data_fim), "dd/MM/yyyy") : "",
      }));
    }

    setResultados(dados);
    setLoading(false);
  };

  const exportCSV = () => {
    const header = camposSel.map(k => campos.find(c => c.key === k)?.label || k);
    const rows = resultados.map(row => camposSel.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`));
    const csv = [header.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${tipoRelatorio}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const header = camposSel.map(k => campos.find(c => c.key === k)?.label || k);
    const linhas = resultados.map(row => camposSel.map(k => String(row[k] ?? "—")));

    let html = `<html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;font-size:11px;padding:20px}
      h2{color:#1a2e4a;margin-bottom:10px}
      table{border-collapse:collapse;width:100%}
      th{background:#1a2e4a;color:white;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:10px}
      tr:nth-child(even){background:#f9f9f9}
    </style></head><body>
    <h2>Relatório de ${tipoRelatorio === "lancamentos" ? "Lançamentos Financeiros" : "Contratos"}</h2>
    <p style="color:#666;font-size:10px">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} — ${resultados.length} registro(s)</p>
    <table><thead><tr>${header.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${linhas.map(row => `<tr>${row.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1a2e4a]">Relatórios</h1>
        <p className="text-gray-500 text-sm">Gere e exporte relatórios customizados</p>
      </div>

      {/* Resumo dos resultados */}
      {resultados.length > 0 && tipoRelatorio === "lancamentos" && (() => {
        const totalPago = resultados.filter(r => r.status === "Pago").reduce((s, r) => s + (parseFloat(String(r._valor_raw || 0))), 0);
        const totalAprov = resultados.filter(r => r.status === "Aprovisionado").reduce((s, r) => s + (parseFloat(String(r._valor_raw || 0))), 0);
        const totalGeral = resultados.reduce((s, r) => s + (parseFloat(String(r._valor_raw || 0))), 0);
        const countPago = resultados.filter(r => r.status === "Pago").length;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total de Registros", value: resultados.length, sub: "lançamentos", icon: Table2, color: "text-blue-600 bg-blue-50" },
              { label: "Registros Pagos", value: countPago, sub: `de ${resultados.length}`, icon: CheckCircle, color: "text-green-600 bg-green-50" },
              { label: "Total Pago", value: fmt(totalPago), sub: "soma dos pagos", icon: DollarSign, color: "text-green-700 bg-green-50" },
              { label: "Total Aprovisionado", value: fmt(totalAprov), sub: "soma aprovisionados", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-sm font-bold text-gray-800">{card.value}</p>
                  <p className="text-[10px] text-gray-400">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Painel de filtros */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
                <Filter className="w-4 h-4" /> Tipo e Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Relatório</Label>
                <Select value={tipoRelatorio} onValueChange={v => { setTipoRelatorio(v); setResultados([]); setCamposSel(v === "lancamentos" ? ["contrato_numero","mes_label","status","valor"] : ["numero","contratada","status","valor_global"]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lancamentos">Lançamentos Financeiros</SelectItem>
                    <SelectItem value="contratos">Contratos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoRelatorio === "lancamentos" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Contrato</Label>
                    <Select value={filtContratoId} onValueChange={setFiltContratoId}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os contratos</SelectItem>
                        {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano</Label>
                    <Select value={filtAno} onValueChange={setFiltAno}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Mês início</Label>
                      <Select value={filtMesInicio} onValueChange={setFiltMesInicio}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m.substring(0,3)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mês fim</Label>
                      <Select value={filtMesFim} onValueChange={setFiltMesFim}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m.substring(0,3)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={filtStatus} onValueChange={setFiltStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {["SOF","Pago","Cancelado","Aprovisionado","Em execução","Em instrução"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={filtCategoria} onValueChange={setFiltCategoria}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data NF — de</Label>
                    <Input type="date" value={filtDataNfInicio} onChange={e => setFiltDataNfInicio(e.target.value)} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data NF — até</Label>
                    <Input type="date" value={filtDataNfFim} onChange={e => setFiltDataNfFim(e.target.value)} className="text-xs" />
                  </div>
                </>
              )}

              {tipoRelatorio === "contratos" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={filtStatusContrato} onValueChange={setFiltStatusContrato}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Início a partir de</Label>
                    <Input type="date" value={filtDataInicioContrato} onChange={e => setFiltDataInicioContrato(e.target.value)} className="text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vigência até</Label>
                    <Input type="date" value={filtDataFimContrato} onChange={e => setFiltDataFimContrato(e.target.value)} className="text-xs" />
                  </div>
                </>
              )}

              <Button onClick={gerarRelatorio} className="w-full bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Gerando..." : "Gerar Relatório"}
              </Button>
            </CardContent>
          </Card>

          {/* Seleção de campos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
                <Table2 className="w-4 h-4" /> Campos a Exibir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campos.map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <Checkbox
                      id={c.key}
                      checked={camposSel.includes(c.key)}
                      onCheckedChange={() => toggleCampo(c.key)}
                    />
                    <label htmlFor={c.key} className="text-xs text-gray-700 cursor-pointer">{c.label}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultado */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resultado
                  {resultados.length > 0 && <Badge variant="outline" className="text-xs">{resultados.length} registros</Badge>}
                </CardTitle>
                {resultados.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
                      <FileDown className="w-3 h-3 mr-1" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="text-xs">
                      <FileDown className="w-3 h-3 mr-1" /> PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {resultados.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Table2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <div className="text-sm">Configure os filtros e clique em "Gerar Relatório"</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {camposSel.map(k => (
                          <th key={k} className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap">
                            {campos.find(c => c.key === k)?.label || k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          {camposSel.map(k => (
                            <td key={k} className="py-2 px-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                              {k === "status" ? (
                                <Badge variant="outline" className="text-xs">{row[k] || "—"}</Badge>
                              ) : (
                                row[k] || "—"
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}