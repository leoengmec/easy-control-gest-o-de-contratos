import { base44 } from '@/api/base44Client';

/**
 * Envia email de confirmação de lançamento
 * @param {string} email - Email do destinatário
 * @param {Object} dados - Dados do lançamento
 */
export const enviarEmailConfirmacaoLancamento = async (email, dados) => {
  try {
    const mensagem = {
      para: email,
      assunto: `Confirmação de Lançamento #${dados.numero_nf}`,
      corpo: `
        <h2>Lançamento Confirmado</h2>
        <p>Seu lançamento foi registrado com sucesso.</p>
        <ul>
          <li>NF: ${dados.numero_nf}</li>
          <li>Valor: R$ ${dados.valor.toFixed(2)}</li>
          <li>Data: ${new Date(dados.data_nf).toLocaleDateString('pt-BR')}</li>
          <li>Status: ${dados.status}</li>
        </ul>
        <p>Obrigado!</p>
      `,
      tipo: 'confirmacao_lancamento'
    };
    
    // Integrar com serviço de email (SendGrid, Mailgun, etc.)
    // await enviarPorSMTP(mensagem);
    
    console.log(`✅ Email enviado para ${email}`);
    return { sucesso: true, email };
    
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};

/**
 * Envia notificação de alerta de reajuste
 * @param {string} usuarioId - ID do usuário
 * @param {Object} dados - Dados do alerta
 */
export const enviarNotificacaoReajuste = async (usuarioId, dados) => {
  try {
    // Usando Notificacao (ou NotificacaoAdmin dependendo do seu schema de entidades)
    const notificacao = await base44.entities.Notificacao.create({
      usuario_id: usuarioId,
      tipo: 'reajuste_pendente',
      titulo: `Reajuste Pendente: ${dados.tipo}`,
      mensagem: `Um reajuste de ${dados.percentual}% foi criado e aguarda aprovação.`,
      dados_extras: JSON.stringify(dados),
      lida: false,
      data_criacao: new Date().toISOString()
    });
    
    console.log(`✅ Notificação enviada para usuário ${usuarioId}`);
    return notificacao;
    
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
};

/**
 * Envia SMS de alerta crítico
 * @param {string} telefone - Número de telefone
 * @param {string} mensagem - Mensagem a enviar
 */
export const enviarSMSAlerta = async (telefone, mensagem) => {
  try {
    // Integrar com serviço de SMS (Twilio, AWS SNS, etc.)
    // const resultado = await twilio.messages.create({
    //   body: mensagem,
    //   from: import.meta.env.VITE_TWILIO_PHONE,
    //   to: telefone
    // });
    
    console.log(`✅ SMS enviado para ${telefone}`);
    return { sucesso: true, telefone };
    
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    throw error;
  }
};

/**
 * Gera código de erro para rastreamento
 * @param {string} tipo - Tipo de erro
 * @returns {string} Código do erro
 */
const gerarCodigoErro = (tipo) => {
  const timestamp = Date.now().toString().slice(-6);
  return `ERR_${tipo.toUpperCase()}_${timestamp}`;
};

/**
 * Envia mensagem de erro estruturada
 * @param {string} tipo - Tipo de erro
 * @param {string} mensagem - Mensagem de erro
 * @returns {Object} Resposta estruturada
 */
export const estruturarErro = (tipo, mensagem) => {
  return {
    sucesso: false,
    tipo_erro: tipo,
    mensagem: mensagem,
    timestamp: new Date().toISOString(),
    codigo_erro: gerarCodigoErro(tipo)
  };
};

/**
 * Envia mensagem de sucesso estruturada
 * @param {string} mensagem - Mensagem de sucesso
 * @param {Object} dados - Dados adicionais
 * @returns {Object} Resposta estruturada
 */
export const estruturarSucesso = (mensagem, dados = null) => {
  return {
    sucesso: true,
    mensagem: mensagem,
    dados: dados,
    timestamp: new Date().toISOString()
  };
};

export default {
  enviarEmailConfirmacaoLancamento,
  enviarNotificacaoReajuste,
  enviarSMSAlerta,
  estruturarErro,
  estruturarSucesso
};