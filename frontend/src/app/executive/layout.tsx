'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  name: string;
  mobile: string;
  role: string;
  email: string;
}

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role.toUpperCase() !== 'EXECUTIVE' && parsedUser.role.toUpperCase() !== 'MD') {
        alert('Access Denied. Executive Portal requires Executive or MD role.');
        localStorage.clear();
        router.push('/');
        return;
      }
      setUser(parsedUser);
    } catch (err) {
      localStorage.clear();
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#300f0f] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
          <p className="text-amber-500/70 text-sm font-mono tracking-widest">LOADING PORTAL...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/executive', icon: '📊' },
    { label: 'Assigned Leads', path: '/executive/assigned', icon: '📋' },
    { label: 'My Visits', path: '/executive/visits', icon: '🚗' },
    { label: 'In Progress', path: '/executive/in-progress', icon: '⏳' },
    { label: 'Completed Cases', path: '/executive/completed', icon: '✅' },
    { label: 'Payments', path: '/executive/payments', icon: '💳' },
    { label: 'Documents', path: '/executive/documents', icon: '📁' },
    { label: 'Gallery', path: '/executive/gallery', icon: '🖼️' },
    { label: 'Call Logs', path: '/executive/call-logs', icon: '📞' },
    { label: 'Reports', path: '/executive/reports', icon: '📈' },
    { label: 'Profile', path: '/executive/profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#1a0808] via-[#300f0f] to-[#471a15] text-[#d9d9da] font-sans antialiased">
      
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#3d1510]/80 backdrop-blur-md border-b border-amber-500/10 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            S
          </div>
          <span className="font-bold tracking-wider text-amber-500 font-mono text-sm">SHIVA GOLD</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-amber-500 focus:outline-none p-1 rounded hover:bg-amber-500/10 transition-colors"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50
        w-64 bg-[#3d1510]/95 md:bg-[#3d1510]/50 md:backdrop-blur-md border-r border-amber-500/10 flex flex-col h-screen overflow-y-auto
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              S
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-amber-500 font-mono text-sm leading-tight">SHIVA GOLD</h1>
              <p className="text-[10px] text-amber-500/60 font-mono tracking-widest">EXECUTIVE</p>
            </div>
          </div>
          <button className="md:hidden text-amber-500/60 hover:text-amber-500" onClick={() => setMobileMenuOpen(false)}>
            ✕
          </button>
        </div>

        {/* User Stats Card */}
        <div className="px-4 py-5 border-b border-amber-500/10 bg-amber-500/5 m-3 rounded-xl border border-amber-500/5">
          <p className="text-xs text-amber-500/70 font-mono">Welcome back,</p>
          <p className="font-medium text-amber-400 truncate text-sm">{user?.name}</p>
          <div className="inline-block mt-2 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-400">
            {user?.role.toUpperCase()}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 font-medium border-l-2 border-amber-500' 
                    : 'text-slate-400 hover:bg-[#471a15]/40 hover:text-slate-100'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-amber-500/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-red-500/10 transition-all font-mono"
          >
            <span>🚪</span>
            <span>LOGOUT</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#300f0f]/30">
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children}
        </div>
      </main>

    </div>
  );
}
