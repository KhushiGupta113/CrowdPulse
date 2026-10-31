'use client';

import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };
    update();
    window.addEventListener('themechange', update);
    return () => window.removeEventListener('themechange', update);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);

    if (nextTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event('themechange'));
  };

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold text-slate-400 bg-slate-900/80 transition-all opacity-80"
      >
        <span className="material-symbols-outlined text-[17px]">dark_mode</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700/80 hover:border-cyan-500/80 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
    >
      {isDark ? (
        <>
          <span className="material-symbols-outlined text-[17px] text-amber-400">light_mode</span>
          <span className="hidden xl:inline text-[11px] font-mono text-slate-600 dark:text-slate-300">Light</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[17px] text-cyan-600 dark:text-cyan-400">dark_mode</span>
          <span className="hidden xl:inline text-[11px] font-mono text-slate-600 dark:text-slate-300">Dark</span>
        </>
      )}
    </button>
  );
}