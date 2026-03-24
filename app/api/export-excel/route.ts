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
      throw new Error(`Modelo '${nomeArquivoModelo}' não encontrado.`);
    }

    // 2. Carrega Workbook
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(0);

    // --- CORREÇÃO CRÍTICA: GARANTIR QUE TODAS AS LINHAS ESTEJAM VISÍVEIS ---
    // Pega a altura da linha 10 como base (ou 25 se falhar)
    const alturaBase = sheet.row(10).height() || 25;

    // 3. Prepara a Planilha: Limpa resíduos e FORÇA a exibição das linhas
    // Aumentamos para 800 linhas para garantir que tabelas gigantes não quebrem
    for (let r = 10; r <= 800; r++) {
        const linha = sheet.row(r);
        linha.hidden(false); // Remove o atributo de "linha oculta"
        linha.height(alturaBase); // Força a altura para não ficar "esmagada"
        
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(c => {
            sheet.cell(`${c}${r}`).value(undefined).style("border", undefined).style("fill", undefined);
        });
    }

    // 4. Salvar Estilos da Linha 10 antes de alterá-la
    const estilosBase: any = {};
    const estilosParaCopiar = [
      "bold", "italic", "fontFamily", "fontSize", 
      "horizontalAlignment", "verticalAlignment", "wrapText", "numberFormat"
    ];
    
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      estilosBase[col] = {};
      estilosParaCopiar.forEach(estilo => {
         estilosBase[col][estilo] = sheet.cell(`${col}10`).style(estilo);
      });
    });

    // 5. Filtrar e Agrupar os Dados
    const diariasFiltradas = todasDiarias.filter((d: any) => d.metodo_pagamento === metodoSelecionado);

    // Agrupa 1º pela Data que foi Exportada, 2º pelo Nome do Servidor
    const gruposPorData: any = {};
    diariasFiltradas.forEach((d: any) => {
        const dataStr = d.data_ultima_exportacao ? d.data_ultima_exportacao.split('T')[0] : 'NOVAS';
        if (!gruposPorData[dataStr]) gruposPorData[dataStr] = {};
        
        const pessoa = d.nome || "SEM NOME";
        if (!gruposPorData[dataStr][pessoa]) gruposPorData[dataStr][pessoa] = [];
        
        gruposPorData[dataStr][pessoa].push(d);
    });

    // Ordenar as datas para as antigas aparecerem primeiro e as NOVAS por último
    const datasOrdenadas = Object.keys(gruposPorData).sort((a, b) => {
        if (a === 'NOVAS') return 1;
        if (b === 'NOVAS') return -1;
        return new Date(a).getTime() - new Date(b).getTime();
    });

    let ultimaLinhaDados = 9;
    let row = 10;
    let indexGeral = 1;

    // Função auxiliar para recriar as bordas de forma consistente
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

        // 6.1 Insere a faixa (banner) avisando a data
        if (dataExp !== 'NOVAS') {
            const dataFormatada = dataExp.split('-').reverse().join('/');
            sheet.row(row).hidden(false).height(30); // Garante que a linha do banner apareça
            sheet.range(`A${row}:H${row}`).merged(true)
                 .value(`TABELA GERADA DIA ${dataFormatada}`)
                 .style({ bold: true, fill: 'FFF9C4', fontColor: '000000', horizontalAlignment: 'center', verticalAlignment: 'center', border: true });
            row++;
        } else if (datasOrdenadas.length > 1) {
             sheet.row(row).hidden(false).height(30); // Garante que a linha do banner apareça
             sheet.range(`A${row}:H${row}`).merged(true)
                  .value(`🆕 NOVAS DIÁRIAS`)
                  .style({ bold: true, fill: 'E8F5E9', fontColor: '000000', horizontalAlignment: 'center', verticalAlignment: 'center', border: true });
             row++;
        }

        // 6.2 Itera sobre as Pessoas daquele grupo
        for (const [nome, viagens] of Object.entries(pessoas)) {
             let subtotalValor = 0;
             let subtotalQtd = 0;
             const arrayViagens = viagens as any[];
             
             arrayViagens.forEach((item, indexViagem) => {
                 ultimaLinhaDados = row;
                 const isFirst = indexViagem === 0;

                 // FORÇA a linha a ficar visível e com altura correta EXATAMENTE AGORA
                 sheet.row(row).hidden(false).height(alturaBase);
                 
                 ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => aplicarEstiloBase(row, col));

                 let dataViagem = item.data_viagem;
                 if (dataViagem && typeof dataViagem === 'string') {
                   const parts = dataViagem.split('T')[0].split('-');
                   if(parts.length === 3) dataViagem = `${parts[2]}/${parts[1]}/${parts[0]}`;
                 }

                 const txtPessoa = isFirst ? item.nome : '"';
                 const txtCargo = isFirst ? item.cargo : '"';

                 if (metodoSelecionado === 'SEI') {
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
                    sheet.cell(`B${row}`).value(txtPessoa).style({ horizontalAlignment: isFirst ? 'left' : 'center', fontColor: isFirst ? '000000' : '888888' });
                    sheet.cell(`C${row}`).value(txtCargo).style({ horizontalAlignment: isFirst ? 'left' : 'center', fontColor: isFirst ? '000000' : '888888' });
                    sheet.cell(`D${row}`).value(dataViagem || "");
                    sheet.cell(`E${row}`).value(item.adolescente_nome || "");
                    sheet.cell(`F${row}`).value(item.local_viagem || "");
                    sheet.cell(`G${row}`).value(Number(item.quantidade) || 1);
                    sheet.cell(`H${row}`).value(Number(item.valor) || 0);
                    
                    subtotalValor += Number(item.valor) || 0;
                    subtotalQtd += Number(item.quantidade) || 1;
                 }
                 row++;
             });

             if (arrayViagens.length > 1) {
                 ultimaLinhaDados = row;
                 sheet.row(row).hidden(false).height(alturaBase); // Força linha do subtotal
                 
                 if (metodoSelecionado === 'SEI') {
                     sheet.range(`A${row}:G${row}`).merged(true).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right', fill: 'F3F4F6', border: true });
                     sheet.cell(`H${row}`).value(arrayViagens.length).style({ bold: true, horizontalAlignment: 'center', fill: 'F3F4F6', border: true });
                 } else {
                     sheet.range(`A${row}:F${row}`).merged(true).value(`SUBTOTAL - ${nome}`).style({ bold: true, horizontalAlignment: 'right', fill: 'F3F4F6', border: true });
                     sheet.cell(`G${row}`).value(subtotalQtd).style({ bold: true, horizontalAlignment: 'center', fill: 'F3F4F6', border: true });
                     sheet.cell(`H${row}`).value(subtotalValor).style({ bold: true, numberFormat: "R$ #,##0.00", fill: 'F3F4F6', border: true });
                 }
                 row++;
             }
        }
    }

    // 7. Cálculo do TOTAL GERAL
    if (ultimaLinhaDados < 10) ultimaLinhaDados = 10;
    const linhaTotal = ultimaLinhaDados + 2;

    sheet.row(linhaTotal).hidden(false).height(alturaBase); // Força linha do total a aparecer

    if (metodoSelecionado === 'SEI') {
      sheet.cell(`G${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right' });
      sheet.cell(`H${linhaTotal}`).value(diariasFiltradas.length).style({ bold: true, horizontalAlignment: 'left' });
    } else if (diariasFiltradas.length > 0) {
      sheet.cell(`G${linhaTotal}`).value("TOTAL GERAL:").style({ bold: true, horizontalAlignment: 'right' });
      const valorTotal = diariasFiltradas.reduce((acc: number, curr: any) => acc + (Number(curr.valor) || 0), 0);
      sheet.cell(`H${linhaTotal}`).value(valorTotal).style({ bold: true, numberFormat: "R$ #,##0.00" });
    }

    const buffer = await workbook.outputAsync();
    const base64 = buffer.toString('base64');

    return NextResponse.json({ success: true, file: base64 });

  } catch (error: any) {
    console.error("Erro no Excel:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}