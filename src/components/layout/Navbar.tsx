'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Globe2, Key, BookOpen, ShieldCheck, LogOut, ArrowRight, Clock, Menu, X } from 'lucide-react';

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
    { name: 'Compare Studio', href: '/compare', icon: Clock },
    { name: 'API Docs', href: '/docs', icon: BookOpen },
    { name: 'Dashboard', href: '/dashboard', icon: Key },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo (Inspired by Solar Explorer .logo) */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center group-hover:border-[#fea082] transition-colors">
            <Globe2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-light text-sm sm:text-base tracking-[0.25em] text-white uppercase group-hover:text-[#fea082] transition-colors">
              TimeOrbit
            </span>
            <span className="text-[9px] text-[#fea082] tracking-[0.2em] uppercase font-light -mt-0.5">
              Planetary Time & Orbit
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs tracking-[0.14em] uppercase transition-all ${
                  isActive
                    ? 'text-white border-b-2 border-[#fea082] bg-white/5 font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 font-light'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#fea082]' : 'text-zinc-500'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {/* Admin Panel Link */}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs tracking-[0.14em] uppercase transition-all ${
                pathname === '/admin'
                  ? 'bg-purple-950/40 text-purple-200 border border-purple-500/50'
                  : 'text-purple-300 hover:text-white hover:bg-purple-950/20 border border-purple-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-7 bg-white/5 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs text-zinc-300 hover:text-white group"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 text-[#fea082] flex items-center justify-center font-bold text-[10px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-light tracking-wider text-white">
                    {user.name}
                  </div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-light tracking-[0.14em] uppercase text-zinc-400 hover:text-white transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs glow-btn"
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
