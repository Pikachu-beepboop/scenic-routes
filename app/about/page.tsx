"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AuthModal from '../AuthModal';
import { Navigation, MapPin, Mountain, Globe, Users, ArrowRight, Mail } from 'lucide-react';

const team = [
    {
        initials: 'LV',
        name: 'Lavr V.',
        role: 'Co-Founder & Product',
        bio: "Road tripper at heart. Built Scenic Routes because every great drive deserves to be discovered.",
        color: 'from-emerald-700 to-teal-900',
    },
    {
        initials: 'US',
        name: 'Usman',
        role: 'Co-Founder & Engineering',
        bio: "The brain behind the tech. Builds every feature from the ground up and keeps everything running smoothly.",
        color: 'from-indigo-700 to-violet-900',
    },
    {
        initials: 'MD',
        name: 'Madalina',
        role: 'Design Manager',
        bio: "Makes sure every pixel is in its right place. Turns complex ideas into clean, beautiful interfaces.",
        color: 'from-amber-600 to-orange-800',
    },
];

const stats = [
    { icon: Mountain, value: '120+', label: 'Curated Routes' },
    { icon: Globe, value: '40', label: 'Countries' },
    { icon: Users, value: '18k', label: 'Travellers' },
    { icon: MapPin, value: '6', label: 'Continents' },
];

const values = [
    {
        title: 'Slow Down',
        text: 'The fastest route is rarely the best one. We celebrate roads that make you pull over, breathe deep, and stay a little longer.',
    },
    {
        title: 'Go Off-Script',
        text: "Every great road trip has an unplanned detour. We build tools that help you discover those moments — not avoid them.",
    },
    {
        title: 'Leave It Better',
        text: "We only feature routes where travellers are welcome and nature is respected. Beautiful roads deserve careful guests.",
    },
];

