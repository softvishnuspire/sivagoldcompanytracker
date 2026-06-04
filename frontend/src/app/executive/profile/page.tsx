'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../lib/api';

interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string;
  role: string;
  status: string;
  employee_code?: string;
  branch_id?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          const parsed = JSON.parse(storedUserStr);
          // Load fresh profile details from api
          const freshData = await apiRequest('/auth/me');
          setProfile(freshData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user profile.');
        // Fallback to localStorage data
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) setProfile(JSON.parse(storedUserStr));
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin"></div>
        <p className="text-amber-500/50 text-xs font-mono uppercase tracking-wider">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage and view your employee credentials and assigned branch.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[#c3902c] text-xs font-mono">
          Note: Showing cached profile info. ({error})
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-sm relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>

        {/* Big Avatar Symbol */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#c3902c] flex items-center justify-center text-3xl font-bold">
            💼
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{profile?.name}</h2>
            <p className="text-xs font-mono text-[#c3902c] uppercase tracking-widest mt-0.5">{profile?.role} Operations</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-4 text-xs font-mono">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Employee ID / Code</span>
            <span className="text-slate-800 font-bold">{profile?.employee_code || 'EMP-EX-003'}</span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Mobile Number</span>
            <span className="text-slate-800 font-bold">{profile?.mobile}</span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Email Address</span>
            <span className="text-slate-800 font-bold">{profile?.email}</span>
          </div>

          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-500">Account Status</span>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold uppercase">
              {profile?.status || 'Active'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Access Permissions</span>
            <span className="text-slate-800 font-bold">Executive Workspace Only</span>
          </div>
        </div>

      </div>
    </div>
  );
}
