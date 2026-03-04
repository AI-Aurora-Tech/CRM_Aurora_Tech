import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Briefcase, DollarSign, User, Users, LogOut, Key, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../lib/store';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projetos', icon: Briefcase },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/finance', label: 'Financeiro', icon: DollarSign },
  { path: '/leads', label: 'Leads', icon: Users },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout, changePassword } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChanging(true);
    setMessage({ text: '', type: '' });
    
    const success = await changePassword(newPassword);
    if (success) {
      setMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      setNewPassword('');
      setTimeout(() => setIsPasswordModalOpen(false), 2000);
    } else {
      setMessage({ text: 'Erro ao alterar senha.', type: 'error' });
    }
    setIsChanging(false);
  };

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Aurora</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-3">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'CEO & Fundador'}</p>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <button 
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Key className="mr-3 h-4 w-4" />
                Alterar Senha
              </button>
              <button 
                onClick={logout}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-200 z-10">
           <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Aurora</span>
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-2 text-slate-600"
            >
              <User className="h-6 w-6" />
            </button>
            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <button 
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Key className="mr-3 h-4 w-4" />
                  Alterar Senha
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex justify-around items-center z-50 pb-safe">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "fill-current/10")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </main>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-lg font-bold text-slate-900">Alterar Senha</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {message.text && (
                <div className={cn(
                  "px-4 py-3 rounded-lg text-sm border",
                  message.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                  {message.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Digite sua nova senha"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChanging || !newPassword}
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center"
                >
                  {isChanging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
