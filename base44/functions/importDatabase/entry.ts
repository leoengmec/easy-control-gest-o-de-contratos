import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem importar dados.' }, { status: 403 });
    }

    const { db } = await req.json();

    if (!db || typeof db !== 'object') {
      return Response.json({ error: 'Arquivo de backup inválido.' }, { status: 400 });
    }

    const entidadesPermitidas = [
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

    const resultado = {};

    for (const nome of entidadesPermitidas) {
      if (!db[nome] || !Array.isArray(db[nome])) {
        resultado[nome] = { importados: 0, ignorados: 0 };
        continue;
      }

      const registros = db[nome];
      let importados = 0;
      let ignorados = 0;

      for (const registro of registros) {
        // Remove campos built-in que a plataforma gerencia automaticamente
        const { id, created_date, updated_date, created_by, ...dados } = registro;
        if (Object.keys(dados).length === 0) { ignorados++; continue; }
        await base44.asServiceRole.entities[nome].create(dados);
        importados++;
      }

      resultado[nome] = { importados, ignorados };
    }

    // Log da operação
    await base44.asServiceRole.entities.NotificacaoAdmin.create({
      tipo: "outro",
      titulo: "Backup Restaurado",
      mensagem: `Backup restaurado por ${user.full_name || user.email} em ${new Date().toLocaleString('pt-BR')}. Total importado: ${Object.values(resultado).reduce((acc, r) => acc + r.importados, 0)} registros.`,
      lida: false,
      dados_extras: JSON.stringify({ resultado, timestamp: new Date().toISOString() }),
    });

    return Response.json({ success: true, resultado });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});