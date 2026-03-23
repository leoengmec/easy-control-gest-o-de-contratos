import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { History, Search, FileCheck, ShieldCheck, CheckCircle2, Edit } from "lucide-react";

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [toast, setToast] = useState(null);
  
  // Estado para controlar a janela flutuante de edicao
  const [itemEditando, setItemEditando] = useState(null);

  // Simula o usuario logado (Altere o perfil aqui para testar as travas visuais)
  const [currentUser] = useState({
    nome: "Leonardo (Eng. Mecânico)",
    perfil: "Administrador" 
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LancamentoFinanceiro.list();
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

  const salvarEdicaoCadastro = async (e) => {
    e.preventDefault();
    try {
      const dataAtual = new Date().toISOString();
      
      await base44.entities.LancamentoFinanceiro.update(itemEditando.id, {
        numero_nf: itemEditando.numero_nf,
        data_nf: itemEditando.data_nf,
        numero_os: itemEditando.numero_os,
        valor: Number(itemEditando.valor),
        data_ultima_alteracao: dataAtual
      });

      await base44.entities.LogAuditoria.create({
        entidade_id: itemEditando.id,
        entidade_tipo: "LancamentoFinanceiro",
        tipo_acao: "EDICAO_DADOS_CADASTRAIS",
        justificativa: `Alteração manual dos dados do lançamento via modal de edição`,
        responsavel: currentUser.nome,
        valor_operacao: Number(itemEditando.valor),
        data_acao: dataAtual
      });

      mostrarNotificacao("Dados do cadastro atualizados com sucesso!");
      setItemEditando(null);
      carregarDados();
    } catch (error) {
      console.error("Erro ao salvar edicao:", error);
      alert("Erro ao tentar atualizar o cadastro no Base44.");
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
                <TableHead className="text-white font-bold h-12 w-10"></TableHead>
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
                <TableRow><TableCell colSpan={9} className="text-center py-20 text-slate-400 font-medium italic">Sincronizando com Base44...</TableCell></TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-20 text-slate-400">Nenhum registro encontrado para a busca.</TableCell></TableRow>
              ) : filtrados.map((l) => {
                
                // Mapeamento das regras de negocio baseadas no Perfil
                const isPago = l.status === "Pago";
                const isAdmin = currentUser.perfil === "Administrador";
                const isGestor = currentUser.perfil === "Gestor";
                
                const selectBloqueado = isGestor || (isPago && !isAdmin);
                const podeEditarDados = isAdmin || (!isGestor && !isPago);

                return (
                  <TableRow key={l.id} className="hover:bg-blue-50/20 transition-colors">
                    {/* Botao de Editar */}
                    <TableCell>
                      {podeEditarDados && (
                        <button onClick={() => setItemEditando({...l})} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </TableCell>

                    {/* NF / Data */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1a2e4a]">{l.numero_nf || "S/N"}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{l.data_nf ? new Date(l.data_nf).toLocaleDateString('pt-BR') : new Date(l.created_date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </TableCell>

                    {/* Descricao */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="font-medium text-slate-600 truncate max-w-[200px]">
                          {formatLabel(l.item_label)}
                        </span>
                      </div>
                    </TableCell>

                    {/* OS */}
                    <TableCell className="text-center">
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs">
                        {l.numero_os || "N/A"}
                      </span>
                    </TableCell>

                    {/* Responsavel */}
                    <TableCell>
                      <span className="text-xs text-slate-500 font-medium">
                        {l.responsavel_criacao || "Não informado"}
                      </span>
                    </TableCell>

                    {/* Valor */}
                    <TableCell className="text-right">
                      <span className="font-black text-[#1a2e4a]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                      </span>
                    </TableCell>

                    {/* Status Atual */}
                    <TableCell>
                      <div className="flex justify-center">
                        <Select defaultValue={l.status} onValueChange={(val) => handleStatusChange(l, val)} disabled={selectBloqueado}>
                          <SelectTrigger className={`w-[170px] h-9 text-xs border-slate-200 font-bold ${selectBloqueado ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'}`}>
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

                    {/* Ultima Alteracao */}
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

                    {/* Historico */}
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

      {/* Janela Flutuante de Edicao de Cadastro */}
      {itemEditando && (
        <div className="fixed inset-0 bg-[#1a2e4a]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
              <h2 className="font-bold text-[#1a2e4a]">Editar Lançamento</h2>
              <button onClick={() => setItemEditando(null)} className="text-slate-400 hover:text-red-500 font-bold">X</button>
            </div>
            
            <form onSubmit={salvarEdicaoCadastro} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Número da NF</label>
                  <input 
                    className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                    value={itemEditando.numero_nf || ""}
                    onChange={e => setItemEditando({...itemEditando, numero_nf: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Data da NF</label>
                  <input 
                    type="date"
                    className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                    value={itemEditando.data_nf ? new Date(itemEditando.data_nf).toISOString().split('T')[0] : ""}
                    onChange={e => setItemEditando({...itemEditando, data_nf: new Date(e.target.value).toISOString()})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Ordem de Serviço (OS)</label>
                <input 
                  className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                  value={itemEditando.numero_os || ""}
                  onChange={e => setItemEditando({...itemEditando, numero_os: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Valor (R$)</label>
                <input 
                  type="number" step="0.01"
                  className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500"
                  value={itemEditando.valor || 0}
                  onChange={e => setItemEditando({...itemEditando, valor: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setItemEditando(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-md">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 border border-green-500">
          <CheckCircle2 className="w-5 h-5 text-green-100" />
          <span className="font-bold text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
}