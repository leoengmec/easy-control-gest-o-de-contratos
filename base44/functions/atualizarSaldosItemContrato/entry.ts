import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        const { data, old_data } = payload;
        
        const record = data || old_data;
        if (!record || !record.item_contrato_id) {
            return Response.json({ success: true, message: "Sem item_contrato_id para atualizar" });
        }

        const itemContratoId = record.item_contrato_id;

        // Buscar todos os lançamentos financeiros vinculados ao item do contrato
        const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
            item_contrato_id: itemContratoId
        });

        // Filtrar apenas os que possuem status Pago ou SOF
        const validLancamentos = lancamentos.filter(l => l.status === "Pago" || l.status === "SOF");

        // Somar os valores finais (ou valor caso valor_pago_final não esteja definido)
        let valorPago = 0;
        for (const l of validLancamentos) {
            const valorFinal = l.valor_pago_final !== undefined && l.valor_pago_final !== null ? l.valor_pago_final : (l.valor || 0);
            valorPago += valorFinal;
        }

        // Buscar o Item do Contrato para atualização
        const itemContrato = await base44.asServiceRole.entities.ItemContrato.get(itemContratoId);
        if (!itemContrato) {
            return Response.json({ success: true, message: "ItemContrato não encontrado" });
        }

        const valorTotalContratado = itemContrato.valor_total_contratado || 0;
        const saldo = valorTotalContratado - valorPago;
        const percentualExecucao = valorTotalContratado > 0 ? (valorPago / valorTotalContratado) * 100 : 0;

        // Atualizar saldo, percentual e valores pagos no Item do Contrato
        await base44.asServiceRole.entities.ItemContrato.update(itemContratoId, {
            valor_pago: valorPago,
            saldo: saldo,
            percentual_execucao: percentualExecucao
        });

        return Response.json({ success: true, valor_pago: valorPago, saldo, percentual_execucao });
    } catch (error) {
        console.error("Erro em atualizarSaldosItemContrato:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});