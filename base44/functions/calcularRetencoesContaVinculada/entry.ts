import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        const { data, old_data } = payload;
        
        const record = data || old_data;
        if (!record || !record.contrato_id) {
            return Response.json({ success: true, message: "Sem contrato_id para atualizar" });
        }

        const contratoId = record.contrato_id;

        // Buscar todos os Lançamentos Financeiros daquele contrato
        const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
            contrato_id: contratoId
        });

        // Filtrar apenas os pagamentos consolidados ou aprovados
        const validLancamentos = lancamentos.filter(l => l.status === "Pago" || l.status === "SOF");

        // Somar apenas o valor de retenção para alimentar a conta vinculada
        let totalRetencao = 0;
        for (const l of validLancamentos) {
            totalRetencao += (l.retencao || 0);
        }

        // Buscar as contas vinculadas relativas ao contrato (normalmente apenas 1 ativa por vez)
        const contas = await base44.asServiceRole.entities.ContaVinculada.filter({
            contrato_id: contratoId,
            status: "ativa"
        });

        // Atualiza a conta vinculada associada ajustando o saldo consolidado retido
        if (contas.length > 0) {
            for (const conta of contas) {
                await base44.asServiceRole.entities.ContaVinculada.update(conta.id, {
                    saldo_total: totalRetencao
                });
            }
        }

        return Response.json({ success: true, total_retencao: totalRetencao, contas_atualizadas: contas.length });
    } catch (error) {
        console.error("Erro em calcularRetencoesContaVinculada:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});