import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

// Função para normalizar valores monetários brasileiros
function normalizarValorMonetario(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    
    // Se já é número, retorna
    if (typeof valor === 'number') return valor;
    
    // Converte para string e remove espaços
    let valorStr = String(valor).trim();
    
    // Remove "R$", pontos (separadores de milhar) e substitui vírgula por ponto
    valorStr = valorStr
        .replace(/R\$\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const numero = parseFloat(valorStr);
    return isNaN(numero) ? null : numero;
}

// Função para processar datas do Excel
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    
    // Se já é uma string no formato ISO ou YYYY-MM-DD
    if (typeof excelDate === 'string' && excelDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return excelDate.split('T')[0];
    }
    
    // Se é timestamp do Excel (dias desde 1900-01-01)
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return null;
    }
    
    // Tentar interpretar como string de data
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    return null;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, contratoId } = await req.json();

        if (!fileUrl) {
            return Response.json({ error: 'fileUrl é obrigatório' }, { status: 400 });
        }

        // Baixar o arquivo
        const fileResponse = await fetch(fileUrl);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        // Normalizar chaves removendo espaços extras
        const normalizedData = rawData.map(row => {
            const cleanRow = {};
            for (const key in row) {
                const cleanKey = key.trim();
                cleanRow[cleanKey] = row[key];
            }
            return cleanRow;
        });

        // Buscar todos os contratos para mapear Vigência -> ID
        const contratos = await base44.asServiceRole.entities.Contrato.list();
        const contratoMap = {};
        contratos.forEach(c => {
            const key = c.numero ? c.numero.replace(/\s+/g, '').toLowerCase() : '';
            contratoMap[key] = c.id;
        });

        const lancamentosValidos = [];
        const erros = [];

        for (let i = 0; i < normalizedData.length; i++) {
            const row = normalizedData[i];
            const linha = i + 2;
            const errosLinha = [];

            try {
                // Mapear Vigência para contrato_id
                let contrato_id = contratoId;
                if (!contrato_id && row['Vigência']) {
                    const vigenciaKey = String(row['Vigência']).replace(/\s+/g, '').toLowerCase();
                    contrato_id = contratoMap[vigenciaKey];
                    if (!contrato_id) {
                        errosLinha.push(`Contrato não encontrado para vigência "${row['Vigência']}"`);
                    }
                }

                if (!contrato_id) {
                    errosLinha.push('contrato_id é obrigatório');
                }

                // Extrair ano e mês da Data de referência
                let ano = null;
                let mes = null;
                let data_lancamento = null;

                if (row['Data de referência']) {
                    data_lancamento = parseExcelDate(row['Data de referência']);
                    if (data_lancamento) {
                        const dataRef = new Date(data_lancamento);
                        ano = dataRef.getFullYear();
                        mes = dataRef.getMonth() + 1;
                    } else {
                        errosLinha.push('Data de referência inválida');
                    }
                }

                if (!ano) errosLinha.push('ano é obrigatório');
                if (!mes) errosLinha.push('mes é obrigatório');

                // Normalizar valores monetários
                const valor = normalizarValorMonetario(row['Valor NF']);
                if (valor === null || isNaN(valor)) {
                    errosLinha.push('Valor NF inválido ou ausente');
                }

                const retencao = normalizarValorMonetario(row['Retenção']) || 0;
                const glosa = normalizarValorMonetario(row['Glosa']) || 0;
                const valor_pago_final = valor - retencao - glosa;

                // Status - validar se está entre os aceitos
                const statusValidos = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];
                let status = row['Status'];
                if (status && !statusValidos.includes(status)) {
                    errosLinha.push(`Status "${status}" não é válido. Valores aceitos: ${statusValidos.join(', ')}`);
                }

                // Processar data NF
                let data_nf = null;
                if (row['Data de Emissão']) {
                    data_nf = parseExcelDate(row['Data de Emissão']);
                }

                // Processar data OS
                let os_data_emissao = null;
                if (row['Data da OS'] && row['Data da OS'] !== 'None') {
                    os_data_emissao = parseExcelDate(row['Data da OS']);
                }

                // Processar data execução OS
                let os_data_execucao = null;
                if (row['Data de Execução da OS'] && row['Data de Execução da OS'] !== 'None') {
                    os_data_execucao = parseExcelDate(row['Data de Execução da OS']);
                }

                // Converter números para string
                const numero_nf = row['Nº NF'] ? String(row['Nº NF']) : null;
                const os_numero = row['Ordem de serviços'] ? String(row['Ordem de serviços']) : null;

                // Se há erros, registrar e continuar
                if (errosLinha.length > 0) {
                    erros.push({
                        linha,
                        erros: errosLinha,
                        dados: row
                    });
                    continue;
                }

                // Montar objeto do lançamento
                const lancamento = {
                    contrato_id,
                    ano,
                    mes,
                    valor,
                    retencao,
                    glosa,
                    valor_pago_final,
                    status: status || 'Em instrução',
                    item_label: row['Natureza da despesa'] || null,
                    numero_nf,
                    data_nf,
                    processo_pagamento_sei: row['Processo SEI'] || null,
                    ordem_bancaria: row['Ordem bancária'] || null,
                    os_numero,
                    os_data_emissao,
                    os_data_execucao,
                    os_local: row['Local'] || null,
                    os_descricao: row['Descrição da OS'] || null,
                    os_valor: normalizarValorMonetario(row['Valor da OS']) || null,
                    data_lancamento,
                    observacoes: row['Observação'] || null
                };

                lancamentosValidos.push(lancamento);

            } catch (error) {
                erros.push({
                    linha,
                    erros: [`Erro ao processar linha: ${error.message}`],
                    dados: row
                });
            }
        }

        return Response.json({
            sucesso: true,
            totalLinhas: normalizedData.length,
            lancamentosValidos: lancamentosValidos.length,
            erros: erros.length,
            dados: lancamentosValidos,
            detalhesErros: erros
        });

    } catch (error) {
        console.error('Erro ao processar planilha:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});