'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Coins, 
  PhoneCall, 
  UserCheck, 
  MapPin, 
  TrendingUp, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ArrowRight, 
  ShieldCheck, 
  Check,
  Info
} from 'lucide-react';

type UserRole = 'telecaller' | 'rm' | 'executive' | 'md';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('telecaller');
  const [email, setEmail] = useState('agent01@sivagold.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleDetails: Record<UserRole, { title: string; desc: string; label: string; icon: React.ComponentType<any> }> = {
    telecaller: {
      title: 'Telecaller',
      label: 'Telecaller Portal (Active)',
      desc: 'Lead Intake & Verification Workspace',
      icon: PhoneCall
    },
    rm: {
      title: 'Regional Manager',
      label: 'Regional Manager (RM)',
      desc: 'Pledge Approvals & Field Assigns',
      icon: UserCheck
    },
    executive: {
      title: 'Field Executive',
      label: 'Field Executive Panel',
      desc: 'Gold Appraisals & Bank Transactions',
      icon: MapPin
    },
    md: {
      title: 'Managing Director',
      label: 'Managing Director (MD)',
      desc: 'Corporate Analytics & Conversion Reports',
      icon: TrendingUp
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      // Send login request to secured backend API
      const res = await fetch(`${cleanApiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          role: role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials or role mismatch.');
      }

      // Save user session details with all expected keys
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('siva_token', data.token);
      localStorage.setItem('siva_user', JSON.stringify(data.user));

      // Redirect based on selected role
      if (role === 'executive') {
        router.push('/executive');
      } else if (role === 'telecaller') {
        router.push('/telecaller');
      } else if (role === 'rm') {
        router.push('/rm');
      } else if (role === 'md') {
        router.push('/md');
      } else {
        throw new Error('Role workspace portal is not registered.');
      }
    } catch (err: any) {
      console.error('Failed to sign in:', err);
      setNotification(err.message || 'Network error connecting to authentication server.');
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const ActiveRoleIcon = roleDetails[role].icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#4d0711] to-[#200206] text-slate-800 flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Background ambient gold gradient glows */}
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-[#c3902c]/22 blur-[130px] pointer-events-none z-0" />
      <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] rounded-full bg-[#c3902c]/18 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] rounded-full bg-[#c3902c]/12 blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] rounded-full bg-[#c3902c]/15 blur-[110px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] rounded-full bg-[#c3902c]/10 blur-[110px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-white/5 blur-[150px] pointer-events-none z-0" />

      {/* Floating notification toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xl animate-scaleUp flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Info size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-slate-900">Security Alert</h5>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{notification}</p>
          </div>
        </div>
      )}

      {/* Main card wrapper */}
      <div className="max-w-4xl w-full min-h-[540px] bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(32,2,6,0.3)] flex flex-col md:flex-row z-10 animate-scaleUp">
        
        {/* Left Pane: Brand identity banner */}
        <div className="w-full md:w-[46%] bg-slate-50/60 p-6 sm:p-8 flex flex-col justify-between gap-10 border-b md:border-b-0 md:border-r border-slate-200/80 relative">
          
          {/* Logo container */}
          <div className="w-full">
            <div className="w-full h-36 sm:h-44 flex items-center justify-center overflow-hidden bg-[#3d1510] rounded-2xl p-0 border border-[#c3902c]/30 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
              <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-full object-contain scale-[1.7]" />
            </div>
          </div>

          {/* Core messages */}
          <div className="space-y-4 my-10 md:my-0">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              Welcome<br />Back
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Access your authorized workspace portal by selecting your designated role and entering credentials. Real-time updates and synchronization are active.
            </p>
          </div>

          {/* Secured watermark footer */}
          <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase font-bold tracking-wider">
            <ShieldCheck size={13} className="text-[#c3902c]" /> Secured internal workspace
          </div>
        </div>

        {/* Right Pane: Login Form inputs */}
        <div className="w-full md:w-[54%] p-6 sm:p-8 md:p-10 flex flex-col justify-center gap-6 bg-white">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-800">Select your role</h2>
            <p className="text-xs text-slate-450">Choose your workspace to continue</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            
            {/* Custom role select popover container */}
            <div className="space-y-2" ref={dropdownRef}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Workspace Role
              </label>
              
              <div className="relative">
                {/* Trigger Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-10 text-xs text-slate-700 outline-none focus:border-[#c3902c] focus:ring-1 focus:ring-amber-500/10 flex items-center justify-between font-bold cursor-pointer text-left"
                >
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c3902c] p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <ActiveRoleIcon size={14} />
                  </span>
                  <span>{roleDetails[role].label}</span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options overlay */}
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-20 animate-scaleUp divide-y divide-slate-100">
                    {(Object.keys(roleDetails) as UserRole[]).map((roleKey) => {
                      const item = roleDetails[roleKey];
                      const ItemIcon = item.icon;
                      const isSelected = role === roleKey;

                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => {
                            setRole(roleKey);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-200 cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500/10 text-amber-700 border-l-2 border-amber-500' 
                              : 'text-slate-550 hover:bg-slate-50 hover:text-slate-800'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <ItemIcon size={14} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold flex items-center justify-between">
                              {item.title}
                              {isSelected && <Check size={12} className="text-amber-500" />}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 outline-none focus:border-[#c3902c] focus:ring-1 focus:ring-amber-500/10 placeholder-slate-400"
                  placeholder="name@sivagold.com"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset simulation.')}
                  className="text-[9px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-xs text-slate-700 outline-none focus:border-[#c3902c] focus:ring-1 focus:ring-amber-500/10 placeholder-slate-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Action submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#c3902c] hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-[0_4px_16px_rgba(195,144,44,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : `Sign In as ${roleDetails[role].title}`} <ArrowRight size={14} className="text-white" />
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
