import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = await req.json().catch(() => ({}));
        const { id, ano, tipo = 'todos' } = payload;
        
        if (!id || !ano) return Response.json({ error: 'Missing id or ano' }, { status: 400 });

        const itensContrato = await base44.entities.ItemContrato.filter({ contrato_id: id });
        const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ contrato_id: id, ano: parseInt(ano) });
        const itensOrcados = await base44.entities.OrcamentoContratualItemAnual.filter({ contrato_id: id, ano: parseInt(ano) });

        const normalizar = (str) => (str || "").toUpperCase().trim();
        const itensFixosEspecificos = ["MOR NATAL", "MOR MOSSORÓ", "MOR MOSSORO", "DESLOCAMENTO PREVENTIVO"];

        const classificarGrupo = (label, grupoPadrao) => {
            const labelNorm = normalizar(label);
            const isFixo = itensFixosEspecificos.some(f => labelNorm.includes(f));
            return isFixo ? 'Serviços Fixos' : 'Demandas Eventuais';
        };

        const itensMap = new Map();

        itensContrato.forEach(i => {
            if (i.nome) {
                const key = normalizar(i.nome);
                itensMap.set(key, { 
                    nome: i.nome, 
                    grupo: classificarGrupo(i.nome, i.grupo_servico === 'fixo' ? 'Serviços Fixos' : 'Demandas Eventuais'),
                    orcado: 0, pago: 0, aprovisionado: 0 
                });
            }
        });

        itensOrcados.forEach(i => {
            if (i.item_label) {
                const key = normalizar(i.item_label);
                if (!itensMap.has(key)) {
                    itensMap.set(key, { 
                        nome: i.item_label, 
                        grupo: classificarGrupo(i.item_label, 'Demandas Eventuais'),
                        orcado: 0, pago: 0, aprovisionado: 0 
                    });
                }
                itensMap.get(key).orcado += (i.valor_orcado || 0);
            }
        });

        lancamentos.forEach(l => {
            if (l.item_label) {
                const key = normalizar(l.item_label);
                if (!itensMap.has(key)) {
                    itensMap.set(key, { 
                        nome: l.item_label, 
                        grupo: classificarGrupo(l.item_label, 'Demandas Eventuais'),
                        orcado: 0, pago: 0, aprovisionado: 0 
                    });
                }
                const item = itensMap.get(key);
                if (l.status === "Pago") item.pago += (l.valor_pago_final || 0);
                else if (l.status === "Aprovisionado") item.aprovisionado += (l.valor || 0);
            }
        });

        let itens = Array.from(itensMap.values()).map(item => {
            item.saldo = item.orcado - item.pago - item.aprovisionado;
            item.execucao = item.orcado > 0 ? Math.min((item.pago / item.orcado) * 100, 100) : 0;
            return item;
        });

        if (tipo === 'fixos') itens = itens.filter(i => i.grupo === 'Serviços Fixos');
        else if (tipo === 'demandas') itens = itens.filter(i => i.grupo === 'Demandas Eventuais');

        const totais = {
            orcado: itens.reduce((s, i) => s + i.orcado, 0),
            pago: itens.reduce((s, i) => s + i.pago, 0),
            aprovisionado: itens.reduce((s, i) => s + i.aprovisionado, 0)
        };
        totais.saldo = totais.orcado - totais.pago - totais.aprovisionado;
        totais.execucao = totais.orcado > 0 ? Math.min((totais.pago / totais.orcado) * 100, 100) : 0;

        return Response.json({ itens, totais });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});