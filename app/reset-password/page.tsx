"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleReset() {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => router.push('/'), 2000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100">
        <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
      </nav>

      {/* CONTENT */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-black mb-2">Reset Password</h1>
          <p className="text-gray-400 mb-8">Enter your new password below.</p>

          <div className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-emerald-500 text-sm">{success}</p>}

            <button
              onClick={handleReset}
              disabled={loading}
              className="bg-[#003e4d] hover:bg-[#004e61] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60 mt-2"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <Link href="/" className="text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}