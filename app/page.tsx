"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function DiariasDashboard() {
  const [diarias, setDiarias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [estaAutenticado, setEstaAutenticado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS')
  const [metodoSelecionado, setMetodoSelecionado] = useState('SEI')
  
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
      console.error('Erro:', error.message)
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
    const busca = ((d.nome || "") + (d.adolescente_nome || "") + (d.numero_processo || "") + (d.local_viagem || "")).toLowerCase()
    return busca.includes(pesquisa.toLowerCase()) && (filtroMetodo === 'TODOS' || d.metodo_pagamento === filtroMetodo)
  })

  const iniciarEdicao = (item: any) => {
    setIdEditando(item.id)
    setDadosEditados({ ...item })
  }

  const salvarEdicao = async () => {
    const { error } = await supabase.from('diarias').update(dadosEditados).eq('id', idEditando)
    if (!error) { setIdEditando(null); fetchDiarias() }
  }

  async function alternarPagamento(id: string, statusAtual: boolean) {
    const agora = new Date().toISOString()
    await supabase.from('diarias').update({ pago: !statusAtual, data_pagamento: !statusAtual ? agora : null }).eq('id', id)
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
    if (confirm("Excluir registro?")) {
      await supabase.from('diarias').delete().eq('id', id)
      fetchDiarias()
    }
  }

  const enviarRelatorioWhats = () => {
    let texto = `*GESTÃO DE VIAGENS CSIPRC*\n\n`
    diariasFiltradas.forEach(d => {
      texto += `${d.pago ? "PAGO ✅" : "PENDENTE ❌"}\n🗓️ *Data:* ${d.data_viagem}\n👤 *F*: ${d.nome}\n👦 *A*: ${d.adolescente_nome}\n📍 ${d.local_viagem}\n💰 R$ ${Number(d.valor).toFixed(2)}\n----------------------------\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (!estaAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={verificarSenha} className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm">
          <h1 className="text-3xl font-black text-slate-800 mb-6 text-center italic">CSIPRC</h1>
          <input type="password" placeholder="SENHA" className="w-full border-2 p-4 rounded-2xl mb-4 text-center text-slate-900" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} />
          <button className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl hover:bg-blue-700 transition-colors">ACESSAR</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Navbar Responsiva */}
      <nav className="bg-white border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-center md:text-left">Gestão CSIPRC</h1>
          <div className="flex-1 max-w-xl">
            <input type="text" placeholder="🔍 Pesquisar em tudo..." className="w-full bg-slate-100 border-none p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {['TODOS', 'SEI', 'CONTA SALARIO'].map(m => (
              <button key={m} onClick={() => setFiltroMetodo(m)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-bold border transition-colors ${filtroMetodo === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>{m === 'CONTA SALARIO' ? 'SALÁRIO' : m}</button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Coluna de Cadastro (Fixa no Desktop) */}
          <aside className="lg:col-span-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border sticky top-24">
              <h2 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Novo Registro</h2>
              <form onSubmit={cadastrarDiaria} className="flex flex-col gap-3">
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
                <textarea name="observacoes" placeholder="Observações..." className="border p-3 rounded-xl bg-slate-50 text-sm resize-none" rows={2} />
                <button className="bg-blue-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition-all">Salvar Diária</button>
              </form>
            </div>
          </aside>

          {/* Coluna de Listagem (Grid de Cards) */}
          <section className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diariasFiltradas.map((item) => (
                <div key={item.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border-l-[12px] flex flex-col justify-between transition-all hover:shadow-md ${item.pago ? 'border-green-500' : 'border-red-500'}`}>
                  
                  {idEditando === item.id ? (
                    <div className="space-y-3">
                      <input value={dadosEditados.nome} onChange={e => setDadosEditados({...dadosEditados, nome: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                      <input value={dadosEditados.adolescente_nome} onChange={e => setDadosEditados({...dadosEditados, adolescente_nome: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                      <div className="flex gap-2">
                        <button onClick={salvarEdicao} className="flex-1 bg-green-600 text-white p-3 rounded-xl font-bold uppercase text-[10px]">Salvar</button>
                        <button onClick={() => setIdEditando(null)} className="flex-1 bg-slate-100 p-3 rounded-xl font-bold uppercase text-[10px]">Sair</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-1 rounded-md uppercase mb-2 inline-block italic">🗓️ {item.data_viagem}</span>
                            <h3 className="font-black text-slate-800 uppercase text-sm leading-tight">{item.nome}</h3>
                            <p className="text-[11px] font-bold text-blue-600 uppercase mt-1">👦 {item.adolescente_nome}</p>
                          </div>
                          <p className="font-black text-slate-900 text-lg">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl mb-4 text-xs text-slate-600 space-y-2">
                          <p className="flex justify-between">
                            <span className="font-bold text-slate-400">DESTINO:</span>
                            <span className="font-black text-slate-700">📍 {item.local_viagem}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="font-bold text-slate-400">MÉTODO:</span>
                            <span className="bg-white px-2 rounded border font-bold">{item.metodo_pagamento}</span>
                          </p>
                          {item.numero_processo && (
                            <p className="text-blue-700 font-bold bg-blue-50 p-2 rounded-lg">📄 SEI: {item.numero_processo}</p>
                          )}
                          {item.observacoes && <p className="italic text-slate-500 pt-2 border-t font-medium">"{item.observacoes}"</p>}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => alternarPagamento(item.id, item.pago)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all ${item.pago ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-lg'}`}>
                          {item.pago ? 'PAGO ✓' : 'MARCAR PAGO'}
                        </button>
                        <button onClick={() => iniciarEdicao(item)} className="bg-slate-100 px-4 rounded-xl hover:bg-blue-50 border transition-colors">✏️</button>
                        <button onClick={() => excluirDiaria(item.id)} className="bg-slate-100 px-4 rounded-xl hover:bg-red-50 border opacity-40 hover:opacity-100 transition-colors text-xs">🗑️</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Botão WhatsApp - Estilo Flutuante Adaptável */}
      <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-72 z-50">
        <button onClick={enviarRelatorioWhats} className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[10px] font-black uppercase shadow-2xl border border-slate-700 tracking-[0.2em] hover:scale-105 transition-transform">
          Gerar Relatório WhatsApp
        </button>
      </div>
    </div>
  )
}
