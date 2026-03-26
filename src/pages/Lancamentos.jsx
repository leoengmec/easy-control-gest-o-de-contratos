import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker para o funcionamento do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Lancamentos = () => {
  const [contratos, setContratos] = useState([]);
  const [contratoSelecionado, setContratoSelecionado] = useState('');
  const [itensContratoRef, setItensContratoRef] = useState([]);

  const [formData, setFormData] = useState({
    numero_nf: '',
    data_emissao: '',
    valor_total_nf: 0,
    numero_os: '',
    itens: []
  });

  const [itensMaterial, setItensMaterial] = useState([]);
  const [infoComplementares, setInfoComplementares] = useState('');

  const [checkboxes, setCheckboxes] = useState({
    mor_natal: false,
    mor_mossoro: false,
    fornecimento_material: false,
    servicos_deslocamento: false
  });

  const [valorPrevistoOS, setValorPrevistoOS] = useState(0);

  // --- CARGA DE DADOS REAIS ---

  useEffect(() => {
    // Ação: Busca real de contratos no Base44
    const carregarContratos = async () => {
      try {
        const resposta = await window.base44.entities.Contrato.list();
        setContratos(resposta || []);
      } catch (error) {
        console.error("Erro ao carregar contratos:", error);
      }
    };
    carregarContratos();
  }, []);

  useEffect(() => {
    // Ação: Busca real de itens vinculados ao contrato selecionado
    const carregarItensDoContrato = async () => {
      if (contratoSelecionado) {
        try {
          const resposta = await window.base44.entities.ItemContrato.list({
            where: { contrato_id: contratoSelecionado }
          });
          setItensContratoRef(resposta || []);
        } catch (error) {
          console.error("Erro ao carregar itens do contrato:", error);
        }
      }
    };
    carregarItensDoContrato();
  }, [contratoSelecionado]);

  // --- LÓGICA DE TRATAMENTO ---

  const formatarDataParaISO = (dataStr) => {
    // Converte DD/MM/YYYY para YYYY-MM-DD
    if (!dataStr || !dataStr.includes('/')) return null;
    const [dia, mes, ano] = dataStr.split('/');
    return `${ano}-${mes}-${dia}`;
  };

  const extrairValor = (texto) => {
    if (!texto) return 0;
    const match = texto.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
  };

  const handleExtrairNF = async () => {
    const fileInput = document.getElementById('nf-upload');
    const file = fileInput?.files[0];
    if (!file || !contratoSelecionado) {
      alert("Selecione o contrato e o arquivo da NF.");
      return;
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(s => s.str).join(" ") + "\n";
    }

    const txtUpper = fullText.toUpperCase();
    let itensIdentificados = [];
    let checks = { mor_natal: false, mor_mossoro: false, fornecimento_material: false, servicos_deslocamento: false };

    // Match dinâmico com itens reais do banco
    itensContratoRef.forEach(itemBD => {
      if (txtUpper.includes(itemBD.nome.toUpperCase())) {
        const valorItem = extrairValor(txtUpper.split(itemBD.nome.toUpperCase())[1]);
        itensIdentificados.push({
          descricao: itemBD.nome,
          valorTotal: valorItem,
          item_contrato_id: itemBD.id
        });

        if (itemBD.nome.includes("NATAL")) checks.mor_natal = true;
        if (itemBD.nome.includes("MOSSORÓ")) checks.mor_mossoro = true;
        if (itemBD.grupo_servico === "material") checks.fornecimento_material = true;
      }
    });

    const isNFe = txtUpper.includes("DANFE") || txtUpper.includes("NF-E");
    let numNf = "";
    let valorTotalNota = 0;
    let extraInfo = "";
    let extractedProducts = [];

    if (isNFe) {
      const nfMatch = fullText.match(/(?:N°\.\s?|Nº\s?)(\d{3}\.\d{3}\.\d{3}|\d+)/i);
      if (nfMatch) numNf = nfMatch[1];
      const valorMatch = fullText.match(/(?:VALOR TOTAL DA NOTA|VALOR TOTAL)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotalNota = extrairValor(valorMatch[1]);

      const infoMatch = fullText.match(/INFORMAÇÕES COMPLEMENTARES\s*([\s\S]*?)(?:RESERVADO AO FISCO|$)/i);
      if (infoMatch) extraInfo = infoMatch[1].trim();

      const productLines = fullText.matchAll(/([A-Z0-9\-\.\s]{3,})\s+(UN|CX|KG|M|L|PÇ|PC|PCT|CJ|RL)\s+(\d+(?:,\d{1,4})?)\s+(\d+(?:,\d{1,4})?)\s+(\d+(?:,\d{1,2})?)/gi);
      for (const match of productLines) {
        extractedProducts.push({
          id: Date.now() + Math.random(),
          descricao: match[1].trim(),
          unidade: match[2],
          quantidade: parseFloat(match[3].replace(',', '.')),
          valor_unitario: extrairValor(match[4]),
          valor_total: extrairValor(match[5])
        });
      }
    } else {
      const nfMatch = fullText.match(/Número da NFS-e[\s\S]*?(\d+)/i);
      if (nfMatch) numNf = nfMatch[1];
      const valorMatch = fullText.match(/(?:Valor do Serviço|VALOR TOTAL DA NFS-E)[\s\S]*?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotalNota = extrairValor(valorMatch[1]);
    }

    const dataMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const osMatch = fullText.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2}|\d{3}\.\d{4})/i);

    setCheckboxes(checks);
    setInfoComplementares(extraInfo);
    setItensMaterial(extractedProducts);
    setFormData(prev => ({
      ...prev,
      numero_nf: numNf || prev.numero_nf,
      data_emissao: dataMatch ? dataMatch[0] : prev.data_emissao,
      valor_total_nf: valorTotalNota || prev.valor_total_nf,
      numero_os: osMatch ? osMatch[1] : prev.numero_os,
      itens: itensIdentificados
    }));
  };

  const handleFileChange = async (event, tipoDoc) => {
    const file = event.target.files[0];
    if (!file || tipoDoc !== 'OS') return;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(s => s.str).join(" ") + "\n";
    }
    const vPrev = extrairValor(fullText.split("TOTAL")[1] || fullText);
    setValorPrevistoOS(vPrev);
    const osMatch = fullText.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2}|\d{3}\.\d{4})/i);
    setFormData(prev => ({ ...prev, numero_os: osMatch ? osMatch[1] : prev.numero_os }));
  };

  const validarESalvar = async () => {
    if (!contratoSelecionado) return alert("Selecione um contrato.");
    
    const diferenca = formData.valor_total_nf - valorPrevistoOS;
    if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
      if (!window.confirm(`Valor excede a OS em R$ ${diferenca.toLocaleString('pt-BR')}. Prosseguir?`)) return;
    }

    try {
      // 1. Criar Lançamento Financeiro
      const novoLancamento = await window.base44.entities.LancamentoFinanceiro.create({
        contrato_id: contratoSelecionado,
        numero_nf: formData.numero_nf,
        data_nf: formatarDataParaISO(formData.data_emissao),
        valor: formData.valor_total_nf,
        status: 'pendente'
      });

      // 2. Criar Itens vinculados APENAS para produtos da DANFE
      if (checkboxes.fornecimento_material) {
        for (const item of itensMaterial) {
          await window.base44.entities.ItemMaterialNF.create({
            lancamento_financeiro_id: novoLancamento.id,
            contrato_id: contratoSelecionado,
            numero_nf: formData.numero_nf,
            data_nf: formatarDataParaISO(formData.data_emissao),
            os_numero: formData.numero_os,
            descricao: item.descricao,
            unidade: item.unidade || 'UN',
            quantidade: item.quantidade || 1,
            valor_unitario: item.valor_unitario || item.valor_total,
            valor_total_item: item.valor_total,
            valor_total_nota: formData.valor_total_nf,
            observacoes: infoComplementares
          });
        }
      }

      alert("Lançamento realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Falha ao salvar lançamento no banco de dados.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold border-b pb-2">Fiscalização JFRN - Lançamento</h1>
      
      <div className="bg-white p-4 border rounded shadow-sm">
        <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Contrato Relacionado</label>
        <select 
          value={contratoSelecionado}
          onChange={(e) => setContratoSelecionado(e.target.value)}
          className="w-full border-b focus:border-blue-500 outline-none py-2 bg-transparent"
        >
          <option value="">Selecione um contrato...</option>
          {contratos.map(c => (
            <option key={c.id} value={c.id}>{c.numero_contrato || c.numero} - {c.empresa || c.contratada}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da OS (Previsão)</label>
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'OS')} className="w-full text-sm" />
        </div>
        <div className="p-4 border rounded shadow-sm bg-gray-50">
          <label className="block text-sm font-medium mb-2">Upload da NF (Execução)</label>
          <input id="nf-upload" type="file" accept=".pdf" className="w-full text-sm mb-2" />
          <button onClick={handleExtrairNF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-bold transition-colors">
            Importar PDF da NF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 border rounded">
        <div>
          <label className="block text-xs text-gray-500 uppercase">Número NF</label>
          <input type="text" value={formData.numero_nf} onChange={(e) => setFormData({...formData, numero_nf: e.target.value})} className="w-full border-b outline-none py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">Data Emissão</label>
          <input type="text" value={formData.data_emissao} onChange={(e) => setFormData({...formData, data_emissao: e.target.value})} className="w-full border-b outline-none py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">OS Vinculada</label>
          <input type="text" value={formData.numero_os} onChange={(e) => setFormData({...formData, numero_os: e.target.value})} className="w-full border-b outline-none py-1" />
        </div>
      </div>

      <div className="bg-white p-4 border rounded">
        <label className="block text-xs text-gray-500 uppercase mb-3">Itens Identificados Automaticamente (Via Contrato)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['mor_natal', 'mor_mossoro', 'fornecimento_material', 'servicos_deslocamento'].map(key => (
            <label key={key} className="flex items-center space-x-2 text-sm opacity-80">
              <input type="checkbox" checked={checkboxes[key]} readOnly className="rounded text-blue-600" />
              <span className="capitalize">{key.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border rounded overflow-hidden">
        <div className="bg-gray-50 p-2 border-b font-bold text-sm text-gray-700">Lançamentos Financeiros (Serviços e Materiais)</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-b">Descrição (Item do Contrato)</th>
              <th className="p-2 border-b text-right">Valor Extraído</th>
            </tr>
          </thead>
          <tbody>
            {formData.itens.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-2 border-b font-medium">{item.descricao}</td>
                <td className="p-2 border-b text-right">R$ {item.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
              </tr>
            ))}
            {formData.itens.length === 0 && (
              <tr><td colSpan="2" className="p-4 text-center text-gray-400">Nenhum item financeiro identificado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {checkboxes.fornecimento_material && (
        <div className="bg-white p-4 border rounded shadow-sm">
          <h2 className="text-sm font-bold text-[#1a2e4a] uppercase border-b pb-2 mb-4">Lançamento de DANFE (Produtos)</h2>
          
          <div className="mb-4">
            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Informações Complementares (NF-e)</label>
            <textarea 
              value={infoComplementares} 
              onChange={e => setInfoComplementares(e.target.value)}
              className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500 h-20"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border-b">Descrição</th>
                  <th className="p-2 border-b">UN</th>
                  <th className="p-2 border-b text-right">QTD</th>
                  <th className="p-2 border-b text-right">V. Unit</th>
                  <th className="p-2 border-b text-right">V. Total</th>
                  <th className="p-2 border-b text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensMaterial.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-2 border-b"><input className="w-full border-b outline-none bg-transparent" value={item.descricao} onChange={e => { const newItens = [...itensMaterial]; newItens[index].descricao = e.target.value; setItensMaterial(newItens); }} /></td>
                    <td className="p-2 border-b"><input className="w-16 border-b outline-none bg-transparent" value={item.unidade} onChange={e => { const newItens = [...itensMaterial]; newItens[index].unidade = e.target.value; setItensMaterial(newItens); }} /></td>
                    <td className="p-2 border-b text-right"><input type="number" className="w-20 border-b outline-none bg-transparent text-right" value={item.quantidade} onChange={e => { const newItens = [...itensMaterial]; newItens[index].quantidade = Number(e.target.value); setItensMaterial(newItens); }} /></td>
                    <td className="p-2 border-b text-right"><input type="number" className="w-24 border-b outline-none bg-transparent text-right" value={item.valor_unitario} onChange={e => { const newItens = [...itensMaterial]; newItens[index].valor_unitario = Number(e.target.value); setItensMaterial(newItens); }} /></td>
                    <td className="p-2 border-b text-right"><input type="number" className="w-24 border-b outline-none bg-transparent text-right" value={item.valor_total} onChange={e => { const newItens = [...itensMaterial]; newItens[index].valor_total = Number(e.target.value); setItensMaterial(newItens); }} /></td>
                    <td className="p-2 border-b text-center">
                      <button onClick={() => setItensMaterial(itensMaterial.filter(i => i.id !== item.id))} className="text-red-500 hover:text-red-700 font-bold text-xs">Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button onClick={() => setItensMaterial([...itensMaterial, { id: Date.now(), descricao: '', unidade: 'UN', quantidade: 1, valor_unitario: 0, valor_total: 0 }])} className="text-xs font-bold text-blue-600 hover:text-blue-800">
              + Adicionar Produto
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded border border-blue-100">
        <div>
          <p className="text-xs text-blue-700 uppercase font-bold">Resumo Financeiro</p>
          <p className="text-lg font-bold">Total NF: R$ {formData.valor_total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <button onClick={validarESalvar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow">
          Confirmar Lançamento
        </button>
      </div>
    </div>
  );
};

export default Lancamentos;