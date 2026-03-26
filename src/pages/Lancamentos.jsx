import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

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

  const [checkboxes, setCheckboxes] = useState({
    mor_natal: false,
    mor_mossoro: false,
    fornecimento_material: false,
    servicos_deslocamento: false
  });

  const [valorPrevistoOS, setValorPrevistoOS] = useState(0);

  // Carga de contratos (Simulado/Base44)
  useEffect(() => {
    setContratos([{ id: '1', numero: '024/2025', empresa: 'Empresa A' }]);
  }, []);

  // Busca itens do contrato no BD (Simulado/Base44)
  useEffect(() => {
    if (contratoSelecionado) {
      // Simulação de dados vindo do banco conforme o schema ItemContrato que você enviou
      const mockItensBanco = [
        { id: '101', nome: 'ENGENHEIRO DE CAMPO NATAL', grupo_servico: 'fixo' },
        { id: '102', nome: 'AUXILIAR TÉCNICO MOSSORÓ', grupo_servico: 'fixo' },
        { id: '103', nome: 'FORNECIMENTO DE MATERIAL', grupo_servico: 'material' }
      ];
      setItensContratoRef(mockItensBanco);
    }
  }, [contratoSelecionado]);

  const extrairValor = (texto) => {
    if (!texto) return 0;
    const match = texto.match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : 0;
  };

  const handleExtrairNF = async () => {
    const fileInput = document.getElementById('nf-upload');
    const file = fileInput?.files[0];
    if (!file) {
      alert("Por favor, selecione um arquivo de NF primeiro.");
      return;
    }
    if (!contratoSelecionado) {
      alert("Selecione o contrato antes de importar a NF para validação dos itens.");
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
    
    // --- LÓGICA DINÂMICA (SPRINT 1 - AÇÃO 2) ---
    
    let itensIdentificados = [];
    let checksEncontrados = { ...checkboxes };

    // Percorre os itens que vieram do Banco de Dados para este contrato
    itensContratoRef.forEach(itemBD => {
      if (txtUpper.includes(itemBD.nome.toUpperCase())) {
        // Se achou o nome do item no PDF, tenta capturar o valor na mesma linha ou contexto
        // Aqui estamos usando uma lógica simplificada de captura de valor para o item
        const valorItem = extrairValor(txtUpper.split(itemBD.nome.toUpperCase())[1]);
        
        itensIdentificados.push({
          descricao: itemBD.nome,
          valorTotal: valorItem,
          item_contrato_id: itemBD.id
        });

        // Atualiza os checkboxes de interface baseados nos itens do banco
        if (itemBD.nome.includes("NATAL")) checksEncontrados.mor_natal = true;
        if (itemBD.nome.includes("MOSSORÓ")) checksEncontrados.mor_mossoro = true;
        if (itemBD.grupo_servico === "material") checksEncontrados.fornecimento_material = true;
      }
    });

    // Extração de metadados (NF, Data, OS) mantida
    const isNFe = txtUpper.includes("DANFE") || txtUpper.includes("NF-E");
    let numNf = "";
    let valorTotalNota = 0;

    if (isNFe) {
      const nfMatch = fullText.match(/(?:N°\.\s?)(\d{3}\.\d{3}\.\d{3})/i);
      if (nfMatch) numNf = nfMatch[1];
      const valorMatch = fullText.match(/(?:VALOR TOTAL DA NOTA|VALOR TOTAL)\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotalNota = extrairValor(valorMatch[1]);
    } else {
      const nfMatch = fullText.match(/Número da NFS-e[\s\S]*?(\d+)/i);
      if (nfMatch) numNf = nfMatch[1];
      const valorMatch = fullText.match(/(?:Valor do Serviço|VALOR TOTAL DA NFS-E)[\s\S]*?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i);
      if (valorMatch) valorTotalNota = extrairValor(valorMatch[1]);
    }

    const dataMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const osMatch = fullText.match(/(\d{3}[\.\/]\d{4}-[A-Z]{2}|\d{3}\.\d{4})/i);

    setCheckboxes(checksEncontrados);
    setFormData(prev => ({
      ...prev,
      numero_nf: numNf || prev.numero_nf,
      data_emissao: dataMatch ? dataMatch[0] : prev.data_emissao,
      valor_total_nf: valorTotalNota || prev.valor_total_nf,
      numero_os: osMatch ? osMatch[1] : prev.numero_os,
      itens: itensIdentificados // Agora preenche a tabela com itens reais do contrato
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

  const validarESalvar = () => {
    if (!contratoSelecionado) {
      alert("Selecione um contrato antes de confirmar o lançamento.");
      return;
    }
    const diferenca = formData.valor_total_nf - valorPrevistoOS;
    if (formData.valor_total_nf > valorPrevistoOS && valorPrevistoOS > 0) {
      const msg = `Atenção: O valor desta NF excede a OS em R$ ${diferenca.toLocaleString('pt-BR')}. Deseja prosseguir?`;
      if (!window.confirm(msg)) return;
    }
    console.log("Salvando Payload Maduro:", { ...formData, contrato_id: contratoSelecionado });
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
            <option key={c.id} value={c.id}>{c.numero} - {c.empresa}</option>
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
          <input 
            type="text"
            value={formData.numero_nf}
            onChange={(e) => setFormData({...formData, numero_nf: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">Data Emissão</label>
          <input 
            type="text"
            value={formData.data_emissao}
            onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase">OS Vinculada</label>
          <input 
            type="text"
            value={formData.numero_os}
            onChange={(e) => setFormData({...formData, numero_os: e.target.value})}
            className="w-full border-b focus:border-blue-500 outline-none py-1"
          />
        </div>
      </div>

      {/* OS Checkboxes permanecem como indicadores visuais, mas agora são alimentados pela lógica do banco */}
      <div className="bg-white p-4 border rounded">
        <label className="block text-xs text-gray-500 uppercase mb-3">Itens Identificados Automaticamente (Via Contrato)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-2 text-sm cursor-pointer opacity-80">
            <input type="checkbox" checked={checkboxes.mor_natal} readOnly className="rounded text-blue-600" />
            <span>MOR Natal</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer opacity-80">
            <input type="checkbox" checked={checkboxes.mor_mossoro} readOnly className="rounded text-blue-600" />
            <span>MOR Mossoró</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer opacity-80">
            <input type="checkbox" checked={checkboxes.fornecimento_material} readOnly className="rounded text-blue-600" />
            <span>Material</span>
          </label>
          <label className="flex items-center space-x-2 text-sm cursor-pointer opacity-80">
            <input type="checkbox" checked={checkboxes.servicos_deslocamento} readOnly className="rounded text-blue-600" />
            <span>Deslocamento</span>
          </label>
        </div>
      </div>

      <div className="border rounded overflow-hidden">
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
              <tr><td colSpan="2" className="p-4 text-center text-gray-400">Nenhum item do contrato identificado no PDF.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded border border-blue-100">
        <div>
          <p className="text-xs text-blue-700 uppercase font-bold">Resumo Financeiro</p>
          <p className="text-lg font-bold">Total NF: R$ {formData.valor_total_nf.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <button 
          onClick={validarESalvar}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow"
        >
          Confirmar Lançamento
        </button>
      </div>
    </div>
  );
};

export default Lancamentos;