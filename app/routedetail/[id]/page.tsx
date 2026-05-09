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
            <section className="max-w-7xl mx-auto px-12 py-32 md:py-64">
                {/* OBERER TEIL: Bild und kurze Description */}
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

                        {/* KURZE DESCRIPTION */}
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
                        <img src={route?.image_url} className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </motion.div>
                </div>

                {/* UNTERER TEIL: Long Description über volle Breite */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="max-w-10xl"
                >
                    <p className="text-xl md:text-2xl leading-relaxed text-gray-400 font-light whitespace-pre-line">
                        {route?.long_description}
                    </p>
                </motion.div>
            </section>

            {/* 4. MAP SECTION */}
            <section className="px-12 pb-48 text-center space-y-12">
                {/* Karten-Container: Höhe von 800px auf 500px und Breite auf max-w-5xl reduziert */}
                <div className="max-w-7xl mx-auto relative h-[600px] w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
                    <iframe
                        src={route?.['Google Maps']}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        className="opacity-90 grayscale-[10%] group-hover:grayscale-0 transition-all duration-1000"
                    />
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                </div>

                <div className="pt-4">
                    <a
                        href={route?.['Maps URL']}
                        target="_blank"
                        rel="noopener noreferrer"
                        /* Button: Padding von px-24 py-12 auf px-10 py-5 verkleinert */
                        className="group inline-flex items-center gap-6 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-16 py-8 rounded-full transition-all duration-700 hover:shadow-[0_15px_60px_rgba(16,185,129,0.3)] uppercase tracking-[0.2em] text-[14px] shadow-2xl"
                    >
                        {/* Icon: Größe von 28 auf 20 reduziert */}
                        <ExternalLink size={23} className="group-hover:rotate-12 transition-transform duration-500" />
                        Begin Navigation
                    </a>
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
