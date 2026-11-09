import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', showLabel = false, size = 'default' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Dark Mode active • Click to switch to Light Mode' : 'Light Mode active • Click to switch to Dark Mode'}
      className={`group relative flex items-center justify-center gap-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffb067]/40 cursor-pointer ${
        size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
      } ${
        isDark
          ? 'bg-[#161b29] hover:bg-[#20273a] text-[#ffb067] border border-[#283046] hover:border-[#ffb067]/40 shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-300 hover:border-amber-500/50 shadow-sm'
      } ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:rotate-45 ${
          isDark ? 'text-[#ffb067]' : 'text-amber-500'
        }`}
      >
        {isDark ? 'dark_mode' : 'light_mode'}
      </span>
      {showLabel && (
        <span className="text-xs font-semibold font-mono uppercase tracking-wider">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

