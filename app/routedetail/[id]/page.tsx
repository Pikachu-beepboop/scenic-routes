"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    Clock, MapPin, Navigation, Star, ChevronDown,
    Heart, ExternalLink, ArrowLeft, User, Check, Plus,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

// Import deines AuthModals
import AuthModal from "@/app/AuthModal";

export default function RouteDetailPage() {
    const params = useParams();
    const router = useRouter();

    // --- States ---
    const [route, setRoute] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const { scrollY } = useScroll();

    // --- NAVBAR LOGIK: ERSCHEINT ERST BEIM SCROLLEN ---
    const navOpacity = useTransform(scrollY, [250, 450], [0, 1]);
    const navY = useTransform(scrollY, [250, 450], [-20, 0]);

    const navBg = useTransform(scrollY, [250, 450], ["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]);
    const navBlur = useTransform(scrollY, [250, 450], ["blur(0px)", "blur(20px)"]);

    // Parallax für das Hero-Bild
    const y1 = useTransform(scrollY, [0, 1000], [0, 300]);
    const opacityHero = useTransform(scrollY, [0, 800], [1, 0.2]);

    // --- Auth & Data Fetching ---
    useEffect(() => {
        const initAuth = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
            if (currentUser) checkIfRouteIsSaved(currentUser.id);
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                setIsAuthModalOpen(false);
                checkIfRouteIsSaved(currentUser.id);
            }
        });
        return () => subscription.unsubscribe();
    }, [params.id]);

    useEffect(() => {
        async function loadRouteDetails() {
            setLoading(true);
            const { data } = await supabase.from('routes').select('*').eq('id', params.id).single();
            if (data) setRoute(data);
            setLoading(false);
        }
        loadRouteDetails();
    }, [params.id]);

    const checkIfRouteIsSaved = async (userId: string) => {
        const { data } = await supabase.from('saved_routes').select('*').eq('user_id', userId).eq('route_id', params.id).single();
        setIsSaved(!!data);
    };

    const handleAction = async () => {
        if (!user) { setIsAuthModalOpen(true); return; }
        if (isSaved) {
            await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', params.id);
            setIsSaved(false);
        } else {
            await supabase.from('saved_routes').insert([{ user_id: user.id, route_id: params.id }]);
            setIsSaved(true);
        }
    };

    if (loading) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="bg-black text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* --- SEXY GLASS BACK BUTTON (Immer sichtbar & Ultra-High-End Look) --- */}
            <div className="fixed top-10 left-10 z-[60]">
                <button
                    onClick={() => router.back()}
                    className="group relative flex items-center justify-center w-16 h-16 transition-all duration-500"
                >
                    {/* Crystal Glass Body */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-700 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-emerald-500/40" />

                    {/* Arrow Icon */}
                    <div className="relative flex items-center justify-center">
                        <ArrowLeft size={24} className="text-white group-hover:text-emerald-400 group-hover:-translate-x-1.5 transition-all duration-500 ease-out" />

                        {/* Schwebendes Label beim Hover */}
                        <span className="absolute left-20 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none whitespace-nowrap bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                            Go Back
                        </span>
                    </div>
                </button>
            </div>

            {/* --- SCROLL-TRIGGERED NAVBAR (Erscheint verzögert) --- */}
            <motion.nav
                style={{ opacity: navOpacity, y: navY, backgroundColor: navBg, backdropFilter: navBlur }}
                className="fixed top-0 left-0 w-full z-50 border-b border-white/5 transition-all duration-1000 ease-in-out pointer-events-auto"
            >
                <div className="max-w-screen-2xl mx-auto px-12 h-28 flex items-center justify-between">
                    <Link href="/" className="flex flex-col leading-[0.75] pl-24">
                        <span className="text-2xl font-black uppercase tracking-tighter italic">Scenic</span>
                        <span className="text-xl font-light uppercase tracking-[0.25em] opacity-60">Routes</span>
                    </Link>

                    <div className="hidden lg:flex items-center gap-14 text-[10px] font-bold uppercase tracking-[0.5em]">
                        <Link href="/explore" className="hover:text-emerald-400 transition-colors duration-500">Explore</Link>
                        <Link href="/about" className="opacity-40 hover:opacity-100 transition-all duration-700">About Us</Link>
                        {user && (
                            <Link href="/my-trips" className="text-emerald-400 hover:text-emerald-200 transition-colors duration-500">My Trips</Link>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => !user && setIsAuthModalOpen(true)}
                            className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:scale-110 transition-all duration-700 shadow-2xl"
                        >
                            {user ? (
                                <span className="text-sm font-bold uppercase italic">{user.email?.charAt(0)}</span>
                            ) : (
                                <User size={18} />
                            )}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* 1. HERO SECTION */}
            {/* 1. HERO SECTION */}
            <section className="relative h-screen w-full overflow-hidden flex items-end justify-start px-12 pb-24 md:px-20 md:pb-32">
                <motion.div style={{ y: y1, opacity: opacityHero }} className="absolute inset-0 z-0">
                    <img src={route?.image_url} alt={route?.title} className="w-full h-full object-cover scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/20 to-transparent" />
                </motion.div>

                <div className="relative z-10 w-full max-w-7xl">
                    <motion.h1
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="text-5xl md:text-7xl lg:text-[6rem] font-black italic uppercase leading-[0.9] tracking-tighter text-left drop-shadow-2xl"
                    >
                        {route?.title?.includes('(') ? (
                            <>
                                {route.title.split('(')[0]}
                                <span className="text-emerald-500 whitespace-nowrap ml-4">
                                    ({route.title.split('(')[1]}
                                </span>
                            </>
                        ) : (
                            <>
                                {(() => {
                                    const words = route?.title?.split(' ') || [];
                                    // Checkt, ob das letzte Wort eine Zahl ist (z.B. "1")
                                    const isLastWordNumber = !isNaN(Number(words[words.length - 1]));

                                    if (isLastWordNumber && words.length > 1) {
                                        const main = words.slice(0, -2).join(' ');
                                        const highlight = words.slice(-2).join(' '); // Nimmt "Highway 1" zusammen
                                        return (
                                            <>
                                                {main} <span className="text-emerald-500 whitespace-nowrap">{highlight}</span>
                                            </>
                                        );
                                    }

                                    // Standard-Verhalten für normale Namen
                                    return (
                                        <>
                                            {words.slice(0, -1).join(' ')}{' '}
                                            <span className="text-emerald-500">{words[words.length - 1]}</span>
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </motion.h1>

                    {/* SCROLL INDICATOR - Horizontal angeordnet, aber Pfeil zeigt nach unten */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="absolute -bottom-16 left-0 flex flex-row items-center gap-3"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">
                            Scroll
                        </span>

                        {/* Pfeil zeigt nach unten und hüpft dezent vertikal */}
                        <motion.div
                            animate={{ y: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        >
                            <ChevronDown size={16} />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* 2. QUICK STATS BAR (Sticky) */}
            <div className="sticky top-0 z-40 w-full backdrop-blur-3xl bg-black/70 border-y border-white/5 shadow-2xl">
                <div className="max-w-7xl mx-auto px-12 py-12 grid grid-cols-2 md:grid-cols-4 gap-12 text-[10px] font-bold uppercase tracking-[0.6em] opacity-70">
                    <div className="flex items-center gap-4 justify-center md:justify-start hover:text-emerald-400 transition-all">
                        <Clock size={18} strokeWidth={1} /> {route?.duration}
                    </div>
                    <div className="flex items-center gap-4 justify-center md:justify-start hover:text-emerald-400 transition-all">
                        <Navigation size={18} strokeWidth={1} /> {route?.distance_km} km
                    </div>
                    <div className="flex items-center gap-4 justify-center md:justify-start hover:text-emerald-400 transition-all truncate">
                        <MapPin size={18} strokeWidth={1} /> {route?.country}
                    </div>
                    <div className="flex items-center gap-4 justify-center md:justify-start hover:text-emerald-400 transition-all">
                        <Star size={18} className="fill-emerald-500 text-emerald-500" /> 4.9 Rating
                    </div>
                </div>
            </div>

            {/* 3. STORY SECTION */}
            <section className="max-w-7xl mx-auto px-12 py-32 md:py-64 space-y-32">
                {/* OBERER TEIL: Einleitung (Statisch & Präsent) */}
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

                {/* UNTERER TEIL: Dynamischer Horizontaler Slider für alle Chapter */}
                <div className="space-y-16">
                    <div
                        id="story-slider"
                        className="flex gap-8 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-12 pt-4 scroll-smooth"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                    >
                        {Object.entries(route || {})
                            // Scannt alle Felder, die mit "chapter" beginnen und Inhalt haben
                            .filter(([key, value]) => key.startsWith('chapter') && typeof value === 'string' && value.trim() !== '')
                            // Sortiert sie numerisch (chapter1, chapter2 ... chapter10)
                            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                            .map(([key, value]: [string, any], index) => {
                                // Logik: Erste Zeile = Titel, Rest = Beschreibung
                                const lines = value.split('\n');
                                const title = lines[0];
                                const body = lines.slice(1).join('\n');

                                return (
                                    <motion.div
                                        key={key}
                                        className="min-w-[85vw] md:min-w-[480px] snap-start group"
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                        viewport={{ once: true }}
                                    >
                                        {/* Bild-Container mit beschleunigtem Hover-Effekt */}
                                        <div className="relative h-[400px] md:h-[450px] w-full overflow-hidden rounded-[2.5rem] border border-white/10 mb-10 shadow-2xl transition-all duration-500 group-hover:border-emerald-500/20">
                                            <img
                                                src={route?.image_url}
                                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                                alt={title}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                        </div>
                                        {/* Text-Content: Titel & gekürzter Body */}
                                        <div className="space-y-4 px-2">
                                            <h3 className="text-3xl md:text-4xl font-serif italic text-white group-hover:text-emerald-400 transition-colors duration-300">
                                                {title}
                                            </h3>

                                            <p className="text-zinc-400 text-lg leading-relaxed line-clamp-3 font-light max-w-md">
                                                {body}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                    </div>

                    {/* Navigation & Progress Bar (Wie im Design-Bild) */}
                    <div className="flex items-center gap-10 px-2">
                        <button
                            type="button"
                            onClick={() => document.getElementById('story-slider')?.scrollBy({ left: -500, behavior: 'smooth' })}
                            className="text-zinc-600 hover:text-white transition-all transform hover:scale-110"
                        >
                            <ArrowLeft size={28} />
                        </button>

                        {/* Die dünne, elegante Progress-Line */}
                        <div className="flex-1 h-[1px] bg-zinc-800 relative rounded-full overflow-hidden">
                            <motion.div
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 origin-left"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => document.getElementById('story-slider')?.scrollBy({ left: 500, behavior: 'smooth' })}
                            className="text-zinc-600 hover:text-white transition-all transform hover:scale-110"
                        >
                            <ArrowRight size={28} />
                        </button>
                    </div>
                </div>
            </section>



            {/* 4. MAP SECTION (Vollständiges Box-Design) */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 pb-48">
                {/* Der Haupt-Container: Definierter Box-Look durch Kontrast und Schatten */}
                <div className="bg-zinc-900/80 rounded-[3rem] border border-white/20 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-md">

                    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">

                        {/* LINKE SPALTE: Timeline & Routen-Info */}
                        <div className="lg:col-span-4 p-10 md:p-14 flex flex-col justify-between border-r border-white/10 bg-black/40">

                            {/* Header & Timeline Bereich */}
                            <div className="space-y-12">
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-serif italic text-white mb-4 leading-tight">
                                        The Route<span className="text-emerald-500">.</span>
                                    </h2>
                                    <p className="text-zinc-500 text-xs leading-relaxed uppercase tracking-[0.2em] font-medium">
                                        Explore the journey through our eyes.
                                    </p>
                                </div>

                                {/* Vertikale Timeline */}
                                <div className="space-y-10 relative">
                                    {/* Die durchgehende Linie im Hintergrund */}
                                    <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-emerald-500/20" />

                                    {/* Wegpunkte: Hier kannst du deine Daten mappen */}
                                    {[
                                        { name: route?.start_point || "Te Anau", desc: "The journey begins." },
                                        { name: "Eglinton Valley", desc: "A vast glacial valley." },
                                        { name: "Mirror Lakes", desc: "Nature's reflection." },
                                        { name: route?.end_point || "Milford Sound", desc: "The final destination." }
                                    ].map((point, i) => (
                                        <div key={i} className="relative pl-10 group cursor-default">
                                            {/* Der interaktive Punkt mit Glow-Effekt bei Hover */}
                                            <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-emerald-500/40 bg-black z-10 flex items-center justify-center transition-all duration-300 group-hover:border-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="text-white/90 font-medium group-hover:text-emerald-400 transition-colors duration-300">
                                                    {point.name}
                                                </h4>
                                                <p className="text-zinc-500 text-xs font-light italic tracking-wide">
                                                    {point.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Call-to-Action Button */}
                            <div className="pt-12">
                                <a
                                    href={route?.['Maps URL']}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-5 rounded-2xl transition-all duration-500 uppercase tracking-widest text-[11px] w-full shadow-2xl active:scale-95"
                                >
                                    <Navigation size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                                    Open in Google Maps
                                </a>
                            </div>
                        </div>

                        {/* RECHTE SPALTE: Die interaktive Google Maps Karte (Originalfarben) */}
                        <div className="lg:col-span-8 relative h-[500px] lg:h-auto overflow-hidden focus:outline-none">
                            <iframe
                                src={route?.['Google Maps']}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                /* Filter entfernt: Karte zeigt jetzt originale Farben und volle Helligkeit */
                                className="w-full h-full outline-none border-none opacity-100 transition-transform duration-[1200ms] ease-in-out hover:scale-105"
                            />

                            {/* Status-Badge oben rechts bleibt als schickes Detail bestehen 
                            <div className="absolute top-8 right-8 px-5 py-2 bg-black/60 backdrop-blur-xl rounded-full border border-white/10 text-[10px] text-white/70 uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span>Live Interaction</span>
                            </div>*/}
                        </div>
                    </div>
                </div>
            </section>

            {/* FLOATING HEART ACTION */}
            <div className="fixed bottom-16 right-16 z-50">
                <motion.button
                    whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}
                    onClick={handleAction}
                    className="p-5 bg-zinc-900 border border-white/10 rounded-full shadow-2xl transition-all duration-380 group"
                >
                    <Heart
                        className={`w-8 h-8 transition-all duration-1000 ease-out ${isSaved ? 'text-red-500 fill-red-500 scale-125' : 'text-white'}`}
                    />
                </motion.button>
            </div>

        </div>
    );
}
