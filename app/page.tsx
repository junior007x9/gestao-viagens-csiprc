"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function DiariasDashboard() {
  const [diarias, setDiarias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // --- SEGURANÇA E FILTROS ---
  const [estaAutenticado, setEstaAutenticado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS')
  const [metodoSelecionado, setMetodoSelecionado] = useState('SEI')
  
  // Estados para Edição
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [dadosEditados, setDadosEditados] = useState<any>({})

  const SENHA_MESTRA = "1234" 

  const fetchDiarias = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('diarias')
        .select('*')
        .order('data_viagem', { ascending: false })
      
      if (error) throw error
      setDiarias(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (estaAutenticado) fetchDiarias()
  }, [estaAutenticado, fetchDiarias])

  const verificarSenha = (e: React.FormEvent) => {
    e.preventDefault()
    if (senhaInput === SENHA_MESTRA) setEstaAutenticado(true)
    else alert("Senha incorreta!")
  }

  const diariasFiltradas = diarias.filter(d => {
    const busca = (
      (d.nome || "") + 
      (d.adolescente_nome || "") + 
      (d.numero_processo || "") + 
      (d.local_viagem || "")
    ).toLowerCase()
    return busca.includes(pesquisa.toLowerCase()) && (filtroMetodo === 'TODOS' || d.metodo_pagamento === filtroMetodo)
  })

  // --- FUNÇÕES DE AÇÃO ---
  const iniciarEdicao = (item: any) => {
    setIdEditando(item.id)
    setDadosEditados({ ...item })
  }

  const salvarEdicao = async () => {
    const { error } = await supabase
      .from('diarias')
      .update(dadosEditados)
      .eq('id', idEditando)

    if (error) alert("Erro ao atualizar!")
    else {
      setIdEditando(null)
      fetchDiarias()
    }
  }

  async function alternarPagamento(id: string, statusAtual: boolean) {
    const agora = new Date().toISOString()
    await supabase.from('diarias').update({ 
      pago: !statusAtual, 
      data_pagamento: !statusAtual ? agora : null 
    }).eq('id', id)
    fetchDiarias()
  }

  async function cadastrarDiaria(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const novaDiaria = {
      nome: formData.get('nome'),
      adolescente_nome: formData.get('adolescente_nome'),
      data_viagem: formData.get('data'),
      local_viagem: formData.get('local'),
      valor: parseFloat(formData.get('valor') as string) || 0,
      metodo_pagamento: formData.get('metodo_pagamento'),
      numero_processo: formData.get('numero_processo'),
      observacoes: formData.get('observacoes'),
      pago: false
    }
    await supabase.from('diarias').insert([novaDiaria])
    form.reset(); fetchDiarias()
  }

  async function excluirDiaria(id: string) {
    if (confirm("Excluir registro permanentemente?")) {
      await supabase.from('diarias').delete().eq('id', id)
      fetchDiarias()
    }
  }

  const enviarRelatorioWhats = () => {
    let texto = `*GESTÃO DE VIAGENS CSIPRC*\n\n`
    diariasFiltradas.forEach(d => {
      texto += `${d.pago ? "PAGO ✅" : "PENDENTE ❌"}\n🗓️ *Data:* ${d.data_viagem}\n👤 *F*: ${d.nome}\n👦 *A*: ${d.adolescente_nome}\n📍 ${d.local_viagem}\n💰 R$ ${Number(d.valor).toFixed(2).replace('.', ',')}\n${d.numero_processo ? "📄 Proc: " + d.numero_processo + "\n" : ""}----------------------------\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (!estaAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={verificarSenha} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-6 tracking-tighter uppercase italic">CSIPRC</h1>
          <input type="password" placeholder="SENHA" className="w-full border-2 p-4 rounded-2xl mb-4 text-center outline-none focus:border-blue-500 text-slate-900" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} />
          <button className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl shadow-lg">ACESSAR</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8 text-slate-900 font-sans pb-28">
      <div className="max-w-md mx-auto">
        
        {/* Header e Filtros */}
        <header className="bg-white p-5 rounded-[2rem] shadow-sm border mb-4">
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-center">Gestão CSIPRC</h1>
          <input type="text" placeholder="🔍 Buscar funcionário, menor ou processo..." className="w-full bg-slate-100 border-none p-3 mt-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
          <div className="flex gap-2 mt-4">
            {['TODOS', 'SEI', 'CONTA SALARIO'].map(m => (
              <button key={m} onClick={() => setFiltroMetodo(m)} className={`flex-1 py-2 rounded-lg text-[9px] font-bold border ${filtroMetodo === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>{m === 'CONTA SALARIO' ? 'SALÁRIO' : m}</button>
            ))}
          </div>
        </header>

        {/* Formulário Cadastro */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border mb-6">
          <form onSubmit={cadastrarDiaria} className="flex flex-col gap-3 text-slate-900">
            <input name="nome" placeholder="Funcionário" className="border p-3 rounded-xl bg-slate-50 text-sm" required />
            <input name="adolescente_nome" placeholder="Adolescente" className="border p-3 rounded-xl bg-slate-50 text-sm" required />
            <div className="grid grid-cols-2 gap-2">
              <input name="data" type="date" className="border p-3 rounded-xl bg-slate-50 text-xs" required />
              <input name="valor" type="number" step="0.01" placeholder="R$" className="border p-3 rounded-xl bg-slate-50 text-sm" required />
            </div>
            <input name="local" placeholder="Destino" className="border p-3 rounded-xl bg-slate-50 text-sm" required />
            <select name="metodo_pagamento" className="border p-3 rounded-xl bg-slate-50 text-sm" onChange={(e) => setMetodoSelecionado(e.target.value)}>
              <option value="SEI">SEI</option>
              <option value="CONTA SALARIO">CONTA SALÁRIO</option>
            </select>
            {metodoSelecionado === 'SEI' && <input name="numero_processo" placeholder="Nº Processo SEI" className="border-2 border-blue-100 p-3 rounded-xl bg-blue-50 text-sm font-bold" />}
            <input name="observacoes" placeholder="Observações (Opcional)" className="border p-3 rounded-xl bg-slate-50 text-sm" />
            <button className="bg-blue-600 text-white font-black py-3 rounded-xl uppercase text-xs shadow-md">Salvar Novo</button>
          </form>
        </div>

        {/* Lista de Registros */}
        <div className="space-y-4">
          {diariasFiltradas.map((item) => (
            <div key={item.id} className={`bg-white p-4 rounded-[2rem] shadow-sm border-l-[10px] transition-all ${item.pago ? 'border-green-500' : 'border-red-500'}`}>
              
              {idEditando === item.id ? (
                /* MODO EDIÇÃO */
                <div className="space-y-2 text-slate-900">
                  <input value={dadosEditados.nome} onChange={e => setDadosEditados({...dadosEditados, nome: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Funcionário"/>
                  <input value={dadosEditados.adolescente_nome} onChange={e => setDadosEditados({...dadosEditados, adolescente_nome: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Adolescente"/>
                  <input type="date" value={dadosEditados.data_viagem} onChange={e => setDadosEditados({...dadosEditados, data_viagem: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/>
                  <input value={dadosEditados.local_viagem} onChange={e => setDadosEditados({...dadosEditados, local_viagem: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Local"/>
                  <input type="number" value={dadosEditados.valor} onChange={e => setDadosEditados({...dadosEditados, valor: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Valor"/>
                  <input value={dadosEditados.numero_processo || ""} onChange={e => setDadosEditados({...dadosEditados, numero_processo: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Nº Processo"/>
                  <div className="flex gap-2 pt-2">
                    <button onClick={salvarEdicao} className="flex-1 bg-green-600 text-white p-2 rounded-xl font-bold uppercase text-[10px]">Confirmar</button>
                    <button onClick={() => setIdEditando(null)} className="flex-1 bg-slate-200 text-slate-600 p-2 rounded-xl font-bold uppercase text-[10px]">Cancelar</button>
                  </div>
                </div>
              ) : (
                /* MODO VISUALIZAÇÃO */
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div className="max-w-[70%]">
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full mb-1 inline-block uppercase italic">🗓️ {item.data_viagem}</span>
                      <h3 className="font-black text-slate-800 uppercase text-xs truncate">{item.nome}</h3>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">👦 {item.adolescente_nome}</p>
                    </div>
                    <p className="font-black text-slate-900 text-sm">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl mb-3 text-[11px] text-slate-600">
                    <div className="flex justify-between items-center mb-1">
                        <p className="font-bold text-slate-400 uppercase text-[8px]">📍 {item.local_viagem}</p>
                        <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded-md border">{item.metodo_pagamento}</span>
                    </div>
                    {item.numero_processo && <p className="text-blue-700 font-bold text-[9px] mb-1">📄 SEI: {item.numero_processo}</p>}
                    {item.observacoes && <p className="italic text-slate-500 border-t pt-1 mt-1">"{item.observacoes}"</p>}
                    {item.data_pagamento && (
                      <p className="mt-2 text-[9px] font-black text-green-600 uppercase" suppressHydrationWarning>
                        ✅ Pago: {new Date(item.data_pagamento).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => alternarPagamento(item.id, item.pago)} className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${item.pago ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-lg shadow-red-100'}`}>
                      {item.pago ? 'PAGO ✓' : 'MARCAR PAGO'}
                    </button>
                    <button onClick={() => iniciarEdicao(item)} className="bg-slate-100 px-4 rounded-xl text-sm border">✏️</button>
                    <button onClick={() => excluirDiaria(item.id)} className="bg-slate-100 px-4 rounded-xl text-sm border opacity-30">🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Relatório WhatsApp */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
             <button onClick={enviarRelatorioWhats} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-2xl border border-slate-700 tracking-widest">Gerar Relatório WhatsApp</button>
        </div>
      </div>
    </div>
  )
}
