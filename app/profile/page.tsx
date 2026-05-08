"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      if (!u) { router.push('/'); return; }
      setUser(u);
      fetchProfile(u.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setAvatarUrl(data.avatar_url || '');
      setAvatarPreview(data.avatar_url || '');
    }
    setLoading(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');

    let uploadedAvatarUrl = avatarUrl;

    // Загрузка аватара
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('Avatars')
        .upload(fileName, avatarFile, { upsert: true });
      if (uploadError) {
        setError('Error uploading avatar: ' + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('Avatars').getPublicUrl(fileName);
      uploadedAvatarUrl = urlData.publicUrl;
    }

    // Обновление профиля
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, avatar_url: uploadedAvatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) { setError(profileError.message); setSaving(false); return; }

    // Обновление email
    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) { setError(emailError.message); setSaving(false); return; }
    }

    // Обновление пароля
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        setSaving(false);
        return;
      }
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        setSaving(false);
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) { setError(passwordError.message); setSaving(false); return; }
    }

    setSuccess('Profile updated successfully!');
    setAvatarUrl(uploadedAvatarUrl);
    setNewPassword('');
    setConfirmPassword('');
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">

      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-12 py-5 border-b border-gray-100 bg-white">
        <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
            Scenic <br /> <span className="ml-4">Routes</span>
          </div>
        </Link>
        <div className="hidden md:flex space-x-8 font-medium text-sm uppercase tracking-widest text-gray-500">
          <Link href="/explore" className="hover:text-black transition">Explore Routes</Link>
          <a href="#" className="hover:text-black transition">About us</a>
          {user && <Link href="/my-trips" className="hover:text-black transition text-emerald-600">My Trips</Link>}
        </div>
        {user ? (
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {avatarPreview ? (
                <img src={avatarPreview} className="w-9 h-9 rounded-full object-cover border-2 border-[#003e4d]" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#003e4d] flex items-center justify-center text-white font-bold text-sm uppercase">
                  {user.email?.[0]}
                </div>
              )}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <Link href="/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Profile</Link>
                <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors">Sign Out</button>
              </div>
            )}
          </div>
        ) : null}
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-black mb-2">Profile</h1>
        <p className="text-gray-400 mb-10">Manage your account settings</p>

        {/* AVATAR */}
        <div className="flex items-center gap-6 mb-10">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#003e4d] flex items-center justify-center text-white font-bold text-3xl uppercase border-4 border-gray-100">
                {user?.email?.[0]}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#003e4d] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#004e61] transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <div>
            <p className="font-bold text-lg">{fullName || user?.email}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* FORM */}
        <div className="flex flex-col gap-5">

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all"
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all mb-3"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-[#003e4d] focus:bg-white transition-all"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-emerald-500 text-sm">{success}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#003e4d] hover:bg-[#004e61] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}