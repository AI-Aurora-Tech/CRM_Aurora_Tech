import React from 'react';
import { useApp } from '../lib/store';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Briefcase, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { projects, transactions, events, user } = useApp();

  const totalProjects = (projects || []).length;
  const activeProjects = (projects || []).filter(p => p.status === 'Em Andamento').length;
  
  const income = (transactions || []).filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = (transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expenses;

  const today = new Date();
  const todaysEvents = (events || []).filter(e => {
    const eventDate = new Date(e.start);
    return eventDate.getDate() === today.getDate() &&
           eventDate.getMonth() === today.getMonth() &&
           eventDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Bem-vindo de volta, {user?.name || 'Pedro Santos'}. Aqui está o resumo de hoje.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-slate-500">Saldo Total</p>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">R$ {(balance || 0).toLocaleString('pt-BR')}</div>
          <div className="flex items-center pt-1 text-xs text-slate-500">
            <span className="font-medium">Saldo atual</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-slate-500">Projetos Ativos</p>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{activeProjects}</div>
          <div className="text-xs text-slate-500 pt-1">
            {totalProjects} projetos totais rastreados
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-slate-500">Agenda de Hoje</p>
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{todaysEvents.length}</div>
          <div className="text-xs text-slate-500 pt-1">
            Eventos agendados para hoje
          </div>
        </div>
      </div>

      {/* Recent Activity & Agenda */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Agenda */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Agenda de Hoje</h3>
            <Link to="/agenda" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Ver tudo
            </Link>
          </div>
          <div className="p-6">
            {todaysEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum evento agendado para hoje.</p>
            ) : (
              <div className="space-y-4">
                {todaysEvents.map(event => (
                  <div key={event.id} className="flex items-start space-x-4">
                    <div className="min-w-[4rem] text-sm text-slate-500 font-mono">
                      {format(new Date(event.start), 'HH:mm')}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
             <h3 className="font-semibold text-slate-900">Projetos Ativos</h3>
             <Link to="/projects" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Ver tudo
            </Link>
          </div>
          <div className="p-6 space-y-6">
            {(projects || []).slice(0, 3).map(project => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{project.name}</span>
                  <span className="text-slate-500">{project.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
