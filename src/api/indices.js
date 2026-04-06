import { buscarINCCAtual, buscarIPCAAtual, buscarSINAPIAtual, buscarHistoricoIndices, salvarIndiceHistorico } from '@/services/indices';

// GET /api/indices/incc
export const buscarINCCAPI = async (req, res) => {
  try {
    const resultado = await buscarINCCAtual();
    
    // Salvar no histórico
    await salvarIndiceHistorico('INCC', resultado.valor, resultado.data);
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'INCC obtido com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// GET /api/indices/ipca
export const buscarIPCAAPI = async (req, res) => {
  try {
    const resultado = await buscarIPCAAtual();
    
    // Salvar no histórico
    await salvarIndiceHistorico('IPCA', resultado.valor, resultado.data);
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'IPCA obtido com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// GET /api/indices/sinapi/:codigo
export const buscarSINAPIAPI = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    if (!codigo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Código SINAPI é obrigatório'
      });
    }
    
    const resultado = await buscarSINAPIAtual(codigo);
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'SINAPI obtido com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// GET /api/indices/historico/:tipo
export const buscarHistoricoAPI = async (req, res) => {
  try {
    const { tipo } = req.params;
    const { meses = 12 } = req.query;
    
    if (!tipo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Tipo de índice é obrigatório'
      });
    }
    
    const resultado = await buscarHistoricoIndices(tipo, parseInt(meses));
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'Histórico obtido com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

export default {
  buscarINCCAPI,
  buscarIPCAAPI,
  buscarSINAPIAPI,
  buscarHistoricoAPI
};