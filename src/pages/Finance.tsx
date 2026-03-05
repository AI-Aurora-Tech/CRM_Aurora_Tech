import React, { useState, useMemo } from 'react';
import { useApp, Transaction, PaymentMethod } from '../lib/store';
import { TrendingUp, TrendingDown, DollarSign, Plus, Calendar, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Building2, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { cn } from '../lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Finance() {
  const { transactions, addTransaction } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isInstallment, setIsInstallment] = useState(false);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Chart Data - Real Calculation
  const monthlyData = useMemo(() => {
    const today = new Date();
    // Generate last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i);
      return {
        date: d,
        name: format(d, 'MMM', { locale: ptBR }),
        receitas: 0,
        despesas: 0
      };
    });

    transactions.forEach(t => {
      const tDate = parseISO(t.date);
      const monthIndex = last6Months.findIndex(m => isSameMonth(m.date, tDate));
      if (monthIndex !== -1) {
        if (t.type === 'income') {
          last6Months[monthIndex].receitas += t.amount;
        } else {
          last6Months[monthIndex].despesas += t.amount;
        }
      }
    });

    return last6Months.map(({ name, receitas, despesas }) => ({ name, receitas, despesas }));
  }, [transactions]);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categories: Record<string, number> = {};

    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const result = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by highest expense
      
    // If no data, return placeholder to avoid empty chart
    if (result.length === 0) return [{ name: 'Sem dados', value: 1 }];
    
    return result;
  }, [transactions]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Financeiro</h1>
          <p className="text-slate-500 mt-1">Controle de fluxo de caixa, receitas e despesas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Transação
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Saldo Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">R$ {(balance || 0).toLocaleString('pt-BR')}</p>
          <div className="mt-2 flex items-center text-xs text-emerald-600">
            <TrendingUp className="mr-1 h-3 w-3" />
            <span>+12% em relação ao mês anterior</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Receitas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">R$ {(totalIncome || 0).toLocaleString('pt-BR')}</p>
          <div className="mt-2 flex items-center text-xs text-emerald-600">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            <span>Entradas do mês</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-slate-400">Despesas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">R$ {(totalExpense || 0).toLocaleString('pt-BR')}</p>
          <div className="mt-2 flex items-center text-xs text-rose-600">
            <ArrowDownRight className="mr-1 h-3 w-3" />
            <span>Saídas do mês</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Receitas vs Despesas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="receitas" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Despesas por Categoria</h3>
          <div className="h-80 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-medium text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Transações Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(parseISO(t.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center mr-3",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.provider}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {t.paymentMethod}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right",
                    t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'} R$ {(t.amount || 0).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Nova Transação</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const amount = Number(formData.get('amount'));
                const installments = Number(formData.get('installments') || 1);

                addTransaction({
                  type: transactionType,
                  description: formData.get('description') as string,
                  amount: amount,
                  category: formData.get('category') as string,
                  date: formData.get('date') as string,
                  provider: formData.get('provider') as string,
                  paymentMethod: paymentMethod,
                  installments: paymentMethod === 'Cartão de Crédito' ? installments : 1,
                });
                setIsModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTransactionType('expense')}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                    transactionType === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('income')}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                    transactionType === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Fornecedor / Cliente</label>
                <div className="mt-1 relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input name="provider" required className="pl-10 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Descrição</label>
                <input name="description" required className="mt-1 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Valor (R$)</label>
                  <div className="mt-1 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input name="amount" type="number" step="0.01" required className="pl-10 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Data de Vencimento</label>
                  <div className="mt-1 relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input name="date" type="date" required className="pl-10 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Categoria</label>
                <div className="mt-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select name="category" required className="pl-10 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="Vendas">Vendas</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Software">Software</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Método de Pagamento</label>
                <div className="mt-1 relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select 
                    name="paymentMethod" 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    required 
                    className="pl-10 block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'Cartão de Crédito' && (
                <div className="p-4 bg-indigo-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-indigo-900">Foi parcelado?</label>
                    <input 
                      type="checkbox" 
                      checked={isInstallment}
                      onChange={(e) => setIsInstallment(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  {isInstallment && (
                    <div>
                      <label className="block text-xs font-medium text-indigo-700 mb-1">Quantidade de Parcelas</label>
                      <input 
                        name="installments" 
                        type="number" 
                        min="2" 
                        max="48" 
                        defaultValue="2"
                        className="block w-full rounded-md border-indigo-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" 
                      />
                      <p className="text-[10px] text-indigo-500 mt-1">O valor será dividido igualmente pelos próximos meses.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors",
                    transactionType === 'income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  Confirmar {transactionType === 'income' ? 'Receita' : 'Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
