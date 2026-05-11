"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import {
    User, MapPin, Heart, Settings, LogOut,
    Navigation, Star, Pencil, ChevronRight
} from 'lucide-react';

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
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [activeSection, setActiveSection] = useState<'profile' | 'mytrips' | 'favorites' | 'settings'>('profile');
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

        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('Avatars').upload(fileName, avatarFile, { upsert: true });
            if (uploadError) { setError('Error uploading avatar: ' + uploadError.message); setSaving(false); return; }
            const { data: urlData } = supabase.storage.from('Avatars').getPublicUrl(fileName);
            uploadedAvatarUrl = urlData.publicUrl;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ full_name: fullName, avatar_url: uploadedAvatarUrl, updated_at: new Date().toISOString() })
            .eq('id', user.id);
        if (profileError) { setError(profileError.message); setSaving(false); return; }

        if (email !== user.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email });
            if (emailError) { setError(emailError.message); setSaving(false); return; }
        }

        if (newPassword) {
            if (newPassword !== confirmPassword) { setError('Passwords do not match.'); setSaving(false); return; }
            if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); setSaving(false); return; }
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
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
            <div className="w-10 h-10 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    );

    const navItems = [
        { id: 'profile',    label: 'Profile',    icon: User },
        { id: 'mytrips',   label: 'My Trips',   icon: Navigation },
        { id: 'favorites', label: 'Favorites',  icon: Heart },
        { id: 'settings',  label: 'Settings',   icon: Settings },
    ] as const;

    return (
        <div className="min-h-screen bg-[#0d1117] text-white font-sans overflow-hidden">

            {/* ── Background: scenic mountain road ──────────────────── */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.85) saturate(1.1) blur(6px)',
                }}
            />
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-black/50 via-[#0d1117]/70 to-black/30" />

            {/* ── Page Layout ───────────────────────────────────────── */}
            <div className="relative z-10 flex min-h-screen">

                {/* ── Sidebar ───────────────────────────────────────── */}
                <aside className="w-56 flex-shrink-0 flex flex-col justify-between py-8 px-5 border-r border-white/5 bg-black/30 backdrop-blur-2xl">

                    {/* Brand */}
                    <div className="space-y-8">
                        <Link href="/" className="flex flex-col leading-none">
                            <span className="text-lg font-black uppercase tracking-tight italic text-white">Scenic</span>
                            <span className="text-xs font-light uppercase tracking-[0.25em] text-white/40 mt-0.5">Routes</span>
                        </Link>

                        {/* Nav Items */}
                        <nav className="space-y-0.5">
                            {navItems.map(({ id, label, icon: Icon }) => {
                                const isActive = activeSection === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            if (id === 'mytrips') { router.push('/my-trips'); return; }
                                            setActiveSection(id);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                            ${isActive
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                                : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                                        {label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/25 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 border border-transparent"
                    >
                        <LogOut size={15} strokeWidth={1.5} />
                        Logout
                    </button>
                </aside>

                {/* ── Main Content ──────────────────────────────────── */}
                <main className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-sm">

                        {/* Glass Card */}
                        <div
                            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                            style={{
                                background: 'rgba(13, 17, 23, 0.55)',
                                backdropFilter: 'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                            }}
                        >
                            {/* Edit / Upload Avatar Icon top-right */}
                            <div className="absolute top-4 right-4 z-10">
                                <label className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-200">
                                    <Pencil size={13} className="text-white/50" />
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                            </div>

                            {/* Profile Header */}
                            <div className="px-6 pt-6 pb-5 border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-shrink-0">
                                        {avatarPreview ? (
                                            <img
                                                src={avatarPreview}
                                                className="w-14 h-14 rounded-xl object-cover border border-emerald-500/25"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-900 flex items-center justify-center text-white font-bold text-xl uppercase border border-emerald-500/25">
                                                {(fullName || user?.email || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-white leading-tight">
                                            {fullName || user?.email?.split('@')[0]}
                                        </h2>
                                        <p className="text-[11px] text-white/35 mt-0.5">{user?.email}</p>
                                        <p className="text-[11px] text-emerald-500/60 mt-0.5">Scenic Route Explorer</p>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="px-6 py-5 space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                                    Profile Settings
                                </h3>

                                {/* Full Name */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-emerald-500/30 focus:bg-white/8 transition-all duration-200"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-emerald-500/30 focus:bg-white/8 transition-all duration-200"
                                    />
                                </div>

                                {/* New Password */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Leave blank to keep current"
                                        className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-emerald-500/30 focus:bg-white/8 transition-all duration-200"
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-emerald-500/30 focus:bg-white/8 transition-all duration-200"
                                    />
                                </div>

                                {error   && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                                {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-black font-bold py-3 rounded-lg text-[10px] uppercase tracking-[0.25em] transition-all duration-200 active:scale-[0.99] shadow-[0_4px_20px_rgba(16,185,129,0.25)] mt-1"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Stats Bar */}
                            <div className="px-6 py-4 border-t border-white/5 grid grid-cols-3 divide-x divide-white/5">
                                {/* Trips */}
                                <div className="flex flex-col items-center gap-1 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <img src="/mountains.png" alt="" className="w-4 h-4 object-contain invert opacity-50" />
                                        <span className="text-lg font-black text-white">12</span>
                                    </div>
                                    <p className="text-[8px] text-white/25 uppercase tracking-widest text-center leading-tight">Trips Completed</p>
                                </div>

                                {/* Routes */}
                                <div className="flex flex-col items-center gap-1 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <Navigation size={14} className="text-white/40" strokeWidth={1.5} />
                                        <span className="text-lg font-black text-white">5</span>
                                    </div>
                                    <p className="text-[8px] text-white/25 uppercase tracking-widest text-center leading-tight">Routes Driven</p>
                                </div>

                                {/* Favorites */}
                                <div className="flex flex-col items-center gap-1 px-2">
                                    <div className="flex items-center gap-1.5">
                                        <Star size={14} className="text-yellow-500/60" strokeWidth={1.5} />
                                        <span className="text-lg font-black text-white">8</span>
                                    </div>
                                    <p className="text-[8px] text-white/25 uppercase tracking-widest text-center leading-tight">Favorites</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}