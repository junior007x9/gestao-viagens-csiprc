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
  
  const SENHA_MESTRA = "erasmo" 

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
    const nomeNormalizado = d.nome ? d.nome.toLowerCase() : ""
    const adolescenteNormalizado = d.adolescente_nome ? d.adolescente_nome.toLowerCase() : ""
    const correspondeBusca = nomeNormalizado.includes(pesquisa.toLowerCase()) || adolescenteNormalizado.includes(pesquisa.toLowerCase())
    const correspondeMetodo = filtroMetodo === 'TODOS' ? true : d.metodo_pagamento === filtroMetodo
    return correspondeBusca && correspondeMetodo
  })

  async function alternarPagamento(id: string, statusAtual: boolean) {
    const agora = new Date().toISOString()
    const { error } = await supabase
      .from('diarias')
      .update({ 
        pago: !statusAtual,
        data_pagamento: !statusAtual ? agora : null 
      })
      .eq('id', id)
    
    if (error) alert("Erro ao atualizar")
    else fetchDiarias()
  }

  async function cadastrarDiaria(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const novaDiaria = {
      nome: formData.get('nome') as string,
      adolescente_nome: formData.get('adolescente_nome') as string, // Novo campo
      data_viagem: formData.get('data') as string,
      local_viagem: formData.get('local') as string,
      valor: parseFloat(formData.get('valor') as string) || 0,
      metodo_pagamento: formData.get('metodo_pagamento') as string,
      observacoes: formData.get('observacoes') as string,
      pago: false
    }
    const { error } = await supabase.from('diarias').insert([novaDiaria])
    if (error) alert("Erro ao salvar!")
    else { form.reset(); fetchDiarias() }
  }

  async function excluirDiaria(id: string) {
    if (!confirm("Excluir registro?")) return
    await supabase.from('diarias').delete().eq('id', id)
    fetchDiarias()
  }

  const enviarRelatorioWhats = () => {
    let texto = `*GESTÃO DE VIAGENS CSIPRC*\n\n`
    diariasFiltradas.forEach(d => {
      const status = d.pago ? "PAGO ✅" : "PENDENTE ❌"
      texto += `${status}\n👤 *Funcionário:* ${d.nome}\n👶 *Adolescente:* ${d.adolescente_nome || 'Não informado'}\n📍 *Viagem:* ${d.local_viagem}\n💰 *Valor:* R$ ${Number(d.valor).toFixed(2).replace('.', ',')}\n`
      if (d.observacoes) texto += `📝 *Nota:* ${d.observacoes}\n`
      texto += `----------------------------\n`
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (!estaAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={verificarSenha} className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-black text-slate-800 mb-6 italic tracking-tighter">CSIPRC</h1>
          <input 
            type="password" 
            placeholder="Senha de Acesso" 
            className="w-full border-2 p-4 rounded-2xl mb-4 text-center outline-none focus:border-blue-500 transition-all text-slate-900"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl shadow-lg active:scale-95 transition-all">ENTRAR</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-8 text-slate-900 font-sans pb-24">
      <div className="max-w-md mx-auto">
        
        {/* Header e Pesquisa */}
        <header className="bg-white p-5 rounded-[2rem] shadow-sm border mb-4">
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-center">Gestão CSIPRC</h1>
          
          <div className="mt-4 relative">
            <input 
              type="text" 
              placeholder="🔍 Buscar nome ou adolescente..." 
              className="w-full bg-slate-100 border-none p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </div>

          <div className="flex justify-between gap-2 mt-4">
            <button onClick={() => setFiltroMetodo('TODOS')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${filtroMetodo === 'TODOS' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>Todos</button>
            <button onClick={() => setFiltroMetodo('SEI')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${filtroMetodo === 'SEI' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>SEI</button>
            <button onClick={() => setFiltroMetodo('CONTA SALARIO')} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${filtroMetodo === 'CONTA SALARIO' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>Salário</button>
          </div>
        </header>

        {/* Cadastro */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border mb-6">
          <h2 className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">Novo Registro</h2>
          <form onSubmit={cadastrarDiaria} className="flex flex-col gap-3">
            <input name="nome" placeholder="Nome do Funcionário" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900" required />
            <input name="adolescente_nome" placeholder="Nome do Adolescente" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900" required />
            <div className="grid grid-cols-2 gap-2">
              <input name="data" type="date" className="border p-3 rounded-xl bg-slate-50 text-xs text-slate-900" required />
              <input name="valor" type="number" step="0.01" placeholder="Valor R$" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900" required />
            </div>
            <input name="local" placeholder="Local da Viagem" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900" required />
            <select name="metodo_pagamento" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900">
              <option value="SEI">SEI</option>
              <option value="CONTA SALARIO">CONTA SALÁRIO</option>
            </select>
            <input name="observacoes" placeholder="Anotação (Opcional)" className="border p-3 rounded-xl bg-slate-50 text-sm text-slate-900" />
            <button type="submit" className="bg-blue-600 text-white font-black py-3 rounded-xl uppercase text-[10px] shadow-md active:scale-95 transition-all">Salvar Diária</button>
          </form>
        </div>

        {/* Lista de Cards */}
        <div className="space-y-4">
          {diariasFiltradas.map((item) => (
            <div key={item.id} className={`bg-white p-4 rounded-[2rem] shadow-sm border-l-[10px] transition-all ${item.pago ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="max-w-[70%]">
                  <h3 className="font-black text-slate-800 uppercase text-xs truncate">{item.nome}</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">👦 {item.adolescente_nome}</p>
                </div>
                <p className="font-black text-slate-900 text-sm">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl mb-3 text-[11px] text-slate-600">
                <p className="font-bold text-slate-400 uppercase text-[8px] mb-1">Destino & Método</p>
                <p className="mb-2">📍 {item.local_viagem} • {item.metodo_pagamento}</p>
                
                {item.observacoes && (
                  <>
                    <p className="font-bold text-slate-400 uppercase text-[8px] mb-1 border-t pt-2">Anotação</p>
                    <p className="italic text-slate-500">"{item.observacoes}"</p>
                  </>
                )}

                {item.data_pagamento && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="text-[9px] font-black text-green-600 block uppercase">✅ Confirmado em:</span>
                    <span className="text-[10px] font-medium text-green-700">{new Date(item.data_pagamento).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => alternarPagamento(item.id, item.pago)}
                  className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${item.pago ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white shadow-lg shadow-red-100'}`}>
                  {item.pago ? 'PAGO ✓' : 'MARCAR PAGO'}
                </button>
                <button onClick={() => excluirDiaria(item.id)} className="bg-slate-100 px-5 rounded-xl text-xs opacity-20 hover:opacity-100 transition-all">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-900/90 backdrop-blur p-2 rounded-2xl shadow-2xl border border-slate-700">
             <button onClick={enviarRelatorioWhats} className="bg-green-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Relatório WhatsApp</button>
        </div>
      </div>
    </div>
  )
}
