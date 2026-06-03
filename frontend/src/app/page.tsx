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
    <div className="min-h-screen bg-brand-cherry text-brand-silver flex items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* Background ambient gold gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-brand-mahogany/15 blur-[130px] pointer-events-none z-0" />

      {/* Floating notification toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full bg-brand-mahogany border border-brand-copper/50 rounded-2xl p-4 shadow-2xl animate-scaleUp flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-copper/10 text-brand-silver border border-brand-copper/20">
            <Info size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold text-white">Security Alert</h5>
            <p className="text-[11px] text-brand-slate mt-0.5 leading-normal">{notification}</p>
          </div>
        </div>
      )}

      {/* Main card wrapper */}
      <div className="max-w-4xl w-full min-h-[520px] bg-brand-mahogany/45 border border-brand-copper/25 backdrop-blur-md rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(61,21,16,0.35)] flex flex-col md:flex-row z-10 animate-scaleUp">
        
        {/* Left Pane: Brand identity banner */}
        <div className="w-full md:w-5/12 bg-brand-cherry/30 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-brand-copper/20 relative">
          
          {/* Logo container */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Siva Gold Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-brand-silver uppercase">Shiva Gold</span>
              <span className="text-[9px] text-brand-slate font-bold uppercase tracking-widest mt-0.5">Management Portal</span>
            </div>
          </div>

          {/* Core messages */}
          <div className="space-y-4 my-10 md:my-0">
            <h1 className="text-3xl font-black text-brand-silver tracking-tight leading-tight">
              Welcome<br />Back
            </h1>
            <p className="text-xs text-brand-slate leading-relaxed">
              Access your personalized dashboard by selecting your designated role below. Gold tracking and contact logs are synchronized in real-time.
            </p>
          </div>

          {/* Secured watermark footer */}
          <div className="flex items-center gap-2 text-[9px] text-brand-slate uppercase font-bold tracking-wider">
            <ShieldCheck size={13} className="text-brand-copper/60" /> Secured internal workspace
          </div>
        </div>

        {/* Right Pane: Login Form inputs */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center gap-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-brand-silver">Select your role</h2>
            <p className="text-xs text-brand-slate">Choose your workspace to continue</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            
            {/* Custom role select popover container */}
            <div className="space-y-2" ref={dropdownRef}>
              <label className="block text-[10px] font-bold text-brand-slate uppercase tracking-wider">
                Workspace Role
              </label>
              
              <div className="relative">
                {/* Trigger Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-3 pl-12 pr-10 text-xs text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 flex items-center justify-between font-bold cursor-pointer text-left"
                >
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-silver p-1 rounded-lg bg-brand-cherry/60 border border-brand-copper/15">
                    <ActiveRoleIcon size={14} />
                  </span>
                  <span>{roleDetails[role].label}</span>
                  <ChevronDown size={15} className={`text-brand-slate transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options overlay */}
                {dropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-brand-mahogany border border-brand-copper/35 rounded-xl shadow-2xl overflow-hidden z-20 animate-scaleUp divide-y divide-brand-copper/10">
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
                              ? 'bg-brand-copper/20 text-brand-silver border-l-2 border-brand-copper' 
                              : 'text-brand-slate hover:bg-brand-copper/10 hover:text-brand-silver'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-brand-cherry/60 border border-brand-copper/10">
                            <ItemIcon size={14} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold flex items-center justify-between">
                              {item.title}
                              {isSelected && <Check size={12} className="text-brand-silver" />}
                            </div>
                            <div className="text-[10px] text-brand-slate/80 truncate mt-0.5">{item.desc}</div>
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
              <label className="block text-[10px] font-bold text-brand-slate uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-3 pl-10 pr-4 text-xs text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/30"
                  placeholder="name@sivagold.com"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-brand-slate uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset simulation.')}
                  className="text-[9px] font-bold text-brand-copper hover:text-brand-silver transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate">
                  <Lock size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-cherry/40 border border-brand-copper/20 rounded-xl py-3 pl-10 pr-10 text-xs text-brand-silver outline-none focus:border-brand-copper focus:ring-1 focus:ring-brand-copper/20 placeholder-brand-slate/30"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-slate hover:text-brand-silver transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Action submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-brand-copper hover:bg-brand-copper/90 text-brand-silver text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-[0_0_24px_rgba(101,72,59,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : `Sign In as ${roleDetails[role].title}`} <ArrowRight size={14} />
            </button>

          </form>
        </div>

      </div>
    </div>
  );
}
