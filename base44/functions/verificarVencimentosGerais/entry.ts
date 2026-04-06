import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Define os prazos para notificação em dias restantes
        const diasAlertaContrato = [120, 90, 60, 30];
        
        // === 1. TAREFA 3: AVISOS DE VENCIMENTOS DE CONTRATOS ===
        const contratos = await base44.asServiceRole.entities.Contrato.filter({ status: "ativo" });

        for (const c of contratos) {
            if (c.data_fim) {
                const dataFim = new Date(c.data_fim);
                dataFim.setHours(0, 0, 0, 0);
                
                // Calcula a diferença em dias
                const diffTime = dataFim.getTime() - hoje.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diasAlertaContrato.includes(diffDays)) {
                    await base44.asServiceRole.entities.NotificacaoAdmin.create({
                        tipo: "outro",
                        titulo: `Aviso: Contrato ${c.numero} vence em ${diffDays} dias`,
                        mensagem: `O contrato firmado com a empresa ${c.contratada} irá expirar no dia ${c.data_fim}. Considere iniciar as tratativas de aditivo ou nova licitação.`,
                        lida: false,
                        dados_extras: JSON.stringify({ contrato_id: c.id, dias: diffDays })
                    });
                }
            }
        }

        // === 2. TAREFA 4: AVISOS DE VENCIMENTOS DE CONVENÇÕES COLETIVAS ===
        const convencoes = await base44.asServiceRole.entities.ConvencaoColetiva.filter({ status: "vigente" });

        for (const conv of convencoes) {
            if (conv.data_vigencia_fim) {
                const dataFim = new Date(conv.data_vigencia_fim);
                dataFim.setHours(0, 0, 0, 0);
                
                const diffTime = dataFim.getTime() - hoje.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Avisa aos gestores quando faltar exatamente 30 dias
                if (diffDays === 30) {
                    await base44.asServiceRole.entities.NotificacaoAdmin.create({
                        tipo: "outro",
                        titulo: `Aviso: Convenção Coletiva vence em 30 dias`,
                        mensagem: `A convenção ${conv.numero} do sindicato ${conv.sindicato} - ${conv.categoria} expira em ${conv.data_vigencia_fim}. Fique atento a reajustes salariais.`,
                        lida: false,
                        dados_extras: JSON.stringify({ convencao_id: conv.id })
                    });
                }
            }
        }

        return Response.json({ success: true, message: "Verificações de vencimentos concluídas com sucesso." });
    } catch (error) {
        console.error("Erro em verificarVencimentosGerais:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});