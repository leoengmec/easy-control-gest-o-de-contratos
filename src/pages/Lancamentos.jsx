import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  // --- ESTADOS DE CONTROLE ---
  const [contratos, setContratos] = useState([]);
  const [contratoSelecionado, setContratoSelecionado] = useState('');
  const [itensContratoRef, setItensContratoRef] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: 2026,
    status: 'Em Instrução',
    processo_sei: '',
    ordem_bancaria: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    observacoes: '',
    valor_total_nf: 0,
    nfs: [], // Suporte a múltiplas NFs
    oss: []  // Suporte a múltiplas OSs
  });

  const [checkboxes, setCheckboxes] = useState({});

  // --- 1. CONEXÃO RESILIENTE COM SDK BASE44 ---
  useEffect(() => {
    let tentativas = 0;
    const buscarContratos = async () => {
      const sdk = window.base44 || window.base;
      if (sdk?.entities) {
        try {
          const lista = await sdk.entities.Contrato.list();
          setContratos(lista || []);
          setLoading(false);
        } catch (e) { console.error("Erro ao listar contratos:", e); }
      } else if (tentativas < 15) {
        tentativas++;
        setTimeout(buscarContratos, 1000);
      } else {
        setLoading(false);
      }
    };
    buscarContratos();
  }, []);

  // --- 2. CARGA DINÂMICA DE ITENS ---
  useEffect(() => {
    if (contratoSelecionado) {
      const sdk = window.base44 || window.base;
      sdk.entities.ItemContrato.list({ where: { contrato_id: contratoSelecionado } })
        .then(res => {
          setItensContratoRef(res || []);
          const initialChecks = {};
          res?.forEach(item => initialChecks[item.nome] = false);
          setCheckboxes(initialChecks);
        });
    }
  }, [contratoSelecionado]);

  // --- 3. LÓGICA DE CÁLCULO FINANCEIRO ---
  const calcularValorFinal = (valor, retencao, glosa) => {
    const v = parseFloat(valor) || 0;
    const r = parseFloat(retencao) || 0;
    const g = parseFloat(glosa) || 0;
    return v - g - (v * (r / 100));
  };

  // --- 4. PERSISTÊNCIA SELETIVA (REGRA DE NEGÓCIO) ---
  const formatarDataISO = (d) => d ? new Date(d.split('/').reverse().join('-')).toISOString() : null;

  const handleEnviar = async () => {
    const sdk = window.base44 || window.base;
    if (!contratoSelecionado) return alert("Selecione um contrato.");
    
    setIsSaving(true);
    try {
      // Cria o Lançamento Financeiro Principal (Sempre ocorre)
      const lancamento = await sdk.entities.LancamentoFinanceiro.create({
        contrato_id: contratoSelecionado,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        status: formData.status,
        valor: formData.valor_total_nf,
        processo_pagamento_sei: formData.processo_sei,
        ordem_bancaria: formData.ordem_bancaria,
        observacoes: formData.observacoes,
        data_lancamento: new Date().toISOString()
      });

      // REGRA: Só salva em ItemMaterialNF se 'FORNECIMENTO DE MATERIAL' estiver marcado
      if (checkboxes['FORNECIMENTO DE MATERIAL']) {
        for (const nf of formData.nfs) {
          for (const item of nf.itensExtraidos) {
            await sdk.entities.ItemMaterialNF.create({
              lancamento_financeiro_id: lancamento.id,
              contrato_id: contratoSelecionado,
              numero_nf: nf.numero,
              data_nf: formatarDataISO(nf.data),
              descricao: item.descricao,
              unidade: item.unidade,
              quantidade: item.quantidade,
              valor_unitario: item.valorUnit,
              valor_total_item: item.valorTotal,
              observacoes: nf.infoComplementar // Dados das Informações Complementares
            });
          }
        }
      }

      alert("Lançamento enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Falha no envio. Verifique a conexão e os campos.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 font-medium italic">Conectando ao banco de dados JFRN...</p>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-white min-h-screen border shadow-xl my-10 rounded-lg">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-4">Novo Lançamento</h1>

      {/* CABEÇALHO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contrato *</label>
          <select 
            className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 bg-transparent"
            value={contratoSelecionado}
            onChange={(e) => setContratoSelecionado(e.target.value)}
          >
            <option value="">Selecione o contrato...</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>{c.numero_contrato || c.numero} - {c.empresa || c.contratada}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mês de Referência</label>
          <select className="w-full border-b border-gray-200 py-2 outline-none" value={formData.mes} onChange={e => setFormData({...formData, mes: e.target.value})}>
            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
          <select className="w-full border-b border-gray-200 py-2 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option>Em Instrução</option>
            <option>Pago</option>
            <option>SOF</option>
            <option>Suspenso</option>
          </select>
        </div>
      </div>

      {/* ITENS DO CONTRATO */}
      <div className="space-y-4">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Itens do Contrato (Selecione um ou mais)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 p-4 bg-gray-50 rounded">
          {itensContratoRef.map(item => (
            <label key={item.id} className="flex items-center space-x-3 text-sm cursor-pointer group">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-blue-600 focus:ring-0"
                checked={!!checkboxes[item.nome]}
                onChange={(e) => setCheckboxes({...checkboxes, [item.nome]: e.target.checked})}
              />
              <span className="group-hover:text-blue-600 transition-colors">{item.nome}</span>
            </label>
          ))}
        </div>
      </div>

      {/* RODAPÉ FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Processo de Pagamento SEI</label>
            <input type="text" placeholder="Nº do processo SEI" className="w-full border-b border-gray-200 py-2 outline-none" value={formData.processo_sei} onChange={e => setFormData({...formData, processo_sei: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Observações</label>
            <textarea className="w-full border-b border-gray-200 py-2 outline-none h-20 resize-none" placeholder="Observações..." value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ordem Bancária</label>
            <input type="text" placeholder="Nº da ordem bancária" className="w-full border-b border-gray-200 py-2 outline-none" value={formData.ordem_bancaria} onChange={e => setFormData({...formData, ordem_bancaria: e.target.value})} />
          </div>
        </div>
      </div>

      {/* BOTÕES FINAIS */}
      <div className="flex justify-end items-center space-x-6 pt-10">
        <button className="text-sm font-bold text-gray-400 hover:text-red-500 uppercase transition-colors">Cancelar</button>
        <button 
          onClick={handleEnviar}
          disabled={isSaving}
          className={`${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-12 py-3 rounded text-sm font-bold shadow-lg uppercase tracking-widest transition-all`}
        >
          {isSaving ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
};

export default Lancamentos;