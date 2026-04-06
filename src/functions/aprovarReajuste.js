import { validarPermissoes } from './validarPermissoes';
import { base44 } from '@/api/base44Client';

export const aprovarReajuste = async (reajusteId, userId, userRole) => {
  try {
    // 1. Validar permissão (apenas Admin/Owner/Gestor podem aprovar conforme validação)
    validarPermissoes(userRole, 'aprovar', 'reajuste');
    
    // 2. Buscar reajuste
    const reajuste = await base44.entities.Reajuste.get(reajusteId);
    if (!reajuste) throw new Error('Reajuste não encontrado');
    
    // 3. Buscar itens do tipo de serviço
    const tiposItemMap = {
      'mor': 'com_mao_de_obra_residente',
      'servico_eventual': 'com_mao_de_obra_residente',
      'material': 'com_mao_de_obra_residente',
      'equipamento': 'com_mao_de_obra_residente',
      'deslocamento': 'com_mao_de_obra_residente'
    };
    
    const itensReajuste = await base44.entities.ItemContrato.filter({
      contrato_id: reajuste.contrato_id,
      tipo_contrato_manutencao: tiposItemMap[reajuste.tipo]
    });
    
    // 4. Atualizar valor de cada item
    for (const item of itensReajuste) {
      const novoValor = item.valor_total_contratado * (1 + reajuste.percentual_reajuste / 100);
      const novoValorUnitario = item.valor_unitario * (1 + reajuste.percentual_reajuste / 100);
      
      await base44.entities.ItemContrato.update(item.id, {
        valor_total_contratado: parseFloat(novoValor.toFixed(2)),
        valor_unitario: parseFloat(novoValorUnitario.toFixed(2))
      });
    }
    
    // 5. Atualizar status do reajuste
    await base44.entities.Reajuste.update(reajusteId, {
      status: 'aprovado',
      data_aprovacao: new Date().toISOString(),
      aprovado_por: userId
    });
    
    // 6. Criar HistoricoContrato (com tratamento caso a entidade não exista)
    try {
      await base44.entities.HistoricoContrato.create({
        contrato_id: reajuste.contrato_id,
        campo_alterado: 'reajuste_aprovado',
        valor_anterior: reajuste.valor_anterior.toFixed(2),
        valor_novo: reajuste.novo_valor.toFixed(2),
        data_alteracao: new Date().toISOString(),
        alterado_por: userId || 'sistema',
        motivo: `Reajuste ${reajuste.tipo} aprovado (${reajuste.indice_aplicado})`,
        ip_address: '127.0.0.1'
      });
    } catch (e) {
      console.warn("HistoricoContrato não processado:", e);
    }
    
    // 7. Resolver alerta de reajuste pendente (com tratamento caso a entidade não exista)
    try {
      const alertas = await base44.entities.AlertaContrato.filter({
        contrato_id: reajuste.contrato_id,
        tipo: 'reajuste_pendente',
        status: 'ativo'
      });
      
      for (const alerta of alertas) {
        await base44.entities.AlertaContrato.update(alerta.id, {
          status: 'resolvido'
        });
      }
    } catch (e) {
      console.warn("AlertaContrato não processado:", e);
    }
    
    return reajuste;
    
  } catch (error) {
    console.error('Erro ao aprovar reajuste:', error);
    throw error;
  }
};

export default aprovarReajuste;