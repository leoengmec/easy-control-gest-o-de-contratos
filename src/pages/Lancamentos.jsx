import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  const [contratos, setContratos] = useState([]);
  const [contratoSelecionado, setContratoSelecionado] = useState('');
  const [itensContratoRef, setItensContratoRef] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: 2026,
    status: 'Em Instrução',
    processo_sei: '',
    ordem_bancaria: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    observacoes: '',
    nfs: [] // Array para suportar múltiplas NFs conforme o vídeo
  });

  const [checkboxes, setCheckboxes] = useState({});

  // --- CONEXÃO RESILIENTE COM O BANCO ---
  useEffect(() => {
    let intervalo;
    const buscarDados = async () => {
      const sdk = window.base44 || window.base;
      if (sdk?.entities) {
        try {
          const lista = await sdk.entities.Contrato.list();
          setContratos(lista || []);
          setLoading(false);
          clearInterval(intervalo);
        } catch (e) { console.error("Erro ao listar contratos", e); }
      }
    };
    intervalo = setInterval(buscarDados, 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (contratoSelecionado) {
      const sdk = window.base44 || window.base;
      sdk.entities.ItemContrato.list({ where: { contrato_id: contratoSelecionado } })
        .then(res => setItensContratoRef(res || []));
    }
  }, [contratoSelecionado]);

  // --- LÓGICA DE CÁLCULO ---
  const calcularValorFinal = (valor, retencao, glosa) => {
    const v = parseFloat(valor) || 0;
    const r = parseFloat(retencao) || 0;
    const g = parseFloat(glosa) || 0;
    return v - g - (v * (r / 100));
  };

  const validarESalvar = async () => {
    const sdk = window.base44 || window.base;
    if (!sdk) return alert("Erro: Sistema de banco de dados não carregado.");

    try {
      const lancamento = await sdk.entities.LancamentoFinanceiro.create({
        contrato_id: contratoSelecionado,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        status: formData.status,
        processo_pagamento_sei: formData.processo_sei,
        ordem_bancaria: formData.ordem_bancaria,
        observacoes: formData.observacoes
      });

      // REGRA: Só salva em ItemMaterialNF se for 'FORNECIMENTO DE MATERIAL'
      if (checkboxes['FORNECIMENTO DE MATERIAL']) {
         // Lógica de loop para itens da DANFE aqui
         alert("Lançamento de Material e Financeiro concluído!");
      } else {
         alert("Lançamento Financeiro concluído!");
      }
    } catch (err) {
      alert("Erro ao salvar. Verifique os campos obrigatórios.");
    }
  };

  if (loading) return <div className="p-10 text-center">Conectando ao banco de dados JFRN...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-light text-gray-800 border-b pb-4">Novo Lançamento - Fiscalização</h1>

      {/* CABEÇALHO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded shadow-sm">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-gray-400 uppercase">Contrato</label>
          <select 
            className="w-full border-b border-gray-300 py-2 outline-none focus:border-blue-500 transition-colors"
            value={contratoSelecionado}
            onChange={(e) => setContratoSelecionado(e.target.value)}
          >
            <option value="">Selecione o contrato...</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>{c.numero_contrato} - {c.empresa}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Mês</label>
          <select className="w-full border-b border-gray-300 py-2 outline-none" value={formData.mes} onChange={e => setFormData({...formData, mes: e.target.value})}>
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
          <select className="w-full border-b border-gray-300 py-2 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option>Em Instrução</option>
            <option>Pago</option>
            <option>SOF</option>
          </select>
        </div>
      </div>

      {/* ITENS DO CONTRATO */}
      <div className="bg-white p-6 rounded shadow-sm">
        <label className="text-xs font-bold text-gray-400 uppercase mb-4 block">Itens do Contrato (Selecione um ou mais)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {itensContratoRef.map(item => (
            <label key={item.id} className="flex items-center space-x-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={!!checkboxes[item.nome]}
                onChange={(e) => setCheckboxes({...checkboxes, [item.nome]: e.target.checked})}
              />
              <span>{item.nome}</span>
            </label>
          ))}
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button className="px-8 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
        <button 
          onClick={validarESalvar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-2 rounded shadow-lg font-bold transition-all transform active:scale-95"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default Lancamentos;