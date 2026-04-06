import { calcularReajuste } from '@/utils/calculos';

export const useCalcularReajuste = (valorAnterior, percentualReajuste, tipo = 'generico') => {
  const calcular = () => {
    return calcularReajuste(valorAnterior, percentualReajuste, tipo);
  };
  
  return { calcular };
};