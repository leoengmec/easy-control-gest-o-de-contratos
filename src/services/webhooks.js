import { base44 } from '@/api/base44Client';

/**
 * Gera assinatura HMAC para validação do webhook usando Web Crypto API
 * @param {Object} payload - Dados do webhook
 * @returns {Promise<string>} Assinatura em hex
 */
const gerarAssinatura = async (payload) => {
  try {
    const secret = 'seu-secret-key'; // Em produção idealmente viria de uma config segura
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(JSON.stringify(payload));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.warn('Fallback de assinatura:', error);
    return 'assinatura-mock-fallback';
  }
};

/**
 * Envia webhook de alerta de reajuste
 * @param {string} contratoId - ID do contrato
 * @param {string} tipo - Tipo de reajuste (mor, material, deslocamento)
 * @param {number} percentual - Percentual de reajuste
 * @param {string} webhookUrl - URL para enviar o webhook
 */
export const enviarAlertaReajuste = async (contratoId, tipo, percentual, webhookUrl) => {
  try {
    const payload = {
      evento: 'reajuste_pendente',
      contrato_id: contratoId,
      tipo_reajuste: tipo,
      percentual_reajuste: percentual,
      data_alerta: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    const signature = await gerarAssinatura(payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }
    
    console.log(`✅ Alerta de reajuste enviado para ${webhookUrl}`);
    return { sucesso: true, webhook_url: webhookUrl };
    
  } catch (error) {
    console.error('Erro ao enviar webhook de reajuste:', error);
    throw error;
  }
};

/**
 * Envia webhook de alerta de vencimento de contrato
 * @param {string} contratoId - ID do contrato
 * @param {string} dataVencimento - Data de vencimento
 * @param {number} diasRestantes - Dias até vencimento
 * @param {string} webhookUrl - URL para enviar o webhook
 */
export const enviarAlertaVencimento = async (contratoId, dataVencimento, diasRestantes, webhookUrl) => {
  try {
    const payload = {
      evento: 'vencimento_proximo',
      contrato_id: contratoId,
      data_vencimento: dataVencimento,
      dias_restantes: diasRestantes,
      data_alerta: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    const signature = await gerarAssinatura(payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }
    
    console.log(`✅ Alerta de vencimento enviado para ${webhookUrl}`);
    return { sucesso: true, webhook_url: webhookUrl };
    
  } catch (error) {
    console.error('Erro ao enviar webhook de vencimento:', error);
    throw error;
  }
};

/**
 * Envia webhook de alerta de ACT/CCT
 * @param {string} contratoId - ID do contrato
 * @param {string} convencaoId - ID da convenção coletiva
 * @param {string} dataVencimento - Data de vencimento da ACT/CCT
 * @param {string} webhookUrl - URL para enviar o webhook
 */
export const enviarAlertaACT = async (contratoId, convencaoId, dataVencimento, webhookUrl) => {
  try {
    const payload = {
      evento: 'act_cct_vencimento',
      contrato_id: contratoId,
      convencao_id: convencaoId,
      data_vencimento: dataVencimento,
      data_alerta: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    const signature = await gerarAssinatura(payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }
    
    console.log(`✅ Alerta de ACT/CCT enviado para ${webhookUrl}`);
    return { sucesso: true, webhook_url: webhookUrl };
    
  } catch (error) {
    console.error('Erro ao enviar webhook de ACT:', error);
    throw error;
  }
};

/**
 * Registra webhook no banco de dados
 * @param {string} contratoId - ID do contrato
 * @param {string} tipo - Tipo de evento
 * @param {string} webhookUrl - URL do webhook
 */
export const registrarWebhook = async (contratoId, tipo, webhookUrl) => {
  try {
    const webhook = await base44.entities.Webhook.create({
      contrato_id: contratoId,
      tipo_evento: tipo,
      url: webhookUrl,
      ativo: true,
      data_criacao: new Date().toISOString(),
      tentativas_envio: 0,
      ultimo_envio: null
    });
    
    return webhook;
  } catch (error) {
    console.error('Erro ao registrar webhook:', error);
    throw error;
  }
};

export default {
  enviarAlertaReajuste,
  enviarAlertaVencimento,
  enviarAlertaACT,
  registrarWebhook
};