import React, { useState } from 'react';
import { useApp, Event } from '../lib/store';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar as CalendarIcon, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';

const EVENT_TAGS = [
  { label: 'Reunião com Cliente', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Reunião Interna', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Tempo Off', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { label: 'Reunião de Projeto', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Outro', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

export default function Agenda() {
  const { events, addEvent } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(weekStart);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: weekEnd,
  });

  const displayedDays = view === 'month' ? calendarDays : view === 'week' ? weekDays : [currentDate];

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleExport = (event: Event) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aurora//Sistema de Controle//PT
BEGIN:VEVENT
UID:${event.id}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${new Date(event.start).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(event.end).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie sua agenda e sincronize com dispositivos.</p>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors mr-2 whitespace-nowrap"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Sincronizar
          </button>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                view === 'month' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Mês
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                view === 'week' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setView('day')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                view === 'day' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Dia
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-slate-200 border-b-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
            <button 
              onClick={prevPeriod} 
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
              title="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              Hoje
            </button>
            <button 
              onClick={nextPeriod} 
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all"
              title="Próximo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {view === 'day' 
              ? format(currentDate, "d 'de' MMMM yyyy", { locale: ptBR })
              : format(currentDate, 'MMMM yyyy', { locale: ptBR })
            }
          </h2>
        </div>
        
        <div className="hidden md:flex items-center text-sm text-slate-500 font-medium">
          {view === 'month' && "Visualização Mensal"}
          {view === 'week' && "Visualização Semanal"}
          {view === 'day' && "Visualização Diária"}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className={cn("grid border-b border-slate-200 bg-slate-50", view === 'day' ? "grid-cols-1" : "grid-cols-7")}>
          {view === 'day' ? (
            <div className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {format(currentDate, 'EEEE', { locale: ptBR })}
            </div>
          ) : (
            ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))
          )}
        </div>

        {/* Days Grid */}
        <div className={cn("grid flex-1 auto-rows-fr", view === 'day' ? "grid-cols-1" : "grid-cols-7")}>
          {displayedDays.map((day, dayIdx) => {
            const dayEvents = (events || []).filter(e => {
              const eventStart = startOfDay(new Date(e.start));
              const eventEnd = endOfDay(new Date(e.end));
              return isWithinInterval(day, { start: eventStart, end: eventEnd });
            });
            
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[100px] p-2 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50",
                  !isCurrentMonth && view === 'month' && "bg-slate-50/50 text-slate-400",
                  (dayIdx % 7 === 6 || view === 'day') && "border-r-0" // Remove right border for last column
                )}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={cn(
                      "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                      isToday ? "bg-indigo-600 text-white" : "text-slate-700"
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="mt-2 space-y-1">
                  {dayEvents.map(event => {
                    const tagStyle = EVENT_TAGS.find(t => t.label === event.tag)?.color || 'bg-indigo-50 text-indigo-700 border-indigo-100';
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "group/event relative px-2 py-1 text-xs font-medium rounded border truncate cursor-pointer hover:opacity-90",
                          tagStyle
                        )}
                        onClick={() => handleExport(event)}
                        title={`${event.title} - ${event.tag || 'Evento'}`}
                      >
                        {format(new Date(event.start), 'HH:mm')} {event.title}
                        <Download className="absolute right-1 top-1 h-3 w-3 opacity-0 group-hover/event:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Evento</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const tagLabel = formData.get('tag') as string;
                const tagColor = EVENT_TAGS.find(t => t.label === tagLabel)?.color;

                try {
                  await addEvent({
                    title: formData.get('title') as string,
                    start: new Date(formData.get('start') as string).toISOString(),
                    end: new Date(formData.get('end') as string).toISOString(),
                    type: 'meeting',
                    description: formData.get('description') as string,
                    tag: tagLabel,
                    color: tagColor
                  });
                  setIsModalOpen(false);
                } catch (error: any) {
                  alert(error.message || "Erro ao criar evento. Verifique se a tabela 'events' possui as colunas 'tag' e 'color'.");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700">Título</label>
                <input name="title" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Início</label>
                  <input name="start" type="datetime-local" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Fim</label>
                  <input name="end" type="datetime-local" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Categoria (Tag)</label>
                <select name="tag" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  {EVENT_TAGS.map(tag => (
                    <option key={tag.label} value={tag.label}>{tag.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Descrição</label>
                <textarea name="description" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sync Guide Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Sincronizar com iPhone e Samsung</h3>
            <div className="space-y-4 text-sm text-slate-600">
              <p>
                Para integrar a Agenda Aurora com seu dispositivo móvel:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Clique em qualquer evento na grade do calendário.</li>
                <li>O evento será baixado como um arquivo <strong>.ics</strong>.</li>
                <li>Abra o arquivo no seu dispositivo para adicioná-lo ao seu calendário nativo (Apple Calendar ou Google Calendar).</li>
              </ol>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                <p className="text-xs text-slate-500">
                  <strong>Nota:</strong> A sincronização direta bidirecional requer a configuração de um servidor CalDAV dedicado ou integração com Google Workspace, que pode ser configurada na versão Enterprise.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsSyncModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
