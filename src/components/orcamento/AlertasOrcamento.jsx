import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, AlertTriangle, CheckCircle2, Plus, Trash2, Settings } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Chave de armazenamento local para configurações de alerta
const STORAGE_KEY = "jfrn_alertas_orcamento";

const loadConfig = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const saveConfig = (cfg) => localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));

export default function AlertasOrcamento({ orcamento, lancamentos, ano }) {
  const [alertas, setAlertas] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [novoAlerta, setNovoAlerta] = useState({ tipo: "percentual", valor: 80, descricao: "" });

  useEffect(() => { setAlertas(loadConfig()); }, []);

  const totalPago = lancamentos.filter(l => l.status === "Pago" && l.ano === ano).reduce((s, l) => s + (l.valor || 0), 0);
  const totalAprovisionado = lancamentos.filter(l => l.status === "Aprovisionado" && l.ano === ano).reduce((s, l) => s + (l.valor || 0), 0);
  const totalEmpenhado = totalPago + totalAprovisionado;
  const dotacaoAtual = orcamento?.valor_dotacao_atual || 0;
  const saldoDisponivel = dotacaoAtual - totalEmpenhado;
  const percentualUtilizado = dotacaoAtual > 0 ? (totalEmpenhado / dotacaoAtual) * 100 : 0;

  // Avalia se um alerta está disparado
  const avaliarAlerta = (alerta) => {
    if (!orcamento) return false;
    if (alerta.tipo === "percentual") return percentualUtilizado >= alerta.valor;
    if (alerta.tipo === "saldo") return saldoDisponivel <= alerta.valor && dotacaoAtual > 0;
    return false;
  };

  const alertasAtivos = alertas.filter(a => avaliarAlerta(a));

  const addAlerta = () => {
    const novo = { ...novoAlerta, id: Date.now(), valor: parseFloat(novoAlerta.valor) || 0 };
    const updated = [...alertas, novo];
    setAlertas(updated);
    saveConfig(updated);
    setNovoAlerta({ tipo: "percentual", valor: 80, descricao: "" });
  };

  const removeAlerta = (id) => {
    const updated = alertas.filter(a => a.id !== id);
    setAlertas(updated);
    saveConfig(updated);
  };

  if (!orcamento) return null;

  return (
    <div className="space-y-3">
      {/* Alertas disparados */}
      {alertasAtivos.length > 0 && (
        <div className="space-y-2">
          {alertasAtivos.map(alerta => (
            <div key={alerta.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-amber-800">
                  {alerta.tipo === "percentual"
                    ? `⚠️ ${percentualUtilizado.toFixed(1)}% do orçamento utilizado (limite: ${alerta.valor}%)`
                    : `⚠️ Saldo disponível abaixo de ${fmt(alerta.valor)}`}
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  Pago + Aprovisionado: {fmt(totalEmpenhado)} | Saldo: {fmt(saldoDisponivel)} | Dotação: {fmt(dotacaoAtual)}
                </div>
                {alerta.descricao && <div className="text-xs text-amber-600 mt-0.5">{alerta.descricao}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumo e botão configurar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {alertasAtivos.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {dotacaoAtual > 0
                ? `${percentualUtilizado.toFixed(1)}% utilizado — saldo de ${fmt(saldoDisponivel)}`
                : "Sem dotação cadastrada para alertas"}
            </div>
          ) : (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
              <Bell className="w-3 h-3 mr-1" /> {alertasAtivos.length} alerta(s) ativo(s)
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowConfig(v => !v)}>
          <Settings className="w-3.5 h-3.5 mr-1" />
          {showConfig ? "Fechar" : "Configurar Alertas"}
        </Button>
      </div>

      {/* Painel de configuração */}
      {showConfig && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[#1a2e4a] flex items-center gap-2">
              <Bell className="w-4 h-4" /> Configuração de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alertas existentes */}
            {alertas.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">Alertas configurados:</div>
                {alertas.map(a => {
                  const ativo = avaliarAlerta(a);
                  return (
                    <div key={a.id} className={`flex items-center justify-between rounded-lg p-2 border text-xs ${ativo ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center gap-2">
                        {ativo ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="text-gray-700">
                          {a.tipo === "percentual" ? `Quando utilizar ≥ ${a.valor}% da dotação` : `Quando saldo ficar ≤ ${fmt(a.valor)}`}
                        </span>
                        {a.descricao && <span className="text-gray-400">— {a.descricao}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400 hover:text-red-600" onClick={() => removeAlerta(a.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Novo alerta */}
            <div className="border rounded-lg p-3 space-y-3 bg-white">
              <div className="text-xs font-medium text-gray-600">Novo alerta:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    className="w-full border rounded px-2 py-1.5 text-xs"
                    value={novoAlerta.tipo}
                    onChange={e => setNovoAlerta(f => ({ ...f, tipo: e.target.value }))}
                  >
                    <option value="percentual">% da dotação utilizada</option>
                    <option value="saldo">Saldo disponível abaixo de R$</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{novoAlerta.tipo === "percentual" ? "Percentual (%)" : "Valor limite (R$)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={novoAlerta.tipo === "percentual" ? 100 : undefined}
                    step={novoAlerta.tipo === "percentual" ? 1 : 1000}
                    value={novoAlerta.valor}
                    onChange={e => setNovoAlerta(f => ({ ...f, valor: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input
                    value={novoAlerta.descricao}
                    onChange={e => setNovoAlerta(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Alerta de 80%"
                    className="text-xs h-8"
                  />
                </div>
              </div>
              <Button size="sm" onClick={addAlerta} className="bg-[#1a2e4a] hover:bg-[#2a4a7a] text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Alerta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}