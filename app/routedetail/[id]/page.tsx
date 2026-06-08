"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Clock, MapPin, Navigation, Star, ChevronDown,
    Heart, ArrowLeft, User, ArrowRight, Send
} from 'lucide-react';
import Link from 'next/link';
import AuthModal from "@/app/AuthModal";

interface Route {
    id: string;
    title: string;
    description: string;
    image_url: string;
    duration: string;
    distance_km: number;
    country: string;
    'start_point'?: string;
    'end_point'?: string;
    'route_highlights'?: string;
    'maps_URL'?: string;
    'google_maps'?: string;
    [key: string]: unknown;
}

function HighlightedTitle({ title }: { title: string }) {
    if (!title) return null;

    if (title.includes('(')) {
        const [main, rest] = title.split('(');
        return (
            <>
                {main}
                <span className="text-emerald-500 whitespace-nowrap ml-4">({rest}</span>
            </>
        );
    }

    const words = title.split(' ');
    const isLastWordNumber = !isNaN(Number(words[words.length - 1]));

    if (isLastWordNumber && words.length > 1) {
        const main = words.slice(0, -2).join(' ');
        const highlight = words.slice(-2).join(' ');
        return (
            <>
                {main} <span className="text-emerald-500 whitespace-nowrap">{highlight}</span>
            </>
        );
    }

    return (
        <>
            {words.slice(0, -1).join(' ')}{' '}
            <span className="text-emerald-500">{words[words.length - 1]}</span>
        </>
    );
}

export default function RouteDetailPage() {
    const params = useParams();
    const router = useRouter();

    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');

    const { scrollY } = useScroll();

    const navOpacity = useTransform(scrollY, [250, 450], [0, 1]);
    const navY = useTransform(scrollY, [250, 450], [-20, 0]);
    const navBg = useTransform(scrollY, [250, 450], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']);
    const navBlur = useTransform(scrollY, [250, 450], ['blur(0px)', 'blur(20px)']);
    const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
    const heroOpacity = useTransform(scrollY, [0, 800], [1, 0.2]);

    useEffect(() => {
        const init = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
            if (currentUser) {
                checkIfSaved(currentUser.id);
                fetchProfile(currentUser.id);
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                setIsAuthModalOpen(false);
                checkIfSaved(currentUser.id);
                fetchProfile(currentUser.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [params.id]);

    async function fetchProfile(userId: string) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
        if (data) setAvatarUrl(data.avatar_url || '');
    }

    useEffect(() => {
        async function loadRoute() {
            setLoading(true);
            const { data } = await supabase
                .from('routes')
                .select('*')
                .eq('id', params.id)
                .single();
            if (data) setRoute(data as Route);
            setLoading(false);
        }
        loadRoute();
    }, [params.id]);

    const checkIfSaved = async (userId: string) => {
        const { data } = await supabase
            .from('saved_routes')
            .select('id')
            .eq('user_id', userId)
            .eq('route_id', params.id)
            .single();
        setIsSaved(!!data);
    };

    const handleSaveToggle = async () => {
        if (!user) {
            setIsAuthModalOpen(true);
            return;
        }

        if (isSaved) {
            await supabase
                .from('saved_routes')
                .delete()
                .eq('user_id', user.id)
                .eq('route_id', params.id);
            setIsSaved(false);
        } else {
            await supabase
                .from('saved_routes')
                .insert([{ user_id: user.id, route_id: params.id }]);
            setIsSaved(true);
        }
    };

    const chapters = Object.entries(route ?? {})
        .filter(([key, value]) => key.startsWith('chapter') && typeof value === 'string' && (value as string).trim() !== '')
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([key, value]) => {
            const lines = (value as string).split('\n');
            return { key, title: lines[0], body: lines.slice(1).join('\n') };
        });

    const highlights: string[] = (route?.['route_highlights'] ?? '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);

    if (loading) {
        return (
            <div className="h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-black text-white text-[#0a0a0a] font-sans selection:bg-emerald-500/30 overflow-x-hidden">

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* ── Back Button ── */}
            <div className="fixed top-10 left-10 z-[60]">
                <button
                    onClick={() => router.back()}
                    className="group relative flex items-center justify-center w-16 h-16 transition-all duration-500"
                    aria-label="Zurück"
                >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-700 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-emerald-500/40" />
                    <ArrowLeft
                        size={24}
                        className="relative text-white group-hover:text-emerald-400 group-hover:-translate-x-1.5 transition-all duration-500 ease-out"
                    />
                    <span className="absolute left-20 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none whitespace-nowrap bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        Go Back
                    </span>
                </button>
            </div>

            {/* ── Scroll-triggered Navbar ── */}
            <motion.nav
                style={{
                    opacity: navOpacity,
                    y: navY,
                    backgroundColor: navBg,
                    backdropFilter: navBlur,
                }}
                className="fixed top-0 left-0 w-full z-50 border-b border-white/5 pointer-events-auto"
            >
                <div className="max-w-screen-2xl mx-auto px-12 h-28 flex items-center justify-between">
                    <Link href="/" className="flex flex-col leading-[0.75] pl-24">
                        <span className="text-2xl font-black uppercase tracking-tighter italic">Scenic</span>
                        <span className="text-xl font-light uppercase tracking-[0.25em] opacity-60">Routes</span>
                    </Link>

                    <div className="hidden lg:flex items-center gap-14 text-[10px] font-bold uppercase tracking-[0.5em]">
                        <Link href="/explore" className="hover:text-emerald-400 transition-colors duration-500">Explore Routes</Link>
                        <Link href="/about" className="opacity-40 hover:opacity-100 transition-all duration-700">About Us</Link>
                        {user && (
                            <Link href="/my-trips" className="text-emerald-400 hover:text-emerald-200 transition-colors duration-500">
                                My Trips
                            </Link>
                        )}
                    </div>

                    {/* ── User Menu ── */}
                    <div className="relative">
                        <button
                            onClick={() => user ? setShowUserMenu(!showUserMenu) : setIsAuthModalOpen(true)}
                            aria-label="Account"
                            className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:scale-110 transition-all duration-700 shadow-2xl overflow-hidden"
                        >
                            {user ? (
                                avatarUrl
                                    ? <img src={avatarUrl} className="w-full h-full object-cover" />
                                    : <span className="text-sm font-bold uppercase italic">{user.email?.charAt(0)}</span>
                            ) : (
                                <User size={18} />
                            )}
                        </button>

                        {showUserMenu && user && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                                <div className="absolute right-0 top-14 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-20">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    <Link
                                        href="/profile"
                                        onClick={() => setShowUserMenu(false)}
                                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            await supabase.auth.signOut();
                                            setShowUserMenu(false);
                                            router.push('/');
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.nav>

            {/* ── 1. Hero ── */}
            <section className="relative h-screen w-full overflow-hidden flex items-end justify-start px-12 pb-24 md:px-20 md:pb-32">
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">
                    <img
                        src={route?.image_url}
                        alt={route?.title ?? 'Route'}
                        className="w-full h-full object-cover scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/20 to-transparent" />
                </motion.div>

                <div className="relative z-10 w-full max-w-7xl">
                    <motion.h1
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="text-5xl md:text-7xl lg:text-[6rem] font-black italic uppercase leading-[0.9] tracking-tighter drop-shadow-2xl"
                    >
                        <HighlightedTitle title={route?.title ?? ''} />
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="absolute -bottom-16 left-0 flex flex-row items-center gap-3"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Scroll</span>
                        <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                            <ChevronDown size={16} />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ── 2. Quick Stats Bar ── */}
            <div className="sticky top-0 z-40 w-full backdrop-blur-3xl bg-black/70 border-y border-white/5 shadow-2xl">
                <div className="max-w-7xl mx-auto px-12 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-[10px] font-bold uppercase tracking-[0.6em] opacity-90">
                    {[
                        { icon: <Clock size={18} strokeWidth={1} />, label: route?.duration },
                        { icon: <Navigation size={18} strokeWidth={1} />, label: `${route?.distance_km} km` },
                        { icon: <MapPin size={18} strokeWidth={1} />, label: route?.country, truncate: true },
                        { icon: <Star size={18} className="fill-emerald-500 text-emerald-500" />, label: '4.9 Rating' },
                    ].map(({ icon, label, truncate }, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-4 justify-center md:justify-start hover:text-emerald-400 transition-all${truncate ? ' truncate' : ''}`}
                        >
                            {icon} {label}
                        </div>
                    ))}

                    <a
                        href="#route-map"
                        className="flex items-center gap-3 justify-center md:justify-center text-emerald-400 border border-emerald-500/60 rounded-full px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                    >
                        <MapPin size={18} strokeWidth={1.6} />
                        <span>Map</span>
                    </a>
                </div>
            </div>

            {/* ── 3. Story Section ── */}
            <section className="max-w-7xl mx-auto px-12 pt-12 pb-24 md:pt-16 md:pb-32 space-y-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-48 items-center mb-32">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2 }}
                        viewport={{ once: true }}
                        className="space-y-12"
                    >
                        <div className="space-y-6">
                            <h2 className="text-6xl md:text-7xl font-serif italic text-emerald-50 leading-tight">
                                The <br /> Untold Story.
                            </h2>
                            <div className="h-px w-32 bg-emerald-500/30" />
                        </div>
                        <p className="text-2xl leading-relaxed text-emerald-50/60 font-light italic border-l-2 border-emerald-500/40 pl-8">
                            {route?.description}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.5 }}
                        viewport={{ once: true }}
                        className="relative aspect-[4/5] rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl group"
                    >
                        <img
                            src={route?.image_url}
                            className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                            alt="Story visual"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </motion.div>
                </div>

                {chapters.length > 0 && (
                    <div className="space-y-16">
                        <div
                            id="story-slider"
                            className="flex gap-8 overflow-x-auto snap-x snap-mandatory pb-12 pt-4 scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {chapters.map(({ key, title, body }, index) => (
                                <motion.div
                                    key={key}
                                    className="min-w-[85vw] md:min-w-[480px] snap-start group"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="relative h-[400px] md:h-[450px] w-full overflow-hidden rounded-[2.5rem] border border-white/10 mb-10 shadow-2xl group-hover:border-emerald-500/20 transition-all duration-500">
                                        <img
                                            src={route?.image_url}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                            alt={title}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                    </div>
                                    <div className="space-y-4 px-2">
                                        <h3 className="text-3xl md:text-4xl font-serif italic text-white group-hover:text-emerald-400 transition-colors duration-300">
                                            {title}
                                        </h3>
                                        <p className="text-zinc-400 text-lg leading-relaxed line-clamp-3 font-light max-w-md">
                                            {body}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex items-center gap-10 px-2">
                            <button
                                type="button"
                                onClick={() => document.getElementById('story-slider')?.scrollBy({ left: -500, behavior: 'smooth' })}
                                className="text-zinc-600 hover:text-white transition-all hover:scale-110"
                                aria-label="Zurückblättern"
                            >
                                <ArrowLeft size={28} />
                            </button>
                            <div className="flex-1 h-[1px] bg-zinc-800 relative rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 origin-left"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => document.getElementById('story-slider')?.scrollBy({ left: 500, behavior: 'smooth' })}
                                className="text-zinc-600 hover:text-white transition-all hover:scale-110"
                                aria-label="Weiterblättern"
                            >
                                <ArrowRight size={28} />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ── 4. Map Section ── */}
            <section id="route-map" className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-10">
                <div className="bg-zinc-900/80 rounded-[3rem] border border-white/20 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-md">
                    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">
                        <div className="lg:col-span-4 p-10 md:p-14 flex flex-col justify-between border-r border-white/10 bg-black/40">
                            <div className="space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-4xl md:text-5xl font-serif italic text-white leading-tight">
                                        The Route<span className="text-emerald-500">.</span>
                                    </h2>
                                    <p className="text-zinc-500 text-xs leading-relaxed uppercase tracking-[0.2em] font-medium italic">
                                        {route?.['start_point']}
                                        <span className="text-emerald-500/50 mx-2">—</span>
                                        {route?.['end_point']}
                                    </p>
                                </div>

                                <div className="space-y-10 relative">
                                    <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-emerald-500/20" />
                                    {route?.['start_point'] && (
                                        <TimelineStop label={route['start_point']} sublabel="Departure Point" active />
                                    )}
                                    {highlights.map((stop, i) => (
                                        <TimelineStop key={i} label={stop} />
                                    ))}
                                    {route?.['end_point'] && (
                                        <TimelineStop label={route['end_point']} sublabel="Final Destination" active pulse />
                                    )}
                                </div>
                            </div>

                            <div className="pt-12">
                                <a
                                    href={route?.['maps_URL']}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-5 rounded-2xl transition-all duration-500 uppercase tracking-widest text-[11px] w-full shadow-2xl active:scale-95"
                                >
                                    <Navigation size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                                    Begin Navigation
                                </a>
                            </div>
                        </div>

                        <div className="lg:col-span-8 relative h-[500px] lg:h-auto overflow-hidden">
                            {route?.['google_maps'] && (
                                <iframe
                                    src={route['google_maps']}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    title="Route Map"
                                    className="w-full h-full outline-none border-none"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative bg-gradient-to-b from-black via-zinc-950 to-black border-t border-white/5 overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(16,185,129,0.15) 1px, transparent 0)',
                    backgroundSize: '40px 40px',
                }} />

                <div className="relative max-w-7xl mx-auto px-12 pt-32 pb-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 pb-20 border-b border-white/5">
                        <div className="lg:col-span-4 space-y-8">
                            <Link href="/" className="flex items-center gap-4 group w-fit">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <img src="/mountains.png" alt="Logo" className="w-8 h-8 object-contain invert brightness-0 invert" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="text-2xl font-black italic tracking-tight">Scenic Routes</span>
                                    <span className="text-xs uppercase tracking-[0.3em] text-zinc-600">Since 2026</span>
                                </div>
                            </Link>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs font-light">
                                Curating the world's most breathtaking driving routes for those who seek the road less travelled.
                            </p>
                            <div className="flex gap-4">
                                {['IG'].map(social => (
                                    <a key={social} href="#" aria-label={social}
                                        className="w-11 h-11 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-600 hover:text-white hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 hover:scale-110">
                                        {social}
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5 grid grid-cols-2 gap-12">
                            {[
                                { heading: 'Discover', links: ['Explore Routes', 'Mountains', 'Coastal Roads', 'Forest Paths', 'Desert Drives'] },
                                { heading: 'Company', links: ['About Us', 'Blog', 'Careers', 'Press Kit', 'Contact'] },
                            ].map(({ heading, links }) => (
                                <div key={heading} className="space-y-6">
                                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">{heading}</h4>
                                    <ul className="space-y-4">
                                        {links.map(link => (
                                            <li key={link}>
                                                <a href="#" className="text-sm text-zinc-500 hover:text-white hover:translate-x-1 inline-block transition-all duration-300">{link}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="lg:col-span-3 space-y-6">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">Stay Inspired</h4>
                                <p className="text-xs text-zinc-600 leading-relaxed">Get the best routes delivered to your inbox every week.</p>
                            </div>
                            <div className="relative">
                                <input type="email" placeholder="your@email.com"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-700 outline-none focus:border-emerald-500/50 transition-all duration-500" />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-500 hover:bg-emerald-400 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95" aria-label="Newsletter abonnieren">
                                    <Send size={16} className="text-black" />
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-700 leading-relaxed">
                                By subscribing, you agree to our Privacy Policy and consent to receive updates.
                            </p>
                        </div>
                    </div>

                    <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-zinc-600">
                        <p>© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>
                        <div className="flex gap-8">
                            {['Privacy Policy', 'Terms of Use', 'Cookie Settings', 'Impressum'].map(link => (
                                <a key={link} href="#" className="hover:text-white transition-colors duration-300">{link}</a>
                            ))}
                        </div>
                    </div>
                    <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                </div>
            </footer>

            {/* ── Floating Heart ── */}
            <div className="fixed bottom-16 right-16 z-50">
                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={handleSaveToggle}
                    aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                    className="p-5 bg-zinc-900 border border-white/10 rounded-full shadow-2xl"
                >
                    <Heart className={`w-8 h-8 transition-all duration-700 ease-out ${isSaved ? 'text-red-500 fill-red-500 scale-125' : 'text-white'}`} />
                </motion.button>
            </div>
        </div>
    );
}

interface TimelineStopProps {
    label: string;
    sublabel?: string;
    active?: boolean;
    pulse?: boolean;
}

function TimelineStop({ label, sublabel, active = false, pulse = false }: TimelineStopProps) {
    return (
        <div className="relative pl-10 group cursor-default">
            <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 bg-black z-10 flex items-center justify-center transition-all duration-300
                ${active ? 'border-emerald-500' : 'border-emerald-500/40 group-hover:border-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}>
                <div className={`rounded-full bg-emerald-500 transition-all duration-300
                    ${active ? 'w-2 h-2' : 'w-1.5 h-1.5 opacity-60 group-hover:opacity-100'}
                    ${pulse ? 'animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''}`} />
            </div>
            <div className="space-y-1">
                <h4 className={`font-medium transition-colors duration-300 ${active ? 'text-white italic' : 'text-white/80 group-hover:text-emerald-400'}`}>
                    {label}
                </h4>
                {sublabel && <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{sublabel}</p>}
            </div>
        </div>
    );
}