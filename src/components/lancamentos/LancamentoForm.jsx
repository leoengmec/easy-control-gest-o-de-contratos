import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_OPTIONS = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];

// Mapeamento de categorias para itens reais do contrato
const CATEGORIAS = [
  { value: "Deslocamento Corretivo", label: "Deslocamento Corretivo", tipo: "categoria" },
  { value: "Deslocamento Preventivo", label: "Deslocamento Preventivo", tipo: "categoria" },
  { value: "Fornecimento de Materiais", label: "Fornecimento de Materiais", tipo: "categoria" },
  { value: "Locações", label: "Locações", tipo: "categoria" },
  { value: "MOR Mossoró", label: "MOR Mossoró", tipo: "grupo" },
  { value: "MOR Natal", label: "MOR Natal", tipo: "grupo" },
  { value: "Serviços eventuais", label: "Serviços eventuais", tipo: "categoria" },
];

// Substrings que identificam itens pertencentes aos grupos
const MOR_NATAL_MATCH = ["ARTÍFICE DE ELÉTRICA NATAL","AUXILIAR DE ARTÍFICE ELÉTRICA NATAL","AUXILIAR DE ARTÍFICE CIVIL NATAL","ARTÍFICE CIVIL NATAL","ENGENHEIRO DE CAMPO NATAL"];
const MOR_MOSSORO_MATCH = ["ARTÍFICE ELÉTRICA MOSSORÓ","AUXILIAR DE ARTÍFICE ELÉTRICA MOSSORÓ","AUXILIAR DE ARTÍFICE CIVIL MOSSORÓ","ARTÍFICE CIVIL MOSSORÓ"];

function getItensDoGrupo(categoria, itensContrato) {
  const nomeUpper = (n) => (n || "").toUpperCase();
  if (categoria === "MOR Natal") {
    return itensContrato.filter(i => MOR_NATAL_MATCH.some(m => nomeUpper(i.nome).includes(m.toUpperCase())));
  }
  if (categoria === "MOR Mossoró") {
    return itensContrato.filter(i => MOR_MOSSORO_MATCH.some(m => nomeUpper(i.nome).includes(m.toUpperCase())));
  }
  return [];
}

const NATUREZA_LABELS = {
  "339039_servico": "NE Serviços (339039)",
  "339030_material": "NE Material (339030)"
};

