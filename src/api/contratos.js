import { calcularRetencaoContaVinculada } from '@/functions/calcularRetencaoContaVinculada';
import { criarReajusteMOR } from '@/functions/criarReajusteMOR';
import { criarReajusteManual } from '@/functions/criarReajusteManual';
import { aprovarReajuste } from '@/functions/aprovarReajuste';

// POST /api/contratos/:id/retencao
export const calcularRetencaoAPI = async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { mes, ano } = req.body;
    
    const resultado = await calcularRetencaoContaVinculada(contratoId, mes, ano);
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Retenção calculada com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// POST /api/contratos/:id/reajuste-mor
export const criarReajusteMORAPI = async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { convencaoId } = req.body;
    
    const resultado = await criarReajusteMOR(contratoId, convencaoId);
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Reajuste MOR criado com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// POST /api/contratos/:id/reajuste-manual
export const criarReajusteManualAPI = async (req, res) => {
  try {
    const { contratoId } = req.params;
    const { tipoServico, indiceAplicado, percentualReajuste, justificativa, userId } = req.body;
    
    const resultado = await criarReajusteManual(
      contratoId,
      tipoServico,
      indiceAplicado,
      percentualReajuste,
      justificativa,
      userId
    );
    
    res.status(201).json({
      sucesso: true,
      mensagem: 'Reajuste manual criado com sucesso',
      dados: resultado
    });
  } catch (error) {
    res.status(400).json({
      sucesso: false,
      mensagem: error.message
    });
  }
};

// POST /api/contratos/:id/aprovar-reajuste
export const aprovarReajusteAPI = async (req, res) => {
  try {
    const { reajusteId } = req.params;
    const { userId, userRole } = req.body;
    
    const resultado = await aprovarReajuste(reajusteId, userId, userRole);
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'Reajuste aprovado com sucesso',
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
  calcularRetencaoAPI,
  criarReajusteMORAPI,
  criarReajusteManualAPI,
  aprovarReajusteAPI
};