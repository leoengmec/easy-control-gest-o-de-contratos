import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bell, CalendarX, DollarSign, CheckCircle2, Plus, Trash2,
  RefreshCw, Clock, Percent, AlertTriangle
} from "lucide-react";

const TIPOS = [
  {
    value: "vencimento_contrato",
    label: "Vencimento de Contrato",
    icon: CalendarX,
    color: "text-orange-600 bg-orange-50 border-orange-200",
    desc: "Notifica quando um contrato se aproxima da data de término.",
    campo: "dias",
  },
  {
    value: "limite_orcamento",
    label: "Limite do Orçamento",
    icon: Percent,
    color: "text-red-600 bg-red-50 border-red-200",
    desc: "Notifica quando o total executado/aprovisionado atinge um percentual do orçamento anual.",
    campo: "percentual",
  },
  {
    value: "aprovacao_lancamento",
    label: "Lançamento Aguardando Aprovação",
    icon: CheckCircle2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    desc: "Notifica quando existe lançamento com status 'Em instrução' há mais de X dias.",
    campo: "dias",
  },
];

function AlertaCard({ alerta, onToggle, onDelete, onSalvar }) {
  const tipo = TIPOS.find(t => t.value === alerta.tipo);
  if (!tipo) return null;
  const Icon = tipo.icon;

  const [dias, setDias] = useState(alerta.dias_antecedencia ?? "");
  const [pct, setPct] = useState(alerta.percentual_orcamento ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <Card className={`border ${tipo.color} transition-opacity ${alerta.ativo ? "" : "opacity-60"}`}>
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tipo.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{tipo.label}</p>
              <p className="text-xs text-gray-400">{tipo.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={alerta.ativo}
              onCheckedChange={(v) => onToggle(alerta.id, v)}
            />
            <button
              onClick={() => onDelete(alerta.id)}
              className="p-1.5 hover:bg-red-50 rounded"
              title="Remover alerta"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Parâmetros */}
        {tipo.campo === "dias" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <Label className="text-xs text-gray-600 whitespace-nowrap">
                {alerta.tipo === "vencimento_contrato" ? "Alertar com" : "Alertar após"}
              </Label>
              <Input
                type="number"
                min={1}
                value={dias}
                onChange={e => { setDias(e.target.value); setDirty(true); }}
                className="w-20 h-8 text-xs"
              />
              <span className="text-xs text-gray-500">
                {alerta.tipo === "vencimento_contrato" ? "dias de antecedência" : "dias sem movimentação"}
              </span>
            </div>
            {dirty && (
              <Button size="sm" className="h-8 text-xs bg-[#1a2e4a] hover:bg-[#2a4a7a]"
                onClick={() => { onSalvar(alerta.id, { dias_antecedencia: Number(dias) }); setDirty(false); }}>
                Salvar
              </Button>
            )}
          </div>
        )}

        {tipo.campo === "percentual" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-gray-400" />
              <Label className="text-xs text-gray-600 whitespace-nowrap">Alertar ao atingir</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={pct}
                onChange={e => { setPct(e.target.value); setDirty(true); }}
                className="w-20 h-8 text-xs"
              />
              <span className="text-xs text-gray-500">% do orçamento anual</span>
            </div>
            {dirty && (
              <Button size="sm" className="h-8 text-xs bg-[#1a2e4a] hover:bg-[#2a4a7a]"
                onClick={() => { onSalvar(alerta.id, { percentual_orcamento: Number(pct) }); setDirty(false); }}>
                Salvar
              </Button>
            )}
          </div>
        )}

        {alerta.ultima_verificacao && (
          <p className="text-[11px] text-gray-300 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Última verificação: {new Date(alerta.ultima_verificacao).toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAlertas() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = () => {
    setLoading(true);
    base44.entities.ConfiguracaoAlerta.list()
      .then(setAlertas)
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const handleToggle = async (id, ativo) => {
    await base44.entities.ConfiguracaoAlerta.update(id, { ativo });
    carregar();
  };

  const handleDelete = async (id) => {
    await base44.entities.ConfiguracaoAlerta.delete(id);
    carregar();
  };

  const handleSalvar = async (id, data) => {
    await base44.entities.ConfiguracaoAlerta.update(id, data);
    setMsg("Configuração salva!");
    setTimeout(() => setMsg(""), 3000);
    carregar();
  };

  const handleAdicionar = async (tipo) => {
    const defaults = {
      vencimento_contrato: { tipo, ativo: true, dias_antecedencia: 30 },
      limite_orcamento: { tipo, ativo: true, percentual_orcamento: 80 },
      aprovacao_lancamento: { tipo, ativo: true, dias_antecedencia: 5 },
    };
    await base44.entities.ConfiguracaoAlerta.create(defaults[tipo]);
    carregar();
  };

  const tiposJaAdicionados = alertas.map(a => a.tipo);

  const handleVerificarAgora = async () => {
    setVerificando(true);
    try {
      const hoje = new Date();
      const hojeStr = hoje.toISOString().slice(0, 10);
      const [contratos, lancamentos, orcamentos] = await Promise.all([
        base44.entities.Contrato.filter({ status: "ativo" }),
        base44.entities.LancamentoFinanceiro.filter({ status: "Em instrução" }),
        base44.entities.OrcamentoContratualAnual.filter({ ano: hoje.getFullYear() }),
      ]);

      const alertasAtivos = alertas.filter(a => a.ativo);
      const notifsCriadas = [];

      for (const alerta of alertasAtivos) {
        if (alerta.tipo === "vencimento_contrato" && alerta.dias_antecedencia) {
          const limite = new Date();
          limite.setDate(limite.getDate() + alerta.dias_antecedencia);
          for (const c of contratos) {
            if (!c.data_fim) continue;
            const fim = new Date(c.data_fim);
            if (fim <= limite && fim >= hoje) {
              const diasRestantes = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
              const chave = `venc_${c.id}_${hoje.getFullYear()}_${hoje.getMonth()}`;
              const existente = await base44.entities.NotificacaoAdmin.filter({ dados_extras: chave });
              if (existente.length === 0) {
                await base44.entities.NotificacaoAdmin.create({
                  tipo: "outro",
                  titulo: `⚠️ Contrato vencendo em ${diasRestantes} dias`,
                  mensagem: `Contrato ${c.numero} (${c.contratada}) vence em ${new Date(c.data_fim).toLocaleDateString("pt-BR")}.`,
                  lida: false,
                  dados_extras: chave,
                });
                notifsCriadas.push("vencimento");
              }
            }
          }
          await base44.entities.ConfiguracaoAlerta.update(alerta.id, { ultima_verificacao: hojeStr });
        }

        if (alerta.tipo === "aprovacao_lancamento" && alerta.dias_antecedencia) {
          const limite = new Date();
          limite.setDate(limite.getDate() - alerta.dias_antecedencia);
          for (const l of lancamentos) {
            if (!l.data_lancamento) continue;
            const dataLanc = new Date(l.data_lancamento);
            if (dataLanc <= limite) {
              const chave = `instrucao_${l.id}`;
              const existente = await base44.entities.NotificacaoAdmin.filter({ dados_extras: chave });
              if (existente.length === 0) {
                await base44.entities.NotificacaoAdmin.create({
                  tipo: "outro",
                  titulo: `📋 Lançamento aguardando aprovação`,
                  mensagem: `Lançamento NF ${l.numero_nf || l.id} está "Em instrução" há mais de ${alerta.dias_antecedencia} dias (R$ ${(l.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
                  lida: false,
                  dados_extras: chave,
                });
                notifsCriadas.push("lancamento");
              }
            }
          }
          await base44.entities.ConfiguracaoAlerta.update(alerta.id, { ultima_verificacao: hojeStr });
        }

        if (alerta.tipo === "limite_orcamento" && alerta.percentual_orcamento) {
          const ano = hoje.getFullYear();
          for (const orc of orcamentos) {
            if (!orc.valor_orcado || !orc.contrato_id) continue;
            const totalExec = lancamentos
              .filter(l => l.contrato_id === orc.contrato_id && l.ano === ano && ["SOF","Pago","Aprovisionado","Em execução"].includes(l.status))
              .reduce((s, l) => s + (l.valor || 0), 0);
            const pct = (totalExec / orc.valor_orcado) * 100;
            if (pct >= alerta.percentual_orcamento) {
              const chave = `orcamento_${orc.contrato_id}_${ano}_${Math.floor(pct / 5)}`;
              const existente = await base44.entities.NotificacaoAdmin.filter({ dados_extras: chave });
              if (existente.length === 0) {
                const contrato = contratos.find(c => c.id === orc.contrato_id);
                await base44.entities.NotificacaoAdmin.create({
                  tipo: "outro",
                  titulo: `💰 Orçamento ${pct.toFixed(0)}% consumido`,
                  mensagem: `Contrato ${contrato?.numero || orc.contrato_id} consumiu ${pct.toFixed(1)}% do orçamento de ${ano} (R$ ${totalExec.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${orc.valor_orcado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
                  lida: false,
                  dados_extras: chave,
                });
                notifsCriadas.push("orcamento");
              }
            }
          }
          await base44.entities.ConfiguracaoAlerta.update(alerta.id, { ultima_verificacao: hojeStr });
        }
      }

      setMsg(notifsCriadas.length > 0
        ? `✅ Verificação concluída — ${notifsCriadas.length} nova(s) notificação(ões) gerada(s).`
        : "✅ Verificação concluída — nenhuma nova ocorrência encontrada.");
      setTimeout(() => setMsg(""), 5000);
      carregar();
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1a2e4a] flex items-center gap-2">
            <Bell className="w-4 h-4" /> Configuração de Alertas
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure regras automáticas de notificação para eventos importantes do sistema.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs border-[#1a2e4a] text-[#1a2e4a] hover:bg-[#1a2e4a] hover:text-white"
          onClick={handleVerificarAgora}
          disabled={verificando}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verificando ? "animate-spin" : ""}`} />
          {verificando ? "Verificando..." : "Verificar Agora"}
        </Button>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {msg}
        </div>
      )}

      {/* Alertas configurados */}
      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div>
      ) : alertas.length === 0 ? (
        <div className="py-10 text-center text-gray-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum alerta configurado. Adicione um abaixo.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {alertas.map(a => (
            <AlertaCard
              key={a.id}
              alerta={a}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onSalvar={handleSalvar}
            />
          ))}
        </div>
      )}

      {/* Adicionar novos tipos */}
      {TIPOS.filter(t => !tiposJaAdicionados.includes(t.value)).length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Adicionar tipo de alerta:</p>
          <div className="flex flex-wrap gap-2">
            {TIPOS.filter(t => !tiposJaAdicionados.includes(t.value)).map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => handleAdicionar(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-80 ${t.color}`}
                >
                  <Plus className="w-3 h-3" />
                  <Icon className="w-3 h-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          A verificação automática é executada ao carregar o sistema. Use <strong>"Verificar Agora"</strong> para checar manualmente a qualquer momento.
          Notificações duplicadas são suprimidas automaticamente.
        </span>
      </div>
    </div>
  );
}