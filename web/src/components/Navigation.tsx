import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bars3Icon, MoonIcon, SunIcon, XMarkIcon, ArrowRightOnRectangleIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { getVisibleNavItems, isPathActive } from '../config/navigation';
import { useSubscription } from '../hooks/useSubscription';

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#b8f36b] text-slate-950 shadow-[0_0_24px_rgba(184,243,107,.28)]">
        <TruckIcon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold tracking-tight text-white">FleetGuard AI</div>
        <div className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-400">Operations OS</div>
      </div>
    </div>
  );
}

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { hasFeature } = useSubscription();
  const visibleNavItems = user ? getVisibleNavItems(user.role).filter((item) => !item.feature || hasFeature(item.feature)) : [];

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setMobileMenuOpen(false);
    const onMouseDown = (event: MouseEvent) => {
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = (mobile = false) => (
    <div className={mobile ? 'space-y-1.5 px-3' : 'space-y-1.5 px-4'}>
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const active = isPathActive(location.pathname, item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              active ? 'bg-[#b8f36b] text-slate-950 shadow-[0_8px_24px_rgba(184,243,107,.18)]' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const footer = (mobile = false) => (
    <div className={`${mobile ? 'bg-[#0e1726]' : ''} border-t border-slate-800 p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Fleet operator'}</p>
          <p className="truncate text-xs capitalize text-slate-400">{user?.role?.replace(/_/g, ' ')}</p>
        </div>
        <button onClick={toggleTheme} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>
      </div>
      <button onClick={handleLogout} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/10">
        <ArrowRightOnRectangleIcon className="h-5 w-5" /> Sign out
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0b1220] lg:hidden">
        <div className="flex min-h-[60px] items-center justify-between px-3 sm:px-4">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
          <Brand />
          <button onClick={toggleTheme} className="rounded-xl p-2 text-slate-300 hover:bg-white/10" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </header>
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden" aria-hidden="true" onClick={() => setMobileMenuOpen(false)} />}
      <aside ref={mobileMenuRef} className={`fixed left-0 top-0 z-50 flex h-full w-[290px] max-w-[85vw] flex-col bg-[#0b1220] transition-transform duration-200 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Mobile navigation menu">
        <div className="border-b border-slate-800 p-5"><Brand /></div>
        <nav className="flex-1 overflow-y-auto py-5" aria-label="Mobile navigation">{navLinks(true)}</nav>
        {footer(true)}
      </aside>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-800 bg-[#0b1220] lg:flex" aria-label="Main navigation">
        <div className="border-b border-slate-800 px-6 py-5"><Brand /></div>
        <div className="px-6 py-5"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Workspace</div><div className="mt-1 text-sm font-semibold text-slate-100">Fleet command center</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[72%] rounded-full bg-[#b8f36b]" /></div><div className="mt-2 text-xs text-slate-400">AI systems online</div></div></div>
        <nav className="flex-1 overflow-y-auto pb-5" aria-label="Primary navigation">{navLinks()}</nav>
        {footer()}
      </aside>
    </>
  );
}
