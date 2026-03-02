import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---

export type ProjectStatus = 'Planejamento' | 'Em Andamento' | 'Revisão' | 'Concluído';

export interface Lead {
  id: string;
  name: string;
  industry: string;
  contact: {
    instagram?: string;
    email?: string;
  };
  description: string;
  generatedAt: string; // ISO date (just the date part YYYY-MM-DD)
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
}

export interface Event {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  description?: string;
  location?: string;
  type: 'meeting' | 'work' | 'personal';
}

interface AppState {
  projects: Project[];
  transactions: Transaction[];
  events: Event[];
  leads: Lead[];
  partners: string[];
}

interface AppContextType extends AppState {
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addEvent: (event: Omit<Event, 'id'>) => void;
  deleteEvent: (id: string) => void;
  addLeads: (leads: Lead[]) => void;
  toggleTask: (projectId: string, taskId: string) => void;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => void;
}

// --- Initial Mock Data ---

const INITIAL_STATE: AppState = {
  partners: ['Você', 'Alex', 'Sara', 'Miguel'],
  leads: [],
  projects: [
    {
      id: '1',
      name: 'Campanha de Marketing Q3',
      clientName: 'Alpha Corp',
      description: 'Lançamento da nova linha de produtos nas redes sociais.',
      status: 'Em Andamento',
      dueDate: '2024-11-15',
      assignedTo: ['Alex', 'Sara'],
      progress: 65,
      value: 5000,
      tasks: [
        { id: 't1', title: 'Definir público-alvo', completed: true, type: 'done' },
        { id: 't2', title: 'Criar artes', completed: false, type: 'pending' },
      ],
    },
    {
      id: '2',
      name: 'Redesign do App Mobile',
      clientName: 'Beta Tech',
      description: 'Reformulação de UX/UI para o aplicativo do cliente.',
      status: 'Planejamento',
      dueDate: '2024-12-01',
      assignedTo: ['Miguel'],
      progress: 15,
      value: 12000,
      tasks: [],
    },
    {
      id: '3',
      name: 'Migração de Servidor',
      clientName: 'Interno',
      description: 'Mover infraestrutura para AWS.',
      status: 'Concluído',
      dueDate: '2024-10-01',
      assignedTo: ['Você', 'Miguel'],
      progress: 100,
      value: 0,
      tasks: [],
    },
  ],
  transactions: [
    { id: '1', date: '2024-10-25', description: 'Pagamento Cliente - Alpha Corp', amount: 15000, type: 'income', category: 'Vendas', provider: 'Alpha Corp', paymentMethod: 'PIX' },
    { id: '2', date: '2024-10-26', description: 'Hospedagem AWS', amount: 450, type: 'expense', category: 'Infraestrutura', provider: 'Amazon', paymentMethod: 'Cartão de Crédito' },
    { id: '3', date: '2024-10-27', description: 'Aluguel Escritório', amount: 2000, type: 'expense', category: 'Operacional', provider: 'Imobiliária', paymentMethod: 'Boleto' },
    { id: '4', date: '2024-10-28', description: 'Consultoria', amount: 5000, type: 'income', category: 'Serviços', provider: 'Gama Inc', paymentMethod: 'PIX' },
    { id: '5', date: '2024-10-29', description: 'Licenças de Software', amount: 1200, type: 'expense', category: 'Software', provider: 'Microsoft', paymentMethod: 'Cartão de Crédito' },
  ],
  events: [
    {
      id: '1',
      title: 'Reunião Semanal Sócios',
      start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
      end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
      type: 'meeting',
      description: 'Revisão de status de projetos e financeiro.',
    },
    {
      id: '2',
      title: 'Almoço com Cliente',
      start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Tomorrow
      end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
      type: 'work',
      location: 'Bistrô Central',
    },
  ],
};

// --- Context ---

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Load from localStorage or use initial state
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('nexus_app_state');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('nexus_app_state', JSON.stringify(state));
  }, [state]);

  const addProject = (project: Omit<Project, 'id'>) => {
    setState(prev => ({ ...prev, projects: [...prev.projects, { ...project, id: uuidv4() }] }));
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const deleteProject = (id: string) => {
    setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (transaction.paymentMethod === 'Cartão de Crédito' && transaction.installments && transaction.installments > 1) {
      const newTransactions: Transaction[] = [];
      const baseAmount = transaction.amount / transaction.installments;
      const startDate = new Date(transaction.date);

      for (let i = 0; i < transaction.installments; i++) {
        const installmentDate = new Date(startDate);
        installmentDate.setMonth(startDate.getMonth() + i);
        
        newTransactions.push({
          ...transaction,
          id: uuidv4(),
          amount: baseAmount,
          date: installmentDate.toISOString().split('T')[0],
          description: `${transaction.description} (${i + 1}/${transaction.installments})`,
          currentInstallment: i + 1,
        });
      }
      setState(prev => ({ ...prev, transactions: [...prev.transactions, ...newTransactions] }));
    } else {
      setState(prev => ({ ...prev, transactions: [...prev.transactions, { ...transaction, id: uuidv4() }] }));
    }
  };

  const toggleTask = (projectId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          const updatedTasks = p.tasks.map(t => 
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          // Recalculate progress
          const completedCount = updatedTasks.filter(t => t.completed).length;
          const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : p.progress;
          return { ...p, tasks: updatedTasks, progress };
        }
        return p;
      })
    }));
  };

  const addTask = (projectId: string, task: Omit<Task, 'id'>) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          const updatedTasks = [...p.tasks, { ...task, id: uuidv4() }];
          const completedCount = updatedTasks.filter(t => t.completed).length;
          const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : p.progress;
          return { ...p, tasks: updatedTasks, progress };
        }
        return p;
      })
    }));
  };

  const addEvent = (event: Omit<Event, 'id'>) => {
    setState(prev => ({ ...prev, events: [...prev.events, { ...event, id: uuidv4() }] }));
  };

  const deleteEvent = (id: string) => {
    setState(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
  };

  const addLeads = (newLeads: Lead[]) => {
    setState(prev => {
      const existingNames = new Set(prev.leads.map(l => l.name.toLowerCase()));
      const filteredNewLeads = newLeads.filter(l => !existingNames.has(l.name.toLowerCase()));
      return { ...prev, leads: [...prev.leads, ...filteredNewLeads] };
    });
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addProject,
        updateProject,
        deleteProject,
        addTransaction,
        addEvent,
        deleteEvent,
        addLeads,
        toggleTask,
        addTask,
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
