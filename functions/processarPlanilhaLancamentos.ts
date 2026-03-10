import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

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

        // Buscar todos os contratos para mapear Vigência -> ID
        const contratos = await base44.asServiceRole.entities.Contrato.list();
        const contratoMap = {};
        contratos.forEach(c => {
            // Criar chave de busca a partir do número do contrato
            const key = c.numero ? c.numero.replace(/\s+/g, '').toLowerCase() : '';
            contratoMap[key] = c.id;
        });

        const lancamentosValidos = [];
        const erros = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const linha = i + 2; // +2 porque Excel começa em 1 e tem header
            const errosLinha = [];

            try {
                // Mapear Vigência para contrato_id
                let contrato_id = contratoId; // Se foi fornecido um contratoId específico
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
                    const dataRef = new Date(row['Data de referência']);
                    if (!isNaN(dataRef.getTime())) {
                        ano = dataRef.getFullYear();
                        mes = dataRef.getMonth() + 1;
                        data_lancamento = dataRef.toISOString().split('T')[0];
                    } else {
                        errosLinha.push('Data de referência inválida');
                    }
                }

                if (!ano) errosLinha.push('ano é obrigatório');
                if (!mes) errosLinha.push('mes é obrigatório');

                // Valor
                const valor = parseFloat(row['Valor NF']);
                if (isNaN(valor)) {
                    errosLinha.push('Valor NF inválido ou ausente');
                }

                // Status - validar se está entre os aceitos
                const statusValidos = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];
                let status = row['Status'];
                if (status && !statusValidos.includes(status)) {
                    errosLinha.push(`Status "${status}" não é válido. Valores aceitos: ${statusValidos.join(', ')}`);
                }

                // Processar data NF
                let data_nf = null;
                if (row['Data de Emissão']) {
                    const dataNF = new Date(row['Data de Emissão']);
                    if (!isNaN(dataNF.getTime())) {
                        data_nf = dataNF.toISOString().split('T')[0];
                    }
                }

                // Processar data OS
                let os_data = null;
                if (row['Data da OS'] && row['Data da OS'] !== 'None') {
                    const dataOS = new Date(row['Data da OS']);
                    if (!isNaN(dataOS.getTime())) {
                        os_data = dataOS.toISOString().split('T')[0];
                    }
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
                    status: status || 'Em instrução',
                    item_label: row['Natureza da despesa'] || null,
                    numero_nf,
                    data_nf,
                    processo_pagamento_sei: row['Processo SEI'] || null,
                    ordem_bancaria: row['Ordem bancária'] || null,
                    os_numero,
                    os_data,
                    os_local: row['Local'] || null,
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
            totalLinhas: rawData.length,
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