import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090e1b] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#ffb067] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono tracking-widest text-[#ffb067] uppercase">Verifying Administrator Privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMINISTRATOR') {
    return (
      <div className="min-h-screen bg-[#090e1b] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#161b29] border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-3xl">gpp_bad</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Prohibited (403)</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Your authenticated session (<span className="text-slate-200 font-mono">{user?.email}</span>) holds the role of{' '}
            <span className="font-semibold text-[#ffb067]">{user?.role}</span>. Administrative console access is strictly restricted to verified <span className="font-semibold text-rose-400">ADMINISTRATOR</span> accounts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-[#ffb067] text-[#2e1500] font-bold text-sm hover:bg-[#ffa04d] transition-colors"
            >
              Return to Vault Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