export default function LancamentoForm({ lancamento, contratos, itens, onSave, onCancel }) {
  const anoAtual = new Date().getFullYear();
  const [form, setForm] = useState({
    contrato_id: lancamento?.contrato_id || "",
    item_label: lancamento?.item_label || "",
    nota_empenho_id: lancamento?.nota_empenho_id || "",
    ano: lancamento?.ano || anoAtual,
    mes: lancamento?.mes || new Date().getMonth() + 1,
    status: lancamento?.status || "Em instrução",
    valor: lancamento?.valor || "",
    numero_nf: lancamento?.numero_nf || "",
    processo_pagamento_sei: lancamento?.processo_pagamento_sei || "",
    ordem_bancaria: lancamento?.ordem_bancaria || "",
    os_numero: lancamento?.os_numero || "",
    os_data: lancamento?.os_data || "",
    os_local: lancamento?.os_local || "",
    data_lancamento: lancamento?.data_lancamento || new Date().toISOString().split("T")[0],
    observacoes: lancamento?.observacoes || ""
  });

  const [selectedCategorias, setSelectedCategorias] = useState(
    lancamento?.item_label ? [lancamento.item_label] : []
  );
  const [empenhos, setEmpenhos] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const itensContrato = itens.filter(i => i.contrato_id === form.contrato_id);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i);

  // Carrega empenhos do contrato/ano selecionado
  useEffect(() => {
    if (form.contrato_id && form.ano) {
      base44.entities.NotaEmpenho.filter({ contrato_id: form.contrato_id, ano: parseInt(form.ano) })
        .then(data => setEmpenhos(data))
        .catch(() => setEmpenhos([]));
    } else {
      setEmpenhos([]);
    }
  }, [form.contrato_id, form.ano]);

  const toggleCategoria = (val) => {
    setSelectedCategorias(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const baseData = {
      ...form,
      ano: parseInt(form.ano),
      mes: parseInt(form.mes),
      valor: parseFloat(form.valor) || 0,
    };

    if (lancamento?.id) {
      // Edição: salva com a categoria atual (primeiro selecionado ou o original)
      const itemLabel = selectedCategorias[0] || form.item_label;
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { ...baseData, item_label: itemLabel });
    } else {
      // Criação: cria um lançamento para cada categoria selecionada
      const categoriasSalvar = selectedCategorias.length > 0 ? selectedCategorias : [form.item_label || ""];
      for (const cat of categoriasSalvar) {
        // Para grupos (MOR Natal/Mossoró), cria um lançamento por item real encontrado
        const itenGrupo = getItensDoGrupo(cat, itensContrato);
        if (itenGrupo.length > 0) {
          for (const itemReal of itenGrupo) {
            await base44.entities.LancamentoFinanceiro.create({
              ...baseData,
              item_label: cat,
              item_contrato_id: itemReal.id
            });
          }
        } else {
          await base44.entities.LancamentoFinanceiro.create({ ...baseData, item_label: cat });
        }
      }
    }
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#1a2e4a]">{lancamento ? "Editar Lançamento" : "Novo Lançamento"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* CONTRATO */}
          <div className="space-y-1">
            <Label>Contrato *</Label>
            <Select value={form.contrato_id} onValueChange={v => { set("contrato_id", v); setSelectedCategorias([]); set("nota_empenho_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.numero} – {c.contratada}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ITENS / CATEGORIAS (multi-seleção) */}
          {form.contrato_id && (
            <div className="space-y-2">
              <Label>Item do Contrato {!lancamento && <span className="text-gray-400 text-xs">(selecione um ou mais)</span>}</Label>
              {lancamento ? (
                // Edição: select simples
                <Select value={selectedCategorias[0] || ""} onValueChange={v => setSelectedCategorias([v])}>
                  <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                // Criação: checkboxes
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
                  {CATEGORIAS.map(cat => (
                    <div key={cat.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.value}`}
                        checked={selectedCategorias.includes(cat.value)}
                        onCheckedChange={() => toggleCategoria(cat.value)}
                      />
                      <label htmlFor={`cat-${cat.value}`} className="text-sm cursor-pointer">
                        {cat.label}
                        {cat.tipo === "grupo" && <Badge variant="outline" className="ml-1 text-xs">grupo</Badge>}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MÊS / ANO / STATUS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Mês *</Label>
              <Select value={String(form.mes)} onValueChange={v => set("mes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mesesNomes.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Ano *</Label>
              <Select value={String(form.ano)} onValueChange={v => set("ano", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VALOR E NF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => set("valor", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Número da NF</Label>
              <Input value={form.numero_nf} onChange={e => set("numero_nf", e.target.value)} placeholder="Nº da Nota Fiscal" />
            </div>
          </div>

          {/* NOTA DE EMPENHO */}
          {form.contrato_id && (
            <div className="space-y-1">
              <Label>Nota de Empenho {form.ano && <span className="text-gray-400 text-xs">({form.ano})</span>}</Label>
              {empenhos.length > 0 ? (
                <Select value={form.nota_empenho_id} onValueChange={v => set("nota_empenho_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o empenho" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {empenhos.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.numero_empenho} – {NATUREZA_LABELS[e.natureza_despesa]} {e.valor_total ? `· R$ ${e.valor_total.toLocaleString("pt-BR")}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200">
                  Nenhum empenho cadastrado para {form.ano}. Cadastre em Menu → Contratos → aba Empenhos.
                </p>
              )}
            </div>
          )}

          {/* PROCESSO SEI E ORDEM BANCÁRIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Processo de Pagamento SEI</Label>
              <Input value={form.processo_pagamento_sei} onChange={e => set("processo_pagamento_sei", e.target.value)} placeholder="Nº do processo SEI" />
            </div>
            <div className="space-y-1">
              <Label>Ordem Bancária</Label>
              <Input value={form.ordem_bancaria} onChange={e => set("ordem_bancaria", e.target.value)} placeholder="Nº da ordem bancária" />
            </div>
          </div>

          {/* INFORMAÇÕES DA OS */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1a2e4a]">Informações da OS</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Número da OS</Label>
                <Input value={form.os_numero} onChange={e => set("os_numero", e.target.value)} placeholder="Nº da OS" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data da OS</Label>
                <Input type="date" value={form.os_data} onChange={e => set("os_data", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Local de Prestação</Label>
                <Input value={form.os_local} onChange={e => set("os_local", e.target.value)} placeholder="Local dos serviços" />
              </div>
            </div>
          </div>

          {/* DATA E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data do Lançamento</Label>
              <Input type="date" value={form.data_lancamento} onChange={e => set("data_lancamento", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" disabled={saving || !form.contrato_id}>
              {saving ? "Salvando..." : lancamento ? "Salvar" : `Criar ${selectedCategorias.length > 1 ? selectedCategorias.length + " lançamentos" : "lançamento"}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}