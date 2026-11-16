'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe2, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, Calendar } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 18 years cutoff date string
  const maxDobDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!dateOfBirth) {
      setErrorMsg('Date of birth is required for age verification (18+)');
      setLoading(false);
      return;
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      setErrorMsg('You must be at least 18 years old to create an account.');
      setLoading(false);
      return;
    }

    if (!confirmedAge) {
      setErrorMsg('Please confirm that you are 18 years of age or older.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, dateOfBirth }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to register account');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-16">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/20 mb-2">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-light tracking-[0.25em] uppercase text-white">Create Account</h1>
          <p className="text-xs text-zinc-400 font-light tracking-wider uppercase">
            TimeOrbit Developer Access
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-light tracking-wider uppercase text-zinc-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-light tracking-wider uppercase text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-light tracking-wider uppercase text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none"
                />
              </div>
            </div>

            {/* Age Verification (18+) */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-light tracking-wider uppercase text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#fea082]" />
                    Date of Birth
                  </label>
                  <span className="text-[10px] font-mono text-[#fea082] uppercase tracking-wider">
                    Must be 18+
                  </span>
                </div>
                <input
                  type="date"
                  required
                  max={maxDobDate}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-black/80 text-white text-xs font-light focus:border-[#fea082] outline-none cursor-pointer"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={confirmedAge}
                  onChange={(e) => setConfirmedAge(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-black/60 text-[#fea082] focus:ring-[#fea082] cursor-pointer"
                />
                <span className="text-[11px] text-zinc-400 font-light leading-snug">
                  I certify and verify that I am at least 18 years old and agree to the platform developer terms.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-medium glow-btn flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Request Key</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center text-xs text-zinc-400 font-light">
            Already have an account?{' '}
            <Link href="/login" className="text-[#fea082] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
