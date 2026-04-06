import jwt from 'jsonwebtoken';
import { base44 } from '@/api/base44Client';

/**
 * Middleware para validar JWT token
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 */
export const validarToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token não fornecido'
      });
    }
    
    const decoded = jwt.verify(token, import.meta.env.VITE_JWT_SECRET || 'seu-secret-key');
    req.usuario = decoded;
    next();
    
  } catch (error) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware para validar role do usuário
 * @param {Array} rolesPermitidas - Array de roles permitidas
 */
export const validarRole = (rolesPermitidas) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não autenticado'
      });
    }
    
    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Acesso negado. Roles permitidas: ${rolesPermitidas.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar propriedade de recurso (RLS)
 * @param {string} entidade - Nome da entidade (ex: 'Contrato')
 * @param {string} campoUsuario - Campo que contém o ID do usuário
 */
export const validarPropriedade = (entidade, campoUsuario) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const usuarioId = req.usuario.id;
      
      // Buscar recurso no banco
      const recurso = await base44.entities[entidade].get(id);
      
      if (!recurso) {
        return res.status(404).json({
          sucesso: false,
          mensagem: `${entidade} não encontrado`
        });
      }
      
      // Verificar se usuário é proprietário ou admin
      if (recurso[campoUsuario] !== usuarioId && req.usuario.role !== 'admin' && req.usuario.role !== 'owner') {
        return res.status(403).json({
          sucesso: false,
          mensagem: 'Você não tem permissão para acessar este recurso'
        });
      }
      
      req.recurso = recurso;
      next();
      
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message
      });
    }
  };
};

export default {
  validarToken,
  validarRole,
  validarPropriedade
};