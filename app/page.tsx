"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// --- COMPONENTE DE AUTOCOMPLETE CORRIGIDO ---
const AutocompleteInput = ({ 
  label, value, onChange, sugestoes, placeholder, required = false, name
}: any) => {
  const [filtrados, setFiltrados] = useState<string[]>([])
  const [mostrar, setMostrar] = useState(false)

  const aoDigitar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value
    onChange(e)
    if (texto.length > 0) {
      const matches = sugestoes.filter((item: string) => item.toLowerCase().includes(texto.toLowerCase()))
      setFiltrados(matches)
      setMostrar(true)
    } else {
      setMostrar(false)
    }
  }

  const selecionar = (e: React.MouseEvent, item: string) => {
    e.preventDefault() 
    onChange({ target: { name, value: item } })
    setMostrar(false)
  }

  const aoPerderFoco = () => setTimeout(() => setMostrar(false), 200)

  return (
    <div className="relative w-full">
      <input
        name={name} value={value} onChange={aoDigitar} onBlur={aoPerderFoco} placeholder={placeholder} required={required} autoComplete="off"
        className="w-full border p-3 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
      />
      {mostrar && filtrados.length > 0 && (
        <ul className="absolute z-[999] w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {filtrados.map((item, index) => (
            <li key={index} onMouseDown={(e) => selecionar(e, item)} className="px-4 py-3 hover:bg-blue-100 cursor-pointer text-sm font-bold text-slate-800 border-b border-slate-100 last:border-none transition-colors uppercase">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DiariasDashboard() {
  const [diarias, setDiarias] = useState<any[]>([])
  const [servidores, setServidores] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  // --- SISTEMA DE NOTIFICAÇÕES (TOASTS) ---
  const [toast, setToast] = useState<{ msg: string, tipo: 'sucesso' | 'erro' | 'info', id: number } | null>(null);

  const mostrarToast = useCallback((msg: string, tipo: 'sucesso' | 'erro' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ msg, tipo, id });
    setTimeout(() => {
      setToast((atual) => atual?.id === id ? null : atual);
    }, 3500);
  }, []);

  // --- AUTENTICAÇÃO SEGURA ---
  const [estaAutenticado, setEstaAutenticado] = useState(false)
  const [usuarioLogado, setUsuarioLogado] = useState('') 
  const [usuarioEmail, setUsuarioEmail] = useState('') 
  
  // --- NÍVEL DE ACESSO (PERMISSÕES) ---
  const emailsAdmin = ['santos.junior12@hotmail.com', 'ederson@live.com']
  const isAdmin = emailsAdmin.includes(usuarioEmail)

  const [emailInput, setEmailInput] = useState('')
  const [senhaInput, setSenhaInput] = useState('')
  const [msgAuth, setMsgAuth] = useState({ texto: '', tipo: '' })

  const [pesquisa, setPesquisa] = useState('')
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS')
  const [filtroStatus, setFiltroStatus] = useState('PENDENTE')
  const [metodoSelecionado, setMetodoSelecionado] = useState('SEI')
  const [mostrarPortal, setMostrarPortal] = useState(false)
  
  const [dataInicioRelatorio, setDataInicioRelatorio] = useState('')
  const [dataFimRelatorio, setDataFimRelatorio] = useState('')

  const [mostrarGerenciarEquipe, setMostrarGerenciarEquipe] = useState(false)
  const [novoServidor, setNovoServidor] = useState({ nome: '', cargo: '' })

  const [ordemData, setOrdemData] = useState<'DESC' | 'ASC'>('ASC')
  const [manterDados, setManterDados] = useState(false)

  const [formNome, setFormNome] = useState('')
  const [formCargo, setFormCargo] = useState('')
  const [formLocal, setFormLocal] = useState('')

  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [dadosEditados, setDadosEditados] = useState<any>({})

  const [uploadingTabela, setUploadingTabela] = useState<string | null>(null)

  const TEMPO_ATE_AVISO = 119 * 60 * 1000; 
  const TEMPO_DO_AVISO_ATE_LOGOUT = 1 * 60 * 1000;

  const timerAviso = useRef<NodeJS.Timeout | null>(null);
  const timerLogout = useRef<NodeJS.Timeout | null>(null);
  const [avisoInativo, setAvisoInativo] = useState(false); 
  const [segundosRestantes, setSegundosRestantes] = useState(60); 

  // --- FILTROS RÁPIDOS DE TEMPO (NOVO) ---
  const aplicarFiltroRapido = (tipo: 'HOJE' | '7DIAS' | 'ESTE_MES' | 'MES_PASSADO') => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    if (tipo === 'HOJE') {
      // inicio e fim já são hoje
    } else if (tipo === '7DIAS') {
      inicio.setDate(hoje.getDate() - 7);
    } else if (tipo === 'ESTE_MES') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // Último dia do mês atual
    } else if (tipo === 'MES_PASSADO') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0); // Último dia do mês passado
    }

    // Formatar para YYYY-MM-DD considerando fuso horário local
    const formatarLocalYMD = (d: Date) => {
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }

    setDataInicioRelatorio(formatarLocalYMD(inicio));
    setDataFimRelatorio(formatarLocalYMD(fim));
    mostrarToast("Filtro de data aplicado!", "info");
  }

  const diariasNaoGeradasNoPeriodo = diarias.filter(d => {
    let valido = !d.pago && !d.data_ultima_exportacao;
    if (dataInicioRelatorio) valido = valido && d.data_viagem >= dataInicioRelatorio;
    if (dataFimRelatorio) valido = valido && d.data_viagem <= dataFimRelatorio;
    return valido;
  });

  const totalNovoSEI = diariasNaoGeradasNoPeriodo.filter(d => d.metodo_pagamento === 'SEI').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalNovoSalario = diariasNaoGeradasNoPeriodo.filter(d => d.metodo_pagamento === 'CONTA SALARIO').reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const tabelasPendentes = diarias
    .filter(d => !d.pago && d.data_ultima_exportacao)
    .reduce((acc, d) => {
       const dataStr = d.data_ultima_exportacao.split('T')[0];
       const key = `${d.metodo_pagamento}_${dataStr}`;
       if (!acc[key]) { acc[key] = { key, metodo: d.metodo_pagamento, data: d.data_ultima_exportacao, valorTotal: 0, ids: [], comprovante_url: d.comprovante_url || null }; }
       acc[key].valorTotal += Number(d.valor) || 0;
       acc[key].ids.push(d.id);
       if (d.comprovante_url && !acc[key].comprovante_url) acc[key].comprovante_url = d.comprovante_url;
       return acc;
    }, {} as Record<string, any>);

  const tabelasPendentesArray = Object.values(tabelasPendentes).sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());

  useEffect(() => {
    const verificarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setEstaAutenticado(true);
        setUsuarioLogado(session.user.user_metadata?.nome || session.user.email);
        setUsuarioEmail(session.user.email || '');
      }
    };
    verificarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setEstaAutenticado(true);
        setUsuarioLogado(session.user.user_metadata?.nome || session.user.email);
        setUsuarioEmail(session.user.email || '');
      } else {
        setEstaAutenticado(false);
        setUsuarioLogado('');
        setUsuarioEmail('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const executarLogoutAutomatico = useCallback(() => {
    setAvisoInativo(false); fazerLogout(); 
    mostrarToast("Sessão encerrada por inatividade (2 horas).", "erro");
  }, [mostrarToast]);

  const resetarTimer = useCallback(() => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
    if (timerLogout.current) clearTimeout(timerLogout.current);
    setAvisoInativo(false); setSegundosRestantes(60);
    if (estaAutenticado) {
      timerAviso.current = setTimeout(() => {
        setAvisoInativo(true); timerLogout.current = setTimeout(executarLogoutAutomatico, TEMPO_DO_AVISO_ATE_LOGOUT);
      }, TEMPO_ATE_AVISO);
    }
  }, [estaAutenticado, executarLogoutAutomatico]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (avisoInativo && segundosRestantes > 0) interval = setInterval(() => { setSegundosRestantes((prev) => prev - 1); }, 1000);
    return () => clearInterval(interval);
  }, [avisoInativo, segundosRestantes]);

  useEffect(() => {
    if (estaAutenticado) {
      const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
      resetarTimer();
      const lidarComAtividade = () => resetarTimer();
      eventos.forEach(evento => window.addEventListener(evento, lidarComAtividade));
      return () => {
        if (timerAviso.current) clearTimeout(timerAviso.current);
        if (timerLogout.current) clearTimeout(timerLogout.current);
        eventos.forEach(evento => window.removeEventListener(evento, lidarComAtividade));
      };
    }
  }, [estaAutenticado, resetarTimer]);


  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgAuth({ texto: 'Autenticando...', tipo: 'info' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password: senhaInput });
      if (error) throw error;
      setMsgAuth({ texto: '', tipo: '' });
      mostrarToast("Login efetuado com sucesso!", "sucesso");
    } catch (err: any) {
      setMsgAuth({ texto: 'E-mail ou senha incorretos.', tipo: 'erro' });
    }
  }

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    setEstaAutenticado(false); setUsuarioLogado(''); setUsuarioEmail('');
    setEmailInput(''); setSenhaInput(''); 
    if (timerAviso.current) clearTimeout(timerAviso.current);
    if (timerLogout.current) clearTimeout(timerLogout.current);
  }

  const formatarDataBR = (dataStr: string) => {
    if (!dataStr) return "---";
    try {
      const parts = dataStr.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(dataStr).toLocaleDateString('pt-BR');
    } catch { return dataStr; }
  };

  const baixarRelatorioPendentes = async (metodo: string) => {
    let listaPendentes = diarias.filter(d => !d.pago && d.metodo_pagamento === metodo && !d.data_ultima_exportacao);
    if (dataInicioRelatorio) listaPendentes = listaPendentes.filter(d => d.data_viagem >= dataInicioRelatorio);
    if (dataFimRelatorio) listaPendentes = listaPendentes.filter(d => d.data_viagem <= dataFimRelatorio);
    if (listaPendentes.length === 0) { 
      mostrarToast(`Não há novas diárias para gerar relatório de ${metodo} no período selecionado!`, "info"); 
      return; 
    }

    listaPendentes.sort((a, b) => new Date(a.data_viagem).getTime() - new Date(b.data_viagem).getTime());
    mostrarToast(`Gerando relatório Excel de ${metodo}...`, "info");

    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todasDiarias: listaPendentes, metodoSelecionado: metodo })
      });
      const data = await response.json();
      if (data.success && data.file) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.file}`;
        link.download = `NOVAS_PENDENCIAS_${metodo}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);

        const idsNaoExportados = listaPendentes.map(d => d.id);
        if (idsNaoExportados.length > 0) {
           const agora = new Date().toISOString();
           await supabase.from('diarias').update({ data_ultima_exportacao: agora }).in('id', idsNaoExportados);
           fetchDiarias();
        }
        mostrarToast("Download concluído! Diárias enviadas para pendências.", "sucesso");
      } else { 
        mostrarToast("Erro na API ao gerar Excel: " + data.error, "erro"); 
      }
    } catch (err) { 
      mostrarToast("Erro de conexão ao gerar Excel.", "erro"); 
    }
  }

  const baixarRelatorioAntigo = async (metodo: string, ids: string[], dataExportacao: string) => {
    const lista = diarias.filter(d => ids.includes(d.id));
    if (lista.length === 0) return;
    lista.sort((a, b) => new Date(a.data_viagem).getTime() - new Date(b.data_viagem).getTime());
    
    mostrarToast("Refazendo download do Excel...", "info");

    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todasDiarias: lista, metodoSelecionado: metodo })
      });
      const data = await response.json();
      if (data.success && data.file) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.file}`;
        link.download = `REEMISSAO_TABELA_${metodo}_DIA_${new Date(dataExportacao).toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        mostrarToast("Download refeito com sucesso!", "sucesso");
      } else { 
        mostrarToast("Erro API: " + data.error, "erro"); 
      }
    } catch (err) { 
      mostrarToast("Erro ao processar Excel antigo.", "erro"); 
    }
  }

  const excluirRelatorioGerado = async (ids: string[]) => {
    if (!isAdmin) return;
    if (confirm(`Tem certeza que deseja desfazer esta tabela gerada? \nAs diárias voltarão para a fila de "A Gerar".`)) {
      try {
        await supabase.from('diarias').update({ data_ultima_exportacao: null, comprovante_url: null }).in('id', ids);
        fetchDiarias();
        mostrarToast("Tabela desfeita. Diárias retornaram para a fila.", "info");
      } catch (error) { 
        mostrarToast("Erro ao desfazer relatório.", "erro"); 
      }
    }
  }

  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>, ids: string[], key: string) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTabela(key); 
    try {
       const extensao = file.name.split('.').pop();
       const fileName = `tabela_${key}_${Date.now()}.${extensao}`;
       const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file);
       if (uploadError) throw uploadError;
       const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
       await supabase.from('diarias').update({ comprovante_url: urlData.publicUrl }).in('id', ids);
       mostrarToast("Cópia de segurança (Backup) anexada com sucesso!", "sucesso");
       fetchDiarias();
    } catch (err: any) { 
       mostrarToast("Erro ao enviar arquivo: " + err.message, "erro"); 
    } finally { 
       setUploadingTabela(null); 
    }
  }

  const fetchDiarias = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('diarias').select('*').order('data_viagem', { ascending: false })
      if (error) throw error
      setDiarias(data || [])
    } catch (error: any) { console.error(error.message) } finally { setLoading(false) }
  }, [])

  const fetchServidores = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('servidores').select('*').order('nome', { ascending: true })
      if (!error) setServidores(data || [])
    } catch (err) { console.error("Erro ao buscar servidores") }
  }, [])

  useEffect(() => { 
    if (estaAutenticado) { fetchDiarias(); fetchServidores(); }
  }, [estaAutenticado, fetchDiarias, fetchServidores])

  async function adicionarServidor(e: React.FormEvent) {
    e.preventDefault()
    if(!isAdmin || !novoServidor.nome) return;
    const { error } = await supabase.from('servidores').insert([{ nome: novoServidor.nome.toUpperCase(), cargo: novoServidor.cargo.toUpperCase() }])
    if (error) { 
      mostrarToast("Erro ao adicionar servidor.", "erro"); 
    } else { 
      setNovoServidor({ nome: '', cargo: '' }); 
      fetchServidores(); 
      mostrarToast("Membro da equipe adicionado!", "sucesso");
    }
  }

  async function removerServidor(id: number) {
    if(!isAdmin) return;
    if(confirm("Remover este membro da equipe permanentemente?")) { 
      await supabase.from('servidores').delete().eq('id', id); 
      fetchServidores(); 
      mostrarToast("Membro removido da equipe.", "info");
    }
  }

  async function marcarTabelaPaga(ids: string[]) {
    if (!isAdmin) return;
    if (confirm(`Confirmar o pagamento destas ${ids.length} diárias de uma só vez?`)) {
      const agora = new Date().toISOString();
      await supabase.from('diarias').update({ pago: true, data_pagamento: agora, updated_at: agora, usuario_alteracao: usuarioLogado }).in('id', ids);
      fetchDiarias();
      mostrarToast(`${ids.length} diárias marcadas como PAGAS!`, "sucesso");
    }
  }

  const diariasFiltradas = diarias.filter(d => {
    const busca = ((d.nome || "") + (d.adolescente_nome || "") + (d.numero_processo || "") + (d.local_viagem || "")).toLowerCase()
    const matchesPesquisa = busca.includes(pesquisa.toLowerCase())
    const matchesMetodo = filtroMetodo === 'TODOS' || d.metodo_pagamento === filtroMetodo
    let matchesStatus = true;
    if (filtroStatus === 'PAGO') matchesStatus = d.pago === true;
    if (filtroStatus === 'PENDENTE') matchesStatus = d.pago === false;
    return matchesPesquisa && matchesMetodo && matchesStatus
  }).sort((a, b) => {
    const dataA = new Date(a.data_viagem).getTime() || 0
    const dataB = new Date(b.data_viagem).getTime() || 0
    if (ordemData === 'DESC') return dataB - dataA; else return dataA - dataB;
  })

  const dashboardGastoTotal = diariasFiltradas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const dashboardGastoSEI = diariasFiltradas.filter(d => d.metodo_pagamento === 'SEI').reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const dashboardGastoSalario = diariasFiltradas.filter(d => d.metodo_pagamento === 'CONTA SALARIO').reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  
  const gastosPorPessoa = diariasFiltradas.reduce((acc: any, d) => {
    acc[d.nome] = (acc[d.nome] || 0) + (Number(d.valor) || 0);
    return acc;
  }, {});
  const rankingTop5 = Object.entries(gastosPorPessoa).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  const maiorValorRanking = rankingTop5.length > 0 ? Number(rankingTop5[0][1]) : 1;

  const iniciarEdicao = (item: any) => { if(!isAdmin) return; setIdEditando(item.id); setDadosEditados({ ...item }) }

  const salvarEdicao = async () => {
    if(!isAdmin) return;
    const agora = new Date().toISOString();
    const valorFormatado = dadosEditados.valor ? parseFloat(parseFloat(dadosEditados.valor.toString()).toFixed(2)) : 0;
    const dadosFinais = { ...dadosEditados, valor: valorFormatado, updated_at: agora, usuario_alteracao: usuarioLogado };
    const { error } = await supabase.from('diarias').update(dadosFinais).eq('id', idEditando)
    if (!error) { 
      setIdEditando(null); 
      fetchDiarias(); 
      mostrarToast("Registro atualizado com sucesso!", "sucesso");
    } else { 
      mostrarToast("Erro ao salvar edição: " + error.message, "erro"); 
    }
  }

  async function cadastrarDiaria(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget; const formData = new FormData(form);
    const nomeFinal = formNome || (formData.get('nome') as string)
    const cargoFinal = formCargo || (formData.get('cargo') as string)
    const localFinal = formLocal || (formData.get('local') as string)
    const adolescenteFinal = formData.get('adolescente_nome') as string

    const valorBruto = parseFloat(formData.get('valor') as string) || 0;
    const valorCorrigido = parseFloat(valorBruto.toFixed(2));

    const novaDiaria = {
      nome: nomeFinal.toUpperCase(),
      cargo: cargoFinal.toUpperCase(),
      adolescente_nome: adolescenteFinal.toUpperCase(),
      data_viagem: formData.get('data'),
      local_viagem: localFinal.toUpperCase(),
      valor: valorCorrigido,
      quantidade: formData.get('quantidade') ? parseInt(formData.get('quantidade') as string) : 1,
      metodo_pagamento: metodoSelecionado,
      numero_processo: formData.get('numero_processo') || "",
      observacoes: formData.get('observacoes') || "",
      pago: false,
      usuario_alteracao: usuarioLogado
    }

    try {
      const { error } = await supabase.from('diarias').insert([novaDiaria])
      if (error) { mostrarToast("Erro no banco: " + error.message, "erro"); return; }
      await fetchDiarias();
      if (manterDados) {
        setFormNome(""); 
        mostrarToast("Salvo! Dados mantidos para o próximo integrante.", "sucesso");
      } else {
        form.reset(); setFormNome(""); setFormCargo(""); setFormLocal(""); 
        mostrarToast("Nova diária cadastrada com sucesso!", "sucesso");
      }
    } catch (err) { mostrarToast("Erro inesperado ao salvar.", "erro"); }
  }

  async function alternarPagamento(id: string, statusAtual: boolean) {
    if(!isAdmin) return;
    const agora = new Date().toISOString()
    await supabase.from('diarias').update({ pago: !statusAtual, data_pagamento: !statusAtual ? agora : null, updated_at: agora, usuario_alteracao: usuarioLogado }).eq('id', id)
    fetchDiarias()
    if(!statusAtual) mostrarToast("Diária marcada como PAGA!", "sucesso");
    else mostrarToast("Pagamento desmarcado (Pendente).", "info");
  }

  async function excluirDiaria(id: string) {
    if(!isAdmin) return;
    if (confirm("Excluir este registro permanentemente?")) { 
      await supabase.from('diarias').delete().eq('id', id); 
      fetchDiarias(); 
      mostrarToast("Registro excluído.", "info");
    }
  }

  const enviarRelatorioWhats = () => {
    if(!isAdmin) return;
    const pendentes = diarias.filter(d => !d.pago);
    if (pendentes.length === 0) { mostrarToast("Parabéns! Tudo está pago. Nada a cobrar.", "sucesso"); return; }

    let texto = `*RELATÓRIO DE PENDÊNCIAS - CSIPRC*\n\n`;
    pendentes.forEach(d => {
      let infoMetodo = `(${d.metodo_pagamento})`;
      if (d.metodo_pagamento === 'SEI' && d.numero_processo) infoMetodo = `(SEI: ${d.numero_processo})`;
      else if (d.metodo_pagamento === 'SEI') infoMetodo = `(SEI: Sem Nº)`;
      texto += `⚠️ *PENDENTE* ${infoMetodo}\n📅 Data: ${formatarDataBR(d.data_viagem)}\n👤 Servidor: ${d.nome}\n💰 Valor: R$ ${Number(d.valor).toFixed(2)}\n----------------\n`;
    });
    
    const total = pendentes.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    texto += `\n*TOTAL A PAGAR: R$ ${total.toFixed(2)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  }

  const sugestoesNomes = [...new Set(servidores.map(s => s.nome.toUpperCase()))] 
  const sugestoesCargos = [...new Set(servidores.map(s => s.cargo).filter(Boolean).map(c => c.toUpperCase()))] 
  const sugestoesLocais = [...new Set(diarias.map(d => d.local_viagem).filter(Boolean).map(l => l.toUpperCase()))]

  if (!estaAutenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4 relative overflow-hidden">
        {toast && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm text-white flex items-center gap-3 animate-slideDown ${
            toast.tipo === 'sucesso' ? 'bg-green-600' : toast.tipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : toast.tipo === 'erro' ? '⚠️' : 'ℹ️'}</span>
            {toast.msg}
          </div>
        )}
        <div className="absolute bottom-4 text-slate-600 text-[10px] uppercase font-bold tracking-widest opacity-50">Versão Seguro/LGPD • Dev: Educador Social Junior</div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col items-center border-t-8 border-blue-600 relative z-10 transition-all">
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter mb-1">CSIPRC</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Acesso Restrito</p>
          </div>
          <form onSubmit={lidarComLogin} className="w-full flex flex-col gap-3">
            <input type="email" placeholder="E-MAIL" className="input-login" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required />
            <input type="password" placeholder="SENHA" className="input-login" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} required />
            {msgAuth.texto && <p className={`text-xs font-bold text-center mt-1 animate-pulse ${msgAuth.tipo === 'erro' ? 'text-red-500' : 'text-green-600'}`}>{msgAuth.texto}</p>}
            <button className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl uppercase text-xs tracking-widest mt-2">ENTRAR</button>
          </form>
        </div>
        <style jsx>{`
          .input-login { width: 100%; background-color: #f1f5f9; border: 2px solid #94a3b8; padding: 1rem; border-radius: 0.75rem; text-align: center; font-weight: 800; outline: none; color: #000000; transition: all 0.2s; }
          .input-login::placeholder { color: #334155; opacity: 1; }
          .input-login:focus { border-color: #2563eb; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
          @keyframes slideDown { 0% { transform: translate(-50%, -150%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
          .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28 relative">
      
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm text-white flex items-center gap-3 animate-slideDown ${
          toast.tipo === 'sucesso' ? 'bg-green-600' : toast.tipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          <span className="text-xl">{toast.tipo === 'sucesso' ? '✅' : toast.tipo === 'erro' ? '⚠️' : 'ℹ️'}</span>
          {toast.msg}
        </div>
      )}

      {isAdmin && mostrarGerenciarEquipe && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 relative">
            <button onClick={() => setMostrarGerenciarEquipe(false)} className="absolute top-4 right-4 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 w-8 h-8 rounded-full font-bold">X</button>
            <h2 className="text-xl font-black text-slate-800 mb-4 uppercase italic">Gerenciar Equipe</h2>
            <form onSubmit={adicionarServidor} className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
               <input className="w-full border p-2 rounded-lg text-sm font-bold uppercase" placeholder="Nome do Servidor" value={novoServidor.nome} onChange={(e) => setNovoServidor({...novoServidor, nome: e.target.value.toUpperCase()})} />
               <input className="w-full border p-2 rounded-lg text-sm uppercase" placeholder="Cargo (Opcional)" value={novoServidor.cargo} onChange={(e) => setNovoServidor({...novoServidor, cargo: e.target.value.toUpperCase()})} />
               <button className="bg-blue-600 text-white font-bold py-2 rounded-lg text-xs uppercase hover:bg-blue-700">Adicionar à Lista</button>
            </form>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {servidores.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div><p className="font-bold text-sm text-slate-800 uppercase">{s.nome}</p><p className="text-[10px] text-slate-500 uppercase">{s.cargo || 'Sem cargo'}</p></div>
                  <button onClick={() => removerServidor(s.id)} className="text-red-400 hover:text-red-600 text-xs font-bold px-2">Remover</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {avisoInativo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/95 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-md w-full mx-4 border-4 border-red-500 animate-bounce">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-black text-red-600 uppercase mb-2">Sessão Expirando!</h2>
            <p className="text-slate-600 font-bold mb-6">Você está inativo há quase 2 horas.<br/>Sua sessão será encerrada em:</p>
            <div className="text-5xl font-black text-slate-900 mb-8 font-mono">{segundosRestantes}s</div>
            <button onClick={resetarTimer} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-lg uppercase shadow-xl transition-transform hover:scale-105 active:scale-95">CONTINUAR TRABALHANDO</button>
          </div>
        </div>
      )}

      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Gestão CSIPRC</h1>
              <div className="flex items-center gap-2 border-l pl-3 ml-1 border-slate-200">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Olá, {usuarioLogado}</span>
                {isAdmin && <span className="bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>}
                <button onClick={() => {if(confirm('Sair do sistema?')) fazerLogout()}} className="text-[9px] font-bold text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded">SAIR</button>
              </div>
            </div>
            
            <div className="flex-1 max-w-xl">
              <input type="text" placeholder="🔍 Buscar Servidor ou Destino..." className="w-full bg-slate-100 border-none p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase ml-2">Período:</span>
                  <input type="date" value={dataInicioRelatorio} onChange={(e) => setDataInicioRelatorio(e.target.value)} className="bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-400">ATÉ</span>
                  <input type="date" value={dataFimRelatorio} onChange={(e) => setDataFimRelatorio(e.target.value)} className="bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none cursor-pointer" />
                  <button onClick={() => { setDataInicioRelatorio(''); setDataFimRelatorio(''); mostrarToast('Filtro de data limpo', 'info'); }} className="text-[9px] text-slate-400 hover:text-red-500 mr-2" title="Limpar Período">✖</button>
                </div>
                
                {/* BOTÕES RÁPIDOS DE DATA */}
                <div className="flex gap-1 justify-end">
                  <button onClick={() => aplicarFiltroRapido('HOJE')} className="text-[8px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 px-2 py-0.5 rounded font-bold uppercase transition-colors">Hoje</button>
                  <button onClick={() => aplicarFiltroRapido('7DIAS')} className="text-[8px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 px-2 py-0.5 rounded font-bold uppercase transition-colors">7 Dias</button>
                  <button onClick={() => aplicarFiltroRapido('ESTE_MES')} className="text-[8px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 px-2 py-0.5 rounded font-bold uppercase transition-colors">Este Mês</button>
                  <button onClick={() => aplicarFiltroRapido('MES_PASSADO')} className="text-[8px] bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 px-2 py-0.5 rounded font-bold uppercase transition-colors">Mês Passado</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                <button onClick={() => setMostrarPortal(true)} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-[10px] font-black border hover:bg-slate-200 uppercase">🔍 Portal MA</button>
                {isAdmin && (
                  <>
                    <button onClick={() => baixarRelatorioPendentes('SEI')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold shadow-md transition-colors">📥 GERAR SEI</button>
                    <button onClick={() => baixarRelatorioPendentes('CONTA SALARIO')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold shadow-md transition-colors">📥 GERAR SALÁRIO</button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-2">
               {isAdmin && <button onClick={() => setMostrarGerenciarEquipe(true)} className="px-4 py-2 rounded-lg text-[10px] font-black transition-all bg-slate-900 text-white shadow-md hover:bg-slate-800 flex items-center gap-2">⚙️ EQUIPE</button>}
              {['TODOS', 'SEI', 'CONTA SALARIO'].map(f => (
                <button key={f} onClick={() => setFiltroMetodo(f)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filtroMetodo === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{f === 'CONTA SALARIO' ? 'SALÁRIO' : f}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 justify-center md:justify-end">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setOrdemData(prev => prev === 'DESC' ? 'ASC' : 'DESC')} className="px-4 py-2 rounded-lg text-[10px] font-black transition-all bg-white text-slate-900 shadow-sm hover:bg-blue-50 text-blue-800 flex items-center gap-2">
                    {ordemData === 'ASC' ? '⬆️ ANTIGAS PRIMEIRO' : '⬇️ RECENTES PRIMEIRO'}
                  </button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setFiltroStatus('PENDENTE')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex gap-1 ${filtroStatus === 'PENDENTE' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>⏳ PENDENTES</button>
                  <button onClick={() => setFiltroStatus('PAGO')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all flex gap-1 ${filtroStatus === 'PAGO' ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>✅ PAGOS</button>
                  <button onClick={() => setFiltroStatus('TODOS')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${filtroStatus === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VER TUDO</button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 col-span-1 lg:col-span-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Divisão de Custos (Total Filtrado)</h3>
              <div className="flex items-end gap-6 h-32 mt-4">
                <div className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                  <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">R$ {dashboardGastoSEI.toFixed(0)}</span>
                  <div className="w-full bg-blue-500 rounded-t-xl transition-all duration-1000" style={{ height: `${dashboardGastoTotal > 0 ? (dashboardGastoSEI / dashboardGastoTotal) * 100 : 0}%`, minHeight: '4px' }}></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase">SEI</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                  <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">R$ {dashboardGastoSalario.toFixed(0)}</span>
                  <div className="w-full bg-emerald-500 rounded-t-xl transition-all duration-1000" style={{ height: `${dashboardGastoTotal > 0 ? (dashboardGastoSalario / dashboardGastoTotal) * 100 : 0}%`, minHeight: '4px' }}></div>
                  <span className="text-[9px] font-black text-slate-600 uppercase">Salário</span>
                </div>
              </div>
              <div className="mt-4 text-center border-t border-slate-100 pt-4">
                <span className="text-2xl font-black text-slate-800">R$ {dashboardGastoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custo Total no Período</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 col-span-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top 5 Viajantes (Custo)</h3>
              <div className="flex flex-col gap-3">
                {rankingTop5.map((pessoa: any, index: number) => (
                  <div key={pessoa[0]} className="w-full">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                      <span className="truncate w-2/3 uppercase">{index + 1}. {pessoa[0]}</span>
                      <span>R$ {pessoa[1].toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-slate-800 h-2 rounded-full transition-all duration-1000" style={{ width: `${(pessoa[1] / maiorValorRanking) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
                {rankingTop5.length === 0 && <p className="text-xs text-center text-slate-400 mt-10">Nenhum dado.</p>}
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-[12px] border-blue-500 flex justify-between items-center transform hover:scale-[1.02] transition-transform duration-300">
               <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Novas Diárias SEI (A Gerar)</h3>
                  <p className="text-3xl font-black text-slate-900">R$ {totalNovoSEI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="bg-blue-50 p-3 rounded-2xl text-2xl">📂</div> 
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-[12px] border-emerald-500 flex justify-between items-center transform hover:scale-[1.02] transition-transform duration-300">
               <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Novas Diárias Salário (A Gerar)</h3>
                  <p className="text-3xl font-black text-slate-900">R$ {totalNovoSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="bg-emerald-50 p-3 rounded-2xl text-2xl">💳</div>
            </div>
          </div>
        )}

        {isAdmin && tabelasPendentesArray.length > 0 && (
          <div className="mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Pendências (Relatórios Já Gerados)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabelasPendentesArray.map((tabela: any, idx: number) => (
                <div key={idx} className="bg-amber-50 border border-amber-200 p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-2 h-full bg-amber-400"></div>
                   <div className="pl-3">
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex gap-2 items-center">
                         <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-100/80 px-2 py-1 rounded tracking-widest border border-amber-200">{tabela.metodo}</span>
                         <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">Gerada {new Date(tabela.data).toLocaleDateString('pt-BR')}</span>
                       </div>
                       <button onClick={() => excluirRelatorioGerado(tabela.ids)} className="text-amber-300 hover:text-red-500 transition-colors text-lg" title="Desfazer/Excluir Tabela">🗑️</button>
                     </div>
                     <p className="text-xs font-bold text-slate-500 mt-3 uppercase tracking-wider">Valor do Relatório</p>
                     <h3 className="text-2xl font-black text-slate-900 mb-1">R$ {tabela.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                     <p className="text-[10px] font-medium text-amber-700">{tabela.ids.length} diárias nesta tabela</p>
                   </div>
                   <div className="pl-3 mt-4 flex flex-col gap-2">
                      <button onClick={() => baixarRelatorioAntigo(tabela.metodo, tabela.ids, tabela.data)} className="bg-white border-2 border-amber-200 hover:bg-amber-50 text-amber-700 text-center py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm">
                        📥 Refazer Download
                      </button>
                      {tabela.comprovante_url ? (
                         <a href={tabela.comprovante_url} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-900 text-white text-center py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm">
                           📄 Ver Cópia Salva
                         </a>
                      ) : (
                         <label className="bg-white border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-100 text-amber-700 text-center py-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-2">
                           {uploadingTabela === tabela.key ? '⏳ Enviando...' : '📤 Anexar Backup (Excel/PDF)'}
                           <input type="file" className="hidden" accept=".xlsx, .xls, .pdf" disabled={uploadingTabela === tabela.key} onChange={(e) => handleUploadComprovante(e, tabela.ids, tabela.key)} />
                         </label>
                      )}
                      <button onClick={() => marcarTabelaPaga(tabela.ids)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-sm transition-all active:scale-95">
                        ✓ Marcar Tabela Paga
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border sticky top-40">
              <h2 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Novo Registro</h2>
              <form onSubmit={cadastrarDiaria} className="flex flex-col gap-3">
                <AutocompleteInput name="nome" placeholder="Nome do Servidor (Digite para buscar)" value={formNome} onChange={(e: any) => { setFormNome(e.target.value); const serv = servidores.find(s => s.nome.toUpperCase() === e.target.value.toUpperCase()); if(serv && serv.cargo) setFormCargo(serv.cargo); }} sugestoes={sugestoesNomes} required />
                {metodoSelecionado === 'CONTA SALARIO' && <AutocompleteInput name="cargo" placeholder="Cargo" value={formCargo} onChange={(e: any) => setFormCargo(e.target.value)} sugestoes={sugestoesCargos} />}
                <input name="adolescente_nome" placeholder="Adolescente / Motivo" className="border p-3 rounded-xl bg-slate-50 text-sm font-medium uppercase" onInput={(e) => e.currentTarget.value = e.currentTarget.value.toUpperCase()} required />
                <div className="grid grid-cols-2 gap-2"><input name="data" type="date" className="border p-3 rounded-xl bg-slate-50 text-xs font-bold text-slate-600" required /><input name="valor" type="number" step="0.01" placeholder="R$ Valor" className="border p-3 rounded-xl bg-slate-50 text-sm font-bold" required /></div>
                {metodoSelecionado === 'CONTA SALARIO' && <input name="quantidade" type="number" placeholder="Qtd. Diárias" className="border-2 border-emerald-100 p-3 rounded-xl bg-emerald-50 text-sm font-medium text-emerald-800" />}
                <AutocompleteInput name="local" placeholder="Destino / Cidade" value={formLocal} onChange={(e: any) => setFormLocal(e.target.value)} sugestoes={sugestoesLocais} required />
                <select value={metodoSelecionado} onChange={(e) => setMetodoSelecionado(e.target.value)} className="border p-3 rounded-xl bg-slate-100 text-sm font-bold outline-none cursor-pointer"><option value="SEI">SISTEMA SEI</option><option value="CONTA SALARIO">CONTA SALÁRIO</option></select>
                {metodoSelecionado === 'SEI' && <input name="numero_processo" placeholder="Nº Processo SEI" className="border-2 border-blue-100 p-3 rounded-xl bg-blue-50 text-sm font-bold text-blue-800 uppercase" onInput={(e) => e.currentTarget.value = e.currentTarget.value.toUpperCase()} />}
                <textarea name="observacoes" placeholder="Observações..." className="border p-3 rounded-xl bg-slate-50 text-sm resize-none" rows={2} />
                <div className="flex items-center gap-2 px-1 py-1"><input type="checkbox" id="manterDados" checked={manterDados} onChange={(e) => setManterDados(e.target.checked)} className="w-4 h-4 cursor-pointer accent-slate-900" /><label htmlFor="manterDados" className="text-[10px] font-black text-slate-500 uppercase cursor-pointer select-none hover:text-slate-800 transition-colors">Manter dados para próxima pessoa</label></div>
                <button className="bg-slate-900 text-white font-black py-4 rounded-xl uppercase text-xs shadow-lg hover:bg-black transition-all active:scale-95">Salvar Diária</button>
              </form>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-4">
              {diariasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 opacity-50"><div className="text-4xl mb-2">📭</div><p className="font-bold text-slate-400">Nenhum registro encontrado.</p></div>
              ) : (
                diariasFiltradas.map((item) => (
                  <div key={item.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-[12px] transition-all duration-300 ${item.pago ? 'border-green-500 bg-slate-50 opacity-80 hover:opacity-100' : 'border-red-500 shadow-md transform hover:-translate-y-1'}`}>
                    {idEditando === item.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                        <div className="col-span-2 text-[10px] font-black text-blue-600 mb-2 italic">EDITANDO REGISTRO</div>
                        <input value={dadosEditados.nome || ""} onChange={e => setDadosEditados({...dadosEditados, nome: e.target.value.toUpperCase()})} className="border p-2 rounded-lg text-sm uppercase" placeholder="Nome" />
                        <input value={dadosEditados.adolescente_nome || ""} onChange={e => setDadosEditados({...dadosEditados, adolescente_nome: e.target.value.toUpperCase()})} className="border p-2 rounded-lg text-sm uppercase" placeholder="Adolescente" />
                        <input type="date" value={dadosEditados.data_viagem || ""} onChange={e => setDadosEditados({...dadosEditados, data_viagem: e.target.value})} className="border p-2 rounded-lg text-sm" />
                        <input value={dadosEditados.local_viagem || ""} onChange={e => setDadosEditados({...dadosEditados, local_viagem: e.target.value.toUpperCase()})} className="border p-2 rounded-lg text-sm uppercase" placeholder="Destino" />
                        <input value={dadosEditados.numero_processo || ""} onChange={e => setDadosEditados({...dadosEditados, numero_processo: e.target.value.toUpperCase()})} className="border p-2 rounded-lg text-sm uppercase" placeholder="Processo" />
                        <input type="number" value={dadosEditados.valor || ""} onChange={e => setDadosEditados({...dadosEditados, valor: e.target.value})} className="border p-2 rounded-lg text-sm" />
                        <input value={dadosEditados.cargo || ""} onChange={e => setDadosEditados({...dadosEditados, cargo: e.target.value.toUpperCase()})} className="border p-2 rounded-lg text-sm uppercase" placeholder="Cargo" />
                        <input value={dadosEditados.quantidade || ""} onChange={e => setDadosEditados({...dadosEditados, quantidade: e.target.value})} className="border p-2 rounded-lg text-sm" placeholder="Qtd" />
                        <textarea value={dadosEditados.observacoes || ""} onChange={e => setDadosEditados({...dadosEditados, observacoes: e.target.value})} className="col-span-2 border p-2 rounded-lg text-sm" placeholder="Observações" />
                        <div className="col-span-2 flex gap-2 mt-2"><button onClick={salvarEdicao} className="flex-1 bg-green-600 text-white p-3 rounded-xl font-bold uppercase text-[10px]">Salvar Alterações</button><button onClick={() => setIdEditando(null)} className="flex-1 bg-slate-200 text-slate-600 p-3 rounded-xl font-bold uppercase text-[10px]">Cancelar</button></div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${item.pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>{item.pago ? '✓ PAGO' : '⚠ PENDENTE'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">{formatarDataBR(item.data_viagem)}</span>
                            {item.data_ultima_exportacao && !item.pago && (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md uppercase">📥 Tabela Gerada</span>
                            )}
                          </div>
                          <h3 className="font-black text-slate-800 uppercase text-lg leading-tight">{item.nome}</h3>
                          <p className="text-xs font-bold text-blue-600 uppercase mt-1">👦 {item.adolescente_nome}</p>
                          <div className="mt-3 bg-white border border-slate-100 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                            <p className="flex items-center gap-2">📍 <span className="font-bold text-slate-800 uppercase">{item.local_viagem}</span></p>
                            <p className="uppercase">📄 {item.metodo_pagamento} {item.numero_processo ? `| SEI: ${item.numero_processo}` : ''}</p>
                            {item.observacoes && <p className="italic text-slate-400 mt-2 border-t pt-1 border-slate-100">Obs: "{item.observacoes}"</p>}
                          </div>
                        </div>
                        <div className="md:text-right flex flex-col justify-between items-end border-t md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0">
                          <div className="text-right">
                             <p className="font-black text-slate-900 text-2xl">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</p>
                             <div className="text-[9px] text-slate-400 mt-2 space-y-0.5">
                               {item.created_at && <p className="flex items-center justify-end gap-1">➕ {new Date(item.created_at).toLocaleDateString('pt-BR')} <span className="bg-slate-100 text-slate-500 px-1 rounded font-bold">{item.usuario_alteracao ? `por ${item.usuario_alteracao}` : ''}</span></p>}
                               {item.updated_at && <p className="text-amber-600 font-bold italic flex items-center justify-end gap-1">✏️ Edt: {new Date(item.updated_at).toLocaleDateString('pt-BR')}<span className="bg-amber-50 text-amber-600 px-1 rounded border border-amber-100">{item.usuario_alteracao ? `por ${item.usuario_alteracao}` : ''}</span></p>}
                             </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2 mt-4 w-full md:w-auto">
                              <button onClick={() => alternarPagamento(item.id, item.pago)} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${item.pago ? 'bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>{item.pago ? 'DESMARCAR' : 'MARCAR PAGO'}</button>
                              <button onClick={() => iniciarEdicao(item)} className="bg-white border-2 border-slate-100 px-4 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">✏️</button>
                              <button onClick={() => excluirDiaria(item.id)} className="bg-white border-2 border-slate-100 px-4 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {mostrarPortal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md"><h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">Portal da Transparência</h2><button onClick={() => setMostrarPortal(false)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-full text-xs font-bold transition-colors">FECHAR</button></div>
            <iframe src="https://www.transparencia.ma.gov.br/app/v2/pessoal" className="flex-1 w-full border-none bg-slate-50" title="Portal da Transparência" />
          </div>
        </div>
      )}

      <div className="fixed bottom-2 right-0 left-0 text-center pointer-events-none z-40">
        <p className="text-[9px] font-bold text-slate-400 opacity-50 uppercase tracking-widest">Sistema Seguro/LGPD • Dev: Educador Social Junior</p>
      </div>

      {isAdmin && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-72 z-50">
          <button onClick={enviarRelatorioWhats} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-2xl border-2 border-slate-700 tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2">
            <span>💬</span> Cobrar Pendentes
          </button>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideDown { 0% { transform: translate(-50%, -150%); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  )
}