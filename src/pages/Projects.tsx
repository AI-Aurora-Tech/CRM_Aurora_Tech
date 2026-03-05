import React, { useState } from 'react';
import { useApp, Project, ProjectStatus, Task } from '../lib/store';
import { Plus, Clock, CheckCircle2, Circle, AlertCircle, MoreHorizontal, CheckSquare, Square, Trash2, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';

const STATUS_CONFIG: Record<ProjectStatus, { color: string; icon: any }> = {
  'Planejamento': { color: 'bg-slate-100 text-slate-600', icon: Circle },
  'Em Andamento': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  'Revisão': { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  'Concluído': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function Projects() {
  const { projects, addProject, updateProject, toggleTask, addTask } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('pending');

  const columns: ProjectStatus[] = ['Planejamento', 'Em Andamento', 'Revisão', 'Concluído'];

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const formData = new FormData(e.currentTarget);
      await addProject({
        name: formData.get('name') as string,
        clientName: formData.get('clientName') as string,
        description: formData.get('description') as string,
        status: 'Planejamento',
        dueDate: formData.get('dueDate') as string,
        assignedTo: ['Você'],
        progress: 0,
        value: Number(formData.get('value')),
        tasks: [],
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar projeto:", error);
      alert(`Erro ao criar projeto: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as ProjectStatus;
    updateProject(draggableId, { status: newStatus });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projetos</h1>
          <p className="text-slate-500 mt-1">Gerencie o ciclo de vida dos projetos e atribuições da equipe.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-6 min-w-[1000px] h-full">
            {columns.map((status) => (
              <Droppable key={status} droppableId={status}>
                {(provided: any) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex-1 min-w-[300px] flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60 h-full"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-slate-50/95 backdrop-blur-sm rounded-t-xl z-10">
                      <div className="flex items-center space-x-2">
                        <span className={cn("h-2 w-2 rounded-full", 
                          status === 'Planejamento' ? "bg-slate-400" :
                          status === 'Em Andamento' ? "bg-blue-500" :
                          status === 'Revisão' ? "bg-amber-500" : "bg-emerald-500"
                        )} />
                        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{status}</h3>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                        {projects.filter(p => p.status === status).length}
                      </span>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto flex-1">
                      {projects
                        .filter(p => p.status === status)
                        .map((project, index) => (
                          /* @ts-ignore */
                          <Draggable key={project.id} draggableId={project.id} index={index}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                                onClick={() => setSelectedProject(project)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", STATUS_CONFIG[project.status].color)}>
                                    {project.status}
                                  </span>
                                  <span className="text-xs font-bold text-indigo-600">
                                    R$ {(project.value || 0).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                                
                                <h4 className="font-semibold text-slate-900 mb-1">{project.name}</h4>
                                <p className="text-[10px] text-slate-400 mb-1 font-medium">{project.clientName}</p>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{project.description}</p>
                                
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                                  <div className="flex items-center text-[10px] text-slate-500">
                                    <CheckSquare className="mr-1 h-3 w-3" />
                                    {(project.tasks || []).filter(t => t.completed).length}/{(project.tasks || []).length} Tarefas
                                  </div>
                                  <div className="flex items-center text-xs text-indigo-600 font-medium hover:underline">
                                    Gerenciar
                                    <ChevronRight className="ml-0.5 h-3 w-3" />
                                  </div>
                                </div>
                                
                                <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full rounded-full transition-all duration-500", 
                                      project.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                    )} 
                                    style={{ width: `${project.progress}%` }} 
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Project Detail Modal (Tasks) */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedProject.name}</h3>
                <p className="text-sm text-slate-500">{selectedProject.clientName}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Task Sections */}
              {(['pending', 'done', 'future'] as const).map((type) => (
                <div key={type} className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    {type === 'pending' ? 'Pendentes' : type === 'done' ? 'Concluídas' : 'Futuras'}
                    <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                      {(selectedProject.tasks || []).filter(t => t.type === type).length}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {(selectedProject.tasks || []).filter(t => t.type === type).map(task => (
                      <div 
                        key={task.id} 
                        className="flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group"
                        onClick={() => toggleTask(selectedProject.id, task.id)}
                      >
                        <button className="mr-3 text-indigo-600">
                          {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                        </button>
                        <span className={cn("text-sm flex-1", task.completed && "line-through text-slate-400")}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                    {(selectedProject.tasks || []).filter(t => t.type === type).length === 0 && (
                      <p className="text-xs text-slate-400 italic">Nenhuma tarefa nesta categoria.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <select 
                  value={newTaskType} 
                  onChange={(e) => setNewTaskType(e.target.value as Task['type'])}
                  className="text-xs border-slate-200 rounded-lg p-2"
                >
                  <option value="pending">Pendente</option>
                  <option value="future">Futura</option>
                  <option value="done">Concluída</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Nova tarefa..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTaskTitle) {
                      addTask(selectedProject.id, { title: newTaskTitle, completed: newTaskType === 'done', type: newTaskType });
                      setNewTaskTitle('');
                    }
                  }}
                  className="flex-1 text-sm border-slate-200 rounded-lg p-2"
                />
                <button 
                  onClick={() => {
                    if (newTaskTitle) {
                      addTask(selectedProject.id, { title: newTaskTitle, completed: newTaskType === 'done', type: newTaskType });
                      setNewTaskTitle('');
                    }
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Novo Projeto</h3>
            <form
              onSubmit={handleCreateProject}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome da Empresa</label>
                <input name="clientName" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome do Projeto</label>
                <input name="name" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Descrição Breve</label>
                <textarea name="description" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Valor Cobrado (R$)</label>
                  <input name="value" type="number" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Data de Finalização</label>
                  <input name="dueDate" type="date" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isCreating ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Projeto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
