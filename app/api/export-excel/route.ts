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

    // Pega a altura da linha 10 como base (ou 25 se falhar)
    const alturaBase = sheet.row(10).height() || 25;

    // --- FORÇANDO LARGURA DAS COLUNAS PARA EVITAR O ERRO '########' ---
    if (metodoSelecionado === 'CONTA SALARIO') {
        sheet.column("A").width(5);   // Nº
        sheet.column("B").width(38);  // SERVIDORES
        sheet.column("C").width(28);  // CARGO
        sheet.column("D").width(18);  // DATA DA VIAGEM
        sheet.column("E").width(45);  // ADOLESCENTE / MOTIVO
        sheet.column("F").width(20);  // OBJETIVO 
        sheet.column("G").width(28);  // DESTINO
        sheet.column("H").width(14);  // QUANTIDADE
        sheet.column("I").width(18);  // VALOR (Alargado para caber o R$)
    }

    // --- DIFERENCIAÇÃO DE COLUNAS ---
    const colunas = metodoSelecionado === 'SEI' 
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] 
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    // 3. Oculta linhas vazias e limpa dados
    for (let r = 10; r <= 1000; r++) {
        const linha = sheet.row(r);
        linha.hidden(true); // Deixa oculto por padrão
        linha.height(alturaBase); 
        
        colunas.forEach(c => {
            const cell = sheet.cell(`${c}${r}`);
            cell.value(undefined); 
            cell.style("border", undefined); 
            cell.style("fill", undefined); 
        });
    }

    // 4. Salvar Estilos da Linha 10 (Template)
    const estilosBase: any = {};
    const estilosParaCopiar = [
      "bold", "italic", "fontFamily", "fontSize", 
      "horizontalAlignment", "verticalAlignment", "wrapText"
    ]; // Removi o numberFormat para forçarmos manualmente!
    
    colunas.forEach(col => {
      estilosBase[col] = {};
      estilosParaCopiar.forEach(estilo => {
         estilosBase[col][estilo] = sheet.cell(`${col}10`).style(estilo);
      });
    });

    // 5. Filtrar e Agrupar os Dados
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

    const aplicarEstiloBase = (r: number, col: string) => {
       const cell = sheet.cell(`${col}${r}`);
       estilosParaCopiar.forEach(estilo => { 
           if (estilosBase[col][estilo] !== undefined) cell.style(estilo, estilosBase[col][estilo]); 
       });
       cell.style("border", true);
    }

    // 6. Preenchimento da Tabela
    for (const dataExp of datasOrdenadas) {
        const pessoas = gruposPorData[dataExp];

        // 6.1 Banners de Data
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

        // 6.2 Itera sobre as Pessoas
        for (const [nome, viagens] of Object.entries(pessoas)) {
             let subtotalValor = 0;
             let subtotalQtd = 0;
             const arrayViagens = viagens as any[];
             const linhaInicioMesclagem = row; // <-- SALVA A LINHA INICIAL PARA MESCLAR
             
             arrayViagens.forEach((item, indexViagem) => {
                 ultimaLinhaDados = row;
                 const isFirst = indexViagem === 0;

                 sheet.row(row).hidden(false).height(alturaBase); 
                 
                 colunas.forEach(col => aplicarEstiloBase(row, col));

                 let dataViagem = item.data_viagem;
                 if (dataViagem && typeof dataViagem === 'string') {
                   const parts = dataViagem.split('T')[0].split('-');
                   if(parts.length === 3) dataViagem = `${parts[2]}/${parts[1]}/${parts[0]}`;
                 }

                 if (metodoSelecionado === 'SEI') {
                    const txtPessoa = isFirst ? item.nome : '"';
                    sheet.cell(`A${row}`).value(indexGeral++);
                    sheet.cell(`B${row}`).value(txtPessoa).style({ horizontalAlignment: isFirst ? 'left' : 'center', fontColor: isFirst ? '000000' : '888888' });
                    sheet.cell(`C${row}`).value(dataViagem || "");
                    sheet.cell(`D${row}`).value(item.adolescente_nome || "");
                    sheet.cell(`E${row}`).value(item.local_viagem || "");
                    sheet.cell(`F${row}`).value(item.numero_processo || "");
                    sheet.cell(`G${row}`).value(item.observacoes || "");
                    sheet.cell(`H${row}`).value(item.pago ? 'PAGO' : 'PENDENTE');
                 } else {
                    sheet.cell(`A${row}`).value(indexGeral++);
                    sheet.cell(`B${row}`).value(item.nome).style({ horizontalAlignment: 'left', verticalAlignment: 'center' });
                    sheet.cell(`C${row}`).value(item.cargo).style({ horizontalAlignment: 'left', verticalAlignment: 'center' });
                    sheet.cell(`D${row}`).value(dataViagem || "");
                    sheet.cell(`E${row}`).value(item.adolescente_nome || "");
                    sheet.cell(`F${row}`).value(item.objetivo || ""); // <-- CAMPO OBJETIVO
                    sheet.cell(`G${row}`).value(item.local_viagem || "");
                    
                    // FORÇANDO A FORMATAÇÃO CORRETA DE NÚMERO E MOEDA
                    sheet.cell(`H${row}`).value(Number(item.quantidade) || 1).style("numberFormat", "0");
                    sheet.cell(`I${row}`).value(Number(item.valor) || 0).style("numberFormat", "R$ #,##0.00");
                    
                    subtotalValor += Number(item.valor) || 0;
                    subtotalQtd += Number(item.quantidade) || 1;
                 }
                 row++;
             });

             // --- MÁGICA DO EXCEL: MESCLAR CÉLULAS (MERGE) PARA SALÁRIO ---
             if (metodoSelecionado === 'CONTA SALARIO' && arrayViagens.length > 1) {
                 sheet.range(`B${linhaInicioMesclagem}:B${row - 1}`).merged(true);
                 sheet.range(`C${linhaInicioMesclagem}:C${row - 1}`).merged(true);
             }

             // 6.3 SUBTOTAL
             if (arrayViagens.length > 1) {
                 ultimaLinhaDados = row;
                 sheet.row(row).hidden(false).height(alturaBase); 
                 
                 colunas.forEach(col => {
                     sheet.cell(`${col}${row}`).style({ fill: 'F3F4F6', border: true });
                 });

                 if (metodoSelecionado === 'SEI') {
                     sheet.cell(`G${row}`).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right' });
                     sheet.cell(`H${row}`).value(arrayViagens.length).style({ bold: true, horizontalAlignment: 'center', numberFormat: "0" });
                 } else {
                     sheet.cell(`G${row}`).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right' });
                     sheet.cell(`H${row}`).value(subtotalQtd).style({ bold: true, horizontalAlignment: 'center', numberFormat: "0" });
                     sheet.cell(`I${row}`).value(subtotalValor).style({ bold: true, numberFormat: "R$ #,##0.00" });
                 }
                 row++;
             }
        }
    }

    // 7. Cálculo do TOTAL GERAL
    if (ultimaLinhaDados < 10) ultimaLinhaDados = 10;
    const linhaTotal = ultimaLinhaDados + 2;

    sheet.row(linhaTotal).hidden(false).height(alturaBase); 

    if (metodoSelecionado === 'SEI') {
      sheet.cell(`G${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right' });
      sheet.cell(`H${linhaTotal}`).value(diariasFiltradas.length).style({ bold: true, horizontalAlignment: 'left', numberFormat: "0" });
    } else if (diariasFiltradas.length > 0) {
      sheet.cell(`H${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right' });
      const valorTotal = diariasFiltradas.reduce((acc: number, curr: any) => acc + (Number(curr.valor) || 0), 0);
      sheet.cell(`I${linhaTotal}`).value(valorTotal).style({ bold: true, numberFormat: "R$ #,##0.00" });
    }

    const buffer = await workbook.outputAsync();
    const base64 = buffer.toString('base64');

    return NextResponse.json({ success: true, file: base64 });

  } catch (error: any) {
    console.error("Erro no Excel:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}