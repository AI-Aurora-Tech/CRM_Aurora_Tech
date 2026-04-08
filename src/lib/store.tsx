import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---

export type ProjectStatus = 'Planejamento' | 'Em Andamento' | 'Revisão' | 'Concluído' | 'Noticia' | 'Posts';

export type LeadStatus = 'Novo' | 'Primeiro Contato' | 'Em Negociação' | 'Resposta Positiva' | 'Resposta Negativa' | 'Convertido';

export interface Lead {
  id: string;
  name: string;
  industry: string;
  contact: {
    instagram?: string;
    email?: string;
    whatsapp?: string;
    googleMapsLink?: string;
  };
  description: string;
  generatedAt: string; // ISO date (just the date part YYYY-MM-DD)
  status: LeadStatus;
  language?: 'pt-BR' | 'en';
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'done' | 'pending' | 'future';
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  dueDate: string;
  assignedTo: string[];
  progress: number;
  value: number;
  tasks: Task[];
  paymentMethod?: string;
  paymentDetails?: string;
  implementationFee?: number;
  monthlyFee?: number;
  isRecurring?: boolean;
  isCanceled?: boolean;
  // News specific fields
  source?: string;
  newsPlot?: string;
  postIdea?: string;
  // Post specific fields
  socialMedia?: string;
  imageIdea?: string;
  postContext?: string;
  publishDate?: string;
  // Approval status
  isApproved?: boolean;
  isDenied?: boolean;
}

export type PaymentMethod = 'Boleto' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  provider: string;
  paymentMethod: PaymentMethod;
  installments?: number;
  currentInstallment?: number;
  status?: 'paid' | 'pending' | 'standby';
  projectId?: string;
}

export interface Event {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  description?: string;
  location?: string;
  type: 'meeting' | 'work' | 'personal';
  tag?: string;
  color?: string;
}

interface AppState {
  projects: Project[];
  transactions: Transaction[];
  events: Event[];
  leads: Lead[];
  partners: string[];
}

interface AppContextType extends AppState {
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addLeads: (leads: Lead[]) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  toggleTask: (projectId: string, taskId: string) => Promise<void>;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
}

// --- Initial Mock Data ---

const INITIAL_STATE: AppState = {
  partners: ['Você', 'Alex', 'Sara', 'Miguel'],
  leads: [],
  projects: [],
  transactions: [],
  events: [],
};

