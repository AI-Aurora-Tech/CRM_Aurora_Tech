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
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addLeads: (leads: Lead[]) => Promise<void>;
  toggleTask: (projectId: string, taskId: string) => Promise<void>;
  addTask: (projectId: string, task: Omit<Task, 'id'>) => Promise<void>;
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
    const saved = localStorage.getItem('aurora_user');
    return saved ? JSON.parse(saved) : null;
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
      const headers = { 'Authorization': `Bearer ${token}` };
      const [projects, transactions, events, leads] = await Promise.all([
        fetch('/api/projects', { headers }).then(res => res.json()),
        fetch('/api/transactions', { headers }).then(res => res.json()),
        fetch('/api/events', { headers }).then(res => res.json()),
        fetch('/api/leads', { headers }).then(res => res.json()),
      ]);

      setState(prev => ({
        ...prev,
        projects: projects || [],
        transactions: transactions || [],
        events: events || [],
        leads: leads || [],
      }));
    } catch (err) {
      console.error('Failed to fetch data', err);
      if (err instanceof Error && err.message.includes('401')) {
        logout();
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('aurora_token', data.token);
      localStorage.setItem('aurora_user', JSON.stringify(data.user));
      return true;
    } catch (err) {
      return false;
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
    if (res.ok) fetchData();
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchData();
  };

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) fetchData();
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
    if (res.ok) fetchData();
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return;

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed: !task.completed }),
    });
    if (res.ok) fetchData();
  };

  const addTask = async (projectId: string, task: Omit<Task, 'id'>) => {
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(task),
    });
    if (res.ok) fetchData();
  };

  const addEvent = async (event: Omit<Event, 'id'>) => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(event),
    });
    if (res.ok) fetchData();
  };

  const deleteEvent = async (id: string) => {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) fetchData();
  };

  const addLeads = async (newLeads: Lead[]) => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newLeads),
    });
    if (res.ok) fetchData();
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
