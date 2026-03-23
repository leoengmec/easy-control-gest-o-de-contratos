import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { History, Search, FileCheck, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [toast, setToast] = useState(null);

  // Simulação do Usuário Logado (O Base44 substituirá isso pelo contexto de Auth real)
  const [currentUser, setCurrentUser] = useState({
    nome: "Leonardo (Eng. Mecânico)",
    perfil: "Administrador" // Mude para "Comum" para testar o bloqueio visual do select
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LancamentoFinanceiro.list();
      // Ordenação pela data de criação mais recente
      const ordenados = (data || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setLancamentos(ordenados);
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

  const mostrarNotificacao = (mensagem) => {
    setToast(mensagem);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleStatusChange = async (lancamento, novoStatus) => {
    const statusAntigo = lancamento.status;
    if (statusAntigo === novoStatus) return;

    try {
      const dataAtual = new Date().toISOString();

      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { 
        status: novoStatus,
        data_ultima_alteracao: dataAtual
      });

      await base44.entities.LogAuditoria.create({
        entidade_id: lancamento.id,
        entidade_tipo: "LancamentoFinanceiro",
        tipo_acao: "ALTERACAO_STATUS_FISCAL",
        justificativa: `Status alterado de [${statusAntigo}] para [${novoStatus}]`,
        responsavel: currentUser.nome,
        valor_operacao: lancamento.valor,
        data_acao: dataAtual
      });

      mostrarNotificacao(`Auditoria registrada com sucesso para o status ${novoStatus}`);
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Falha crítica ao gravar log de auditoria.");
    }
  };

  const filtrados = lancamentos.filter(l => 
    l.item_label?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    l.numero_nf?.includes(termoBusca) ||
    l.numero_os?.includes(termoBusca)
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 bg-slate-50 min-h-screen relative">
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
            placeholder="Pesquisar NF, OS ou Descrição..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50">
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-[#1a2e4a] hover:bg-[#1a2e4a]">
              <TableRow className="border-none">
                <TableHead className="text-white font-bold h-12">NF / DATA</TableHead>
                <TableHead className="text-white font-bold h-12">DESCRIÇÃO DO ITEM</TableHead>
                <TableHead className="text-white font-bold h-12 text-center">OS</TableHead>
                <TableHead className="text-white font-bold h-12">RESPONSÁVEL</TableHead>
                <TableHead className="text-white font-bold h-12 text-right">VALOR</TableHead>
                <TableHead className="text-white font-bold h-12 text-center">STATUS ATUAL</TableHead>
                <TableHead className="text-white font-bold h-12 text-center">ÚLTIMA ALTERAÇÃO</TableHead>
                <TableHead className="text-white font-bold h-12 text-right">HISTÓRICO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-400 font-medium italic">Sincronizando com Base44...</TableCell></TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-400">Nenhum registro encontrado para a busca.</TableCell></TableRow>
              ) : filtrados.map((l) => {
                
                // Regra de Negócio: Bloqueio do Dropdown
                const isPago = l.status === "Pago";
                const isAdmin = currentUser.perfil === "Administrador";
                const dropdownBloqueado = isPago && !isAdmin;

                return (
                  <TableRow key={l.id} className="hover:bg-blue-50/20 transition-colors">
                    {/* Coluna 1: NF / Data */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1a2e4a]">{l.numero_nf || "S/N"}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{l.data_nf ? new Date(l.data_nf).toLocaleDateString('pt-BR') : new Date(l.created_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </TableCell>

                    {/* Coluna 2: Descrição */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="font-medium text-slate-600 truncate max-w-[200px]">
                          {formatLabel(l.item_label)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Coluna 3: OS */}
                    <TableCell className="text-center">
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">
                        {l.numero_os || "N/A"}
                      </span>
                    </TableCell>

                    {/* Coluna 4: Responsável */}
                    <TableCell>
                      <span className="text-xs text-slate-500 font-medium">
                        {l.responsavel_criacao || "Não informado"}
                      </span>
                    </TableCell>

                    {/* Coluna 5: Valor */}
                    <TableCell className="text-right">
                      <span className="font-black text-[#1a2e4a]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                      </span>
                    </TableCell>

                    {/* Coluna 6: Status Atual com Regra de Bloqueio */}
                    <TableCell>
                      <div className="flex justify-center">
                        <Select defaultValue={l.status} onValueChange={(val) => handleStatusChange(l, val)} disabled={dropdownBloqueado}>
                          <SelectTrigger className={`w-[170px] h-9 text-xs border-slate-200 font-bold ${dropdownBloqueado ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOF">🏛️ SOF</SelectItem>
                            <SelectItem value="Instrução">⏳ Instrução</SelectItem>
                            <SelectItem value="Execução">⚙️ Execução</SelectItem>
                            <SelectItem value="Bloco de assinaturas">✍️ Bloco de assinaturas</SelectItem>
                            <SelectItem value="Aprovisionado">📌 Aprovisionado</SelectItem>
                            <SelectItem value="Pago">✅ Pago</SelectItem>
                            <SelectItem value="Cancelado">❌ Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>

                    {/* Coluna 7: Última Alteração */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-500">
                          {l.data_ultima_alteracao ? new Date(l.data_ultima_alteracao).toLocaleDateString('pt-BR') : "--"}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {l.data_ultima_alteracao ? new Date(l.data_ultima_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                    </TableCell>

                    {/* Coluna 8: Histórico */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          <History className="w-2.5 h-2.5" /> AUDITADO
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 border border-green-500">
          <CheckCircle2 className="w-5 h-5 text-green-100" />
          <span className="font-bold text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
}