// --- Context ---

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('aurora_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('aurora_token');
  });

  // Fetch data when token changes
  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setState(INITIAL_STATE);
    }
  }, [token]);

  const fetchData = async () => {
    try {
      if (!token) return;
      
      const headers = { 'Authorization': `Bearer ${token}` };
      const fetchJson = async (url: string) => {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      };

      const [projects, transactions, events, leads] = await Promise.all([
        fetchJson('/api/projects'),
        fetchJson('/api/transactions'),
        fetchJson('/api/events'),
        fetchJson('/api/leads'),
      ]);

      setState(prev => ({
        ...prev,
        projects: Array.isArray(projects) ? projects : [],
        transactions: Array.isArray(transactions) ? transactions : [],
        events: Array.isArray(events) ? events : [],
        leads: Array.isArray(leads) ? leads : [],
      }));
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.error || 'E-mail ou senha incorretos.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('aurora_token', data.token);
      localStorage.setItem('aurora_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Ocorreu um erro ao tentar entrar. Verifique sua conexão.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aurora_token');
    localStorage.removeItem('aurora_user');
  };

  const changePassword = async (newPassword: string) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword }),
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const addProject = async (project: Omit<Project, 'id'>) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(project),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Falha ao criar projeto');
    }
    const data = await res.json();
    const projectId = data.id;

    // Financial Sync Logic for new projects
    if (project.status !== 'Planejamento' && project.isRecurring && project.monthlyFee && project.monthlyFee > 0) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(10);
      
      await addTransaction({
        date: nextMonth.toISOString().split('T')[0],
        description: `Mensalidade: ${project.name}`,
        amount: project.monthlyFee,
        type: 'income',
        category: 'Serviços',
        provider: project.clientName,
        paymentMethod: (project.paymentMethod as any) || 'PIX',
        status: 'pending',
        projectId: projectId
      });
    }

    fetchData();
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const previousProject = state.projects.find(p => p.id === id);
    
    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Falha ao atualizar projeto');

      // Financial Sync Logic
      if (previousProject && updates.status && previousProject.status === 'Planejamento' && updates.status !== 'Planejamento') {
        const isRecurring = updates.isRecurring !== undefined ? updates.isRecurring : previousProject.isRecurring;
        const monthlyFee = updates.monthlyFee !== undefined ? updates.monthlyFee : previousProject.monthlyFee;
        
        if (isRecurring && monthlyFee && monthlyFee > 0) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(10);
          
          await addTransaction({
            date: nextMonth.toISOString().split('T')[0],
            description: `Mensalidade: ${updates.name || previousProject.name}`,
            amount: monthlyFee,
            type: 'income',
            category: 'Serviços',
            provider: updates.clientName || previousProject.clientName,
            paymentMethod: (updates.paymentMethod as any) || previousProject.paymentMethod || 'PIX',
            status: 'pending',
            projectId: id
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      fetchData();
    }
  };

  const deleteProject = async (id: string) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id)
    }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao deletar projeto');
    } catch (error) {
      console.error(error);
    } finally {
      fetchData();
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(transaction),
    });
    if (!res.ok) throw new Error('Falha ao criar transação');
    fetchData();
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
    }));

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Falha ao atualizar transação');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const deleteTransaction = async (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao deletar transação');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    // Optimistic update
    setState(prev => {
      const newProjects = prev.projects.map(p => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map(t => {
          if (t.id !== taskId) return t;
          const newCompleted = !t.completed;
          return { ...t, completed: newCompleted, type: newCompleted ? 'done' : 'pending' } as Task;
        });
        
        // Recalculate progress
        const totalTasks = newTasks.length;
        const completedTasks = newTasks.filter(t => t.completed).length;
        const newProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return { ...p, tasks: newTasks, progress: newProgress };
      });
      return { ...prev, projects: newProjects };
    });

    try {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return;
      const task = project.tasks.find(t => t.id === taskId);
      if (!task) return;

      const newCompleted = !task.completed;
      const newType = newCompleted ? 'done' : 'pending';

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: newCompleted, type: newType }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar tarefa');
    } catch (error) {
      console.error(error);
    } finally {
      fetchData();
    }
  };

  const addTask = async (projectId: string, task: Omit<Task, 'id'>) => {
    // Optimistic update with temporary ID
    const tempId = uuidv4();
    const newTask: Task = { ...task, id: tempId, completed: false, type: 'pending' };

    setState(prev => {
      const newProjects = prev.projects.map(p => {
        if (p.id !== projectId) return p;
        const newTasks = [...p.tasks, newTask];
        
        // Recalculate progress
        const totalTasks = newTasks.length;
        const completedTasks = newTasks.filter(t => t.completed).length;
        const newProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return { ...p, tasks: newTasks, progress: newProgress };
      });
      return { ...prev, projects: newProjects };
    });

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(task),
      });
      if (!res.ok) throw new Error('Falha ao adicionar tarefa');
    } catch (error) {
      console.error(error);
      // Remove optimistic task on error
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, tasks: p.tasks.filter(t => t.id !== tempId) };
        })
      }));
    } finally {
      fetchData();
    }
  };

  const updateTask = async (projectId: string, taskId: string, updates: Partial<Task>) => {
    setState(prev => {
      const newProjects = prev.projects.map(p => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        return { ...p, tasks: newTasks };
      });
      return { ...prev, projects: newProjects };
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Falha ao atualizar tarefa');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    setState(prev => {
      const newProjects = prev.projects.map(p => {
        if (p.id !== projectId) return p;
        const newTasks = p.tasks.filter(t => t.id !== taskId);
        
        // Recalculate progress
        const totalTasks = newTasks.length;
        const completedTasks = newTasks.filter(t => t.completed).length;
        const newProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        return { ...p, tasks: newTasks, progress: newProgress };
      });
      return { ...prev, projects: newProjects };
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao deletar tarefa');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const addEvent = async (event: Omit<Event, 'id'>) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || 'Falha ao criar evento');
      }
      
      fetchData();
    } catch (error: any) {
      console.error('Erro ao adicionar evento:', error);
      throw error;
    }
  };

  const updateEvent = async (id: string, updates: Partial<Event>) => {
    setState(prev => ({
      ...prev,
      events: prev.events.map(e => e.id === id ? { ...e, ...updates } : e)
    }));

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Falha ao atualizar evento');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) fetchData();
  };

  const addLeads = async (newLeads: Lead[]) => {
    // Atualização otimista para mostrar os leads na tela imediatamente
    setState(prev => ({
      ...prev,
      leads: [...prev.leads, ...newLeads]
    }));

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeads),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao salvar leads no banco de dados');
      }
      
      fetchData();
    } catch (error: any) {
      console.error("Erro ao salvar leads:", error);
      throw new Error(`Os leads foram gerados, mas houve um erro ao salvá-los no banco de dados: ${error.message}. Verifique se a tabela 'leads' existe no Supabase.`);
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setState(prev => ({
      ...prev,
      leads: prev.leads.map(l => l.id === id ? { ...l, ...updates } : l)
    }));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Falha ao atualizar lead');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const deleteLead = async (id: string) => {
    setState(prev => ({
      ...prev,
      leads: prev.leads.filter(l => l.id !== id)
    }));

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao deletar lead');
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        user,
        token,
        login,
        logout,
        changePassword,
        addProject,
        updateProject,
        deleteProject,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addEvent,
        updateEvent,
        deleteEvent,
        addLeads,
        updateLead,
        deleteLead,
        toggleTask,
        addTask,
        updateTask,
        deleteTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
