import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Validação de Autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado. Autenticação exigida.' }, { status: 401 });
        }

        const body = await req.json();
        const { 
            contrato_id, 
            natureza_id, 
            valor_operacao, 
            tipo_acao, 
            justificativa, 
            numero_ne,
            aglutinador_mor = "NENHUM" 
        } = body;

        // 2. Validação de Entrada
        if (!contrato_id || !natureza_id || valor_operacao === undefined || !justificativa) {
            return Response.json({ error: 'Parâmetros obrigatórios ausentes: contrato_id, natureza_id, valor_operacao ou justificativa.' }, { status: 400 });
        }

        // 3. Simulação de ACID e Concorrência: Buscamos SEMPRE o estado atual do banco (independente do Front-end)
        const saldosAtuais = await base44.entities.ContratoSaldo.filter({ 
            contrato_id: contrato_id, 
            natureza_id: natureza_id 
        });
        
        let contratoSaldo = saldosAtuais.length > 0 ? saldosAtuais[0] : null;

        let valorAnterior = 0;
        let novoSaldo = valor_operacao;
        let novoEmpenhado = valor_operacao;

        if (contratoSaldo) {
            valorAnterior = contratoSaldo.saldo_disponivel || 0;
            novoSaldo = valorAnterior + valor_operacao;
            novoEmpenhado = (contratoSaldo.valor_empenhado || 0) + valor_operacao;
        }

        // 4. Regra de Negócio: Tratamento de Rollback Simulado (Saldo não pode ficar negativo)
        if (novoSaldo < 0) {
            return Response.json({ 
                error: 'Saldo insuficiente para a operação. A transação foi bloqueada.',
                detalhes: `Saldo Atual: ${valorAnterior} / Tentativa de redução: ${Math.abs(valor_operacao)}`
            }, { status: 400 });
        }

        // 5. Persistência de Dados (Commit)
        if (contratoSaldo) {
            await base44.entities.ContratoSaldo.update(contratoSaldo.id, {
                saldo_disponivel: novoSaldo,
                valor_empenhado: novoEmpenhado
            });
        } else {
            contratoSaldo = await base44.entities.ContratoSaldo.create({
                contrato_id,
                natureza_id,
                valor_empenhado: novoEmpenhado,
                valor_liquidado: 0,
                saldo_disponivel: novoSaldo
            });
        }

        // 6. Registro Seguro de Auditoria (Snapshot do Estado Anterior e Posterior)
        await base44.entities.LogAuditoria.create({
            entidade_id: contratoSaldo.id, // Vincula o histórico ao saldo (ou ao empenho, caso o Front envie uma ref extra)
            numero_ne: numero_ne || "S/N",
            natureza_id: natureza_id,
            aglutinador_mor: aglutinador_mor,
            tipo_acao: tipo_acao || "AJUSTE_SALDO",
            valor_operacao: valor_operacao,
            valor_anterior: valorAnterior,
            valor_posterior: novoSaldo,
            justificativa: justificativa,
            responsavel: user.full_name || user.email || "Sistema Backend",
            data_acao: new Date().toISOString()
        });

        return Response.json({ 
            success: true, 
            mensagem: 'Saldo atualizado e auditado com sucesso.',
            saldo_atual: novoSaldo 
        });

    } catch (error) {
        console.error("Erro na Service de Atualização de Saldo:", error);
        return Response.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 });
    }
});