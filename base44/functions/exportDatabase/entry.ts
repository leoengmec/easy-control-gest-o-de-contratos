import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem exportar o banco de dados.' }, { status: 403 });
    }

    const entidades = [
      'Contrato',
      'ItemContrato',
      'Aditivo',
      'NotaEmpenho',
      'LancamentoFinanceiro',
      'ItemMaterialNF',
      'OrcamentoAnual',
      'OrcamentoContratualAnual',
      'OrcamentoContratualItemAnual',
      'HistoricoOrcamento',
      'HistoricoOrcamentoContratualAnual',
      'HistoricoValorFinanceiroNufip',
      'ConfiguracaoAlerta',
      'NotificacaoAdmin',
    ];

    const db = {};
    for (const nome of entidades) {
      db[nome] = await base44.asServiceRole.entities[nome].list(null, 5000);
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 16).replace('T', '_');
    const filename = `backup_base44_${timestamp}.json`;
    
    const json = JSON.stringify(db, null, 2);

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});