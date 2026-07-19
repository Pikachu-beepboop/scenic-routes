"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import {
    Clock, MapPin, Navigation, Star, ChevronDown, ChevronRight,
    Heart, ArrowLeft, User, ArrowRight, Send, Globe,
    Map as MapIcon, Compass, LogOut, Menu, X,
    Route as RouteIcon
} from 'lucide-react';
import Link from 'next/link';
import { ThemeSwitch } from '@/app/components/ThemeSwitch';
import { useTheme } from 'next-themes';
import { useUnit } from '@/app/UnitContext';
import { formatDistance } from '@/lib/formatDistance';

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

const LANGUAGES = [
    { code: "DE", label: "Deutsch" },
    { code: "EN", label: "English" },
    { code: "RU", label: "Русский" },
];

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

/* ── Impression Slideshow ──
   Eigenständiger Bereich, unabhängig von den Kapiteln der Route.
   Zeigt mehrere Bilder (image1..image5 aus Supabase) und wechselt sie
   automatisch alle paar Sekunden mit einem sanften Fade-Übergang.
   `compact` ist NEU und nur für die Mobile-Ansicht gedacht (kleinere Höhe).
   Ohne die Prop verhält sich die Komponente exakt wie zuvor -> PC unverändert. */
function ImpressionSlideshow({
    images,
    intervalMs = 4000,
    compact = false,
}: {
    images: string[];
    intervalMs?: number;
    compact?: boolean;
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;

        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % images.length);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [images, intervalMs]);

    if (images.length === 0) return null;

    return (
        <div className={`relative w-full overflow-hidden border border-[var(--border)] shadow-2xl group ${compact ? 'h-[380px] rounded-[1.5rem]' : 'h-[600px] md:h-[680px] rounded-[2rem]'}`}>
            <AnimatePresence mode="sync">
                <motion.img
                    key={`${images[activeIndex]}-${activeIndex}`}
                    src={images[activeIndex]}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Impression"
                />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* Dots zur Anzeige, welches Bild aktuell läuft */}
            {images.length > 1 && (
                <div className="absolute bottom-6 right-6 flex gap-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Bild ${i + 1} anzeigen`}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                i === activeIndex ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function RouteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;

    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [username, setUsername] = useState('');
    const [activeChapter, setActiveChapter] = useState(0);
    const [language, setLanguage] = useState("DE");
    const [showLangMenu, setShowLangMenu] = useState(false);

    // NEU – nur für die Mobile-Ansicht: Vollbild-Menü-Overlay
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    // NEU – nur für die Mobile-Ansicht: Navbar bekommt beim Scrollen Hintergrund/Blur/Border (wie auf der About-Page)
    const [mobileNavScrolled, setMobileNavScrolled] = useState(false);
    // NEU – nur für die Mobile-Ansicht: Accordion-Footer (Discover/Company)
    const [mobileFooterOpen, setMobileFooterOpen] = useState<'explore' | 'company' | 'support' | null>(null);
    // NEU – nur für die Mobile-Ansicht: aktives Bild im Highlights-Slider
    const [mobileSlideIndex, setMobileSlideIndex] = useState(0);

    const { theme } = useTheme();
    const { unit } = useUnit();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isLight = mounted && theme === 'light';

    // Geht zur vorherigen Seite in der Browser-History zurück (egal ob das
    // Explore, My Trips, die Homepage oder eine Such-URL mit Filtern war).
    // Fällt nur auf /explore zurück, wenn es gar keine History gibt
    // (z.B. Direktaufruf der URL oder Öffnen in neuem Tab).
    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/explore');
        }
    };

    const { scrollY } = useScroll();

    const navOpacity = useTransform(scrollY, [250, 450], [0, 1]);
    const navY = useTransform(scrollY, [250, 450], [-20, 0]);
    const navBg = useTransform(scrollY, [250, 450], ['rgba(0,0,0,0)', 'var(--nav-scrolled-bg)']);
    const navBlur = useTransform(scrollY, [250, 450], ['blur(0px)', 'blur(20px)']);
    const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
    const heroOpacity = useTransform(scrollY, [0, 800], [1, 0.2]);

    const [navInteractive, setNavInteractive] = useState(false);

    useMotionValueEvent(scrollY, 'change', (latest) => {
        setNavInteractive(latest > 350);
    });

    // NEU – nur für die Mobile-Ansicht: identischer Schwellenwert (40px) und
    // dieselbe Logik wie navScrolled auf der About-Page.
    useMotionValueEvent(scrollY, 'change', (latest) => {
        setMobileNavScrolled(latest > 40);
    });

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
                checkIfSaved(currentUser.id);
                fetchProfile(currentUser.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [params.id]);

    useEffect(() => {
        if (!showUserMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (!target.closest('.route-user-menu-wrap')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    useEffect(() => {
        if (!showLangMenu) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (!target.closest('.route-lang-wrap')) {
                setShowLangMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLangMenu]);

    async function fetchProfile(userId: string) {
        const { data } = await supabase.from('profiles').select('avatar_url, username').eq('id', userId).single();
        if (data) {
            setAvatarUrl(data.avatar_url || '');
            setUsername(data.username || '');
        }
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
            setActiveChapter(0);
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
            router.push(loginHref);
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

    // Sammelt alle vorhandenen image1..image5 (oder beliebig viele imageN) aus Supabase,
    // überspringt leere/NULL-Werte. Unabhängig von Kapiteln — läuft routenweit durch.
    // Fällt auf route.image_url zurück, falls keine imageN-Spalten gefüllt sind.
    const impressionImages: string[] = (() => {
        if (!route) return [];

        const numbered = Object.entries(route)
            .filter(([key, value]) => /^image\d+$/.test(key) && typeof value === 'string' && (value as string).trim() !== '')
            .sort(([a], [b]) => {
                const numA = parseInt(a.replace('image', ''), 10);
                const numB = parseInt(b.replace('image', ''), 10);
                return numA - numB;
            })
            .map(([, value]) => value as string);

        if (numbered.length > 0) return numbered;
        if (route.image_url) return [route.image_url];

        return [];
    })();

    if (loading) {
        return (
            <div className="h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="w-12 h-12 border-[3px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

                :root {
                    --gold:  #C9A86A;
                    --serif: 'Cormorant Garamond', Georgia, serif;
                    --sans:  'Inter', system-ui, sans-serif;
                }

                /* DARK THEME (Standard) */
                .dark {
                    --bg:    #0c0b09;
                    --bg2:   #111009;
                    --bg3:   #181510;
                    --cream: #EDE5D4;
                    --muted: rgba(237,229,212,0.56);
                    --dim:   rgba(237,229,212,0.32);
                    --border:rgba(237,229,212,0.10);
                    --nav-scrolled-bg: rgba(12,11,9,0.85);
                }

                /* LIGHT THEME — warmes Creme, dunkler Text */
                .light {
                    --bg:    #F4F0E8;
                    --bg2:   #EDE8DC;
                    --bg3:   #E5DFD0;
                    --cream: #2B2620;
                    --muted: rgba(43,38,32,0.62);
                    --dim:   rgba(43,38,32,0.38);
                    --border:rgba(43,38,32,0.12);
                    --nav-scrolled-bg: rgba(244,240,232,0.85);
                }

                /* THEME SWITCH — glasmorpher Apple-Stil (identisch zur Homepage) */
                .theme-switch { position:relative; display:flex; align-items:center; width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 70%, transparent); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--border); box-shadow:0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06); cursor:pointer; transition:background .35s, border-color .35s; flex-shrink:0; }
                .theme-switch:hover { border-color: var(--gold); }
                .theme-switch-knob { position:absolute; top:4.5px; left:2.5px; width:22px; height:22px; border-radius:50%; background:linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(237,229,212,0.85)); box-shadow:0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.6); display:flex; align-items:center; justify-content:center; transition:transform .45s cubic-bezier(0.22,1,0.36,1); }
                .theme-switch-knob.is-light { transform:translateX(37px); }
                .theme-switch-icon { width:14px; height:14px; }
                .theme-switch-placeholder { width:66px; height:33px; border-radius:999px; background:color-mix(in srgb, var(--border) 50%, transparent); border:1px solid var(--border); flex-shrink:0; }

                /* NAV LINKS — identisch zur Homepage */
                .nav-link { position:relative; font-size:13px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--muted); transition:color .2s; }
                .nav-link::after { content:""; position:absolute; left:0; bottom:-8px; width:0; height:1px; background:var(--gold); transition:width .25s; }
                .nav-link:hover { color:var(--cream); }
                .nav-link:hover::after { width:100%; }
                .nav-link-active { color:var(--cream) !important; font-weight:700; }
                .light .nav-link-active { color:#2B2620 !important; text-shadow:0 1px 10px rgba(244,240,232,0.9); }
            `}</style>

            <div className="bg-[var(--bg)] text-[var(--cream)] font-sans selection:bg-emerald-500/30 overflow-x-hidden">

                {/* ══════════════════════════════════════════════════════════
                    MOBILE TOP BAR — NEU, nur unter lg sichtbar.
                    Ersetzt Back-Button + Nav rein optisch für kleine Screens.
                   ══════════════════════════════════════════════════════════ */}
                <div
                    className={`lg:hidden fixed top-0 left-0 w-full z-[70] flex items-start justify-between gap-2 px-4 h-[68px] pt-5 transition-all duration-300 ${
                        mobileNavScrolled
                            ? 'bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-xl border-b border-[var(--border)]'
                            : 'bg-transparent border-b border-transparent'
                    }`}
                >
                    <button
                        onClick={handleBack}
                        aria-label="Zurück"
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 ${
                            mobileNavScrolled
                                ? 'bg-[color-mix(in_srgb,var(--border)_40%,transparent)] border border-[var(--border)]'
                                : 'bg-black/35 backdrop-blur-md border border-white/20'
                        }`}
                    >
                        <ArrowLeft size={17} className={mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white'} />
                    </button>

                    <Link href="/" className="flex flex-col items-center leading-[1.15]">
                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.22em] transition-colors duration-300 ${mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>SCENIC</span>
                        <span className={`text-[11px] font-extrabold uppercase tracking-[0.22em] transition-colors duration-300 ${mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}>ROUTES</span>
                    </Link>

                    <button
                        onClick={() => setShowMobileMenu(true)}
                        aria-label="Menü öffnen"
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 ${
                            mobileNavScrolled
                                ? 'bg-[color-mix(in_srgb,var(--border)_40%,transparent)] border border-[var(--border)]'
                                : 'bg-black/35 backdrop-blur-md border border-white/20'
                        }`}
                    >
                        <Menu size={18} strokeWidth={1.8} className={mobileNavScrolled ? 'text-[var(--cream)]' : 'text-white'} />
                    </button>
                </div>

                {/* Popup-Menü — zentriertes Drawer mit Backdrop, identisch zur About-Page */}
                <div
                    className={`lg:hidden fixed inset-0 z-[400] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 ${showMobileMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setShowMobileMenu(false)}
                />

                <div
                    className={`lg:hidden fixed top-1/2 left-1/2 z-[401] w-[88vw] max-w-[380px] max-h-[85vh] overflow-y-auto bg-[var(--bg)] border border-[var(--border)] rounded-[26px] shadow-[0_50px_120px_rgba(0,0,0,0.55)] p-[22px] transition-all duration-300 ${
                        showMobileMenu ? 'opacity-100 pointer-events-auto -translate-x-1/2 -translate-y-1/2 scale-100' : 'opacity-0 pointer-events-none -translate-x-1/2 -translate-y-1/2 scale-95'
                    }`}
                >
                    <div className="flex items-center justify-between mb-[22px]">
                        <span className="text-[12px] font-extrabold tracking-[0.18em] text-[var(--cream)]">SCENIC ROUTES</span>
                        <button
                            onClick={() => setShowMobileMenu(false)}
                            aria-label="Menü schließen"
                            className="w-[38px] h-[38px] rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--cream)]"
                        >
                            <X size={18} strokeWidth={1.8} />
                        </button>
                    </div>

                    {user ? (
                        <div className="border border-[var(--border)] rounded-[20px] bg-[color-mix(in_srgb,var(--bg2)_80%,transparent)] overflow-hidden">
                            <div className="px-[18px] py-5 border-b border-[var(--border)] flex items-center gap-3.5">
                                <div className="w-[46px] h-[46px] rounded-[11px] border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center overflow-hidden shrink-0">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span style={{ fontFamily: 'var(--serif)' }} className="text-[22px] font-bold text-[var(--cream)]">
                                            {username?.[0]?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p style={{ fontFamily: 'var(--serif)' }} className="text-[18px] font-light text-[var(--cream)] leading-tight truncate">
                                        {username || user.email?.split('@')[0]}
                                    </p>
                                    <p className="text-[10px] text-[var(--dim)] mt-1 truncate max-w-[180px]">{user.email}</p>
                                    <p className="text-[8px] font-extrabold tracking-[0.18em] uppercase text-[var(--gold)] mt-1 opacity-70">Scenic Route Explorer</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-[var(--border)]">
                                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted)]">Theme</span>
                                <ThemeSwitch />
                            </div>

                            <div className="p-2">
                                <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[var(--dim)] px-3 pt-3.5 pb-1.5">Navigate</p>
                                <Link href="/explore" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                    Explore Routes
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>
                                <Link href="/about" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                    About
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>

                                <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-[var(--dim)] px-3 pt-2.5 pb-1.5">Account</p>
                                <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><User size={14} strokeWidth={1.8} /></span>
                                    Profile
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>
                                <Link href="/my-trips" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[var(--muted)]">
                                    <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><MapIcon size={14} strokeWidth={1.8} /></span>
                                    My Trips
                                    <ChevronRight size={14} className="ml-auto opacity-40" />
                                </Link>

                                <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                <button
                                    onClick={async () => {
                                        await supabase.auth.signOut();
                                        setShowMobileMenu(false);
                                        router.push('/');
                                    }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-semibold text-[rgba(224,128,128,0.55)]"
                                >
                                    <span className="text-[#e08080] w-[18px] flex items-center justify-center shrink-0"><LogOut size={14} strokeWidth={1.8} /></span>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-1 mb-0">
                                {[['Explore Routes', '/explore'], ['About', '/about']].map(([label, href]) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        onClick={() => setShowMobileMenu(false)}
                                        style={{ fontFamily: 'var(--serif)' }}
                                        className="px-1.5 py-4 text-[26px] font-light text-[var(--cream)] border-b border-[var(--border)]"
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-5 mt-5 border-t border-[var(--border)]">
                                <Link
                                    href={loginHref}
                                    onClick={() => setShowMobileMenu(false)}
                                    className="px-6 py-3 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_40%,transparent)] text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--cream)]"
                                >
                                    Login
                                </Link>
                                <ThemeSwitch />
                            </div>
                        </>
                    )}
                </div>

                {/* ── Back Button (nur Desktop, unverändert) ── */}
                <div className="hidden lg:block fixed top-6 left-10 z-[60]">
                    <button
                        onClick={handleBack}
                        className="group relative flex items-center justify-center w-16 h-16 transition-all duration-500"
                        aria-label="Go back"
                    >
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-700 group-hover:bg-white/20 group-hover:scale-110 group-hover:border-emerald-400/50" />
                        <ArrowLeft
                            size={24}
                            className="relative text-white group-hover:text-emerald-400 group-hover:-translate-x-1.5 transition-all duration-500 ease-out"
                        />
                        <span className="absolute left-20 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none whitespace-nowrap bg-black/40 text-white backdrop-blur-md px-4 py-2 rounded-full border border-white/25">
                            Back
                        </span>
                    </button>
                </div>

                {/* ── Scroll-triggered Navbar (nur Desktop, unverändert) ── */}
                <motion.nav
                    style={{
                        opacity: navOpacity,
                        y: navY,
                        backgroundColor: navBg,
                        backdropFilter: navBlur,
                        fontFamily: 'var(--sans)',
                        pointerEvents: navInteractive ? 'auto' : 'none',
                    }}
                    className="hidden lg:block fixed top-0 left-0 w-full z-50 border-b border-[var(--border)]"
                >
                    <div className="max-w-screen-2xl mx-auto px-12 h-28 flex items-center justify-between">
                        <Link href="/" className="flex flex-col leading-none pl-14">
                            <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-[var(--cream)] not-italic">SCENIC</span>
                            <span className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-[var(--cream)] not-italic">ROUTES</span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-9">
                            <Link href="/explore" className="nav-link">Explore Routes</Link>
                            <Link href="/about" className="nav-link">About</Link>
                            {user && (
                                <Link href="/my-trips" className="nav-link nav-link-active">
                                    My Trips
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-5">
                            {!user && <ThemeSwitch />}

                            {/* ── User Menu ── */}
                            <div className="relative route-user-menu-wrap">
                                <button
                                    onClick={() => {
                                        if (user) {
                                            setShowUserMenu((prev) => !prev);
                                        } else {
                                            router.push(loginHref);
                                        }
                                    }}
                                    aria-label="Account"
                                    className="w-12 h-12 rounded-full border-[1.5px] border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center hover:border-[var(--gold)] hover:-translate-y-0.5 transition-all duration-300 shadow-2xl overflow-hidden"
                                >
                                    {user ? (
                                        avatarUrl ? (
                                            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span
                                                style={{ fontFamily: 'var(--serif)' }}
                                                className={`text-xl font-bold ${isLight ? 'text-black' : 'text-[var(--cream)]'}`}
                                            >
                                                {username?.[0]?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )
                                    ) : (
                                        <User size={18} />
                                    )}
                                </button>

                                {showUserMenu && user && (
                                    <div className="absolute right-0 top-16 w-[290px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-[20px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.65)] backdrop-blur-[28px] z-50">
                                        <div className="p-5 border-b border-[var(--border)] flex items-center gap-4">
                                            <div className="w-[46px] h-[46px] rounded-[11px] border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center font-serif text-[22px] font-light text-[var(--cream)] overflow-hidden shrink-0">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.email?.charAt(0).toUpperCase()
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="font-serif text-[18px] font-light text-[var(--cream)] leading-tight truncate">
                                                    {username || user.email?.split('@')[0]}
                                                </p>
                                                <p className="text-[10px] text-[var(--dim)] mt-1 truncate max-w-[180px]">
                                                    {user.email}
                                                </p>
                                                <p className="text-[8px] font-extrabold tracking-[0.18em] uppercase text-[var(--gold)] mt-1 opacity-70">
                                                    Scenic Route Explorer
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                                            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted)]">Theme</span>
                                            <ThemeSwitch />
                                        </div>

                                        <div className="p-2">
                                            <Link
                                                href="/profile"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><User size={14} strokeWidth={1.8} /></span>
                                                Profile
                                            </Link>

                                            <Link
                                                href="/my-trips"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><MapIcon size={14} strokeWidth={1.8} /></span>
                                                My Trips
                                            </Link>

                                            <Link
                                                href="/explore"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)] transition-all"
                                            >
                                                <span className="text-[var(--gold)] w-[18px] flex items-center justify-center shrink-0"><Compass size={14} strokeWidth={1.8} /></span>
                                                Explore Routes
                                            </Link>

                                            <div className="h-px bg-[var(--border)] my-1 mx-2" />

                                            <button
                                                onClick={async () => {
                                                    await supabase.auth.signOut();
                                                    setShowUserMenu(false);
                                                    router.push('/');
                                                }}
                                                className="flex items-center gap-3 w-full px-3 py-3 rounded-[10px] text-[12px] font-semibold tracking-[0.04em] text-[rgba(224,128,128,0.55)] hover:bg-[rgba(224,128,128,0.07)] hover:text-[#e08080] transition-all"
                                            >
                                                <span className="text-[#e08080] w-[18px] flex items-center justify-center shrink-0"><LogOut size={14} strokeWidth={1.8} /></span>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.nav>

                {/* ══════════════════════════════════════════════════════════
                    MOBILE HERO — NEU
                   ══════════════════════════════════════════════════════════ */}
                <section className="lg:hidden">
                    <div className="relative w-full h-[560px] overflow-hidden">
                        <img
                            src={route?.image_url}
                            alt={route?.title ?? 'Route'}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />
                    </div>

                    <div className="px-5 pt-5 pb-6 space-y-5">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-[var(--cream)]">
                                <HighlightedTitle title={route?.title ?? ''} />
                            </h1>
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                                <MapPin size={12} /> {route?.country}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl px-5 py-5">
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <Clock size={16} className="text-[var(--dim)]" /> {route?.duration}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <RouteIcon size={16} className="text-[var(--dim)]" /> {formatDistance(route?.distance_km, unit)}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)] truncate">
                                <MapPin size={16} className="text-[var(--dim)]" /> {route?.country}
                            </span>
                            <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                                <Star size={14} className="fill-emerald-500 text-emerald-500" /> 4.8 Rating
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <a
                                href="#route-map"
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-[13px] font-bold uppercase tracking-[0.1em] active:scale-[0.98] transition-transform"
                            >
                                <MapIcon size={15} strokeWidth={1.8} /> View Map
                            </a>

                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={handleSaveToggle}
                                aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                                className="w-[52px] h-[52px] shrink-0 rounded-full border border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <Heart className={`w-5 h-5 transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-emerald-400'}`} />
                            </motion.button>
                        </div>
                    </div>
                </section>

                {/* ── 1. Hero (nur Desktop, unverändert) ── */}
                <section className="hidden lg:flex relative h-screen w-full overflow-hidden items-end justify-start px-12 pb-24 md:px-20 md:pb-32">
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
                            className="text-5xl md:text-7xl lg:text-[6rem] font-black italic uppercase leading-[0.9] tracking-tighter text-white drop-shadow-2xl"
                        >
                            <HighlightedTitle title={route?.title ?? ''} />
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ delay: 2, duration: 1 }}
                            className="absolute -bottom-16 left-0 flex flex-row items-center gap-3 text-white"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Scroll</span>
                            <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
                                <ChevronDown size={16} />
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* ── 2. Quick Stats Bar (nur Desktop, unverändert) ── */}
                <div className="hidden lg:block sticky top-0 z-40 w-full backdrop-blur-3xl bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] border-y border-[var(--border)] shadow-2xl">
                    <div className="max-w-7xl mx-auto px-12 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-[10px] font-bold uppercase tracking-[0.6em] opacity-90">
                        {[
                            { icon: <Clock size={18} strokeWidth={1} />, label: route?.duration },
                            { icon: <Navigation size={18} strokeWidth={1} />, label: formatDistance(route?.distance_km, unit) },
                            { icon: <MapPin size={18} strokeWidth={1} />, label: route?.country, truncate: true },
                            { icon: <Star size={18} className="fill-emerald-500 text-emerald-500" />, label: '4.9 Rating' },
                        ].map(({ icon, label, truncate }, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-4 justify-center md:justify-start text-[var(--cream)] hover:text-emerald-400 transition-all${truncate ? ' truncate' : ''}`}
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

                {/* ══════════════════════════════════════════════════════════
                    MOBILE STORY / CHAPTERS / IMPRESSIONS — NEU
                   ══════════════════════════════════════════════════════════ */}
                <section className="lg:hidden px-5 pt-10 pb-4 space-y-10">
                    <div className="space-y-4">
                        <h2 className="text-[26px] leading-[1.1] font-serif italic text-[var(--cream)]">
                            The <br /> Untold Story.
                        </h2>
                        <div className="h-px w-14 bg-emerald-500/40" />
                    </div>

                    <div className="space-y-4">
                        <div className="w-full h-[200px] rounded-2xl overflow-hidden border border-[var(--border)]">
                            <img src={route?.image_url} className="w-full h-full object-cover" alt="Story visual" />
                        </div>
                        <p className="text-[13px] leading-relaxed text-[var(--muted)] font-light">
                            {route?.description}
                        </p>
                    </div>

                    {chapters.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--dim)]">The Route</p>

                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
                                {chapters.map((chapter, index) => (
                                    <button
                                        key={chapter.key}
                                        type="button"
                                        onClick={() => setActiveChapter(index)}
                                        className={`shrink-0 px-4 py-2 rounded-full border text-[13px] font-bold tracking-wider transition-all duration-300
                                            ${activeChapter === index
                                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                                                : 'border-[var(--border)] text-[var(--dim)]'
                                            }`}
                                    >
                                        {String(index + 1).padStart(2, '0')}
                                    </button>
                                ))}
                            </div>

                            <motion.div
                                key={chapters[activeChapter].key}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="border border-[var(--border)] rounded-[1.5rem] bg-[var(--bg2)] p-6 space-y-3"
                            >
                                <span className="font-serif text-2xl text-emerald-400 italic leading-none">
                                    {String(activeChapter + 1).padStart(2, '0')}
                                </span>

                                <h3 className="text-lg font-serif italic text-[var(--cream)] leading-snug">
                                    {chapters[activeChapter].title}
                                </h3>

                                <p className="text-[var(--muted)] text-[13px] leading-relaxed font-light whitespace-pre-line">
                                    {chapters[activeChapter].body}
                                </p>
                            </motion.div>
                        </div>
                    )}
                </section>

                {/* ══════════════════════════════════════════════════════════
                    MOBILE HIGHLIGHTS — NEU (Slider + Icon-Liste + Merken-Button)
                   ══════════════════════════════════════════════════════════ */}
                <section className="lg:hidden relative px-5 pt-6 pb-20 space-y-6">
                    {impressionImages.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--dim)]">Scenic Highlights</p>

                            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[var(--border)]">
                                <AnimatePresence mode="sync">
                                    <motion.img
                                        key={`${impressionImages[mobileSlideIndex % impressionImages.length]}-${mobileSlideIndex}`}
                                        src={impressionImages[mobileSlideIndex % impressionImages.length]}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6 }}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        alt="Impression"
                                    />
                                </AnimatePresence>
                            </div>

                            {impressionImages.length > 1 && (
                                <div className="flex items-center justify-center gap-1.5">
                                    {impressionImages.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setMobileSlideIndex(i)}
                                            aria-label={`Bild ${i + 1} anzeigen`}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                i === mobileSlideIndex % impressionImages.length ? 'w-5 bg-emerald-400' : 'w-1.5 bg-[var(--border)]'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ── 3. Story Section (nur Desktop, unverändert) ── */}
                <section className="hidden lg:block max-w-7xl mx-auto px-12 pt-12 pb-24 md:pt-16 md:pb-32 space-y-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 lg:gap-48 items-center mb-32">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1.2 }}
                            viewport={{ once: true }}
                            className="space-y-12"
                        >
                            <div className="space-y-6">
                                <h2 className="text-6xl md:text-7xl font-serif italic text-[var(--cream)] leading-tight">
                                    The <br /> Untold Story.
                                </h2>
                                <div className="h-px w-32 bg-emerald-500/30" />
                            </div>
                            <p className="text-2xl leading-relaxed text-[var(--muted)] font-light italic border-l-2 border-emerald-500/40 pl-8">
                                {route?.description}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.5 }}
                            viewport={{ once: true }}
                            className="relative aspect-[4/5] rounded-[3rem] overflow-hidden border border-[var(--border)] shadow-2xl group"
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
                        <div className="space-y-12">
                            {/* Kapitel-Label + Tabs */}
                            <div className="space-y-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--dim)]">
                                    Kapitel der Route
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {chapters.map((chapter, index) => (
                                        <button
                                            key={chapter.key}
                                            type="button"
                                            onClick={() => setActiveChapter(index)}
                                            className={`px-5 py-3 rounded-xl border text-sm font-bold tracking-wider transition-all duration-300
                                                ${activeChapter === index
                                                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                                    : 'border-[var(--border)] text-[var(--dim)] hover:text-[var(--cream)] hover:border-[var(--muted)]'
                                                }`}
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Aktives Kapitel */}
                            <motion.div
                                key={chapters[activeChapter].key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative flex border border-[var(--border)] rounded-[2rem] overflow-hidden bg-[var(--bg2)]"
                            >
                                {/* Linker Gradient-Rand mit Nummer */}
                                <div className="relative flex items-start justify-center w-28 md:w-36 shrink-0 pt-10">
                                    <span className="font-serif text-5xl md:text-6xl text-emerald-400 italic leading-none">
                                        {String(activeChapter + 1).padStart(2, '0')}
                                    </span>
                                    {/* Mittige Trennlinie */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-50 w-px bg-[var(--border)]" />
                                </div>

                                {/* Inhalt */}
                                <div className="flex-1 p-10 md:p-12">
                                    <h3 className="text-2xl md:text-3xl font-serif italic text-[var(--cream)] leading-snug mb-6">
                                        {chapters[activeChapter].title}
                                    </h3>

                                    <p className="text-[var(--muted)] text-lg leading-relaxed font-light max-w-3xl whitespace-pre-line">
                                        {chapters[activeChapter].body}
                                    </p>

                                    {/* Optionale Etappe/Höhe-Felder, falls in der DB vorhanden */}
                                    {(Boolean(route?.[`${chapters[activeChapter].key}_distance`]) || Boolean(route?.[`${chapters[activeChapter].key}_elevation`])) && (
                                        <div className="flex gap-10 mt-8 pt-8 border-t border-[var(--border)] text-xs uppercase tracking-[0.2em] text-[var(--dim)]">
                                            {Boolean(route?.[`${chapters[activeChapter].key}_distance`]) && (
                                                <span>
                                                    Etappe
                                                    <span className="text-emerald-400 font-bold ml-2">
                                                        {String(route?.[`${chapters[activeChapter].key}_distance`] ?? '')}
                                                    </span>
                                                </span>
                                            )}
                                            {Boolean(route?.[`${chapters[activeChapter].key}_elevation`]) && (
                                                <span>
                                                    Höhe
                                                    <span className="text-emerald-400 font-bold ml-2">
                                                        {String(route?.[`${chapters[activeChapter].key}_elevation`] ?? '')}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Impressionen — eigenständiger Bereich, unabhängig von den Kapiteln */}
                    {impressionImages.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--dim)]">
                                Impressionen
                            </p>
                            <ImpressionSlideshow
                                images={impressionImages}
                                intervalMs={4000}
                            />
                        </div>
                    )}
                </section>

                {/* Anker-Marker für "View Map" / "Karte" – vermeidet doppelte id="route-map" bei zwei Sektionen */}
                <div id="route-map" className="scroll-mt-16 lg:scroll-mt-0" />

                {/* ══════════════════════════════════════════════════════════
                    MOBILE MAP — NEU
                   ══════════════════════════════════════════════════════════ */}
                <section className="lg:hidden px-5 pt-4 pb-10">
                    <div className="space-y-3 mb-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--dim)]">Navigation</p>
                        <h2 className="text-[26px] font-serif italic text-[var(--cream)] leading-tight">
                            Route <span className="text-emerald-500">Overview</span>
                        </h2>
                        <div className="h-px w-14 bg-emerald-500/40" />
                    </div>

                    <div className={`rounded-2xl overflow-hidden ${isLight ? 'border border-[var(--border)] shadow-[0_16px_40px_rgba(43,38,32,0.10)]' : 'shadow-[0_20px_60px_rgba(0,0,0,0.7)]'}`}>
                        <div className={`relative h-[230px] w-full overflow-hidden ${isLight ? 'bg-[#e8e8e3]' : 'bg-[#0b1220]'}`}>
                            {route?.['google_maps'] && (
                                <iframe
                                    src={route['google_maps']}
                                    width="100%"
                                    height="100%"
                                    style={{
                                        border: 0,
                                        filter: isLight
                                            ? 'none'
                                            : 'invert(92%) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(1.4)',
                                    }}
                                    allowFullScreen
                                    loading="lazy"
                                    title="Route Map"
                                    className="w-full h-full outline-none border-none"
                                />
                            )}

                            {!isLight && (
                                <>
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b1220]/50 via-transparent to-[#0b1220]/40" />
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0b1220]/30 via-transparent to-[#0b1220]/30" />
                                </>
                            )}
                        </div>

                        <div className={`flex items-center justify-between gap-3 px-4 py-4 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0d1626]'}`}>
                            <div className="space-y-1 min-w-0">
                                <p className={`font-bold text-sm truncate ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
                                    {route?.['start_point']}
                                    <span className="text-emerald-500 mx-1.5">→</span>
                                    {route?.['end_point']}
                                </p>
                                <p className={`text-[11px] flex items-center gap-1.5 flex-wrap ${isLight ? 'text-[#6b6b6b]' : 'text-zinc-400'}`}>
                                    <span className="text-emerald-500">{formatDistance(route?.distance_km, unit)}</span>
                                    <span className="opacity-40">·</span>
                                    <span>{route?.duration}</span>
                                </p>
                            </div>

                            <a
                                href={route?.['maps_URL']}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`shrink-0 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-full active:scale-95 transition-transform ${isLight ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                            >
                                <ArrowRight size={13} />
                                Route
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── 4. Map Section (nur Desktop, unverändert) ── */}
                <section className="hidden lg:block max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-10">
                    <div className="space-y-6 mb-10 px-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[var(--dim)]">
                            Navigation
                        </p>
                        <h2 className="text-5xl md:text-6xl font-serif italic text-[var(--cream)] leading-tight">
                            Route <span className="text-emerald-500">Overview</span>
                        </h2>
                        <div className="h-px w-32 bg-emerald-500/30" />
                    </div>

                    <div className={`bg-[color-mix(in_srgb,var(--bg2)_80%,transparent)] rounded-[3rem] overflow-hidden backdrop-blur-md ${isLight ? 'shadow-[0_20px_60px_rgba(43,38,32,0.12)] border border-[var(--border)]' : 'shadow-[0_30px_100px_rgba(0,0,0,0.8)]'}`}>
                        <div className={`relative h-[600px] w-full overflow-hidden ${isLight ? 'bg-[#e8e8e3]' : 'bg-[#0b1220]'}`}>
                            {route?.['google_maps'] && (
                                <iframe
                                    src={route['google_maps']}
                                    width="100%"
                                    height="100%"
                                    style={{
                                        border: 0,
                                        filter: isLight
                                            ? 'none'
                                            : 'invert(92%) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(1.4)',
                                    }}
                                    allowFullScreen
                                    loading="lazy"
                                    title="Route Map"
                                    className="w-full h-full outline-none border-none"
                                />
                            )}

                            {!isLight && (
                                <>
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b1220]/50 via-transparent to-[#0b1220]/40" />
                                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#0b1220]/30 via-transparent to-[#0b1220]/30" />
                                </>
                            )}
                        </div>

                        <div className={`flex items-center justify-between gap-6 px-8 py-7 ${isLight ? 'bg-[#ffffff]' : 'bg-[#0d1626]'}`}>
                            <div className="space-y-1.5 min-w-0">
                                <p className={`font-bold text-lg md:text-xl truncate ${isLight ? 'text-[#1a1a1a]' : 'text-white'}`}>
                                    {route?.['start_point']}
                                    <span className="text-emerald-500 mx-2">→</span>
                                    {route?.['end_point']}
                                </p>
                                <p className={`text-xs md:text-sm flex items-center gap-2 flex-wrap ${isLight ? 'text-[#6b6b6b]' : 'text-zinc-400'}`}>
                                    <span className="text-emerald-500">{route?.duration}</span>
                                    <span className="opacity-40">·</span>
                                    <span>{formatDistance(route?.distance_km, unit)}</span>
                                </p>
                            </div>

                            <a
                                href={route?.['maps_URL']}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`shrink-0 flex items-center gap-2 font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-lg hover:bg-emerald-400 hover:text-black ${isLight ? 'bg-[#1a1a1a] text-white' : 'bg-white text-black'}`}
                            >
                                <Navigation size={14} />
                                Route
                            </a>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════════════
                    MOBILE FOOTER — NEU
                   ══════════════════════════════════════════════════════════ */}
                <footer className="lg:hidden relative bg-[var(--bg)] border-t border-[var(--border)] px-5 pt-12 pb-28">
                    <div className="flex flex-col items-center text-center">
                        <img
                            src="/logodark.png"
                            alt="Scenic Routes"
                            style={{
                                width: '150px',
                                height: 'auto',
                                display: 'block',
                                filter: isLight ? 'none' : 'invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%)',
                            }}
                        />

                        <p className="text-[var(--dim)] text-[13px] leading-relaxed font-light max-w-[280px] mt-2">
                            Thoughtfully curated road trips for people who value the journey as much as the destination.
                        </p>
                    </div>

                    <div className="mt-10">
                        {([
                            { key: 'explore' as const, heading: 'Explore', links: ['All Routes', 'Destinations', 'Experiences', 'Journal'] },
                            { key: 'company' as const, heading: 'Company', links: ['About Us', 'Membership', 'Gift Cards', 'Careers'] },
                            { key: 'support' as const, heading: 'Support', links: ['FAQ', 'Travel Policies', 'Contact Us', 'Privacy Policy'] },
                        ]).map(({ key, heading, links }) => (
                            <div key={key} className="border-t border-[var(--border)]">
                                <button
                                    type="button"
                                    onClick={() => setMobileFooterOpen(mobileFooterOpen === key ? null : key)}
                                    className="w-full flex items-center justify-between py-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[var(--dim)]"
                                >
                                    {heading}
                                    <ChevronDown
                                        size={14}
                                        className={`text-[var(--dim)] transition-transform duration-300 ${mobileFooterOpen === key ? 'rotate-180 text-[var(--gold)]' : ''}`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {mobileFooterOpen === key && (
                                        <motion.ul
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden space-y-3 pb-4"
                                        >
                                            {links.map(link => (
                                                <li key={link}>
                                                    <a href="#" className="text-sm text-[var(--dim)]">{link}</a>
                                                </li>
                                            ))}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-[var(--border)] mt-2 pt-6 text-center">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--dim)]">
                            © {new Date().getFullYear()} Explore Scenic Routes. All Rights Reserved.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-5">
                        <div className="relative route-lang-wrap">
                            <button
                                onClick={() => setShowLangMenu((p) => !p)}
                                className="flex items-center gap-1 h-[38px] px-3 rounded-full border-none bg-transparent text-[14px] font-normal uppercase tracking-wider text-[var(--muted)]"
                            >
                                <Globe size={17} /> {language}
                            </button>

                            {showLangMenu && (
                                <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 min-w-[140px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setLanguage(lang.code);
                                                setShowLangMenu(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2.5 text-xs font-medium ${
                                                lang.code === language ? 'text-emerald-500 font-bold' : 'text-[var(--muted)]'
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ThemeSwitch />
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-6 text-[10px] uppercase tracking-[0.08em] text-[var(--dim)]">
                        <a href="#">Terms &amp; Conditions</a>
                        <a href="#">Privacy</a>
                    </div>
                </footer>

                {/* ── Footer (nur Desktop, unverändert) ── */}
                <footer className="hidden lg:block relative bg-gradient-to-b from-[var(--bg)] via-[var(--bg2)] to-[var(--bg)] border-t border-[var(--border)] overflow-hidden">
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(16,185,129,0.15) 1px, transparent 0)',
                        backgroundSize: '40px 40px',
                    }} />

                    <div className="relative max-w-7xl mx-auto px-12 pt-32 pb-16">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 pb-20 border-b border-[var(--border)]">
                            <div className="lg:col-span-4 space-y-8">

                                {/* ── Logo: Gold im Dark Mode, Schwarz im Light Mode ── */}
                                <Link href="/" className="flex items-center w-fit">
                                    <div style={{ width: '220px', height: '147px', display: 'flex', alignItems: 'center' }}>
                                        <img
                                            src="/logodark.png"
                                            alt="Scenic Routes"
                                            style={{
                                                width: '220px',
                                                height: 'auto',
                                                display: 'block',
                                                filter: isLight ? 'none' : 'invert(33%) sepia(46%) saturate(600%) hue-rotate(4deg) brightness(96%) drop-shadow(0 4px 10px rgba(0,0,0,0.6))',
                                            }}
                                        />
                                    </div>
                                </Link>

                                <p className="text-[var(--dim)] text-sm leading-relaxed max-w-xs font-light">
                                    Curating the world's most breathtaking driving routes for those who seek the road less travelled.
                                </p>
                                <div className="flex gap-4">
                                    {['IG'].map(social => (
                                        <a key={social} href="#" aria-label={social}
                                            className="w-11 h-11 rounded-xl bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--dim)] hover:text-[var(--cream)] hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 hover:scale-110">
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
                                                    <a href="#" className="text-sm text-[var(--dim)] hover:text-[var(--cream)] hover:translate-x-1 inline-block transition-all duration-300">{link}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            
                        </div>

                        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-[var(--dim)]">
                            <p>© {new Date().getFullYear()} Scenic Routes. All rights reserved.</p>

                            <div className="flex items-center gap-6 flex-wrap justify-center">
                                {/* ── Sprachauswahl ── */}
                                <div className="relative route-lang-wrap">
                                    <button
                                        onClick={() => setShowLangMenu((p) => !p)}
                                        className="flex items-center gap-1.5 px-6.5 py-2 rounded-full border-none bg-transparent text-base font-normal uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--cream)] transition-colors duration-200"
                                    >
                                        <Globe size={12} strokeWidth={2} /> {language}
                                    </button>

                                    {showLangMenu && (
                                        <div className="absolute bottom-[calc(100%+10px)] right-0 min-w-[150px] bg-[color-mix(in_srgb,var(--bg)_97%,transparent)] border border-[var(--border)] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                                            {LANGUAGES.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => {
                                                        setLanguage(lang.code);
                                                        setShowLangMenu(false);
                                                    }}
                                                    className={`block w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-200 ${
                                                        lang.code === language
                                                            ? 'text-emerald-500 font-bold'
                                                            : 'text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:text-[var(--cream)]'
                                                    }`}
                                                >
                                                    {lang.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <ThemeSwitch />

                                <div className="flex gap-8">
                                    {['Privacy Policy', 'Terms of Use', 'Cookie Settings', 'Impressum'].map(link => (
                                        <a key={link} href="#" className="hover:text-[var(--cream)] transition-colors duration-300">{link}</a>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                    </div>
                </footer>

                {/* ── Floating Heart (nur Desktop, unverändert — auf Mobile übernimmt der Herz-Button in der Top-Bar) ── */}
                <div className="hidden lg:block fixed bottom-16 right-16 z-50">
                    <motion.button
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        onClick={handleSaveToggle}
                        aria-label={isSaved ? 'Route entfernen' : 'Route speichern'}
                        className="p-5 bg-[var(--bg2)] border border-[var(--border)] rounded-full shadow-2xl"
                    >
                        <motion.div
                            animate={{ scale: isSaved ? [1, 1.35, 1] : 1 }}
                            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                        >
                            <Heart className={`w-8 h-8 transition-colors duration-300 ${isSaved ? 'text-red-500 fill-red-500' : 'text-[var(--cream)]'}`} />
                        </motion.div>
                    </motion.button>
                </div>
            </div>
        </>
    );
}