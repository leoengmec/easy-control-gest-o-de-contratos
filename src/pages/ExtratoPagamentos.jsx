import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns"; // Opcional, para formatar datas

export default function ExtratoPagamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Carregar usuário logado para auditoria
  useEffect(() => {
    base44.auth.me().then(setUser);
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const data = await base44.entities.LancamentoFinanceiro.list();
      setLancamentos(data || []);
    } catch (error) {
      toast.error("Erro ao carregar extrato.");
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNÇÃO CRÍTICA: Atualização de Status com Rastro de Auditoria
  const handleStatusUpdate = async (id, novoStatus) => {
    const agoraISO = new Date().toISOString();
    const nomeResponsavel = user?.full_name || "Leonardo Alves";

    try {
      await base44.entities.LancamentoFinanceiro.update(id, {
        status: novoStatus,
        // Atualiza quem mudou o status e quando
        responsavel_alteracao_status: nomeResponsavel,
        data_alteracao_status: agoraISO
      });
      
      toast.success(`Status alterado para ${novoStatus}`);
      fetchDados(); // Recarrega a tabela para atualizar os nomes na tela
    } catch (error) {
      console.error("Erro na auditoria:", error);
      toast.error("Falha ao salvar rastro de auditoria.");
    }
  };

  const formatarData = (dataStr) => {
    if (!dataStr || dataStr === "Sem registro") return "N/A";
    try {
      return new Date(dataStr).toLocaleString("pt-BR");
    } catch {
      return dataStr;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[#1a2e4a]">Extrato de Pagamentos e Auditoria</h1>
      
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>NF / Data</TableHead>
              <TableHead>Item / Contrato</TableHead>
              <TableHead>Status (Clique p/ Alterar)</TableHead>
              <TableHead>Responsável Criação</TableHead>
              <TableHead>Última Alteração Status</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="font-bold">{l.numero_nf}</div>
                  <div className="text-[10px] text-gray-400">{l.data_nf}</div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  <div className="uppercase text-[11px] font-semibold">{l.item_label}</div>
                  <div className="text-[10px] text-blue-600">ID Contrato: {l.contrato_id}</div>
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" className="p-0 hover:bg-transparent">
                        <Badge className="cursor-pointer hover:opacity-80 uppercase text-[10px]">
                          {l.status}
                        </Badge>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="flex flex-col gap-1">
                        {["SOF", "Pago", "Cancelado", "Em instrução"].map(st => (
                          <Button 
                            key={st} 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start text-[11px]"
                            onClick={() => handleStatusUpdate(l.id, st)}
                          >
                            Mudar para {st}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <div className="text-[11px]">{l.responsavel_por_lancamento || "Sistema"}</div>
                  <div className="text-[9px] text-gray-400">{formatarData(l.data_do_lancamento_original)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-[11px] font-medium text-blue-700">{l.responsavel_alteracao_status || "Sem registro"}</div>
                  <div className="text-[9px] text-gray-400">{formatarData(l.data_alteracao_status)}</div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  R$ {l.valor_pago_final?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}