export default function AboutPage() {
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const u = data.session?.user ?? null;
            setUser(u);
            if (u) fetchProfile(u.id);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (u) fetchProfile(u.id);
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            const target = event.target as Element;
            if (!target.closest('.user-menu-wrapper')) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function fetchProfile(userId: string) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
        if (data) setAvatarUrl(data.avatar_url || '');
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        setUser(null);
        setShowUserMenu(false);
        router.push('/');
    }

    return (
        <div className="min-h-screen bg-[#f5f4f0] text-[#0a0a0a] font-sans">

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

            {/* ── Navbar ── */}
            <nav
                className="flex justify-between items-center px-10 py-4"
                style={{ background: '#ffffff' }}
            >
                {/* Logo */}
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <div className="leading-none">
                        <div className="text-2xl font-black leading-[0.8] tracking-tighter text-black">
                            Scenic <br /> <span className="ml-4">Routes</span>
                        </div>
                    </div>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-10">
                    <Link href="/explore" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        Explore Routes
                    </Link>
                    <Link href="/about" className="text-black/60 hover:text-black transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
                        About Us
                    </Link>
                    {user && (
                        <Link href="/my-trips" className="text-emerald-600 hover:text-emerald-800 transition-colors duration-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
                            My Trips
                        </Link>
                    )}
                </div>

                {/* User / Login */}
                {user ? (
                    <div className="relative user-menu-wrapper">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="w-9 h-9 rounded-full border border-black/20 flex items-center justify-center hover:border-black/50 transition-all duration-200 overflow-hidden"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-black font-bold text-sm uppercase">{user.email?.[0]}</span>
                            )}
                        </button>
                        {showUserMenu && (
                            <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-[10px] text-gray-400 truncate tracking-widest">{user.email}</p>
                                </div>
                                <Link href="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    Profile
                                </Link>
                                <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors">
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAuthOpen(true)}
                        className="text-[11px] uppercase tracking-[0.18em] font-semibold text-black/50 hover:text-black border border-black/20 hover:border-black/50 px-5 py-2 rounded-full transition-all duration-200"
                    >
                        Login
                    </button>
                )}
            </nav>

            {/* ── Hero Section ── */}
            <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 mb-4">About Us</p>
                        <h1 className="text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight text-[#0a0a0a]">
                            Built by<br />
                            road lovers,<br />
                            <span className="italic font-light text-black/30">for road lovers.</span>
                        </h1>
                    </div>
                    <div className="lg:pb-2">
                        <p className="text-base text-black/50 leading-relaxed border-l-2 border-emerald-500 pl-5">
                            We started Scenic Routes because we were tired of GPS apps routing us through motorways.
                            Every trip should feel like an adventure — we map the roads that make you pull over and stare.
                        </p>
                        <div className="mt-8 flex items-center gap-6">
                            <Link
                                href="/explore"
                                className="flex items-center gap-2 bg-black text-white text-xs uppercase tracking-[0.15em] px-5 py-3 rounded-full hover:bg-black/80 transition-all duration-200 group"
                            >
                                Explore Routes
                                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                            </Link>
                            <a
                                href="mailto:hello@scenicroutes.app"
                                className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-black/40 hover:text-black transition-colors duration-200"
                            >
                                <Mail size={13} />
                                Say Hello
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Stats Bar ── */}
            <section className="border-y border-black/5 bg-white">
                <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 divide-x divide-black/5">
                    {stats.map(({ icon: Icon, value, label }) => (
                        <div key={label} className="flex flex-col items-center gap-2 px-6 py-2">
                            <Icon size={18} strokeWidth={1.5} className="text-emerald-600" />
                            <span className="text-3xl font-black tracking-tight">{value}</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-black/30">{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Mission / Values ── */}
            <section className="py-24 px-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
                    {values.map(({ title, text }, i) => (
                        <div
                            key={title}
                            className="bg-white border border-black/5 rounded-2xl p-8 hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                                <span className="text-xs font-black text-emerald-600">0{i + 1}</span>
                            </div>
                            <h3 className="text-lg font-black tracking-tight mb-3">{title}</h3>
                            <p className="text-sm text-black/45 leading-relaxed">{text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Team Section ── */}
            <section className="pb-24 px-6 max-w-6xl mx-auto">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 mb-2">The Team</p>
                        <h2 className="text-4xl font-black tracking-tight leading-none">The people behind<br />the roads.</h2>
                    </div>
                    <p className="hidden lg:block text-sm text-black/35 max-w-xs text-right leading-relaxed">
                        A small crew of passionate drivers, designers and engineers building the tool we always wished existed.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.map(({ initials, name, role, bio, color }) => (
                        <div
                            key={name}
                            className="group bg-white border border-black/5 rounded-2xl p-6 hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-black text-sm mb-5`}>
                                {initials}
                            </div>
                            <p className="font-black text-sm tracking-tight">{name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-600 mt-0.5 mb-3">{role}</p>
                            <p className="text-xs text-black/40 leading-relaxed">{bio}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 bg-white border border-black/5 rounded-2xl px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500'].map((c, i) => (
                                <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white`} />
                            ))}
                        </div>
                        <p className="text-xs text-black/40">A small team, big passion for the road.</p>
                    </div>
                    <a
                        href="mailto:jobs@scenicroutes.app"
                        className="text-xs uppercase tracking-[0.15em] text-black/30 hover:text-black transition-colors duration-200 flex items-center gap-1.5"
                    >
                        Join the team <ArrowRight size={11} />
                    </a>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="px-6 pb-24 max-w-6xl mx-auto">
                <div className="bg-black rounded-3xl px-10 py-14 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400 mb-3">Ready to explore?</p>
                        <h2 className="text-4xl font-black text-white tracking-tight leading-none">
                            Your next great<br />road trip starts here.
                        </h2>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                        <Link
                            href="/explore"
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-[0.15em] px-6 py-3.5 rounded-full transition-all duration-200 group"
                        >
                            Browse Routes
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                        </Link>
                        {!user && (
                            <button
                                onClick={() => setIsAuthOpen(true)}
                                className="flex items-center justify-center gap-2 border border-white/15 text-white text-xs uppercase tracking-[0.15em] px-6 py-3.5 rounded-full hover:bg-white/5 transition-all duration-200"
                            >
                                Create Account
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-black/5 bg-white px-6 py-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-black uppercase tracking-tight italic">Scenic</span>
                        <span className="text-[9px] font-light uppercase tracking-[0.2em] text-black/30 mt-0.5">Routes</span>
                    </div>
                    <p className="text-xs text-black/25">© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/explore" className="text-xs text-black/30 hover:text-black transition-colors duration-200">Explore</Link>
                        <Link href="/about" className="text-xs text-black/30 hover:text-black transition-colors duration-200">About</Link>
                        <a href="mailto:hello@scenicroutes.app" className="text-xs text-black/30 hover:text-black transition-colors duration-200">Contact</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}