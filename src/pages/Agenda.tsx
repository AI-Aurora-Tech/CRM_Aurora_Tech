import React, { useState } from 'react';
import { useApp, Event } from '../lib/store';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar as CalendarIcon, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Agenda() {
  const { events, addEvent } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
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

  const displayedDays = view === 'month' ? calendarDays : weekDays;

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
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
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors mr-2"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Sincronizar iOS/Android
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              view === 'month' ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Mês
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              view === 'week' ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Semana
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="ml-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-slate-200 border-b-0">
        <h2 className="text-lg font-semibold text-slate-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center space-x-2">
          <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 px-2">
            Hoje
          </button>
          <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {displayedDays.map((day, dayIdx) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[100px] p-2 border-b border-r border-slate-100 relative group transition-colors hover:bg-slate-50",
                  !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                  dayIdx % 7 === 6 && "border-r-0" // Remove right border for last column
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
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="group/event relative px-2 py-1 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-100 truncate cursor-pointer hover:bg-indigo-100"
                      onClick={() => handleExport(event)}
                      title="Clique para exportar para o calendário"
                    >
                      {format(new Date(event.start), 'HH:mm')} {event.title}
                      <Download className="absolute right-1 top-1 h-3 w-3 opacity-0 group-hover/event:opacity-100 text-indigo-500" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal (Simplified) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Evento</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addEvent({
                  title: formData.get('title') as string,
                  start: new Date(formData.get('start') as string).toISOString(),
                  end: new Date(formData.get('end') as string).toISOString(),
                  type: 'meeting',
                  description: formData.get('description') as string,
                });
                setIsModalOpen(false);
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
