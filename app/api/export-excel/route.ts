import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import XlsxPopulate from 'xlsx-populate';

export async function POST(req: Request) {
  try {
    const { todasDiarias, metodoSelecionado } = await req.json();
    
    // 1. Caminhos e Verificação
    const nomeArquivoModelo = metodoSelecionado === 'SEI' ? 'modelo_sei.xlsx' : 'modelo_salario.xlsx';
    const templatePath = path.join(process.cwd(), 'public', nomeArquivoModelo);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Modelo '${nomeArquivoModelo}' não encontrado na pasta public.`);
    }

    // 2. Carrega Workbook
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(0);

    // --- FORÇANDO LARGURA DAS COLUNAS (Para evitar textos vazando) ---
    if (metodoSelecionado === 'SEI') {
        sheet.column("A").width(6);   // Nº
        sheet.column("B").width(35);  // SERVIDORES
        sheet.column("C").width(16);  // DATA
        sheet.column("D").width(45);  // ADOLESCENTE (Bem larga)
        sheet.column("E").width(25);  // DESTINO
        sheet.column("F").width(25);  // PROCESSO
        sheet.column("G").width(45);  // OBSERVAÇÃO (Bem larga)
        sheet.column("H").width(15);  // STATUS
    } else {
        sheet.column("A").width(6);   
        sheet.column("B").width(38);  
        sheet.column("C").width(28);  
        sheet.column("D").width(16);  
        sheet.column("E").width(45);  
        sheet.column("F").width(20);  
        sheet.column("G").width(28);  
        sheet.column("H").width(14);  
        sheet.column("I").width(18);  
    }

    const colunas = metodoSelecionado === 'SEI' 
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] 
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    // 3. Limpa O MÁXIMO POSSÍVEL para evitar que textos ou assinaturas fixas fiquem no caminho
    for (let r = 10; r <= 1500; r++) {
        const linha = sheet.row(r);
        linha.hidden(true); // Oculta TUDO
        
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(c => {
            const cell = sheet.cell(`${c}${r}`);
            cell.value(undefined); 
            cell.style("border", undefined); 
            cell.style("fill", undefined); 
        });
    }

    // 4. Filtrar e Agrupar Dados
    const diariasFiltradas = todasDiarias.filter((d: any) => d.metodo_pagamento === metodoSelecionado);

    const gruposPorData: any = {};
    diariasFiltradas.forEach((d: any) => {
        const dataStr = d.data_ultima_exportacao ? d.data_ultima_exportacao.split('T')[0] : 'NOVAS';
        if (!gruposPorData[dataStr]) gruposPorData[dataStr] = {};
        const pessoa = d.nome || "SEM NOME";
        if (!gruposPorData[dataStr][pessoa]) gruposPorData[dataStr][pessoa] = [];
        gruposPorData[dataStr][pessoa].push(d);
    });

    const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => {
        if (a === 'NOVAS') return 1;
        if (b === 'NOVAS') return -1;
        return new Date(a).getTime() - new Date(b).getTime();
    });

    let ultimaLinhaDados = 9;
    let row = 10;
    let indexGeral = 1;

    // Função auxiliar para aplicar as bordas
    const aplicarBordas = (r: number, col: string) => {
       const cell = sheet.cell(`${col}${r}`);
       cell.style("border", true);
    }

    // 5. Preenchimento da Tabela
    for (const dataExp of datasOrdenadas) {
        const pessoas = gruposPorData[dataExp];

        // Banner Data
        if (dataExp !== 'NOVAS') {
            const dataFormatada = dataExp.split('-').reverse().join('/');
            sheet.row(row).hidden(false).height(30); 
            colunas.forEach(col => { sheet.cell(`${col}${row}`).style({ fill: 'FFF9C4', border: true }); });
            sheet.cell(`B${row}`).value(`⚠️ TABELA GERADA DIA ${dataFormatada}`).style({ bold: true, fontColor: '000000', horizontalAlignment: 'left', verticalAlignment: 'center' });
            row++;
        } else if (datasOrdenadas.length > 1) {
             sheet.row(row).hidden(false).height(30); 
             colunas.forEach(col => { sheet.cell(`${col}${row}`).style({ fill: 'E8F5E9', border: true }); });
             sheet.cell(`B${row}`).value(`🆕 NOVAS DIÁRIAS`).style({ bold: true, fontColor: '000000', horizontalAlignment: 'left', verticalAlignment: 'center' });
             row++;
        }

        for (const [nome, viagens] of Object.entries(pessoas)) {
             let subtotalValor = 0; let subtotalQtd = 0;
             const arrayViagens = viagens as any[];
             const linhaInicioMesclagem = row;
             
             arrayViagens.forEach((item, indexViagem) => {
                 ultimaLinhaDados = row;
                 const isFirst = indexViagem === 0;

                 // REMOVEMOS A ALTURA FIXA PARA O TEXTO PULAR DE LINHA (WRAP) LIVREMENTE
                 sheet.row(row).hidden(false); 
                 sheet.row(row).height(undefined); 

                 let dataViagem = item.data_viagem;
                 if (dataViagem && typeof dataViagem === 'string') {
                   const parts = dataViagem.split('T')[0].split('-');
                   if(parts.length === 3) dataViagem = `${parts[2]}/${parts[1]}/${parts[0]}`;
                 }

                 if (metodoSelecionado === 'SEI') {
                    const txtPessoa = isFirst ? item.nome : '"';
                    
                    // FORÇANDO ESTILOS DIRETAMENTE EM CADA CÉLULA
                    sheet.cell(`A${row}`).value(indexGeral++).style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, fontSize: 10 });
                    sheet.cell(`B${row}`).value(txtPessoa).style({ horizontalAlignment: isFirst ? 'left' : 'center', verticalAlignment: 'center', fontColor: isFirst ? '000000' : '888888', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`C${row}`).value(dataViagem || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, bold: true, fontSize: 10 });
                    sheet.cell(`D${row}`).value(item.adolescente_nome || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`E${row}`).value(item.local_viagem || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`F${row}`).value(item.numero_processo || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`G${row}`).value(item.observacoes || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    
                    // --- CORREÇÃO DO STATUS: MOSTRANDO "PAGO" OU "PENDENTE" ---
                    sheet.cell(`H${row}`).value(item.pago ? 'PAGO' : 'PENDENTE').style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, bold: true, fontSize: 10 });
                 
                 } else {
                    sheet.cell(`A${row}`).value(indexGeral++).style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, fontSize: 10 });
                    sheet.cell(`B${row}`).value(item.nome).style({ horizontalAlignment: 'left', verticalAlignment: 'center', fontColor: '000000', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`C${row}`).value(item.cargo).style({ horizontalAlignment: 'left', verticalAlignment: 'center', fontColor: '000000', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`D${row}`).value(dataViagem || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, bold: true, fontSize: 10 });
                    sheet.cell(`E${row}`).value(item.adolescente_nome || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`F${row}`).value(item.objetivo || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`G${row}`).value(item.local_viagem || "").style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, wrapText: true, bold: true, fontSize: 10 });
                    sheet.cell(`H${row}`).value(Number(item.quantidade) || 1).style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, numberFormat: "0", bold: true, fontSize: 10 });
                    sheet.cell(`I${row}`).value(Number(item.valor) || 0).style({ horizontalAlignment: 'center', verticalAlignment: 'center', border: true, numberFormat: "R$ #,##0.00", bold: true, fontSize: 10 });
                    
                    subtotalValor += Number(item.valor) || 0;
                    subtotalQtd += Number(item.quantidade) || 1;
                 }
                 row++;
             });

             // Mesclagem apenas para SALÁRIO
             if (metodoSelecionado === 'CONTA SALARIO' && arrayViagens.length > 1) {
                 sheet.range(`B${linhaInicioMesclagem}:B${row - 1}`).merged(true);
                 sheet.range(`C${linhaInicioMesclagem}:C${row - 1}`).merged(true);
             }

             // Subtotais (apenas para quem tem mais de uma viagem)
             if (arrayViagens.length > 1) {
                 ultimaLinhaDados = row;
                 sheet.row(row).hidden(false).height(25); // Subtotal pode ter altura fixa
                 colunas.forEach(col => { sheet.cell(`${col}${row}`).style({ fill: 'F3F4F6', border: true, verticalAlignment: 'center' }); });

                 if (metodoSelecionado === 'SEI') {
                     sheet.cell(`G${row}`).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right', fontSize: 10 });
                     sheet.cell(`H${row}`).value(arrayViagens.length).style({ bold: true, horizontalAlignment: 'center', numberFormat: "0", fontSize: 10 });
                 } else {
                     sheet.cell(`G${row}`).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right', fontSize: 10 });
                     sheet.cell(`H${row}`).value(subtotalQtd).style({ bold: true, horizontalAlignment: 'center', numberFormat: "0", fontSize: 10 });
                     sheet.cell(`I${row}`).value(subtotalValor).style({ bold: true, numberFormat: "R$ #,##0.00", fontSize: 10 });
                 }
                 row++;
             }
        }
    }

    // 6. Cálculo do TOTAL GERAL
    if (ultimaLinhaDados < 10) ultimaLinhaDados = 10;
    const linhaTotal = ultimaLinhaDados + 2;
    sheet.row(linhaTotal).hidden(false).height(30); 

    if (metodoSelecionado === 'SEI') {
      sheet.cell(`G${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right', verticalAlignment: 'center', fontSize: 11 });
      sheet.cell(`H${linhaTotal}`).value(diariasFiltradas.length).style({ bold: true, horizontalAlignment: 'center', verticalAlignment: 'center', numberFormat: "0", fontSize: 11 });
    } else if (diariasFiltradas.length > 0) {
      sheet.cell(`H${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right', verticalAlignment: 'center', fontSize: 11 });
      const valorTotal = diariasFiltradas.reduce((acc: number, curr: any) => acc + (Number(curr.valor) || 0), 0);
      sheet.cell(`I${linhaTotal}`).value(valorTotal).style({ bold: true, numberFormat: "R$ #,##0.00", verticalAlignment: 'center', horizontalAlignment: 'center', fontSize: 11 });
    }

    // =========================================================================
    // 7. INSERÇÃO DINÂMICA DA ASSINATURA NO FINAL
    // =========================================================================
    
    // Pula 3 linhas depois do Total para não ficar colado
    const linhaAssinatura = linhaTotal + 3;
    
    sheet.row(linhaAssinatura).hidden(false).height(20);
    sheet.row(linhaAssinatura + 1).hidden(false).height(20);
    sheet.row(linhaAssinatura + 2).hidden(false).height(20);
    
    // Mesclamos a coluna C, D e E para a assinatura ficar bem centralizada e com espaço
    sheet.range(`C${linhaAssinatura}:E${linhaAssinatura}`).merged(true);
    sheet.range(`C${linhaAssinatura + 1}:E${linhaAssinatura + 1}`).merged(true);
    sheet.range(`C${linhaAssinatura + 2}:E${linhaAssinatura + 2}`).merged(true);
    
    // Desenhamos a linha e inserimos os textos
    sheet.cell(`C${linhaAssinatura}`).value("____________________________________________________")
         .style({ horizontalAlignment: 'center', verticalAlignment: 'bottom', fontColor: '000000', fontSize: 11, bold: true });
         
    sheet.cell(`C${linhaAssinatura + 1}`).value("Kelma Fabiana Ribeiro Silva")
         .style({ bold: true, horizontalAlignment: 'center', verticalAlignment: 'top', fontColor: '000000', fontSize: 11 });
         
    sheet.cell(`C${linhaAssinatura + 2}`).value("Diretora Geral do CSIPRC\nFUNAC/MA")
         .style({ horizontalAlignment: 'center', verticalAlignment: 'top', fontColor: '000000', fontSize: 10, wrapText: true });

    // =========================================================================

    const buffer = await workbook.outputAsync();
    const base64 = buffer.toString('base64');
    return NextResponse.json({ success: true, file: base64 });

  } catch (error: any) {
    console.error("Erro no Excel:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}