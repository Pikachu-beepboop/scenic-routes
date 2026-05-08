"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  async function handleReset() {
    if (!password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!checks.length || !checks.upper || !checks.number || !checks.special) {
      setError('Password does not meet requirements.'); return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); }
    else { setSuccess('Password updated! Redirecting...'); setTimeout(() => router.push('/'), 2000); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen relative flex flex-col">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src="/reset-password.png" alt="Road" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* NAV */}
<nav className="relative z-10 flex justify-between items-center px-12 py-5 border-b border-white/10">
  <Link href="/">
    <div className="text-2xl font-black leading-[0.8] tracking-tighter text-white">
      Scenic <br /> <span className="ml-4">Routes</span>
    </div>
  </Link>
  <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-white/60">
    <Link href="/explore" className="hover:text-white transition">Explore Routes</Link>
    <a href="#" className="hover:text-white transition">About us</a>
  </div>
  <Link href="/" className="px-6 py-2 border border-white/30 hover:bg-white hover:text-black text-white rounded-[24px] font-bold uppercase text-sm tracking-tighter transition-all active:scale-95 duration-300">
    Home
  </Link>
</nav>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 flex items-center px-12 py-10">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-16">

          {/* LEFT */}
          <div className="flex-1">
            <h1 className="text-[72px] md:text-[88px] font-black uppercase italic leading-[0.9] text-white drop-shadow-2xl mb-6">
              RESET<br/>PASSWORD
            </h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] w-16 bg-white/40"></div>
              <img src="/mountains.png" alt="mountains" className="w-10 h-10 object-contain invert opacity-70" />
              <div className="h-[1px] w-16 bg-white/40"></div>
            </div>
            <p className="text-white/80 text-lg font-light leading-relaxed max-w-sm">
              No worries! Enter your new password<br/>and get back to exploring.
            </p>

            <div className="flex items-center gap-3 mt-12">
              <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <p className="text-white/50 text-sm">Your security is our priority.<br/>Choose a strong password.</p>
            </div>
          </div>

          {/* RIGHT — FORM */}
          <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-white text-xl font-semibold mb-1">Create a new password</h2>
            <p className="text-white/50 text-sm mb-6">Enter your new password below.</p>

            {/* Password input */}
            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-white/40 transition pr-12"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-white/40 hover:text-white/70 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {showPassword
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>

            {/* Confirm input */}
            <div className="relative mb-5">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-white/40 transition pr-12"
              />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3 text-white/40 hover:text-white/70 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {showConfirm
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>

            {/* Password requirements */}
            <div className="mb-5 space-y-1.5">
              <p className="text-white/40 text-xs mb-2">Your password must include:</p>
              {[
                { key: 'length', label: 'At least 8 characters' },
                { key: 'upper', label: 'One uppercase letter' },
                { key: 'number', label: 'One number' },
                { key: 'special', label: 'One special character' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <svg className={`w-3.5 h-3.5 transition-colors ${checks[key as keyof typeof checks] ? 'text-emerald-400' : 'text-white/25'}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className={`text-xs transition-colors ${checks[key as keyof typeof checks] ? 'text-white/70' : 'text-white/30'}`}>{label}</span>
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            {success && <p className="text-emerald-400 text-xs mb-3">{success}</p>}

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-[#003e4d] hover:bg-[#004e61] text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-60 mb-4"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <Link href="/" className="block text-center text-white/40 hover:text-white/70 text-sm transition">
              Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="relative z-10 border-t border-white/10 px-12 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
          {[
            { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Secure & Private', desc: 'Your data is always protected.' },
            { icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', title: 'Explore More', desc: 'Discover breathtaking routes.' },
            { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Join the Community', desc: 'Share and connect with others.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{title}</p>
                <p className="text-white/40 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}