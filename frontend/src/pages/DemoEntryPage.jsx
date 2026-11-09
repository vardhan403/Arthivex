import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DemoEntryPage() {
  const { demoLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const enterDemo = async () => {
      // If already authenticated as demo user, go directly to dashboard
      if (isAuthenticated && user?.role === 'DEMO_USER') {
        navigate('/dashboard', { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await demoLogin();
        if (isMounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        if (isMounted) {
          console.error('Demo authentication error:', err);
          setError(err.message || 'Failed to initialize the demo sandbox environment. Please try again.');
          setLoading(false);
        }
      }
    };

    enterDemo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0e1320] text-[#dee2f5] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#161b29] border border-[#283046]/70 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#ffb067]/10 border border-[#ffb067]/30 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[#ffb067] text-3xl">smart_toy</span>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-[#ffb067] border-t-transparent rounded-full animate-spin"></div>
            <div>
              <h2 className="text-lg font-bold text-white">Preparing Sandbox Environment...</h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Authenticating dedicated demo session & loading synthetic ledger data
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <span className="material-symbols-outlined text-rose-400 text-4xl">error</span>
            <div>
              <h2 className="text-lg font-bold text-white">Sandbox Initialization Failed</h2>
              <p className="text-xs text-rose-300/90 mt-1">{error}</p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  demoLogin().then(() => navigate('/dashboard', { replace: true })).catch(e => {
                    setError(e.message || 'Failed to initialize demo.');
                    setLoading(false);
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-[#ffb067] text-[#4c2700] text-xs font-bold hover:bg-[#ffa048] transition-all cursor-pointer"
              >
                Retry Demo Access
              </button>
              <Link
                to="/"
                className="px-5 py-2.5 rounded-xl bg-[#1a1f2d] text-slate-300 text-xs font-semibold hover:text-white transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

