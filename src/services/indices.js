import { base44 } from '@/api/base44Client';

/**
 * Busca o INCC (Índice Nacional de Custo da Construção) atual
 * @returns {Object} { valor, data, percentual_mensal, percentual_anual }
 */
export const buscarINCCAtual = async () => {
  try {
    // Opção 1: API do IBGE (gratuita)
    const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json');
    
    if (!response.ok) {
      throw new Error('Erro ao buscar INCC do IBGE');
    }
    
    const dados = await response.json();
    const ultimoDado = dados[0];
    
    return {
      indice: 'INCC',
      valor: parseFloat(ultimoDado.valor),
      data: ultimoDado.data,
      percentual_mensal: parseFloat(ultimoDado.valor),
      percentual_anual: null, // Será calculado com histórico
      fonte: 'IBGE',
      data_consulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao buscar INCC:', error);
    throw new Error(`Erro ao buscar INCC: ${error.message}`);
  }
};

/**
 * Busca o IPCA (Índice de Preços ao Consumidor Amplo) atual
 * @returns {Object} { valor, data, percentual_mensal, percentual_anual }
 */
export const buscarIPCAAtual = async () => {
  try {
    // API do IBGE para IPCA
    const response = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json');
    
    if (!response.ok) {
      throw new Error('Erro ao buscar IPCA do IBGE');
    }
    
    const dados = await response.json();
    const ultimoDado = dados[0];
    
    return {
      indice: 'IPCA',
      valor: parseFloat(ultimoDado.valor),
      data: ultimoDado.data,
      percentual_mensal: parseFloat(ultimoDado.valor),
      percentual_anual: null,
      fonte: 'IBGE',
      data_consulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao buscar IPCA:', error);
    throw new Error(`Erro ao buscar IPCA: ${error.message}`);
  }
};

/**
 * Busca dados do SINAPI (Sistema Nacional de Pesquisa de Custos)
 * @param {string} codigo - Código do serviço/material SINAPI
 * @returns {Object} { codigo, descricao, valor, data }
 */
export const buscarSINAPIAtual = async (codigo) => {
  try {
    // SINAPI é mantido pelo IBGE
    // Para produção, você precisará de uma chave de API ou integração específica
    // Esta é uma implementação simplificada
    
    const response = await fetch(`https://www.ibge.gov.br/api/sinapi/v1/precos/${codigo}`);
    
    if (!response.ok) {
      throw new Error(`Código SINAPI ${codigo} não encontrado`);
    }
    
    const dados = await response.json();
    
    return {
      codigo: codigo,
      descricao: dados.descricao || 'Serviço/Material SINAPI',
      valor: parseFloat(dados.valor),
      data: dados.data,
      unidade: dados.unidade || 'UN',
      fonte: 'SINAPI',
      data_consulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao buscar SINAPI:', error);
    throw new Error(`Erro ao buscar SINAPI: ${error.message}`);
  }
};

/**
 * Busca histórico de índices para cálculo de reajuste anual
 * @param {string} indice - Tipo de índice (INCC, IPCA, SINAPI)
 * @param {number} meses - Número de meses para histórico (default: 12)
 * @returns {Array} Array com histórico de índices
 */
export const buscarHistoricoIndices = async (indice, meses = 12) => {
  try {
    // Buscar histórico dos últimos N meses
    const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/${meses}?formato=json`);
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar histórico de ${indice}`);
    }
    
    const dados = await response.json();
    
    // Calcular percentual acumulado
    const primeiroValor = parseFloat(dados[dados.length - 1].valor);
    const ultimoValor = parseFloat(dados[0].valor);
    const percentualAcumulado = ((ultimoValor - primeiroValor) / primeiroValor) * 100;
    
    return {
      indice: indice,
      historico: dados.map(d => ({
        data: d.data,
        valor: parseFloat(d.valor)
      })),
      percentual_acumulado: parseFloat(percentualAcumulado.toFixed(2)),
      periodo_meses: meses,
      fonte: 'IBGE',
      data_consulta: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw new Error(`Erro ao buscar histórico: ${error.message}`);
  }
};

/**
 * Salva índice no banco de dados para auditoria
 * @param {string} indice - Tipo de índice
 * @param {number} valor - Valor do índice
 * @param {string} data - Data do índice
 */
export const salvarIndiceHistorico = async (indice, valor, data) => {
  try {
    // Criar entidade IndiceHistorico no Base44
    const historicoIndice = await base44.entities.IndiceHistorico.create({
      tipo_indice: indice,
      valor: parseFloat(valor),
      data_indice: data,
      data_consulta: new Date().toISOString(),
      fonte: 'IBGE'
    });
    
    return historicoIndice;
  } catch (error) {
    console.error('Erro ao salvar índice histórico:', error);
    throw error;
  }
};

export default {
  buscarINCCAtual,
  buscarIPCAAtual,
  buscarSINAPIAtual,
  buscarHistoricoIndices,
  salvarIndiceHistorico
};