import React from 'react';

/**
 * StateSimulatorBar
 * Interactive diagnostic simulator bar represented in Stitch screens.
 * Allows auditors and developers to preview all UI states:
 * - Default Data State
 * - Loading Skeleton State
 * - Empty State
 * - 422 / 504 Simulated Network/Validation Error State
 */
export default function StateSimulatorBar({ currentState, onStateChange, title = 'Screen State Simulator' }) {
  const states = [
    { id: 'default', label: 'Default Data', icon: 'check_circle' },
    { id: 'loading', label: 'Loading Skeleton', icon: 'hourglass_top' },
    { id: 'empty', label: 'Empty State', icon: 'inbox' },
    { id: 'error', label: 'Simulate 504 / Error', icon: 'error_outline' }
  ];

  return (
    <div className="bg-[#161b29]/90 border border-[#283046] rounded-xl px-4 py-2.5 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner-border">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="material-symbols-outlined text-[#ffb067] text-sm">tune</span>
        <span className="font-semibold text-slate-300">{title}:</span>
        <span className="text-slate-500 hidden sm:inline">Audit UX responsiveness across edge cases</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {states.map((st) => {
          const isActive = currentState === st.id;
          return (
            <button
              key={st.id}
              onClick={() => onStateChange(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                isActive
                  ? 'bg-[#ffb067] text-[#090e1b] font-semibold shadow-glow-peach-sm'
                  : 'bg-[#222838] text-slate-300 hover:bg-[#2e3549] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-xs">{st.icon}</span>
              {st.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

