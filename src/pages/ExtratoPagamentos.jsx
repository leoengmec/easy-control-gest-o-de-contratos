import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { History, Search, FileCheck, ShieldCheck } from "lucide-react";

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");

  const USUARIO_LOGADO = "Leonardo (Eng. Mecânico)";

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LancamentoFinanceiro.list("-created_date");
      setLancamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (label) => {
    if (!label) return "Item não especificado";
    return label.split(' ').map(w => {
      const u = w.toUpperCase();
      if (u === 'MOR') return 'MOR';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  };

  const handleStatusChange = async (lancamento, novoStatus) => {
    const statusAntigo = lancamento.status;
    if (statusAntigo === novoStatus) return;

    try {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { status: novoStatus });

      await base44.entities.LogAuditoria.create({
        entidade_id: lancamento.id,
        entidade_tipo: "LancamentoFinanceiro",
        tipo_acao: "ALTERACAO_STATUS_FISCAL",
        justificativa: `Mudança de status manual: [${statusAntigo}] para [${novoStatus}]`,
        responsavel: USUARIO_LOGADO,
        valor_operacao: lancamento.valor,
        data_acao: new Date().toISOString()
      });

      alert(`Auditoria registrada: Status do item alterado para ${novoStatus}`);
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Falha crítica ao gravar log de auditoria.");
    }
  };

  const filtrados = lancamentos.filter(l => 
    l.item_label?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    l.numero_nf?.includes(termoBusca)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] flex items-center gap-2">
            <ShieldCheck className="text-blue-600 w-6 h-6" /> EXTRATO DE FISCALIZAÇÃO
          </h1>
          <p className="text-sm text-slate-500 font-medium">Controle de Auditoria e Conformidade Financeira (JFRN)</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
            placeholder="Pesquisar NF ou Descrição..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1a2e4a] hover:bg-[#1a2e4a]">
              <TableRow className="border-none">
                <TableHead className="text-white font-bold h-12">DATA/NF</TableHead>
                <TableHead className="text-white font-bold h-12">DESCRIÇÃO DO ITEM</TableHead>
                <TableHead className="text-white font-bold h-12 text-right">VALOR</TableHead>
                <TableHead className="text-white font-bold h-12 text-center">STATUS ATUAL</TableHead>
                <TableHead className="text-white font-bold h-12 text-right">HISTÓRICO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">Sincronizando com Base44...</TableCell></TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Nenhum registro encontrado para a busca.</TableCell></TableRow>
              ) : filtrados.map((l) => (
                <TableRow key={l.id} className="hover:bg-blue-50/20 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#1a2e4a]">{l.numero_nf || "SEM NF"}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-black">{new Date(l.created_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="font-medium text-slate-600 truncate max-w-[250px]">
                        {formatLabel(l.item_label)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-black text-[#1a2e4a]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Select defaultValue={l.status} onValueChange={(val) => handleStatusChange(l, val)}>
                        <SelectTrigger className="w-[160px] h-9 text-xs bg-slate-50 border-slate-200 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aprovisionado">📌 Aprovisionado</SelectItem>
                          <SelectItem value="Em instrução">⏳ Em instrução</SelectItem>
                          <SelectItem value="Pago">✅ Pago</SelectItem>
                          <SelectItem value="Glosa">⚠️ Glosa/Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        <History className="w-2.5 h-2.5" /> AUDITADO
                      </div>
                      <span className="text-[10px] text-slate-400">{USUARIO_LOGADO}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}