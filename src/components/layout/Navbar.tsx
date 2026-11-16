'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe2, Key, BookOpen, ShieldCheck, LogOut, ArrowRight, Clock, Menu, X, Timer, CalendarDays } from 'lucide-react';

interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchSession();
    });
  }, [fetchSession, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { name: '3D Earth', href: '/', icon: Globe2 },
    { name: 'Compare', href: '/compare', icon: Clock },
    { name: 'Clock', href: '/clock', icon: Timer },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'API Docs', href: '/docs', icon: BookOpen },
    { name: 'Dashboard', href: '/dashboard', icon: Key },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-black/75 backdrop-blur-2xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center group-hover:border-[#fea082] transition-colors shadow-sm shrink-0">
            <Globe2 className="w-4 h-4 text-white group-hover:text-[#fea082] transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="font-light text-sm tracking-[0.2em] text-white uppercase group-hover:text-[#fea082] transition-colors whitespace-nowrap">
              TimeOrbit
            </span>
            <span className="text-[8.5px] text-[#fea082] tracking-[0.16em] uppercase font-mono -mt-0.5 whitespace-nowrap">
              Planetary Observatory
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links: Sleek Floating Glass Capsule */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-full p-1 backdrop-blur-md shadow-inner shrink-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-[0_0_12px_rgba(254,160,130,0.2)] border border-white/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-light'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#fea082]' : 'text-zinc-500'}`} />
                <span className="whitespace-nowrap">{link.name}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#fea082] shadow-[0_0_6px_#fea082] ml-0.5" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Actions & Admin Controls */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap shrink-0 border ${
                pathname === '/admin'
                  ? 'bg-[#fea082]/20 border-[#fea082] text-white font-medium shadow-[0_0_10px_rgba(254,160,130,0.2)]'
                  : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${pathname === '/admin' ? 'text-[#fea082]' : 'text-zinc-500'}`} />
              <span className="whitespace-nowrap">Admin</span>
            </Link>
          )}

          {loading ? (
            <div className="w-20 h-7 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-full pl-1.5 pr-2 py-1 shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white group shrink-0 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-full bg-[#fea082]/20 border border-[#fea082]/40 text-[#fea082] flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block whitespace-nowrap">
                  <div className="text-xs font-light text-white whitespace-nowrap">
                    {user.name}
                  </div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1 rounded-full text-zinc-500 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <Link
                href="/login"
                className="px-3 py-1 rounded-full text-xs font-light text-zinc-400 hover:text-white transition-all whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs glow-btn whitespace-nowrap shrink-0"
              >
                <span>API Key</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/95 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wider uppercase text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <link.icon className="w-4 h-4 text-[#fea082]" />
              <span>{link.name}</span>
            </Link>
          ))}
          {!user && (
            <div className="pt-2 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs tracking-wider uppercase border border-white/20 rounded-lg text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs glow-btn rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
