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

    const stats = [
        { icon: '/mountains.png', label: 'Trips Completed', value: 12 },
        { icon: null,             label: 'Routes Driven',   value: 5,  svgIcon: true },
        { icon: null,             label: 'Favorites',       value: 8,  starIcon: true },
    ];

    return (
        <div className="min-h-screen bg-[#0d1117] text-white font-sans overflow-hidden">

            {/* ── Background: scenic road blur ──────────────────────── */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(1) saturate(1 .2) blur(8px)',
                }}
            />
            <div className="fixed inset-0 z-0 bg-gradient-to-br from-black/60 via-[#0d1117]/80 to-black/40" />

            {/* ── Page Layout ───────────────────────────────────────── */}
            <div className="relative z-10 flex min-h-screen">

                {/* ── Sidebar ───────────────────────────────────────── */}
                <aside className="w-64 flex-shrink-0 flex flex-col justify-between py-10 px-6 border-r border-white/5 bg-black/20 backdrop-blur-2xl">

                    {/* Brand */}
                    <div className="space-y-10">
                        <Link href="/" className="flex flex-col leading-[0.75]">
                            <span className="text-xl font-black uppercase tracking-tighter italic text-white">Scenic</span>
                            <span className="text-base font-light uppercase tracking-[0.2em] text-white/50">Routes</span>
                        </Link>

                        {/* User Card */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                                {avatarPreview ? (
                                    <img src={avatarPreview} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-lg uppercase border-2 border-emerald-500/40">
                                        {user?.email?.[0]}
                                    </div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0d1117]" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-white truncate">{fullName || 'Traveller'}</p>
                                <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
                                <p className="text-[10px] text-emerald-500/70 mt-0.5">Scenic Route Explorer</p>
                            </div>
                        </div>

                        {/* Nav Items */}
                        <nav className="space-y-1">
                            {navItems.map(({ id, label, icon: Icon }) => {
                                const isActive = activeSection === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            if (id === 'mytrips') { router.push('/my-trips'); return; }
                                            setActiveSection(id);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300
                                            ${isActive
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                                        {label}
                                        {isActive && <ChevronRight size={12} className="ml-auto opacity-50" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 border border-transparent hover:border-red-500/10"
                    >
                        <LogOut size={16} strokeWidth={1.5} />
                        Logout
                    </button>
                </aside>

                {/* ── Main Content ──────────────────────────────────── */}
                <main className="flex-1 flex items-center justify-center p-8 lg:p-16">
                    <div className="w-full max-w-md">

                        {/* Glass Card */}
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl bg-white/5">

                            {/* Edit Icon top-right */}
                            <div className="absolute top-5 right-5 z-10">
                                <label className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 hover:border-emerald-500/30">
                                    <Pencil size={14} className="text-white/60" />
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                            </div>

                            {/* Profile Header */}
                            <div className="px-8 pt-8 pb-6 border-b border-white/5">
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/30" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold text-2xl uppercase border-2 border-emerald-500/30">
                                                {user?.email?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{fullName || user?.email?.split('@')[0]}</h2>
                                        <p className="text-xs text-white/40 mt-0.5">{user?.email}</p>
                                        <p className="text-xs text-emerald-500/70 mt-1">Scenic Route Explorer</p>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="px-8 py-6 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-5">
                                    Profile Settings
                                </h3>

                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all duration-300"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all duration-300"
                                    />
                                </div>

                                {/* New Password */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Leave blank to keep current"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all duration-300"
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/40 focus:bg-white/8 transition-all duration-300"
                                    />
                                </div>

                                {error   && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                                {success && <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>}

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl text-xs uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(16,185,129,0.3)] mt-2"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Stats Bar */}
                            <div className="px-8 py-5 border-t border-white/5 grid grid-cols-3 divide-x divide-white/5">
                                {/* Trips */}
                                <div className="flex flex-col items-center gap-1.5 px-4">
                                    <div className="flex items-center gap-1.5">
                                        <img src="/mountains.png" alt="" className="w-5 h-5 object-contain invert opacity-60" />
                                        <span className="text-xl font-black text-white">12</span>
                                    </div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest text-center">Trips Completed</p>
                                </div>

                                {/* Routes */}
                                <div className="flex flex-col items-center gap-1.5 px-4">
                                    <div className="flex items-center gap-1.5">
                                        <Navigation size={16} className="text-white/50" strokeWidth={1.5} />
                                        <span className="text-xl font-black text-white">5</span>
                                    </div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest text-center">Routes Driven</p>
                                </div>

                                {/* Favorites */}
                                <div className="flex flex-col items-center gap-1.5 px-4">
                                    <div className="flex items-center gap-1.5">
                                        <Star size={16} className="text-yellow-500/70" strokeWidth={1.5} />
                                        <span className="text-xl font-black text-white">8</span>
                                    </div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-widest text-center">Favorites</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}