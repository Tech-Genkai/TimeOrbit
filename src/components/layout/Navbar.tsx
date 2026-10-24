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
    { name: '3D Globe', href: '/', icon: Globe2 },
    { name: 'Compare Studio', href: '/compare', icon: Clock },
    { name: 'API Docs', href: '/docs', icon: BookOpen },
    { name: 'Dashboard', href: '/dashboard', icon: Key },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Globe2 className="w-5 h-5 text-white animate-spin-slow" />
            <div className="absolute -inset-0.5 rounded-xl bg-cyan-400 opacity-30 blur-sm group-hover:opacity-60 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
              TimeOrbit
            </span>
            <span className="text-[10px] text-cyan-400/80 -mt-1 tracking-wider uppercase font-semibold">
              Global Time API
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                {link.name}
              </Link>
            );
          })}

          {/* Admin Panel Link (Only visible if user.role === 'admin') */}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                pathname === '/admin'
                  ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50 shadow-sm shadow-purple-500/20'
                  : 'text-purple-300 hover:text-white hover:bg-purple-900/30 border border-purple-500/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Admin Panel</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-purple-500/30 text-purple-300 border border-purple-400/30 font-bold">
                Admin
              </span>
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-8 bg-white/5 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm group"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-gray-200 group-hover:text-cyan-300 transition-colors">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {user.role === 'admin' ? '🛡️ Super Admin' : 'Developer'}
                  </div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold glow-btn"
              >
                <span>Get API Key</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#060814]/95 backdrop-blur-xl px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                  pathname === link.href ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-purple-300 bg-purple-900/30 border border-purple-500/30"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Panel</span>
            </Link>
          )}

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {user ? (
              <>
                <div className="px-3 py-2 text-xs text-gray-400">
                  Signed in as <span className="text-white font-medium">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-rose-300 bg-rose-500/10 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm text-gray-200 bg-white/5 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold glow-btn rounded-lg"
                >
                  Get API Key
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
