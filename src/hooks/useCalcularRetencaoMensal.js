import { calcularRetencaoMensal } from '@/utils/calculos';

export const useCalcularRetencaoMensal = (postosTrabalhoDados) => {
  const calcular = () => {
    return calcularRetencaoMensal(postosTrabalhoDados);
  };
  
  return { calcular };
};