import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Briefcase, DollarSign, Menu, User, Users } from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projetos', icon: Briefcase },
  { path: '/agenda', label: 'Agenda', icon: Calendar },
  { path: '/finance', label: 'Financeiro', icon: DollarSign },
  { path: '/leads', label: 'Leads', icon: Users },
];

export default function Layout() {
  const location = useLocation();

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

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center px-4 py-3 rounded-xl bg-slate-50">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium mr-3">
              JD
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Pedro Santos</p>
              <p className="text-xs text-slate-500">CEO & Fundador</p>
            </div>
          </div>
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
          <button className="p-2 text-slate-600">
            <User className="h-6 w-6" />
          </button>
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
    </div>
  );
}
