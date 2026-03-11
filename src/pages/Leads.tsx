import React, { useState, useEffect } from 'react';
import { useApp, LeadStatus } from '../lib/store';
import { generateDailyLeads } from '../lib/leadService';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, Instagram, Mail, Building2, Loader2, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<LeadStatus, string> = {
  'Novo': 'bg-slate-100 text-slate-700 border-slate-200',
  'Primeiro Contato': 'bg-blue-100 text-blue-700 border-blue-200',
  'Em Negociação': 'bg-amber-100 text-amber-700 border-amber-200',
  'Resposta Positiva': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Resposta Negativa': 'bg-rose-100 text-rose-700 border-rose-200',
  'Convertido': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function Leads() {
  const { leads, addLeads, updateLead, deleteLead } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todaysLeads = leads.filter(l => l.generatedAt && l.generatedAt.startsWith(dateKey));

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const newLeads = await generateDailyLeads(dateKey);
      
      // Filtrar duplicatas localmente antes de adicionar
      const existingNames = new Set(leads.map(l => l.name.toLowerCase()));
      const filteredLeads = newLeads.filter(l => !existingNames.has(l.name.toLowerCase()));
      
      if (filteredLeads.length > 0) {
        // Garantir que todos os novos leads tenham status 'Novo'
        const leadsWithStatus = filteredLeads.map(l => ({ ...l, status: 'Novo' as LeadStatus }));
        await addLeads(leadsWithStatus);
        
        if (filteredLeads.length < newLeads.length) {
          setError(`${newLeads.length - filteredLeads.length} leads duplicados foram ignorados.`);
        }
      } else if (newLeads.length > 0) {
        setError("Todos os leads gerados já existem na sua lista.");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao gerar leads.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLead(id, { status });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Geração de Leads</h1>
          <p className="text-slate-500 mt-2">Leads qualificados gerados diariamente pela IA.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || todaysLeads.length >= 10}
          className={cn(
            "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all",
            isGenerating || todaysLeads.length >= 10
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar 10 Leads para Hoje
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-amber-400 hover:text-amber-600 font-bold">X</button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex items-center space-x-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-md">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-md">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-7 mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const hasLeads = leads.some(l => l.generatedAt && l.generatedAt.startsWith(format(day, 'yyyy-MM-dd')));
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-8 w-full rounded-md flex flex-col items-center justify-center text-xs relative transition-all",
                        isSelected ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-50 text-slate-700",
                        !isCurrentMonth && "opacity-30",
                        hasLeads && !isSelected && "text-indigo-600 font-semibold"
                      )}
                    >
                      {format(day, 'd')}
                      {hasLeads && (
                        <span className={cn(
                          "absolute bottom-1 h-1 w-1 rounded-full",
                          isSelected ? "bg-white" : "bg-indigo-400"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              Regras de Geração
            </h4>
            <ul className="text-xs text-indigo-700 space-y-2">
              <li>• 10 leads diários qualificados</li>
              <li>• Com Instagram ou E-mail</li>
              <li>• Sem site ou aplicativo próprio</li>
              <li>• Foco: Escolas, Clínicas e Serviços</li>
              <li>• Pequeno e Médio porte</li>
            </ul>
          </div>
        </div>

        {/* Leads List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Leads de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <span className="text-sm text-slate-500 font-medium">
              {todaysLeads.length} leads encontrados
            </span>
          </div>

          {todaysLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Nenhum lead para esta data</h3>
              <p className="text-slate-500 max-w-xs mt-1">
                Selecione hoje no calendário e clique em "Gerar Leads" para começar.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {todaysLeads.map(lead => (
                <div key={lead.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-bold text-slate-900 text-lg">{lead.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                          {lead.industry}
                        </span>
                        
                        {/* Status Badge/Select */}
                        <select
                          value={lead.status || 'Novo'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-pointer outline-none transition-colors",
                            STATUS_COLORS[lead.status || 'Novo']
                          )}
                        >
                          <option value="Novo">Novo</option>
                          <option value="Primeiro Contato">Primeiro Contato</option>
                          <option value="Em Negociação">Em Negociação</option>
                          <option value="Resposta Positiva">Resposta Positiva</option>
                          <option value="Resposta Negativa">Resposta Negativa</option>
                          <option value="Convertido">Convertido</option>
                        </select>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {lead.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3 items-end">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {lead.contact.instagram && (
                          <a
                            href={lead.contact.instagram.startsWith('http') ? lead.contact.instagram : `https://instagram.com/${lead.contact.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-pink-50 text-pink-700 text-xs font-medium hover:bg-pink-100 transition-colors"
                          >
                            <Instagram className="mr-1.5 h-3.5 w-3.5" />
                            Instagram
                          </a>
                        )}
                        {lead.contact.email && (
                          <a
                            href={`mailto:${lead.contact.email}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <Mail className="mr-1.5 h-3.5 w-3.5" />
                            E-mail
                          </a>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Deseja realmente excluir este lead?')) {
                              deleteLead(lead.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
