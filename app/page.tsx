"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function DiariasDashboard() {
  const [diarias, setDiarias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [dadosEditados, setDadosEditados] = useState<any>({})

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
    fetchDiarias()
  }, [fetchDiarias])

  const diariasFiltradas = diarias.filter(d => 
    filtroMetodo === 'TODOS' ? true : d.metodo_pagamento === filtroMetodo
  )

  const iniciarEdicao = (item: any) => {
    setEditandoId(item.id)
    setDadosEditados({ ...item })
  }

  const salvarEdicao = async () => {
    const { error } = await supabase
      .from('diarias')
      .update({
        nome: dadosEditados.nome,
        data_viagem: dadosEditados.data_viagem,
        local_viagem: dadosEditados.local_viagem,
        valor: parseFloat(dadosEditados.valor),
        metodo_pagamento: dadosEditados.metodo_pagamento,
        observacoes: dadosEditados.observacoes
      })
      .eq('id', editandoId)

    if (error) {
      alert("Erro ao atualizar!")
    } else {
      setEditandoId(null)
      fetchDiarias()
    }
  }

  async function cadastrarDiaria(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const novaDiaria = {
      nome: formData.get('nome') as string,
      data_viagem: formData.get('data') as string,
      local_viagem: formData.get('local') as string,
      valor: parseFloat(formData.get('valor') as string),
      metodo_pagamento: formData.get('metodo_pagamento') as string,
      observacoes: formData.get('observacoes') as string,
      pago: false
    }
    const { error } = await supabase.from('diarias').insert([novaDiaria])
    if (error) alert("Erro ao salvar!")
    else { form.reset(); fetchDiarias() }
  }

  // --- FUNÇÃO CORRIGIDA: REMOVE O SÍMBOLO  E FORMATA LIMPO ---
  const enviarRelatorioWhats = (tipo: 'GERAL' | 'SEI' | 'SALARIO') => {
    let lista = diarias
    let titulo = "*GESTÃO DE VIAGENS CSIPRC*"

    if (tipo === 'SEI') {
      lista = diarias.filter(d => d.metodo_pagamento === 'SEI')
      titulo = "*GESTÃO DE VIAGENS CSIPRC - RELATÓRIO SEI*"
    } else if (tipo === 'SALARIO') {
      lista = diarias.filter(d => d.metodo_pagamento === 'CONTA SALARIO')
      titulo = "*GESTÃO DE VIAGENS CSIPRC - RELATÓRIO CONTA SALÁRIO*"
    }

    if (lista.length === 0) {
      alert("Nenhum registro para este relatório.")
      return
    }

    let texto = `${titulo}\n\n`
    
    lista.forEach(d => {
      // Usamos apenas emojis padrão e texto sem caracteres especiais ocultos
      const status = d.pago ? "PAGO ✅" : "PENDENTE ❌"
      texto += `${status}\n`
      texto += `👤 *Nome:* ${d.nome}\n`
      texto += `📍 *Viagem:* ${d.local_viagem} / ${d.metodo_pagamento}\n`
      texto += `💰 *Valor:* R$ ${Number(d.valor).toFixed(2).replace('.', ',')}\n`
      if (d.observacoes) texto += `📝 *Obs:* ${d.observacoes}\n`
      texto += `----------------------------\n`
    })

    // O uso de encodeURIComponent garante que o WhatsApp entenda a mensagem sem erros
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  async function alternarPagamento(id: string, statusAtual: boolean) {
    await supabase.from('diarias').update({ pago: !statusAtual }).eq('id', id)
    fetchDiarias()
  }

  async function excluirDiaria(id: string) {
    if (!confirm("Excluir?")) return
    await supabase.from('diarias').delete().eq('id', id)
    fetchDiarias()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans text-sm">
      <div className="max-w-7xl mx-auto">
        
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black text-slate-800 uppercase italic">Gestão de Viagens CSIPRC</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => enviarRelatorioWhats('SEI')} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all shadow-md">Relatório SEI</button>
            <button onClick={() => enviarRelatorioWhats('SALARIO')} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-green-700 transition-all shadow-md">Relatório Salário</button>
            <button onClick={() => enviarRelatorioWhats('GERAL')} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-900 transition-all shadow-md">Geral ✅/❌</button>
          </div>
        </header>

        {/* Cadastro */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Novo Registro</h2>
          <form onSubmit={cadastrarDiaria} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            <input name="nome" placeholder="Nome" className="border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
            <input name="data" type="date" className="border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
            <input name="local" placeholder="Local" className="border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
            <input name="valor" type="number" step="0.01" placeholder="Valor R$" className="border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
            <select name="metodo_pagamento" className="border p-3 rounded-xl bg-slate-50 cursor-pointer" required>
              <option value="SEI">SEI</option>
              <option value="CONTA SALARIO">CONTA SALÁRIO</option>
            </select>
            <input name="observacoes" placeholder="Anotação (Opcional)" className="border p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            <button type="submit" className="bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 uppercase text-xs shadow-lg transition-all">Salvar</button>
          </form>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <span className="font-bold text-slate-500 text-[10px] uppercase tracking-widest ml-2">Visualizar:</span>
          <button onClick={() => setFiltroMetodo('TODOS')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filtroMetodo === 'TODOS' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Todos</button>
          <button onClick={() => setFiltroMetodo('SEI')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filtroMetodo === 'SEI' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>SEI</button>
          <button onClick={() => setFiltroMetodo('CONTA SALARIO')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filtroMetodo === 'CONTA SALARIO' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Salário</button>
        </div>

        {/* Tabela */}
        <div className="bg-white shadow-xl rounded-[2.5rem] overflow-hidden border">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="p-6">Pessoa</th>
                <th className="p-6">Viagem / Método</th>
                <th className="p-6">Valor</th>
                <th className="p-6 text-center">Obs</th>
                <th className="p-6 text-center">Status</th>
                <th className="p-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diariasFiltradas.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className={`hover:bg-slate-50 ${editandoId === item.id ? 'bg-yellow-50' : ''}`}>
                    <td className="p-6">
                      {editandoId === item.id ? (
                        <input value={dadosEditados.nome} onChange={e => setDadosEditados({...dadosEditados, nome: e.target.value})} className="border p-1 rounded w-full" />
                      ) : (
                        <span className="font-bold">{item.nome}</span>
                      )}
                    </td>
                    <td className="p-6">
                      {editandoId === item.id ? (
                        <div className="space-y-1">
                          <input value={dadosEditados.local_viagem} onChange={e => setDadosEditados({...dadosEditados, local_viagem: e.target.value})} className="border p-1 rounded w-full text-xs" />
                          <input type="date" value={dadosEditados.data_viagem} onChange={e => setDadosEditados({...dadosEditados, data_viagem: e.target.value})} className="border p-1 rounded w-full text-xs" />
                          <select value={dadosEditados.metodo_pagamento} onChange={e => setDadosEditados({...dadosEditados, metodo_pagamento: e.target.value})} className="border p-1 rounded w-full text-xs">
                             <option value="SEI">SEI</option>
                             <option value="CONTA SALARIO">CONTA SALÁRIO</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-slate-700">{item.local_viagem}</div>
                          <div className="text-[10px] text-blue-600 font-bold uppercase">{item.metodo_pagamento} | {item.data_viagem}</div>
                        </>
                      )}
                    </td>
                    <td className="p-6">
                      {editandoId === item.id ? (
                        <input type="number" value={dadosEditados.valor} onChange={e => setDadosEditados({...dadosEditados, valor: e.target.value})} className="border p-1 rounded w-full" />
                      ) : (
                        <span className="font-black">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                       <button onClick={() => setExpandido(expandido === item.id ? null : item.id)} className="text-xs bg-slate-100 px-2 py-1 rounded">👁️</button>
                    </td>
                    <td className="p-6 text-center">
                       <button onClick={() => alternarPagamento(item.id, item.pago)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all ${item.pago ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                         {item.pago ? 'PAGO' : 'PENDENTE'}
                       </button>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center gap-2">
                        {editandoId === item.id ? (
                          <>
                            <button onClick={salvarEdicao} className="text-green-600 font-bold">Salvar</button>
                            <button onClick={() => setEditandoId(null)} className="text-slate-400">Sair</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => iniciarEdicao(item)} className="text-blue-500 hover:text-blue-700">✏️</button>
                            <button onClick={() => excluirDiaria(item.id)} className="text-slate-300 hover:text-red-500">🗑️</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandido === item.id && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={6} className="p-6 italic text-slate-600">
                        {editandoId === item.id ? (
                          <textarea value={dadosEditados.observacoes} onChange={e => setDadosEditados({...dadosEditados, observacoes: e.target.value})} className="w-full border p-2 rounded" rows={2} />
                        ) : (
                          item.observacoes || "Sem observações."
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Carregando...</div>}
        </div>
      </div>
    </div>
  )
}