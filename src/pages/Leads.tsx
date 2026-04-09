import React, { useState, useEffect } from 'react';
import { useApp, LeadStatus } from '../lib/store';
import { generateDailyLeads } from '../lib/leadService';
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, Instagram, Mail, Building2, Loader2, Sparkles, AlertCircle, Trash2, MessageCircle, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_COLORS: Record<LeadStatus, string> = {
  'Novo': 'bg-slate-100 text-slate-700 border-slate-200',
  'Primeiro Contato': 'bg-blue-100 text-blue-700 border-blue-200',
  'Em Negociação': 'bg-amber-100 text-amber-700 border-amber-200',
  'Resposta Positiva': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Resposta Negativa': 'bg-rose-100 text-rose-700 border-rose-200',
  'Convertido': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function Leads() {
  const { leads, addLeads, updateLead, deleteLead, deleteLeadsByDate } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualLead, setManualLead] = useState({
    name: '',
    industry: '',
    instagram: '',
    email: '',
    whatsapp: '',
    googleMapsLink: '',
    description: '',
    language: 'pt-BR' as 'pt-BR' | 'en'
  });

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const todaysLeads = leads.filter(l => l.generatedAt && l.generatedAt.startsWith(dateKey));

  const sortedLeads = [...todaysLeads].sort((a, b) => {
    const countA = (a.contact?.whatsapp ? 1 : 0) + (a.contact?.instagram ? 1 : 0) + (a.contact?.email ? 1 : 0);
    const countB = (b.contact?.whatsapp ? 1 : 0) + (b.contact?.instagram ? 1 : 0) + (b.contact?.email ? 1 : 0);
    return countB - countA;
  });

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
    setProgress(0);

    // Symbolic progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 800);

    try {
      // Se já existem leads para esta data, perguntar se deseja regenerar
      if (todaysLeads.length > 0) {
        const confirmRegen = confirm(`Já existem ${todaysLeads.length} leads para esta data. Deseja apagar os atuais e gerar novos?`);
        if (!confirmRegen) {
          setIsGenerating(false);
          clearInterval(progressInterval);
          return;
        }
        await deleteLeadsByDate(dateKey);
      }

      // Pequeno delay para garantir que o estado de deleteLeadsByDate foi processado e a UI atualizou
      await new Promise(resolve => setTimeout(resolve, 500));

      const newLeads = await generateDailyLeads(dateKey);
      
      if (newLeads.length > 0) {
        const leadsWithStatus = newLeads.map(l => ({ ...l, status: 'Novo' as LeadStatus }));
        await addLeads(leadsWithStatus);
        setProgress(100);
      } else {
        setError("Nenhum lead foi gerado pela IA. Tente novamente.");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao gerar leads.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLead(id, { status });
  };

  const getMessage = (name: string, language?: 'pt-BR' | 'en') => {
    if (language === 'en') {
      return `Hi ${name} team! How are you?\n\nWe are Aurora Tech, a company specialized in automation and technology solutions for businesses that want to grow, optimize processes, and innovate.\n\nAnalyzing your segment, we identified a great potential for implementing smart solutions that can make your operation more efficient through customer service automation, contact organization, and digital channel integration, among others.\n\nAll of this personalized according to your reality.\n\nWe would like to better understand your needs and present, without commitment, some ideas that can generate quick results for you.\n\nCan we schedule a quick chat?\n\nBest regards,\nAurora Tech Team`;
    }
    return `Olá, equipe da ${name}! Tudo bem?\n\nSomos a Aurora Tech, uma empresa especializada em soluções de automação e tecnologia para negócios que desejam crescer, otimizar processos e inovar.\n\nAo analisarmos o seu segmento, identificamos um grande potencial para a implementação de soluções inteligentes que podem tornar sua operação mais eficiente através da automação de atendimentos, organização de contatos e integração de canais digitais, entre outros.\n\nTudo isso de forma personalizada, de acordo com a sua realidade.\n\nGostaríamos de entender melhor suas necessidades e apresentar, sem compromisso, algumas ideias que podem gerar resultados rápidos para você.\n\nPodemos agendar uma conversa rápida?\n\nFicamos à disposição!\n\nAtenciosamente,\nEquipe Aurora Tech`;
  };

  const getWhatsAppLink = (phone: string, name: string, language?: 'pt-BR' | 'en') => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = getMessage(name, language);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getEmailLink = (email: string, name: string, language?: 'pt-BR' | 'en') => {
    const subject = language === 'en' ? `Partnership opportunity with ${name}` : `Oportunidade de parceria com a ${name}`;
    const body = getMessage(name, language);
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Geração de Leads</h1>
          <p className="text-slate-500 mt-2">Leads qualificados gerados diariamente pela IA ou adicionados manualmente.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all"
          >
            Novo Lead Manual
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isAfter(startOfDay(selectedDate), startOfDay(new Date()))}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all",
              isGenerating || isAfter(startOfDay(selectedDate), startOfDay(new Date()))
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : todaysLeads.length > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerar Leads
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar 10 Leads para {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, 'dd/MM')}
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">IA Aurora está buscando leads...</h3>
                  <p className="text-xs text-slate-500">Analisando empresas reais sem site no Google Maps</p>
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              <span>Iniciando pesquisa</span>
              <span>Validando contatos</span>
              <span>Finalizando lista</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  const isFuture = isAfter(startOfDay(day), startOfDay(new Date()));

                  return (
                    <button
                      key={idx}
                      onClick={() => !isFuture && setSelectedDate(day)}
                      disabled={isFuture}
                      className={cn(
                        "h-8 w-full rounded-md flex flex-col items-center justify-center text-xs relative transition-all",
                        isSelected ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-50 text-slate-700",
                        (!isCurrentMonth || isFuture) && "opacity-30",
                        isFuture && "cursor-not-allowed",
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
              <li>• Com Instagram, WhatsApp ou E-mail reais</li>
              <li>• Sem site ou aplicativo próprio</li>
              <li>• Foco: Pequenas e Médias Empresas (SMBs)</li>
              <li>• Idioma: Português (BR) ou Inglês</li>
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
              {sortedLeads.length} leads encontrados
            </span>
          </div>

          {sortedLeads.length === 0 ? (
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
              {sortedLeads.map(lead => (
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
                        {lead.contact.googleMapsLink && (
                          <a
                            href={lead.contact.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
                          >
                            <MapPin className="mr-1.5 h-3.5 w-3.5" />
                            Maps
                          </a>
                        )}
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
                        {lead.contact.whatsapp && (
                          <a
                            href={getWhatsAppLink(lead.contact.whatsapp, lead.name, lead.language)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                        {lead.contact.email && (
                          <a
                            href={getEmailLink(lead.contact.email, lead.name, lead.language)}
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

      {/* Modal de Lead Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Adicionar Lead Manual</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                X
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  required
                  value={manualLead.name}
                  onChange={e => setManualLead({ ...manualLead, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Padaria do João"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nicho *</label>
                  <input
                    type="text"
                    required
                    value={manualLead.industry}
                    onChange={e => setManualLead({ ...manualLead, industry: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: Alimentação"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Idioma</label>
                  <select
                    value={manualLead.language}
                    onChange={e => setManualLead({ ...manualLead, language: e.target.value as 'pt-BR' | 'en' })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en">Inglês</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link do Google Maps</label>
                <input
                  type="text"
                  value={manualLead.googleMapsLink}
                  onChange={e => setManualLead({ ...manualLead, googleMapsLink: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="https://goo.gl/maps/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                <input
                  type="text"
                  value={manualLead.instagram}
                  onChange={e => setManualLead({ ...manualLead, instagram: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="@empresa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={manualLead.whatsapp}
                  onChange={e => setManualLead({ ...manualLead, whatsapp: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={manualLead.email}
                  onChange={e => setManualLead({ ...manualLead, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Breve</label>
                <textarea
                  value={manualLead.description}
                  onChange={e => setManualLead({ ...manualLead, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20"
                  placeholder="Detalhes sobre o lead..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!manualLead.name || !manualLead.industry) {
                    alert('Preencha pelo menos o nome e o nicho da empresa.');
                    return;
                  }
                  addLeads([{
                    id: crypto.randomUUID(),
                    name: manualLead.name,
                    industry: manualLead.industry,
                    contact: {
                      instagram: manualLead.instagram,
                      email: manualLead.email,
                      whatsapp: manualLead.whatsapp,
                      googleMapsLink: manualLead.googleMapsLink
                    },
                    description: manualLead.description || 'Lead adicionado manualmente',
                    generatedAt: dateKey,
                    status: 'Novo',
                    language: manualLead.language
                  }]);
                  setIsManualModalOpen(false);
                  setManualLead({ name: '', industry: '', instagram: '', email: '', whatsapp: '', googleMapsLink: '', description: '', language: 'pt-BR' });
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Salvar Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
