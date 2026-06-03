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
      <div className="min-h-screen bg-[#f4f5f8] text-slate-850 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/25 border-t-[#c3902c] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Portal...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/executive', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { label: 'Assigned Leads', path: '/executive/assigned', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { label: 'My Visits', path: '/executive/visits', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { label: 'In Progress', path: '/executive/in-progress', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Completed Cases', path: '/executive/completed', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Payments', path: '/executive/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Documents', path: '/executive/documents', icon: 'M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-8L8 4z' },
    { label: 'Gallery', path: '/executive/gallery', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Call Logs', path: '/executive/call-logs', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: 'Reports', path: '/executive/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm9-1h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2a2 2 0 00-2 2v3a2 2 0 002 2zm-8-3H8v3h2v-3z' },
    { label: 'Profile', path: '/executive/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'EX';
  };

  // Dynamically resolve page title
  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === pathname) || 
      (pathname.startsWith('/executive/lead/') ? { label: 'Lead Process Workflow' } : null);
    return currentItem ? currentItem.label : 'Executive Panel';
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f4f5f8] text-slate-800 font-sans selection:bg-[#c3902c] selection:text-black antialiased">
      
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#4d0711] border-b border-[#691823]/20 sticky top-0 z-40 w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold tracking-wider text-amber-300 font-mono text-sm">SIVA GOLD</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-amber-400 focus:outline-none p-1.5 rounded hover:bg-[#c3902c]/10 transition-colors"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5 animate-fadeIn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 animate-fadeIn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50
        w-72 h-full bg-[#4d0711] border-r border-[#691823]/20 flex flex-col shrink-0 select-none
      `}>
        {/* Branding header */}
        <div className="py-2 px-4 border-b border-[#691823]/20 flex flex-col items-center justify-center bg-white/5">
          <div className="w-full h-36 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-auto" />
          </div>
        </div>

        {/* User Stats Card */}
        <div className="p-5 border-b border-[#691823]/20 bg-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            {getInitials(user?.name || '')}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-100 truncate">{user?.name || 'Executive Agent'}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">
                Field Executive
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-5 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/executive/assigned' && pathname.startsWith('/executive/lead/'));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold' 
                    : 'text-amber-100/60 hover:bg-[#c3902c]/10 hover:text-amber-300'
                }`}
              >
                <svg className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-amber-100/40 group-hover:text-amber-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="px-4 pb-4 border-b border-[#691823]/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-amber-300 hover:bg-rose-500/10 hover:text-rose-450 border border-amber-500/30 hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout Portal
          </button>
        </div>

        {/* Support Sidebar Footer */}
        <div className="p-4 mx-4 mb-4 rounded-2xl bg-white/5 border border-[#691823]/20 flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Need Help?</span>
            <span className="text-[11px] font-black text-amber-400 font-mono mt-1">+91 888 999 5656</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Header Toolbar */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 capitalize">
              {getPageTitle()}
            </h2>
          </div>
          
          <div className="flex items-center gap-5">
            {/* Date display */}
            <div className="text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>02 June 2026, Monday</span>
            </div>

            {/* Profiles */}
            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-slate-800">
                {getInitials(user?.name || '')}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-none">{user?.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Field Executive</span>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Container */}
        <main className="flex-1 p-8 overflow-y-auto relative bg-[#f4f5f8]">
          <div className="max-w-7xl w-full mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
