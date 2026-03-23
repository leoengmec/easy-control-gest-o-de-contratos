import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado.' }, { status: 401 });
        }

        const body = await req.json();
        const { contrato_id, item_label, valor_lancamento, saldo_restante, usuario_responsavel } = body;

        if (!contrato_id || !item_label || valor_lancamento === undefined || saldo_restante === undefined) {
            return Response.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
        }

        // Buscar email do admin nas configurações
        const configs = await base44.entities.ConfiguracaoApp.filter({ chave: 'EMAIL_ADMIN_ESTOURO' });
        const emailAdmin = configs.length > 0 ? configs[0].valor : null;

        if (!emailAdmin) {
             console.warn("Configuração EMAIL_ADMIN_ESTOURO não encontrada. Notificação não enviada.");
             return Response.json({ success: false, mensagem: 'Email do admin não configurado.' });
        }

        const contrato = await base44.entities.Contrato.get(contrato_id);
        const numeroContrato = contrato ? contrato.numero : contrato_id;

        const emailHtml = `
            <h2>Alerta de Estouro de Orçamento - Easy Control</h2>
            <p><strong>Contrato:</strong> ${numeroContrato}</p>
            <p><strong>Item/Aglutinador:</strong> ${item_label}</p>
            <p><strong>Valor do Lançamento:</strong> R$ ${valor_lancamento.toFixed(2)}</p>
            <p><strong>Saldo Restante (Negativo):</strong> R$ ${saldo_restante.toFixed(2)}</p>
            <p><strong>Responsável pelo Lançamento:</strong> ${usuario_responsavel}</p>
            <hr />
            <p>Por favor, verifique a necessidade de aditivo ou remanejamento de verbas.</p>
        `;

        // Integrar com SendEmail
        await base44.integrations.Core.SendEmail({
            to: emailAdmin,
            subject: `[ALERTA] Estouro de Orçamento - Contrato ${numeroContrato}`,
            body: emailHtml,
            from_name: "Easy Control - JFRN"
        });

        return Response.json({ success: true, mensagem: 'Notificação enviada com sucesso.' });

    } catch (error) {
        console.error("Erro ao enviar notificação de estouro:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});