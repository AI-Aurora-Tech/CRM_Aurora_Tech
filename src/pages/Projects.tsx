import React, { useState } from 'react';
import { useApp, Project, ProjectStatus, Task } from '../lib/store';
import { Plus, Clock, CheckCircle2, Circle, AlertCircle, MoreHorizontal, CheckSquare, Square, Trash2, ChevronRight, Pencil, X, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';

const STATUS_CONFIG: Record<ProjectStatus, { color: string; icon: any }> = {
  'Noticia': { color: 'bg-purple-100 text-purple-700', icon: Circle },
  'Posts': { color: 'bg-pink-100 text-pink-700', icon: Circle },
  'Planejamento': { color: 'bg-slate-100 text-slate-600', icon: Circle },
  'Em Andamento': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  'Revisão': { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  'Concluído': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function Projects() {
  const { projects, addProject, updateProject, deleteProject, toggleTask, addTask, updateTask, deleteTask } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedStatus, setPreSelectedStatus] = useState<ProjectStatus | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('Planejamento');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('pending');
  
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const columns: ProjectStatus[] = ['Noticia', 'Posts', 'Planejamento', 'Em Andamento', 'Revisão', 'Concluído'];

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const formData = new FormData(e.currentTarget);
      const status = (formData.get('status') as ProjectStatus) || 'Planejamento';
      
      const name = (formData.get('name') as string) || (status === 'Noticia' ? `Notícia: ${formData.get('source') || 'Sem Fonte'}` : 'Novo Projeto');
      const clientName = (formData.get('clientName') as string) || 'Interno';
      const description = (formData.get('description') as string) || (status === 'Noticia' ? 'Notícia pendente de revisão' : status === 'Posts' ? 'Post pendente de revisão' : '');
      const dueDate = (formData.get('dueDate') as string) || (formData.get('publishDate') as string) || new Date().toISOString().split('T')[0];

      await addProject({
        name,
        clientName,
        description,
        status,
        dueDate,
        assignedTo: ['Você'],
        progress: 0,
        value: Number(formData.get('value') || 0),
        tasks: [],
        paymentMethod: (formData.get('paymentMethod') as string) || 'N/A',
        paymentDetails: (formData.get('paymentDetails') as string) || '',
        implementationFee: Number(formData.get('implementationFee') || 0),
        monthlyFee: Number(formData.get('monthlyFee') || 0),
        isRecurring: formData.get('isRecurring') === 'on',
        isCanceled: formData.get('isCanceled') === 'on',
        // News fields
        source: formData.get('source') as string,
        newsPlot: formData.get('newsPlot') as string,
        postIdea: formData.get('postIdea') as string,
        // Post fields
        socialMedia: formData.get('socialMedia') as string,
        imageIdea: formData.get('imageIdea') as string,
        postContext: formData.get('postContext') as string,
        publishDate: formData.get('publishDate') as string,
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar projeto:", error);
      alert(`Erro ao criar projeto: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    try {
      const formData = new FormData(e.currentTarget);
      await updateProject(selectedProject.id, {
        name: formData.get('name') as string,
        clientName: formData.get('clientName') as string,
        description: formData.get('description') as string,
        dueDate: formData.get('dueDate') as string,
        value: Number(formData.get('value')),
        paymentMethod: formData.get('paymentMethod') as string,
        paymentDetails: formData.get('paymentDetails') as string,
        implementationFee: Number(formData.get('implementationFee')),
        monthlyFee: Number(formData.get('monthlyFee')),
        isRecurring: formData.get('isRecurring') === 'on',
        isCanceled: formData.get('isCanceled') === 'on',
        // News fields
        source: formData.get('source') as string,
        newsPlot: formData.get('newsPlot') as string,
        postIdea: formData.get('postIdea') as string,
        // Post fields
        socialMedia: formData.get('socialMedia') as string,
        imageIdea: formData.get('imageIdea') as string,
        postContext: formData.get('postContext') as string,
        publishDate: formData.get('publishDate') as string,
      });
      setIsEditingProject(false);
    } catch (error: any) {
      console.error("Erro ao atualizar projeto:", error);
      alert(`Erro ao atualizar projeto: ${error.message}`);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as ProjectStatus;
    updateProject(draggableId, { status: newStatus });
  };

  const handleSaveTask = async (taskId: string) => {
    if (!selectedProject || !editedTaskTitle.trim()) return;
    await updateTask(selectedProject.id, taskId, { title: editedTaskTitle });
    setEditingTaskId(null);
    setEditedTaskTitle('');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projetos</h1>
          <p className="text-slate-500 mt-1">Gerencie o ciclo de vida dos projetos e atribuições da equipe.</p>
        </div>
        <button
          onClick={() => { 
            setPreSelectedStatus(null); 
            setSelectedStatus('Planejamento');
            setIsModalOpen(true); 
          }}
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
                          status === 'Noticia' ? "bg-purple-500" :
                          status === 'Posts' ? "bg-pink-500" :
                          status === 'Planejamento' ? "bg-slate-400" :
                          status === 'Em Andamento' ? "bg-blue-500" :
                          status === 'Revisão' ? "bg-amber-500" : "bg-emerald-500"
                        )} />
                        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{status}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(status === 'Noticia' || status === 'Posts') && (
                          <button 
                            onClick={() => { 
                              setPreSelectedStatus(status); 
                              setSelectedStatus(status);
                              setIsModalOpen(true); 
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title={`Adicionar ${status}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                        <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                          {projects.filter(p => p.status === status).length}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto flex-1">
                      {projects
                        .filter(p => p.status === status && !p.isCanceled)
                        .map((project, index) => (
                          /* @ts-ignore */
                          <Draggable key={project.id} draggableId={project.id} index={index}>
                            {(provided: any) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                                onClick={() => { setSelectedProjectId(project.id); setIsEditingProject(false); }}
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
                                  {(project.status === 'Noticia' || project.status === 'Posts') ? (
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateProject(project.id, { status: 'Planejamento', isApproved: true, isDenied: false }); }}
                                        className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"
                                      >
                                        Aprovar
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); updateProject(project.id, { isCanceled: true, isDenied: true, isApproved: false }); }}
                                        className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded border border-red-100"
                                      >
                                        Negar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-xs text-indigo-600 font-medium hover:underline">
                                      Gerenciar
                                      <ChevronRight className="ml-0.5 h-3 w-3" />
                                    </div>
                                  )}
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

      {/* Project Detail Modal (Tasks & Edit) */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              {isEditingProject ? (
                <div className="w-full">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Editar Projeto</h3>
                  <form onSubmit={handleUpdateProject} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Nome da Empresa</label>
                        <input name="clientName" defaultValue={selectedProject.clientName} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Nome do Projeto / Título</label>
                        <input name="name" defaultValue={selectedProject.name} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                    </div>

                    {selectedProject.status === 'Noticia' && (
                      <div className="space-y-4 border-l-2 border-purple-200 pl-4 py-2">
                        <div>
                          <label className="block text-xs font-medium text-purple-700">Fonte</label>
                          <input name="source" defaultValue={selectedProject.source} className="mt-1 block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm p-2 border" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-purple-700">Enredo da Notícia</label>
                          <textarea name="newsPlot" defaultValue={selectedProject.newsPlot} className="mt-1 block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm p-2 border" rows={2} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-purple-700">Ideia de Post sobre a Notícia</label>
                          <textarea name="postIdea" defaultValue={selectedProject.postIdea} className="mt-1 block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm p-2 border" rows={2} />
                        </div>
                      </div>
                    )}

                    {selectedProject.status === 'Posts' && (
                      <div className="space-y-4 border-l-2 border-pink-200 pl-4 py-2">
                        <div>
                          <label className="block text-xs font-medium text-pink-700">Rede Social</label>
                          <select name="socialMedia" defaultValue={selectedProject.socialMedia} className="mt-1 block w-full rounded-md border-pink-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm p-2 border">
                            <option value="Instagram">Instagram</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Todas">Todas</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-pink-700">Ideia de Imagem</label>
                          <textarea name="imageIdea" defaultValue={selectedProject.imageIdea} className="mt-1 block w-full rounded-md border-pink-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm p-2 border" rows={2} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-pink-700">Contexto do Post</label>
                          <textarea name="postContext" defaultValue={selectedProject.postContext} className="mt-1 block w-full rounded-md border-pink-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm p-2 border" rows={2} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-pink-700">Data de Publicação</label>
                          <input name="publishDate" type="date" defaultValue={selectedProject.publishDate} className="mt-1 block w-full rounded-md border-pink-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm p-2 border" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Descrição</label>
                      <textarea name="description" defaultValue={selectedProject.description} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Valor (R$)</label>
                        <input name="value" type="number" defaultValue={selectedProject.value} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Data Final</label>
                        <input name="dueDate" type="date" defaultValue={selectedProject.dueDate} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Método de Pagamento</label>
                        <select name="paymentMethod" defaultValue={selectedProject.paymentMethod} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border">
                          <option value="Boleto">Boleto</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="PIX">PIX</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Detalhes Pagamento</label>
                        <input name="paymentDetails" defaultValue={selectedProject.paymentDetails} placeholder="Ex: 3x sem juros" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Taxa Implementação (R$)</label>
                        <input name="implementationFee" type="number" defaultValue={selectedProject.implementationFee} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700">Mensalidade (R$)</label>
                        <input name="monthlyFee" type="number" defaultValue={selectedProject.monthlyFee} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2 border" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 py-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="isRecurring" defaultChecked={selectedProject.isRecurring} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">Pagamento Recorrente</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="isCanceled" defaultChecked={selectedProject.isCanceled} className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">Projeto Cancelado</span>
                      </label>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <button type="button" onClick={() => setIsEditingProject(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                      <button type="submit" className="px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded">Salvar</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedProject.name}</h3>
                      <p className="text-sm text-slate-500">{selectedProject.clientName}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setIsEditingProject(true)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Editar Projeto"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este projeto?')) {
                            deleteProject(selectedProject.id);
                            setSelectedProjectId(null);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Excluir Projeto"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button onClick={() => setSelectedProjectId(null)} className="p-2 text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Project Financial Details */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-semibold">Valor Total</p>
                      <p className="text-sm font-bold text-slate-900">R$ {(selectedProject.value || 0).toLocaleString('pt-BR')}</p>
                    </div>
                    {selectedProject.implementationFee && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-semibold">Implementação</p>
                        <p className="text-sm font-medium text-slate-700">R$ {selectedProject.implementationFee.toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    {selectedProject.monthlyFee && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-semibold">Mensalidade</p>
                        <p className="text-sm font-medium text-slate-700">R$ {selectedProject.monthlyFee.toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    {selectedProject.paymentMethod && (
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-semibold">Pagamento</p>
                        <p className="text-sm font-medium text-slate-700">{selectedProject.paymentMethod} {selectedProject.paymentDetails ? `(${selectedProject.paymentDetails})` : ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {!isEditingProject && (
              <>
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
                          >
                            {editingTaskId === task.id ? (
                              <div className="flex items-center w-full gap-2">
                                <input 
                                  value={editedTaskTitle}
                                  onChange={(e) => setEditedTaskTitle(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTask(task.id)}
                                  className="flex-1 text-sm border-slate-300 rounded p-1"
                                  autoFocus
                                />
                                <button onClick={() => handleSaveTask(task.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Save className="h-4 w-4"/></button>
                                <button onClick={() => setEditingTaskId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X className="h-4 w-4"/></button>
                              </div>
                            ) : (
                              <>
                                <button 
                                  className="mr-3 text-indigo-600"
                                  onClick={() => toggleTask(selectedProject.id, task.id)}
                                >
                                  {task.completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                </button>
                                <span 
                                  className={cn("text-sm flex-1 cursor-pointer", task.completed && "line-through text-slate-400")}
                                  onClick={() => toggleTask(selectedProject.id, task.id)}
                                >
                                  {task.title}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                  <button 
                                    onClick={() => { setEditingTaskId(task.id); setEditedTaskTitle(task.title); }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => deleteTask(selectedProject.id, task.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </>
                            )}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedStatus === 'Noticia' ? 'Noticia' : selectedStatus === 'Posts' ? 'Post' : 'Novo Projeto'}
            </h3>
            <form
              onSubmit={handleCreateProject}
              className="space-y-4"
            >
              {/* Status Selection (Hidden if pre-selected, but we need it for the form) */}
              <input type="hidden" name="status" value={selectedStatus} />

              {selectedStatus === 'Planejamento' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Nome da Empresa</label>
                      <input name="clientName" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Nome do Projeto / Título</label>
                      <input name="name" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Tipo / Status Inicial</label>
                      <select 
                        defaultValue={preSelectedStatus || "Planejamento"}
                        onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus)}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      >
                        <option value="Noticia">Notícia</option>
                        <option value="Posts">Posts</option>
                        <option value="Planejamento">Planejamento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Data de Finalização</label>
                      <input name="dueDate" type="date" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                  </div>
                </>
              )}

              {/* Conditional Fields for News */}
              {selectedStatus === 'Noticia' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Fonte</label>
                    <input name="source" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Enredo da Notícia</label>
                    <textarea name="newsPlot" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Ideia de Post sobre a Notícia</label>
                    <textarea name="postIdea" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" rows={3} />
                  </div>
                </div>
              )}

              {/* Conditional Fields for Posts */}
              {selectedStatus === 'Posts' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Título</label>
                    <input name="name" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Rede social que irá postar</label>
                    <select name="socialMedia" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Todas">Todas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Ideia de Imagem</label>
                    <textarea name="imageIdea" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Contexto do Post</label>
                    <textarea name="postContext" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Data que será publicado</label>
                    <input name="publishDate" type="date" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                </div>
              )}

              {selectedStatus === 'Planejamento' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Descrição Breve</label>
                    <textarea name="description" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Valor Cobrado (R$)</label>
                      <input name="value" type="number" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Detalhes Financeiros</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Método de Pagamento</label>
                        <select name="paymentMethod" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                          <option value="Boleto">Boleto</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="PIX">PIX</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Detalhes (ex: 3x sem juros)</label>
                        <input name="paymentDetails" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Taxa de Implementação (R$)</label>
                        <input name="implementationFee" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Mensalidade (R$)</label>
                        <input name="monthlyFee" type="number" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 mt-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="isRecurring" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">Pagamento Recorrente</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" name="isCanceled" className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">Projeto Cancelado</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
              
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
                    selectedStatus === 'Noticia' ? 'Noticia' : selectedStatus === 'Posts' ? 'Post' : 'Criar Projeto'
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
